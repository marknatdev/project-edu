import type { NextConfig } from "next";
import path from "node:path";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  outputFileTracingRoot: path.join(__dirname),
  async headers() {
    const production = process.env.NODE_ENV === 'production';
    const csp = ["default-src 'self'", `script-src 'self' 'unsafe-inline'${production ? '' : " 'unsafe-eval'"}`,
      "style-src 'self' 'unsafe-inline'", "font-src 'self'", "img-src 'self' data: blob:",
      "connect-src 'self' https://ppctndzkerwiokjfaklw.supabase.co wss://ppctndzkerwiokjfaklw.supabase.co",
      "worker-src 'self' blob:", "object-src 'none'", "base-uri 'self'", "form-action 'self'", "frame-ancestors 'none'"].join('; ');
    return [{ source: '/:path*', headers: [
      { key:'Content-Security-Policy', value:csp }, { key:'X-Content-Type-Options',value:'nosniff' },
      { key:'X-Frame-Options',value:'DENY' }, { key:'Referrer-Policy',value:'strict-origin-when-cross-origin' },
      { key:'Permissions-Policy',value:'camera=(), microphone=(), geolocation=()' },
      ...(production ? [{key:'Strict-Transport-Security',value:'max-age=31536000'}] : []),
    ] }, { source:'/auth/:path*',headers:[{key:'Cache-Control',value:'no-store'},{key:'Referrer-Policy',value:'no-referrer'}] }];
  },
};

export default nextConfig;
