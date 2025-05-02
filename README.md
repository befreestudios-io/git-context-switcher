# Git Context Switcher <img src="assets/logo_concept.png" alt="Git Context Switcher Logo" width="200" align="right">

[![CI](https://github.com/befreestudios-io/git-context-switcher/actions/workflows/ci.yml/badge.svg)](https://github.com/befreestudios-io/git-context-switcher/actions/workflows/ci.yml)
[![codecov](https://codecov.io/gh/befreestudios-io/git-context-switcher/graph/badge.svg?token=5B3VS4IIVF)](https://codecov.io/gh/befreestudios-io/git-context-switcher)
[![npm version](https://img.shields.io/npm/v/git-context-switcher.svg)](https://www.npmjs.com/package/git-context-switcher)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

Switch between git contexts easily for different environments (personal, work, client projects, etc.) using Git's conditional includes.

## Table of Contents

- [Features](#features)
- [Installation](#installation)
- [Quick Start](#quick-start)
- [Documentation](#documentation)
  - [Command Reference](docs/COMMANDS.md)
  - [Usage Examples](docs/EXAMPLES.md)
  - [How It Works](docs/HOW_IT_WORKS.md)
  - [Troubleshooting](docs/TROUBLESHOOTING.md)
- [Contributing](#contributing)
- [License](#license)
- [Security](#security)

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

### Repository URL-Based Detection (New in v1.1.0)

- Automatically detect the appropriate context based on repository remote URLs
- Match GitHub, GitLab, or any git hosting provider with flexible pattern matching
- Supports both HTTPS and SSH remote URL formats

### Context Templates (New in v1.1.0)

- Quickly create new contexts using predefined templates
- Built-in templates for common scenarios (personal, work, client projects, open source)
- Auto-configure URL patterns for easier setup

### Import/Export Capability (New in v1.1.0)

- Share context configurations between machines or team members
- Export your contexts to a single JSON file
- Import contexts from a shared configuration file

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

## Quick Start

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

### Basic Usage

Once set up, Git will automatically use the correct identity based on your repository location. You can also use these commands:

```bash
# List all your configured contexts
git-context list

# Check which context applies to the current directory
git-context apply

# Add a new context
git-context add
```

## Documentation

For more detailed information, please see the following documentation:

- [Command Reference](docs/COMMANDS.md) - Complete reference for all commands and options
- [Usage Examples](docs/EXAMPLES.md) - Detailed examples showing common use cases
- [How It Works](docs/HOW_IT_WORKS.md) - Technical explanation of how the tool works
- [Troubleshooting](docs/TROUBLESHOOTING.md) - Solutions for common issues

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
