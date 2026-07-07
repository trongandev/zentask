// vite.config.ts
import { defineConfig } from "file:///F:/trongan/quizzet-project/extension-quizzet/node_modules/vite/dist/node/index.js";
import react from "file:///F:/trongan/quizzet-project/extension-quizzet/node_modules/@vitejs/plugin-react/dist/index.js";
import { crx } from "file:///F:/trongan/quizzet-project/extension-quizzet/node_modules/@crxjs/vite-plugin/dist/index.mjs";

// public/manifest.json
var manifest_default = {
  manifest_version: 3,
  name: "Quizzet Translation Extension",
  version: "2.0.5",
  description: "M\u1ED9t c\xF4ng c\u1EE5 gi\xFAp d\u1ECBch thu\u1EADt c\u0169ng nh\u01B0 l\u01B0u l\u1EA1i t\u1EEB v\u1EF1ng nhanh ch\xF3ng tr\xEAn trang quizzet.id.vn",
  permissions: ["cookies", "storage"],
  background: {
    service_worker: "src/background.ts"
  },
  action: {
    default_popup: "index.html",
    default_icon: "icon64.png"
  },
  content_scripts: [
    {
      matches: ["<all_urls>"],
      js: ["src/content.tsx"],
      run_at: "document_idle"
    },
    {
      matches: ["*://*.youtube.com/*"],
      js: ["src/youtube.tsx"],
      run_at: "document_idle"
    }
  ],
  icons: {
    "16": "icon64.png",
    "32": "icon64.png",
    "48": "icon64.png",
    "128": "icon64.png"
  },
  content_security_policy: {
    extension_pages: "script-src 'self'; object-src 'self'"
  },
  host_permissions: ["*://*/*"],
  web_accessible_resources: [
    {
      resources: ["icon64.png"],
      matches: ["<all_urls>"]
    }
  ]
};

