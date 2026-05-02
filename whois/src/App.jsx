import { useEffect, useMemo, useState } from "react";
import { useDatpaqRequest } from "./hooks/useDatpaqRequest";
import { Button } from "./components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./components/ui/card";
import { Input } from "./components/ui/input";
import { Label } from "./components/ui/label";
import { getApiBaseUrl, getPublicApiBaseUrl, sampleConfig } from "./sample.config";

const API_BASE_URL = getApiBaseUrl();
const PUBLIC_API_BASE_URL = getPublicApiBaseUrl();
const SAMPLE_DOMAINS = ["openai.com", "github.com", "whitehouse.gov"];

function createDefaultFormState() {
    return {
        domains: sampleConfig.defaultQuery.domain,
    };
}

function normalizeDomains(value) {
    return String(value || "")
        .split(/[\s,]+/)
        .map((item) => item.trim().toLowerCase())
        .filter(Boolean);
}

function isLikelyDomain(value) {
    return /^(?=.{1,253}$)(?!-)(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,63}$/i.test(value);
}

function buildRequestUrl(baseUrl, path, query) {
    const normalizedBaseUrl = String(baseUrl || "").replace(/\/+$/, "");
    const normalizedPath = String(path || "").startsWith("/") ? path : `/${String(path || "")}`;
    const url = new URL(`${normalizedBaseUrl}${normalizedPath}`);

    Object.entries(query || {}).forEach(([key, value]) => {
        if (value === undefined || value === null || value === "") {
            return;
        }

        url.searchParams.set(key, String(value));
    });

    return url.toString();
}

function formatDate(value) {
    if (!value) {
        return "-";
    }

    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
        return String(value);
    }

    return new Intl.DateTimeFormat("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
    }).format(date);
}

function formatText(value, fallback = "-") {
    if (value === undefined || value === null || value === "") {
        return fallback;
    }

    if (typeof value === "boolean") {
        return value ? "Yes" : "No";
    }

    return String(value);
}

function truncate(value, maxLength = 320) {
    if (!value) {
        return "";
    }

    const text = String(value);
    if (text.length <= maxLength) {
        return text;
    }

    return `${text.slice(0, maxLength).trimEnd()}...`;
}

function getLookupEntries(payload) {
    if (!payload) {
        return [];
    }

    return Array.isArray(payload) ? payload : [payload];
}

function isLookupSuccess(entry) {
    return Boolean(entry && typeof entry === "object" && entry.domain && !entry.error);
}

function getLookupErrorMessage(entry) {
    if (!entry || typeof entry !== "object") {
        return "";
    }

    return entry.error || entry.message || entry.details || "";
}

function ResultStat({ label, value, toneClass }) {
    return (
        <div className={`rounded-2xl border px-4 py-3 ${toneClass}`}>
            <p className="text-[11px] font-semibold uppercase tracking-[0.22em] opacity-70">{label}</p>
            <p className="mt-2 text-2xl font-semibold tracking-tight">{value}</p>
        </div>
    );
}

