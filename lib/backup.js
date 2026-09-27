/**
 * Snapshot the global git config before the first change in a run.
 */
import { constants } from "node:fs";
import { chmod, copyFile, mkdir, readdir, rm } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";
import { backupDir, globalConfigFile } from "./paths.js";

const KEEP = 10;

/** @type {Promise<string | null> | null} */
let pending = null;

/**
 * Back up the global config once per process. Later calls return the same path.
 * @returns {Promise<string | null>} backup path, or null if there was nothing to back up
 */
export function backupGlobalConfig() {
  pending ??= doBackup();
  return pending;
}

/** Forget the per-process backup (tests run many "processes" in one). */
export function resetBackupState() {
  pending = null;
}

async function doBackup() {
  const src = globalConfigFile();
  if (!existsSync(src)) return null;

  const dir = backupDir();
  await mkdir(dir, { recursive: true, mode: 0o700 });
  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  const dest = path.join(dir, `gitconfig-${stamp}`);
  await copyFile(src, dest, constants.COPYFILE_EXCL);
  await chmod(dest, 0o600);

  const old = (await readdir(dir)).filter((f) => f.startsWith("gitconfig-")).sort();
  await Promise.all(old.slice(0, -KEEP).map((f) => rm(path.join(dir, f), { force: true })));
  return dest;
}
