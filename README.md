# Git Context Switcher <img src="assets/logo_concept.png" alt="Git Context Switcher Logo" width="200" align="right">

[![CI](https://github.com/befreestudios-io/git-context-switcher/actions/workflows/ci.yml/badge.svg)](https://github.com/befreestudios-io/git-context-switcher/actions/workflows/ci.yml)
[![codecov](https://codecov.io/gh/befreestudios-io/git-context-switcher/graph/badge.svg?token=5B3VS4IIVF)](https://codecov.io/gh/befreestudios-io/git-context-switcher)
[![npm version](https://img.shields.io/npm/v/git-context-switcher.svg)](https://www.npmjs.com/package/git-context-switcher)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

Use the right git identity — name, email, SSH key and commit signing — automatically, based on **where a repo lives** or **where its remote points**.

It's a thin layer over git's own [conditional includes](https://git-scm.com/docs/git-config#_conditional_includes). Git does the matching; this tool writes the config for you, checks it, and catches the mistakes.

```console
$ git-context add work --dir ~/work --remote github.com/acme --email me@acme.io --ssh-key ~/.ssh/id_acme --sign ssh -y
✔ Added "work"

$ cd ~/src/some-acme-repo && git-context whoami
  context  work            (~/.gitconfig.d/work.gitconfig)
  name     Burton          (~/.gitconfig)
  email    me@acme.io      (~/.gitconfig.d/work.gitconfig)
  signing  ssh             (~/.gitconfig.d/work.gitconfig)
  ssh      ssh -i ~/.ssh/id_acme -o IdentitiesOnly=yes  (~/.gitconfig.d/work.gitconfig)
```

## What you get

| | |
|---|---|
| **Directory and remote matching** | `--dir ~/work` uses `gitdir:`; `--remote github.com/acme` uses `hasconfig:remote.*.url:` so a repo cloned *anywhere* still gets the right identity, for https and ssh URLs alike |
| **SSH keys and signing per context** | Sets `core.sshCommand` so pushes use the right key, and SSH or GPG commit signing. Maintains an allowed-signers file so `git log --show-signature` verifies your own commits |
| **`whoami`** | The identity git will actually use here, and which file each value came from |
| **`doctor`** | Catches the classic mistakes: a global `[user]` block that silently overrides every context, `gitdir:` patterns missing their trailing slash, missing key files |
| **Identity guard** | Optional. Makes git *refuse* to commit where no context sets an email, instead of quietly using your personal address at work |
| **`audit`** | Scans a folder of repos for recent commits made with the wrong one of your emails |
| **Plays nicely with your config** | Only touches includes that point into `~/.gitconfig.d/`. Hand-written includes and everything else stay put. Backs up your gitconfig before every change |
| **Scriptable** | Every command works non-interactively with flags; `list`, `whoami`, `doctor` and `audit` have `--json` |

## Install

Needs Node.js 22.13+ and git 2.36+ (older git still does directory matching).

```bash
npm install -g git-context-switcher
git-context setup      # interactive wizard
```

## Quick start

```bash
# A context per identity
git-context add personal --dir ~/personal --email me@home.io -y
git-context add work --dir ~/work --remote github.com/acme --email me@acme.io --sign ssh --ssh-key ~/.ssh/id_acme -y

# Check it
git-context doctor
cd ~/work/api && git-context whoami

# Optional: refuse commits anywhere no context applies
git-context guard on

# Find past slips
git-context audit ~/src --since "6 months ago"
```

Upgrading from 1.x? Your contexts are migrated automatically the first time you run any command (your old `~/.gitcontexts` is kept as `~/.gitcontexts.v1.bak`). See the [changelog](CHANGELOG.md) for what changed.

## Documentation

- [Command reference](docs/COMMANDS.md)
- [How it works](docs/HOW_IT_WORKS.md)
- [Examples](docs/EXAMPLES.md)
- [Troubleshooting](docs/TROUBLESHOOTING.md)

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md). `npm run check` runs lint, type checks and tests; tests run real git in a throwaway home directory.

## License

MIT, see [LICENSE](LICENSE).

## Security

See [SECURITY.md](SECURITY.md).
