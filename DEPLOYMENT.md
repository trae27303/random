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
- `STORAGE_BACKEND` (optional: set to `http` to use a remote storage service)
- `STORAGE_BASE_URL` (required if STORAGE_BACKEND=`http`)
- `STORAGE_TOKEN` (optional bearer for the remote storage service)

## Database
- Provision a Postgres instance in Render or another provider.
- Set `DATABASE_URL` accordingly. For cloud DBs like Supabase, use `?sslmode=require`.
- Run migrations when ready:
  - Open a Shell in the service and run: `npm run db:push`

## Notes
- The server listens on the `PORT` provided by Render.
- Production build bundles the server and builds the client to `dist/public`.
- WebSocket endpoint is `/ws` and is served by the same web service.

## Remote Storage Option
If you prefer to isolate DB connectivity into a separate service, set:
- `STORAGE_BACKEND=http`
- `STORAGE_BASE_URL=https://your-remote-storage-service`
- `STORAGE_TOKEN` if your remote requires auth

When enabled, the app uses an HTTP-based storage client instead of direct Postgres.

## Two-Service Deployment (Main + API)
This repo supports running both the main app and a separate API service on Render:

- Main App (UI + WebSocket + routes): uses `npm start`
- API Service (DB operations): uses `node dist/api.cjs`

### Render Setup
1. Create two Web Services from this repo.
2. For the main app:
   - Build: `npm install && npm run build`
   - Start: `npm start`
   - Env: `NODE_ENV=production`, `NPM_CONFIG_PRODUCTION=false`, plus session vars.
3. For the API service:
   - Build: `npm install && npm run build`
   - Start: `node dist/api.cjs`
   - Env: `NODE_ENV=production`, `NPM_CONFIG_PRODUCTION=false`, `DATABASE_URL` (with `?sslmode=require` if needed), `STORAGE_SERVER_TOKEN`, optional `API_CORS_ORIGIN`
4. In the main app, set:
   - `STORAGE_BACKEND=http`
   - `STORAGE_BASE_URL=https://<your-api-service.onrender.com>`
   - `STORAGE_TOKEN` to the same value as `STORAGE_SERVER_TOKEN`

### Generate a Secure Server Token
Use any of the following to create a strong token. Store it in Render env as `STORAGE_SERVER_TOKEN` and in the main app as `STORAGE_TOKEN`.

- Node (cross-platform):

  ```bash
  node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
  ```

- PowerShell:

  ```powershell
  [BitConverter]::ToString((New-Object Byte[] 32 | %{$_=0}) | %{[byte](Get-Random -Minimum 0 -Maximum 256)}).Replace('-', '').ToLower()
  ```

- Linux/macOS:

  ```bash
  openssl rand -hex 32
  ```
