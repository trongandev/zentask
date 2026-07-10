import React, { forwardRef, useCallback, useEffect, useImperativeHandle, useMemo, useRef, useState } from "react";
import { AlertTriangle, ShieldCheck } from "lucide-react";

const RECAPTCHA_SCRIPT_ID = "zentask-google-recaptcha-script";
const RECAPTCHA_ONLOAD_NAME = "__zentaskRecaptchaOnload";
const SITE_KEY = String(import.meta.env.VITE_RECAPTCHA_SITE_KEY || "").trim();
const FRONTEND_RECAPTCHA_ENABLED = String(import.meta.env.VITE_RECAPTCHA_ENABLED ?? "true").toLowerCase() !== "false";

const isLocalHost = () => {
  if (typeof window === "undefined") return false;
  return ["localhost", "127.0.0.1", "0.0.0.0"].includes(window.location.hostname);
};

const canUseDevBypass = () => {
  return import.meta.env.DEV && isLocalHost() && String(import.meta.env.VITE_RECAPTCHA_DEV_BYPASS ?? "true").toLowerCase() !== "false";
};

type Grecaptcha = {
  render?: (container: HTMLElement, options: Record<string, unknown>) => number;
  reset?: (widgetId?: number) => void;
  ready?: (callback: () => void) => void;
};

declare global {
  interface Window {
    grecaptcha?: Grecaptcha;
    __zentaskRecaptchaLoading?: Promise<void>;
    __zentaskRecaptchaOnload?: () => void;
  }
}

export type RecaptchaBoxHandle = {
  reset: () => void;
};

interface RecaptchaBoxProps {
  value: string;
  onChange: (token: string) => void;
  onReady?: (ready: boolean) => void;
  /**
   * Changes every time the parent switches between login/register.
   * A verified reCAPTCHA token is single-use and must not be reused for another form action.
   */
  resetKey?: string | number;
}

function hasRenderableRecaptcha() {
  return typeof window !== "undefined" && typeof window.grecaptcha?.render === "function";
}

function waitForRenderableRecaptcha(timeoutMs = 12000) {
  return new Promise<void>((resolve, reject) => {
    const startedAt = Date.now();

    const tick = () => {
      if (hasRenderableRecaptcha()) {
        resolve();
        return;
      }

      if (Date.now() - startedAt >= timeoutMs) {
        reject(new Error("reCAPTCHA đã tải nhưng chưa sẵn sàng hàm render."));
        return;
      }

      window.setTimeout(tick, 120);
    };

    tick();
  });
}

function removeWrongRecaptchaScript() {
  const existing = document.getElementById(RECAPTCHA_SCRIPT_ID) as HTMLScriptElement | null;
  if (!existing) return;

  const src = existing.getAttribute("src") || "";
  const isOurExplicitScript = src.includes("recaptcha/api.js") && src.includes("render=explicit");
  if (!isOurExplicitScript) existing.remove();
}

function loadRecaptchaScript() {
  if (hasRenderableRecaptcha()) return Promise.resolve();
  if (window.__zentaskRecaptchaLoading) return window.__zentaskRecaptchaLoading;

  window.__zentaskRecaptchaLoading = new Promise<void>((resolve, reject) => {
    removeWrongRecaptchaScript();

    const finish = () => {
      waitForRenderableRecaptcha()
        .then(resolve)
        .catch((error) => {
          window.__zentaskRecaptchaLoading = undefined;
          reject(error);
        });
    };

    (window as any)[RECAPTCHA_ONLOAD_NAME] = finish;

    const existing = document.getElementById(RECAPTCHA_SCRIPT_ID) as HTMLScriptElement | null;
    if (existing) {
      if (hasRenderableRecaptcha()) {
        resolve();
        return;
      }
      existing.addEventListener("load", finish, { once: true });
      existing.addEventListener(
        "error",
        () => {
          window.__zentaskRecaptchaLoading = undefined;
          reject(new Error("Không tải được reCAPTCHA"));
        },
        { once: true },
      );
      return;
    }

    const script = document.createElement("script");
    script.id = RECAPTCHA_SCRIPT_ID;
    script.src = `https://www.google.com/recaptcha/api.js?onload=${RECAPTCHA_ONLOAD_NAME}&render=explicit`;
    script.async = true;
    script.defer = true;
    script.onerror = () => {
      window.__zentaskRecaptchaLoading = undefined;
      reject(new Error("Không tải được reCAPTCHA"));
    };
    document.head.appendChild(script);
  });

  return window.__zentaskRecaptchaLoading;
}

