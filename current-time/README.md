# DATPAQ Current Time API Sample

Production-ready single-page app demonstrating live current time lookups with the DATPAQ Current Time API.

## Quick Start

```bash
npm install
npm run dev
```

## Environment

Optional:
- `VITE_DATPAQ_API_BASE_URL`
- `VITE_DATPAQ_API_KEY`
- `VITE_DATPAQ_API_TOKEN`

Local development uses a Vite `/api` proxy to avoid CORS-origin mismatches.

## API Contract Used

- Base URL: `https://datpaq.com/api`
- Endpoint: `GET /v1/current-time`
- Required query: `target`
- Auth header: `x-api-key`

## Features

- Time lookup using IANA timezone format (for example, `America/New_York`).
- Time lookup using comma-separated format (for example, `America, Arizona`).
- Loading, error, empty, and success response states.
- Copyable request URL and JSON response blocks.
- Theme toggle with consistent DATPAQ sample shell.
- SEO and machine-readable docs via `index.html` metadata, `public/llms.txt`, and `public/openai.json`.
