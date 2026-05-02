import { useEffect, useMemo, useRef, useState } from "react";
import { getApiBaseUrl, sampleConfig } from "./sample.config";
import { Button } from "./components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./components/ui/card";
import { Input } from "./components/ui/input";
import { Label } from "./components/ui/label";

const API_BASE_URL = getApiBaseUrl();
const MAX_FILE_SIZE = 10 * 1024 * 1024;
const REQUEST_TIMEOUT_MS = 30000;
const SUPPORTED_EXTENSIONS = ["jpg", "jpeg", "png", "webp", "gif", "bmp", "tiff", "heic", "heif", "avif", "svg"];
const IMAGE_MIME_TYPES = [
    "image/jpeg",
    "image/png",
    "image/webp",
    "image/gif",
    "image/bmp",
    "image/tiff",
    "image/heic",
    "image/heif",
    "image/avif",
    "image/svg+xml",
];

const PATHS = {
    metadata: ["/v1/image-processing/metadata", "/v1/metadata", "/metadata"],
    resize: ["/v1/image-processing/resize", "/v1/resize", "/resize"],
    compress: ["/v1/image-processing/compress", "/v1/compress", "/compress"],
    convert: ["/v1/image-processing/convert", "/v1/convert", "/convert"],
    crop: ["/v1/image-processing/crop", "/v1/crop", "/crop"],
};

const DEFAULT_IMAGE_URL =
    "https://plus.unsplash.com/premium_photo-1764547067692-ee303e078c68?q=80&w=1403&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D";

function joinUrl(baseUrl, path) {
    const base = String(baseUrl || "").replace(/\/+$/, "");
    const nextPath = String(path || "").startsWith("/") ? path : `/${path}`;
    return `${base}${nextPath}`;
}

function buildUrl(baseUrl, path, apiKey, authMode) {
    const url = new URL(joinUrl(baseUrl, path), window.location.origin);
    if (apiKey && authMode === "query") {
        url.searchParams.set("api_key", apiKey);
    }
    return url.toString();
}

async function readError(response) {
    const contentType = response.headers.get("content-type") || "";
    if (contentType.includes("application/json")) {
        const json = await response.json().catch(() => null);
        return json?.error || json?.message || JSON.stringify(json);
    }

    return (await response.text().catch(() => "")) || `HTTP ${response.status}`;
}

async function requestWithFallback({ paths, formData, apiKey, authMode, responseType = "json", signal }) {
    let lastResponse = null;

    for (const path of paths) {
        const response = await fetch(buildUrl(API_BASE_URL, path, apiKey, authMode), {
            method: "POST",
            body: formData,
            headers: authMode === "header" && apiKey ? { "x-api-key": apiKey } : undefined,
            signal,
        });

        if (response.ok) {
            return responseType === "blob" ? response.blob() : response.json();
        }

        lastResponse = response;
        if (![404, 405].includes(response.status)) {
            throw new Error(await readError(response));
        }
    }

    throw new Error(lastResponse ? await readError(lastResponse) : "Request failed.");
}

function getFileExtension(file) {
    return String(file?.name || "")
        .toLowerCase()
        .split(".")
        .pop();
}

function validateFile(file) {
    if (!file) {
        return "Upload an image before running a request.";
    }

    const extension = getFileExtension(file);
    if (!IMAGE_MIME_TYPES.includes(file.type) && !SUPPORTED_EXTENSIONS.includes(extension)) {
        return `Unsupported image file. Detected ${file.type || `.${extension}`}.`;
    }

    if (file.size > MAX_FILE_SIZE) {
        return "Image file must be 10 MB or smaller.";
    }

    return "";
}

function isHttpUrl(value) {
    return /^https?:\/\/.+/i.test(String(value || "").trim());
}

function isIntegerInRange(value, { min = 0, max = Number.POSITIVE_INFINITY } = {}) {
    const normalized = String(value || "").trim();
    if (!/^\d+$/.test(normalized)) {
        return false;
    }

    const parsed = Number(normalized);
    return parsed >= min && parsed <= max;
}

function formatBytes(bytes) {
    if (!bytes) {
        return "0 KB";
    }

    const units = ["B", "KB", "MB", "GB"];
    const index = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
    return `${(bytes / 1024 ** index).toFixed(index === 0 ? 0 : 2)} ${units[index]}`;
}

