/**
 * Translate user-friendly directory and remote patterns to/from git
 * `includeIf` conditions. Pure functions: no git or filesystem access.
 */
import path from "node:path";
import { home, tildify } from "./paths.js";

const REMOTE_PREFIX = "hasconfig:remote.*.url:";

/**
 * Characters git can't round-trip in a config subsection, plus shell/glob
 * metacharacters that have no business in a path or host pattern.
 * @param {string} value
 */
function assertSafe(value) {
  if (/[\n\r"\\\0]/.test(value)) {
    throw new Error(`Pattern contains an unsupported character: ${JSON.stringify(value)}`);
  }
}

/**
 * `~/work`, `./work`, `/abs/work` → `gitdir:~/work/`
 *
 * A trailing slash matters: git treats `gitdir:~/work/` as "anything under
 * ~/work" but `gitdir:~/work` as "exactly the repo at ~/work".
 * @param {string} input
 * @param {string} [cwd]
 * @returns {string}
 */
export function dirCondition(input, cwd = process.cwd()) {
  let p = input.trim().replace(/\\/g, "/");
  if (!p) throw new Error("Directory pattern is empty");
  assertSafe(p);

  if (p === "~" || p.startsWith("~/")) {
    // Keep ~ so the config stays portable across machines.
  } else if (p.startsWith("**/")) {
    // Already a git glob.
  } else {
    p = tildify(path.resolve(cwd, p)).replace(/\\/g, "/");
  }

  if (p === "~") p = "~/";
  if (!p.endsWith("/") && !p.endsWith("**")) p += "/";
  return `gitdir:${p}`;
}

/**
 * Normalize a remote pattern the user typed into `host/path-glob`.
 * Accepts `github.com/acme`, `https://github.com/acme`, `git@github.com:acme`.
 * @param {string} input
 * @returns {{ host: string, path: string }}
 */
export function parseRemotePattern(input) {
  let s = input.trim();
  assertSafe(s);
  s = s.replace(/^[a-z][a-z0-9+.-]*:\/\//i, ""); // scheme
  s = s.replace(/^[^@/]+@/, ""); // user@
  s = s.replace(/^([^/:]+):(?!\d+\/)/, "$1/"); // scp-style host:path
  s = s.replace(/\.git$/, "").replace(/\/+$/, "");

  const slash = s.indexOf("/");
  const host = slash === -1 ? s : s.slice(0, slash);
  const rest = slash === -1 ? "" : s.slice(slash + 1);
  if (!/^[\w.*-]+(:\d+)?$/.test(host)) {
    throw new Error(`Couldn't find a host in remote pattern "${input}" (try e.g. github.com/your-org)`);
  }
  return { host, path: rest };
}

/**
 * `github.com/acme` → three `hasconfig:remote.*.url:` conditions covering
 * https/ssh URLs with and without a user, and scp-style `git@host:path`.
 *
 * A pattern that doesn't end in a wildcard matches everything below it.
 * @param {string} input
 * @returns {string[]}
 */
export function remoteConditions(input) {
  const { host, path: p } = parseRemotePattern(input);
  let glob = p === "" ? "**" : p;
  if (!glob.endsWith("*")) glob += "/**";
  return [
    `${REMOTE_PREFIX}*://${host}/${glob}`,
    `${REMOTE_PREFIX}*://*@${host}/${glob}`,
    `${REMOTE_PREFIX}*@${host}:${glob}`,
  ];
}

/**
 * @typedef {{ kind: "dir" | "remote" | "other", label: string }} ConditionInfo
 */

/**
 * Turn a raw condition back into something readable. The three conditions
 * produced by {@link remoteConditions} all describe to the same label.
 * @param {string} condition
 * @returns {ConditionInfo}
 */
export function describeCondition(condition) {
  const dir = condition.match(/^gitdir(?:\/i)?:(.*)$/);
  if (dir) return { kind: "dir", label: dir[1] };

  if (condition.startsWith(REMOTE_PREFIX)) {
    const url = condition.slice(REMOTE_PREFIX.length);
    const m = url.match(/^\*:\/\/(?:\*@)?([^/]+)\/(.*)$/) || url.match(/^\*@([^:/]+):(.*)$/);
    if (m) {
      const tail = m[2] === "**" ? "" : m[2].replace(/\/\*\*$/, "");
      return { kind: "remote", label: tail ? `${m[1]}/${tail}` : m[1] };
    }
    return { kind: "remote", label: url };
  }
  return { kind: "other", label: condition };
}

/**
 * Collapse a list of raw conditions into unique dir and remote labels.
 * @param {string[]} conditions
 * @returns {{ dirs: string[], remotes: string[], other: string[] }}
 */
export function summarizeConditions(conditions) {
  /** @type {{ dir: Set<string>, remote: Set<string>, other: Set<string> }} */
  const sets = { dir: new Set(), remote: new Set(), other: new Set() };
  for (const c of conditions) {
    const { kind, label } = describeCondition(c);
    sets[kind].add(label);
  }
  return { dirs: [...sets.dir], remotes: [...sets.remote], other: [...sets.other] };
}

/**
 * A gitdir condition without a trailing slash or glob only matches one exact
 * repo, which is almost never what someone meant.
 * @param {string} condition
 */
export function isExactGitdir(condition) {
  const m = condition.match(/^gitdir(?:\/i)?:(.*)$/);
  return Boolean(m && !m[1].endsWith("/") && !m[1].endsWith("*"));
}

/**
 * Expand the `~` in a gitdir label (used for "does this dir exist" checks).
 * @param {string} label
 */
export function expandDirLabel(label) {
  return label.startsWith("~/") ? path.join(home(), label.slice(2)) : label;
}
