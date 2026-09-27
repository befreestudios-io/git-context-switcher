/**
 * Build the git config for a context's identity: author, SSH key, signing.
 */
import { expandHome, tildify } from "./paths.js";

/** @typedef {"ssh" | "gpg" | "none"} SignMode */

/**
 * @typedef {object} IdentityOptions
 * @property {string} [userName]
 * @property {string} [email]
 * @property {string} [sshKey] Private key used for push/pull (sets core.sshcommand)
 * @property {SignMode} [sign]
 * @property {string} [signingKey] SSH public key path or GPG key id
 */

/**
 * Quote a path for the shell git uses to run core.sshcommand. `~/…` paths
 * made of safe characters stay unquoted so the shell expands the tilde.
 * @param {string} p
 */
function shellPath(p) {
  const short = tildify(expandHome(p));
  if (/^~\/[\w./-]+$/.test(short) || /^\/[\w./-]+$/.test(short)) return short;
  return `'${expandHome(p).replace(/'/g, `'\\''`)}'`;
}

/**
 * @param {IdentityOptions} options
 * @returns {Record<string, string>}
 */
export function buildIdentityConfig({ userName, email, sshKey, sign = "none", signingKey }) {
  /** @type {Record<string, string>} */
  const config = {};
  if (userName) config["user.name"] = userName;
  if (email) {
    if (!/^[^@\s]+@[^@\s]+$/.test(email)) throw new Error(`"${email}" doesn't look like an email address`);
    config["user.email"] = email;
  }
  if (sshKey) {
    config["core.sshcommand"] = `ssh -i ${shellPath(sshKey)} -o IdentitiesOnly=yes`;
  }

  if (sign === "ssh") {
    const key = signingKey || (sshKey ? `${sshKey}.pub` : "");
    if (!key) throw new Error("SSH signing needs --signing-key (a public key path) or --ssh-key");
    config["gpg.format"] = "ssh";
    config["user.signingkey"] = key.startsWith("key::") ? key : expandHome(key);
    config["commit.gpgsign"] = "true";
    config["tag.gpgsign"] = "true";
  } else if (sign === "gpg") {
    if (!signingKey) throw new Error("GPG signing needs --signing-key (a key id)");
    config["gpg.format"] = "openpgp";
    config["user.signingkey"] = signingKey;
    config["commit.gpgsign"] = "true";
    config["tag.gpgsign"] = "true";
  } else if (sign !== "none") {
    throw new Error(`Unknown signing mode "${sign}" (use ssh, gpg or none)`);
  }
  return config;
}

/**
 * Recover identity options from a context's config (used to pre-fill `edit`).
 * @param {Record<string, string>} config
 * @returns {IdentityOptions}
 */
export function identityFromConfig(config) {
  const sshCommand = config["core.sshcommand"] ?? "";
  const keyMatch = sshCommand.match(/-i\s+('([^']*)'|(\S+))/);
  const format = config["gpg.format"];
  /** @type {SignMode} */
  let sign = "none";
  if (config["commit.gpgsign"] === "true" || config["user.signingkey"]) {
    sign = format === "ssh" ? "ssh" : "gpg";
  }
  const signingKey = config["user.signingkey"];
  return {
    userName: config["user.name"],
    email: config["user.email"],
    sshKey: keyMatch ? keyMatch[2] ?? keyMatch[3] : undefined,
    sign,
    signingKey: signingKey && sign === "ssh" ? tildify(signingKey) : signingKey,
  };
}

/** Keys owned by the identity options (everything else is "extra" config). */
export const IDENTITY_KEYS = new Set([
  "user.name",
  "user.email",
  "core.sshcommand",
  "gpg.format",
  "user.signingkey",
  "commit.gpgsign",
  "tag.gpgsign",
]);
