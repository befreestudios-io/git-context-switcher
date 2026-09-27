/**
 * Contexts live entirely in git config:
 *   - `~/.gitconfig.d/<name>.gitconfig` holds the context's settings
 *   - `[includeIf "<condition>"] path = ~/.gitconfig.d/<name>.gitconfig`
 *     entries in the global config decide when it applies
 *
 * An include is "ours" only if its path points into ~/.gitconfig.d/, so
 * includes you wrote by hand are never touched.
 */
import { existsSync } from "node:fs";
import { chmod, mkdir, readdir, rename, rm } from "node:fs/promises";
import path from "node:path";
import { backupGlobalConfig } from "./backup.js";
import { dirCondition, remoteConditions, summarizeConditions } from "./conditions.js";
import {
  addConfig,
  canonicalKey,
  getConfigRegexp,
  listConfig,
  unsetConfig,
} from "./git.js";
import { contextDir, contextFile, contextIncludePath, expandHome, isInside } from "./paths.js";
import { syncAllowedSigners } from "./signers.js";

const NAME_RE = /^[A-Za-z0-9][A-Za-z0-9_-]*$/;
const META_PREFIX = "gitcontext.";

/**
 * @typedef {object} Include
 * @property {string} condition e.g. `gitdir:~/work/`
 * @property {string} path value as written in the global config
 * @property {string | null} owner context name when the include is ours
 */

/**
 * @typedef {object} Context
 * @property {string} name
 * @property {string} description
 * @property {string} file
 * @property {boolean} fileExists
 * @property {string[]} conditions raw includeIf conditions, in config order
 * @property {string[]} dirs
 * @property {string[]} remotes
 * @property {string[]} otherConditions
 * @property {Record<string, string>} config last value per key
 * @property {{ key: string, value: string }[]} entries every entry, in order
 */

/**
 * @typedef {object} ContextSpec
 * @property {string} name
 * @property {string} [description]
 * @property {string[]} [dirs] user-facing directory patterns
 * @property {string[]} [remotes] user-facing remote patterns
 * @property {string[]} [conditions] raw conditions (used as-is, e.g. from migration)
 * @property {Record<string, string | string[]>} [config]
 */

/** @param {string} name */
export function validateName(name) {
  if (!NAME_RE.test(name)) {
    throw new Error(
      `"${name}" isn't a valid context name (letters, numbers, - and _, starting with a letter or number)`
    );
  }
}

/**
 * The context name an include path belongs to, or null if it isn't ours.
 * @param {string} includePath
 */
function ownerOf(includePath) {
  const resolved = path.resolve(expandHome(includePath));
  const dir = contextDir();
  if (!isInside(dir, resolved) || path.dirname(resolved) !== path.resolve(dir)) return null;
  if (!resolved.endsWith(".gitconfig")) return null;
  return path.basename(resolved, ".gitconfig");
}

/** @returns {Promise<Include[]>} every includeIf in the global config, in order */
export async function listIncludes() {
  const entries = await getConfigRegexp({ global: true }, "^includeif\\..*\\.path$");
  return entries.map(({ key, value }) => ({
    condition: key.slice("includeif.".length, -".path".length),
    path: value,
    owner: ownerOf(value),
  }));
}

/** @returns {Promise<string[]>} names that have a file in ~/.gitconfig.d */
async function contextFileNames() {
  if (!existsSync(contextDir())) return [];
  const files = await readdir(contextDir());
  return files.filter((f) => f.endsWith(".gitconfig")).map((f) => f.slice(0, -".gitconfig".length));
}

/**
 * @param {string} name
 * @param {Include[]} includes
 * @returns {Promise<Context>}
 */
async function loadContext(name, includes) {
  const file = contextFile(name);
  const fileExists = existsSync(file);
  const all = fileExists ? await listConfig({ file }) : [];
  const entries = all.filter((e) => !e.key.startsWith(META_PREFIX));
  const description = all.findLast((e) => e.key === `${META_PREFIX}description`)?.value ?? "";
  const conditions = includes.filter((i) => i.owner === name).map((i) => i.condition);
  const { dirs, remotes, other } = summarizeConditions(conditions);
  return {
    name,
    description,
    file,
    fileExists,
    conditions,
    dirs,
    remotes,
    otherConditions: other,
    config: Object.fromEntries(entries.map((e) => [e.key, e.value])),
    entries,
  };
}

