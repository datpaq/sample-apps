# DATPAQ User Avatar API Sample

Production-ready React + Tailwind SPA demonstrating the DATPAQ User Avatar endpoint.

## What this sample includes
- Template shell with theme toggle, header, and footer behavior.
- ShadCN-style UI primitives (Button, Input, Card, Label).
- Avatar generation form for key query params (`name`, `size`, `shape`, `format`, colors, and more).
- Required API key input for `x-api-key` authentication.
- Full UX states: empty, loading, error, and success.
- Copyable request URL.
- Copyable JSON response metadata block (including image response details).
- Crawlability + AI docs: `robots.txt`, `llms.txt`, `llms-full.txt`, `openai.json`.

## Endpoint
- Base URL: `https://datpaq.com/api`
- Route: `GET /v1/user-avatar`
- Docs: `https://www.datpaq.com/docs/user-avatar`

## Quick start
```bash
npm install
npm run dev
```

## Build + lint
```bash
npm run lint
npm run build
```

## Environment variables
- `VITE_DATPAQ_API_BASE_URL` (optional; defaults to `https://datpaq.com/api` in production)
- `VITE_DATPAQ_PROXY_TARGET` (optional dev proxy target for `/api`)
- `VITE_DATPAQ_API_KEY` (optional prefill for API key input)
- `VITE_DATPAQ_API_TOKEN` (optional bearer token)

In local development, requests default to `/api` and are proxied by Vite.
