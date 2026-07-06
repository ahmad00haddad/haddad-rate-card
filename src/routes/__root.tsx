import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  Link,
  createRootRouteWithContext,
  useRouter,
  HeadContent,
  Scripts,
} from "@tanstack/react-router";
import { useEffect, type ReactNode } from "react";

import appCss from "../styles.css?url";
import { reportLovableError } from "../lib/lovable-error-reporting";

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-7xl font-bold text-foreground">404</h1>
        <h2 className="mt-4 text-xl font-semibold text-foreground">Page not found</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          The page you're looking for doesn't exist or has been moved.
        </p>
        <div className="mt-6">
          <Link
            to="/"
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Go home
          </Link>
        </div>
      </div>
    </div>
  );
}

function ErrorComponent({ error, reset }: { error: Error; reset: () => void }) {
  console.error(error);
  const router = useRouter();
  useEffect(() => {
    reportLovableError(error, { boundary: "tanstack_root_error_component" });
  }, [error]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-xl font-semibold tracking-tight text-foreground">
          This page didn't load
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Something went wrong on our end. You can try refreshing or head back home.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <button
            onClick={() => {
              router.invalidate();
              reset();
            }}
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Try again
          </button>
          <a
            href="/"
            className="inline-flex items-center justify-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-accent"
          >
            Go home
          </a>
        </div>
      </div>
    </div>
  );
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "أحمد حداد — تسعيرات التصوير السينمائي · إربد وعمّان" },
      { name: "description", content: "قائمة تسعيرات أحمد حداد: أفلام قصيرة، ريلز، إعلانات TVC، وثائقيات، إيفنتات، بودكاست ومونتاج — أسعار عمّان وإربد بشفافية." },
      { name: "author", content: "Ahmad Haddad" },
      { property: "og:site_name", content: "Ahmad Haddad Films" },
      { property: "og:title", content: "أحمد حداد — تسعيرات التصوير السينمائي" },
      { property: "og:description", content: "أسعار خدمات التصوير السينمائي في عمّان وإربد — أفلام، ريلز، إعلانات، وثائقيات، إيفنتات." },
      { property: "og:locale", content: "ar_JO" },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: "أحمد حداد — تسعيرات التصوير السينمائي" },
      { name: "twitter:description", content: "أسعار خدمات التصوير السينمائي في عمّان وإربد." },
      { property: "og:image", content: "https://storage.googleapis.com/gpt-engineer-file-uploads/qGn2RbU2zGeX3QOBE2tDG7bEjFO2/social-images/social-1780153735268-Screenshot_2026-05-30_180846.webp" },
      { name: "twitter:image", content: "https://storage.googleapis.com/gpt-engineer-file-uploads/qGn2RbU2zGeX3QOBE2tDG7bEjFO2/social-images/social-1780153735268-Screenshot_2026-05-30_180846.webp" },
    ],
    links: [
      {
        rel: "stylesheet",
        href: appCss,
      },
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
    ],
    scripts: [
      {
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "LocalBusiness",
          "@id": "https://haddad-rate-card.lovable.app/#business",
          name: "Ahmad Haddad — Cinematic Filmmaker",
          image: "https://storage.googleapis.com/gpt-engineer-file-uploads/qGn2RbU2zGeX3QOBE2tDG7bEjFO2/social-images/social-1780153735268-Screenshot_2026-05-30_180846.webp",
          url: "https://haddad-rate-card.lovable.app",
          telephone: "+962799256345",
          priceRange: "JOD",
          areaServed: [
            { "@type": "City", name: "Irbid" },
            { "@type": "City", name: "Amman" },
          ],
          address: { "@type": "PostalAddress", addressCountry: "JO", addressLocality: "Irbid" },
          sameAs: ["https://wa.me/962799256345"],
        }),
      },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

function RootShell({ children }: { children: ReactNode }) {
  return (
    <html lang="ar" dir="rtl">
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();

  return (
    <QueryClientProvider client={queryClient}>
      {/* Required: nested routes render here. Removing <Outlet /> breaks all child routes. */}
      <Outlet />
    </QueryClientProvider>
  );
}
