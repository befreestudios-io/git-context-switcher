/**
 * Filesystem locations. Everything is computed on call so HOME can change
 * (tests point it at a sandbox).
 */
import { existsSync } from "node:fs";
import os from "node:os";
import path from "node:path";

export const home = () => os.homedir();

/** Directory holding one `<name>.gitconfig` per context. */
export const contextDir = () => path.join(home(), ".gitconfig.d");

/** @param {string} name */
export const contextFile = (name) => path.join(contextDir(), `${name}.gitconfig`);

/** @param {string} name The include path written into the global config. */
export const contextIncludePath = (name) => `~/.gitconfig.d/${name}.gitconfig`;

export const backupDir = () => path.join(contextDir(), "backups");

export const allowedSignersFile = () => path.join(contextDir(), "allowed_signers");

/** The 1.x JSON state file. */
export const legacyStateFile = () => path.join(home(), ".gitcontexts");

/**
 * The file `git config --global` writes to, following git's own lookup order.
 * @returns {string}
 */
export function globalConfigFile() {
  if (process.env.GIT_CONFIG_GLOBAL) return process.env.GIT_CONFIG_GLOBAL;
  const main = path.join(home(), ".gitconfig");
  if (existsSync(main)) return main;
  const xdgBase = process.env.XDG_CONFIG_HOME || path.join(home(), ".config");
  const xdg = path.join(xdgBase, "git", "config");
  return existsSync(xdg) ? xdg : main;
}

/**
 * Expand a leading `~` to the home directory.
 * @param {string} p
 */
export function expandHome(p) {
  if (p === "~") return home();
  if (p.startsWith("~/")) return path.join(home(), p.slice(2));
  return p;
}

/**
 * Shorten a path under the home directory to `~/…` for display and portability.
 * @param {string} p
 */
export function tildify(p) {
  const h = home();
  if (p === h) return "~";
  return p.startsWith(h + path.sep) ? `~/${p.slice(h.length + 1).split(path.sep).join("/")}` : p;
}

/**
 * True when `target` is inside `dir` (not equal, no `..` escape).
 * @param {string} dir
 * @param {string} target
 */
export function isInside(dir, target) {
  const rel = path.relative(path.resolve(dir), path.resolve(target));
  return rel !== "" && !rel.startsWith("..") && !path.isAbsolute(rel);
}
