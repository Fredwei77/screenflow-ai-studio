import path from 'path';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  root: 'src',
  base: '/meet/',
  publicDir: '../public',
  build: {
    outDir: '../dist',
    emptyOutDir: true,
  },
  server: {
    port: 3000,
    host: '0.0.0.0',
    proxy: {
      '/meet/api': {
        target: 'http://localhost:4000',
        rewrite: (path) => path.replace(/^\/meet/, ''),
      },
      '/api': {
        target: 'http://localhost:4000',
        rewrite: (path) => path.replace(/^\/meet/, ''),
      },
      '/socket.io': {
        target: 'http://localhost:4000',
        ws: true,
        changeOrigin: true,
      },
    },
  },
  plugins: [
    react(),
    tailwindcss(),
    {
      name: 'redirect-to-base',
      configureServer(server) {
        server.middlewares.use((req, res, next) => {
          const url = req.url?.split('?')[0] || '';
          // Redirect paths that don't start with /meet/ and aren't assets
          if (url !== '/' && !url.startsWith('/meet/') && !url.startsWith('/@') && !url.includes('.')) {
            const query = req.url?.includes('?') ? req.url.slice(req.url.indexOf('?')) : '';
            res.writeHead(302, { Location: `/meet${req.url}` });
            res.end();
            return;
          }
          next();
        });
      },
    },
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src'),
    },
  },
});
