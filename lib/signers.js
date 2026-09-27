/**
 * Maintain an SSH allowed-signers file from contexts that sign with SSH, so
 * `git log --show-signature` can verify your own commits.
 */
import { existsSync } from "node:fs";
import { readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { getConfig, setConfig, unsetConfig } from "./git.js";
import { allowedSignersFile, expandHome } from "./paths.js";

const HEADER = "# Managed by git-context. Regenerated whenever contexts change.\n";

/**
 * Read the public key a context signs with.
 * @param {string} signingKey value of user.signingkey
 * @returns {Promise<string | null>}
 */
export async function readPublicKey(signingKey) {
  if (signingKey.startsWith("key::")) return signingKey.slice("key::".length).trim();
  const p = expandHome(signingKey);
  for (const candidate of p.endsWith(".pub") ? [p] : [`${p}.pub`, p]) {
    if (!existsSync(candidate)) continue;
    const text = (await readFile(candidate, "utf8")).trim();
    if (/^(ssh-|ecdsa-|sk-)/.test(text)) return text;
  }
  return null;
}

/**
 * @param {{ config: Record<string, string> }[]} contexts
 * @returns {Promise<{ file: string | null, conflict: string | null }>}
 *   `conflict` is set when gpg.ssh.allowedSignersFile already points elsewhere
 */
export async function syncAllowedSigners(contexts) {
  const file = allowedSignersFile();
  const lines = [];
  for (const { config } of contexts) {
    const email = config["user.email"];
    const key = config["user.signingkey"];
    if (config["gpg.format"] !== "ssh" || !email || !key) continue;
    const pub = await readPublicKey(key);
    if (pub) lines.push(`${email} namespaces="git" ${pub}`);
  }

  const current = await getConfig({ global: true }, "gpg.ssh.allowedSignersFile");
  const ours = current !== null && path.resolve(expandHome(current)) === path.resolve(file);

  if (lines.length === 0) {
    if (existsSync(file)) await rm(file);
    if (ours) await unsetConfig({ global: true }, "gpg.ssh.allowedSignersFile");
    return { file: null, conflict: null };
  }

  await writeFile(file, HEADER + [...new Set(lines)].join("\n") + "\n", { mode: 0o644 });
  if (current === null) {
    await setConfig({ global: true }, "gpg.ssh.allowedSignersFile", file);
    return { file, conflict: null };
  }
  return { file, conflict: ours ? null : current };
}
