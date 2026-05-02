# DATPAQ Sample Data API Sample SPA

Single-page React app demonstrating how to call the DATPAQ Sample Data API and render generated records with production-ready request/response UX.

## API Key Required
A DATPAQ API key is required to use this app.

1. Get an API key from DATPAQ.
2. Paste it into the **API Key** field in the app.
3. The app sends it as `x-api-key` on every request.

## API Details
- Docs URL: [https://www.datpaq.com/docs/sample-data](https://www.datpaq.com/docs/sample-data)
- Base URL: `https://datpaq.com/api`
- Route used by this sample: `GET /v1/sample-data`
- Full endpoint: `https://datpaq.com/api/v1/sample-data`

## Query Options
The app builds query parameters for `GET /v1/sample-data`.

- `type` (required)
  - Dataset type to generate (example: `company`, `user`, `transaction`).
- `count` (optional)
  - Number of rows from 1 to 10000.
- `fields` (optional)
  - Comma-separated list of fields to include.
- `format` (optional)
  - `json` or `csv`.

## App Features
- Required API key input with clear validation
- Dataset type picker with all documented schema options
- Query controls for count, fields, and output format
- Loading, error, empty, and success states
- Copyable request URL
- Copyable response JSON block
- Light/dark theme toggle with DATPAQ shell layout

## Local Development
```bash
npm install
npm run dev
```

## Environment Variables
- `VITE_DATPAQ_API_BASE_URL` (optional, defaults to `https://datpaq.com/api` in production builds)
- `VITE_DATPAQ_PROXY_TARGET` (optional dev proxy upstream, defaults to `https://datpaq.com`)
- `VITE_DATPAQ_API_KEY` (optional prefill)
- `VITE_DATPAQ_API_TOKEN` (optional bearer token)

## Quality Checks
```bash
npm run lint
npm run build
```

## SEO + AI Docs
- `index.html` includes metadata and JSON-LD structured data
- `public/llms.txt`
- `public/llms-full.txt`
- `public/openai.json`
- `public/robots.txt`
