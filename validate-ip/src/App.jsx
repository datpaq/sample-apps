import { useEffect, useState } from "react";
import { useDatpaqRequest } from "./hooks/useDatpaqRequest";
import { Button } from "./components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./components/ui/card";
import { Input } from "./components/ui/input";
import { Label } from "./components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./components/ui/tabs";
import { Textarea } from "./components/ui/textarea";
import { getApiBaseUrl, getPublicApiBaseUrl, sampleConfig } from "./sample.config";

const API_BASE_URL = getApiBaseUrl();
const PUBLIC_API_BASE_URL = getPublicApiBaseUrl();

const EXAMPLE_PRESETS = [
    {
        label: "Public IPv4",
        mode: "single",
        singleIp: "8.8.8.8",
    },
    {
        label: "Private IPv4",
        mode: "single",
        singleIp: "192.168.1.1",
    },
    {
        label: "IPv6",
        mode: "single",
        singleIp: "2001:db8::1",
    },
    {
        label: "CIDR",
        mode: "single",
        singleIp: "10.0.0.0/8",
    },
    {
        label: "Batch",
        mode: "batch",
        batchInput: "8.8.8.8\n127.0.0.1\n192.168.1.0/24\n2001:db8::1\ninvalid.ip.address",
    },
];

function createDefaultFormState() {
    return {
        mode: "single",
        singleIp: "8.8.8.8",
        batchInput: "8.8.8.8\n127.0.0.1\n192.168.1.0/24\n2001:db8::1\ninvalid.ip.address",
        correlationId: "validate-ip-demo",
    };
}

function parseBatchInput(value) {
    return String(value || "")
        .split(/[\n,]+/)
        .map((item) => item.trim())
        .filter(Boolean);
}

function buildRequestPayload(values) {
    if (values.mode === "batch") {
        return { ip: parseBatchInput(values.batchInput) };
    }

    return { ip: values.singleIp.trim() };
}

function validateForm(values, apiKey) {
    if (!apiKey.trim()) {
        return "API key is required.";
    }

    if (values.mode === "single" && !values.singleIp.trim()) {
        return "Enter an IPv4, IPv6, or CIDR value to validate.";
    }

    if (values.mode === "batch" && parseBatchInput(values.batchInput).length === 0) {
        return "Add at least one IP address or CIDR block for batch validation.";
    }

    return "";
}

function buildRequestUrl(baseUrl, path) {
    const normalizedBaseUrl = String(baseUrl || "").replace(/\/+$/, "");
    const normalizedPath = String(path || "").startsWith("/") ? path : `/${String(path || "")}`;
    return `${normalizedBaseUrl}${normalizedPath}`;
}

function normalizeResponsePayload(data, error) {
    if (data !== null && data !== undefined) {
        return data;
    }

    if (!error?.details) {
        return null;
    }

    return typeof error.details === "object" ? error.details : { error: error.details };
}

function normalizeResponseItems(payload) {
    if (Array.isArray(payload)) {
        return payload;
    }

    if (payload && typeof payload === "object" && "ip" in payload) {
        return [payload];
    }

    return [];
}

function getResponseSummary(items) {
    return items.reduce(
        (summary, item) => {
            summary.total += 1;

            if (item.valid) {
                summary.valid += 1;
            } else {
                summary.invalid += 1;
            }

            if (item.private) {
                summary.private += 1;
            }

            if (item.bogon) {
                summary.bogon += 1;
            }

            if (item.cidr) {
                summary.cidr += 1;
            }

            if (item.type === "IPv4") {
                summary.ipv4 += 1;
            }

            if (item.type === "IPv6") {
                summary.ipv6 += 1;
            }

            return summary;
        },
        {
            total: 0,
            valid: 0,
            invalid: 0,
            private: 0,
            bogon: 0,
            cidr: 0,
            ipv4: 0,
            ipv6: 0,
        },
    );
}

function getItemFlags(item) {
    return [
        item.type,
        item.cidr ? "CIDR" : null,
        item.private ? "Private" : null,
        item.reserved ? "Reserved" : null,
        item.loopback ? "Loopback" : null,
        item.multicast ? "Multicast" : null,
        item.link_local ? "Link local" : null,
        item.bogon ? "Bogon" : null,
        item.valid === false ? "Invalid" : null,
    ].filter(Boolean);
}

