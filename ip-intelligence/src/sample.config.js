export const sampleConfig = {
    appName: "IP Intelligence API",
    description:
        "Analyze IP reputation and threat posture with risk scoring, VPN/Tor/proxy detection, ASN context, and geolocation metadata.",
    endpoint: "/v1/ip-intelligence",
    method: "GET",
    docsUrl: "https://datpaq.com/docs/ip-intelligence",
    defaultQuery: {
        ip: "108.44.168.128",
    },
    defaultBody: null,
    responseHighlights: [
        "data.ip",
        "data.country",
        "data.asn",
        "data.threat_intelligence.threat_score",
        "data.threat_intelligence.is_malicious",
    ],
};

export function getApiBaseUrl() {
    if (import.meta.env.DEV) {
        return "/api";
    }

    return import.meta.env.VITE_DATPAQ_API_BASE_URL || "https://datpaq.com/api";
}
