import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');

  return {
    plugins: [
      react(),
      {
        name: 'dev-api-parse-food',
        configureServer(server) {
          server.middlewares.use('/api/parse-food', async (req, res) => {
            if (req.method === 'POST') {
              let body = '';
              req.on('data', (chunk) => {
                body += chunk;
              });
              req.on('end', async () => {
                let parsedBody = {};
                try {
                  parsedBody = body ? JSON.parse(body) : {};
                } catch {
                  parsedBody = {};
                }

                const vercelReq = {
                  method: req.method,
                  body: parsedBody,
                };
                const vercelRes = {
                  setHeader(key: string, val: string) {
                    res.setHeader(key, val);
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

                process.env.GEMINI_API_KEY =
                  process.env.GEMINI_API_KEY || env.GEMINI_API_KEY || env.VITE_GEMINI_API_KEY;

                try {
                  const { default: handler } = await server.ssrLoadModule('/api/parse-food.ts');
                  await handler(vercelReq, vercelRes);
                } catch (e: unknown) {
                  const err = e as Error;
                  res.statusCode = 500;
                  res.setHeader('Content-Type', 'application/json');
                  res.end(JSON.stringify({ error: 'DEV_SERVER_ERROR', message: err?.message || String(e) }));
                }
              });
            } else if (req.method === 'OPTIONS') {
              res.statusCode = 200;
              res.end();
            } else {
              res.statusCode = 405;
              res.end();
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
