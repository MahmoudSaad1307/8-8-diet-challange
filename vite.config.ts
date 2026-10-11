import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');

  return {
    plugins: [
      react(),
      {
        name: 'dev-api-routes',
        configureServer(server) {
          server.middlewares.use(async (req, res, next) => {
            const rawUrl = req.url || '';
            if (!rawUrl.startsWith('/api/')) {
              return next();
            }

            const urlObj = new URL(rawUrl, 'http://localhost');
            const routeName = urlObj.pathname.replace(/^\/api\//, '').split('/')[0];

            if (req.method === 'OPTIONS') {
              res.setHeader('Access-Control-Allow-Origin', '*');
              res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
              res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, x-app-key');
              res.statusCode = 200;
              return res.end();
            }

            let body: unknown = undefined;
            if (req.method === 'POST' || req.method === 'PUT' || req.method === 'PATCH' || req.method === 'DELETE') {
              let raw = '';
              for await (const chunk of req) {
                raw += chunk;
              }
              if (raw) {
                try {
                  body = JSON.parse(raw);
                } catch {
                  body = raw;
                }
              }
            }

            const query: Record<string, string> = {};
            urlObj.searchParams.forEach((v, k) => {
              query[k] = v;
            });

            const vercelReq = {
              method: req.method,
              headers: req.headers,
              query,
              body,
            };

            const vercelRes = {
              setHeader(key: string, val: string) {
                res.setHeader(key, val);
                return this;
              },
              status(code: number) {
                res.statusCode = code;
                return this;
              },
              json(data: unknown) {
                res.setHeader('Content-Type', 'application/json');
                res.end(JSON.stringify(data));
              },
              end() {
                res.end();
              },
            };

            // Forward env vars
            for (const [k, v] of Object.entries(env)) {
              if (process.env[k] === undefined && v !== undefined) {
                process.env[k] = v;
              }
            }

            try {
              const modulePath = `/api/${routeName}.ts`;
              const { default: handler } = await server.ssrLoadModule(modulePath);
              if (typeof handler === 'function') {
                await handler(vercelReq, vercelRes);
              } else {
                res.statusCode = 404;
                res.setHeader('Content-Type', 'application/json');
                res.end(JSON.stringify({ error: 'ROUTE_NOT_FOUND', message: `No handler for ${routeName}` }));
              }
            } catch (e: unknown) {
              const err = e as Error;
              console.error(`[dev-api-routes] error in /api/${routeName}:`, e);
              res.statusCode = 500;
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify({ error: 'DEV_SERVER_ERROR', message: err?.message || String(e) }));
            }
          });
        },
      },
    ],
    optimizeDeps: {
      exclude: ['lucide-react'],
    },
  };
});
