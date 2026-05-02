# DATPAQ WHOIS Sample

Production-ready SPA sample for the DATPAQ WHOIS Domain Lookup API.

## What it does

- Preserves the shared DATPAQ shell, theme toggle, header, and footer from the base template.
- Accepts a required API key and a single domain or comma-separated batch of domains.
- Calls the API only through `src/hooks/useDatpaqRequest.js` and `src/lib/datpaq-client.js`.
- Renders empty, loading, error, partial, and success states.
- Exposes copyable request URLs and formatted JSON responses.
- Ships crawlable metadata plus `llms.txt`, `llms-full.txt`, `openai.json`, and `openapi.json`.

## API route used

- Docs: https://www.datpaq.com/docs/whois
- Base URL: `https://datpaq.com/api`
- Route: `GET /v1/whois/lookup`
- Auth behavior in this sample: user-supplied API key, sent by header and mirrored into `api_key` for WHOIS request URL compatibility

## Development

```bash
npm install
npm run dev
```

## Validation

```bash
npm run lint
npm run build
```
