import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

const proxyTarget = globalThis.process?.env?.VITE_DATPAQ_PROXY_TARGET || "https://datpaq.com";

export default defineConfig({
    plugins: [react(), tailwindcss()],
    server: {
        proxy: {
            "/api": {
                target: proxyTarget,
                changeOrigin: true,
                secure: true,
            },
        },
    },
    preview: {
        proxy: {
            "/api": {
                target: proxyTarget,
                changeOrigin: true,
                secure: true,
            },
        },
    },
});
