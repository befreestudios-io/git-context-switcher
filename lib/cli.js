/**
 * Command-line interface.
 */
import { existsSync } from "node:fs";
import { createRequire } from "node:module";
import { readdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { Argument, Command, Option } from "commander";
import { audit } from "./audit.js";
import { remoteConditions } from "./conditions.js";
import { getContext, listContexts, removeContext, saveContext, validateName } from "./contexts.js";
import { runDoctor } from "./doctor.js";
import { getConfig, gitVersion, versionAtLeast } from "./git.js";
import { disableGuard, enableGuard, guardStatus } from "./guard.js";
import { IDENTITY_KEYS, buildIdentityConfig, identityFromConfig } from "./identity.js";
import { hasLegacyState, migrate } from "./migrate.js";
import { expandHome, home, tildify } from "./paths.js";
import { TEMPLATES, findTemplate } from "./templates.js";
import { exportContexts, importContexts, parseExport } from "./transfer.js";
import * as ui from "./ui.js";
import { whoami } from "./whoami.js";

/** @typedef {import("./contexts.js").Context} Context */
/** @typedef {import("./contexts.js").ContextSpec} ContextSpec */
/** @typedef {import("./identity.js").SignMode} SignMode */

/**
 * @typedef {object} ContextOptions
 * @property {string[]} [dir]
 * @property {string[]} [remote]
 * @property {string} [userName]
 * @property {string} [email]
 * @property {string} [sshKey]
 * @property {SignMode} [sign]
 * @property {string} [signingKey]
 * @property {string[]} [set]
 * @property {string} [template]
 * @property {string} [description]
 * @property {boolean} [force]
 * @property {boolean} [yes]
 */

const { version } = createRequire(import.meta.url)("../package.json");

/** @param {string} value @param {string[] | undefined} previous */
const collect = (value, previous) => [...(previous ?? []), value];

/** @param {string} text */
const splitList = (text) =>
  text
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);

/** @param {string | null} backup */
function reportBackup(backup) {
  if (backup) ui.say(ui.dim(`  Backed up your gitconfig to ${tildify(backup)}`));
}

/** @returns {Promise<string[]>} private keys in ~/.ssh that have a .pub next to them */
async function listSshKeys() {
  const dir = path.join(home(), ".ssh");
  if (!existsSync(dir)) return [];
  const files = await readdir(dir);
  return files
    .filter((f) => !f.endsWith(".pub") && files.includes(`${f}.pub`))
    .map((f) => `~/.ssh/${f}`);
}

/**
 * Parse `--set key=value` pairs.
 * @param {string[]} pairs
 * @returns {Record<string, string[]>}
 */
function parseSets(pairs) {
  /** @type {Record<string, string[]>} */
  const out = {};
  for (const pair of pairs) {
    const eq = pair.indexOf("=");
    const key = eq === -1 ? "" : pair.slice(0, eq).trim();
    if (!key.includes(".")) throw new Error(`--set expects section.key=value, got "${pair}"`);
    (out[key.toLowerCase()] ??= []).push(pair.slice(eq + 1));
  }
  return out;
}

/**
 * Work out a context spec from flags, an existing context (for edit), a
 * template, and — when interactive — prompts.
 * @param {string | undefined} name
 * @param {ContextOptions} opts
 * @param {Context | null} existing
 * @returns {Promise<ContextSpec>}
 */
