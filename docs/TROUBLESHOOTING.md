# Troubleshooting

Start with these two. They answer most questions:

```bash
git-context doctor
git-context whoami      # run inside the repo in question
```

## The wrong email is used

`whoami` shows which file each value comes from.

- **It comes from `~/.gitconfig`**: either no context matched (see below), or your global `[user]` section sits *after* the include blocks and overrides them. `doctor` reports that as an error; move the `[user]` section above the includes.
- **It comes from `.git/config`**: the repo has its own `user.email`, which beats everything. Remove it with `git config --unset user.email`.

## No context matches

- `whoami` says "Not inside a git repository": contexts only apply inside repos.
- Directory rule: check `list` shows a trailing slash (`~/work/`). Without it git only matches that exact repo. `doctor` warns about this.
- Symlinked folders: git matches the real path as well as the symlinked one, but only if the pattern spells one of them.
- Remote rule: needs git 2.36+ (`doctor` checks), and the repo needs a remote. Compare `git remote -v` with the patterns in `list`.
- Case: on macOS and Windows, `~/Work` and `~/work` are the same folder but different patterns to git.

## Commits are refused: "no email was given and auto-detection is disabled"

The identity guard is doing its job: no context applies here. Either add a context that covers this repo, set an email just for it (`git config user.email you@example.com`), or `git-context guard off`.

## Push uses the wrong GitHub account

GitHub picks the account from the SSH key. Give the context `--ssh-key`, then check `whoami` shows the `ssh` line. If you also have `IdentityFile` entries in `~/.ssh/config` for github.com, `IdentitiesOnly=yes` makes sure only the context's key is offered.

## Signed commits show as unverified locally

`git log --show-signature` needs an allowed-signers file. git-context maintains `~/.gitconfig.d/allowed_signers` and points `gpg.ssh.allowedSignersFile` at it, unless you already had that setting pointing elsewhere (`doctor` mentions it).

## Undo everything

```bash
git-context guard off
git-context list          # then: git-context remove <name> for each
```

Backups of your gitconfig from before each change are in `~/.gitconfig.d/backups/`.