function LookupDetailCard({ entry, isDark, subtleSurfaceClass, sectionLabelClass }) {
    return (
        <div className={`rounded-2xl border p-4 ${subtleSurfaceClass}`}>
            <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                    <p className="text-lg font-semibold tracking-tight">{formatText(entry.domain)}</p>
                    <p className={`mt-1 text-sm ${isDark ? "text-zinc-400" : "text-slate-600"}`}>
                        {formatText(entry.registrar, "Registrar unavailable")}
                    </p>
                </div>

                <div className="flex flex-wrap gap-2">
                    {entry.tld ? (
                        <span
                            className={`rounded-full border px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide ${
                                isDark
                                    ? "border-zinc-700 bg-zinc-950 text-zinc-300"
                                    : "border-slate-200 bg-white text-slate-700"
                            }`}
                        >
                            .{entry.tld}
                        </span>
                    ) : null}
                    {entry.fromCache ? (
                        <span
                            className={`rounded-full border px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide ${
                                isDark
                                    ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-300"
                                    : "border-emerald-600/20 bg-emerald-600/10 text-emerald-700"
                            }`}
                        >
                            Cached
                        </span>
                    ) : null}
                    {entry.registrantRedacted ? (
                        <span
                            className={`rounded-full border px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide ${
                                isDark
                                    ? "border-amber-500/40 bg-amber-500/10 text-amber-300"
                                    : "border-amber-500/20 bg-amber-500/10 text-amber-700"
                            }`}
                        >
                            Redacted
                        </span>
                    ) : null}
                </div>
            </div>

            <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                <div>
                    <p className={`text-[11px] font-semibold uppercase tracking-wide ${sectionLabelClass}`}>TLD type</p>
                    <p className="mt-1 text-sm">{formatText(entry.tldType)}</p>
                </div>
                <div>
                    <p className={`text-[11px] font-semibold uppercase tracking-wide ${sectionLabelClass}`}>Category</p>
                    <p className="mt-1 text-sm">{formatText(entry.category)}</p>
                </div>
                <div>
                    <p className={`text-[11px] font-semibold uppercase tracking-wide ${sectionLabelClass}`}>
                        Created
                    </p>
                    <p className="mt-1 text-sm">{formatDate(entry.creationDate)}</p>
                </div>
                <div>
                    <p className={`text-[11px] font-semibold uppercase tracking-wide ${sectionLabelClass}`}>
                        Expires
                    </p>
                    <p className="mt-1 text-sm">{formatDate(entry.expirationDate)}</p>
                </div>
            </div>

            <div className="mt-4 grid gap-3 md:grid-cols-[1.15fr_0.85fr]">
                <div>
                    <p className={`text-[11px] font-semibold uppercase tracking-wide ${sectionLabelClass}`}>
                        Name servers
                    </p>
                    <div className="mt-2 flex flex-wrap gap-2">
                        {(entry.nameServers || []).length ? (
                            entry.nameServers.map((server) => (
                                <span
                                    key={server}
                                    className={`rounded-full border px-2.5 py-1 text-xs ${
                                        isDark
                                            ? "border-zinc-700 bg-zinc-950 text-zinc-300"
                                            : "border-slate-200 bg-white text-slate-700"
                                    }`}
                                >
                                    {server}
                                </span>
                            ))
                        ) : (
                            <span className={`text-sm ${isDark ? "text-zinc-500" : "text-slate-500"}`}>
                                No authoritative name servers returned.
                            </span>
                        )}
                    </div>
                </div>

                <div>
                    <p className={`text-[11px] font-semibold uppercase tracking-wide ${sectionLabelClass}`}>
                        Geo metadata
                    </p>
                    <dl className="mt-2 space-y-1 text-sm">
                        <div className="flex items-center justify-between gap-4">
                            <dt className={isDark ? "text-zinc-500" : "text-slate-500"}>Country</dt>
                            <dd>{formatText(entry.countryName || entry.countryCode)}</dd>
                        </div>
                        <div className="flex items-center justify-between gap-4">
                            <dt className={isDark ? "text-zinc-500" : "text-slate-500"}>Region</dt>
                            <dd>{formatText(entry.region)}</dd>
                        </div>
                        <div className="flex items-center justify-between gap-4">
                            <dt className={isDark ? "text-zinc-500" : "text-slate-500"}>Government</dt>
                            <dd>{formatText(entry.isGovernment)}</dd>
                        </div>
                    </dl>
                </div>
            </div>

            {entry.raw ? (
                <div
                    className={`mt-4 rounded-xl border p-3 ${
                        isDark ? "border-zinc-800 bg-zinc-950/80" : "border-slate-200 bg-white/80"
                    }`}
                >
                    <p className={`text-[11px] font-semibold uppercase tracking-wide ${sectionLabelClass}`}>
                        Raw WHOIS preview
                    </p>
                    <pre className="mt-2 overflow-x-auto whitespace-pre-wrap break-words text-xs leading-relaxed">
                        {truncate(entry.raw, 420)}
                    </pre>
                </div>
            ) : null}
        </div>
    );
}

