import assert from "node:assert/strict";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { afterEach, beforeEach, describe, test } from "node:test";
import { audit, findRepos } from "../lib/audit.js";
import { getContext, saveContext } from "../lib/contexts.js";
import { runDoctor } from "../lib/doctor.js";
import { disableGuard, enableGuard, guardStatus } from "../lib/guard.js";
import { migrate, specFromV1 } from "../lib/migrate.js";
import { exportContexts, importContexts, parseExport } from "../lib/transfer.js";
import { whoami } from "../lib/whoami.js";
import { effective, git, makeRepo, sandbox, writeGlobalConfig } from "./helpers.js";

/** @type {ReturnType<typeof sandbox>} */
let sb;
beforeEach(() => (sb = sandbox()));
afterEach(() => sb.cleanup());

describe("whoami", () => {
  test("reports the context and where each value comes from", async () => {
    writeGlobalConfig(sb.home, "[user]\n\tname = Me\n");
    await saveContext({ name: "work", dirs: ["~/work"], config: { "user.email": "w@x.io" } });
    const repo = makeRepo(path.join(sb.home, "work", "api"), "git@github.com:acme/api.git");
    const me = await whoami(repo);
    assert.equal(me.inRepo, true);
    assert.equal(me.context?.value, "work");
    assert.equal(me.email?.value, "w@x.io");
    assert.equal(me.email?.origin, path.join(sb.home, ".gitconfig.d", "work.gitconfig"));
    assert.equal(me.name?.origin, path.join(sb.home, ".gitconfig"));
    assert.equal(me.remote, "git@github.com:acme/api.git");
    assert.equal(me.commitWouldFail, false);
  });

  test("outside a repo, no context applies", async () => {
    await saveContext({ name: "work", dirs: ["~/work"], config: { "user.email": "w@x.io" } });
    mkdirSync(path.join(sb.home, "work"), { recursive: true });
    const me = await whoami(path.join(sb.home, "work"));
    assert.equal(me.inRepo, false);
    assert.equal(me.context, null);
  });
});

describe("guard", () => {
  test("on: git refuses to commit outside a context; off: restores the global email", async () => {
    writeGlobalConfig(sb.home, "[user]\n\tname = Me\n\temail = me@home.io\n");
    await saveContext({ name: "work", dirs: ["~/work"], config: { "user.email": "w@x.io" } });
    const outside = makeRepo(path.join(sb.home, "elsewhere"));
    const inside = makeRepo(path.join(sb.home, "work", "api"));

    const { movedEmail } = await enableGuard();
    assert.equal(movedEmail, "me@home.io");
    assert.equal((await guardStatus()).enabled, true);
    assert.throws(() => git(["commit", "--allow-empty", "-m", "x"], outside));
    git(["commit", "--allow-empty", "-m", "x"], inside);
    assert.equal(git(["log", "-1", "--format=%ae"], inside), "w@x.io");
    assert.equal((await whoami(outside)).commitWouldFail, true);

    const { restoredEmail } = await disableGuard();
    assert.equal(restoredEmail, "me@home.io");
    assert.equal(effective(outside, "user.email"), "me@home.io");
    assert.equal((await guardStatus()).enabled, false);
  });
});

describe("doctor", () => {
  test("flags a global identity that overrides every context", async () => {
    await saveContext({ name: "work", dirs: ["~/work"], config: { "user.email": "w@x.io" } });
    // Appending [user] after the includes is exactly the mistake people make.
    writeFileSync(
      path.join(sb.home, ".gitconfig"),
      readFileSync(path.join(sb.home, ".gitconfig"), "utf8") + "[user]\n\temail = me@home.io\n"
    );
    const checks = await runDoctor();
    assert.ok(checks.some((c) => c.level === "error" && c.message.startsWith("user.email is set in your global gitconfig after")));
  });

  test("flags exact gitdir matches, missing files and legacy state", async () => {
    writeGlobalConfig(
      sb.home,
      `[includeIf "gitdir:~/exact"]\n\tpath = ~/.gitconfig.d/exact.gitconfig\n[includeIf "gitdir:~/gone/"]\n\tpath = ~/.gitconfig.d/gone.gitconfig\n`
    );
    mkdirSync(path.join(sb.home, ".gitconfig.d"));
    writeFileSync(path.join(sb.home, ".gitconfig.d", "exact.gitconfig"), "[user]\n\temail = e@x.io\n");
    writeFileSync(path.join(sb.home, ".gitcontexts"), "[]");
    const messages = (await runDoctor()).map((c) => `${c.level}: ${c.message}`);
    assert.ok(messages.some((m) => m.includes("no trailing slash")), messages.join("\n"));
    assert.ok(messages.some((m) => m.startsWith("error:") && m.includes("gone.gitconfig")), messages.join("\n"));
    assert.ok(messages.some((m) => m.includes("1.x")), messages.join("\n"));
  });
});

