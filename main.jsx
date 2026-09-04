import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import NaLitere from "./letter-rush.jsx";

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <NaLitere />
  </StrictMode>
);
