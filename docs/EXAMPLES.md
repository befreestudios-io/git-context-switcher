# Examples

## Personal and work, split by folder

```bash
git-context add personal --dir ~/personal --email me@home.io -y
git-context add work --dir ~/work --email me@acme.io -y
```

## Work repos cloned anywhere

Directory rules break the moment you clone into `/tmp` or a scratch folder. Match on the remote too:

```bash
git-context add work --dir ~/work --remote github.com/acme --remote gitlab.acme.io -y --email me@acme.io
```

## Two GitHub accounts, two SSH keys

GitHub picks the account from the SSH key, so the key has to switch with the identity:

```bash
git-context add personal --remote github.com/my-handle --ssh-key ~/.ssh/id_personal --email me@home.io -y
git-context add work     --remote github.com/acme      --ssh-key ~/.ssh/id_acme     --email me@acme.io -y
```

No `~/.ssh/config` host aliases needed; clone URLs stay exactly as GitHub shows them.

## SSH commit signing

```bash
git-context edit work --sign ssh --ssh-key ~/.ssh/id_acme -y
git log --show-signature -1     # verifies against ~/.gitconfig.d/allowed_signers
```

Upload the same public key to GitHub as a *signing* key to get the Verified badge.

## Extra per-context settings

```bash
git-context edit work --set pull.rebase=true --set 'url.git@github.com:.insteadOf=https://github.com/' -y
```

## Never commit as the wrong person again

```bash
git-context guard on
cd /tmp && git init x && cd x && git commit --allow-empty -m test
# fatal: no email was given and auto-detection is disabled
```

## Check a whole folder for slips

```bash
git-context audit ~/src --since "1 year ago"
```

## Move your setup to a new machine

```bash
git-context export > contexts.json      # old machine
git-context import contexts.json -y     # new machine
```

SSH key paths come across as-is, so copy or recreate the keys at the same paths.

## Dotfiles CI

```bash
git-context doctor --json | jq '.[] | select(.level == "error")'
```
