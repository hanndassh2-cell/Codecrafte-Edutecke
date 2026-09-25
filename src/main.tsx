import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

// Polyfill window.fetch getter/setter to prevent read-only property assignment crashes in iframe sandboxes
try {
  let _origFetch = window.fetch ? window.fetch.bind(window) : undefined;
  Object.defineProperty(window, "fetch", {
    get() {
      return _origFetch;
    },
    set(val) {
      _origFetch = typeof val === "function" ? val.bind(window) : val;
    },
    configurable: true,
    enumerable: true,
  });
} catch (e) {
  console.warn("window.fetch initialization warning:", e);
}

// Override window.alert to prevent iframe sandboxing crashes
const safeAlert = (message: string) => {
  console.log("Alert intercepted:", message);
  const toast = document.createElement("div");
  toast.textContent = message;
  toast.style.position = "fixed";
  toast.style.bottom = "20px";
  toast.style.right = "20px";
  toast.style.backgroundColor = "#1e293b";
  toast.style.color = "#fff";
  toast.style.padding = "12px 20px";
  toast.style.borderRadius = "8px";
  toast.style.boxShadow =
    "0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)";
  toast.style.zIndex = "9999";
  toast.style.fontFamily = "system-ui, sans-serif";
  toast.style.direction = "rtl";
  toast.style.transition = "opacity 0.3s ease";

  document.body.appendChild(toast);

  setTimeout(() => {
    toast.style.opacity = "0";
    setTimeout(() => toast.remove(), 300);
  }, 4000);
};

try {
  window.alert = safeAlert;
} catch (e) {
  try {
    Object.defineProperty(window, "alert", {
      value: safeAlert,
      writable: true,
      configurable: true,
    });
  } catch (err) {}
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
