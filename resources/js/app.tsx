
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import AuthGate from "./AuthGate";
import "./bootstrap";

const rootElement = document.getElementById("app");

if (!rootElement) {
  throw new Error('Could not find the application root element "#app".');
}

createRoot(rootElement).render(
  <StrictMode>
    <AuthGate />
  </StrictMode>,
);