export const RecaptchaBox = forwardRef<RecaptchaBoxHandle, RecaptchaBoxProps>(function RecaptchaBox(
  { value, onChange, onReady, resetKey },
  ref,
) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const widgetIdRef = useRef<number | null>(null);
  const [scriptError, setScriptError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const previousResetKeyRef = useRef<string | number | undefined>(resetKey);

  const isDisabledByEnv = !FRONTEND_RECAPTCHA_ENABLED;
  const devBypassToken = useMemo(() => (canUseDevBypass() ? "dev-recaptcha-bypass" : ""), []);

  const clearTokenAfterReset = useCallback(() => {
    // Important: when a real site key exists, switching Login/Register must clear the token.
    // reCAPTCHA tokens are action/session-bound and should not be reused across forms.
    // Dev bypass is only auto-applied when there is no site key or reCAPTCHA is disabled.
    if (isDisabledByEnv) {
      onChange("");
      return;
    }

    if (!SITE_KEY && devBypassToken) {
      onChange(devBypassToken);
      return;
    }

    onChange("");
  }, [devBypassToken, isDisabledByEnv, onChange]);

  const resetWidget = useCallback(() => {
    if (window.grecaptcha?.reset && widgetIdRef.current !== null) {
      try {
        window.grecaptcha.reset(widgetIdRef.current);
      } catch (error) {
        console.warn("Cannot reset reCAPTCHA widget:", error);
      }
    }
    clearTokenAfterReset();
  }, [clearTokenAfterReset]);

  useImperativeHandle(ref, () => ({
    reset: resetWidget,
  }));

  useEffect(() => {
    if (previousResetKeyRef.current === resetKey) return;
    previousResetKeyRef.current = resetKey;
    resetWidget();
    setScriptError("");
  }, [resetKey, resetWidget]);

  useEffect(() => {
    let cancelled = false;

    if (isDisabledByEnv) {
      onReady?.(true);
      onChange("");
      return undefined;
    }

    if (!SITE_KEY) {
      if (devBypassToken) {
        onChange(devBypassToken);
        onReady?.(true);
      } else {
        onReady?.(false);
      }
      return undefined;
    }

    setIsLoading(true);
    setScriptError("");
    onReady?.(false);

    loadRecaptchaScript()
      .then(() => {
        if (cancelled || !containerRef.current || widgetIdRef.current !== null) return;
        if (typeof window.grecaptcha?.render !== "function") {
          throw new Error("window.grecaptcha.render is not ready");
        }

        widgetIdRef.current = window.grecaptcha.render(containerRef.current, {
          sitekey: SITE_KEY,
          callback: (token: string) => onChange(token || ""),
          "expired-callback": () => onChange(""),
          "error-callback": () => onChange(""),
        });
        onReady?.(true);
      })
      .catch((error) => {
        if (cancelled) return;
        console.error("reCAPTCHA load/render error:", error);
        setScriptError("Không tải được reCAPTCHA. Hãy tắt ad blocker/VPN chặn Google hoặc dùng chế độ dev bypass khi chạy localhost.");
        const canBypassWithoutSiteKey = Boolean(devBypassToken) && !SITE_KEY;
        onReady?.(canBypassWithoutSiteKey);
        if (canBypassWithoutSiteKey) onChange(devBypassToken);
        else onChange("");
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [devBypassToken, isDisabledByEnv, onChange, onReady]);

  if (isDisabledByEnv) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
        <div className="flex gap-3">
          <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-slate-500" />
          <div>
            <p className="font-extrabold text-slate-800">reCAPTCHA đang tắt ở frontend</p>
            <p className="mt-1 leading-6">Đặt <code className="rounded bg-slate-100 px-1 font-bold">VITE_RECAPTCHA_ENABLED=true</code> khi đưa web lên production.</p>
          </div>
        </div>
      </div>
    );
  }

  if (!SITE_KEY) {
    return (
      <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
        <div className="flex gap-3">
          <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0" />
          <div>
            <p className="font-extrabold">Thiếu site key reCAPTCHA</p>
            <p className="mt-1 leading-6">
              Thêm <code className="rounded bg-amber-100 px-1 font-bold">VITE_RECAPTCHA_SITE_KEY</code> vào file <code className="rounded bg-amber-100 px-1 font-bold">frontend/.env</code>.
            </p>
            {devBypassToken && <p className="mt-2 font-bold text-emerald-700">Localhost dev: đang cho phép bỏ qua tạm để bạn test đăng nhập.</p>}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-3xl border border-slate-200 bg-slate-50/80 p-4 shadow-sm">
      <div className="mb-3 flex items-start gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-blue-100 text-blue-700">
          <ShieldCheck className="h-5 w-5" />
        </div>
        <div>
          <p className="text-sm font-black text-slate-900">Xác minh chống spam</p>
          <p className="mt-1 text-xs font-semibold leading-5 text-slate-500">
            Giúp ZenTask chặn bot tạo tài khoản và đăng nhập hàng loạt.
          </p>
        </div>
      </div>
      <div className="flex min-h-[78px] items-center justify-center overflow-hidden rounded-2xl bg-white p-2 ring-1 ring-slate-200">
        {isLoading && !value ? <span className="text-xs font-bold text-slate-500">Đang tải reCAPTCHA...</span> : null}
        <div ref={containerRef} className="origin-center scale-[0.88] sm:scale-100" />
      </div>
      {scriptError && <p className="mt-2 text-xs font-bold text-red-600">{scriptError}</p>}
      {value && <p className="mt-2 text-xs font-bold text-emerald-600">Đã xác minh reCAPTCHA.</p>}
    </div>
  );
});

export const hasRecaptchaSiteKey = FRONTEND_RECAPTCHA_ENABLED && (Boolean(SITE_KEY) || canUseDevBypass());