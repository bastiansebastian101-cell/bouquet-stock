import { redirect } from 'next/navigation';

// The real dashboard lives at /dashboard, not here — see src/app/dashboard/page.tsx.
// Requests to this exact basePath-root path have a known cross-origin-proxy
// issue when reached via the navazano.cz/stock rewrite (a relative redirect
// misresolving against the wrong origin), so navazano-klarka's own
// next.config.mjs redirects straight to /dashboard before ever hitting this
// route. This redirect only matters for people visiting the app's real
// domain (bouquet-stock.vercel.app/stock) directly.
export default function RootPage() {
  redirect('/dashboard');
}