function App() {
    const [theme, setTheme] = useState(() => {
        if (typeof window === "undefined") {
            return "light";
        }

        const savedTheme = window.localStorage.getItem("theme");
        if (savedTheme === "light" || savedTheme === "dark") {
            return savedTheme;
        }

        return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
    });
    const [formValues, setFormValues] = useState(() => createDefaultFormState());
    const [apiKeyInput, setApiKeyInput] = useState(() => import.meta.env.VITE_DATPAQ_API_KEY || "");
    const [validationError, setValidationError] = useState("");
    const [requestUrl, setRequestUrl] = useState("");
    const [copied, setCopied] = useState({ url: false, json: false });

    const year = new Date().getFullYear();
    const isDark = theme === "dark";

    const { data, error, errorMessage, isLoading, run, retry, reset } = useDatpaqRequest({
        baseUrl: API_BASE_URL,
        apiKey: apiKeyInput.trim(),
        token: import.meta.env.VITE_DATPAQ_API_TOKEN,
    });

    const responsePayload = useMemo(() => {
        if (data) {
            return data;
        }

        if (error?.details) {
            return typeof error.details === "object" ? error.details : { success: false, error: error.details };
        }

        return null;
    }, [data, error]);

    const responseJson = useMemo(
        () => (responsePayload ? JSON.stringify(responsePayload, null, 2) : ""),
        [responsePayload],
    );

    const lookupEntries = useMemo(() => getLookupEntries(data), [data]);
    const successfulLookups = useMemo(
        () => lookupEntries.filter((entry) => isLookupSuccess(entry)),
        [lookupEntries],
    );
    const failedLookups = useMemo(
        () => lookupEntries.filter((entry) => !isLookupSuccess(entry) && getLookupErrorMessage(entry)),
        [lookupEntries],
    );

    const hasRequest = Boolean(requestUrl);
    const hasSuccessData = successfulLookups.length > 0;
    const hasLookupErrors = failedLookups.length > 0 && !hasSuccessData;

    useEffect(() => {
        window.localStorage.setItem("theme", theme);
    }, [theme]);

    useEffect(() => {
        const themeColorMeta = document.querySelector('meta[name="theme-color"]');
        if (themeColorMeta) {
            themeColorMeta.setAttribute("content", isDark ? "#0d0d0d" : "#f8fafc");
        }
    }, [isDark]);

    const handleSubmit = async (event) => {
        event.preventDefault();

        const parsedDomains = normalizeDomains(formValues.domains);

        if (!apiKeyInput.trim()) {
            setValidationError("API key is required.");
            return;
        }

        if (!parsedDomains.length) {
            setValidationError("Enter at least one domain name.");
            return;
        }

        if (parsedDomains.length > 50) {
            setValidationError("WHOIS batch requests support up to 50 domains.");
            return;
        }

        const invalidDomain = parsedDomains.find((domain) => !isLikelyDomain(domain));
        if (invalidDomain) {
            setValidationError(`"${invalidDomain}" is not a valid domain.`);
            return;
        }

        const query = {
            domain: parsedDomains.join(","),
            api_key: apiKeyInput.trim(),
        };

        setValidationError("");
        setRequestUrl(buildRequestUrl(PUBLIC_API_BASE_URL, sampleConfig.endpoint, query));

        try {
            await run({
                path: sampleConfig.endpoint,
                method: sampleConfig.method,
                query,
            });
        } catch {
            // Transport and non-2xx API errors are handled by useDatpaqRequest.
        }
    };

    const handleReset = () => {
        setFormValues(createDefaultFormState());
        setApiKeyInput(import.meta.env.VITE_DATPAQ_API_KEY || "");
        setValidationError("");
        setRequestUrl("");
        setCopied({ url: false, json: false });
        reset();
    };

    const handleCopy = async (key, value) => {
        if (!value) {
            return;
        }

        try {
            await navigator.clipboard.writeText(value);
            setCopied((current) => ({ ...current, [key]: true }));
            window.setTimeout(() => {
                setCopied((current) => ({ ...current, [key]: false }));
            }, 1200);
        } catch {
            setCopied((current) => ({ ...current, [key]: false }));
        }
    };

    const surfaceClass = isDark
        ? "border-zinc-700/80 bg-[#141414]/90 text-zinc-100 shadow-2xl shadow-black/30"
        : "border-slate-200/90 bg-white/92 text-slate-900 shadow-xl shadow-slate-200/60";

    const subtleSurfaceClass = isDark
        ? "border-zinc-800 bg-zinc-950/55 text-zinc-100"
        : "border-slate-200 bg-slate-50/90 text-slate-900";

    const accentSurfaceClass = isDark
        ? "border-cyan-500/20 bg-cyan-500/10 text-cyan-100"
        : "border-cyan-500/20 bg-cyan-500/8 text-slate-900";

    const inputClass = isDark
        ? "border-zinc-700 bg-zinc-900 text-zinc-100 placeholder:text-zinc-500 focus-visible:border-cyan-400 focus-visible:ring-cyan-500/30"
        : "border-slate-300 bg-white text-slate-900 placeholder:text-slate-400 focus-visible:border-sky-500 focus-visible:ring-sky-500/30";

    const outlineButtonClass = isDark
        ? "border-zinc-700 bg-transparent text-zinc-200 hover:bg-zinc-900"
        : "border-slate-300 bg-transparent text-slate-700 hover:bg-slate-100";

    const secondaryButtonClass = isDark
        ? "bg-zinc-800 text-zinc-100 hover:bg-zinc-700"
        : "bg-slate-200 text-slate-900 hover:bg-slate-300";

    const sectionLabelClass = isDark ? "text-zinc-400" : "text-slate-600";
    const requiredLabelClass = isDark ? "text-red-300" : "text-red-500";
    const emptyToneClass = isDark
        ? "border-dashed border-zinc-700 bg-zinc-950/35 text-zinc-300"
        : "border-dashed border-slate-300 bg-slate-50 text-slate-600";

    return (
        <div
            className={`relative min-h-screen overflow-hidden px-6 py-8 font-sans md:px-10 md:py-10 ${
                isDark
                    ? "bg-[radial-gradient(circle_at_15%_15%,#232323_0%,#141414_45%,#0d0d0d_100%)] text-zinc-100"
                    : "bg-[radial-gradient(circle_at_15%_15%,#dbeafe_0%,#f8fafc_40%,#f8fafc_100%)] text-slate-900"
            }`}
        >
            <div className="pointer-events-none fixed -left-[20px] top-[0px] z-0">
                <div
                    className={`select-none font-['Inter'] text-[clamp(7rem,20vw,14rem)] leading-none font-black tracking-[-0.1em] [transform-origin:0_0] ${
                        isDark ? "text-zinc-700/70" : "text-black"
                    }`}
                    style={{ transform: "rotate(90deg) translateY(-100%)" }}
                >
                    DATPAQ
                </div>
            </div>

            <div
                className={`relative z-10 mx-auto flex min-h-[calc(100vh-4rem)] w-full max-w-6xl flex-col rounded-xl p-6 backdrop-blur-sm md:p-10 ${
                    isDark
                        ? "border border-zinc-700/80 bg-[#141414]/90 shadow-2xl shadow-black/60"
                        : "border border-slate-200/80 bg-white/90 shadow-xl"
                }`}
            >
                <header
                    className={`flex items-center justify-between pb-5 ${
                        isDark ? "border-b border-zinc-700" : "border-b border-slate-200"
                    }`}
                >
                    <div className="cursor-default font-['Inter'] text-3xl font-black tracking-tight">DP.</div>
                    <div className="flex items-center gap-2">
                        <a
                            href={sampleConfig.docsUrl}
                            target="_blank"
                            rel="noreferrer"
                            className={`inline-flex items-center gap-2 rounded-md border px-3 py-2 text-sm font-semibold transition ${
                                isDark
                                    ? "border-zinc-600 bg-zinc-900 text-zinc-100 hover:border-zinc-300 hover:text-white"
                                    : "border-slate-300 bg-white text-slate-800 hover:border-slate-900 hover:text-slate-900"
                            }`}
                        >
                            <svg
                                className="h-4 w-4"
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="2"
                                aria-hidden="true"
                            >
                                <path d="M7 17 17 7" />
                                <path d="M8 7h9v9" />
                            </svg>
                            <span className="inline-flex items-center gap-1.5">
                                <span>API Docs</span>
                                <span className="h-4 w-4 opacity-60">
                                    <svg
                                        xmlns="http://www.w3.org/2000/svg"
                                        viewBox="0 0 16 16"
                                        fill="none"
                                        stroke="currentColor"
                                        strokeWidth="2"
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        className="h-4 w-4"
                                    >
                                        <path d="m6 4 4 4-4 4" />
                                    </svg>
                                </span>
                                <span>WHOIS</span>
                            </span>
                        </a>

                        <button
                            type="button"
                            onClick={() => setTheme(isDark ? "light" : "dark")}
                            className={`inline-flex items-center gap-2 rounded-md border px-3 py-2 text-sm font-semibold transition ${
                                isDark
                                    ? "border-zinc-600 bg-zinc-900 text-zinc-100 hover:border-zinc-300 hover:text-white"
                                    : "border-slate-300 bg-white text-slate-800 hover:border-slate-900 hover:text-slate-900"
                            }`}
                            aria-label={`Switch to ${isDark ? "light" : "dark"} theme`}
                        >
                            {isDark ? (
                                <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                                    <path d="M12 3.75a.75.75 0 0 1 .75.75v1.5a.75.75 0 0 1-1.5 0V4.5a.75.75 0 0 1 .75-.75Zm0 14.25a.75.75 0 0 1 .75.75v1.5a.75.75 0 0 1-1.5 0v-1.5A.75.75 0 0 1 12 18Zm8.25-6a.75.75 0 0 1-.75.75H18a.75.75 0 0 1 0-1.5h1.5a.75.75 0 0 1 .75.75Zm-14.25 0a.75.75 0 0 1-.75.75H3.75a.75.75 0 0 1 0-1.5h1.5a.75.75 0 0 1 .75.75Zm10.277 5.277a.75.75 0 0 1 0 1.06l-1.06 1.06a.75.75 0 1 1-1.06-1.06l1.06-1.06a.75.75 0 0 1 1.06 0Zm-8.494-8.494a.75.75 0 0 1 0 1.06L6.723 10.91a.75.75 0 0 1-1.06-1.06l1.06-1.061a.75.75 0 0 1 1.06 0Zm8.494 0a.75.75 0 0 1 1.06 0l1.061 1.061a.75.75 0 1 1-1.06 1.06l-1.061-1.06a.75.75 0 0 1 0-1.06ZM6.723 17.277a.75.75 0 0 1 1.06 0l1.061 1.06a.75.75 0 1 1-1.06 1.061l-1.062-1.06a.75.75 0 0 1 0-1.061ZM12 8.25A3.75 3.75 0 1 1 8.25 12 3.75 3.75 0 0 1 12 8.25Z" />
                                </svg>
                            ) : (
                                <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                                    <path d="M21.64 13.02a1 1 0 0 0-1.22-.66 8 8 0 0 1-9.8-9.8 1 1 0 0 0-1.88-.78A10 10 0 1 0 22.42 14.9a1 1 0 0 0-.78-1.88Z" />
                                </svg>
                            )}
                            <span className="hidden lg:inline">{isDark ? "Light" : "Dark"}</span>
                        </button>
                    </div>
                </header>

                <main className="flex min-h-0 flex-1 py-8 md:py-10">
                    <div className="mx-auto grid h-full min-h-0 w-full max-w-[1180px] items-start gap-8 lg:grid-cols-[minmax(410px,540px)_minmax(0,1fr)]">
                        <Card className={`${surfaceClass} h-fit`}>
                            <CardHeader className="pb-5">
                                <div className="mb-4 flex flex-wrap items-center gap-2">
                                    <span
                                        className={`inline-flex items-center rounded-full border px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide ${
                                            isDark
                                                ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-300"
                                                : "border-emerald-600/25 bg-emerald-600/10 text-emerald-700"
                                        }`}
                                    >
                                        {sampleConfig.method}
                                    </span>
                                    <span
                                        className={`inline-flex items-center rounded-full border px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide ${
                                            isDark
                                                ? "border-cyan-500/30 bg-cyan-500/10 text-cyan-200"
                                                : "border-cyan-500/20 bg-cyan-500/10 text-cyan-700"
                                        }`}
                                    >
                                        Single + batch lookup
                                    </span>
                                </div>
                                <CardTitle className="text-3xl leading-tight tracking-tight">
                                    {sampleConfig.appName}
                                </CardTitle>
                                <CardDescription className={`${isDark ? "text-zinc-400" : "text-slate-600"} text-lg`}>
                                    {sampleConfig.description}
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-6">
                                <div className={`rounded-2xl border p-4 ${accentSurfaceClass}`}>
                                    <p className="text-sm leading-6">
                                        Inspect registrar ownership, registration dates, TLD enrichment, and raw WHOIS
                                        records with a single query string. Batch mode accepts comma-separated domains.
                                    </p>
                                    <div className="mt-4 grid gap-3 sm:grid-cols-3">
                                        <ResultStat
                                            label="Auth"
                                            value="api_key"
                                            toneClass={
                                                isDark ? "border-cyan-500/20 bg-black/20" : "border-white/50 bg-white/70"
                                            }
                                        />
                                        <ResultStat
                                            label="Route"
                                            value="/lookup"
                                            toneClass={
                                                isDark ? "border-cyan-500/20 bg-black/20" : "border-white/50 bg-white/70"
                                            }
                                        />
                                        <ResultStat
                                            label="Batch size"
                                            value="50 max"
                                            toneClass={
                                                isDark ? "border-cyan-500/20 bg-black/20" : "border-white/50 bg-white/70"
                                            }
                                        />
                                    </div>
                                </div>

                                <form onSubmit={handleSubmit} className="space-y-6">
                                    <div className="space-y-2.5">
                                        <div className="flex items-center justify-between">
                                            <Label htmlFor="apiKey" className={sectionLabelClass}>
                                                API Key
                                            </Label>
                                            <span
                                                className={`text-[11px] font-semibold uppercase tracking-wide ${requiredLabelClass}`}
                                            >
                                                Required
                                            </span>
                                        </div>
                                        <Input
                                            id="apiKey"
                                            value={apiKeyInput}
                                            onChange={(event) => setApiKeyInput(event.target.value)}
                                            placeholder="Paste DATPAQ API key"
                                            className={inputClass}
                                            autoComplete="off"
                                            spellCheck="false"
                                        />
                                    </div>

                                    <div className="space-y-2.5">
                                        <div className="flex items-center justify-between">
                                            <Label htmlFor="domains" className={sectionLabelClass}>
                                                Domain query
                                            </Label>
                                            <span
                                                className={`text-[11px] font-semibold uppercase tracking-wide ${requiredLabelClass}`}
                                            >
                                                Required
                                            </span>
                                        </div>
                                        <Input
                                            id="domains"
                                            value={formValues.domains}
                                            onChange={(event) =>
                                                setFormValues((current) => ({
                                                    ...current,
                                                    domains: event.target.value,
                                                }))
                                            }
                                            placeholder="openai.com or openai.com, github.com"
                                            className={inputClass}
                                            autoComplete="off"
                                            spellCheck="false"
                                        />
                                        <p className={`text-sm ${isDark ? "text-zinc-500" : "text-slate-500"}`}>
                                            Use a single domain or a comma-separated batch up to 50 domains.
                                        </p>
                                        <div className="flex flex-wrap gap-2.5">
                                            {SAMPLE_DOMAINS.map((domain) => (
                                                <Button
                                                    key={domain}
                                                    type="button"
                                                    variant="secondary"
                                                    size="sm"
                                                    className={secondaryButtonClass}
                                                    onClick={() =>
                                                        setFormValues((current) => ({
                                                            ...current,
                                                            domains: domain,
                                                        }))
                                                    }
                                                >
                                                    {domain}
                                                </Button>
                                            ))}
                                            <Button
                                                type="button"
                                                variant="outline"
                                                size="sm"
                                                className={outlineButtonClass}
                                                onClick={() =>
                                                    setFormValues((current) => ({
                                                        ...current,
                                                        domains: SAMPLE_DOMAINS.join(", "),
                                                    }))
                                                }
                                            >
                                                Load batch sample
                                            </Button>
                                        </div>
                                    </div>

                                    <div className={`grid gap-3 rounded-2xl border p-4 md:grid-cols-3 ${subtleSurfaceClass}`}>
                                        <div>
                                            <p className={`text-[11px] font-semibold uppercase tracking-wide ${sectionLabelClass}`}>
                                                Endpoint
                                            </p>
                                            <p className="mt-1 text-sm font-medium">{sampleConfig.endpoint}</p>
                                        </div>
                                        <div>
                                            <p className={`text-[11px] font-semibold uppercase tracking-wide ${sectionLabelClass}`}>
                                                Auth mode
                                            </p>
                                            <p className="mt-1 text-sm font-medium">Query + header</p>
                                        </div>
                                        <div>
                                            <p className={`text-[11px] font-semibold uppercase tracking-wide ${sectionLabelClass}`}>
                                                Highlights
                                            </p>
                                            <p className="mt-1 text-sm font-medium">Registrar, dates, raw WHOIS</p>
                                        </div>
                                    </div>

                                    {validationError ? (
                                        <div
                                            className={`rounded-xl border px-4 py-3 text-sm ${
                                                isDark
                                                    ? "border-red-500/40 bg-red-500/10 text-red-200"
                                                    : "border-red-200 bg-red-50 text-red-700"
                                            }`}
                                        >
                                            {validationError}
                                        </div>
                                    ) : null}

                                    <div className="flex flex-wrap gap-2.5">
                                        <Button
                                            type="submit"
                                            disabled={isLoading}
                                            className={isDark ? "bg-zinc-100 text-zinc-900 hover:bg-white" : ""}
                                        >
                                            {isLoading ? "Running lookup..." : "Run WHOIS lookup"}
                                        </Button>
                                        <Button
                                            type="button"
                                            variant="outline"
                                            className={outlineButtonClass}
                                            onClick={handleReset}
                                        >
                                            Reset
                                        </Button>
                                    </div>
                                </form>
                            </CardContent>
                        </Card>

                        <Card className={`${surfaceClass} flex min-h-0 flex-col overflow-hidden lg:h-full`}>
                            <CardHeader className="pb-4">
                                <CardTitle className="text-xl">Response</CardTitle>
                                <CardDescription className={isDark ? "text-zinc-400" : "text-slate-600"}>
                                    Lookup results, payload diagnostics, and raw JSON for direct inspection.
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="flex min-h-0 flex-1 flex-col gap-5 overflow-hidden">
                                {!hasRequest && !isLoading ? (
                                    <div className={`rounded-2xl border p-6 ${emptyToneClass}`}>
                                        <p className="text-lg font-semibold tracking-tight">Ready for a lookup</p>
                                        <p className="mt-2 max-w-xl text-sm leading-6">
                                            Submit a domain to inspect registration metadata, name servers, privacy
                                            flags, and raw WHOIS output. Batch mode returns one result per requested
                                            domain.
                                        </p>
                                        <div className="mt-5 grid gap-3 sm:grid-cols-2">
                                            <div
                                                className={`rounded-2xl border px-4 py-3 ${
                                                    isDark ? "border-zinc-700 bg-zinc-900/50" : "border-slate-200 bg-white"
                                                }`}
                                            >
                                                <p className="text-[11px] font-semibold uppercase tracking-[0.22em] opacity-70">
                                                    Method
                                                </p>
                                                <p className="mt-2 text-2xl font-semibold tracking-tight">
                                                    {sampleConfig.method}
                                                </p>
                                            </div>
                                            <div
                                                className={`rounded-2xl border px-4 py-3 ${
                                                    isDark ? "border-zinc-700 bg-zinc-900/50" : "border-slate-200 bg-white"
                                                }`}
                                            >
                                                <p className="text-[11px] font-semibold uppercase tracking-[0.22em] opacity-70">
                                                    Auth
                                                </p>
                                                <p className="mt-2 text-xl font-semibold tracking-tight">api_key</p>
                                            </div>
                                            <div
                                                className={`rounded-2xl border px-4 py-3 sm:col-span-2 ${
                                                    isDark ? "border-zinc-700 bg-zinc-900/50" : "border-slate-200 bg-white"
                                                }`}
                                            >
                                                <p className="text-[11px] font-semibold uppercase tracking-[0.22em] opacity-70">
                                                    Path
                                                </p>
                                                <p className="mt-2 break-all text-xl font-semibold tracking-tight sm:text-2xl">
                                                    /v1/whois/lookup
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                ) : null}

                                {isLoading ? (
                                    <div className={`rounded-2xl border p-5 ${subtleSurfaceClass}`}>
                                        <div className="mb-3 h-2 w-32 animate-pulse rounded bg-current/30" />
                                        <div className="h-2 w-full animate-pulse rounded bg-current/15" />
                                        <div className="mt-3 h-2 w-5/6 animate-pulse rounded bg-current/15" />
                                        <p className={`mt-4 text-sm ${isDark ? "text-zinc-400" : "text-slate-600"}`}>
                                            Running request against <code>{sampleConfig.endpoint}</code>
                                        </p>
                                    </div>
                                ) : null}

                                {!isLoading && error ? (
                                    <div
                                        className={`space-y-3 rounded-2xl border p-4 ${
                                            isDark
                                                ? "border-red-500/40 bg-red-500/10 text-red-200"
                                                : "border-red-200 bg-red-50 text-red-700"
                                        }`}
                                    >
                                        <p className="text-sm font-medium">{errorMessage}</p>
                                        <Button
                                            type="button"
                                            size="sm"
                                            variant="outline"
                                            className={isDark ? "border-red-300/30 hover:bg-red-500/20" : ""}
                                            onClick={() => {
                                                retry().catch(() => {});
                                            }}
                                        >
                                            Retry request
                                        </Button>
                                    </div>
                                ) : null}

                                {!isLoading && !error && hasLookupErrors ? (
                                    <div
                                        className={`space-y-3 rounded-2xl border p-4 ${
                                            isDark
                                                ? "border-amber-500/40 bg-amber-500/10 text-amber-100"
                                                : "border-amber-200 bg-amber-50 text-amber-900"
                                        }`}
                                    >
                                        <p className="text-sm font-medium">
                                            The request completed, but the API returned lookup errors for every
                                            requested domain.
                                        </p>
                                        <div className="space-y-2 text-sm">
                                            {failedLookups.map((entry, index) => (
                                                <div
                                                    key={`${entry.domain || "error"}-${index}`}
                                                    className="rounded-xl border border-current/10 p-3"
                                                >
                                                    <p className="font-semibold">{formatText(entry.domain, "Request")}</p>
                                                    <p className="mt-1 opacity-90">{formatText(getLookupErrorMessage(entry))}</p>
                                                    {entry.correlationId ? (
                                                        <p className="mt-1 text-xs opacity-75">
                                                            Correlation ID: {entry.correlationId}
                                                        </p>
                                                    ) : null}
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                ) : null}

                                {!isLoading && !error && hasSuccessData ? (
                                    <div className="space-y-5">
                                        <div className="grid gap-3 md:grid-cols-3">
                                            <ResultStat
                                                label="Requested"
                                                value={String(normalizeDomains(formValues.domains).length)}
                                                toneClass={subtleSurfaceClass}
                                            />
                                            <ResultStat
                                                label="Returned"
                                                value={String(successfulLookups.length)}
                                                toneClass={subtleSurfaceClass}
                                            />
                                            <ResultStat
                                                label="Failures"
                                                value={String(failedLookups.length)}
                                                toneClass={subtleSurfaceClass}
                                            />
                                        </div>

                                        <div className="space-y-4">
                                            {successfulLookups.map((entry) => (
                                                <LookupDetailCard
                                                    key={`${entry.domain}-${entry.creationDate || "lookup"}`}
                                                    entry={entry}
                                                    isDark={isDark}
                                                    subtleSurfaceClass={subtleSurfaceClass}
                                                    sectionLabelClass={sectionLabelClass}
                                                />
                                            ))}
                                        </div>

                                        {failedLookups.length ? (
                                            <div
                                                className={`rounded-2xl border p-4 ${
                                                    isDark
                                                        ? "border-amber-500/30 bg-amber-500/8 text-amber-100"
                                                        : "border-amber-200 bg-amber-50 text-amber-900"
                                                }`}
                                            >
                                                <p className="text-sm font-semibold">Partial batch errors</p>
                                                <div className="mt-3 space-y-2 text-sm">
                                                    {failedLookups.map((entry, index) => (
                                                        <div key={`${entry.domain || "partial"}-${index}`}>
                                                            <span className="font-medium">
                                                                {formatText(entry.domain, "Unknown domain")}
                                                            </span>
                                                            {`: ${formatText(getLookupErrorMessage(entry))}`}
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        ) : null}
                                    </div>
                                ) : null}

                                {requestUrl ? (
                                    <div className={`shrink-0 rounded-2xl border p-3 ${subtleSurfaceClass}`}>
                                        <div className="mb-2 flex items-center justify-between gap-2">
                                            <Label className={sectionLabelClass}>Request URL</Label>
                                            <Button
                                                type="button"
                                                size="sm"
                                                variant="outline"
                                                className={outlineButtonClass}
                                                onClick={() => handleCopy("url", requestUrl)}
                                            >
                                                {copied.url ? "Copied" : "Copy"}
                                            </Button>
                                        </div>
                                        <pre className="overflow-x-auto whitespace-pre-wrap break-all text-xs leading-relaxed">
                                            {requestUrl}
                                        </pre>
                                    </div>
                                ) : null}

                                {responseJson ? (
                                    <div
                                        className={`flex min-h-0 flex-1 flex-col overflow-hidden rounded-2xl border p-3 ${subtleSurfaceClass}`}
                                    >
                                        <div className="mb-2 flex items-center justify-between gap-2">
                                            <Label className={sectionLabelClass}>JSON Response</Label>
                                            <Button
                                                type="button"
                                                size="sm"
                                                variant="outline"
                                                className={outlineButtonClass}
                                                onClick={() => handleCopy("json", responseJson)}
                                            >
                                                {copied.json ? "Copied" : "Copy"}
                                            </Button>
                                        </div>
                                        <pre className="min-h-0 flex-1 overflow-x-auto overflow-y-auto text-xs leading-relaxed">
                                            {responseJson}
                                        </pre>
                                    </div>
                                ) : null}
                            </CardContent>
                        </Card>
                    </div>
                </main>

                <footer
                    className={`flex flex-col gap-3 pt-5 text-sm md:flex-row md:items-center md:justify-between ${
                        isDark ? "border-t border-zinc-700 text-zinc-300" : "border-t border-slate-200 text-slate-600"
                    }`}
                >
                    <p>
                        &copy; {year}{" "}
                        <a
                            href="https://www.datpaq.com/"
                            className={`transition ${isDark ? "hover:text-white" : "hover:text-sky-600"}`}
                        >
                            DATPAQ.COM
                        </a>
                    </p>
                    <nav className="flex flex-wrap items-center gap-4">
                        <a
                            href="https://www.datpaq.com/apis"
                            className={`transition ${isDark ? "hover:text-white" : "hover:text-sky-600"}`}
                        >
                            APIs
                        </a>
                        <a
                            href="https://www.datpaq.com/docs"
                            className={`transition ${isDark ? "hover:text-white" : "hover:text-sky-600"}`}
                        >
                            Documentation
                        </a>
                        <a
                            href="https://www.datpaq.com/contact"
                            className={`transition ${isDark ? "hover:text-white" : "hover:text-sky-600"}`}
                        >
                            Contact
                        </a>
                    </nav>
                </footer>
            </div>
        </div>
    );
}

export default App;
