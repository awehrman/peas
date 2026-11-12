/**
 * Utility functions for color manipulation
 */
/**
 * Darkens a hex color by a given percentage
 */
export function darkenHexColor(hex, percent) {
    // Remove # if present
    hex = hex.replace(/^#/, "");
    if (hex.length === 3) {
        hex = hex
            .split("")
            .map((x) => x + x)
            .join("");
    }
    const num = parseInt(hex, 16);
    let r = (num >> 16) & 0xff;
    let g = (num >> 8) & 0xff;
    let b = num & 0xff;
    r = Math.max(0, Math.min(255, Math.floor(r * (1 - percent))));
    g = Math.max(0, Math.min(255, Math.floor(g * (1 - percent))));
    b = Math.max(0, Math.min(255, Math.floor(b * (1 - percent))));
    return `#${((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1)}`;
}
/**
 * WCAG relative luminance of a hex color, from 0 (black) to 1 (white)
 */
export function getRelativeLuminance(hex) {
    hex = hex.replace(/^#/, "");
    if (hex.length === 3) {
        hex = hex
            .split("")
            .map((x) => x + x)
            .join("");
    }
    const num = parseInt(hex, 16);
    const [r, g, b] = [(num >> 16) & 0xff, (num >> 8) & 0xff, num & 0xff].map((channel) => {
        const value = channel / 255;
        return value <= 0.03928
            ? value / 12.92
            : ((value + 0.055) / 1.055) ** 2.4;
    });
    return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}
/**
 * Pale colors where lightened details wash out against the base
 */
export function isLightColor(hex) {
    return getRelativeLuminance(hex) > 0.55;
}
/**
 * Lightens a hex color by a given percentage
 */
export function lightenHexColor(hex, percent) {
    hex = hex.replace(/^#/, "");
    if (hex.length === 3) {
        hex = hex
            .split("")
            .map((x) => x + x)
            .join("");
    }
    const num = parseInt(hex, 16);
    let r = (num >> 16) & 0xff;
    let g = (num >> 8) & 0xff;
    let b = num & 0xff;
    r = Math.min(255, Math.floor(r + (255 - r) * percent));
    g = Math.min(255, Math.floor(g + (255 - g) * percent));
    b = Math.min(255, Math.floor(b + (255 - b) * percent));
    return `#${((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1)}`;
}
