# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

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

[1.1.0]: https://github.com/befreestudios-io/git-context-switcher/compare/v1.0.0...v1.1.0
[1.0.0]: https://github.com/befreestudios-io/git-context-switcher/releases/tag/v1.0.0
