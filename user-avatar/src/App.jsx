import { useEffect, useMemo, useState } from "react";
import { HexColorPicker } from "react-colorful";
import { useDatpaqRequest } from "./hooks/useDatpaqRequest";
import { Button } from "./components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./components/ui/card";
import { Input } from "./components/ui/input";
import { Label } from "./components/ui/label";
import { getApiBaseUrl, sampleConfig } from "./sample.config";

const API_BASE_URL = getApiBaseUrl();

const DEFAULT_FORM_VALUES = {
    name: "Jerod Huseman",
    icon: "",
    size: "60",
    bgColor: "#3498db",
    textColor: "#ffffff",
    borderColor: "#0f172a",
    borderWidth: "4",
    font: "Inter",
    shape: "circle",
    pattern: "none",
    format: "png",
    imageUrl: "",
    uploadedIcon: "",
    queryContentType: "",
};

const SHAPE_OPTIONS = [
    { value: "circle", label: "Circle" },
    { value: "square", label: "Square" },
];

const FORMAT_OPTIONS = [
    { value: "png", label: "PNG" },
    { value: "webp", label: "WebP" },
    { value: "svg", label: "SVG" },
];

const SIZE_OPTIONS = [16, 24, 32, 48, 60, 120];

const PATTERN_OPTIONS = [
    { value: "none", label: "None" },
    { value: "dots", label: "Dots" },
    { value: "stripes", label: "Stripes" },
    { value: "waves", label: "Waves" },
    { value: "noise", label: "Noise" },
];

const HEX_COLOR_REGEX = /^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/;

function buildRequestUrl(baseUrl, path, query) {
    const normalizedBaseUrl = String(baseUrl || "").replace(/\/+$/, "");
    const normalizedPath = String(path || "").startsWith("/") ? path : `/${String(path || "")}`;
    const url = new URL(
        `${normalizedBaseUrl}${normalizedPath}`,
        typeof window !== "undefined" ? window.location.origin : "http://localhost",
    );

    Object.entries(query || {}).forEach(([key, value]) => {
        if (value === undefined || value === null || value === "") {
            return;
        }

        url.searchParams.set(key, String(value));
    });

    return url.toString();
}

function sanitizeInteger(rawValue) {
    const parsed = Number.parseInt(String(rawValue || "").trim(), 10);
    if (!Number.isFinite(parsed)) {
        return null;
    }

    return parsed;
}

function normalizeHexInput(rawValue) {
    const trimmed = String(rawValue || "").trim();
    if (!trimmed) {
        return "";
    }

    return trimmed.startsWith("#") ? trimmed : `#${trimmed}`;
}

function isValidHexColor(value) {
    return HEX_COLOR_REGEX.test(String(value || "").trim());
}

function ColorField({
    id,
    label,
    value,
    inputClass,
    sectionLabelClass,
    isDark,
    isOpen,
    fallback,
    onToggle,
    onTextChange,
    onPickerChange,
}) {
    const swatchColor = isValidHexColor(value) ? value : fallback;

    return (
        <div className="space-y-2.5">
            <Label htmlFor={id} className={sectionLabelClass}>
                {label}
            </Label>
            <div className="flex items-center gap-2">
                <Input id={id} value={value} onChange={onTextChange} placeholder={fallback} className={inputClass} />
                <div className="relative shrink-0" data-color-picker-root="true">
                    <button
                        type="button"
                        onClick={onToggle}
                        className={`inline-flex h-10 w-10 items-center justify-center rounded-md border transition ${
                            isDark
                                ? "border-zinc-700 bg-zinc-900 hover:border-zinc-500"
                                : "border-slate-300 bg-white hover:border-slate-500"
                        }`}
                        aria-label={`Open ${label} color picker`}
                        aria-expanded={isOpen}
                        aria-controls={`${id}-picker`}
                    >
                        <span
                            className="h-5 w-5 rounded-full border border-black/15"
                            style={{ backgroundColor: swatchColor }}
                        />
                    </button>
                    {isOpen ? (
                        <div
                            id={`${id}-picker`}
                            className={`absolute right-[-12px] top-[calc(100%+10px)] z-[120] w-[240px] rounded-lg border p-3 shadow-2xl ${
                                isDark ? "border-zinc-700 bg-zinc-950" : "border-slate-200 bg-white"
                            }`}
                        >
                            <HexColorPicker
                                color={swatchColor}
                                onChange={onPickerChange}
                                style={{ width: "100%", height: 156 }}
                            />
                            <p className={`mt-2 font-mono text-xs ${isDark ? "text-zinc-400" : "text-slate-500"}`}>
                                {swatchColor}
                            </p>
                        </div>
                    ) : null}
                </div>
            </div>
        </div>
    );
}

