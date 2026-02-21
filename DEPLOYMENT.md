# Deploy to Render

## Service Setup
1. Push this repository to GitHub.
2. In Render, create a new Web Service and connect the repo.
3. Use these commands:
   - Build Command: `npm install && npm run build`
   - Start Command: `npm start`
4. Set Environment to Node.

## Environment Variables
Add the following variables in Render:

- `NODE_ENV=production`
- `NPM_CONFIG_PRODUCTION=false` (ensures devDependencies like `tsx`, `vite`, `esbuild` install during build)
- `SESSION_SECRET` (set a strong random value)
- `DATABASE_URL` (Postgres connection string)
- `SUPABASE_URL` (optional)
- `SUPABASE_ANON_KEY` (optional)

## Database
- Provision a Postgres instance in Render or another provider.
- Set `DATABASE_URL` accordingly. For cloud DBs like Supabase, use `?sslmode=require`.
- Run migrations when ready:
  - Open a Shell in the service and run: `npm run db:push`

## Notes
- The server listens on the `PORT` provided by Render.
- Production build bundles the server and builds the client to `dist/public`.
- WebSocket endpoint is `/ws` and is served by the same web service.
