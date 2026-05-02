import { useEffect, useMemo, useState } from "react";
import { Button } from "./components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./components/ui/card";
import { Input } from "./components/ui/input";
import { Label } from "./components/ui/label";
import { useDatpaqRequest } from "./hooks/useDatpaqRequest";
import { getApiBaseUrl, sampleConfig } from "./sample.config";

const API_BASE_URL = getApiBaseUrl();

function createDefaultFormState() {
    return {
        ip: sampleConfig.defaultBody?.ip || "108.44.168.128",
    };
}

function buildRequestUrl(baseUrl, path, query) {
    const normalizedBaseUrl = String(baseUrl || "").replace(/\/+$/, "");
    const normalizedPath = String(path || "").startsWith("/") ? path : `/${String(path || "")}`;
    const rawUrl = `${normalizedBaseUrl}${normalizedPath}`;
    const url = new URL(rawUrl, typeof window !== "undefined" ? window.location.origin : "http://localhost");

    Object.entries(query || {}).forEach(([key, value]) => {
        if (value === undefined || value === null || value === "") {
            return;
        }

        url.searchParams.set(key, String(value));
    });

    return url.toString();
}

function validate(values, apiKey) {
    if (!apiKey.trim()) {
        return "API key is required.";
    }

    if (!values.ip.trim()) {
        return "IP address is required.";
    }

    if (values.ip.trim().length > 128) {
        return "IP address is too long.";
    }

    return "";
}

function toDisplay(value, fallback = "-") {
    if (value === undefined || value === null || value === "") {
        return fallback;
    }

    return String(value);
}

function formatCoordinate(value) {
    if (value === undefined || value === null || Number.isNaN(Number(value))) {
        return "-";
    }

    return Number(value).toFixed(4);
}

