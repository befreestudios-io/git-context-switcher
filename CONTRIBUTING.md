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
4. Run tests (`npm test`) and linting (`npm run lint`)
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

# Run tests
npm test

# Run linting
npm run lint
```

## Testing

We use Jest for testing. All new code should include appropriate tests.

```bash
# Run all tests
npm test

# Run tests with coverage reporting
npm run test:coverage

# Run tests in watch mode during development
npm run test:watch
```

## Style Guide

We enforce our code style using ESLint. Run the linter with:

```bash
npm run lint
```

## License

By contributing to Git Context Switcher, you agree that your contributions will be licensed under the project's MIT license.