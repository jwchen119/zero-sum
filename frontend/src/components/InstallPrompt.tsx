"use client";

import { useEffect, useState, useCallback } from "react";
import Image from "next/image";

// Key used in sessionStorage — dismissed only for this browsing session,
// so the banner reappears on the next visit.
const DISMISSED_KEY = "pwa-install-dismissed";

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

function isStandalone(): boolean {
  if (typeof window === "undefined") return false;
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    (window.navigator as unknown as { standalone?: boolean }).standalone === true
  );
}

function isIOS(): boolean {
  if (typeof navigator === "undefined") return false;
  return /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as unknown as { MSStream?: unknown }).MSStream;
}

function isAndroid(): boolean {
  if (typeof navigator === "undefined") return false;
  return /Android/.test(navigator.userAgent);
}

/** True for phones & tablets only — excludes laptops / desktops. */
function isMobileOrTablet(): boolean {
  if (typeof navigator === "undefined") return false;
  const ua = navigator.userAgent;
  // Covers phones, iPods, Android phones/tablets, iPads (old UA), and
  // modern iPads that report as "Macintosh" but have a touch screen.
  if (/Mobi|Android|iPhone|iPod|iPad|tablet/i.test(ua)) return true;
  // iPad on iOS 13+ sends a Mac-like UA; detect via touch + platform.
  if (/Macintosh/i.test(ua) && navigator.maxTouchPoints > 1) return true;
  return false;
}

function getInitialState() {
  if (typeof window === "undefined") return { show: false, ios: false };
  if (isStandalone()) return { show: false, ios: false };
  if (sessionStorage.getItem(DISMISSED_KEY)) return { show: false, ios: false };
  if (!isMobileOrTablet()) return { show: false, ios: false };
  const ios = isIOS();
  return { show: ios, ios };
}

export default function InstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const initial = getInitialState();
  const [showBanner, setShowBanner] = useState(initial.show);
  const [showIOSGuide] = useState(initial.ios);

  useEffect(() => {
    if (isStandalone()) return;
    if (sessionStorage.getItem(DISMISSED_KEY)) return;
    if (!isMobileOrTablet()) return; // skip laptops / desktops
    if (isIOS()) return; // already handled via initial state

    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setShowBanner(true);
    };

    window.addEventListener("beforeinstallprompt", handler);

    // For Android browsers that don't fire beforeinstallprompt, still show a hint
    const timeout = setTimeout(() => {
      if (isAndroid()) {
        setShowBanner(true);
      }
    }, 3000);

    return () => {
      window.removeEventListener("beforeinstallprompt", handler);
      clearTimeout(timeout);
    };
  }, []);

  const handleInstall = useCallback(async () => {
    if (!deferredPrompt) return;
    await deferredPrompt.prompt();
    const choice = await deferredPrompt.userChoice;
    if (choice.outcome === "accepted") {
      setShowBanner(false);
    }
    setDeferredPrompt(null);
  }, [deferredPrompt]);

  const handleDismiss = useCallback(() => {
    setShowBanner(false);
    // Only suppress for this session — it will reappear on the next visit
    sessionStorage.setItem(DISMISSED_KEY, "1");
  }, []);

  if (!showBanner) return null;

  return (
    <div
      style={{
        position: "fixed",
        bottom: 0,
        left: 0,
        right: 0,
        zIndex: 99999,
        background: "linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)",
        borderTop: "2px solid #c9a84c",
        padding: "16px 20px",
        display: "flex",
        alignItems: "center",
        gap: "14px",
        boxShadow: "0 -4px 24px rgba(0,0,0,0.4)",
        fontFamily: "system-ui, -apple-system, sans-serif",
        animation: "pwa-slide-up 0.35s ease-out",
      }}
    >
      <style>{`
        @keyframes pwa-slide-up {
          from { transform: translateY(100%); opacity: 0; }
          to   { transform: translateY(0);    opacity: 1; }
        }
      `}</style>

      {/* App icon */}
      <Image
        src="/icons/icon-96x96.png"
        alt="Zero Sum"
        width={48}
        height={48}
        style={{ borderRadius: 10, flexShrink: 0 }}
      />

      {/* Text */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div
          style={{
            color: "#c9a84c",
            fontWeight: 700,
            fontSize: 15,
            lineHeight: 1.3,
          }}
        >
          Install Zero Sum
        </div>

        {showIOSGuide ? (
          <div style={{ color: "#a0a0b8", fontSize: 13, marginTop: 2, lineHeight: 1.4 }}>
            Tap{" "}
            <span style={{ display: "inline-block", verticalAlign: "middle" }}>
              {/* iOS share icon (simple SVG) */}
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#4d9eff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ verticalAlign: "middle" }}>
                <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8" />
                <polyline points="16 6 12 2 8 6" />
                <line x1="12" y1="2" x2="12" y2="15" />
              </svg>
            </span>{" "}
            then <strong style={{ color: "#e8e8f0" }}>&quot;Add to Home Screen&quot;</strong>
          </div>
        ) : (
          <div style={{ color: "#a0a0b8", fontSize: 13, marginTop: 2 }}>
            Get real-time stocks on your home screen
          </div>
        )}
      </div>

      {/* Action buttons */}
      <div style={{ display: "flex", gap: 8, flexShrink: 0 }}>
        {deferredPrompt && (
          <button
            onClick={handleInstall}
            style={{
              background: "#c9a84c",
              color: "#1a1a2e",
              border: "none",
              borderRadius: 8,
              padding: "10px 18px",
              fontWeight: 700,
              fontSize: 14,
              cursor: "pointer",
              whiteSpace: "nowrap",
            }}
          >
            Install
          </button>
        )}
        <button
          onClick={handleDismiss}
          aria-label="Dismiss install banner"
          style={{
            background: "transparent",
            border: "1px solid rgba(201,168,76,0.3)",
            borderRadius: 8,
            color: "#a0a0b8",
            padding: "10px 12px",
            fontSize: 14,
            cursor: "pointer",
            whiteSpace: "nowrap",
          }}
        >
          ✕
        </button>
      </div>
    </div>
  );
}
