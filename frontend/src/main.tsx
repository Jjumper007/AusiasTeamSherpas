import { createRoot } from "react-dom/client";
import "../../design/sherpas-tokens.css";
import "./styles.css";
import "./app.css";
import { App } from "./App";

// No StrictMode: its double effects in development would start every generation job twice.
createRoot(document.getElementById("root")!).render(<App />);