async function gatherSpec(name, opts, existing) {
  const template = opts.template ? findTemplate(opts.template) : undefined;
  const base = existing ? identityFromConfig(existing.config) : {};

  let description = opts.description ?? existing?.description ?? template?.description ?? "";
  let dirs = opts.dir ?? existing?.dirs ?? (template ? [template.dir] : []);
  let remotes = opts.remote ?? existing?.remotes ?? [];
  let userName = opts.userName ?? base.userName ?? "";
  let email = opts.email ?? base.email ?? "";
  let sshKey = opts.sshKey ?? base.sshKey ?? "";
  /** @type {SignMode} */
  let sign = opts.sign ?? base.sign ?? template?.sign ?? "none";
  let signingKey = opts.signingKey ?? base.signingKey ?? "";

  if (ui.isInteractive() && !opts.yes) {
    const p = await ui.prompts();
    name ??= await p.input({
      message: "Context name",
      default: template?.name,
      validate: (v) => {
        try {
          validateName(v);
          return true;
        } catch (e) {
          return /** @type {Error} */ (e).message;
        }
      },
    });
    description = await p.input({ message: "Description (optional)", default: description });
    dirs = splitList(
      await p.input({ message: "Directories it applies to (comma-separated, e.g. ~/work)", default: dirs.join(", ") })
    );
    remotes = splitList(
      await p.input({
        message: "Remotes it applies to, wherever the repo lives (comma-separated, e.g. github.com/acme; optional)",
        default: remotes.join(", "),
        validate: (v) => {
          try {
            splitList(v).forEach((r) => remoteConditions(r));
            return true;
          } catch (e) {
            return /** @type {Error} */ (e).message;
          }
        },
      })
    );
    userName = await p.input({
      message: "Name for commits (blank keeps your global name)",
      default: userName || ((await getConfig({ global: true }, "user.name")) ?? ""),
    });
    email = await p.input({
      message: "Email for commits",
      default: email,
      validate: (v) => /^[^@\s]+@[^@\s]+$/.test(v) || "Enter an email address",
    });

    const keys = await listSshKeys();
    const current = sshKey ? tildify(expandHome(sshKey)) : "";
    const choice = await p.select({
      message: "SSH key for push/pull in this context",
      default: current,
      choices: [
        { name: "Don't set one (ssh picks as usual)", value: "" },
        ...[...new Set([...keys, ...(current ? [current] : [])])].map((k) => ({ name: k, value: k })),
        { name: "Other path…", value: "__other" },
      ],
    });
    sshKey = choice === "__other" ? await p.input({ message: "Path to private key" }) : choice;

    sign = await p.select({
      message: "Sign commits?",
      default: sign,
      choices: [
        { name: "With SSH", value: /** @type {SignMode} */ ("ssh") },
        { name: "With GPG", value: /** @type {SignMode} */ ("gpg") },
        { name: "No", value: /** @type {SignMode} */ ("none") },
      ],
    });
    if (sign === "gpg") {
      signingKey = await p.input({ message: "GPG key id", default: signingKey || undefined, required: true });
    } else if (sign === "ssh") {
      const suggested = signingKey || (sshKey ? `${sshKey}.pub` : "");
      signingKey = await p.input({ message: "SSH public key to sign with", default: suggested || undefined, required: true });
    }
  }

  if (!name) throw new Error("Give the context a name");
  validateName(name);

  const identity = buildIdentityConfig({
    userName: userName || undefined,
    email: email || undefined,
    sshKey: sshKey || undefined,
    sign,
    signingKey: signingKey || undefined,
  });

  // Keep settings that aren't part of the identity (e.g. added with --set before).
  /** @type {Record<string, string | string[]>} */
  const extras = {};
  for (const { key, value } of existing?.entries ?? []) {
    if (IDENTITY_KEYS.has(key)) continue;
    const prev = extras[key];
    extras[key] = prev === undefined ? value : [...(Array.isArray(prev) ? prev : [prev]), value];
  }

  return {
    name,
    description,
    dirs,
    remotes,
    conditions: existing?.otherConditions,
    config: { ...extras, ...identity, ...parseSets(opts.set ?? []) },
  };
}

/** @param {ContextSpec} spec */
async function warnIfRemotesUnsupported(spec) {
  if (!spec.remotes?.length) return;
  const version = await gitVersion();
  if (!versionAtLeast(version)) {
    ui.warn(`git ${version.join(".")} can't match remotes (needs 2.36+). Directory matching still works.`);
  }
}

/** @param {Context} ctx */
function printContext(ctx) {
  const id = identityFromConfig(ctx.config);
  ui.say(`${ui.paint("bold", ctx.name)}${ctx.description ? ui.dim(` — ${ctx.description}`) : ""}`);
  /** @type {[string, string][]} */
  const rows = [];
  if (ctx.dirs.length) rows.push(["dirs", ctx.dirs.join(", ")]);
  if (ctx.remotes.length) rows.push(["remotes", ctx.remotes.join(", ")]);
  if (ctx.otherConditions.length) rows.push(["when", ctx.otherConditions.join(", ")]);
  rows.push(["author", [id.userName, id.email && `<${id.email}>`].filter(Boolean).join(" ") || ui.dim("(not set)")]);
  if (id.sshKey) rows.push(["ssh key", id.sshKey]);
  if (id.sign !== "none") rows.push(["signing", `${id.sign}${id.signingKey ? ` (${id.signingKey})` : ""}`]);
  const extras = ctx.entries.filter((e) => !IDENTITY_KEYS.has(e.key));
  if (extras.length) rows.push(["also sets", extras.map((e) => `${e.key}=${e.value}`).join(", ")]);
  rows.push(["file", tildify(ctx.file)]);
  ui.table(rows);
}

