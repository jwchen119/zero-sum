"use client";

/**
 * App Badge API — shows a count on the PWA icon (e.g. number of triggered alerts).
 * Supported on Android (Chrome 81+), iOS (Safari 16.4+), macOS, Windows.
 */

export function setAppBadge(count: number): void {
  if (typeof navigator === "undefined") return;
  if ("setAppBadge" in navigator) {
    (navigator as Navigator & { setAppBadge: (n?: number) => Promise<void> })
      .setAppBadge(count)
      .catch(() => {});
  }
}

export function clearAppBadge(): void {
  if (typeof navigator === "undefined") return;
  if ("clearAppBadge" in navigator) {
    (navigator as Navigator & { clearAppBadge: () => Promise<void> })
      .clearAppBadge()
      .catch(() => {});
  }
}
