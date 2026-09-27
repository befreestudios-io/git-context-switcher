import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { afterEach, beforeEach, describe, test } from "node:test";
import { makeRepo, sandbox, writeGlobalConfig } from "./helpers.js";

const BIN = path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "index.js");

/**
 * Run the CLI non-interactively (stdin isn't a TTY under spawnSync).
 * @param {string[]} args
 * @param {string} [cwd]
 */
function cli(args, cwd) {
  const r = spawnSync(process.execPath, [BIN, ...args], { cwd, encoding: "utf8", env: { ...process.env, NO_COLOR: "1" } });
  return { code: r.status, out: r.stdout, err: r.stderr };
}

describe("cli", () => {
  /** @type {ReturnType<typeof sandbox>} */
  let sb;
  beforeEach(() => (sb = sandbox()));
  afterEach(() => sb.cleanup());

  test("add → whoami → list → remove", () => {
    writeGlobalConfig(sb.home, "[user]\n\tname = Me\n");
    const add = cli(["add", "work", "--dir", "~/work", "--email", "w@x.io", "--set", "pull.rebase=true", "-y"]);
    assert.equal(add.code, 0, add.err);
    assert.match(add.out, /Added "work"/);

    const repo = makeRepo(path.join(sb.home, "work", "api"));
    const who = cli(["whoami", "--json"], repo);
    assert.equal(who.code, 0, who.err);
    const me = JSON.parse(who.out);
    assert.equal(me.context.value, "work");
    assert.equal(me.email.value, "w@x.io");
    assert.equal(me.name.value, "Me");

    const list = cli(["list", "--json"]);
    assert.equal(JSON.parse(list.out)[0].config["pull.rebase"], "true");

    assert.equal(cli(["remove", "work", "-y"]).code, 0);
    assert.deepEqual(JSON.parse(cli(["list", "--json"]).out), []);
  });

  test("errors go to stderr with a non-zero exit", () => {
    const r = cli(["add", "nope", "-y"]);
    assert.equal(r.code, 1);
    assert.match(r.err, /needs at least one --dir or --remote/);
    assert.equal(cli(["setup"]).code, 1);
  });

  test("old commands still work and point at whoami", () => {
    const r = cli(["apply"]);
    assert.equal(r.code, 0);
    assert.match(r.err, /replaced by `whoami`/);
  });

  test("migrates 1.x state automatically on first use", () => {
    writeFileSync(
      path.join(sb.home, ".gitcontexts"),
      JSON.stringify([{ name: "p", pathPatterns: ["~/p/"], gitConfig: { "user.email": "p@x.io" } }])
    );
    const r = cli(["list"]);
    assert.equal(r.code, 0, r.err);
    assert.match(r.out, /migrating them now/);
    assert.match(r.out, /Migrated "p"/);
    assert.match(r.out, /p@x\.io/);
  });

  test("doctor exits non-zero on errors", () => {
    writeGlobalConfig(sb.home, `[includeIf "gitdir:~/x/"]\n\tpath = ~/.gitconfig.d/missing.gitconfig\n`);
    const r = cli(["doctor"]);
    assert.equal(r.code, 1);
    assert.match(r.err, /missing\.gitconfig/);
  });
});
