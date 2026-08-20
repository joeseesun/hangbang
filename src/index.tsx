import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { ErrorBoundary } from "react-error-boundary";
import App from "./app";
import "./index.css";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <BrowserRouter basename={process.env.CLIENT_BASE_PATH || "/"}>
      <ErrorBoundary
        fallbackRender={({ error, resetErrorBoundary }) => (
          <main className="grid min-h-dvh place-items-center bg-[#191b22] px-6 text-white">
            <section className="max-w-md text-center">
              <h1 className="text-2xl font-bold">夯榜暂时没能打开</h1>
              <p className="mt-3 text-sm text-white/60">
                {error instanceof Error ? error.message : "发生了未知错误"}
              </p>
              <button
                type="button"
                className="mt-6 rounded-md bg-violet-600 px-4 py-2 font-medium hover:bg-violet-500"
                onClick={resetErrorBoundary}
              >
                重新载入
              </button>
            </section>
          </main>
        )}
      >
        <App />
      </ErrorBoundary>
    </BrowserRouter>
  </StrictMode>,
);