/**
 * @param {boolean} json
 */
async function runWhoami(json) {
  const me = await whoami();
  if (json) return ui.printJson(me);

  /** @param {{ value: string, origin: string } | null} s */
  const src = (s) => (s ? ui.dim(`  (${tildify(s.origin)})`) : "");
  if (!me.inRepo) {
    ui.info("Not inside a git repository, so no context applies. Showing your global settings.");
  }
  /** @type {[string, string][]} */
  const rows = [
    ["context", me.context ? `${ui.paint("bold", me.context.value)}${src(me.context)}` : ui.dim("none")],
    ["name", me.name ? `${me.name.value}${src(me.name)}` : ui.dim("(not set)")],
    ["email", me.email ? `${me.email.value}${src(me.email)}` : ui.dim("(not set)")],
  ];
  if (me.signCommits?.value === "true") {
    rows.push(["signing", `${me.signingFormat?.value ?? "openpgp"}${src(me.signCommits)}`]);
  }
  if (me.sshCommand) rows.push(["ssh", `${me.sshCommand.value}${src(me.sshCommand)}`]);
  if (me.remote) rows.push(["remote", me.remote]);
  ui.table(rows);
  if (me.commitWouldFail) {
    ui.warn("Commits here will be refused: no context sets an email and the identity guard is on.");
  }
}

/** @param {string[]} names */
function listNames(names) {
  return names.map((n) => `"${n}"`).join(", ");
}

/**
 * @returns {Command}
 */
