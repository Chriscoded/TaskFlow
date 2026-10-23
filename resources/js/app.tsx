

import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import TaskFlowApp from "./TaskFlowApp";
import "../css/app.css";

const rootElement = document.getElementById("app");

if (!rootElement) {
  throw new Error(
    'React could not find the root element "#app". Check your Blade view.',
  );
}

createRoot(rootElement).render(
  <StrictMode>
    <TaskFlowApp />
  </StrictMode>,
);

