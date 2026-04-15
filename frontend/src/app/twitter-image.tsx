import { ImageResponse } from "next/og";

export const runtime = "edge";
export const alt = "Zero Sum Times — Stock Analytics & Market Data";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          background: "linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)",
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          fontFamily: "serif",
          position: "relative",
        }}
      >
        <div
          style={{
            position: "absolute",
            top: 40,
            left: 60,
            right: 60,
            height: 3,
            background: "#c9a96e",
          }}
        />
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: 16,
          }}
        >
          <div
            style={{
              fontSize: 72,
              fontWeight: 700,
              color: "#f5f0e8",
              letterSpacing: "-1px",
              textAlign: "center",
            }}
          >
            The Zero Sum Times
          </div>
          <div style={{ width: 120, height: 2, background: "#c9a96e" }} />
          <div
            style={{
              fontSize: 28,
              color: "#c9a96e",
              letterSpacing: "4px",
              textTransform: "uppercase",
              textAlign: "center",
            }}
          >
            Stock Analytics & Market Data
          </div>
        </div>
        <div
          style={{
            position: "absolute",
            bottom: 40,
            left: 60,
            right: 60,
            height: 3,
            background: "#c9a96e",
          }}
        />
      </div>
    ),
    { ...size }
  );
}
