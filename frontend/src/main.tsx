import { Profiler, StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { AuthProvider } from "./contexts/AuthContext";
import { Toaster } from "react-hot-toast";
import { HelmetProvider } from "react-helmet-async";

const onRender = (
  id: string,
  phase: "mount" | "update",
  actualDuration: number,
  baseDuration: number,
  startTime: number,
  commitTime: number
) => {
  // Chỉ log ra những component render lâu hơn 16ms (1 khung hình ở 60fps)
  if (actualDuration > 16) {
    console.warn(
      `[Profiler] 🐢 Render chậm: ${id} (${phase})\n` +
      `Thời gian thực tế: ${actualDuration.toFixed(2)}ms\n` +
      `Thời gian ước tính (base): ${baseDuration.toFixed(2)}ms`
    );
  } else {
    // Có thể uncomment dòng dưới để xem mọi render
    // console.log(`[Profiler] ⚡ ${id} (${phase}) rendered in ${actualDuration.toFixed(2)}ms`);
  }
};

createRoot(document.getElementById("root")!).render(
  // <StrictMode>
  <Profiler id="App" onRender={onRender}>
    <HelmetProvider>
      <AuthProvider>
        <Toaster position="top-center" />
        <App />
      </AuthProvider>
    </HelmetProvider>
  </Profiler>
  // </StrictMode>,
);
