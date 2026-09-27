/**
 * Export contexts to portable JSON and import them back (v2 or 1.x format).
 */
import { getContext, listContexts, saveContext, toSpec } from "./contexts.js";
import { specFromV1 } from "./migrate.js";

/** @typedef {import("./contexts.js").ContextSpec} ContextSpec */

export async function exportContexts() {
  const contexts = await listContexts();
  return { version: 2, contexts: contexts.filter((c) => c.fileExists).map(toSpec) };
}

/**
 * @param {string} text
 * @returns {ContextSpec[]}
 */
export function parseExport(text) {
  let data;
  try {
    data = JSON.parse(text);
  } catch (error) {
    throw new Error(`Not valid JSON: ${/** @type {Error} */ (error).message}`, { cause: error });
  }
  if (Array.isArray(data)) return data.map(specFromV1); // 1.x export
  if (data?.version === 2 && Array.isArray(data.contexts)) {
    return data.contexts.map((/** @type {any} */ c) => {
      if (!c || typeof c.name !== "string") throw new Error("A context in the file is missing its name");
      return {
        name: c.name,
        description: typeof c.description === "string" ? c.description : "",
        dirs: Array.isArray(c.dirs) ? c.dirs : [],
        remotes: Array.isArray(c.remotes) ? c.remotes : [],
        conditions: Array.isArray(c.conditions) ? c.conditions : [],
        config: c.config && typeof c.config === "object" ? c.config : {},
      };
    });
  }
  throw new Error("Unrecognized export format");
}

/**
 * @param {ContextSpec[]} specs
 * @param {{ replace?: boolean }} [options]
 */
export async function importContexts(specs, { replace = false } = {}) {
  /** @type {string[]} */
  const imported = [];
  /** @type {string[]} */
  const skipped = [];
  /** @type {{ name: string, reason: string }[]} */
  const failed = [];
  for (const spec of specs) {
    if (!replace && (await getContext(spec.name))) {
      skipped.push(spec.name);
      continue;
    }
    try {
      await saveContext(spec, { replace: true });
      imported.push(spec.name);
    } catch (error) {
      failed.push({ name: spec.name, reason: /** @type {Error} */ (error).message });
    }
  }
  return { imported, skipped, failed };
}
