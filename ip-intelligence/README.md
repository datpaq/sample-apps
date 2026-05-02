# DATPAQ IP Intelligence API Sample SPA

Single-page React app demonstrating how to call the DATPAQ IP Intelligence API and render threat and network intelligence in a production-ready UI.

## API Key Required
A DATPAQ API key is required to use this app.

1. Get an API key from DATPAQ.
2. Paste it into the **API Key** field in the app.
3. The app sends it as `x-api-key` on requests.

Without a valid API key, requests will fail.

## API Details
- Docs URL: [https://datpaq.com/api/v1/ip-intelligence](https://datpaq.com/api/v1/ip-intelligence)
- Base URL: `https://datpaq.com/api`
- Route used by this sample: `GET /v1/ip-intelligence`
- Full endpoint: `https://datpaq.com/api/v1/ip-intelligence`

## Query Parameters
The app sends query parameters to `GET /v1/ip-intelligence`.

- `ip` (required)
  - IPv4 or IPv6 input accepted by the API.

## Example Request
```text
/v1/ip-intelligence?ip=108.44.168.128
```

## App Features
- API key input with required indicator
- IP address input with quick example actions
- Built-in request validation before submit
- Loading, error, empty, and success states
- Threat signal summary (malicious flag, threat score, trust score, VPN/Tor/proxy)
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
- `public/openai.json`
- `public/llms.txt`
- `public/robots.txt`
- Metadata + JSON-LD in `index.html`
