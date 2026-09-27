/**
 * One-time migration from 1.x, which kept contexts in ~/.gitcontexts (JSON)
 * and wrote includeIf blocks by hand.
 */
import { existsSync } from "node:fs";
import { readFile, rename } from "node:fs/promises";
import { backupGlobalConfig } from "./backup.js";
import { getContext, saveContext } from "./contexts.js";
import { legacyStateFile } from "./paths.js";

/**
 * @typedef {import("./contexts.js").ContextSpec} ContextSpec
 */

/**
 * Convert a 1.0 or 1.1 context object to a v2 spec.
 * 1.0: { name, pathPattern, userName, userEmail, signingKey, autoSign }
 * 1.1: { name, description, pathPatterns, gitConfig, urlPatterns, ...derived }
 * @param {any} obj
 * @returns {ContextSpec}
 */
export function specFromV1(obj) {
  if (!obj || typeof obj.name !== "string") throw new Error("Context is missing a name");

  /** @type {string[]} */
  const patterns = Array.isArray(obj.pathPatterns) && obj.pathPatterns.length
    ? obj.pathPatterns
    : [obj.pathPattern];
  const dirs = [...new Set(patterns.filter((/** @type {unknown} */ p) => typeof p === "string" && p.trim()))];

  /** @type {Record<string, string>} */
  const config = {};
  if (obj.gitConfig && typeof obj.gitConfig === "object") {
    for (const [k, v] of Object.entries(obj.gitConfig)) {
      if (v !== "" && v !== null && v !== undefined) config[k.toLowerCase()] = String(v);
    }
  } else {
    if (obj.userName) config["user.name"] = obj.userName;
    if (obj.userEmail) config["user.email"] = obj.userEmail;
    if (obj.signingKey) {
      config["user.signingkey"] = obj.signingKey;
      config["commit.gpgsign"] = obj.autoSign ? "true" : "false";
    }
  }

  return {
    name: obj.name,
    description: typeof obj.description === "string" ? obj.description : "",
    dirs,
    remotes: Array.isArray(obj.urlPatterns) ? obj.urlPatterns.filter((/** @type {unknown} */ p) => typeof p === "string") : [],
    config,
  };
}

export function hasLegacyState() {
  return existsSync(legacyStateFile());
}

/**
 * @returns {Promise<{ migrated: string[], failed: { name: string, reason: string }[], backup: string | null, legacyBackup: string }>}
 */
export async function migrate() {
  const file = legacyStateFile();
  let data;
  try {
    data = JSON.parse(await readFile(file, "utf8"));
  } catch (error) {
    throw new Error(`Couldn't read ${file}: ${/** @type {Error} */ (error).message}`, { cause: error });
  }
  if (!Array.isArray(data)) throw new Error(`${file} isn't a list of contexts`);

  const backup = await backupGlobalConfig();
  /** @type {string[]} */
  const migrated = [];
  /** @type {{ name: string, reason: string }[]} */
  const failed = [];

  for (const obj of data) {
    try {
      const spec = specFromV1(obj);
      // Settings already in the context file (possibly hand-edited) win over the JSON.
      const existing = await getContext(spec.name);
      if (existing?.fileExists) spec.config = { ...spec.config, ...existing.config };
      await saveContext(spec, { replace: true });
      migrated.push(spec.name);
    } catch (error) {
      failed.push({ name: obj?.name ?? "(unnamed)", reason: /** @type {Error} */ (error).message });
    }
  }

  let legacyBackup = `${file}.v1.bak`;
  if (existsSync(legacyBackup)) legacyBackup = `${file}.v1.${Date.now()}.bak`;
  await rename(file, legacyBackup);
  return { migrated, failed, backup, legacyBackup };
}
