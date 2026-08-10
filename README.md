# Rinix Agency — Production Website

A production-ready, framework-free progressive web app for Rinix Agency, a
premium web development and digital solutions studio.

## Stack

- HTML5 semantic markup
- Modern CSS3 (custom properties, flexbox, grid) — no CSS framework
- Vanilla JavaScript (ES6+) — no dependencies
- Web App Manifest + Service Worker (installable, offline-capable PWA)

## File structure

Everything lives at the root level — no subdirectories:

```
index.html          Main page (all sections)
404.html            Custom not-found page
manifest.json        PWA manifest
sw.js                Service worker (offline caching)
sw-register.js        Service worker registration
robots.txt            Crawler rules + sitemap reference
sitemap.xml            XML sitemap
style.css              Core design system styles
responsive.css          Breakpoint rules (320–1920px)
app.js                Behavior: nav, portfolio render, form, reveals, install prompt
favicon.ico            Multi-size favicon
icon-192.png            PWA icon
icon-512.png            PWA icon
og-image.png            Social share image (1200x630)
logo.png              Primary brand mark (gradient)
logo-mono.png          Monochrome brand mark
ghostline-chat.png       Portfolio preview
amrutam-water.png        Portfolio preview
rs-browser.png          Portfolio preview
generate_assets.py       Script used to generate brand imagery (not required in production)
```

## Before deploying

1. **Domain**: swap `https://rinix.agency` in `index.html`, `robots.txt`,
   and `sitemap.xml` for your real production domain.
2. **Analytics**: add your GA4 snippet and Search Console verification
   meta tag where marked in `index.html`.
3. **Contact form**: the form currently falls back to a `mailto:` draft to
   `contact.rinix@proton.me` since no backend is wired up. Connect a form
   service (Netlify Forms, Formspree, etc.) if you want submissions
   captured server-side instead.
4. **Images**: `generate_assets.py` was used to produce the brand mark,
   icons, OG image, and portfolio previews programmatically. Swap in real
   photography/screenshots for the three portfolio images before launch
   for the strongest impression.
5. Run through the full pre-deployment checklist from the production
   brief (responsive breakpoints, Lighthouse scores, PWA install,
   structured data validation, broken links) before going live.

## Deploy to Netlify

1. Push this folder to a Git repository.
2. Connect the repo in Netlify, or drag-and-drop the folder into
   Netlify's manual deploy target.
3. No build command is needed — this is a static site with no dependencies.
4. Set the publish directory to the project root.
5. After deploy, submit `sitemap.xml` to Google Search Console and
   request indexing.
