export const sampleConfig = {
    appName: "IP Geolocation API",
    description:
        "Look up geolocation and network details for an IPv4 or IPv6 address with country, region, city, coordinates, and ASN data.",
    endpoint: "/v1/ip-geolocation",
    method: "POST",
    docsUrl: "https://datpaq.com/docs/ip-geolocation",
    defaultBody: {
        ip: "108.44.168.128",
    },
    responseHighlights: ["ip", "location.country", "location.city", "network.asn", "network.org"],
};

export function getApiBaseUrl() {
    if (import.meta.env.DEV) {
        return "/api";
    }

    return import.meta.env.VITE_DATPAQ_API_BASE_URL || "https://datpaq.com/api";
}