/** @returns {Promise<Context[]>} */
export async function listContexts() {
  const includes = await listIncludes();
  const names = new Set(await contextFileNames());
  for (const i of includes) if (i.owner) names.add(i.owner);
  return Promise.all([...names].sort().map((n) => loadContext(n, includes)));
}

/**
 * @param {string} name
 * @returns {Promise<Context | null>}
 */
export async function getContext(name) {
  const includes = await listIncludes();
  const ctx = await loadContext(name, includes);
  return ctx.fileExists || ctx.conditions.length ? ctx : null;
}

/**
 * Remove every include that points at this context.
 * @param {string} name
 */
async function removeIncludes(name) {
  for (const inc of await listIncludes()) {
    if (inc.owner === name) {
      await unsetConfig({ global: true }, `includeIf.${inc.condition}.path`, inc.path);
    }
  }
}

/**
 * Write the context file atomically (build a temp file with git, then rename).
 * @param {string} name
 * @param {string} description
 * @param {Record<string, string | string[]>} config
 */
async function writeContextFile(name, description, config) {
  await mkdir(contextDir(), { recursive: true, mode: 0o700 });
  const file = contextFile(name);
  const tmp = `${file}.tmp-${process.pid}`;
  await rm(tmp, { force: true });
  await addConfig({ file: tmp }, `${META_PREFIX}name`, name);
  if (description) await addConfig({ file: tmp }, `${META_PREFIX}description`, description);
  for (const [key, value] of Object.entries(config)) {
    for (const v of Array.isArray(value) ? value : [value]) {
      await addConfig({ file: tmp }, canonicalKey(key), v);
    }
  }
  await chmod(tmp, 0o600);
  await rename(tmp, file);
}

/**
 * Create or replace a context.
 * @param {ContextSpec} spec
 * @param {{ replace?: boolean }} [options]
 * @returns {Promise<{ context: Context, backup: string | null }>}
 */
export async function saveContext(spec, { replace = false } = {}) {
  validateName(spec.name);
  const conditions = [
    ...new Set([
      ...(spec.conditions ?? []),
      ...(spec.dirs ?? []).map((d) => dirCondition(d)),
      ...(spec.remotes ?? []).flatMap((r) => remoteConditions(r)),
    ]),
  ];
  if (conditions.length === 0) {
    throw new Error(`Context "${spec.name}" needs at least one --dir or --remote to know when to apply`);
  }
  if (!replace && (await getContext(spec.name))) {
    throw new Error(`Context "${spec.name}" already exists (use edit, or --force to overwrite)`);
  }

  const backup = await backupGlobalConfig();
  await writeContextFile(spec.name, spec.description ?? "", spec.config ?? {});
  await removeIncludes(spec.name);
  for (const condition of conditions) {
    await addConfig({ global: true }, `includeIf.${condition}.path`, contextIncludePath(spec.name));
  }
  await syncAllowedSigners(await listContexts());

  const context = /** @type {Context} */ (await getContext(spec.name));
  return { context, backup };
}

/**
 * Delete a context's includes and file.
 * @param {string} name
 * @returns {Promise<{ backup: string | null }>}
 */
export async function removeContext(name) {
  if (!(await getContext(name))) throw new Error(`No context named "${name}"`);
  const backup = await backupGlobalConfig();
  await removeIncludes(name);
  await rm(contextFile(name), { force: true });
  await syncAllowedSigners(await listContexts());
  return { backup };
}

/**
 * The portable description of a context used by export/import.
 * @param {Context} ctx
 */
export function toSpec(ctx) {
  /** @type {Record<string, string | string[]>} */
  const config = {};
  for (const { key, value } of ctx.entries) {
    const existing = config[key];
    if (existing === undefined) config[key] = value;
    else config[key] = [...(Array.isArray(existing) ? existing : [existing]), value];
  }
  return {
    name: ctx.name,
    description: ctx.description,
    dirs: ctx.dirs,
    remotes: ctx.remotes,
    ...(ctx.otherConditions.length ? { conditions: ctx.otherConditions } : {}),
    config,
  };
}
