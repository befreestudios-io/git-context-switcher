/**
 * Terminal output. Colors come from util.styleText, which drops them
 * automatically when the stream isn't a TTY or NO_COLOR is set.
 */
import { styleText } from "node:util";

/** @typedef {Parameters<typeof styleText>[0]} Format */

/**
 * @param {Format} format
 * @param {string} text
 * @param {NodeJS.WriteStream} [stream]
 */
export const paint = (format, text, stream = process.stdout) => styleText(format, text, { stream });

/** @param {string} [text] */
export const say = (text = "") => console.log(text);
/** @param {string} text */
export const heading = (text) => say(paint("bold", text));
/** @param {string} text */
export const ok = (text) => say(`${paint("green", "✔")} ${text}`);
/** @param {string} text */
export const info = (text) => say(`${paint("cyan", "ℹ")} ${text}`);
/** @param {string} text */
export const warn = (text) => say(`${paint("yellow", "⚠")} ${text}`);
/** @param {string} text */
export const dim = (text) => paint("dim", text);
/** @param {string} text */
export const error = (text) => console.error(`${paint("red", "✖", process.stderr)} ${text}`);

/** @param {unknown} value */
export const printJson = (value) => say(JSON.stringify(value, null, 2));

/**
 * Two-column rows with the label column padded.
 * @param {[string, string][]} rows
 */
export function table(rows) {
  const width = Math.max(0, ...rows.map(([label]) => label.length));
  for (const [label, value] of rows) say(`  ${dim(label.padEnd(width))}  ${value}`);
}

export const isInteractive = () => Boolean(process.stdin.isTTY && process.stdout.isTTY);

/** Loaded lazily so non-interactive runs never pay for it. */
export const prompts = () => import("@inquirer/prompts");
