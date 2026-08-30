/** @type {import('next').NextConfig} */
const nextConfig = {
  // This app is proxied under navazano.cz/stock via a rewrite in the
  // navazano-klarka project — basePath makes all of Next's own routing,
  // <Link>, and static assets resolve correctly under that prefix.
  basePath: '/stock',
};

export default nextConfig;
