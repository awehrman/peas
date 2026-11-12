import type { Rational } from "../ast/types.js";

function gcd(a: number, b: number): number {
  let x = Math.abs(a);
  let y = Math.abs(b);
  while (y !== 0) {
    [x, y] = [y, x % y];
  }
  return x || 1;
}

export function rational(numerator: number, denominator = 1): Rational {
  if (!Number.isInteger(numerator) || !Number.isInteger(denominator)) {
    throw new Error(`Rational parts must be integers: ${numerator}/${denominator}`);
  }
  if (denominator === 0) {
    throw new Error("Rational denominator cannot be zero");
  }
  const sign = denominator < 0 ? -1 : 1;
  const divisor = gcd(numerator, denominator);
  return {
    numerator: (sign * numerator) / divisor || 0,
    denominator: (sign * denominator) / divisor,
  };
}

export function addRational(a: Rational, b: Rational): Rational {
  return rational(
    a.numerator * b.denominator + b.numerator * a.denominator,
    a.denominator * b.denominator
  );
}

export function multiplyRational(a: Rational, b: Rational): Rational {
  return rational(a.numerator * b.numerator, a.denominator * b.denominator);
}

export function rationalToNumber(value: Rational): number {
  return value.numerator / value.denominator;
}

/** Parses "3", "1.5", "1,5" (decimal comma), "1/2" and "1 1/2" exactly. */
export function parseRational(text: string): Rational {
  const trimmed = text.trim();

  const mixed = /^(\d+)[ -](\d+)\/(\d+)$/.exec(trimmed);
  if (mixed) {
    const [, whole, numerator, denominator] = mixed;
    return addRational(
      rational(Number(whole)),
      rational(Number(numerator), Number(denominator))
    );
  }

  const fraction = /^(\d+)\/(\d+)$/.exec(trimmed);
  if (fraction) {
    return rational(Number(fraction[1]), Number(fraction[2]));
  }

  const decimal = /^(\d*)[.,](\d+)$/.exec(trimmed);
  if (decimal) {
    const [, whole = "", fractional = ""] = decimal;
    const scale = 10 ** fractional.length;
    return rational(Number(whole || "0") * scale + Number(fractional), scale);
  }

  if (/^\d+$/.test(trimmed)) {
    return rational(Number(trimmed));
  }

  throw new Error(`Not a number: "${text}"`);
}

/** "3/2" becomes "1 1/2"; whole numbers print without a fraction. */
export function formatRational(value: Rational): string {
  const { numerator, denominator } = value;
  if (denominator === 1) return String(numerator);
  const whole = Math.trunc(numerator / denominator);
  const remainder = Math.abs(numerator % denominator);
  return whole === 0
    ? `${numerator}/${denominator}`
    : `${whole} ${remainder}/${denominator}`;
}
