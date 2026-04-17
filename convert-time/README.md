# DATPAQ Convert Time API Sample SPA

Single-page React app demonstrating how to call the DATPAQ Convert Time API and render conversion results in a production-ready UI.

## API Key Required
A DATPAQ API key is required to use this app.

1. Get an API key from DATPAQ.
2. Paste it into the **API Key** field in the app.
3. The app sends it as `x-api-key` on requests.

Without a valid API key, requests will fail.

## API Details
- Docs URL: [https://datpaq.com/docs/convert-time](https://datpaq.com/docs/convert-time)
- Base URL: `https://datpaq.com/api`
- Route used by this sample: `GET /v1/convert-time`
- Full endpoint: `https://datpaq.com/api/v1/convert-time`

## Query Options
The app builds query parameters for `GET /v1/convert-time`.

- `sourceTime` (required)
  - Accepts ISO 8601, epoch seconds, or epoch milliseconds.
- Source selector (one required):
  - `sourceZone` (IANA timezone, example: `America/New_York`)
  - `sourceLocation` (location string, example: `New York, NY`)
- Target selector (one required):
  - `targetZone` (IANA timezone, example: `Asia/Tokyo`)
  - `targetLocation` (location string, example: `Tokyo, Japan`)

## Example Requests
- Timezone to timezone:
  - `/v1/convert-time?sourceTime=2026-03-09T16:00:00Z&sourceZone=America/New_York&targetZone=Asia/Tokyo`
- Location to location:
  - `/v1/convert-time?sourceTime=1762531200&sourceLocation=New%20York%2C%20NY&targetLocation=Tokyo%2C%20Japan`
- Mixed mode:
  - `/v1/convert-time?sourceTime=2026-03-09T16:00:00Z&sourceZone=America/New_York&targetLocation=London%2C%20UK`

## App Features
- Source/target selection via tabs (Timezone or Location)
- Built-in request validation before submit
- Loading, error, and success states
- Copyable request URL
- Copyable JSON response
- Light/dark theme toggle

## Local Development
```bash
npm install
npm run dev
```

## Environment Variables
- `VITE_DATPAQ_API_BASE_URL` (optional, defaults to `https://datpaq.com/api`)
- `VITE_DATPAQ_API_KEY` (optional prefill)
- `VITE_DATPAQ_API_TOKEN` (optional bearer token)

## Quality Checks
```bash
npm run lint
npm run build
```

## AI/Agent + SEO Assets
- `public/openapi.json`
- `public/llms.txt`
- `public/llms-full.txt`
- `public/robots.txt`
- Metadata + JSON-LD in `index.html`