function normalizeMetadata(payload) {
    return payload?.metadata || payload?.data?.metadata || payload?.data || payload || {};
}

function createObjectRows(value, prefix = "") {
    if (!value || typeof value !== "object") {
        return [];
    }

    return Object.entries(value).flatMap(([key, item]) => {
        const label = prefix ? `${prefix}.${key}` : key;
        if (item && typeof item === "object" && !Array.isArray(item)) {
            return createObjectRows(item, label);
        }
        return [[label, item]];
    });
}

function getUrlFileName(imageUrl) {
    try {
        return new URL(imageUrl).pathname.split("/").pop() || "remote-image";
    } catch {
        return "remote-image";
    }
}

function getImageExtension(name) {
    const extension = getFileExtension({ name });
    return SUPPORTED_EXTENSIONS.includes(extension) ? extension : "jpg";
}

function getDownloadName({ file, imageUrl, sourceMode, operation, format }) {
    const sourceName = sourceMode === "url" ? getUrlFileName(imageUrl) : file?.name;
    const baseName = String(sourceName || "processed-image").replace(/\.[^.]+$/, "");
    const extension = operation === "convert" ? format : getImageExtension(sourceName);
    return `${baseName}-${operation}.${extension}`;
}

function App() {
    const [theme, setTheme] = useState(() => {
        if (typeof window === "undefined") return "light";
        return window.localStorage.getItem("theme") || (window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light");
    });
    const [apiKey, setApiKey] = useState(() => import.meta.env.VITE_DATPAQ_API_KEY || "");
    const [authMode, setAuthMode] = useState("query");
    const [sourceMode, setSourceMode] = useState("upload");
    const [file, setFile] = useState(null);
    const [imageUrl, setImageUrl] = useState(DEFAULT_IMAGE_URL);
    const [previewUrl, setPreviewUrl] = useState("");
    const [previewUnsupported, setPreviewUnsupported] = useState(false);
    const [operation, setOperation] = useState("metadata");
    const [format, setFormat] = useState("png");
    const [width, setWidth] = useState("800");
    const [height, setHeight] = useState("600");
    const [quality, setQuality] = useState("80");
    const [crop, setCrop] = useState({ x: "0", y: "0", width: "400", height: "300" });
    const [metadata, setMetadata] = useState(null);
    const [rawResponse, setRawResponse] = useState(null);
    const [resultUrl, setResultUrl] = useState("");
    const [resultBlob, setResultBlob] = useState(null);
    const [outputUnsupported, setOutputUnsupported] = useState(false);
    const [error, setError] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const [lastAction, setLastAction] = useState("");
    const fileInputRef = useRef(null);
    const previewUrlRef = useRef("");
    const resultUrlRef = useRef("");
    const requestControllerRef = useRef(null);

    const isDark = theme === "dark";
    const metadataRows = useMemo(() => createObjectRows(metadata).slice(0, 80), [metadata]);
    const sourcePreviewUrl = sourceMode === "url" && isHttpUrl(imageUrl) ? imageUrl.trim() : previewUrl;

    useEffect(() => {
        window.localStorage.setItem("theme", theme);
    }, [theme]);

    useEffect(() => {
        previewUrlRef.current = previewUrl;
    }, [previewUrl]);

    useEffect(() => {
        resultUrlRef.current = resultUrl;
    }, [resultUrl]);

    useEffect(() => {
        return () => {
            requestControllerRef.current?.abort();
            if (previewUrlRef.current) URL.revokeObjectURL(previewUrlRef.current);
            if (resultUrlRef.current) URL.revokeObjectURL(resultUrlRef.current);
        };
    }, []);

    const clearResponseState = () => {
        if (resultUrlRef.current) URL.revokeObjectURL(resultUrlRef.current);
        resultUrlRef.current = "";
        setResultUrl("");
        setResultBlob(null);
        setOutputUnsupported(false);
        setMetadata(null);
        setRawResponse(null);
        setLastAction("");
    };

    const setSelectedFile = (nextFile) => {
        const fileError = validateFile(nextFile);
        if (fileError) {
            setError(fileError);
            return;
        }

        requestControllerRef.current?.abort();
        if (previewUrlRef.current) URL.revokeObjectURL(previewUrlRef.current);
        if (resultUrlRef.current) URL.revokeObjectURL(resultUrlRef.current);

        setFile(nextFile);
        const nextPreviewUrl = URL.createObjectURL(nextFile);
        previewUrlRef.current = nextPreviewUrl;
        resultUrlRef.current = "";
        setPreviewUrl(nextPreviewUrl);
        setPreviewUnsupported(false);
        setResultUrl("");
        setResultBlob(null);
        setOutputUnsupported(false);
        setMetadata(null);
        setRawResponse(null);
        setError("");
        setLastAction("");
    };

    const buildFormData = (nextOperation) => {
        const formData = new FormData();
        if (sourceMode === "url") {
            formData.append("image_url", imageUrl.trim());
        } else {
            formData.append("image", file);
        }

        if (nextOperation === "resize") {
            formData.append("width", width);
            formData.append("height", height);
        }

        if (nextOperation === "compress") {
            formData.append("quality", quality);
        }

        if (nextOperation === "convert") {
            formData.append("format", format);
        }

        if (nextOperation === "crop") {
            formData.append("x", crop.x);
            formData.append("y", crop.y);
            formData.append("width", crop.width);
            formData.append("height", crop.height);
        }

        return formData;
    };

    const validateRequest = (nextOperation) => {
        if (!apiKey.trim()) return "API key is required.";
        if (sourceMode === "url") {
            if (!imageUrl.trim()) return "Image URL is required.";
            if (!isHttpUrl(imageUrl)) return "Image URL must start with http:// or https://.";
        } else {
            const fileError = validateFile(file);
            if (fileError) return fileError;
        }
        if (nextOperation === "resize") {
            if (!isIntegerInRange(width, { min: 1 }) || !isIntegerInRange(height, { min: 1 })) {
                return "Resize requires positive integer width and height.";
            }
        }
        if (nextOperation === "compress" && !isIntegerInRange(quality, { min: 1, max: 100 })) {
            return "Compression quality must be an integer between 1 and 100.";
        }
        if (nextOperation === "crop") {
            if (
                !isIntegerInRange(crop.x, { min: 0 }) ||
                !isIntegerInRange(crop.y, { min: 0 }) ||
                !isIntegerInRange(crop.width, { min: 1 }) ||
                !isIntegerInRange(crop.height, { min: 1 })
            ) {
                return "Crop requires non-negative x/y and positive integer width/height.";
            }
        }
        return "";
    };

    const runOperation = async (nextOperation = operation) => {
        const requestError = validateRequest(nextOperation);
        if (requestError) {
            setError(requestError);
            return;
        }

        setIsLoading(true);
        setError("");
        setLastAction(nextOperation);

        requestControllerRef.current?.abort();
        const requestController = new AbortController();
        let didTimeout = false;
        const timeoutId = window.setTimeout(() => {
            didTimeout = true;
            requestController.abort();
        }, REQUEST_TIMEOUT_MS);
        requestControllerRef.current = requestController;

        try {
            if (resultUrlRef.current) URL.revokeObjectURL(resultUrlRef.current);
            resultUrlRef.current = "";
            setResultUrl("");
            setResultBlob(null);
            setOutputUnsupported(false);

            const responseType = nextOperation === "metadata" ? "json" : "blob";
            const response = await requestWithFallback({
                paths: PATHS[nextOperation],
                formData: buildFormData(nextOperation),
                apiKey: apiKey.trim(),
                authMode,
                responseType,
                signal: requestController.signal,
            });

            if (nextOperation === "metadata") {
                setRawResponse(response);
                setMetadata(normalizeMetadata(response));
                return;
            }

            const objectUrl = URL.createObjectURL(response);
            resultUrlRef.current = objectUrl;
            setResultBlob(response);
            setResultUrl(objectUrl);
            setOutputUnsupported(false);
            setRawResponse({
                success: true,
                operation: nextOperation,
                output: {
                    type: response.type || "application/octet-stream",
                    size: response.size,
                    downloadName: getDownloadName({ file, imageUrl, sourceMode, operation: nextOperation, format }),
                },
            });
        } catch (requestError) {
            if (requestError?.name === "AbortError" && !didTimeout) {
                return;
            }

            setRawResponse(null);
            setMetadata(null);
            setError(
                requestError?.name === "AbortError"
                    ? "Request timed out. Try a smaller image or retry the operation."
                    : requestError?.message || "Request failed.",
            );
        } finally {
            window.clearTimeout(timeoutId);
            if (requestControllerRef.current === requestController) {
                requestControllerRef.current = null;
            }
            setIsLoading(false);
        }
    };

    const reset = () => {
        requestControllerRef.current?.abort();
        requestControllerRef.current = null;
        if (previewUrlRef.current) URL.revokeObjectURL(previewUrlRef.current);
        if (resultUrlRef.current) URL.revokeObjectURL(resultUrlRef.current);
        previewUrlRef.current = "";
        resultUrlRef.current = "";
        setFile(null);
        setSourceMode("upload");
        setImageUrl(DEFAULT_IMAGE_URL);
        setPreviewUrl("");
        setPreviewUnsupported(false);
        setResultUrl("");
        setResultBlob(null);
        setOutputUnsupported(false);
        setMetadata(null);
        setRawResponse(null);
        setError("");
        setLastAction("");
        if (fileInputRef.current) fileInputRef.current.value = "";
    };

    const downloadResult = () => {
        if (!resultUrl || !resultBlob) return;
        const anchor = document.createElement("a");
        anchor.href = resultUrl;
        anchor.download = getDownloadName({ file, imageUrl, sourceMode, operation: lastAction, format });
        document.body.appendChild(anchor);
        anchor.click();
        anchor.remove();
    };

    const surfaceClass = isDark
        ? "border-zinc-700/70 bg-zinc-900/85 text-zinc-100"
        : "border-slate-200 bg-white/95 text-slate-900";
    const subtleClass = isDark
        ? "border-zinc-700 bg-zinc-950/60 text-zinc-300"
        : "border-slate-200 bg-slate-50 text-slate-700";
    const inputClass = isDark
        ? "border-zinc-700 bg-zinc-950 text-zinc-100 placeholder:text-zinc-500 focus-visible:border-zinc-400 focus-visible:ring-zinc-500/30"
        : "";
    const selectClass = `h-10 w-full rounded-md border px-3 py-2 text-sm outline-none transition ${
        isDark
            ? "border-zinc-700 bg-zinc-950 text-zinc-100 focus-visible:border-zinc-400 focus-visible:ring-2 focus-visible:ring-zinc-500/30"
            : "border-slate-300 bg-white text-slate-900 focus-visible:border-slate-500 focus-visible:ring-2 focus-visible:ring-slate-500/40"
    }`;

    return (
        <div
            className={`relative min-h-screen overflow-hidden px-5 py-8 font-sans md:px-10 ${
                isDark ? "bg-zinc-950 text-zinc-100" : "bg-slate-100 text-slate-900"
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

            <div className="relative z-10 mx-auto flex w-full max-w-7xl flex-col gap-6">
                <header className={`flex flex-col gap-4 rounded-lg border p-5 md:flex-row md:items-center md:justify-between ${surfaceClass}`}>
                    <div>
                        <p className={`text-xs font-bold uppercase tracking-wide ${isDark ? "text-emerald-300" : "text-emerald-700"}`}>
                            DATPAQ sample
                        </p>
                        <h1 className="mt-2 text-3xl font-black tracking-tight">{sampleConfig.appName}</h1>
                        <p className={`mt-2 max-w-3xl text-sm md:text-base ${isDark ? "text-zinc-400" : "text-slate-600"}`}>
                            Upload an image or supply an image URL, inspect metadata, then resize, compress, crop, or convert it.
                        </p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                        <a
                            href={sampleConfig.docsUrl}
                            target="_blank"
                            rel="noreferrer"
                            className={`inline-flex h-10 items-center rounded-md border px-3 text-sm font-semibold transition ${
                                isDark ? "border-zinc-700 hover:bg-zinc-800" : "border-slate-300 bg-white hover:bg-slate-50"
                            }`}
                        >
                            API Docs
                        </a>
                        <Button type="button" variant="outline" className={isDark ? "border-zinc-700 hover:bg-zinc-800" : ""} onClick={() => setTheme(isDark ? "light" : "dark")}>
                            {isDark ? "Light" : "Dark"}
                        </Button>
                    </div>
                </header>

                <main className="grid gap-6 lg:grid-cols-[minmax(360px,480px)_minmax(0,1fr)]">
                    <section className="flex flex-col gap-6">
                        <Card className={surfaceClass}>
                            <CardHeader>
                                <CardTitle>Request</CardTitle>
                                <CardDescription className={isDark ? "text-zinc-400" : "text-slate-600"}>
                                    The main button extracts metadata. Operation buttons run conversions against the selected source.
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-5">
                                <div className="space-y-2">
                                    <Label htmlFor="api-key">API Key</Label>
                                    <Input
                                        id="api-key"
                                        value={apiKey}
                                        onChange={(event) => setApiKey(event.target.value)}
                                        placeholder="Paste DATPAQ API key"
                                        className={inputClass}
                                        autoComplete="off"
                                    />
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="auth-mode">Auth Mode</Label>
                                    <select id="auth-mode" value={authMode} onChange={(event) => setAuthMode(event.target.value)} className={selectClass}>
                                        <option value="query">Query api_key</option>
                                        <option value="header">Header x-api-key</option>
                                    </select>
                                </div>

                                <div className="space-y-2">
                                    <Label>Image Source</Label>
                                    <div className={`grid grid-cols-2 gap-1 rounded-lg border p-1 ${subtleClass}`}>
                                        {[
                                            ["upload", "Upload"],
                                            ["url", "Image URL"],
                                        ].map(([value, label]) => (
                                            <button
                                                key={value}
                                                type="button"
                                                onClick={() => {
                                                    requestControllerRef.current?.abort();
                                                    setSourceMode(value);
                                                    setPreviewUnsupported(false);
                                                    clearResponseState();
                                                    setError("");
                                                }}
                                                className={`h-9 rounded-md text-sm font-semibold transition ${
                                                    sourceMode === value
                                                        ? isDark
                                                            ? "bg-zinc-100 text-zinc-950"
                                                            : "bg-slate-900 text-white"
                                                        : isDark
                                                          ? "text-zinc-300 hover:bg-zinc-800"
                                                          : "text-slate-700 hover:bg-white"
                                                }`}
                                            >
                                                {label}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                {sourceMode === "upload" ? (
                                    <div
                                        role="button"
                                        tabIndex={0}
                                        onClick={() => fileInputRef.current?.click()}
                                        onKeyDown={(event) => {
                                            if (event.key === "Enter" || event.key === " ") fileInputRef.current?.click();
                                        }}
                                        onDragOver={(event) => event.preventDefault()}
                                        onDrop={(event) => {
                                            event.preventDefault();
                                            if (event.dataTransfer.files?.[0]) setSelectedFile(event.dataTransfer.files[0]);
                                        }}
                                        className={`rounded-lg border-2 border-dashed p-6 text-center transition ${subtleClass} cursor-pointer`}
                                    >
                                        <input
                                            ref={fileInputRef}
                                            type="file"
                                            accept="image/*,.heic,.heif,.avif"
                                            className="hidden"
                                            onChange={(event) => {
                                                if (event.target.files?.[0]) setSelectedFile(event.target.files[0]);
                                            }}
                                        />
                                        <p className="text-sm font-semibold">{file ? file.name : "Drop an image here or browse"}</p>
                                        <p className="mt-1 text-xs opacity-75">
                                            {file ? `${formatBytes(file.size)} · ${file.type || `.${getFileExtension(file)}`}` : "JPEG, PNG, WebP, HEIC, AVIF, SVG, GIF, BMP, TIFF up to 10 MB"}
                                        </p>
                                    </div>
                                ) : (
                                    <div className="space-y-2">
                                        <Label htmlFor="image-url">Image URL</Label>
                                        <Input
                                            id="image-url"
                                            value={imageUrl}
                                            onChange={(event) => {
                                                requestControllerRef.current?.abort();
                                                setImageUrl(event.target.value);
                                                setPreviewUnsupported(false);
                                                clearResponseState();
                                                setError("");
                                            }}
                                            placeholder="https://example.com/photo.jpg"
                                            className={inputClass}
                                        />
                                    </div>
                                )}

                                {error ? (
                                    <div className={`rounded-md border p-3 text-sm ${isDark ? "border-red-500/40 bg-red-500/10 text-red-200" : "border-red-200 bg-red-50 text-red-700"}`}>
                                        {error}
                                    </div>
                                ) : null}

                                <div className="flex flex-wrap gap-2">
                                    <Button type="button" disabled={isLoading} onClick={() => runOperation("metadata")} className={isDark ? "bg-zinc-100 text-zinc-950 hover:bg-white" : ""}>
                                        {isLoading && lastAction === "metadata" ? "Running..." : "Run Request"}
                                    </Button>
                                    <Button type="button" variant="outline" onClick={reset} className={isDark ? "border-zinc-700 hover:bg-zinc-800" : ""}>
                                        Reset
                                    </Button>
                                </div>
                            </CardContent>
                        </Card>

                        <Card className={surfaceClass}>
                            <CardHeader>
                                <CardTitle>Convert Functions</CardTitle>
                                <CardDescription className={isDark ? "text-zinc-400" : "text-slate-600"}>
                                    Each action posts the selected image source as multipart form data.
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-5">
                                <div className="grid gap-3 sm:grid-cols-2">
                                    <div className="space-y-2">
                                        <Label htmlFor="operation">Operation</Label>
                                        <select id="operation" value={operation} onChange={(event) => setOperation(event.target.value)} className={selectClass}>
                                            <option value="metadata">Metadata</option>
                                            <option value="convert">Convert</option>
                                            <option value="resize">Resize</option>
                                            <option value="compress">Compress</option>
                                            <option value="crop">Crop</option>
                                        </select>
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="format">Format</Label>
                                        <select id="format" value={format} onChange={(event) => setFormat(event.target.value)} className={selectClass}>
                                            <option value="jpeg">JPEG</option>
                                            <option value="png">PNG</option>
                                            <option value="webp">WebP</option>
                                        </select>
                                    </div>
                                </div>

                                <div className="grid gap-3 sm:grid-cols-2">
                                    <div className="space-y-2">
                                        <Label htmlFor="width">Width</Label>
                                        <Input id="width" type="number" min="1" value={width} onChange={(event) => setWidth(event.target.value)} className={inputClass} />
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="height">Height</Label>
                                        <Input id="height" type="number" min="1" value={height} onChange={(event) => setHeight(event.target.value)} className={inputClass} />
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="quality">Quality</Label>
                                    <Input id="quality" type="number" min="1" max="100" value={quality} onChange={(event) => setQuality(event.target.value)} className={inputClass} />
                                </div>

                                <div className="grid gap-3 sm:grid-cols-4">
                                    {["x", "y", "width", "height"].map((key) => (
                                        <div className="space-y-2" key={key}>
                                            <Label htmlFor={`crop-${key}`}>Crop {key}</Label>
                                            <Input
                                                id={`crop-${key}`}
                                                type="number"
                                                min={key === "x" || key === "y" ? "0" : "1"}
                                                value={crop[key]}
                                                onChange={(event) => setCrop((current) => ({ ...current, [key]: event.target.value }))}
                                                className={inputClass}
                                            />
                                        </div>
                                    ))}
                                </div>

                                <div className="grid gap-2 sm:grid-cols-2">
                                    <Button type="button" disabled={isLoading} onClick={() => runOperation(operation)}>
                                        Run Selected
                                    </Button>
                                    <Button type="button" variant="secondary" disabled={isLoading} onClick={() => runOperation("convert")}>
                                        Convert to {format.toUpperCase()}
                                    </Button>
                                    <Button type="button" variant="secondary" disabled={isLoading} onClick={() => runOperation("resize")}>
                                        Resize
                                    </Button>
                                    <Button type="button" variant="secondary" disabled={isLoading} onClick={() => runOperation("compress")}>
                                        Compress
                                    </Button>
                                </div>
                            </CardContent>
                        </Card>
                    </section>

                    <section className="grid gap-6">
                        <Card className={surfaceClass}>
                            <CardHeader>
                                <CardTitle>Image Preview</CardTitle>
                                <CardDescription className={isDark ? "text-zinc-400" : "text-slate-600"}>
                                    Original upload and processed output render here when available.
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="grid gap-4 md:grid-cols-2">
                                <div className={`min-h-72 rounded-lg border p-3 ${subtleClass}`}>
                                    <p className="mb-3 text-xs font-bold uppercase tracking-wide">Original</p>
                                    {sourcePreviewUrl && !previewUnsupported ? (
                                        <img
                                            src={sourcePreviewUrl}
                                            alt="Selected image preview"
                                            className="h-64 w-full rounded-md object-contain"
                                            onError={() => setPreviewUnsupported(true)}
                                            onLoad={() => setPreviewUnsupported(false)}
                                        />
                                    ) : sourcePreviewUrl && previewUnsupported ? (
                                        <div className="flex h-64 flex-col items-center justify-center gap-2 text-center text-sm opacity-80">
                                            <p className="font-semibold">Preview image not supported</p>
                                            <p className="max-w-xs text-xs opacity-75">
                                                The file can still be sent to the API, but this browser cannot render it here.
                                            </p>
                                        </div>
                                    ) : (
                                        <div className="flex h-64 items-center justify-center text-sm opacity-70">No image selected</div>
                                    )}
                                </div>
                                <div className={`min-h-72 rounded-lg border p-3 ${subtleClass}`}>
                                    <div className="mb-3 flex items-center justify-between gap-2">
                                        <p className="text-xs font-bold uppercase tracking-wide">Output</p>
                                        {resultUrl ? (
                                            <Button type="button" size="sm" variant="outline" onClick={downloadResult} className={isDark ? "border-zinc-700 hover:bg-zinc-800" : ""}>
                                                Download
                                            </Button>
                                        ) : null}
                                    </div>
                                    {resultUrl && !outputUnsupported ? (
                                        <img
                                            src={resultUrl}
                                            alt="Processed output"
                                            className="h-64 w-full rounded-md object-contain"
                                            onError={() => setOutputUnsupported(true)}
                                            onLoad={() => setOutputUnsupported(false)}
                                        />
                                    ) : resultUrl && outputUnsupported ? (
                                        <div className="flex h-64 flex-col items-center justify-center gap-2 text-center text-sm opacity-80">
                                            <p className="font-semibold">Output preview not supported</p>
                                            <p className="max-w-xs text-xs opacity-75">
                                                The processed file is ready to download, but this browser cannot render it here.
                                            </p>
                                        </div>
                                    ) : (
                                        <div className="flex h-64 items-center justify-center text-sm opacity-70">No processed output yet</div>
                                    )}
                                </div>
                            </CardContent>
                        </Card>

                        <Card className={surfaceClass}>
                            <CardHeader>
                                <CardTitle>Metadata</CardTitle>
                                <CardDescription className={isDark ? "text-zinc-400" : "text-slate-600"}>
                                    Relevant information returned by the image metadata endpoint.
                                </CardDescription>
                            </CardHeader>
                            <CardContent>
                                {metadataRows.length ? (
                                    <div className="grid gap-2 md:grid-cols-2">
                                        {metadataRows.map(([key, value]) => (
                                            <div className={`rounded-md border p-3 ${subtleClass}`} key={key}>
                                                <p className="text-xs font-bold uppercase tracking-wide opacity-70">{key}</p>
                                                <p className="mt-1 break-words text-sm">{value === null || value === undefined || value === "" ? "Not available" : String(value)}</p>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <div className={`rounded-lg border p-4 text-sm ${subtleClass}`}>
                                        Select an image source and run the request to inspect metadata.
                                    </div>
                                )}
                            </CardContent>
                        </Card>

                        <Card className={surfaceClass}>
                            <CardHeader>
                                <CardTitle>Raw Response</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <pre className={`max-h-96 overflow-auto rounded-lg border p-4 text-xs ${subtleClass}`}>
                                    {rawResponse ? JSON.stringify(rawResponse, null, 2) : "No response yet."}
                                </pre>
                            </CardContent>
                        </Card>
                    </section>
                </main>
            </div>
        </div>
    );
}

export default App;
