import assert from "node:assert/strict";
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import path from "node:path";
import { afterEach, beforeEach, describe, test } from "node:test";
import { getContext, listContexts, removeContext, saveContext } from "../lib/contexts.js";
import { buildIdentityConfig } from "../lib/identity.js";
import { effective, makeRepo, sandbox, writeGlobalConfig } from "./helpers.js";

describe("contexts", () => {
  /** @type {ReturnType<typeof sandbox>} */
  let sb;
  beforeEach(() => (sb = sandbox()));
  afterEach(() => sb.cleanup());

  test("every directory pattern applies (1.x only wrote the first)", async () => {
    await saveContext({
      name: "work",
      dirs: ["~/work", "~/clients"],
      config: buildIdentityConfig({ email: "me@work.io" }),
    });
    const a = makeRepo(path.join(sb.home, "work", "api"));
    const b = makeRepo(path.join(sb.home, "clients", "acme", "site"));
    const c = makeRepo(path.join(sb.home, "personal", "blog"));
    assert.equal(effective(a, "user.email"), "me@work.io");
    assert.equal(effective(b, "user.email"), "me@work.io");
    assert.equal(effective(c, "user.email"), null);
  });

  test("remote patterns apply wherever the repo lives, for https and ssh", async () => {
    await saveContext({ name: "acme", remotes: ["github.com/acme-corp"], config: { "user.email": "me@acme.io" } });
    const cases = {
      "git@github.com:acme-corp/api.git": "me@acme.io",
      "https://github.com/acme-corp/web": "me@acme.io",
      "ssh://git@github.com/acme-corp/deep/repo.git": "me@acme.io",
      "https://github.com/someone-else/api.git": null,
      "https://evil.example/github.com/acme-corp/x": null,
    };
    let i = 0;
    for (const [url, expected] of Object.entries(cases)) {
      const repo = makeRepo(path.join(sb.home, "anywhere", String(i++)), url);
      assert.equal(effective(repo, "user.email"), expected, url);
    }
  });

  test("hand-written includes and other sections survive (1.x deleted them)", async () => {
    const original = [
      "[user]",
      "\tname = Me",
      '[includeIf "gitdir:~/mine/"]',
      "\tpath = ~/handwritten.gitconfig",
      '[includeIf "hasconfig:remote.*.url:git@github.com:me/**"]',
      "\tpath = ~/me.gitconfig",
      "[core]",
      "\teditor = vim",
      "",
    ].join("\n");
    writeGlobalConfig(sb.home, original);

    await saveContext({ name: "work", dirs: ["~/work"], config: { "user.email": "w@x.io" } });
    await removeContext("work");

    const after = readFileSync(path.join(sb.home, ".gitconfig"), "utf8");
    for (const line of ['[includeIf "gitdir:~/mine/"]', "path = ~/handwritten.gitconfig", "git@github.com:me/**", "editor = vim"]) {
      assert.ok(after.includes(line), `lost: ${line}`);
    }
    assert.ok(!after.includes(".gitconfig.d/work"), "our include should be gone");
  });

  test("arbitrary config keys and SSH signing are stored as-is (1.x dropped them)", async () => {
    const config = {
      ...buildIdentityConfig({ email: "w@x.io", sshKey: "~/.ssh/id_work", sign: "ssh" }),
      "pull.rebase": "true",
    };
    await saveContext({ name: "work", dirs: ["~/work"], config });
    const repo = makeRepo(path.join(sb.home, "work", "r"));
    assert.equal(effective(repo, "gpg.format"), "ssh");
    assert.equal(effective(repo, "user.signingkey"), path.join(sb.home, ".ssh/id_work.pub"));
    assert.equal(effective(repo, "core.sshcommand"), "ssh -i ~/.ssh/id_work -o IdentitiesOnly=yes");
    assert.equal(effective(repo, "pull.rebase"), "true");
    assert.equal(effective(repo, "gitcontext.name"), "work");
  });

  test("list reads everything back from git config", async () => {
    await saveContext({
      name: "work",
      description: "Day job",
      dirs: ["~/work"],
      remotes: ["github.com/acme"],
      config: { "user.email": "w@x.io" },
    });
    const [ctx] = await listContexts();
    assert.ok(ctx);
    assert.equal(ctx.name, "work");
    assert.equal(ctx.description, "Day job");
    assert.deepEqual(ctx.dirs, ["~/work/"]);
    assert.deepEqual(ctx.remotes, ["github.com/acme"]);
    assert.equal(ctx.config["user.email"], "w@x.io");
  });

  test("replacing a context doesn't duplicate includes", async () => {
    await saveContext({ name: "work", dirs: ["~/work"], config: { "user.email": "a@x.io" } });
    await saveContext({ name: "work", dirs: ["~/work", "~/w2"], config: { "user.email": "b@x.io" } }, { replace: true });
    const ctx = await getContext("work");
    assert.deepEqual(ctx?.conditions, ["gitdir:~/work/", "gitdir:~/w2/"]);
    assert.equal(ctx?.config["user.email"], "b@x.io");
  });

  test("refuses to overwrite without replace, and needs a condition", async () => {
    await saveContext({ name: "work", dirs: ["~/work"] });
    await assert.rejects(saveContext({ name: "work", dirs: ["~/x"] }), /already exists/);
    await assert.rejects(saveContext({ name: "empty" }), /needs at least one/);
    await assert.rejects(saveContext({ name: "../evil", dirs: ["~/x"] }), /isn't a valid context name/);
  });

  test("backs up the global config once, and context files are private", async () => {
    writeGlobalConfig(sb.home, "[user]\n\tname = Me\n");
    await saveContext({ name: "a", dirs: ["~/a"] });
    await saveContext({ name: "b", dirs: ["~/b"] });
    const backups = readdirSync(path.join(sb.home, ".gitconfig.d", "backups"));
    assert.equal(backups.length, 1);
    const mode = statSync(path.join(sb.home, ".gitconfig.d", "a.gitconfig")).mode & 0o777;
    assert.equal(mode, 0o600);
  });

  test("includes 1.x wrote with absolute paths are still recognized as ours", async () => {
    writeGlobalConfig(
      sb.home,
      `[includeIf "gitdir:${sb.home}/old/**"]\n\tpath = ${sb.home}/.gitconfig.d/old.gitconfig\n`
    );
    const ctx = await getContext("old");
    assert.deepEqual(ctx?.conditions, [`gitdir:${sb.home}/old/**`]);
    assert.equal(ctx?.fileExists, false);
    await removeContext("old");
    assert.ok(!readFileSync(path.join(sb.home, ".gitconfig"), "utf8").includes("old.gitconfig"));
  });

  test("remove deletes the file", async () => {
    await saveContext({ name: "work", dirs: ["~/work"] });
    await removeContext("work");
    assert.equal(existsSync(path.join(sb.home, ".gitconfig.d", "work.gitconfig")), false);
    await assert.rejects(removeContext("work"), /No context/);
  });
});