export function buildProgram() {
  const program = new Command();
  program
    .name("git-context")
    .description("Per-directory and per-remote git identities, built on git's own includeIf")
    .version(version)
    .showSuggestionAfterError()
    .hook("preAction", async (_program, action) => {
      const skip = ["migrate", "doctor", "templates"];
      if (!skip.includes(action.name()) && hasLegacyState()) {
        ui.info("Found settings from git-context 1.x; migrating them now (one time only).");
        await printMigration(await migrate());
      }
    });

  /** @param {Command} cmd */
  const contextFlags = (cmd) =>
    cmd
      .option("--dir <path>", "directory it applies to (repeatable)", collect)
      .option("--remote <pattern>", "remote it applies to, e.g. github.com/acme (repeatable)", collect)
      .option("--user-name <name>", "user.name for commits")
      .option("--email <email>", "user.email for commits")
      .option("--ssh-key <path>", "private key for push/pull (sets core.sshCommand)")
      .addOption(new Option("--sign <mode>", "sign commits").choices(["ssh", "gpg", "none"]))
      .option("--signing-key <key>", "SSH public key path or GPG key id")
      .option("--set <key=value>", "any other git config for this context (repeatable)", collect)
      .option("--description <text>", "short description")
      .option("-y, --yes", "don't prompt; use flags and defaults");

  program
    .command("setup")
    .description("interactive wizard: create contexts and optionally turn on the identity guard")
    .action(async () => {
      if (!ui.isInteractive()) throw new Error("setup is interactive; use `git-context add` in scripts");
      const p = await ui.prompts();
      ui.heading("git-context setup");
      ui.say(ui.dim("Each context is a set of git settings that applies in certain directories or remotes.\n"));
      let again = true;
      while (again) {
        const template = await p.select({
          message: "Start from",
          choices: [
            ...TEMPLATES.map((t) => ({ name: `${t.name} — ${t.description}`, value: t.name })),
            { name: "Blank", value: "" },
          ],
        });
        const spec = await gatherSpec(undefined, { template: template || undefined }, null);
        await warnIfRemotesUnsupported(spec);
        const { context, backup } = await saveContext(spec);
        ui.ok(`Added "${context.name}"`);
        reportBackup(backup);
        again = await p.confirm({ message: "Add another context?", default: false });
      }
      const status = await guardStatus();
      if (!status.enabled) {
        const on = await p.confirm({
          message: "Turn on the identity guard? (refuse commits in repos no context covers)",
          default: false,
        });
        if (on) await printGuardOn();
      }
      ui.say();
      ui.info("Run `git-context whoami` inside a repo to see which identity applies.");
    });

  contextFlags(
    program
      .command("add [name]")
      .description("add a context")
      .option("--template <name>", `start from a template (${TEMPLATES.map((t) => t.name).join(", ")})`)
      .option("--force", "overwrite a context with the same name")
  ).action(async (/** @type {string | undefined} */ name, /** @type {ContextOptions} */ opts) => {
    const spec = await gatherSpec(name, opts, null);
    await warnIfRemotesUnsupported(spec);
    const { context, backup } = await saveContext(spec, { replace: Boolean(opts.force) });
    ui.ok(`Added "${context.name}"`);
    reportBackup(backup);
    printContext(context);
  });

  contextFlags(program.command("edit <name>").description("change a context (flags replace; prompts pre-fill)")).action(
    async (/** @type {string} */ name, /** @type {ContextOptions} */ opts) => {
      const existing = await getContext(name);
      if (!existing) throw new Error(`No context named "${name}"`);
      const spec = await gatherSpec(name, opts, existing);
      await warnIfRemotesUnsupported(spec);
      const { context, backup } = await saveContext(spec, { replace: true });
      ui.ok(`Updated "${context.name}"`);
      reportBackup(backup);
      printContext(context);
    }
  );

  program
    .command("remove <name>")
    .alias("rm")
    .description("remove a context and its includes")
    .option("-y, --yes", "don't ask for confirmation")
    .action(async (/** @type {string} */ name, /** @type {{ yes?: boolean }} */ opts) => {
      if (ui.isInteractive() && !opts.yes) {
        const p = await ui.prompts();
        if (!(await p.confirm({ message: `Remove context "${name}"?`, default: false }))) return;
      }
      const { backup } = await removeContext(name);
      ui.ok(`Removed "${name}"`);
      reportBackup(backup);
    });

  program
    .command("list")
    .alias("ls")
    .description("list contexts")
    .option("--json", "machine-readable output")
    .action(async (/** @type {{ json?: boolean }} */ opts) => {
      const contexts = await listContexts();
      if (opts.json) return ui.printJson(contexts);
      if (!contexts.length) return ui.info("No contexts yet. Try `git-context setup` or `git-context add`.");
      contexts.forEach((c, i) => {
        if (i) ui.say();
        printContext(c);
      });
    });

  program
    .command("whoami")
    .description("show the identity git will use here, and where each value comes from")
    .option("--json", "machine-readable output")
    .action((/** @type {{ json?: boolean }} */ opts) => runWhoami(Boolean(opts.json)));

  for (const legacy of ["apply", "detect-url"]) {
    program
      .command(legacy, { hidden: true })
      .action(async () => {
        console.error(ui.dim(`\`${legacy}\` was replaced by \`whoami\` in 2.0.`));
        await runWhoami(false);
      });
  }

  program
    .command("doctor")
    .description("check your setup for problems")
    .option("--json", "machine-readable output")
    .action(async (/** @type {{ json?: boolean }} */ opts) => {
      const checks = await runDoctor();
      if (opts.json) ui.printJson(checks);
      else {
        const icon = { ok: ui.ok, info: ui.info, warn: ui.warn, error: ui.error };
        for (const c of checks) {
          icon[c.level](c.message);
          if (c.fix) ui.say(`    ${ui.dim(`→ ${c.fix}`)}`);
        }
      }
      if (checks.some((c) => c.level === "error")) process.exitCode = 1;
    });

  program
    .command("guard")
    .description("identity guard: refuse commits where no context sets an email")
    .addArgument(new Argument("[state]", "on, off or status").choices(["on", "off", "status"]).default("status"))
    .action(async (/** @type {"on" | "off" | "status"} */ state) => {
      if (state === "on") return printGuardOn();
      if (state === "off") {
        const { restoredEmail, backup } = await disableGuard();
        ui.ok("Identity guard is off");
        if (restoredEmail) ui.say(ui.dim(`  Restored global user.email ${restoredEmail}`));
        return reportBackup(backup);
      }
      const s = await guardStatus();
      if (s.enabled) ui.ok("Identity guard is on");
      else ui.info("Identity guard is off");
      if (s.enabled && s.globalEmail) ui.warn(`A global user.email (${s.globalEmail}) is set, so the guard never triggers`);
    });

  program
    .command("audit [dir]")
    .description("find recent commits made with the wrong one of your identities")
    .option("--depth <n>", "how deep to look for repos", (v) => Number.parseInt(v, 10), 3)
    .option("--since <when>", "how far back to look", "90 days ago")
    .option("--json", "machine-readable output")
    .action(async (/** @type {string | undefined} */ dir, /** @type {{ depth: number, since: string, json?: boolean }} */ opts) => {
      const root = dir ?? process.cwd();
      const result = await audit(root, { depth: opts.depth, since: opts.since });
      const bad = result.repos.filter((r) => r.mismatches.length);
      if (opts.json) ui.printJson(result);
      else {
        if (!result.emails.length) ui.warn("No emails configured in any context, so there's nothing to compare against.");
        for (const r of bad) {
          ui.say();
          ui.warn(
            `${tildify(r.repo)} ${ui.dim(
              r.expected ? `expects ${r.expected}${r.context ? ` (${r.context})` : ""}` : "has no identity configured"
            )}`
          );
          for (const m of r.mismatches) {
            ui.say(`    ${ui.dim(m.hash.slice(0, 8))} ${m.date} ${m.email}  ${m.subject}`);
          }
        }
        ui.say();
        const n = bad.reduce((sum, r) => sum + r.mismatches.length, 0);
        const summary = `Checked ${result.repos.length} repo(s) under ${tildify(path.resolve(root))} since ${opts.since}`;
        if (n) ui.warn(`${summary}: ${n} commit(s) in ${bad.length} repo(s) used the wrong identity`);
        else ui.ok(`${summary}: no mismatched identities`);
      }
      if (bad.length) process.exitCode = 1;
    });

  program
    .command("migrate")
    .description("convert a git-context 1.x setup (runs automatically on first use)")
    .action(async () => {
      if (!hasLegacyState()) return ui.info("Nothing to migrate: no ~/.gitcontexts file found.");
      await printMigration(await migrate());
    });

  program
    .command("templates")
    .description("list context templates")
    .action(() => {
      ui.table(TEMPLATES.map((t) => [t.name, `${t.description} ${ui.dim(`(dir ${t.dir}, signing: ${t.sign})`)}`]));
      ui.say(ui.dim("\nUse with: git-context add <name> --template <template>"));
    });

  program
    .command("export [file]")
    .description("export contexts as JSON (to stdout without a file)")
    .action(async (/** @type {string | undefined} */ file) => {
      const data = JSON.stringify(await exportContexts(), null, 2) + "\n";
      if (!file || file === "-") {
        process.stdout.write(data);
        return;
      }
      await writeFile(file, data, { mode: 0o600 });
      ui.ok(`Exported to ${file}`);
    });

  program
    .command("import <file>")
    .description("import contexts from a JSON export (v2 or 1.x)")
    .option("--replace", "overwrite contexts with the same name")
    .option("-y, --yes", "import everything without asking")
    .action(async (/** @type {string} */ file, /** @type {{ replace?: boolean, yes?: boolean }} */ opts) => {
      let specs = parseExport(await readFile(file, "utf8"));
      if (ui.isInteractive() && !opts.yes && specs.length) {
        const existing = new Set((await listContexts()).map((c) => c.name));
        const p = await ui.prompts();
        const chosen = await p.checkbox({
          message: "Contexts to import",
          choices: specs.map((s) => ({
            name: existing.has(s.name) && !opts.replace ? `${s.name} (exists; skipped without --replace)` : s.name,
            value: s.name,
            checked: true,
          })),
        });
        specs = specs.filter((s) => chosen.includes(s.name));
      }
      const { imported, skipped, failed } = await importContexts(specs, { replace: Boolean(opts.replace) });
      if (imported.length) ui.ok(`Imported ${listNames(imported)}`);
      if (skipped.length) ui.info(`Skipped existing ${listNames(skipped)} (use --replace to overwrite)`);
      for (const f of failed) ui.error(`${f.name}: ${f.reason}`);
      if (failed.length) process.exitCode = 1;
    });

  return program;
}

