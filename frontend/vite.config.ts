import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import path from "path";
import { defineConfig } from "vite";
import { visualizer } from "rollup-plugin-visualizer";

export default defineConfig(() => {
  return {
    plugins: [react(), tailwindcss(), visualizer({ open: true })],
    resolve: {
      alias: [{ find: "@", replacement: path.resolve(__dirname, ".") }],
      fs: {
        allow: [".."],
      },
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modify—file watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== "true",
      // Disable file watching when DISABLE_HMR is true to save CPU during agent edits.
      watch: process.env.DISABLE_HMR === "true" ? null : {},
    },
    build: {
      rollupOptions: {
        output: {
          // Tách các thư viện nặng thành các chunk riêng biệt thay vì gom chung vào một file vendor khổng lồ
          manualChunks(id) {
            if (id.includes("node_modules")) {
              if (id.includes("lucide-react")) return "vendor-lucide";
              if (id.includes("recharts") || id.includes("d3-") || id.includes("d3-shape") || id.includes("d3-path") || id.includes("d3-scale") || id.includes("d3-array") || id.includes("d3-time") || id.includes("d3-format") || id.includes("d3-color") || id.includes("d3-interpolate") || id.includes("d3-time-format") || id.includes("victory-vendor")) return "vendor-recharts";
              if (id.includes("motion") || id.includes("framer-motion")) return "vendor-motion";
              if (id.includes("@tiptap") || id.includes("prosemirror")) return "vendor-tiptap";
              if (id.includes("@dnd-kit")) return "vendor-dnd";
              if (id.includes("@google/genai")) return "vendor-genai";
              
              // Trả về undefined cho các package còn lại để Vite/Rollup tự động phân bổ thông minh, 
              // tránh lỗi Circular chunk dependencies.
              return undefined;
            }
          },
        },
      },
    },
  };
});
