Where To Go Sour
================

A Tyre (Sour), Lebanon tourism and local discovery website.

There are now TWO parts to this project:

  /              - the React + Vite frontend
  /server        - a Node.js + Express API backed by PostgreSQL

Listings and saved/bookmarked places are stored in the database and
served over the API - nothing is hardcoded in the frontend anymore.

--------------------------------------------------------------------
1. Get a Postgres database (Neon works great, and is free to start)
--------------------------------------------------------------------
  - Go to https://neon.tech, create a project, and copy the connection
    string it gives you (looks like postgresql://user:pass@host/db?sslmode=require).
  - Any other Postgres instance (local install, Docker, Supabase, etc.)
    works too - you just need a connection string.

--------------------------------------------------------------------
2. Set up and start the backend
--------------------------------------------------------------------
  cd server
  npm install
  copy .env.example to .env and paste in your DATABASE_URL

  Then create the tables (run once):
    psql "your-connection-string" -f schema.sql
  (or paste the contents of schema.sql into the Neon SQL editor)

  Load the starting listings (run once):
    npm run seed

  Create a database backup before migrations or major admin changes:
    npm run backup
  This requires the PostgreSQL client tools (`pg_dump`) and writes a
  timestamped dump to server/backups/ by default. Keep a copy outside the
  server and GitHub. Restore a dump with:
    pg_restore --clean --if-exists --dbname "your-connection-string" sour-backup.dump

  Start the API server:
    npm run dev
  It runs on http://localhost:4000 by default.

--------------------------------------------------------------------
3. Set up and start the frontend
--------------------------------------------------------------------
  In a separate terminal, from the project root:
    npm install
    copy .env.example to .env (defaults to VITE_API_URL=http://localhost:4000)
    npm run dev
  Open http://localhost:5173

--------------------------------------------------------------------
What's stored where
--------------------------------------------------------------------
  - listings table: every place shown on the site (name, category,
    area, description, hours, phone, rating, price, tag) PLUS the
    actual image bytes (image_data/image_mime columns). Everything
    lives in Postgres now - nothing is hardcoded in the frontend.
    Images are served from a dedicated endpoint rather than embedded
    in the listings JSON, so browsing stays fast:
      GET    /api/listings                (list, includes hasImage flag)
      GET    /api/listings/:id/image      (raw image bytes)
      POST   /api/listings                (create/upsert; body can include
                                            imageBase64 + imageMime to attach a photo)
      PUT    /api/listings/:id
      DELETE /api/listings/:id
  - saved_bookmarks table: which listings each visitor has saved.
    A random visitor id is generated in the browser (localStorage)
    the first time someone uses the site, so saves persist across
    visits without needing a login:
      GET    /api/saved/:visitorId
      POST   /api/saved            { visitorId, listingId }
      DELETE /api/saved            { visitorId, listingId }

If you already ran schema.sql / migrate.js before images moved into
the database, just re-run "node migrate.js" - it uses ADD COLUMN IF
NOT EXISTS so it's safe to run again and will add the new image
columns without touching your existing data. Then re-run "npm run
seed" to backfill the three starter images.

--------------------------------------------------------------------
4. Deploy the frontend and API
--------------------------------------------------------------------
  - GitHub: commit this project without either .env file. They are
    ignored by .gitignore and must never be pushed.
  - Render: create a Blueprint from this repository. Render reads
    render.yaml, deploys the /server service, and provides the API URL.
    Enter secret variables in its dashboard. After deployment, confirm
    https://your-render-service.onrender.com/api/health works.
  - Vercel: import the same repository as a Vite project, then deploy.
    vercel.json proxies /api requests to Render and preserves client-side
    routes such as /browse and /admin; no VITE_API_URL is required.
  - Render ALLOWED_ORIGINS must allow the deployed frontend origins:
    https://www.haydesour.com,https://hayde-sour.vercel.app
    Redeploy Render after setting it.
  - Vercel proxies API requests to Render, so vercel.json does not need
    to change when the frontend domain changes.
