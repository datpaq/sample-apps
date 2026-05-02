# DATPAQ Image Processing API Sample

Production-ready React SPA demonstrating the DATPAQ Image Processing API with operation-aware validation, copyable diagnostics, and consistent DATPAQ shell/theme behavior.

## API details

- Docs: `https://www.datpaq.com/docs/image-processing`
- Base URL: `https://datpaq.com/api`
- Route used: `GET /v1/image-processing`
- Auth: `x-api-key` header

## Features

- API key input with required indicator.
- Query controls for `image`, `image_url`, `format`, `x`, `y`, `width`, `height`, `quality`.
- Operation profiles for `convert`, `resize`, `compress`, and `crop`.
- Loading, error, empty, and success response states.
- Copyable request URL and copyable JSON response payload.
- Optional image preview when URL/base64 appears in the response.
- SEO and agent-readable metadata via `index.html`, `public/llms.txt`, and `public/openai.json`.

## Quick start

```bash
npm install
npm run dev
```

## Validation and build

```bash
npm run lint
npm run build
```

## Environment variables

- `VITE_DATPAQ_API_BASE_URL` (optional; defaults to `https://datpaq.com/api` in production)
- `VITE_DATPAQ_PROXY_TARGET` (optional; defaults to `https://datpaq.com` for `/api` dev proxy)
- `VITE_DATPAQ_API_KEY` (optional prefill)
- `VITE_DATPAQ_API_TOKEN` (optional bearer token)

## Machine-readable docs

- `public/llms.txt`
- `public/llms-full.txt`
- `public/openai.json`
