/**
 * Test sandbox: a throwaway HOME so tests run real git against real config
 * files without touching the developer's own setup.
 */
import { execFileSync } from "node:child_process";
import { mkdirSync, mkdtempSync, realpathSync, rmSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { resetBackupState } from "../lib/backup.js";

/**
 * Point HOME (and git's config lookup) at a fresh temp dir.
 * @returns {{ home: string, cleanup: () => void }}
 */
export function sandbox() {
  // realpath: macOS tmpdirs sit behind a /var → /private/var symlink.
  const home = realpathSync(mkdtempSync(path.join(os.tmpdir(), "git-context-test-")));
  const saved = {
    HOME: process.env.HOME,
    XDG_CONFIG_HOME: process.env.XDG_CONFIG_HOME,
    GIT_CONFIG_GLOBAL: process.env.GIT_CONFIG_GLOBAL,
    GIT_CONFIG_NOSYSTEM: process.env.GIT_CONFIG_NOSYSTEM,
  };
  process.env.HOME = home;
  process.env.XDG_CONFIG_HOME = path.join(home, ".config");
  process.env.GIT_CONFIG_NOSYSTEM = "1";
  delete process.env.GIT_CONFIG_GLOBAL;
  resetBackupState();

  return {
    home,
    cleanup() {
      for (const [k, v] of Object.entries(saved)) {
        if (v === undefined) delete process.env[k];
        else process.env[k] = v;
      }
      rmSync(home, { recursive: true, force: true });
    },
  };
}

/**
 * @param {string[]} args
 * @param {string} [cwd]
 */
export function git(args, cwd) {
  return execFileSync("git", args, { cwd, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] }).trim();
}

/**
 * Effective config value in a directory, or null.
 * @param {string} cwd
 * @param {string} key
 */
export function effective(cwd, key) {
  try {
    return git(["config", "--get", key], cwd);
  } catch {
    return null;
  }
}

/**
 * Create a repo, optionally with an origin remote.
 * @param {string} dir
 * @param {string} [remote]
 */
export function makeRepo(dir, remote) {
  mkdirSync(dir, { recursive: true });
  git(["init", "-q", "-b", "main"], dir);
  if (remote) git(["remote", "add", "origin", remote], dir);
  return dir;
}

/**
 * @param {string} home
 * @param {string} content
 */
export function writeGlobalConfig(home, content) {
  writeFileSync(path.join(home, ".gitconfig"), content);
}