function buildQuery(values) {
    const query = {
        name: values.name.trim(),
        shape: values.shape,
        pattern: values.pattern,
        format: values.format,
        bgColor: values.bgColor.trim(),
        textColor: values.textColor.trim(),
        borderColor: values.borderColor.trim(),
        font: values.font.trim(),
    };

    const size = sanitizeInteger(values.size);
    if (size !== null) {
        query.size = size;
    }

    const borderWidth = sanitizeInteger(values.borderWidth);
    if (borderWidth !== null) {
        query.borderWidth = borderWidth;
    }

    if (values.icon.trim()) {
        query.icon = values.icon.trim();
    }

    if (values.imageUrl.trim()) {
        query.imageUrl = values.imageUrl.trim();
    }

    if (values.uploadedIcon.trim()) {
        query.uploadedIcon = values.uploadedIcon.trim();
    }

    if (values.queryContentType.trim()) {
        query["Content-Type"] = values.queryContentType.trim();
    }

    return query;
}

function validate(values, apiKey) {
    if (!apiKey.trim()) {
        return "API key is required.";
    }

    if (!values.name.trim()) {
        return "Name is required to generate avatar initials.";
    }

    const size = sanitizeInteger(values.size);
    if (size === null || !SIZE_OPTIONS.includes(size)) {
        return `Size must be one of: ${SIZE_OPTIONS.join(", ")}.`;
    }

    const borderWidth = sanitizeInteger(values.borderWidth);
    if (borderWidth === null || borderWidth < 0 || borderWidth > 64) {
        return "Border width must be a whole number between 0 and 64.";
    }

    if (!isValidHexColor(values.bgColor)) {
        return "bgColor must be a valid hex value (example: #3498db).";
    }

    if (!isValidHexColor(values.textColor)) {
        return "textColor must be a valid hex value (example: #ffffff).";
    }

    if (!isValidHexColor(values.borderColor)) {
        return "borderColor must be a valid hex value (example: #0f172a).";
    }

    return "";
}

function getAcceptHeader(format) {
    if (format === "svg") {
        return "image/svg+xml";
    }

    if (format === "webp") {
        return "image/webp,image/*,*/*";
    }

    return "image/png,image/*,*/*";
}

function getContentType(headers, blob) {
    const headerContentType = headers?.["content-type"];
    if (headerContentType && typeof headerContentType === "string") {
        return headerContentType;
    }

    return blob.type || "application/octet-stream";
}

function buildErrorPayload(error, errorMessage, requestUrl, query) {
    const details =
        typeof error?.details === "object"
            ? error.details
            : error?.details
              ? { message: String(error.details) }
              : null;

    return {
        success: false,
        request: {
            method: sampleConfig.method,
            url: requestUrl || "",
            query: query || {},
        },
        error: {
            message: errorMessage || error?.message || "Request failed.",
            status: error?.status || null,
            statusText: error?.statusText || "",
            details,
        },
        meta: {
            timestamp: new Date().toISOString(),
        },
    };
}