describe("audit", () => {
  test("finds commits made with the wrong one of your emails", async () => {
    writeGlobalConfig(sb.home, "[user]\n\tname = Me\n\temail = me@home.io\n");
    await saveContext({ name: "work", dirs: ["~/src/work"], config: { "user.email": "w@x.io" } });
    const repo = makeRepo(path.join(sb.home, "src", "work", "api"));
    git(["-c", "user.email=me@home.io", "commit", "--allow-empty", "-m", "oops"], repo);
    git(["commit", "--allow-empty", "-m", "fine"], repo);
    git(["-c", "user.email=colleague@x.io", "commit", "--allow-empty", "-m", "not mine"], repo);
    makeRepo(path.join(sb.home, "src", "empty"));

    assert.deepEqual(await findRepos(path.join(sb.home, "src"), 3), [
      path.join(sb.home, "src", "empty"),
      repo,
    ]);
    const { repos } = await audit(path.join(sb.home, "src"));
    const api = repos.find((r) => r.repo === repo);
    assert.equal(api?.context, "work");
    assert.equal(api?.expected, "w@x.io");
    assert.deepEqual(api?.mismatches.map((m) => m.subject), ["oops"]);
    assert.deepEqual(repos.find((r) => r.repo.endsWith("empty"))?.mismatches, []);
  });
});

describe("migration from 1.x", () => {
  test("converts both 1.0 and 1.1 shapes", () => {
    assert.deepEqual(
      specFromV1({ name: "old", pathPattern: "~/old/", userName: "Me", userEmail: "o@x.io", signingKey: "ABC123", autoSign: true }),
      {
        name: "old",
        description: "",
        dirs: ["~/old/"],
        remotes: [],
        config: { "user.name": "Me", "user.email": "o@x.io", "user.signingkey": "ABC123", "commit.gpgsign": "true" },
      }
    );
    const spec = specFromV1({
      name: "work",
      pathPatterns: ["~/work/", "~/clients/"],
      pathPattern: "/home/x/work/**",
      urlPatterns: ["github.com/*/work-*"],
      gitConfig: { "user.name": "W", "user.email": "w@x.io", "commit.gpgsign": "" },
    });
    assert.deepEqual(spec.dirs, ["~/work/", "~/clients/"]);
    assert.deepEqual(spec.config, { "user.name": "W", "user.email": "w@x.io" });
  });

  test("rewrites 1.x includes, keeps hand edits, and sets the JSON aside", async () => {
    const d = path.join(sb.home, ".gitconfig.d");
    mkdirSync(d);
    // What 1.1.1 left behind: only the first pattern included, absolute paths.
    writeGlobalConfig(sb.home, `[includeIf "gitdir:${sb.home}/work/**"]\n\tpath = ${d}/work.gitconfig\n`);
    writeFileSync(path.join(d, "work.gitconfig"), "[user]\n\temail = edited@x.io\n");
    writeFileSync(
      path.join(sb.home, ".gitcontexts"),
      JSON.stringify([
        {
          name: "work",
          pathPatterns: ["~/work/", "~/clients/"],
          urlPatterns: ["github.com/acme"],
          gitConfig: { "user.email": "w@x.io", "user.name": "W" },
        },
      ])
    );

    const result = await migrate();
    assert.deepEqual(result.migrated, ["work"]);
    assert.equal(existsSync(path.join(sb.home, ".gitcontexts")), false);
    assert.ok(existsSync(result.legacyBackup));

    const ctx = await getContext("work");
    assert.deepEqual(ctx?.dirs, ["~/work/", "~/clients/"]);
    assert.deepEqual(ctx?.remotes, ["github.com/acme"]);
    assert.equal(ctx?.config["user.email"], "edited@x.io");
    assert.equal(ctx?.config["user.name"], "W");
    assert.ok(!readFileSync(path.join(sb.home, ".gitconfig"), "utf8").includes(`gitdir:${sb.home}/work/**`));

    const repo = makeRepo(path.join(sb.home, "clients", "x"));
    assert.equal(effective(repo, "user.email"), "edited@x.io");
  });
});

describe("export / import", () => {
  test("round-trips through JSON", async () => {
    await saveContext({
      name: "work",
      description: "Day job",
      dirs: ["~/work"],
      remotes: ["github.com/acme"],
      config: { "user.email": "w@x.io", "url.git@github.com:.insteadOf": ["https://github.com/"] },
    });
    const exported = JSON.stringify(await exportContexts());

    sb.cleanup();
    sb = sandbox();
    const specs = parseExport(exported);
    assert.deepEqual((await importContexts(specs)).imported, ["work"]);
    assert.deepEqual((await importContexts(specs)).skipped, ["work"]);

    const ctx = await getContext("work");
    assert.equal(ctx?.description, "Day job");
    assert.deepEqual(ctx?.dirs, ["~/work/"]);
    assert.deepEqual(ctx?.remotes, ["github.com/acme"]);
    assert.equal(ctx?.config["url.git@github.com:.insteadof"], "https://github.com/");
  });

  test("accepts 1.x export files", () => {
    const specs = parseExport(JSON.stringify([{ name: "p", pathPatterns: ["~/p/"], gitConfig: { "user.email": "p@x.io" } }]));
    assert.equal(specs[0]?.name, "p");
    assert.throws(() => parseExport("{}"), /Unrecognized/);
    assert.throws(() => parseExport("nope"), /Not valid JSON/);
  });
});
