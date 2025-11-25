/**
 * Utility functions for decimal arithmetic to avoid floating point precision issues
 */

export function add(...values: (string | number)[]): string {
  const sum = values.reduce((acc, val) => acc + parseFloat(val.toString()), 0);
  return sum.toFixed(4);
}

export function subtract(a: string | number, b: string | number): string {
  const result = parseFloat(a.toString()) - parseFloat(b.toString());
  return result.toFixed(4);
}

export function multiply(a: string | number, b: string | number): string {
  const result = parseFloat(a.toString()) * parseFloat(b.toString());
  return result.toFixed(4);
}

export function isEqual(a: string | number, b: string | number): boolean {
  return parseFloat(a.toString()).toFixed(4) === parseFloat(b.toString()).toFixed(4);
}

export function isGreaterThan(a: string | number, b: string | number): boolean {
  return parseFloat(a.toString()) > parseFloat(b.toString());
}

export function isZero(value: string | number): boolean {
  return parseFloat(value.toString()) === 0;
}
