import { Toaster } from "@/components/ui/sonner";
import { VlyToolbar } from "../vly-toolbar-readonly.tsx";
import { InstrumentationProvider } from "@/instrumentation.tsx";
import AuthPage from "@/pages/Auth.tsx";
import Dashboard from "@/pages/Dashboard.tsx";
import { ConvexAuthProvider } from "@convex-dev/auth/react";
import { ConvexReactClient } from "convex/react";
import { StrictMode, useEffect } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter, Route, Routes, useLocation } from "react-router";
import "./index.css";
import Landing from "./pages/Landing.tsx";
import NotFound from "./pages/NotFound.tsx";
import Admin from "./pages/Admin.tsx";
import "./types/global.d.ts";

const storedTheme = (() => {
  try {
    return localStorage.getItem("theme");
  } catch {
    return null;
  }
})();
if (storedTheme === "dark") {
  document.documentElement.classList.add("dark");
} else if (storedTheme === "light") {
  document.documentElement.classList.remove("dark");
}

const convex = new ConvexReactClient(import.meta.env.VITE_CONVEX_URL as string);

if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker
      .register("/service-worker.js")
      .catch((err) => console.warn("SW registration failed:", err));
  });
}

// Handle PWA install prompt across browsers
(function setupInstallPrompt() {
  let deferredPrompt: any = null;
  let installBtn: HTMLButtonElement | null = null;

  function removeInstallButton() {
    if (installBtn && installBtn.parentElement) {
      installBtn.parentElement.removeChild(installBtn);
    }
    installBtn = null;
  }

  function showInstallCTA() {
    if (installBtn) return; // already showing
    installBtn = document.createElement("button");
    installBtn.textContent = "Install App";
    installBtn.setAttribute("aria-label", "Install App");
    installBtn.style.position = "fixed";
    installBtn.style.right = "16px";
    installBtn.style.bottom = "16px";
    installBtn.style.zIndex = "9999";
    installBtn.style.padding = "10px 14px";
    installBtn.style.borderRadius = "9999px";
    installBtn.style.border = "1px solid rgba(0,0,0,0.1)";
    installBtn.style.background = "oklch(0.75 0.1 250 / 0.9)";
    installBtn.style.color = "black";
    installBtn.style.boxShadow = "0 4px 12px rgba(0,0,0,0.15)";
    installBtn.style.cursor = "pointer";
    installBtn.style.fontSize = "14px";

    installBtn.addEventListener("click", async () => {
      if (!deferredPrompt) return;
      try {
        // @ts-ignore
        deferredPrompt.prompt();
        // @ts-ignore
        await deferredPrompt.userChoice?.then?.(() => {});
      } catch (e) {
        console.warn("Install prompt failed:", e);
      } finally {
        deferredPrompt = null;
        removeInstallButton();
      }
    });

    document.body.appendChild(installBtn);
  }

  window.addEventListener("beforeinstallprompt", (e: Event) => {
    // Prevent the mini-infobar and store the event for later
    e.preventDefault();
    // @ts-ignore
    deferredPrompt = e;
    showInstallCTA();
  });

  window.addEventListener("appinstalled", () => {
    deferredPrompt = null;
    removeInstallButton();
    console.log("PWA installed");
  });
})();

function RouteSyncer() {
  const location = useLocation();
  useEffect(() => {
    window.parent.postMessage(
      { type: "iframe-route-change", path: location.pathname },
      "*",
    );
  }, [location.pathname]);

  useEffect(() => {
    function handleMessage(event: MessageEvent) {
      if (event.data?.type === "navigate") {
        if (event.data.direction === "back") window.history.back();
        if (event.data.direction === "forward") window.history.forward();
      }
    }
    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, []);

  return null;
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <VlyToolbar />
    <InstrumentationProvider>
      <ConvexAuthProvider client={convex}>
        <BrowserRouter>
          <RouteSyncer />
          <Routes>
            <Route path="/" element={<Landing />} />
            <Route path="/auth" element={<AuthPage redirectAfterAuth="/dashboard" />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/admin" element={<Admin />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
        <Toaster />
      </ConvexAuthProvider>
    </InstrumentationProvider>
  </StrictMode>,
);