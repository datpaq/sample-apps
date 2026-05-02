import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import App from "./App.jsx";

/*
 * DATPAQ - API Template v1.0
 *
 * Developer/Designer:
 * Jerod Huseman
 * https://x.com/datpaq
 * https://www.linkedin.com/company/datpaq/about/
 *
 */

createRoot(document.getElementById("root")).render(
    <StrictMode>
        <App />
    </StrictMode>,
);
