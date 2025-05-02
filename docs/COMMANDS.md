# Command Reference

This document provides a complete reference for all commands and options available in Git Context Switcher.

## Setup Command

```bash
git-context setup [options]
```

Initialize and configure git contexts with an interactive wizard.

Options:

- `--force` - Override existing configuration
- `--quiet` - Reduce console output

Example:

```bash
# Run setup with minimal output
git-context setup --quiet
```

## Add Command

```bash
git-context add [options]
```

Add a new git context configuration.

Options:

- `--name <n>` - Context name
- `--path <path>` - Repository path pattern
- `--user-name <n>` - Git user name
- `--user-email <email>` - Git user email
- `--signing-key <key>` - GPG signing key
- `--no-interactive` - Skip interactive prompts

Example:

```bash
# Add a new context non-interactively
git-context add --name work --path ~/work/ --user-name "Work User" --user-email "work@example.com"
```

## Remove Command

```bash
git-context remove [options]
```

Remove an existing git context.

Options:

- `--name <n>` - Context name to remove
- `--no-interactive` - Skip confirmation prompt

Example:

```bash
# Remove a context without confirmation
git-context remove --name old-client --no-interactive
```

## List Command

```bash
git-context list [options]
```

List all configured contexts.

Options:

- `--format <format>` - Output format (text, json)

Example:

```bash
# List contexts in JSON format
git-context list --format json
```

## Apply Command

```bash
git-context apply [options]
```

Check which context applies to the current directory.

Options:

- `--detail` - Show detailed configuration

Example:

```bash
# Show detailed context information for current directory
git-context apply --detail
```

## Detect URL Command (New in v1.1.0)

```bash
git-context detect-url [options]
```

Detect the appropriate context based on the repository remote URL.

Options:

- `--remote <n>` - Specify remote name (default: origin)

Example:

```bash
# Detect context using upstream remote instead of origin
git-context detect-url --remote upstream
```

## Templates Command (New in v1.1.0)

```bash
git-context templates
```

List available context templates for quick setup.

Example:

```bash
# View all available templates
git-context templates
```

## Export Command (New in v1.1.0)

```bash
git-context export [options]
```

Export your contexts to a JSON file for sharing or backup.

Options:

- `--file <path>` - Specify output file path (default: ./git-contexts-export.json)
- `--no-interactive` - Skip interactive prompts

Example:

```bash
# Export to a custom location
git-context export --file ~/backups/my-contexts.json
```

## Import Command (New in v1.1.0)

```bash
git-context import [options]
```

Import contexts from a JSON file.

Options:

- `--file <path>` - Specify import file path
- `--merge` - Merge with existing contexts (default behavior)
- `--replace` - Replace existing contexts with same names
- `--no-interactive` - Skip interactive prompts

Example:

```bash
# Import contexts and replace any with the same names
git-context import --file ~/shared-configs/team-contexts.json --replace
```
