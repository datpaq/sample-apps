export const sampleConfig = {
    appName: "WHOIS Domain Lookup",
    description:
        "Run single or batch WHOIS lookups for registrar ownership, registration dates, TLD enrichment, name servers, and raw WHOIS payloads.",
    endpoint: "/v1/whois/lookup",
    method: "GET",
    docsUrl: "https://www.datpaq.com/docs/whois",
    defaultQuery: {
        domain: "openai.com",
    },
    defaultBody: null,
    responseHighlights: ["domain", "registrar", "creationDate", "expirationDate", "nameServers", "raw"],
};

export function getApiBaseUrl() {
    if (import.meta.env.DEV) {
        return "/api";
    }

    return getPublicApiBaseUrl();
}

export function getPublicApiBaseUrl() {
    return import.meta.env.VITE_DATPAQ_API_BASE_URL || "https://datpaq.com/api";
}
