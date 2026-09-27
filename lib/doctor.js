/**
 * Health checks for a git-context setup. Each check is independent; doctor
 * only reads, it never changes anything.
 */
import { existsSync } from "node:fs";
import { expandDirLabel, isExactGitdir } from "./conditions.js";
import { listContexts, listIncludes } from "./contexts.js";
import { MIN_GIT_VERSION, getConfig, gitVersion, listConfig, versionAtLeast } from "./git.js";
import { guardStatus } from "./guard.js";
import { identityFromConfig } from "./identity.js";
import { allowedSignersFile, expandHome, legacyStateFile } from "./paths.js";
import { readPublicKey } from "./signers.js";

/** @typedef {"ok" | "info" | "warn" | "error"} Level */
/** @typedef {{ level: Level, message: string, fix?: string }} Check */

/**
 * @returns {Promise<Check[]>}
 */
export async function runDoctor() {
  /** @type {Check[]} */
  const checks = [];
  /** @param {Level} level @param {string} message @param {string} [fix] */
  const add = (level, message, fix) => checks.push(fix ? { level, message, fix } : { level, message });

  // git itself
  const version = await gitVersion();
  if (versionAtLeast(version)) {
    add("ok", `git ${version.join(".")}`);
  } else {
    add(
      "error",
      `git ${version.join(".")} is older than ${MIN_GIT_VERSION.join(".")}; --remote matching needs hasconfig: includes`,
      "Upgrade git (directory matching still works)"
    );
  }

  if (existsSync(legacyStateFile())) {
    add("warn", "Found a 1.x ~/.gitcontexts file that hasn't been migrated", "git-context migrate");
  }

  const [contexts, includes, status] = await Promise.all([listContexts(), listIncludes(), guardStatus()]);

  if (contexts.length === 0) {
    add("info", "No contexts yet", "git-context add <name> --dir <path> --email <you@example.com>");
  }

  // Each context
  /** @type {Map<string, string[]>} */
  const seen = new Map();
  for (const ctx of contexts) {
    const label = `Context "${ctx.name}"`;
    if (!ctx.fileExists) {
      add("error", `${label}: includes point at ${ctx.file}, which doesn't exist`, `git-context remove ${ctx.name}`);
      continue;
    }
    if (ctx.conditions.length === 0) {
      add("warn", `${label} has no includeIf entries, so it never applies`, `git-context edit ${ctx.name}`);
    }
    if (!ctx.config["user.email"] && !status.enabled) {
      add("warn", `${label} doesn't set user.email, so commits there use your global email`);
    }
    for (const cond of ctx.conditions) {
      if (isExactGitdir(cond)) {
        add(
          "warn",
          `${label}: "${cond}" has no trailing slash, so it only matches that exact repo`,
          `git-context edit ${ctx.name}  (use a trailing / to match everything under it)`
        );
      }
      seen.set(cond, [...(seen.get(cond) ?? []), ctx.name]);
    }
    for (const dir of ctx.dirs) {
      const base = expandDirLabel(dir.replace(/\*\*?$/, ""));
      if (!dir.startsWith("**") && !existsSync(base)) {
        add("info", `${label}: directory ${dir} doesn't exist yet`);
      }
    }

    const id = identityFromConfig(ctx.config);
    if (id.sshKey && !existsSync(expandHome(id.sshKey))) {
      add("error", `${label}: SSH key ${id.sshKey} doesn't exist`, `git-context edit ${ctx.name}`);
    }
    if (id.sign === "ssh" && id.signingKey && !(await readPublicKey(id.signingKey))) {
      add("error", `${label}: can't read SSH signing key ${id.signingKey}`, `git-context edit ${ctx.name}`);
    }
  }

  for (const [cond, names] of seen) {
    if (names.length > 1) {
      add("warn", `${names.join(" and ")} both match "${cond}"; the one listed last in your gitconfig wins`);
    }
  }

  // Global settings that come after our includes silently override them.
  const global = await listConfig({ global: true });
  const ownedKeys = new Set(contexts.flatMap((c) => Object.keys(c.config)));
  const ownedIncludePaths = new Set(includes.filter((i) => i.owner).map((i) => i.path));
  const lastInclude = global.findLastIndex(
    (e) => e.key.startsWith("includeif.") && e.key.endsWith(".path") && ownedIncludePaths.has(e.value)
  );
  if (lastInclude !== -1) {
    const overriding = [
      ...new Set(global.slice(lastInclude + 1).map((e) => e.key).filter((k) => ownedKeys.has(k))),
    ];
    for (const key of overriding) {
      add(
        "error",
        `${key} is set in your global gitconfig after the context includes, so it overrides every context`,
        `Move the [${key.split(".")[0]}] section above the includeIf blocks, or git config --global --unset ${key}`
      );
    }
  }

  // Guard
  if (status.enabled && status.globalEmail) {
    add(
      "warn",
      `Identity guard is on but a global user.email (${status.globalEmail}) is set, so it never triggers`,
      "git-context guard on"
    );
  } else if (status.enabled) {
    add("ok", "Identity guard is on: commits outside a context will be refused");
  } else if (contexts.length > 0) {
    add("info", "Identity guard is off: commits outside a context use your global identity", "git-context guard on");
  }

  // Allowed signers
  const signers = await getConfig({ global: true }, "gpg.ssh.allowedSignersFile");
  const anySsh = contexts.some((c) => c.config["gpg.format"] === "ssh");
  if (anySsh && signers && expandHome(signers) !== allowedSignersFile()) {
    add("info", `gpg.ssh.allowedSignersFile points at ${signers}; git-context keeps its own list in ${allowedSignersFile()}`);
  }

  return checks;
}
