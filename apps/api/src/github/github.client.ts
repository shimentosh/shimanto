import { createSign } from 'node:crypto';
import { Inject, Injectable, Logger } from '@nestjs/common';
import { ENV } from '../config/config.module.js';
import type { Env } from '../config/env.js';

export type InviteResult =
  | { kind: 'invited'; invitationId: string }
  /** The user already has access to the repository (collaborator or org member). */
  | { kind: 'collaborator' };

export interface GitHubIdentity {
  id: string;
  login: string;
}

/** A GitHub API failure with a message safe to store and show to admins (never a token). */
export class GitHubError extends Error {
  constructor(
    message: string,
    readonly status?: number,
  ) {
    super(message);
  }
}

/**
 * GitHub port: repository access for delivery and OAuth identity for customers. Every call runs
 * server-side; tokens never leave this class. Tests swap in a fake.
 */
export abstract class GitHubClient {
  /** How repository operations authenticate: a GitHub App (preferred), a token, or not at all. */
  abstract readonly mode: 'app' | 'token' | null;
  /** Customers can connect their GitHub account (OAuth credentials present). */
  abstract readonly oauthEnabled: boolean;

  abstract invite(owner: string, repo: string, login: string): Promise<InviteResult>;
  abstract hasAccess(owner: string, repo: string, login: string): Promise<boolean>;
  /** Null when the invitation no longer exists (accepted, declined or cancelled). */
  abstract invitation(
    owner: string,
    repo: string,
    invitationId: string,
  ): Promise<{ expired: boolean } | null>;
  abstract cancelInvitation(owner: string, repo: string, invitationId: string): Promise<void>;
  abstract removeCollaborator(owner: string, repo: string, login: string): Promise<void>;
  /** Checks the configured credentials can manage this repository's collaborators. */
  abstract checkRepository(owner: string, repo: string): Promise<{ ok: boolean; message: string }>;

  abstract authorizeUrl(state: string, redirectUri: string): string;
  /** Exchanges an OAuth code for the user's identity. The user token is used once and dropped. */
  abstract identify(code: string, redirectUri: string): Promise<GitHubIdentity>;
}

const API = 'https://api.github.com';
const HEADERS = {
  accept: 'application/vnd.github+json',
  'x-github-api-version': '2022-11-28',
  'user-agent': 'shimanto-store',
};

@Injectable()
export class HttpGitHubClient extends GitHubClient {
  private readonly logger = new Logger('GitHub');
  private readonly privateKey?: string;
  private readonly installations = new Map<string, number>();
  private readonly tokens = new Map<number, { token: string; expiresAt: number }>();

  constructor(@Inject(ENV) private readonly env: Env) {
    super();
    this.privateKey = env.GITHUB_APP_PRIVATE_KEY?.replace(/\\n/g, '\n');
  }

  get mode() {
    if (this.env.GITHUB_APP_ID && this.privateKey) return 'app' as const;
    if (this.env.GITHUB_TOKEN) return 'token' as const;
    return null;
  }

  get oauthEnabled() {
    return Boolean(this.env.GITHUB_CLIENT_ID && this.env.GITHUB_CLIENT_SECRET);
  }

  // ───────────── Auth ─────────────

  /** Short-lived RS256 JWT that authenticates as the App itself. */
  private appJwt(): string {
    const now = Math.floor(Date.now() / 1000);
    const encode = (value: object) => Buffer.from(JSON.stringify(value)).toString('base64url');
    const unsigned = `${encode({ alg: 'RS256', typ: 'JWT' })}.${encode({
      iat: now - 60,
      exp: now + 9 * 60,
      iss: this.env.GITHUB_APP_ID,
    })}`;
    const signature = createSign('RSA-SHA256').update(unsigned).sign(this.privateKey!, 'base64url');
    return `${unsigned}.${signature}`;
  }

  /** Installation token for the repository's owner (cached until shortly before it expires). */
  private async repoToken(owner: string, repo: string): Promise<string> {
    if (this.mode === 'token') return this.env.GITHUB_TOKEN!;
    if (this.mode !== 'app') throw new GitHubError('GitHub delivery is not configured');

    const key = `${owner}/${repo}`.toLowerCase();
    let installationId = this.installations.get(key);
    if (!installationId) {
      const res = await this.request('GET', `/repos/${owner}/${repo}/installation`, this.appJwt());
      if (res.status === 404) {
        throw new GitHubError(`The GitHub App is not installed on ${owner}/${repo}`, 404);
      }
      await this.ensureOk(res, 'Could not find the App installation');
      installationId = ((await res.json()) as { id: number }).id;
      this.installations.set(key, installationId);
    }

    const cached = this.tokens.get(installationId);
    if (cached && cached.expiresAt - 60_000 > Date.now()) return cached.token;
    const res = await this.request(
      'POST',
      `/app/installations/${installationId}/access_tokens`,
      this.appJwt(),
    );
    await this.ensureOk(res, 'Could not create an installation token');
    const body = (await res.json()) as { token: string; expires_at: string };
    this.tokens.set(installationId, {
      token: body.token,
      expiresAt: new Date(body.expires_at).getTime(),
    });
    return body.token;
  }

  private request(method: string, path: string, token: string, body?: unknown) {
    return fetch(`${API}${path}`, {
      method,
      headers: {
        ...HEADERS,
        authorization: `Bearer ${token}`,
        ...(body ? { 'content-type': 'application/json' } : {}),
      },
      body: body ? JSON.stringify(body) : undefined,
      signal: AbortSignal.timeout(15_000),
    });
  }

