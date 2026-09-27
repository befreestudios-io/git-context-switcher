# Contributing to Git Context Switcher

Thank you for considering contributing to Git Context Switcher! This document provides guidelines and instructions to help you get started.

## Code of Conduct

By participating in this project, you agree to maintain a respectful and inclusive environment for everyone.

## How Can I Contribute?

### Reporting Bugs

Before submitting a bug report:
- Check the issue tracker to see if the bug has already been reported
- Collect information about the problem (Node.js version, Git version, OS details, etc.)

When submitting a bug report, include:
- A clear description of the issue
- Steps to reproduce the problem
- Expected vs. actual behavior
- Any supporting screenshots or logs

### Suggesting Enhancements

When suggesting enhancements:
- Provide a clear description of your idea
- Explain why this enhancement would be useful to most users
- Consider potential drawbacks or alternative approaches

### Pull Requests

1. Fork the repository
2. Create a new branch for your feature (`git checkout -b feature/amazing-feature`)
3. Make your changes
4. Run `npm run check` (lint, type check and tests)
5. Commit your changes (`git commit -m 'Add some amazing feature'`)
6. Push to your branch (`git push origin feature/amazing-feature`)
7. Open a Pull Request

#### Pull Request Guidelines

- Follow the existing code style and conventions
- Include tests for new functionality
- Update documentation if necessary
- Keep PRs focused on a single concern
- Link any relevant issues in the PR description

## Development Setup

```bash
# Clone your fork of the repository
git clone https://github.com/YOUR_USERNAME/git-context-switcher.git

# Navigate to the project directory
cd git-context-switcher

# Install dependencies
npm install

# Lint, type check and test
npm run check
```

You need Node.js 22.13+ and git 2.36+.

## Testing

Tests use Node's built-in test runner (`node:test`) and run real git against a throwaway home directory (see `test/helpers.js`), so they never touch your own gitconfig. Prefer asserting on what git actually resolves (`git config --get` inside a repo) over asserting on file contents.

```bash
npm test                # all tests
npm run test:coverage   # with coverage (writes lcov.info)
node --test --watch "test/**/*.test.js"
```

## Types

The code is plain JavaScript with JSDoc types, checked by `npm run typecheck` (TypeScript's `checkJs`). There's no build step: what's in `lib/` is what ships.

## Style Guide

We enforce our code style using ESLint. Run the linter with:

```bash
npm run lint
```

## License

By contributing to Git Context Switcher, you agree that your contributions will be licensed under the project's MIT license.