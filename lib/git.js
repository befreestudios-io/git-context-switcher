/**
 * Thin wrapper around the git executable. Every read and write of git config
 * goes through here so git itself does all parsing and serialization.
 */
import { execFile } from "node:child_process";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

/** Minimum git version for `hasconfig:remote.*.url:` conditional includes. */
export const MIN_GIT_VERSION = [2, 36, 0];

export class GitError extends Error {
  /**
   * @param {string} message
   * @param {number | undefined} [exitCode]
   */
  constructor(message, exitCode) {
    super(message);
    this.name = "GitError";
    this.exitCode = exitCode;
  }
}

/**
 * Run git with an argument vector (never through a shell).
 * @param {string[]} args
 * @param {{ cwd?: string }} [options]
 * @returns {Promise<string>} stdout
 */
export async function git(args, { cwd } = {}) {
  try {
    const { stdout } = await execFileAsync("git", args, {
      cwd,
      maxBuffer: 32 * 1024 * 1024,
    });
    return stdout;
  } catch (error) {
    const err = /** @type {NodeJS.ErrnoException & { stderr?: string, code?: unknown }} */ (error);
    if (err.code === "ENOENT") {
      throw new GitError("git isn't installed or isn't on your PATH.");
    }
    const exitCode = typeof err.code === "number" ? err.code : undefined;
    throw new GitError(err.stderr?.trim() || err.message, exitCode);
  }
}

/**
 * Like {@link git}, but returns null when git exits with one of the given codes
 * (e.g. exit 1 from `git config --get` means "key not set").
 * @param {string[]} args
 * @param {{ cwd?: string, okCodes?: number[] }} [options]
 * @returns {Promise<string | null>}
 */
export async function gitOrNull(args, { cwd, okCodes = [1] } = {}) {
  try {
    return await git(args, { cwd });
  } catch (error) {
    if (error instanceof GitError && error.exitCode !== undefined && okCodes.includes(error.exitCode)) {
      return null;
    }
    throw error;
  }
}

/**
 * @returns {Promise<number[]>} [major, minor, patch]
 */
export async function gitVersion() {
  const out = await git(["--version"]);
  const match = out.match(/(\d+)\.(\d+)(?:\.(\d+))?/);
  if (!match) throw new GitError(`Couldn't parse git version from: ${out.trim()}`);
  return [Number(match[1]), Number(match[2]), Number(match[3] ?? 0)];
}

/**
 * @param {number[]} version
 * @param {number[]} [min]
 */
export function versionAtLeast(version, min = MIN_GIT_VERSION) {
  for (let i = 0; i < min.length; i++) {
    const a = version[i] ?? 0;
    const b = min[i] ?? 0;
    if (a !== b) return a > b;
  }
  return true;
}

/**
 * Where a git config command should read/write.
 * @typedef {{ global: true } | { file: string } | { cwd: string } | {}} ConfigScope
 */

/**
 * @param {ConfigScope} scope
 * @returns {{ args: string[], cwd?: string }}
 */
function scopeArgs(scope) {
  if ("global" in scope) return { args: ["--global"] };
  if ("file" in scope) return { args: ["--file", scope.file] };
  if ("cwd" in scope) return { args: [], cwd: scope.cwd };
  return { args: [] };
}

/**
 * @typedef {{ key: string, value: string }} ConfigEntry
 */

/**
 * Parse `git config -z --list` / `--get-regexp` output ("key\nvalue\0").
 * @param {string} out
 * @returns {ConfigEntry[]}
 */
function parseEntries(out) {
  return out
    .split("\0")
    .filter(Boolean)
    .map((record) => {
      const nl = record.indexOf("\n");
      return nl === -1
        ? { key: record, value: "" }
        : { key: record.slice(0, nl), value: record.slice(nl + 1) };
    });
}

/**
 * All entries in a scope, in file order.
 * @param {ConfigScope} scope
 * @returns {Promise<ConfigEntry[]>}
 */
export async function listConfig(scope) {
  const { args, cwd } = scopeArgs(scope);
  // Exit 1 happens when the file doesn't exist yet.
  const out = await gitOrNull(["config", ...args, "-z", "--list"], { cwd });
  return out ? parseEntries(out) : [];
}

/**
 * Entries whose key matches a regex.
 * @param {ConfigScope} scope
 * @param {string} keyRegex
 * @returns {Promise<ConfigEntry[]>}
 */
export async function getConfigRegexp(scope, keyRegex) {
  const { args, cwd } = scopeArgs(scope);
  const out = await gitOrNull(["config", ...args, "-z", "--get-regexp", keyRegex], { cwd });
  return out ? parseEntries(out) : [];
}

/**
 * Last value of a key, or null when unset.
 * @param {ConfigScope} scope
 * @param {string} key
 * @returns {Promise<string | null>}
 */
export async function getConfig(scope, key) {
  const { args, cwd } = scopeArgs(scope);
  const out = await gitOrNull(["config", ...args, "-z", "--get", key], { cwd });
  return out === null ? null : out.replace(/\0$/, "");
}

/**
 * Effective value of a key plus the file it came from.
 * @param {string} cwd
 * @param {string} key
 * @returns {Promise<{ value: string, origin: string } | null>}
 */
export async function getConfigWithOrigin(cwd, key) {
  const out = await gitOrNull(["config", "--show-origin", "-z", "--get", key], { cwd });
  if (out === null) return null;
  const [origin = "", value = ""] = out.split("\0");
  return { value, origin: origin.replace(/^file:/, "") };
}

/**
 * Set a key, replacing every existing value.
 * @param {ConfigScope} scope
 * @param {string} key
 * @param {string} value
 */
export async function setConfig(scope, key, value) {
  const { args, cwd } = scopeArgs(scope);
  await git(["config", ...args, "--replace-all", key, value], { cwd });
}

/**
 * Append a value to a (possibly multi-valued) key.
 * @param {ConfigScope} scope
 * @param {string} key
 * @param {string} value
 */
export async function addConfig(scope, key, value) {
  const { args, cwd } = scopeArgs(scope);
  await git(["config", ...args, "--add", key, value], { cwd });
}

/**
 * Remove a key. When `value` is given, only entries with exactly that value go.
 * A key that doesn't exist is not an error.
 * @param {ConfigScope} scope
 * @param {string} key
 * @param {string} [value]
 */
export async function unsetConfig(scope, key, value) {
  const { args, cwd } = scopeArgs(scope);
  const tail = value === undefined ? [key] : ["--fixed-value", key, value];
  // Exit 5: nothing matched.
  await gitOrNull(["config", ...args, "--unset-all", ...tail], { cwd, okCodes: [5] });
}

/**
 * @param {string} cwd
 * @returns {Promise<boolean>}
 */
export async function isInsideRepo(cwd) {
  const out = await gitOrNull(["rev-parse", "--is-inside-work-tree"], { cwd, okCodes: [128] });
  return out?.trim() === "true";
}

/**
 * Git's canonical key form: section and name lowercased, subsection kept.
 * @param {string} key
 */
export function canonicalKey(key) {
  const first = key.indexOf(".");
  const last = key.lastIndexOf(".");
  if (first === -1 || first === last) return key.toLowerCase();
  return `${key.slice(0, first).toLowerCase()}${key.slice(first, last)}${key.slice(last).toLowerCase()}`;
}