  private async ensureOk(res: Response, context: string): Promise<void> {
    if (res.ok) return;
    const body = (await res.json().catch(() => ({}))) as {
      message?: string;
      errors?: Array<{ message?: string }>;
    };
    const detail = [body.message, ...(body.errors ?? []).map((e) => e.message)]
      .filter(Boolean)
      .join('; ');
    throw new GitHubError(`${context} (${res.status}${detail ? `: ${detail}` : ''})`, res.status);
  }

  // ───────────── Repository access ─────────────

  async invite(owner: string, repo: string, login: string): Promise<InviteResult> {
    const token = await this.repoToken(owner, repo);
    const res = await this.request(
      'PUT',
      `/repos/${owner}/${repo}/collaborators/${encodeURIComponent(login)}`,
      token,
      { permission: 'pull' },
    );
    // 201: invitation created (or the pending one returned). 204: already has access.
    if (res.status === 204) return { kind: 'collaborator' };
    await this.ensureOk(res, `Could not invite @${login} to ${owner}/${repo}`);
    const body = (await res.json()) as { id: number };
    return { kind: 'invited', invitationId: String(body.id) };
  }

  async hasAccess(owner: string, repo: string, login: string): Promise<boolean> {
    const token = await this.repoToken(owner, repo);
    const res = await this.request(
      'GET',
      `/repos/${owner}/${repo}/collaborators/${encodeURIComponent(login)}`,
      token,
    );
    if (res.status === 204) return true;
    if (res.status === 404) return false;
    await this.ensureOk(res, 'Could not check repository access');
    return false;
  }

  async invitation(owner: string, repo: string, invitationId: string) {
    const token = await this.repoToken(owner, repo);
    for (let page = 1; page <= 10; page++) {
      const res = await this.request(
        'GET',
        `/repos/${owner}/${repo}/invitations?per_page=100&page=${page}`,
        token,
      );
      await this.ensureOk(res, 'Could not list repository invitations');
      const list = (await res.json()) as Array<{ id: number; expired?: boolean }>;
      const found = list.find((i) => String(i.id) === invitationId);
      if (found) return { expired: Boolean(found.expired) };
      if (list.length < 100) break;
    }
    return null;
  }

  async cancelInvitation(owner: string, repo: string, invitationId: string) {
    const token = await this.repoToken(owner, repo);
    const res = await this.request(
      'DELETE',
      `/repos/${owner}/${repo}/invitations/${invitationId}`,
      token,
    );
    if (res.status === 404) return;
    await this.ensureOk(res, 'Could not cancel the invitation');
  }

  async removeCollaborator(owner: string, repo: string, login: string) {
    const token = await this.repoToken(owner, repo);
    const res = await this.request(
      'DELETE',
      `/repos/${owner}/${repo}/collaborators/${encodeURIComponent(login)}`,
      token,
    );
    if (res.status === 404) return;
    await this.ensureOk(res, `Could not remove @${login}`);
  }

  async checkRepository(owner: string, repo: string) {
    try {
      const token = await this.repoToken(owner, repo);
      const res = await this.request(
        'GET',
        `/repos/${owner}/${repo}/invitations?per_page=1`,
        token,
      );
      if (res.status === 404) {
        return {
          ok: false,
          message: `${owner}/${repo} was not found, or the credentials can't see it`,
        };
      }
      if (res.status === 403) {
        return {
          ok: false,
          message:
            'Missing permission: the App needs "Administration: read & write" on this repository',
        };
      }
      await this.ensureOk(res, 'Repository check failed');
      return {
        ok: true,
        message: `Ready: ${this.mode === 'app' ? 'the GitHub App' : 'the token'} can invite collaborators to ${owner}/${repo}`,
      };
    } catch (error) {
      return { ok: false, message: (error as Error).message };
    }
  }

  // ───────────── OAuth (customer identity) ─────────────

  authorizeUrl(state: string, redirectUri: string): string {
    const url = new URL('https://github.com/login/oauth/authorize');
    url.searchParams.set('client_id', this.env.GITHUB_CLIENT_ID ?? '');
    url.searchParams.set('redirect_uri', redirectUri);
    url.searchParams.set('state', state);
    url.searchParams.set('allow_signup', 'true');
    return url.toString();
  }

  async identify(code: string, redirectUri: string): Promise<GitHubIdentity> {
    const tokenRes = await fetch('https://github.com/login/oauth/access_token', {
      method: 'POST',
      headers: { accept: 'application/json', 'content-type': 'application/json' },
      body: JSON.stringify({
        client_id: this.env.GITHUB_CLIENT_ID,
        client_secret: this.env.GITHUB_CLIENT_SECRET,
        code,
        redirect_uri: redirectUri,
      }),
      signal: AbortSignal.timeout(15_000),
    });
    const token = (await tokenRes.json().catch(() => ({}))) as {
      access_token?: string;
      error_description?: string;
    };
    if (!token.access_token) {
      throw new GitHubError(token.error_description ?? 'GitHub did not return an access token');
    }
    const userRes = await this.request('GET', '/user', token.access_token);
    await this.ensureOk(userRes, 'Could not read the GitHub account');
    const user = (await userRes.json()) as { id: number; login: string };
    this.logger.log(`Identified GitHub user @${user.login}`);
    return { id: String(user.id), login: user.login };
  }
}
