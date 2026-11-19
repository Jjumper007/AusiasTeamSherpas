import { lazy, Suspense } from "react";
import { createRoot } from "react-dom/client";
import "../../design/sherpas-tokens.css";
import "./styles.css";
import "./app.css";
import { App } from "./App";
import { DemoApp } from "./demo/DemoApp";

/** The demo build (npm run demo:build sets VITE_DEMO=1) plays videos made earlier, with no backend. */
const Root = import.meta.env.VITE_DEMO === "1" ? DemoApp : App;
/** npm run live sets VITE_LIVE=1: the Live run, loaded on its own so Remotion never reaches the other builds. */
const LiveApp = import.meta.env.VITE_LIVE === "1" ? lazy(() => import("./live/LiveApp")) : null;

// No StrictMode: its double effects in development would start every generation job twice.
createRoot(document.getElementById("root")!).render(
  LiveApp ? (
    <Suspense>
      <LiveApp />
    </Suspense>
  ) : (
    <Root />
  ),
);
