# Lowbake Booth Configurator

Interactive 3D spray booth configurator built with React and Three.js. Allows customers to configure booth type, dimensions, and lighting, then submit a quote request.

## Features

- **3D viewport** — real-time WebGL render with orbit, pan, and zoom controls
- **Booth types** — Open Face, Extraction Wall, Desk Booth
- **Dimensions** — configurable width, depth, and height
- **Lighting configurator** — per-panel roof and wall light layout with interactive SVG plan view
- **Quote request modal** — captures customer contact details and full booth configuration
- **Light / Dark mode** — toggle with animated switch, syncs across UI and 3D canvas
- **Mobile support** — bottom sheet panel, swipe to close, pinch to zoom, floating action buttons
- **Lowbake branding** — standard logo (light mode), white logo (dark mode), favicon

## Setup

```bash
npm install
npm start
```

Runs at `http://localhost:3000` by default. To use a different port:

```bash
PORT=3001 npm start
```

## Build

```bash
npm run build
```

Output goes to `build/`. The `CI=false` flag is set so warnings don't fail the build.

## Deploy to Vercel

1. Push to GitHub
2. Import the repo at [vercel.com](https://vercel.com)
3. Deploy — no additional config needed

## Email Integration

Quote requests currently simulate success. To wire up real email delivery, edit the `handleSubmit` function inside `QuoteModal` in `src/BoothConfigurator.jsx` and replace the `setTimeout` placeholder with one of:

- **Vercel serverless function** — create `api/quote.js` using Resend or SendGrid
- **Formspree** — `fetch("https://formspree.io/f/YOUR_ID", ...)`
- **EmailJS** — `emailjs.send("service_xxx", "template_xxx", ...)`

## Embed

```html
<iframe
  src="https://your-vercel-url.vercel.app"
  width="100%"
  height="850px"
  style="border:none;"
  allowfullscreen>
</iframe>
```

## Logos

Logo assets are not bundled in the repo. Place the following files in `src/` before building:

| File | Usage |
|------|-------|
| `lowbake-logo.png` | Standard logo (light mode header + quote modal) |
| `lowbake-logo-white.png` | White logo (dark mode header) |

Favicon (`favicon.png`) lives in `public/`.
