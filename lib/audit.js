/**
 * Find recent commits made with the wrong one of *your* identities: the author
 * email is one of yours, but not the one git resolves for that repo today.
 */
import { readdir } from "node:fs/promises";
import path from "node:path";
import { listContexts } from "./contexts.js";
import { getConfig, gitOrNull } from "./git.js";
import { guardStatus } from "./guard.js";

const SKIP_DIRS = new Set(["node_modules", "vendor", "Library"]);
const PARALLEL = 8;

/**
 * @typedef {object} Mismatch
 * @property {string} hash
 * @property {string} email
 * @property {string} date
 * @property {string} subject
 */

/**
 * @typedef {object} RepoAudit
 * @property {string} repo
 * @property {string | null} context
 * @property {string | null} expected
 * @property {Mismatch[]} mismatches
 */

/**
 * Directories containing a `.git` entry, not descending into repos.
 * @param {string} root
 * @param {number} maxDepth
 * @returns {Promise<string[]>}
 */
export async function findRepos(root, maxDepth) {
  /** @type {string[]} */
  const repos = [];
  /** @param {string} dir @param {number} depth */
  async function walk(dir, depth) {
    let entries;
    try {
      entries = await readdir(dir, { withFileTypes: true });
    } catch {
      return; // unreadable: skip
    }
    if (entries.some((e) => e.name === ".git")) {
      repos.push(dir);
      return;
    }
    if (depth >= maxDepth) return;
    await Promise.all(
      entries
        .filter((e) => e.isDirectory() && !e.name.startsWith(".") && !SKIP_DIRS.has(e.name))
        .map((e) => walk(path.join(dir, e.name), depth + 1))
    );
  }
  await walk(path.resolve(root), 0);
  return repos.sort();
}

/**
 * @template T, R
 * @param {T[]} items
 * @param {(item: T) => Promise<R>} fn
 * @returns {Promise<R[]>}
 */
async function mapLimit(items, fn) {
  /** @type {R[]} */
  const results = new Array(items.length);
  let next = 0;
  const workers = Array.from({ length: Math.min(PARALLEL, items.length) }, async () => {
    while (next < items.length) {
      const i = next++;
      results[i] = await fn(/** @type {T} */ (items[i]));
    }
  });
  await Promise.all(workers);
  return results;
}

/** @returns {Promise<Set<string>>} every email you use across contexts and globally */
async function yourEmails() {
  const [contexts, status] = await Promise.all([listContexts(), guardStatus()]);
  const emails = [...contexts.map((c) => c.config["user.email"]), status.globalEmail, status.savedEmail];
  return new Set(emails.filter((e) => typeof e === "string").map((e) => e.toLowerCase()));
}

/**
 * @param {string} root
 * @param {{ depth?: number, since?: string }} [options]
 * @returns {Promise<{ repos: RepoAudit[], emails: string[] }>}
 */
export async function audit(root, { depth = 3, since = "90 days ago" } = {}) {
  const [repoPaths, emails] = await Promise.all([findRepos(root, depth), yourEmails()]);

  const repos = await mapLimit(repoPaths, async (repo) => {
    const [expected, context] = await Promise.all([
      getConfig({ cwd: repo }, "user.email"),
      getConfig({ cwd: repo }, "gitcontext.name"),
    ]);
    // 128: empty repo with no commits yet.
    const log = await gitOrNull(
      ["log", `--since=${since}`, "--format=%H%x1f%ae%x1f%as%x1f%s%x1e"],
      { cwd: repo, okCodes: [128] }
    );
    const mismatches = (log ?? "")
      .split("\x1e")
      .map((r) => r.trim())
      .filter(Boolean)
      .map((r) => {
        const [hash = "", email = "", date = "", subject = ""] = r.split("\x1f");
        return { hash, email, date, subject };
      })
      .filter(
        (c) =>
          emails.has(c.email.toLowerCase()) &&
          (!expected || c.email.toLowerCase() !== expected.toLowerCase())
      );
    return { repo, context, expected, mismatches };
  });

  return { repos, emails: [...emails] };
}
