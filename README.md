# Lowbake Booth Configurator

3D spray booth configurator with per-panel lighting layout, quote request system, and mobile support.

## Setup

```bash
npm install
npm start
```

Opens at `http://localhost:3000`

## Deploy to Vercel

1. Push to GitHub
2. Import repo at vercel.com
3. Deploy — no config needed

## Email Integration

Edit `src/BoothConfigurator.jsx`, find the `handleSubmit` function in `QuoteModal`, and replace the `setTimeout` placeholder with your email endpoint (Formspree, Resend, SendGrid, etc).

## Embed in WordPress

```html
<iframe src="https://your-vercel-url.vercel.app" width="100%" height="850px" style="border:none;" allowfullscreen></iframe>
```
