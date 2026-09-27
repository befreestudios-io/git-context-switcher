# How it works

Git already knows how to switch identities: [conditional includes](https://git-scm.com/docs/git-config#_conditional_includes). git-context writes and checks that config; it never runs in the background and never sits between you and git.

## What gets written

Each context is one file, `~/.gitconfig.d/<name>.gitconfig`:

```ini
[gitcontext]
	name = work
	description = Day job
[user]
	name = Burton
	email = me@acme.io
	signingkey = /home/burton/.ssh/id_acme.pub
[core]
	sshCommand = ssh -i ~/.ssh/id_acme -o IdentitiesOnly=yes
[gpg]
	format = ssh
[commit]
	gpgsign = true
[tag]
	gpgsign = true
```

Your global gitconfig gets one `includeIf` per condition, pointing at that file:

```ini
[includeIf "gitdir:~/work/"]
	path = ~/.gitconfig.d/work.gitconfig
[includeIf "hasconfig:remote.*.url:*://github.com/acme/**"]
	path = ~/.gitconfig.d/work.gitconfig
[includeIf "hasconfig:remote.*.url:*://*@github.com/acme/**"]
	path = ~/.gitconfig.d/work.gitconfig
[includeIf "hasconfig:remote.*.url:*@github.com:acme/**"]
	path = ~/.gitconfig.d/work.gitconfig
```

That's the whole state. There is no separate database: `list`, `whoami` and `doctor` read it straight back from git.

## Directory matching

`--dir ~/work` becomes `gitdir:~/work/`. The trailing slash matters: git reads it as "anything under ~/work". Without it, git only matches a repo whose `.git` is exactly `~/work/.git`. `doctor` warns about that.

## Remote matching

`--remote github.com/acme` becomes three `hasconfig:remote.*.url:` globs so it matches every URL form git accepts:

| Remote URL | Matched by |
|---|---|
| `https://github.com/acme/api.git` | `*://github.com/acme/**` |
| `ssh://git@github.com/acme/api.git` | `*://*@github.com/acme/**` |
| `git@github.com:acme/api.git` | `*@github.com:acme/**` |

The globs are anchored to the host, so `https://evil.example/github.com/acme/x` doesn't match. A pattern without a trailing wildcard covers everything under it; `github.com/*/work-*` matches repos named `work-…` in any org.

Remote matching needs git 2.36 or newer.

## Which includes are "ours"

An include is managed by git-context only if its `path` points at a file directly inside `~/.gitconfig.d/`. Anything else in your gitconfig, including includes you wrote yourself, is never modified.

## Order matters

Git applies config top to bottom and the last value wins. If your global gitconfig sets `[user] email` *after* the include blocks, it overrides every context. `doctor` checks for exactly this.

## Identity guard

`git-context guard on` sets git's own `user.useConfigOnly = true` and moves your global `user.email` into `gitcontext.savedEmail`. With no global email to fall back on, git refuses to commit anywhere no context sets one. `guard off` puts it back.

## Safety

- Every write goes through `git config`, so git does all parsing and quoting.
- Git is run with an argument list, never through a shell.
- The global gitconfig is backed up to `~/.gitconfig.d/backups/` before the first change in each run (the last 10 are kept).
- Context files are written to a temp file and renamed into place, with mode 600.
