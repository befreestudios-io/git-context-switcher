/**
 * Starting points for common contexts. They only pre-fill defaults.
 */

/**
 * @typedef {object} Template
 * @property {string} name
 * @property {string} description
 * @property {string} dir
 * @property {import("./identity.js").SignMode} sign
 */

/** @type {Template[]} */
export const TEMPLATES = [
  { name: "personal", description: "Personal projects", dir: "~/personal/", sign: "none" },
  { name: "work", description: "Work projects", dir: "~/work/", sign: "ssh" },
  { name: "client", description: "Client projects", dir: "~/clients/", sign: "ssh" },
  { name: "opensource", description: "Open source contributions", dir: "~/oss/", sign: "ssh" },
];

/** @param {string} name */
export function findTemplate(name) {
  const t = TEMPLATES.find((x) => x.name === name);
  if (!t) throw new Error(`No template "${name}" (available: ${TEMPLATES.map((x) => x.name).join(", ")})`);
  return t;
}
