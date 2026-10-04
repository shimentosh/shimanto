import {
  type CanActivate,
  type ExecutionContext,
  ForbiddenException,
  Injectable,
  SetMetadata,
  UnauthorizedException,
  UseGuards,
  applyDecorators,
  createParamDecorator,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import {
  ApiBearerAuth,
  ApiCookieAuth,
  ApiForbiddenResponse,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import type { Role } from '@shimanto/types';
import { PrismaService } from '../prisma/prisma.service.js';
import { AuthService, toAuthUser } from './auth.service.js';
import { ACCESS_COOKIE, type AuthUser, type AuthedRequest, CUSTOMER_COOKIE } from './auth.types.js';
import { CustomerSessionService } from './customer-session.service.js';

const ROLES_KEY = 'roles';

function bearer(req: AuthedRequest): string | undefined {
  const header = req.headers.authorization;
  if (header?.startsWith('Bearer ')) return header.slice(7);
  return (req.cookies as Record<string, string> | undefined)?.[ACCESS_COOKIE];
}

/** Admin auth: verifies the access token (cookie or Bearer), then checks @Roles. Disabled users are rejected. */
@Injectable()
export class AuthGuard implements CanActivate {
  constructor(
    private readonly auth: AuthService,
    private readonly prisma: PrismaService,
    private readonly reflector: Reflector,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest<AuthedRequest>();
    const token = bearer(req);
    if (!token) throw new UnauthorizedException('Not signed in');

    let sub: string;
    try {
      ({ sub } = await this.auth.verifyAccessToken(token));
    } catch {
      throw new UnauthorizedException('Session expired');
    }
    // Look the user up so role changes and disabling take effect immediately, not at token expiry.
    const user = await this.prisma.user.findUnique({ where: { id: sub } });
    if (!user || user.disabledAt) throw new UnauthorizedException('Not signed in');
    req.user = toAuthUser(user);

    const roles = this.reflector.getAllAndOverride<Role[] | undefined>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (roles?.length && !roles.includes(user.role))
      throw new ForbiddenException('Insufficient role');
    return true;
  }
}

/** `@Auth()` = any admin user; `@Auth('SUPER_ADMIN')` = only those roles. Also documents it. */
export function Auth(...roles: Role[]) {
  return applyDecorators(
    SetMetadata(ROLES_KEY, roles),
    UseGuards(AuthGuard),
    ApiCookieAuth(ACCESS_COOKIE),
    ApiBearerAuth(),
    ApiUnauthorizedResponse({ description: 'Not signed in' }),
    ...(roles.length ? [ApiForbiddenResponse({ description: 'Insufficient role' })] : []),
  );
}

/** Editors and super admins: everyone who works in the admin panel. */
export const AdminAuth = () => Auth('SUPER_ADMIN', 'EDITOR');

export const CurrentUser = createParamDecorator(
  (_: unknown, ctx: ExecutionContext): AuthUser =>
    ctx.switchToHttp().getRequest<AuthedRequest>().user!,
);

/**
 * Customer auth: the `sx_cs` session cookie of the customer portal. It grants access to that
 * customer's own orders, downloads and tickets only. Admin tokens are rejected here, and customer
 * tokens by AuthGuard.
 */
@Injectable()
export class CustomerGuard implements CanActivate {
  constructor(private readonly sessions: CustomerSessionService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest<AuthedRequest>();
    req.customerId = await this.sessions.verify(req);
    return true;
  }
}

export function CustomerAuth() {
  return applyDecorators(
    UseGuards(CustomerGuard),
    ApiCookieAuth(CUSTOMER_COOKIE),
    ApiUnauthorizedResponse({ description: 'Not signed in as a customer' }),
  );
}

export const CurrentCustomerId = createParamDecorator(
  (_: unknown, ctx: ExecutionContext): string =>
    ctx.switchToHttp().getRequest<AuthedRequest>().customerId!,
);
