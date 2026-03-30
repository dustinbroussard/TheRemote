import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig, loadEnv} from 'vite';

function createContentSecurityPolicy(isDev: boolean) {
  const scriptSrc = ["'self'", 'https://apis.google.com'];
  const connectSrc = [
    "'self'",
    'https://*.googleapis.com',
    'https://*.googleusercontent.com',
    'https://*.supabase.co',
    'wss://*.supabase.co',
    'https://www.googleapis.com',
    'https://openrouter.ai',
    'https://generativelanguage.googleapis.com',
  ];

  if (isDev) {
    scriptSrc.push("'unsafe-inline'");
    scriptSrc.push("'unsafe-eval'");
    connectSrc.push('ws:', 'wss:');
  }

  return [
    "default-src 'self'",
    `script-src ${scriptSrc.join(' ')}`,
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
    "img-src 'self' data: blob: https://*.googleusercontent.com https://*.gstatic.com https://*.googleapis.com",
    "font-src 'self' data: https://fonts.gstatic.com",
    "media-src 'self' blob:",
    `connect-src ${connectSrc.join(' ')}`,
    "frame-src 'self' https://accounts.google.com https://apis.google.com",
    "worker-src 'self' blob:",
    "manifest-src 'self'",
    "object-src 'none'",
    "frame-ancestors 'self'",
    "base-uri 'self'",
    "form-action 'self'",
    'upgrade-insecure-requests',
  ].join('; ');
}

export default defineConfig(({mode}) => {
  const env = loadEnv(mode, '.', '');
  const isDev = mode !== 'production';
  const securityHeaders = {
    'Content-Security-Policy': createContentSecurityPolicy(isDev),
    'Cross-Origin-Opener-Policy': 'same-origin-allow-popups',
    'Cross-Origin-Resource-Policy': 'same-origin',
    'Referrer-Policy': 'strict-origin-when-cross-origin',
    'X-Frame-Options': 'SAMEORIGIN',
    'X-Content-Type-Options': 'nosniff',
    'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
  };

  return {
    plugins: [react(), tailwindcss()],
    define: {
      'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY),
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      headers: securityHeaders,
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modify; file watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
    },
    preview: {
      headers: securityHeaders,
    },
    build: {
      rollupOptions: {
        input: {
          main: path.resolve(__dirname, 'index.html'),
          generator: path.resolve(__dirname, 'generator.html'),
        },
      },
    },
  };
});
