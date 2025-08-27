# GoldTrust Wallet - Next.js (Fixed)
This Next.js project has been regenerated with fixes applied:
- Removed invalid <Link><a> usages (Next.js 13+)
- Fixed duplicate function in utils/storage.js
- `package.json` dev script no longer hardcodes port (use `npm run dev -- -p <port>` if needed)
- Simple client-side persistence via localStorage
- Pages: index, dashboard, mine, withdraw, verify-code, buy-code, history, profile

## Run locally
1. Extract the ZIP and open the folder in VS Code.
2. Install dependencies:
   ```bash
   npm install
   ```
3. Start dev server:
   ```bash
   npm run dev
   ```
4. Open http://localhost:3000 (or run with another port: `npm run dev -- -p 3001`)

## Push to GitHub and Deploy to Vercel
1. Create a new GitHub repo (empty).
2. In project folder run:
   ```bash
   git init
   git add .
   git commit -m "Initial GoldTrust Wallet Next.js (fixed)"
   git branch -M main
   git remote add origin https://github.com/<your-username>/<repo-name>.git
   git push -u origin main
   ```
3. Go to https://vercel.com, import the GitHub repo, and deploy (Vercel will detect Next.js).

## Build an APK / wrap as app
- Use Capacitor or Appflow to wrap the web app into an APK. Vercel-hosted site can be used as web assets.
