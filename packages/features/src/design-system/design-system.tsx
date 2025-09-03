"use client";

const palettes = {
  "Pea Green": [
    "oklch(0.503 0.092 130.0)",
    "oklch(0.559 0.103 130.0)",
    "oklch(0.615 0.113 130.0)",
    "oklch(0.671 0.123 130.0)",
    "oklch(0.727 0.133 130.0)",
    "oklch(0.782 0.144 130.0)",
    "oklch(0.838 0.154 130.0)",
    "oklch(0.894 0.164 130.0)",
    "oklch(0.950 0.081 130.0)",
  ],
  "Pea Purple": [
    "oklch(0.050 0.004 339.6)",
    "oklch(0.143 0.011 339.6)",
    "oklch(0.237 0.017 339.6)",
    "oklch(0.330 0.024 339.6)",
    "oklch(0.424 0.031 339.6)",
    "oklch(0.517 0.038 339.6)",
    "oklch(0.610 0.045 339.6)",
    "oklch(0.704 0.044 339.6)",
    "oklch(0.797 0.027 339.6)",
  ],
  Neutrals: [
    "oklch(0.271 0.019 96.0)",
    "oklch(0.356 0.025 96.0)",
    "oklch(0.441 0.031 96.0)",
    "oklch(0.526 0.037 96.0)",
    "oklch(0.611 0.043 96.0)",
    "oklch(0.695 0.049 96.0)",
    "oklch(0.780 0.055 96.0)",
    "oklch(0.865 0.061 96.0)",
    "oklch(0.950 0.029 96.0)",
  ],
  Greys: [
    "oklch(0.058 0.002 275.8)",
    "oklch(0.158 0.005 275.8)",
    "oklch(0.258 0.008 275.8)",
    "oklch(0.358 0.012 275.8)",
    "oklch(0.458 0.015 275.8)",
    "oklch(0.558 0.013 275.8)",
    "oklch(0.658 0.009 275.8)",
    "oklch(0.758 0.006 275.8)",
    "oklch(0.858 0.004 275.8)",
  ],
};

export function DesignSystem() {
  return (
    <div style={{ padding: "1rem", fontFamily: "sans-serif" }}>
      {Object.entries(palettes).map(([name, colors]) => (
        <div key={name} style={{ marginBottom: "2rem" }}>
          <h3>{name}</h3>
          <div style={{ display: "flex", gap: "0.5rem" }}>
            {colors.map((c, i) => (
              <div
                key={i}
                style={{
                  background: c,
                  width: "60px",
                  height: "60px",
                  borderRadius: "4px",
                }}
                title={c}
              />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

export default DesignSystem;
