/**
 * Identity guard: make git refuse to commit when no context supplies an email,
 * instead of silently falling back to a global identity.
 *
 * Uses git's own `user.useConfigOnly`. The global user.email (if any) is set
 * aside in `gitcontext.savedEmail` so turning the guard off restores it.
 */
import { backupGlobalConfig } from "./backup.js";
import { getConfig, setConfig, unsetConfig } from "./git.js";

const G = /** @type {const} */ ({ global: true });

/**
 * @returns {Promise<{ enabled: boolean, globalEmail: string | null, savedEmail: string | null }>}
 */
export async function guardStatus() {
  const [flag, globalEmail, savedEmail] = await Promise.all([
    getConfig(G, "user.useconfigonly"),
    getConfig(G, "user.email"),
    getConfig(G, "gitcontext.savedemail"),
  ]);
  return { enabled: flag === "true", globalEmail, savedEmail };
}

/**
 * @returns {Promise<{ movedEmail: string | null, backup: string | null }>}
 */
export async function enableGuard() {
  const backup = await backupGlobalConfig();
  const email = await getConfig(G, "user.email");
  if (email) {
    await setConfig(G, "gitcontext.savedEmail", email);
    await unsetConfig(G, "user.email");
  }
  await setConfig(G, "user.useConfigOnly", "true");
  return { movedEmail: email, backup };
}

/**
 * @returns {Promise<{ restoredEmail: string | null, backup: string | null }>}
 */
export async function disableGuard() {
  const backup = await backupGlobalConfig();
  const [saved, current] = await Promise.all([
    getConfig(G, "gitcontext.savedemail"),
    getConfig(G, "user.email"),
  ]);
  let restoredEmail = null;
  if (saved && !current) {
    await setConfig(G, "user.email", saved);
    restoredEmail = saved;
  }
  await unsetConfig(G, "gitcontext.savedEmail");
  await unsetConfig(G, "user.useConfigOnly");
  return { restoredEmail, backup };
}