function resolveGeolocationData(payload) {
    if (!payload || typeof payload !== "object") {
        return null;
    }

    const baseData = payload.data && typeof payload.data === "object" ? payload.data : payload;
    if (baseData.ip || baseData.location || baseData.network || typeof baseData.found === "boolean" || baseData.error) {
        return baseData;
    }

    if (Array.isArray(baseData.results) && baseData.results.length > 0 && typeof baseData.results[0] === "object") {
        return baseData.results[0];
    }

    return null;
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
    const [hasRequested, setHasRequested] = useState(false);
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
            return typeof error.details === "object" ? error.details : { error: error.details };
        }

        return null;
    }, [data, error]);

    const responseJson = useMemo(
        () => (responsePayload ? JSON.stringify(responsePayload, null, 2) : ""),
        [responsePayload],
    );

    const geolocationData = useMemo(() => resolveGeolocationData(data), [data]);

    const hasSuccessData = Boolean(geolocationData?.ip || geolocationData?.location || geolocationData?.network);

    useEffect(() => {
        window.localStorage.setItem("theme", theme);
    }, [theme]);

    const handleSubmit = async (event) => {
        event.preventDefault();

        const formError = validate(formValues, apiKeyInput);
        if (formError) {
            setValidationError(formError);
            return;
        }

        const body = {
            ip: formValues.ip.trim(),
        };

        setValidationError("");
        setHasRequested(true);
        setRequestUrl(buildRequestUrl(API_BASE_URL, sampleConfig.endpoint));

        try {
            await run({
                path: sampleConfig.endpoint,
                method: sampleConfig.method,
                body,
            });
        } catch {
            // Error state is rendered from useDatpaqRequest.
        }
    };

    const handleReset = () => {
        setFormValues(createDefaultFormState());
        setApiKeyInput(import.meta.env.VITE_DATPAQ_API_KEY || "");
        setValidationError("");
        setRequestUrl("");
        setHasRequested(false);
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
        ? "border-zinc-700/70 bg-zinc-900/80 text-zinc-100"
        : "border-slate-200 bg-white/95 text-slate-900";

    const subtleSurfaceClass = isDark
        ? "border-zinc-700/70 bg-zinc-950/50 text-zinc-400"
        : "border-slate-200 bg-slate-50 text-slate-500";

    const inputClass = isDark
        ? "border-zinc-700 bg-zinc-900 text-zinc-100 placeholder:text-zinc-500 focus-visible:border-zinc-400 focus-visible:ring-zinc-500/30"
        : "";

    const outlineButtonClass = isDark ? "border-zinc-700 bg-transparent text-zinc-200 hover:bg-zinc-900" : "";

    const sectionLabelClass = isDark ? "text-zinc-400" : "text-slate-600";
    const requiredLabelClass = isDark ? "text-red-800" : "text-red-400";

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
                    <div className="font-['Inter'] text-3xl font-black tracking-tight cursor-default">DP.</div>
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
                                        className="w-4 h-4"
                                    >
                                        <path d="m6 4 4 4-4 4" />
                                    </svg>
                                </span>
                                <span>IP Geolocation</span>
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
                    <div className="mx-auto grid h-full min-h-0 w-full max-w-[1180px] items-start gap-8 lg:grid-cols-[minmax(360px,520px)_minmax(0,1fr)]">
                        <Card className={surfaceClass}>
                            <CardHeader className="pb-4">
                                <CardTitle className="mb-2 flex items-center justify-between gap-3">
                                    <h3 className="text-3xl leading-tight">{sampleConfig.appName}</h3>
                                    <span
                                        className={`inline-flex items-center rounded-full border px-2 py-1 text-[11px] font-semibold tracking-wide ${
                                            isDark
                                                ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-300"
                                                : "border-emerald-600/30 bg-emerald-600/10 text-emerald-700"
                                        }`}
                                    >
                                        {sampleConfig.method}
                                    </span>
                                </CardTitle>
                                <CardDescription className={`${isDark ? "text-zinc-400" : "text-slate-600"} text-lg`}>
                                    {sampleConfig.description}
                                </CardDescription>
                            </CardHeader>
                            <CardContent>
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
                                        />
                                    </div>

                                    <div className="space-y-2.5">
                                        <div className="flex items-center justify-between">
                                            <Label htmlFor="ip" className={sectionLabelClass}>
                                                IP Address
                                            </Label>
                                            <span
                                                className={`text-[11px] font-semibold uppercase tracking-wide ${requiredLabelClass}`}
                                            >
                                                Required
                                            </span>
                                        </div>
                                        <Input
                                            id="ip"
                                            value={formValues.ip}
                                            onChange={(event) =>
                                                setFormValues((current) => ({
                                                    ...current,
                                                    ip: event.target.value,
                                                }))
                                            }
                                            placeholder="108.44.168.128 or 2001:4860:4860::8888"
                                            className={inputClass}
                                        />
                                        <div className="flex flex-wrap gap-2.5">
                                            <Button
                                                type="button"
                                                variant="outline"
                                                size="sm"
                                                className={outlineButtonClass}
                                                onClick={() =>
                                                    setFormValues((current) => ({
                                                        ...current,
                                                        ip: "108.44.168.128",
                                                    }))
                                                }
                                            >
                                                Example IPv4
                                            </Button>
                                            <Button
                                                type="button"
                                                variant="outline"
                                                size="sm"
                                                className={outlineButtonClass}
                                                onClick={() =>
                                                    setFormValues((current) => ({
                                                        ...current,
                                                        ip: "2001:4860:4860::8888",
                                                    }))
                                                }
                                            >
                                                Example IPv6
                                            </Button>
                                        </div>
                                    </div>

                                    {validationError ? (
                                        <div
                                            className={`rounded-md border px-3 py-2 text-sm ${
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
                                            {isLoading ? "Locating..." : "Lookup IP"}
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
                                    IP geolocation details and raw response payload.
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="flex min-h-0 flex-1 flex-col gap-5 overflow-hidden">
                                {!hasRequested && !isLoading && !error ? (
                                    <div className={`rounded-lg border p-4 ${subtleSurfaceClass}`}>
                                        <p className={`text-sm ${isDark ? "text-zinc-400" : "text-slate-500"}`}>
                                            Enter an IP address and run a lookup to inspect location and network
                                            details.
                                        </p>
                                    </div>
                                ) : null}

                                {isLoading ? (
                                    <div className={`rounded-lg border p-4 ${subtleSurfaceClass}`}>
                                        <div className="mb-2 h-2 w-28 animate-pulse rounded bg-current/30" />
                                        <div className="h-2 w-full animate-pulse rounded bg-current/15" />
                                        <p className={`mt-4 text-sm ${isDark ? "text-zinc-400" : "text-slate-600"}`}>
                                            Running request against <code>{sampleConfig.endpoint}</code>
                                        </p>
                                    </div>
                                ) : null}

                                {!isLoading && error ? (
                                    <div
                                        className={`space-y-3 rounded-lg border p-4 ${
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

                                {!isLoading && !error && hasRequested && hasSuccessData ? (
                                    <div className="space-y-4">
                                        <div className={`rounded-lg border p-4 ${subtleSurfaceClass}`}>
                                            <p
                                                className={`text-xs font-semibold uppercase tracking-wide ${sectionLabelClass}`}
                                            >
                                                Result
                                            </p>
                                            <p className="mt-2 text-sm">
                                                <span className={isDark ? "text-zinc-400" : "text-slate-600"}>IP:</span>{" "}
                                                <code>{toDisplay(geolocationData.ip)}</code>
                                            </p>
                                            {typeof geolocationData.found === "boolean" ? (
                                                <p className="mt-1 text-sm">
                                                    <span className={isDark ? "text-zinc-400" : "text-slate-600"}>
                                                        Found:
                                                    </span>{" "}
                                                    <span
                                                        className={
                                                            geolocationData.found
                                                                ? "text-emerald-500"
                                                                : "text-amber-500"
                                                        }
                                                    >
                                                        {geolocationData.found ? "Yes" : "No"}
                                                    </span>
                                                </p>
                                            ) : null}
                                        </div>

                                        <div className="grid gap-3 md:grid-cols-2">
                                            <div className={`rounded-lg border p-3 ${subtleSurfaceClass}`}>
                                                <p
                                                    className={`text-xs font-semibold uppercase tracking-wide ${sectionLabelClass}`}
                                                >
                                                    Location
                                                </p>
                                                <p className="mt-2 text-sm">
                                                    {toDisplay(geolocationData.location?.country)}
                                                </p>
                                                <p className="text-xs opacity-80">
                                                    {toDisplay(geolocationData.location?.region)} •{" "}
                                                    {toDisplay(geolocationData.location?.city)}
                                                </p>
                                                <p className="mt-2 text-xs opacity-80">
                                                    {formatCoordinate(geolocationData.location?.latitude)},{" "}
                                                    {formatCoordinate(geolocationData.location?.longitude)}
                                                </p>
                                            </div>
                                            <div className={`rounded-lg border p-3 ${subtleSurfaceClass}`}>
                                                <p
                                                    className={`text-xs font-semibold uppercase tracking-wide ${sectionLabelClass}`}
                                                >
                                                    Network
                                                </p>
                                                <p className="mt-2 text-sm">
                                                    {toDisplay(geolocationData.network?.asn)}
                                                </p>
                                                <p className="text-xs opacity-80">
                                                    {toDisplay(geolocationData.network?.org)}
                                                </p>
                                                <p className="mt-2 text-xs opacity-80">
                                                    {toDisplay(geolocationData.network?.network)}
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                ) : null}

                                {!isLoading && !error && hasRequested && !hasSuccessData ? (
                                    <div className={`rounded-lg border p-4 text-sm ${subtleSurfaceClass}`}>
                                        No geolocation data was returned for this request.
                                    </div>
                                ) : null}

                                {requestUrl ? (
                                    <div className={`shrink-0 rounded-lg border p-3 ${subtleSurfaceClass}`}>
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
                                        <pre className="overflow-x-auto text-xs leading-relaxed break-all whitespace-pre-wrap">
                                            {requestUrl}
                                        </pre>
                                    </div>
                                ) : null}

                                {responseJson ? (
                                    <div
                                        className={`flex min-h-0 md:max-h-[22rem] flex-1 flex-col overflow-hidden rounded-lg border p-3 ${subtleSurfaceClass}`}
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
