# RS Net (static) — getrs.vercel.app

Plain HTML/CSS/JS rewrite of RS Net — no Next.js, no Node server, no build
step. Firebase client SDK only, loaded via CDN as ES modules.

## Files

```
index.html                      landing page
login.html / signup.html         email+password + Google auth
dashboard.html                    list/create/delete sites, password settings
builder.html                      the visual builder
site.html                          public site renderer (reads the URL)
rs-secret-dashboard-99x.html        ghost admin panel
css/style.css                        fonts, animations, hand-written .btn/.card/.input
                                       (Tailwind's CDN build can't process @apply)
js/firebase-init.js                  Firebase config + exported app/auth/db/storage
js/app.js                             block registry, DOM rendering, auth helpers
js/imageUpload.js                      validation, compression, Storage upload
js/home.js / login.js / signup.js / dashboard.js / builder.js / site.js / admin.js
firestore.rules
storage.rules
vercel.json                            rewrites so /sites/[sitename] works
```

## Setup

1. Open `js/firebase-init.js` and fill in your Firebase web config
   (Project settings → General → Your apps → SDK setup and configuration).
   These values aren't secret — see the comment in that file for why.
2. In the Firebase console: enable **Email/Password** and **Google** under
   Authentication, create a **Firestore database**, enable **Storage**,
   then deploy `firestore.rules` and `storage.rules` (Firebase console →
   Firestore/Storage → Rules tab → paste and publish, or via the Firebase CLI).
3. `RS_OWNER_EMAIL` is hardcoded in **two places** — `js/firebase-init.js`
   (drives the admin page's UI) and `firestore.rules`' `isAdmin()` function
   (the one that actually matters). Both are already set to
   `rsandhi37@gmail.com`; change both together if that ever changes.
4. Deploy to Vercel as a **static** project (no framework/build command
   needed) — `vercel.json`'s rewrites make `/sites/my-site` work.
   Locally, any static file server works (e.g. `npx serve .`), but the
   clean `/sites/...` URLs only resolve through Vercel's rewrite — when
   testing locally, open `site.html?sitename=my-site` directly instead.

## What changed vs. the Next.js version (and why)

Dropping the Node.js server changes what's actually enforcing security —
worth reading before you deploy this:

- **Public data**: `site.js` and the create-transaction in `dashboard.js`
  read site documents directly from the client (no Admin SDK to bypass
  rules with), so `firestore.rules` makes single-document reads (`get`)
  public. Collection *queries* (`list`) stay locked to "your own sites, or
  the admin" — otherwise anyone could dump every user's data (including
  password hashes) with one query in devtools. This get/list split is the
  main thing to understand in `firestore.rules`.
- **Ghost admin panel**: there's no server to serve a real 404 to
  unauthorized visitors — `rs-secret-dashboard-99x.html` is a static file,
  technically fetchable by anyone. `js/admin.js` checks the signed-in
  user's email and leaves the page showing a plain 404 for everyone else,
  which is good UX but not a security boundary by itself. The actual
  boundary is `firestore.rules`' `isAdmin()` check on every read/write the
  admin panel makes — that's enforced by Firebase's backend regardless of
  what any client does.
- **Password-protected sites**: verification moved to client-side bcrypt
  (`js/site.js`, using bcryptjs via CDN), since there's no server to check
  a password against a hash without exposing the hash to the client. This
  is a real downgrade from the Next.js version: a determined visitor can
  read a site's `passwordHash` field directly and brute-force it offline
  with no rate limiting. Reasonable for a free site builder; not something
  to rely on for anything sensitive.
- **Sitename uniqueness**: `dashboard.js` uses the sitename itself as the
  Firestore document ID and claims it inside a `runTransaction` — this is
  actually *more* race-safe than the old server-side version, since the
  check-and-create is now atomic.

## Known limitations

- No Cloud Function cleanup for orphaned Storage images when a site is deleted.
- Admin's site-rename doesn't re-check URL collisions the way creation does.
- Single hardcoded admin email — multiple moderators would need a different scheme.
