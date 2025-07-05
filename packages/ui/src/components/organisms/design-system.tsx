"use client";
import { useEffect, useState } from "react";

// Helper to get CSS variable value
const getVar = (name: string) => `var(${name})`;

function useCSSVar(varName: string, fallback: number = 16) {
  const [value, setValue] = useState<number>(fallback);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const v = getComputedStyle(document.documentElement).getPropertyValue(
        varName
      );
      setValue(Number(v) || fallback);
    }
  }, [varName, fallback]);

  return value;
}

const colorGroups = [
  {
    name: "Primary",
    prefix: "--color-primary",
    shades: [
      "50",
      "100",
      "200",
      "300",
      "400",
      "500",
      "600",
      "700",
      "800",
      "900",
      "950",
      "",
    ],
    foreground: "--color-primary-foreground",
  },
  {
    name: "Secondary",
    prefix: "--color-secondary",
    shades: [
      "50",
      "100",
      "200",
      "300",
      "400",
      "500",
      "600",
      "700",
      "800",
      "900",
      "950",
      "",
    ],
    foreground: "--color-secondary-foreground",
  },
  {
    name: "Destructive",
    prefix: "--color-destructive",
    shades: [""],
    foreground: "--color-destructive-foreground",
  },
  {
    name: "Muted",
    prefix: "--color-muted",
    shades: [""],
    foreground: "--color-muted-foreground",
  },
  {
    name: "Accent",
    prefix: "--color-accent",
    shades: [""],
    foreground: "--color-accent-foreground",
  },
  {
    name: "Popover",
    prefix: "--color-popover",
    shades: [""],
    foreground: "--color-popover-foreground",
  },
  {
    name: "Card",
    prefix: "--color-card",
    shades: [""],
    foreground: "--color-card-foreground",
  },
];

const spacingKeys = [
  0, 1, 2, 3, 4, 5, 6, 8, 10, 12, 16, 20, 24, 32, 40, 48, 56, 64, 72, 80, 96,
];

const fontSizes = [
  "xs",
  "sm",
  "base",
  "lg",
  "xl",
  "2xl",
  "3xl",
  "4xl",
  "5xl",
  "6xl",
  "7xl",
  "8xl",
  "9xl",
];

const fontWeights = [
  "thin",
  "extralight",
  "light",
  "normal",
  "medium",
  "semibold",
  "bold",
  "extrabold",
  "black",
];

const breakpoints = ["sm", "md", "lg", "xl", "2xl"];

const shadows = ["sm", "md", "lg", "xl", "2xl", "inner", "none"];

export function DesignSystem() {
  return (
    <div className="font-sans p-8">
      <h1 className="text-3xl font-bold mb-8">Design System Tokens</h1>

      {/* Colors */}
      <section className="mb-12">
        <h2 className="text-2xl font-semibold mb-4">Colors</h2>
        {colorGroups.map((group) => (
          <div key={group.name} className="mb-6">
            <h3 className="font-semibold mb-2">{group.name}</h3>
            <div className="flex flex-wrap gap-2">
              {group.shades.map((shade) => {
                const varName = group.prefix + (shade ? `-${shade}` : "");
                return (
                  <div key={varName} className="text-center">
                    <div
                      className="w-12 h-12 rounded border mb-1"
                      style={{
                        background: getVar(varName),
                        borderColor: "#ccc",
                      }}
                    />
                    <div className="text-xs">{varName}</div>
                  </div>
                );
              })}
              {group.foreground && (
                <div className="text-center">
                  <div
                    className="w-12 h-12 rounded border mb-1"
                    style={{
                      background: getVar(group.foreground),
                      borderColor: "#ccc",
                    }}
                  />
                  <div className="text-xs">{group.foreground}</div>
                </div>
              )}
            </div>
          </div>
        ))}
      </section>

      {/* Typography */}
      <section className="mb-12">
        <h2 className="text-2xl font-semibold mb-4">Typography</h2>
        <div className="mb-6">
          <h3 className="font-semibold mb-2">Font Sizes</h3>
          <div className="flex flex-wrap gap-4">
            {fontSizes.map((size) => (
              <div key={size} className="text-center">
                <div
                  className="border p-2 min-w-[60px] mb-1"
                  style={{
                    fontSize: getVar(`--font-size-${size}`),
                    borderColor: "#eee",
                  }}
                >
                  Aa
                </div>
                <div className="text-xs">{`--font-size-${size}`}</div>
              </div>
            ))}
          </div>
        </div>
        <div className="mb-6">
          <h3 className="font-semibold mb-2">Font Weights</h3>
          <div className="flex flex-wrap gap-4">
            {fontWeights.map((weight) => (
              <div key={weight} className="text-center">
                <div
                  className="border p-2 min-w-[60px] mb-1"
                  style={{
                    fontWeight: `var(--font-weight-${weight})`,
                    borderColor: "#eee",
                  }}
                >
                  Aa
                </div>
                <div className="text-xs">{`--font-weight-${weight}`}</div>
              </div>
            ))}
          </div>
        </div>
        <div>
          <h3 className="font-semibold mb-2">Font Families</h3>
          <div className="flex gap-4">
            <div style={{ fontFamily: getVar("--font-family-sans") }}>
              <div className="border p-2 mb-1" style={{ borderColor: "#eee" }}>
                Sans
              </div>
              <div className="text-xs">--font-family-sans</div>
            </div>
            <div style={{ fontFamily: getVar("--font-family-mono") }}>
              <div className="border p-2 mb-1" style={{ borderColor: "#eee" }}>
                Mono
              </div>
              <div className="text-xs">--font-family-mono</div>
            </div>
          </div>
        </div>
      </section>

      {/* Spacing */}
      <section className="mb-12">
        <h2 className="text-2xl font-semibold mb-4">Spacing</h2>
        <div className="flex flex-wrap gap-2">
          {spacingKeys.map((key) => {
            const height = useCSSVar(`--spacing-${key}`, 16);
            return (
              <div key={key} className="text-center">
                <div
                  className="w-8 rounded mx-auto mb-1"
                  style={{ height, background: "#eee" }}
                />
                <div className="text-xs">{`--spacing-${key}`}</div>
              </div>
            );
          })}
        </div>
      </section>

      {/* Breakpoints */}
      <section className="mb-12">
        <h2 className="text-2xl font-semibold mb-4">Breakpoints</h2>
        <div className="flex gap-4">
          {breakpoints.map((bp) => (
            <div key={bp} className="text-center">
              <div
                className="w-20 h-10 flex items-center justify-center border mb-1 bg-gray-100"
                style={{ fontSize: 14, borderColor: "#ccc" }}
              >
                {getVar(`--breakpoint-${bp}`)}
              </div>
              <div className="text-xs">{`--breakpoint-${bp}`}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Shadows */}
      <section className="mb-12">
        <h2 className="text-2xl font-semibold mb-4">Shadows</h2>
        <div className="flex flex-wrap gap-4">
          {shadows.map((shadow) => (
            <div key={shadow} className="text-center">
              <div
                className="w-16 h-8 bg-white border mb-1"
                style={{
                  boxShadow: getVar(`--shadow-${shadow}`),
                  borderColor: "#eee",
                }}
              />
              <div className="text-xs">{`--shadow-${shadow}`}</div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

export default DesignSystem;
