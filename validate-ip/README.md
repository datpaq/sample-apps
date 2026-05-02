# DATPAQ Validate IP API Sample

Production-ready single-page application demonstrating the DATPAQ Validate IP API.

## Features

- Single IP, IPv6, and CIDR validation.
- Batch validation using newline or comma separated input.
- Copyable request URL and raw JSON response.
- Loading, empty, error, and success states.
- SEO metadata plus machine-readable AI docs in `public/`.

## Development

```bash
npm install
npm run dev
```

## API Reference

- Docs: https://www.datpaq.com/docs/validate-ip
- Endpoint: `POST https://datpaq.com/api/v1/validate-ip/validate`
- Auth: `x-api-key` header
