import assert from "node:assert/strict";
import { after, before, describe, test } from "node:test";
import {
  describeCondition,
  dirCondition,
  isExactGitdir,
  parseRemotePattern,
  remoteConditions,
  summarizeConditions,
} from "../lib/conditions.js";
import { sandbox } from "./helpers.js";

describe("dirCondition", () => {
  /** @type {ReturnType<typeof sandbox>} */
  let sb;
  before(() => (sb = sandbox()));
  after(() => sb.cleanup());

  test("adds the trailing slash git needs to match subdirectories", () => {
    assert.equal(dirCondition("~/work"), "gitdir:~/work/");
    assert.equal(dirCondition("~/work/"), "gitdir:~/work/");
  });

  test("keeps explicit globs", () => {
    assert.equal(dirCondition("~/work/**"), "gitdir:~/work/**");
    assert.equal(dirCondition("**/client-*/"), "gitdir:**/client-*/");
  });

  test("turns absolute and relative paths under HOME into ~/ paths", () => {
    assert.equal(dirCondition(`${sb.home}/code/work`), "gitdir:~/code/work/");
    assert.equal(dirCondition("oss", `${sb.home}/src`), "gitdir:~/src/oss/");
  });

  test("leaves paths outside HOME absolute", () => {
    assert.equal(dirCondition("/srv/repos"), "gitdir:/srv/repos/");
  });

  test("rejects characters git can't store in a subsection", () => {
    assert.throws(() => dirCondition('~/we"ird'));
    assert.throws(() => dirCondition("  "));
  });
});

describe("remote patterns", () => {
  test("accepts the forms people paste", () => {
    for (const input of [
      "github.com/acme",
      "https://github.com/acme",
      "https://github.com/acme/",
      "git@github.com:acme",
      "ssh://git@github.com/acme",
    ]) {
      assert.deepEqual(parseRemotePattern(input), { host: "github.com", path: "acme" }, input);
    }
  });

  test("keeps an ssh port with the host", () => {
    assert.deepEqual(parseRemotePattern("ssh://git@git.example.com:2222/team"), {
      host: "git.example.com:2222",
      path: "team",
    });
  });

  test("expands to https, user@ and scp-style conditions", () => {
    assert.deepEqual(remoteConditions("github.com/acme"), [
      "hasconfig:remote.*.url:*://github.com/acme/**",
      "hasconfig:remote.*.url:*://*@github.com/acme/**",
      "hasconfig:remote.*.url:*@github.com:acme/**",
    ]);
  });

  test("a trailing wildcard is kept as-is", () => {
    assert.equal(remoteConditions("github.com/*/work-*")[0], "hasconfig:remote.*.url:*://github.com/*/work-*");
  });

  test("a bare host matches the whole host", () => {
    assert.equal(remoteConditions("gitlab.example.com")[0], "hasconfig:remote.*.url:*://gitlab.example.com/**");
  });

  test("rejects junk", () => {
    assert.throws(() => parseRemotePattern(""));
    assert.throws(() => parseRemotePattern("has space/x"));
  });
});

describe("describeCondition", () => {
  test("round-trips all three remote forms to one label", () => {
    const labels = remoteConditions("github.com/acme").map((c) => describeCondition(c));
    assert.ok(labels.every((l) => l.kind === "remote" && l.label === "github.com/acme"));
    assert.deepEqual(summarizeConditions(remoteConditions("github.com/acme")).remotes, ["github.com/acme"]);
  });

  test("labels dirs and unknown conditions", () => {
    assert.deepEqual(describeCondition("gitdir:~/work/"), { kind: "dir", label: "~/work/" });
    assert.deepEqual(describeCondition("onbranch:main"), { kind: "other", label: "onbranch:main" });
  });

  test("spots gitdir patterns that only match one repo", () => {
    assert.equal(isExactGitdir("gitdir:~/work"), true);
    assert.equal(isExactGitdir("gitdir:~/work/"), false);
    assert.equal(isExactGitdir("gitdir:~/work/**"), false);
  });
});
