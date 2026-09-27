# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [2.0.0] - Unreleased

A rewrite as a thin layer over git's native conditional includes. Your 1.x setup is migrated automatically the first time you run any command.

### Breaking Changes

- Requires Node.js 22.13+. Remote matching requires git 2.36+.
- `~/.gitcontexts` is no longer used: git config is the only source of truth. It's migrated and kept as `~/.gitcontexts.v1.bak`.
- `apply` and `detect-url` are replaced by `whoami` (the old names still run it).
- Export files use a new format; `import` still reads 1.x exports.

### Added

- `--remote` matching via git's `hasconfig:remote.*.url:`, so a context applies wherever the repo is cloned (https and ssh URLs).
- Per-context SSH keys (`core.sshCommand`) and SSH or GPG commit signing, with an allowed-signers file kept up to date.
- `whoami`: the identity git will use here and where each value comes from.
- `doctor`: checks for global settings that override contexts, `gitdir:` patterns missing a trailing slash, missing key files and more.
- `guard on|off`: refuse commits where no context sets an email (git's `user.useConfigOnly`).
- `audit`: find recent commits made with the wrong one of your emails.
- `edit`, and non-interactive flags on every command; `--json` output for `list`, `whoami`, `doctor` and `audit`.
- `--set key=value` for any other per-context git config.
- The global gitconfig is backed up before every change.

### Fixed

- Includes you wrote yourself, and any `includeIf` block following one, were deleted whenever contexts changed.
- Only the first directory pattern of a context was ever written.
- SSH signing keys were rejected, and git config keys other than name, email and signing were dropped.

### Changed

- Dependencies cut to `commander` and `@inquirer/prompts` (dropped `chalk`, `fs-extra`, `inquirer`, `tmp`); `npm audit` is clean.
- Tests moved from Jest to `node:test` and run against real git. Code is type-checked with JSDoc.

## [1.1.1] - 2025-05-02

### Added

- ASCII art logo displayed when running setup or help commands
- Better visual branding in terminal output

### Changed

- Improved documentation organization with separate files for:
  - Command reference
  - Usage examples
  - Technical explanation
  - Troubleshooting guide

### Fixed

- Fixed issue with color handling in different terminal environments
- Improved error handling when logo file is not available

## [1.1.0] - 2025-05-01

### Added

- Repository URL-based context detection with the new `detect-url` command
- Context templates system for quick setup of common configurations
- Context export and import functionality for sharing configurations
- New CLI commands: `detect-url`, `templates`, `export`, `import`
- URL pattern matching for automatic context detection based on repository remotes
- Support for wildcards in URL patterns for flexible matching

## [1.0.0] - 2025-04-28

### Added

- Initial public release
- Interactive setup wizard for configuring git contexts
- Multiple context support (personal, work, client projects, etc.)
- Path-based pattern matching using Git's conditional includes
- Configuration management with automatic `.gitconfig.d` directory creation
- Backup functionality for existing git configurations
- CLI commands: setup, add, remove, list, apply

[2.0.0]: https://github.com/befreestudios-io/git-context-switcher/compare/1.1.1...v2.0.0
[1.1.1]: https://github.com/befreestudios-io/git-context-switcher/compare/v1.1.0...v1.1.1
[1.1.0]: https://github.com/befreestudios-io/git-context-switcher/compare/v1.0.0...v1.1.0
[1.0.0]: https://github.com/befreestudios-io/git-context-switcher/releases/tag/v1.0.0
