# Git Context Switcher

[![CI](https://github.com/befreestudios-io/git-context-switcher/actions/workflows/ci.yml/badge.svg)](https://github.com/befreestudios-io/git-context-switcher/actions/workflows/ci.yml)
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

### Add a New Context

```bash
git-context add
```

### Remove a Context

```bash
git-context remove
```

### List All Configured Contexts

```bash
git-context list
```

### Check Current Context

Check which context is active in the current directory:

```bash
git-context apply
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

## Security

For security issues, please see our [Security Policy](SECURITY.md).
