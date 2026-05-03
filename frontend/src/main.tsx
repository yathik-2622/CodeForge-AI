import { createRoot } from "react-dom/client";
import { setBaseUrl } from "./lib/api";
import App from "./App";
import "./index.css";

const apiUrl = import.meta.env.VITE_API_URL as string | undefined;
if (apiUrl) setBaseUrl(apiUrl);

createRoot(document.getElementById("root")!).render(<App />);