function toTitleCase(value) {
    return String(value || "")
        .replace(/[-_]+/g, " ")
        .replace(/\s+/g, " ")
        .trim()
        .replace(/\b\w/g, (char) => char.toUpperCase());
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
    const [formValues, setFormValues] = useState(() => ({ ...DEFAULT_FORM_VALUES }));
    const [apiKeyInput, setApiKeyInput] = useState(() => import.meta.env.VITE_DATPAQ_API_KEY || "");
    const [validationError, setValidationError] = useState("");
    const [requestUrl, setRequestUrl] = useState("");
    const [lastQuery, setLastQuery] = useState(() => ({ ...sampleConfig.defaultQuery }));
    const [lastSubmittedValues, setLastSubmittedValues] = useState(() => ({ ...DEFAULT_FORM_VALUES }));
    const [copied, setCopied] = useState({ url: false, json: false });
    const [openColorPicker, setOpenColorPicker] = useState("");
    const [avatarUrl, setAvatarUrl] = useState("");
    const [avatarAlt, setAvatarAlt] = useState("Generated user avatar preview");
    const [responsePayload, setResponsePayload] = useState(null);

    const year = new Date().getFullYear();
    const isDark = theme === "dark";

    const { error, errorMessage, isLoading, run, retry, reset, lastRequest } = useDatpaqRequest({
        baseUrl: API_BASE_URL,
        apiKey: apiKeyInput.trim(),
        token: import.meta.env.VITE_DATPAQ_API_TOKEN,
    });

    useEffect(() => {
        window.localStorage.setItem("theme", theme);
    }, [theme]);

    useEffect(() => {
        return () => {
            if (avatarUrl) {
                URL.revokeObjectURL(avatarUrl);
            }
        };
    }, [avatarUrl]);

    useEffect(() => {
        if (!openColorPicker) {
            return undefined;
        }

        const handlePointerDown = (event) => {
            const target = event.target;
            if (!(target instanceof Element)) {
                return;
            }

            if (target.closest('[data-color-picker-root="true"]')) {
                return;
            }

            setOpenColorPicker("");
        };

        const handleKeyDown = (event) => {
            if (event.key === "Escape") {
                setOpenColorPicker("");
            }
        };

        document.addEventListener("pointerdown", handlePointerDown);
        document.addEventListener("keydown", handleKeyDown);

        return () => {
            document.removeEventListener("pointerdown", handlePointerDown);
            document.removeEventListener("keydown", handleKeyDown);
        };
    }, [openColorPicker]);

    const responseJson = useMemo(
        () => (responsePayload ? JSON.stringify(responsePayload, null, 2) : ""),
        [responsePayload],
    );

    const surfaceClass = isDark
        ? "border-zinc-700/70 bg-zinc-900/80 text-zinc-100"
        : "border-slate-200 bg-white/95 text-slate-900";

    const subtleSurfaceClass = isDark
        ? "border-zinc-700/70 bg-zinc-950/50 text-zinc-100"
        : "border-slate-200 bg-slate-50 text-slate-900";

    const inputClass = isDark
        ? "border-zinc-700 bg-zinc-900 text-zinc-100 placeholder:text-zinc-500 focus-visible:border-zinc-400 focus-visible:ring-zinc-500/30"
        : "";

    const selectClass = isDark
        ? "h-10 w-full rounded-md border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-100 outline-none focus-visible:border-zinc-400 focus-visible:ring-2 focus-visible:ring-zinc-500/30"
        : "h-10 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus-visible:border-slate-500 focus-visible:ring-2 focus-visible:ring-slate-500/30";

    const secondaryButtonClass = isDark
        ? "border-zinc-700 bg-zinc-900 text-zinc-100 hover:bg-zinc-800 hover:text-white"
        : "";
    const primaryButtonClass = isDark
        ? "bg-white text-zinc-900 hover:bg-zinc-200"
        : "bg-slate-900 text-white hover:bg-slate-700";

    const outlineButtonClass = isDark ? "border-zinc-700 bg-transparent text-zinc-200 hover:bg-zinc-900" : "";

    const sectionLabelClass = isDark ? "text-zinc-400" : "text-slate-600";
    const requiredLabelClass = isDark ? "text-red-800" : "text-red-500";

    const showEmptyState = !isLoading && !error && !avatarUrl;
    const showSuccessState = !isLoading && !error && Boolean(avatarUrl);
    const showErrorState = !isLoading && Boolean(error);

    const responseInfo = responsePayload?.response || null;
    const submittedSize = sanitizeInteger(lastSubmittedValues.size) || 60;
    const previewSize = Math.min(Math.max(submittedSize * 2, 96), 240);

    const handleValueChange = (key) => (event) => {
        setFormValues((current) => ({
            ...current,
            [key]: event.target.value,
        }));
    };

    const handleColorTextChange = (key) => (event) => {
        setFormValues((current) => ({
            ...current,
            [key]: normalizeHexInput(event.target.value),
        }));
    };

    const handleColorPickerChange = (key) => (nextColor) => {
        setFormValues((current) => ({
            ...current,
            [key]: nextColor,
        }));
    };

    const toggleColorPicker = (key) => {
        setOpenColorPicker((current) => (current === key ? "" : key));
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

    const clearAvatarUrl = () => {
        setAvatarUrl((current) => {
            if (current) {
                URL.revokeObjectURL(current);
            }
            return "";
        });
    };

    const processSuccessfulEnvelope = async (envelope, query, nextRequestUrl, valuesSnapshot) => {
        if (!envelope || !(envelope.data instanceof Blob)) {
            throw new Error("Unexpected response: expected image payload.");
        }

        const blob = envelope.data;
        const objectUrl = URL.createObjectURL(blob);
        const contentType = getContentType(envelope.headers, blob);
        const isSvg = contentType.includes("svg") || valuesSnapshot.format === "svg";
        const svgMarkup = isSvg ? (await blob.text()).trim() : null;

        clearAvatarUrl();
        setAvatarUrl(objectUrl);

        const initials =
            valuesSnapshot.name
                .split(/\s+/)
                .filter(Boolean)
                .map((part) => part[0]?.toUpperCase())
                .slice(0, 2)
                .join("") || "UA";

        setAvatarAlt(`${valuesSnapshot.name.trim() || "User"} avatar (${initials})`);

        const reportedContentLength = Number.parseInt(envelope.headers?.["content-length"] || "", 10);
        const bytes = Number.isFinite(reportedContentLength) ? reportedContentLength : blob.size;

        const payload = {
            success: true,
            request: {
                method: sampleConfig.method,
                url: nextRequestUrl,
                query,
            },
            response: {
                status: envelope.status,
                statusText: envelope.statusText,
                contentType,
                bytes,
                headers: envelope.headers,
                format: valuesSnapshot.format,
                shape: valuesSnapshot.shape,
                generatedAt: new Date().toISOString(),
            },
            meta: {
                docsUrl: sampleConfig.docsUrl,
                endpoint: sampleConfig.endpoint,
            },
        };

        if (svgMarkup) {
            payload.response.svg = svgMarkup;
        }

        setResponsePayload(payload);
    };

    const handleSubmit = async (event) => {
        event.preventDefault();

        const formError = validate(formValues, apiKeyInput);
        if (formError) {
            setValidationError(formError);
            return;
        }

        const valuesSnapshot = { ...formValues };
        const query = buildQuery(valuesSnapshot);
        const nextRequestUrl = buildRequestUrl(API_BASE_URL, sampleConfig.endpoint, query);

        setValidationError("");
        setRequestUrl(nextRequestUrl);
        setLastQuery(query);
        setLastSubmittedValues(valuesSnapshot);
        setOpenColorPicker("");
        setCopied({ url: false, json: false });
        setResponsePayload(null);

        try {
            const envelope = await run({
                path: sampleConfig.endpoint,
                method: sampleConfig.method,
                query,
                headers: {
                    accept: getAcceptHeader(valuesSnapshot.format),
                },
                responseType: "blob",
                rawResponse: true,
            });

            await processSuccessfulEnvelope(envelope, query, nextRequestUrl, valuesSnapshot);
        } catch (requestError) {
            clearAvatarUrl();
            setResponsePayload(buildErrorPayload(requestError, errorMessage, nextRequestUrl, query));
        }
    };

    const handleRetry = async () => {
        if (!lastRequest) {
            return;
        }

        setValidationError("");

        try {
            const envelope = await retry();
            if (!envelope) {
                return;
            }

            await processSuccessfulEnvelope(envelope, lastQuery, requestUrl, lastSubmittedValues);
        } catch (requestError) {
            clearAvatarUrl();
            setResponsePayload(buildErrorPayload(requestError, errorMessage, requestUrl, lastQuery));
        }
    };

    const handleReset = () => {
        setFormValues({ ...DEFAULT_FORM_VALUES });
        setApiKeyInput(import.meta.env.VITE_DATPAQ_API_KEY || "");
        setValidationError("");
        setRequestUrl("");
        setLastQuery({ ...sampleConfig.defaultQuery });
        setLastSubmittedValues({ ...DEFAULT_FORM_VALUES });
        setOpenColorPicker("");
        setCopied({ url: false, json: false });
        setResponsePayload(null);
        clearAvatarUrl();
        reset();
    };

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
                    className={`select-none font-['Sora'] text-[clamp(7rem,20vw,14rem)] leading-none font-black tracking-[-0.1em] [transform-origin:0_0] ${
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
                    <div className="font-['Sora'] text-3xl font-black tracking-tight cursor-default">DP.</div>
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
                    <div className="mx-auto grid h-full min-h-0 w-full max-w-[1180px] items-start gap-8 lg:grid-cols-[minmax(0,590px)_minmax(0,1fr)]">
                        <Card className={`${surfaceClass} h-fit`}>
                            <CardHeader className="pb-4">
                                <CardTitle className="mb-2 flex items-center justify-between gap-3">
                                    <h1 className="text-3xl leading-tight">{sampleConfig.appName}</h1>
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
                                            <span className={`text-[11px] font-semibold uppercase tracking-wide ${requiredLabelClass}`}>
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
                                        />
                                    </div>

                                    <div className="grid gap-4 sm:grid-cols-2">
                                        <div className="space-y-2.5 sm:col-span-2">
                                            <div className="flex items-center justify-between">
                                                <Label htmlFor="name" className={sectionLabelClass}>
                                                    name
                                                </Label>
                                                <span className={`text-[11px] font-semibold uppercase tracking-wide ${requiredLabelClass}`}>
                                                    Required
                                                </span>
                                            </div>
                                            <Input
                                                id="name"
                                                value={formValues.name}
                                                onChange={handleValueChange("name")}
                                                placeholder="Jerod Huseman"
                                                className={inputClass}
                                            />
                                        </div>

                                        <div className="space-y-2.5">
                                            <Label htmlFor="icon" className={sectionLabelClass}>
                                                icon
                                            </Label>
                                            <Input
                                                id="icon"
                                                value={formValues.icon}
                                                onChange={handleValueChange("icon")}
                                                placeholder="Optional icon hint"
                                                className={inputClass}
                                            />
                                        </div>

                                        <div className="space-y-2.5">
                                            <Label htmlFor="size" className={sectionLabelClass}>
                                                size
                                            </Label>
                                            <select
                                                id="size"
                                                value={formValues.size}
                                                onChange={handleValueChange("size")}
                                                className={selectClass}
                                            >
                                                {SIZE_OPTIONS.map((sizeOption) => (
                                                    <option key={sizeOption} value={String(sizeOption)}>
                                                        {sizeOption}px
                                                    </option>
                                                ))}
                                            </select>
                                        </div>

                                        <div className="space-y-2.5">
                                            <Label htmlFor="format" className={sectionLabelClass}>
                                                format
                                            </Label>
                                            <select
                                                id="format"
                                                value={formValues.format}
                                                onChange={handleValueChange("format")}
                                                className={selectClass}
                                            >
                                                {FORMAT_OPTIONS.map((option) => (
                                                    <option key={option.value} value={option.value}>
                                                        {option.label}
                                                    </option>
                                                ))}
                                            </select>
                                        </div>

                                        <div className="space-y-2.5">
                                            <Label htmlFor="shape" className={sectionLabelClass}>
                                                shape
                                            </Label>
                                            <select
                                                id="shape"
                                                value={formValues.shape}
                                                onChange={handleValueChange("shape")}
                                                className={selectClass}
                                            >
                                                {SHAPE_OPTIONS.map((option) => (
                                                    <option key={option.value} value={option.value}>
                                                        {option.label}
                                                    </option>
                                                ))}
                                            </select>
                                        </div>

                                        <div className="space-y-2.5 sm:col-span-2">
                                            <Label htmlFor="pattern" className={sectionLabelClass}>
                                                pattern
                                            </Label>
                                            <select
                                                id="pattern"
                                                value={formValues.pattern}
                                                onChange={handleValueChange("pattern")}
                                                className={selectClass}
                                            >
                                                {PATTERN_OPTIONS.map((option) => (
                                                    <option key={option.value} value={option.value}>
                                                        {option.label}
                                                    </option>
                                                ))}
                                            </select>
                                        </div>

                                        <ColorField
                                            id="bgColor"
                                            label="bgColor"
                                            value={formValues.bgColor}
                                            inputClass={inputClass}
                                            sectionLabelClass={sectionLabelClass}
                                            isDark={isDark}
                                            isOpen={openColorPicker === "bgColor"}
                                            fallback="#3498db"
                                            onToggle={() => toggleColorPicker("bgColor")}
                                            onTextChange={handleColorTextChange("bgColor")}
                                            onPickerChange={handleColorPickerChange("bgColor")}
                                        />

                                        <ColorField
                                            id="textColor"
                                            label="textColor"
                                            value={formValues.textColor}
                                            inputClass={inputClass}
                                            sectionLabelClass={sectionLabelClass}
                                            isDark={isDark}
                                            isOpen={openColorPicker === "textColor"}
                                            fallback="#ffffff"
                                            onToggle={() => toggleColorPicker("textColor")}
                                            onTextChange={handleColorTextChange("textColor")}
                                            onPickerChange={handleColorPickerChange("textColor")}
                                        />

                                        <ColorField
                                            id="borderColor"
                                            label="borderColor"
                                            value={formValues.borderColor}
                                            inputClass={inputClass}
                                            sectionLabelClass={sectionLabelClass}
                                            isDark={isDark}
                                            isOpen={openColorPicker === "borderColor"}
                                            fallback="#0f172a"
                                            onToggle={() => toggleColorPicker("borderColor")}
                                            onTextChange={handleColorTextChange("borderColor")}
                                            onPickerChange={handleColorPickerChange("borderColor")}
                                        />

                                        <div className="space-y-2.5">
                                            <Label htmlFor="borderWidth" className={sectionLabelClass}>
                                                borderWidth
                                            </Label>
                                            <Input
                                                id="borderWidth"
                                                value={formValues.borderWidth}
                                                onChange={handleValueChange("borderWidth")}
                                                placeholder="4"
                                                inputMode="numeric"
                                                className={inputClass}
                                            />
                                        </div>

                                        <div className="space-y-2.5">
                                            <Label htmlFor="font" className={sectionLabelClass}>
                                                font
                                            </Label>
                                            <Input
                                                id="font"
                                                value={formValues.font}
                                                onChange={handleValueChange("font")}
                                                placeholder="Inter"
                                                className={inputClass}
                                            />
                                        </div>

                                        <div className="space-y-2.5">
                                            <Label htmlFor="queryContentType" className={sectionLabelClass}>
                                                Content-Type query
                                            </Label>
                                            <select
                                                id="queryContentType"
                                                value={formValues.queryContentType}
                                                onChange={handleValueChange("queryContentType")}
                                                className={selectClass}
                                            >
                                                <option value="">Unset</option>
                                                <option value="image/png">image/png</option>
                                                <option value="image/webp">image/webp</option>
                                                <option value="image/svg+xml">image/svg+xml</option>
                                                <option value="application/json">application/json</option>
                                            </select>
                                        </div>

                                        <div className="space-y-2.5 sm:col-span-2">
                                            <Label htmlFor="imageUrl" className={sectionLabelClass}>
                                                imageUrl
                                            </Label>
                                            <Input
                                                id="imageUrl"
                                                value={formValues.imageUrl}
                                                onChange={handleValueChange("imageUrl")}
                                                placeholder="https://example.com/photo.png"
                                                className={inputClass}
                                            />
                                        </div>

                                        <div className="space-y-2.5 sm:col-span-2">
                                            <Label htmlFor="uploadedIcon" className={sectionLabelClass}>
                                                uploadedIcon
                                            </Label>
                                            <Input
                                                id="uploadedIcon"
                                                value={formValues.uploadedIcon}
                                                onChange={handleValueChange("uploadedIcon")}
                                                placeholder="uploads/icon-abc123.png"
                                                className={inputClass}
                                            />
                                        </div>
                                    </div>

                                    {validationError ? (
                                        <div
                                            className={`rounded-md border px-3 py-2 text-sm ${
                                                isDark
                                                    ? "border-red-900/70 bg-red-950/40 text-red-200"
                                                    : "border-red-300 bg-red-50 text-red-700"
                                            }`}
                                            role="alert"
                                        >
                                            {validationError}
                                        </div>
                                    ) : null}

                                    <div className="flex flex-wrap gap-2.5">
                                        <Button
                                            type="submit"
                                            disabled={isLoading}
                                            className={`min-w-[168px] ${primaryButtonClass}`}
                                        >
                                            {isLoading ? "Generating..." : "Generate Avatar"}
                                        </Button>
                                        <Button
                                            type="button"
                                            variant="outline"
                                            onClick={handleReset}
                                            className={outlineButtonClass}
                                        >
                                            Reset
                                        </Button>
                                    </div>
                                </form>
                            </CardContent>
                        </Card>

                        <div className="grid min-h-0 min-w-0 gap-6">
                            <Card className={`${surfaceClass} min-w-0 overflow-hidden slide-up`}>
                                <CardHeader className="pb-4">
                                    <CardTitle className="text-xl">Live Avatar</CardTitle>
                                    <CardDescription className={isDark ? "text-zinc-400" : "text-slate-600"}>
                                        Loading, error, empty, and success states are rendered in this preview panel.
                                    </CardDescription>
                                </CardHeader>
                                <CardContent className="space-y-4">
                                    {isLoading ? (
                                        <div
                                            className={`rounded-xl border p-6 ${
                                                isDark ? "border-zinc-700 bg-zinc-950/40" : "border-slate-200 bg-slate-50"
                                            }`}
                                        >
                                            <div className="flex min-h-[280px] items-center justify-center">
                                                <div className="relative flex items-center justify-center" style={{ width: `${previewSize}px`, height: `${previewSize}px` }}>
                                                    <div className="avatar-glow absolute inset-0 rounded-full bg-sky-500/20 blur-2xl" />
                                                    <div
                                                        className={`animate-spin rounded-full border-2 border-dashed ${
                                                            isDark ? "border-zinc-500" : "border-slate-400"
                                                        }`}
                                                        style={{
                                                            width: `${Math.max(44, Math.floor(previewSize * 0.5))}px`,
                                                            height: `${Math.max(44, Math.floor(previewSize * 0.5))}px`,
                                                        }}
                                                    />
                                                </div>
                                            </div>
                                            <p
                                                className={`mt-4 text-center text-sm ${
                                                    isDark ? "text-zinc-400" : "text-slate-600"
                                                }`}
                                            >
                                                Generating avatar image from API response...
                                            </p>
                                        </div>
                                    ) : null}

                                    {showErrorState ? (
                                        <div
                                            className={`rounded-xl border p-5 ${
                                                isDark
                                                    ? "border-red-900/60 bg-red-950/20 text-red-200"
                                                    : "border-red-300 bg-red-50 text-red-700"
                                            }`}
                                            role="alert"
                                        >
                                            <p className="text-sm font-medium">{errorMessage || "Avatar request failed."}</p>
                                            <div className="mt-3">
                                                <Button
                                                    type="button"
                                                    size="sm"
                                                    variant="secondary"
                                                    onClick={handleRetry}
                                                    className={secondaryButtonClass}
                                                    disabled={!lastRequest}
                                                >
                                                    Retry request
                                                </Button>
                                            </div>
                                        </div>
                                    ) : null}

                                    {showSuccessState ? (
                                        <div
                                            className={`rounded-xl border p-6 ${
                                                isDark ? "border-zinc-700 bg-zinc-950/40" : "border-slate-200 bg-slate-50"
                                            }`}
                                        >
                                            <div className="flex min-h-[280px] items-center justify-center">
                                                <div className="relative" style={{ width: `${previewSize}px`, height: `${previewSize}px` }}>
                                                    <div
                                                        className={`avatar-glow absolute inset-0 blur-2xl ${
                                                            isDark ? "bg-cyan-400/25" : "bg-cyan-500/20"
                                                        }`}
                                                    />
                                                    <div
                                                        key={`${avatarUrl}-${lastSubmittedValues.shape}-${submittedSize}`}
                                                        className={`avatar-intro relative h-full w-full overflow-hidden border-2 shadow-xl ${
                                                            lastSubmittedValues.shape === "circle" ? "rounded-full" : "rounded-[2rem]"
                                                        } ${
                                                            isDark
                                                                ? "border-zinc-700 bg-zinc-900"
                                                                : "border-slate-200 bg-white"
                                                        }`}
                                                    >
                                                        <img
                                                            src={avatarUrl}
                                                            alt={avatarAlt}
                                                            className="h-full w-full object-contain"
                                                        />
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="mt-5 flex flex-wrap items-center justify-center gap-2">
                                                <span
                                                    className={`rounded-full border px-2 py-1 text-[11px] font-semibold ${
                                                        isDark
                                                            ? "border-zinc-600 bg-zinc-900 text-zinc-200"
                                                            : "border-slate-200 bg-white text-slate-700"
                                                    }`}
                                                >
                                                    {toTitleCase(responseInfo?.contentType || lastSubmittedValues.format)}
                                                </span>
                                                <span
                                                    className={`rounded-full border px-2 py-1 text-[11px] font-semibold ${
                                                        isDark
                                                            ? "border-zinc-600 bg-zinc-900 text-zinc-200"
                                                            : "border-slate-200 bg-white text-slate-700"
                                                    }`}
                                                >
                                                    {submittedSize}x{submittedSize}
                                                </span>
                                                <span
                                                    className={`rounded-full border px-2 py-1 text-[11px] font-semibold ${
                                                        isDark
                                                            ? "border-zinc-600 bg-zinc-900 text-zinc-200"
                                                            : "border-slate-200 bg-white text-slate-700"
                                                    }`}
                                                >
                                                    {responseInfo?.bytes ? `${responseInfo.bytes.toLocaleString()} bytes` : "-"}
                                                </span>
                                                <span
                                                    className={`rounded-full border px-2 py-1 text-[11px] font-semibold ${
                                                        isDark
                                                            ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-300"
                                                            : "border-emerald-600/30 bg-emerald-600/10 text-emerald-700"
                                                    }`}
                                                >
                                                    HTTP {responseInfo?.status || 200}
                                                </span>
                                            </div>
                                        </div>
                                    ) : null}

                                    {showEmptyState ? (
                                        <div
                                            className={`rounded-xl border p-6 ${
                                                isDark ? "border-zinc-700 bg-zinc-950/40" : "border-slate-200 bg-slate-50"
                                            }`}
                                        >
                                            <div className="mx-auto flex min-h-[280px] items-center justify-center">
                                                <div
                                                    className="flex items-center justify-center rounded-full border border-dashed border-slate-400/50"
                                                    style={{ width: `${previewSize}px`, height: `${previewSize}px` }}
                                                >
                                                <span className={`text-sm ${isDark ? "text-zinc-400" : "text-slate-500"}`}>
                                                    No avatar yet
                                                </span>
                                                </div>
                                            </div>
                                            <p
                                                className={`mt-4 text-center text-sm ${
                                                    isDark ? "text-zinc-400" : "text-slate-600"
                                                }`}
                                            >
                                                Configure inputs and click <strong>Generate Avatar</strong> to fetch and preview the image.
                                            </p>
                                        </div>
                                    ) : null}
                                </CardContent>
                            </Card>

                            <Card className={`${subtleSurfaceClass} min-w-0 overflow-hidden`}>
                                <CardHeader className="pb-3">
                                    <CardTitle className="text-base">Request URL</CardTitle>
                                </CardHeader>
                                <CardContent className="space-y-3">
                                    <div
                                        className={`max-h-32 overflow-auto rounded-md border px-3 py-2 font-mono text-xs leading-relaxed whitespace-pre-wrap break-words ${
                                            isDark
                                                ? "border-zinc-700 bg-zinc-950/50 text-zinc-200"
                                                : "border-slate-200 bg-white text-slate-800"
                                        }`}
                                    >
                                        {requestUrl || "Request URL will appear here after submission."}
                                    </div>
                                    <Button
                                        type="button"
                                        variant="secondary"
                                        size="sm"
                                        onClick={() => handleCopy("url", requestUrl)}
                                        disabled={!requestUrl}
                                        className={secondaryButtonClass}
                                    >
                                        {copied.url ? "Copied" : "Copy URL"}
                                    </Button>
                                </CardContent>
                            </Card>

                            <Card className={`${subtleSurfaceClass} min-h-[250px] min-w-0 overflow-hidden`}>
                                <CardHeader className="pb-3">
                                    <CardTitle className="text-base">Response JSON</CardTitle>
                                </CardHeader>
                                <CardContent className="space-y-3">
                                    <pre
                                        className={`max-h-[320px] overflow-auto rounded-md border px-3 py-3 font-mono text-xs leading-relaxed whitespace-pre-wrap break-words ${
                                            isDark
                                                ? "border-zinc-700 bg-zinc-950/50 text-zinc-200"
                                                : "border-slate-200 bg-white text-slate-800"
                                        }`}
                                    >
                                        {responseJson || "Run a request to inspect response metadata and payload details."}
                                    </pre>
                                    <Button
                                        type="button"
                                        variant="secondary"
                                        size="sm"
                                        onClick={() => handleCopy("json", responseJson)}
                                        disabled={!responseJson}
                                        className={secondaryButtonClass}
                                    >
                                        {copied.json ? "Copied" : "Copy JSON"}
                                    </Button>
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