function getItemAccent(item, isDark) {
    if (!item.valid) {
        return isDark
            ? "border-red-500/30 bg-red-500/10 text-red-100"
            : "border-red-200 bg-red-50 text-red-900";
    }

    if (item.bogon || item.reserved || item.loopback) {
        return isDark
            ? "border-amber-500/30 bg-amber-500/10 text-amber-100"
            : "border-amber-200 bg-amber-50 text-amber-900";
    }

    if (item.private || item.link_local) {
        return isDark
            ? "border-sky-500/30 bg-sky-500/10 text-sky-100"
            : "border-sky-200 bg-sky-50 text-sky-900";
    }

    return isDark
        ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-100"
        : "border-emerald-200 bg-emerald-50 text-emerald-900";
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
    const [requestUrl, setRequestUrl] = useState(() => buildRequestUrl(PUBLIC_API_BASE_URL, sampleConfig.endpoint));
    const [requestBodyPreview, setRequestBodyPreview] = useState(() =>
        JSON.stringify(sampleConfig.defaultBody, null, 2),
    );
    const [copied, setCopied] = useState({ url: false, json: false, body: false });

    const year = new Date().getFullYear();
    const isDark = theme === "dark";

    const { data, error, errorMessage, isLoading, run, retry, reset } = useDatpaqRequest({
        baseUrl: API_BASE_URL,
        apiKey: apiKeyInput.trim(),
        token: import.meta.env.VITE_DATPAQ_API_TOKEN,
    });

    const responsePayload = normalizeResponsePayload(data, error);
    const responseItems = normalizeResponseItems(responsePayload);
    const responseSummary = getResponseSummary(responseItems);
    const responseJson = responsePayload ? JSON.stringify(responsePayload, null, 2) : "";
    const hasResponse = Boolean(responsePayload);
    const hasSuccessState = data !== null;
    const activeRequestUrl = requestUrl || buildRequestUrl(PUBLIC_API_BASE_URL, sampleConfig.endpoint);
    const activeBodyPreview = requestBodyPreview || JSON.stringify(sampleConfig.defaultBody, null, 2);

    useEffect(() => {
        window.localStorage.setItem("theme", theme);
    }, [theme]);

    const handleFieldChange = (key) => (event) => {
        setFormValues((current) => ({
            ...current,
            [key]: event.target.value,
        }));
    };

    const handleModeChange = (mode) => {
        setFormValues((current) => ({
            ...current,
            mode,
        }));
    };

    const handlePreset = (preset) => {
        setFormValues((current) => ({
            ...current,
            mode: preset.mode,
            singleIp: preset.singleIp ?? current.singleIp,
            batchInput: preset.batchInput ?? current.batchInput,
        }));
        setValidationError("");
    };

    const handleSubmit = async (event) => {
        event.preventDefault();

        const nextValidationError = validateForm(formValues, apiKeyInput);
        if (nextValidationError) {
            setValidationError(nextValidationError);
            return;
        }

        const payload = buildRequestPayload(formValues);

        setValidationError("");
        setRequestUrl(buildRequestUrl(PUBLIC_API_BASE_URL, sampleConfig.endpoint));
        setRequestBodyPreview(JSON.stringify(payload, null, 2));

        try {
            await run({
                path: sampleConfig.endpoint,
                method: sampleConfig.method,
                body: payload,
                headers: formValues.correlationId.trim()
                    ? { "x-correlation-id": formValues.correlationId.trim() }
                    : undefined,
            });
        } catch {
            // Error state is surfaced through useDatpaqRequest.
        }
    };

    const handleReset = () => {
        setFormValues(createDefaultFormState());
        setApiKeyInput(import.meta.env.VITE_DATPAQ_API_KEY || "");
        setValidationError("");
        setRequestUrl(buildRequestUrl(PUBLIC_API_BASE_URL, sampleConfig.endpoint));
        setRequestBodyPreview(JSON.stringify(sampleConfig.defaultBody, null, 2));
        setCopied({ url: false, json: false, body: false });
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

    const mutedSurfaceClass = isDark
        ? "border-zinc-800 bg-zinc-950/70 text-zinc-200"
        : "border-slate-200 bg-slate-50 text-slate-900";

    const inputClass = isDark
        ? "border-zinc-700 bg-zinc-950 text-zinc-100 placeholder:text-zinc-500 focus-visible:border-zinc-400 focus-visible:ring-zinc-500/30"
        : "";

    const primaryButtonClass = isDark
        ? "bg-zinc-100 text-zinc-950 hover:bg-white"
        : "bg-slate-900 text-white hover:bg-slate-700";

    const outlineButtonClass = isDark ? "border-zinc-700 bg-transparent text-zinc-200 hover:bg-zinc-900" : "";
    const tabsTriggerClass = isDark
        ? "data-[state=active]:bg-zinc-100 data-[state=active]:text-zinc-950"
        : "data-[state=active]:bg-slate-900 data-[state=active]:text-white";
    const tabsListClass = isDark ? "bg-zinc-950 text-zinc-400" : "";
    const sectionLabelClass = isDark ? "text-zinc-400" : "text-slate-600";
    const mutedTextClass = isDark ? "text-zinc-400" : "text-slate-500";
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
                                <span>{sampleConfig.appName}</span>
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
                    <div className="mx-auto grid h-full min-h-0 w-full max-w-[1180px] items-start gap-8 lg:grid-cols-[minmax(420px,560px)_minmax(0,1fr)]">
                        <Card className={`${surfaceClass} h-fit overflow-hidden`}>
                            <CardHeader className="gap-4 pb-4">
                                <div className="flex flex-wrap items-start justify-between gap-4">
                                    <div className="space-y-3">
                                        <div className="flex flex-wrap items-center gap-2">
                                            <span
                                                className={`inline-flex items-center rounded-full border px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] ${
                                                    isDark
                                                        ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-300"
                                                        : "border-emerald-600/20 bg-emerald-600/10 text-emerald-700"
                                                }`}
                                            >
                                                {sampleConfig.method}
                                            </span>
                                            <span
                                                className={`inline-flex items-center rounded-full border px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] ${
                                                    isDark
                                                        ? "border-zinc-700 bg-zinc-950 text-zinc-300"
                                                        : "border-slate-200 bg-slate-50 text-slate-600"
                                                }`}
                                            >
                                                IPv4, IPv6, CIDR
                                            </span>
                                        </div>
                                        <CardTitle className="max-w-xl text-3xl leading-tight md:text-4xl">
                                            Validate single addresses or entire IP batches in one request.
                                        </CardTitle>
                                        <CardDescription className={`${mutedTextClass} max-w-2xl text-sm leading-6`}>
                                            {sampleConfig.description}
                                        </CardDescription>
                                    </div>

                                    <div
                                        className={`rounded-2xl border px-4 py-3 text-right ${
                                            isDark ? "border-zinc-700 bg-zinc-950/70" : "border-slate-200 bg-slate-50"
                                        }`}
                                    >
                                        <div className={`text-xs font-semibold uppercase tracking-[0.2em] ${sectionLabelClass}`}>
                                            Endpoint
                                        </div>
                                        <div className="mt-2 text-sm font-semibold">{sampleConfig.endpoint}</div>
                                    </div>
                                </div>

                                <div className="flex flex-wrap gap-2">
                                    {EXAMPLE_PRESETS.map((preset) => (
                                        <button
                                            key={preset.label}
                                            type="button"
                                            onClick={() => handlePreset(preset)}
                                            className={`inline-flex items-center rounded-full border px-3 py-1.5 text-xs font-semibold transition ${
                                                isDark
                                                    ? "border-zinc-700 bg-zinc-950 text-zinc-300 hover:border-zinc-500 hover:text-white"
                                                    : "border-slate-200 bg-slate-50 text-slate-700 hover:border-slate-400 hover:text-slate-900"
                                            }`}
                                        >
                                            {preset.label}
                                        </button>
                                    ))}
                                </div>
                            </CardHeader>

                            <CardContent>
                                <form className="space-y-6" onSubmit={handleSubmit}>
                                    <div className="grid gap-5">
                                        <div className="grid gap-2">
                                            <div className="flex items-center justify-between gap-3">
                                                <Label htmlFor="api-key" className={sectionLabelClass}>
                                                    API Key
                                                </Label>
                                                <span className={`text-xs font-semibold uppercase tracking-[0.16em] ${requiredLabelClass}`}>
                                                    Required
                                                </span>
                                            </div>
                                            <Input
                                                id="api-key"
                                                value={apiKeyInput}
                                                onChange={(event) => setApiKeyInput(event.target.value)}
                                                placeholder="Paste your DATPAQ API key"
                                                autoComplete="off"
                                                spellCheck="false"
                                                className={inputClass}
                                            />
                                        </div>

                                        <div className="grid gap-2">
                                            <Label htmlFor="correlation-id" className={sectionLabelClass}>
                                                Correlation ID
                                            </Label>
                                            <Input
                                                id="correlation-id"
                                                value={formValues.correlationId}
                                                onChange={handleFieldChange("correlationId")}
                                                placeholder="Optional request tracing identifier"
                                                autoComplete="off"
                                                spellCheck="false"
                                                className={inputClass}
                                            />
                                        </div>

                                        <Tabs value={formValues.mode} onValueChange={handleModeChange} className="gap-4">
                                            <TabsList className={tabsListClass}>
                                                <TabsTrigger value="single" className={tabsTriggerClass}>
                                                    Single IP
                                                </TabsTrigger>
                                                <TabsTrigger value="batch" className={tabsTriggerClass}>
                                                    Batch Input
                                                </TabsTrigger>
                                            </TabsList>

                                            <TabsContent value="single">
                                                <div className="grid gap-2">
                                                    <div className="flex items-center justify-between gap-3">
                                                        <Label htmlFor="single-ip" className={sectionLabelClass}>
                                                            IP Address or CIDR
                                                        </Label>
                                                        <span
                                                            className={`text-xs font-semibold uppercase tracking-[0.16em] ${requiredLabelClass}`}
                                                        >
                                                            Required
                                                        </span>
                                                    </div>
                                                    <Input
                                                        id="single-ip"
                                                        value={formValues.singleIp}
                                                        onChange={handleFieldChange("singleIp")}
                                                        placeholder="8.8.8.8 or 2001:db8::1 or 10.0.0.0/8"
                                                        autoComplete="off"
                                                        spellCheck="false"
                                                        className={inputClass}
                                                    />
                                                    <p className={`text-sm leading-6 ${mutedTextClass}`}>
                                                        Validate a single IPv4, IPv6, or CIDR string and inspect its classification flags.
                                                    </p>
                                                </div>
                                            </TabsContent>

                                            <TabsContent value="batch">
                                                <div className="grid gap-2">
                                                    <div className="flex items-center justify-between gap-3">
                                                        <Label htmlFor="batch-input" className={sectionLabelClass}>
                                                            IP List
                                                        </Label>
                                                        <span
                                                            className={`text-xs font-semibold uppercase tracking-[0.16em] ${requiredLabelClass}`}
                                                        >
                                                            Required
                                                        </span>
                                                    </div>
                                                    <Textarea
                                                        id="batch-input"
                                                        value={formValues.batchInput}
                                                        onChange={handleFieldChange("batchInput")}
                                                        placeholder={"8.8.8.8\n127.0.0.1\n10.0.0.0/8"}
                                                        spellCheck="false"
                                                        className={inputClass}
                                                    />
                                                    <p className={`text-sm leading-6 ${mutedTextClass}`}>
                                                        Paste newline or comma separated values to validate a mixed batch in one call.
                                                    </p>
                                                </div>
                                            </TabsContent>
                                        </Tabs>
                                    </div>

                                    {validationError ? (
                                        <div
                                            className={`rounded-xl border px-4 py-3 text-sm ${
                                                isDark
                                                    ? "border-red-500/30 bg-red-500/10 text-red-200"
                                                    : "border-red-200 bg-red-50 text-red-700"
                                            }`}
                                        >
                                            {validationError}
                                        </div>
                                    ) : null}

                                    <div className="flex flex-wrap items-center gap-3">
                                        <Button type="submit" className={primaryButtonClass} disabled={isLoading}>
                                            {isLoading ? "Validating..." : "Validate Input"}
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

                                <div className={`mt-6 rounded-2xl border p-4 ${mutedSurfaceClass}`}>
                                    <h3 className="text-sm font-semibold uppercase tracking-[0.18em]">What this sample covers</h3>
                                    <div className="mt-4 grid gap-3 sm:grid-cols-2">
                                        {[
                                            "Single-object and batch-array payloads",
                                            "Private, reserved, and bogon detection",
                                            "Copy-ready request and response diagnostics",
                                            "Theme-aware shell matching DATPAQ samples",
                                        ].map((item) => (
                                            <div
                                                key={item}
                                                className={`rounded-xl border px-3 py-3 text-sm ${
                                                    isDark
                                                        ? "border-zinc-800 bg-zinc-950/80 text-zinc-300"
                                                        : "border-slate-200 bg-white text-slate-700"
                                                }`}
                                            >
                                                {item}
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </CardContent>
                        </Card>

                        <div className="grid gap-6">
                            <Card className={surfaceClass}>
                                <CardHeader className="pb-4">
                                    <CardTitle className="text-xl">Request Preview</CardTitle>
                                    <CardDescription className={mutedTextClass}>
                                        Review the endpoint and JSON payload before sending the request.
                                    </CardDescription>
                                </CardHeader>
                                <CardContent className="grid gap-4">
                                    <div className={`rounded-2xl border p-4 ${mutedSurfaceClass}`}>
                                        <div className="flex items-center justify-between gap-3">
                                            <Label className={sectionLabelClass}>Request URL</Label>
                                            <Button
                                                type="button"
                                                variant="outline"
                                                size="sm"
                                                className={outlineButtonClass}
                                                onClick={() => handleCopy("url", activeRequestUrl)}
                                            >
                                                {copied.url ? "Copied" : "Copy"}
                                            </Button>
                                        </div>
                                        <pre className="mt-3 overflow-x-auto text-sm leading-6 whitespace-pre-wrap break-all">
                                            {activeRequestUrl}
                                        </pre>
                                    </div>

                                    <div className={`rounded-2xl border p-4 ${mutedSurfaceClass}`}>
                                        <div className="flex items-center justify-between gap-3">
                                            <Label className={sectionLabelClass}>Request Body</Label>
                                            <Button
                                                type="button"
                                                variant="outline"
                                                size="sm"
                                                className={outlineButtonClass}
                                                onClick={() => handleCopy("body", activeBodyPreview)}
                                            >
                                                {copied.body ? "Copied" : "Copy"}
                                            </Button>
                                        </div>
                                        <pre className="mt-3 overflow-x-auto text-sm leading-6 whitespace-pre-wrap">
                                            {activeBodyPreview}
                                        </pre>
                                    </div>
                                </CardContent>
                            </Card>

                            <Card className={surfaceClass}>
                                <CardHeader className="pb-4">
                                    <div className="flex flex-wrap items-start justify-between gap-3">
                                        <div>
                                            <CardTitle className="text-xl">Validation State</CardTitle>
                                            <CardDescription className={mutedTextClass}>
                                                Loading, empty, error, and success states are handled here.
                                            </CardDescription>
                                        </div>
                                        {error ? (
                                            <Button
                                                type="button"
                                                variant="outline"
                                                size="sm"
                                                className={outlineButtonClass}
                                                onClick={() => {
                                                    retry().catch(() => undefined);
                                                }}
                                            >
                                                Retry
                                            </Button>
                                        ) : null}
                                    </div>
                                </CardHeader>
                                <CardContent>
                                    {isLoading ? (
                                        <div className={`rounded-2xl border p-5 ${mutedSurfaceClass}`}>
                                            <div className="flex items-center gap-3">
                                                <div className="h-3 w-3 animate-pulse rounded-full bg-sky-500" />
                                                <div className="text-sm font-medium">Sending validation request...</div>
                                            </div>
                                            <p className={`mt-2 text-sm ${mutedTextClass}`}>
                                                Waiting for the DATPAQ API to classify the submitted IP data.
                                            </p>
                                        </div>
                                    ) : null}

                                    {!isLoading && !hasResponse && !error ? (
                                        <div className={`rounded-2xl border p-5 ${mutedSurfaceClass}`}>
                                            <div className="text-sm font-medium">No response yet.</div>
                                            <p className={`mt-2 text-sm ${mutedTextClass}`}>
                                                Submit a single IP or a batch list to inspect the API response structure.
                                            </p>
                                        </div>
                                    ) : null}

                                    {!isLoading && error ? (
                                        <div
                                            className={`rounded-2xl border p-5 ${
                                                isDark
                                                    ? "border-red-500/30 bg-red-500/10 text-red-100"
                                                    : "border-red-200 bg-red-50 text-red-900"
                                            }`}
                                        >
                                            <div className="text-sm font-semibold uppercase tracking-[0.18em]">Request failed</div>
                                            <p className="mt-3 text-sm leading-6">{errorMessage}</p>
                                        </div>
                                    ) : null}

                                    {!isLoading && hasSuccessState && responseItems.length > 0 ? (
                                        <div className="grid gap-4">
                                            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                                                {[
                                                    { label: "Total", value: responseSummary.total },
                                                    { label: "Valid", value: responseSummary.valid },
                                                    { label: "Invalid", value: responseSummary.invalid },
                                                    { label: "Bogon", value: responseSummary.bogon },
                                                ].map((metric) => (
                                                    <div
                                                        key={metric.label}
                                                        className={`rounded-2xl border p-4 ${mutedSurfaceClass}`}
                                                    >
                                                        <div className={`text-xs font-semibold uppercase tracking-[0.18em] ${sectionLabelClass}`}>
                                                            {metric.label}
                                                        </div>
                                                        <div className="mt-3 text-3xl font-semibold tracking-tight">
                                                            {metric.value}
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>

                                            <div className="grid gap-3">
                                                {responseItems.map((item, index) => (
                                                    <div
                                                        key={`${item.ip || "item"}-${index}`}
                                                        className={`rounded-2xl border p-4 ${getItemAccent(item, isDark)}`}
                                                    >
                                                        <div className="flex flex-wrap items-start justify-between gap-3">
                                                            <div>
                                                                <div className="text-lg font-semibold tracking-tight">
                                                                    {item.ip || "Unknown input"}
                                                                </div>
                                                                <div className="mt-1 text-sm opacity-80">
                                                                    {item.message || item.error || "Validation response received."}
                                                                </div>
                                                            </div>
                                                            <div className="flex flex-wrap gap-2">
                                                                {getItemFlags(item).map((flag) => (
                                                                    <span
                                                                        key={`${item.ip || "item"}-${flag}`}
                                                                        className={`inline-flex items-center rounded-full border px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] ${
                                                                            isDark
                                                                                ? "border-white/10 bg-white/5"
                                                                                : "border-black/10 bg-white/70"
                                                                        }`}
                                                                    >
                                                                        {flag}
                                                                    </span>
                                                                ))}
                                                            </div>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    ) : null}
                                </CardContent>
                            </Card>

                            <Card className={surfaceClass}>
                                <CardHeader className="pb-4">
                                    <div className="flex flex-wrap items-center justify-between gap-3">
                                        <div>
                                            <CardTitle className="text-xl">Raw JSON Response</CardTitle>
                                            <CardDescription className={mutedTextClass}>
                                                Copy the exact payload returned by the DATPAQ API.
                                            </CardDescription>
                                        </div>
                                        <Button
                                            type="button"
                                            variant="outline"
                                            size="sm"
                                            className={outlineButtonClass}
                                            onClick={() => handleCopy("json", responseJson)}
                                            disabled={!responseJson}
                                        >
                                            {copied.json ? "Copied" : "Copy JSON"}
                                        </Button>
                                    </div>
                                </CardHeader>
                                <CardContent>
                                    <div className={`rounded-2xl border p-4 ${mutedSurfaceClass}`}>
                                        <pre className="max-h-[420px] overflow-auto text-sm leading-6 whitespace-pre-wrap">
                                            {responseJson || '{\n  "message": "Submit a request to view the JSON response."\n}'}
                                        </pre>
                                    </div>
                                </CardContent>
                            </Card>
                        </div>
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
