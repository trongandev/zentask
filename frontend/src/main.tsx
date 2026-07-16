import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { AuthProvider } from "./contexts/AuthContext";
import { Toaster } from "react-hot-toast";
import { HelmetProvider } from "react-helmet-async";

createRoot(document.getElementById("root")!).render(
  // <StrictMode>
  <HelmetProvider>
    <AuthProvider>
      <Toaster position="top-center" />
      <App />
    </AuthProvider>
  </HelmetProvider>,
  // </StrictMode>,
);
