# Git Context Switcher

[![CI](https://github.com/befreestudios-io/git-context-switcher/actions/workflows/ci.yml/badge.svg)](https://github.com/befreestudios-io/git-context-switcher/actions/workflows/ci.yml)
[![codecov](https://codecov.io/gh/befreestudios-io/git-context-switcher/graph/badge.svg?token=5B3VS4IIVF)](https://codecov.io/gh/befreestudios-io/git-context-switcher)
[![npm version](https://img.shields.io/npm/v/git-context-switcher.svg)](https://www.npmjs.com/package/git-context-switcher)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

Switch between git contexts easily for different environments (personal, work, client projects, etc.) using Git's conditional includes.

## Features

### Interactive Setup Wizard

- Guides you through creating multiple context-specific configurations
- Automatically organizes the configs in your global .gitconfig file

### Multiple Context Support

- Supports any number of different contexts (personal, work, client1, client2, etc.)
- Each context gets its own configuration file

### Path-Based Pattern Matching

- Uses git's conditional includes based on repository paths
- Automatically applies the right identity based on where your repositories are located

### Configuration Management

- Creates a `.gitconfig.d` directory to organize your context-specific configs
- Backs up your existing configuration before making changes
- Handles existing conditional includes safely

## Installation

### NPM (Recommended)

The easiest way to install Git Context Switcher:

```bash
# Install globally for command-line use
npm install -g git-context-switcher

# After installation, you can use the command from anywhere
git-context --version
```

### Local Development Installation

```bash
# Clone the repository
git clone https://github.com/befreestudios-io/git-context-switcher.git
cd git-context-switcher

# Install dependencies
npm install

# Make the script executable
chmod +x index.js

# Create a global symlink to use the command anywhere
npm link
```

## Usage

### Setup Wizard

Run the interactive setup wizard to configure your git contexts:

```bash
git-context setup
```

The wizard will:

1. Create a `.gitconfig.d` directory in your home folder
2. Back up your existing git config
3. Guide you through setting up multiple contexts
4. Update your main `.gitconfig` with conditional includes

### Command Reference

Here's a complete reference of all available commands and their options:

#### Setup Command

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

#### Add Command

```bash
git-context add [options]
```

Add a new git context configuration.

Options:

- `--name <name>` - Context name
- `--path <path>` - Repository path pattern
- `--user-name <name>` - Git user name
- `--user-email <email>` - Git user email
- `--signing-key <key>` - GPG signing key
- `--no-interactive` - Skip interactive prompts

Example:

```bash
# Add a new context non-interactively
git-context add --name work --path ~/work/ --user-name "Work User" --user-email "work@example.com"
```

#### Remove Command

```bash
git-context remove [options]
```

Remove an existing git context.

Options:

- `--name <name>` - Context name to remove
- `--no-interactive` - Skip confirmation prompt

Example:

```bash
# Remove a context without confirmation
git-context remove --name old-client --no-interactive
```

#### List Command

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

#### Apply Command

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

### Detailed Examples

#### Example 1: Setting up personal and work contexts

```bash
# Run the setup wizard
git-context setup

# Enter personal context details
# Name: personal
# Path: ~/personal/
# User Name: Your Name
# User Email: your.email@personal.com
# (Optional) GPG Signing Key: ABC123DEF456

# Enter work context details
# Name: work
# Path: ~/work/
# User Name: Your Work Name
# User Email: your.name@company.com
# (Optional) GPG Signing Key: DEF456GHI789
```

This setup will:

1. Create `~/.gitconfig.d/personal.gitconfig` containing:

   ```
   [user]
       name = Your Name
       email = your.email@personal.com
       signingkey = ABC123DEF456
   ```

2. Create `~/.gitconfig.d/work.gitconfig` containing:

   ```
   [user]
       name = Your Work Name
       email = your.name@company.com
       signingkey = DEF456GHI789
   ```

3. Add to your main `~/.gitconfig`:

   ```
   [includeIf "gitdir:~/personal/"]
       path = ~/.gitconfig.d/personal.gitconfig

   [includeIf "gitdir:~/work/"]
       path = ~/.gitconfig.d/work.gitconfig
   ```

#### Example 2: Working with multiple client contexts

```bash
# Add a client context
git-context add --name client1 --path ~/clients/client1/ --user-name "Your Name" --user-email "you@client1.com"

# Add another client context
git-context add --name client2 --path ~/clients/client2/ --user-name "Your Name" --user-email "you@client2.com"

# Later, remove a client when no longer needed
git-context remove --name client1
```

## Troubleshooting

### Common Issues

#### Permission Errors

**Issue**: "Permission denied" errors when running the tool.

**Solution**: Ensure you have read and write permissions for your home directory and `.gitconfig` file.

```bash
# Check permissions
ls -la ~/.gitconfig
ls -la ~/.gitconfig.d

# Fix permissions if needed
chmod 600 ~/.gitconfig
chmod 700 ~/.gitconfig.d
```

#### Context Not Applied

**Issue**: Git is not using the correct context configuration.

**Solution**: Check that your repository path matches the pattern defined in your context.

```bash
# Check which context applies
git-context apply

# If needed, update your context with a more specific path
git-context add --name work --path ~/exact/path/to/work/repos/ --user-name "Work User" --user-email "work@example.com"
```

#### Merge Conflicts in .gitconfig

**Issue**: Git shows merge conflicts in your `.gitconfig` file.

**Solution**: The context switcher made changes to your config that conflict with other changes. Manually resolve the conflicts:

1. Check your backup config file (created automatically by the tool)
2. Manually merge the changes preserving both your modifications and the conditional includes

#### Invalid Context Configuration

**Issue**: Error message about invalid configuration when adding a context.

**Solution**: Ensure your repository path pattern is valid and follows Git's pattern syntax:

```bash
# Use absolute paths with correct syntax
git-context add --name personal --path "/Users/username/personal/**"

# On Windows use proper path format
git-context add --name work --path "C:/Users/username/work/**"
```

### Fixing Misconfigured Contexts

If your contexts are misconfigured, you can:

1. List all contexts to identify issues:

   ```bash
   git-context list
   ```

2. Remove problematic contexts:

   ```bash
   git-context remove --name problem-context
   ```

3. Add them back with correct settings:

   ```bash
   git-context add --name fixed-context --path correct/path/ --user-name "Name" --user-email "email@example.com"
   ```

4. If all else fails, you can start fresh:
   ```bash
   git-context setup --force
   ```

## How It Works

Git Context Switcher uses Git's [conditional includes](https://git-scm.com/docs/git-config#_conditional_includes) feature to apply different configurations based on the repository path.

For example, if you have:

- Personal projects in `~/personal/`
- Work projects in `~/work/`

The tool will create:

1. A `.gitconfig.d` directory with separate config files:

   - `.gitconfig.d/personal.gitconfig`
   - `.gitconfig.d/work.gitconfig`

2. Add these conditional includes to your main `.gitconfig`:

   ```
   [includeIf "gitdir:~/personal/**"]
       path = ~/.gitconfig.d/personal.gitconfig

   [includeIf "gitdir:~/work/**"]
       path = ~/.gitconfig.d/work.gitconfig
   ```

When you work in different repositories, Git automatically applies the correct configuration based on the repository path.

## Versioning

Git Context Switcher follows [Semantic Versioning](https://semver.org/). For the versions available, see the [tags on this repository](https://github.com/befreestudios-io/git-context-switcher/tags) or check the [CHANGELOG.md](CHANGELOG.md) file.

For maintainers and contributors looking to release new versions, please see our [Release Process](RELEASING.md) documentation.

## License

MIT

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

Please make sure your code follows the existing style and passes all tests.

For more information about our development process, coding standards, and CI/CD pipeline, see our [Contributing Guidelines](CONTRIBUTING.md).

## Security

For security issues, please see our [Security Policy](SECURITY.md).
