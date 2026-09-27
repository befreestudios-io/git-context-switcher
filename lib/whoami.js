/**
 * Report the identity git will actually use here, and where each value came from.
 */
import { getConfig, getConfigWithOrigin, isInsideRepo } from "./git.js";

/** @typedef {{ value: string, origin: string } | null} Sourced */

/**
 * @typedef {object} WhoAmI
 * @property {string} cwd
 * @property {boolean} inRepo
 * @property {string | null} remote
 * @property {boolean} guard user.useConfigOnly is on
 * @property {boolean} commitWouldFail guard is on and no email resolves
 * @property {Sourced} context
 * @property {Sourced} name
 * @property {Sourced} email
 * @property {Sourced} signingFormat
 * @property {Sourced} signingKey
 * @property {Sourced} signCommits
 * @property {Sourced} sshCommand
 */

const FIELDS = /** @type {const} */ ([
  ["context", "gitcontext.name"],
  ["name", "user.name"],
  ["email", "user.email"],
  ["signingFormat", "gpg.format"],
  ["signingKey", "user.signingkey"],
  ["signCommits", "commit.gpgsign"],
  ["sshCommand", "core.sshcommand"],
]);

/**
 * @param {string} [cwd]
 * @returns {Promise<WhoAmI>}
 */
export async function whoami(cwd = process.cwd()) {
  const [inRepo, guardValue, ...values] = await Promise.all([
    isInsideRepo(cwd),
    getConfig({ cwd }, "user.useconfigonly"),
    ...FIELDS.map(([, key]) => getConfigWithOrigin(cwd, key)),
  ]);
  const remote = inRepo ? await getConfig({ cwd }, "remote.origin.url") : null;
  const guard = guardValue === "true";
  /** @type {Record<string, Sourced>} */
  const fields = Object.fromEntries(FIELDS.map(([field], i) => [field, values[i] ?? null]));
  return /** @type {WhoAmI} */ ({
    cwd,
    inRepo,
    remote,
    guard,
    commitWouldFail: guard && !fields.email,
    ...fields,
  });
}
