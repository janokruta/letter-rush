import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// letter-rush.jsx uses JSX but has a .jsx extension, so no extra esbuild config is needed.
export default defineConfig({
  plugins: [react()],
});