// vite.config.ts
var vite_config_default = defineConfig({
  plugins: [react(), crx({ manifest: manifest_default })],
  build: {
    minify: "esbuild"
  }
});
export {
  vite_config_default as default
};
//# sourceMappingURL=data:application/json;base64,ewogICJ2ZXJzaW9uIjogMywKICAic291cmNlcyI6IFsidml0ZS5jb25maWcudHMiLCAicHVibGljL21hbmlmZXN0Lmpzb24iXSwKICAic291cmNlc0NvbnRlbnQiOiBbImNvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9kaXJuYW1lID0gXCJGOlxcXFx0cm9uZ2FuXFxcXHF1aXp6ZXQtcHJvamVjdFxcXFxleHRlbnNpb24tcXVpenpldFwiO2NvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9maWxlbmFtZSA9IFwiRjpcXFxcdHJvbmdhblxcXFxxdWl6emV0LXByb2plY3RcXFxcZXh0ZW5zaW9uLXF1aXp6ZXRcXFxcdml0ZS5jb25maWcudHNcIjtjb25zdCBfX3ZpdGVfaW5qZWN0ZWRfb3JpZ2luYWxfaW1wb3J0X21ldGFfdXJsID0gXCJmaWxlOi8vL0Y6L3Ryb25nYW4vcXVpenpldC1wcm9qZWN0L2V4dGVuc2lvbi1xdWl6emV0L3ZpdGUuY29uZmlnLnRzXCI7aW1wb3J0IHsgZGVmaW5lQ29uZmlnIH0gZnJvbSBcInZpdGVcIjtcbmltcG9ydCByZWFjdCBmcm9tIFwiQHZpdGVqcy9wbHVnaW4tcmVhY3RcIjtcbmltcG9ydCB7IGNyeCB9IGZyb20gXCJAY3J4anMvdml0ZS1wbHVnaW5cIjtcbmltcG9ydCBtYW5pZmVzdCBmcm9tIFwiLi9wdWJsaWMvbWFuaWZlc3QuanNvblwiO1xuXG4vLyBodHRwczovL3ZpdGVqcy5kZXYvY29uZmlnL1xuZXhwb3J0IGRlZmF1bHQgZGVmaW5lQ29uZmlnKHtcbiAgcGx1Z2luczogW3JlYWN0KCksIGNyeCh7IG1hbmlmZXN0IH0pXSxcbiAgYnVpbGQ6IHtcbiAgICBtaW5pZnk6IFwiZXNidWlsZFwiLFxuICB9LFxufSk7XG4iLCAie1xyXG4gIFwibWFuaWZlc3RfdmVyc2lvblwiOiAzLFxyXG4gIFwibmFtZVwiOiBcIlF1aXp6ZXQgVHJhbnNsYXRpb24gRXh0ZW5zaW9uXCIsXHJcbiAgXCJ2ZXJzaW9uXCI6IFwiMi4wLjVcIixcclxuICBcImRlc2NyaXB0aW9uXCI6IFwiTVx1MUVEOXQgY1x1MDBGNG5nIGNcdTFFRTUgZ2lcdTAwRkFwIGRcdTFFQ0JjaCB0aHVcdTFFQUR0IGNcdTAxNjluZyBuaFx1MDFCMCBsXHUwMUIwdSBsXHUxRUExaSB0XHUxRUVCIHZcdTFFRjFuZyBuaGFuaCBjaFx1MDBGM25nIHRyXHUwMEVBbiB0cmFuZyBxdWl6emV0LmlkLnZuXCIsXHJcbiAgXCJwZXJtaXNzaW9uc1wiOiBbXCJjb29raWVzXCIsIFwic3RvcmFnZVwiXSxcclxuICBcImJhY2tncm91bmRcIjoge1xyXG4gICAgXCJzZXJ2aWNlX3dvcmtlclwiOiBcInNyYy9iYWNrZ3JvdW5kLnRzXCJcclxuICB9LFxyXG4gIFwiYWN0aW9uXCI6IHtcclxuICAgIFwiZGVmYXVsdF9wb3B1cFwiOiBcImluZGV4Lmh0bWxcIixcclxuICAgIFwiZGVmYXVsdF9pY29uXCI6IFwiaWNvbjY0LnBuZ1wiXHJcbiAgfSxcclxuXHJcbiAgXCJjb250ZW50X3NjcmlwdHNcIjogW1xyXG4gICAge1xyXG4gICAgICBcIm1hdGNoZXNcIjogW1wiPGFsbF91cmxzPlwiXSxcclxuICAgICAgXCJqc1wiOiBbXCJzcmMvY29udGVudC50c3hcIl0sXHJcbiAgICAgIFwicnVuX2F0XCI6IFwiZG9jdW1lbnRfaWRsZVwiXHJcbiAgICB9LFxyXG4gICAge1xyXG4gICAgICBcIm1hdGNoZXNcIjogW1wiKjovLyoueW91dHViZS5jb20vKlwiXSxcclxuICAgICAgXCJqc1wiOiBbXCJzcmMveW91dHViZS50c3hcIl0sXHJcbiAgICAgIFwicnVuX2F0XCI6IFwiZG9jdW1lbnRfaWRsZVwiXHJcbiAgICB9XHJcbiAgXSxcclxuXHJcbiAgXCJpY29uc1wiOiB7XHJcbiAgICBcIjE2XCI6IFwiaWNvbjY0LnBuZ1wiLFxyXG4gICAgXCIzMlwiOiBcImljb242NC5wbmdcIixcclxuICAgIFwiNDhcIjogXCJpY29uNjQucG5nXCIsXHJcbiAgICBcIjEyOFwiOiBcImljb242NC5wbmdcIlxyXG4gIH0sXHJcbiAgXCJjb250ZW50X3NlY3VyaXR5X3BvbGljeVwiOiB7XHJcbiAgICBcImV4dGVuc2lvbl9wYWdlc1wiOiBcInNjcmlwdC1zcmMgJ3NlbGYnOyBvYmplY3Qtc3JjICdzZWxmJ1wiXHJcbiAgfSxcclxuICBcImhvc3RfcGVybWlzc2lvbnNcIjogW1wiKjovLyovKlwiXSxcclxuICBcIndlYl9hY2Nlc3NpYmxlX3Jlc291cmNlc1wiOiBbXHJcbiAgICB7XHJcbiAgICAgIFwicmVzb3VyY2VzXCI6IFtcImljb242NC5wbmdcIl0sXHJcbiAgICAgIFwibWF0Y2hlc1wiOiBbXCI8YWxsX3VybHM+XCJdXHJcbiAgICB9XHJcbiAgXVxyXG59XHJcbiJdLAogICJtYXBwaW5ncyI6ICI7QUFBOFQsU0FBUyxvQkFBb0I7QUFDM1YsT0FBTyxXQUFXO0FBQ2xCLFNBQVMsV0FBVzs7O0FDRnBCO0FBQUEsRUFDRSxrQkFBb0I7QUFBQSxFQUNwQixNQUFRO0FBQUEsRUFDUixTQUFXO0FBQUEsRUFDWCxhQUFlO0FBQUEsRUFDZixhQUFlLENBQUMsV0FBVyxTQUFTO0FBQUEsRUFDcEMsWUFBYztBQUFBLElBQ1osZ0JBQWtCO0FBQUEsRUFDcEI7QUFBQSxFQUNBLFFBQVU7QUFBQSxJQUNSLGVBQWlCO0FBQUEsSUFDakIsY0FBZ0I7QUFBQSxFQUNsQjtBQUFBLEVBRUEsaUJBQW1CO0FBQUEsSUFDakI7QUFBQSxNQUNFLFNBQVcsQ0FBQyxZQUFZO0FBQUEsTUFDeEIsSUFBTSxDQUFDLGlCQUFpQjtBQUFBLE1BQ3hCLFFBQVU7QUFBQSxJQUNaO0FBQUEsSUFDQTtBQUFBLE1BQ0UsU0FBVyxDQUFDLHFCQUFxQjtBQUFBLE1BQ2pDLElBQU0sQ0FBQyxpQkFBaUI7QUFBQSxNQUN4QixRQUFVO0FBQUEsSUFDWjtBQUFBLEVBQ0Y7QUFBQSxFQUVBLE9BQVM7QUFBQSxJQUNQLE1BQU07QUFBQSxJQUNOLE1BQU07QUFBQSxJQUNOLE1BQU07QUFBQSxJQUNOLE9BQU87QUFBQSxFQUNUO0FBQUEsRUFDQSx5QkFBMkI7QUFBQSxJQUN6QixpQkFBbUI7QUFBQSxFQUNyQjtBQUFBLEVBQ0Esa0JBQW9CLENBQUMsU0FBUztBQUFBLEVBQzlCLDBCQUE0QjtBQUFBLElBQzFCO0FBQUEsTUFDRSxXQUFhLENBQUMsWUFBWTtBQUFBLE1BQzFCLFNBQVcsQ0FBQyxZQUFZO0FBQUEsSUFDMUI7QUFBQSxFQUNGO0FBQ0Y7OztBRHJDQSxJQUFPLHNCQUFRLGFBQWE7QUFBQSxFQUMxQixTQUFTLENBQUMsTUFBTSxHQUFHLElBQUksRUFBRSwyQkFBUyxDQUFDLENBQUM7QUFBQSxFQUNwQyxPQUFPO0FBQUEsSUFDTCxRQUFRO0FBQUEsRUFDVjtBQUNGLENBQUM7IiwKICAibmFtZXMiOiBbXQp9Cg==