async function printGuardOn() {
  const { movedEmail, backup } = await enableGuard();
  ui.ok("Identity guard is on: git will refuse to commit where no context sets an email");
  if (movedEmail) {
    ui.say(ui.dim(`  Set aside your global user.email (${movedEmail}); \`git-context guard off\` restores it`));
  }
  reportBackup(backup);
}

/** @param {Awaited<ReturnType<typeof migrate>>} result */
async function printMigration(result) {
  reportBackup(result.backup);
  if (result.migrated.length) ui.ok(`Migrated ${listNames(result.migrated)}`);
  for (const f of result.failed) ui.error(`Couldn't migrate ${f.name}: ${f.reason}`);
  ui.say(ui.dim(`  Old settings kept at ${tildify(result.legacyBackup)}`));
}

/**
 * Entry point.
 * @param {string[]} argv
 */
export async function main(argv) {
  const program = buildProgram();
  if (argv.length <= 2) {
    program.outputHelp();
    return;
  }
  try {
    await program.parseAsync(argv);
  } catch (error) {
    const err = /** @type {Error} */ (error);
    if (err.name === "ExitPromptError") {
      process.exitCode = 130; // Ctrl+C in a prompt
      return;
    }
    ui.error(err.message);
    process.exitCode = 1;
  }
}
