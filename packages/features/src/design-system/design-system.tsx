"use client";

import { colors } from "@peas/theme";

const palettes = {
  Primary: [
    colors.primary[900],
    colors.primary[800],
    colors.primary[700],
    colors.primary[600],
    colors.primary[500],
    colors.primary[400],
    colors.primary[300],
    colors.primary[200],
    colors.primary[100],
    colors.primary[50],
  ],
  Secondary: [
    colors.secondary[900],
    colors.secondary[800],
    colors.secondary[700],
    colors.secondary[600],
    colors.secondary[500],
    colors.secondary[400],
    colors.secondary[300],
    colors.secondary[200],
    colors.secondary[100],
    colors.secondary[50],
  ],
  Success: [
    colors.success[900],
    colors.success[800],
    colors.success[700],
    colors.success[600],
    colors.success[500],
    colors.success[400],
    colors.success[300],
    colors.success[200],
    colors.success[100],
    colors.success[50],
  ],
  Warning: [
    colors.warning[900],
    colors.warning[800],
    colors.warning[700],
    colors.warning[600],
    colors.warning[500],
    colors.warning[400],
    colors.warning[300],
    colors.warning[200],
    colors.warning[100],
    colors.warning[50],
  ],
  Error: [
    colors.error[900],
    colors.error[800],
    colors.error[700],
    colors.error[600],
    colors.error[500],
    colors.error[400],
    colors.error[300],
    colors.error[200],
    colors.error[100],
    colors.error[50],
  ],
  Info: [
    colors.info[900],
    colors.info[800],
    colors.info[700],
    colors.info[600],
    colors.info[500],
    colors.info[400],
    colors.info[300],
    colors.info[200],
    colors.info[100],
    colors.info[50],
  ],
  Neutrals: [
    colors.neutrals[900],
    colors.neutrals[800],
    colors.neutrals[700],
    colors.neutrals[600],
    colors.neutrals[500],
    colors.neutrals[400],
    colors.neutrals[300],
    colors.neutrals[200],
    colors.neutrals[100],
    colors.neutrals[50],
  ],
  Greyscale: [
    colors.greyscale[900],
    colors.greyscale[800],
    colors.greyscale[700],
    colors.greyscale[600],
    colors.greyscale[500],
    colors.greyscale[400],
    colors.greyscale[300],
    colors.greyscale[200],
    colors.greyscale[100],
    colors.greyscale[50],
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
