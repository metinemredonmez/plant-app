import type { NextConfig } from 'next';

// The panel is internal: no framing, no referrer, no sniffing.
const securityHeaders = [
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'Referrer-Policy', value: 'no-referrer' },
  { key: 'X-Robots-Tag', value: 'noindex, nofollow' },
];

const config: NextConfig = {
  poweredByHeader: false,
  // The sidebar's sign-out sits bottom left, where the indicator would cover it.
  devIndicators: { position: 'bottom-right' },
  async headers() {
    return [{ source: '/:path*', headers: securityHeaders }];
  },
};

export default config;
