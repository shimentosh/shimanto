import { Button, Container, Squiggle } from '@shimanto/ui';
import { Spot } from '@shimanto/ui';

export default function NotFound() {
  return (
    <main id="main">
      <section className="flex min-h-[70vh] items-center pt-28 pb-24">
        <Container className="grid items-center gap-10 md:grid-cols-[1fr_auto]">
          <div>
            <p className="text-ink-soft text-sm font-medium">Error 404</p>
            <h1 className="mt-4 max-w-[14ch] text-[clamp(40px,6vw,76px)] leading-[1.02] font-medium tracking-[-0.045em]">
              This page wasn&apos;t <Squiggle world="create">built</Squiggle> yet.
            </h1>
            <p className="text-ink-soft mt-5 max-w-[44ch] text-lg">
              The link might be old, or the page moved. Everything else is still here.
            </p>
            <div className="mt-8 flex flex-wrap items-center gap-3">
              <Button href="/">Back to home</Button>
              <Button href="/search" variant="secondary">
                Search the site
              </Button>
            </div>
          </div>
          <div className="hidden w-72 md:block">
            <Spot name="cone" float />
          </div>
        </Container>
      </section>
    </main>
  );
}
