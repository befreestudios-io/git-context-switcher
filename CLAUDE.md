# git-context-switcher

CLI (`git-context`) that manages per-directory and per-remote git identities
(author, SSH key, commit signing) as a thin layer over git's native
`includeIf`. Published to npm as `git-context-switcher`.

## Commands

- `npm run check` runs lint + type check + tests. Run it before every push.
- `npm test` runs tests (`node:test`, real git in a sandboxed HOME).
- `npm run test:coverage` writes coverage to `lcov.info`.
- Requires Node 22.13+; remote matching needs git 2.36+.

## Architecture

- All state lives in git config. There is no separate database.
  - One `~/.gitconfig.d/<name>.gitconfig` per context (includes
    `gitcontext.name` / `gitcontext.description` metadata).
  - `[includeIf "<condition>"] path = ~/.gitconfig.d/<name>.gitconfig` in the
    global config. An include is "ours" only if its path points directly into
    `~/.gitconfig.d/`; never touch any other include.
- Every read/write goes through `git config` via `lib/git.js` (execFile, never
  a shell). Never hand-parse or rewrite gitconfig text; that caused the 1.x
  data-loss bugs.
- `lib/conditions.js`: `--dir` becomes `gitdir:` with a trailing slash;
  `--remote` becomes three `hasconfig:remote.*.url:` globs (`*://host/…`,
  `*://*@host/…`, `*@host:…`), anchored to the host. Pure functions.
- Keys are handled in git's canonical lowercase form (`core.sshcommand`).
- Paths: include paths and `gitdir:` use `~/` (git expands them);
  `user.signingkey` is written as an absolute path.
- Global config is backed up once per run to `~/.gitconfig.d/backups/`.
- Commands live in `lib/cli.js` (commander + lazily loaded
  `@inquirer/prompts`). Every command works non-interactively with flags.

## Conventions

- Plain ESM JavaScript with JSDoc types, checked by `tsc --checkJs`
  (`strict`). No build step: `lib/` is what ships.
- Runtime deps are only `commander` and `@inquirer/prompts`. Prefer Node
  built-ins over new dependencies (colors come from `util.styleText`).
- Tests use `test/helpers.js` `sandbox()` and assert on what git resolves
  inside a real repo (`git config --get`), not on file contents.
- Known gap: the interactive prompt paths in `cli.js` aren't unit-tested.

## Repo and release

- `main` is protected: changes land through reviewed PRs.
- CI (`.github/workflows/ci.yml`): Node 22/24 on Ubuntu + macOS, package
  contents check, changelog gate on version bumps. CodeQL scans JS and the
  workflow files. Third-party actions are pinned to commit SHAs.
- Releases: see `RELEASING.md`. Pushing a `vX.Y.Z` tag stages the package on
  npm via trusted publishing (the trusted publisher is limited to
  `npm stage publish`) and creates a draft GitHub release. The maintainer
  approves with `npm stage approve` (2FA), then publishes the draft.
- `CHANGELOG.md` follows Keep a Changelog; the release notes come from the
  matching `## [X.Y.Z]` section.
