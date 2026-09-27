# Command reference

Every command that asks questions also takes flags; `-y` skips the prompts. Prompts only appear in an interactive terminal.

## `setup`

Interactive wizard: pick a template, answer a few questions, repeat for each context, then optionally turn on the identity guard.

## `add [name]`

| Flag | |
|---|---|
| `--dir <path>` | Directory the context applies to. Repeatable. `~`, absolute and relative paths all work |
| `--remote <pattern>` | Remote it applies to, e.g. `github.com/acme` or `github.com/*/work-*`. Repeatable. Paste a clone URL if you like |
| `--user-name <name>` | `user.name` (leave out to keep your global name) |
| `--email <email>` | `user.email` |
| `--ssh-key <path>` | Private key for push/pull; sets `core.sshCommand` |
| `--sign <ssh\|gpg\|none>` | Sign commits and tags |
| `--signing-key <key>` | SSH public key path (defaults to `<ssh-key>.pub`) or GPG key id |
| `--set <key=value>` | Any other git config for this context. Repeatable |
| `--description <text>` | Shown in `list` |
| `--template <name>` | Pre-fill from a template (see `templates`) |
| `--force` | Overwrite an existing context with the same name |
| `-y, --yes` | Don't prompt |

```bash
git-context add oss --dir ~/oss --email me@users.noreply.github.com --set pull.rebase=true -y
```

## `edit <name>`

Same flags as `add`. Flags you pass replace the old values; prompts are pre-filled with the current ones. Settings added with `--set` are kept unless you override them.

## `remove <name>` (alias `rm`)

Removes the context's file and its includes. `-y` skips confirmation.

## `list` (alias `ls`)

Every context with its directories, remotes, identity and file. `--json` for scripts.

## `whoami`

The identity git will use in the current directory and the file each value comes from. `--json` for scripts. Outside a repo no context applies, so it shows your global settings.

## `doctor`

Read-only health check. Exits 1 if it finds an error, so it works in a dotfiles CI job. `--json` for scripts.

## `guard [on|off|status]`

Turns the identity guard on or off, or shows its status (default).

## `audit [dir]`

Finds repos under `dir` (default: current directory) and lists recent commits whose author email is one of yours but isn't the one git resolves for that repo today. Exits 1 if it finds any.

| Flag | Default |
|---|---|
| `--depth <n>` | `3` |
| `--since <when>` | `"90 days ago"` (anything `git log --since` accepts) |
| `--json` | |

## `templates`

Lists the built-in templates: `personal`, `work`, `client`, `opensource`.

## `export [file]` / `import <file>`

`export` writes every context as JSON (to stdout without a file). `import` reads that format, or a 1.x export. Existing contexts are skipped unless you pass `--replace`; `-y` imports everything without the picker.

## `migrate`

Converts a 1.x setup. It runs automatically the first time you use any other command, so you rarely need it.

## Removed in 2.0

`apply` and `detect-url` still run but now just call `whoami`.
