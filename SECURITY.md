# Security Policy

## Supported Versions

| Version | Supported          |
| ------- | ------------------ |
| 1.0.x   | :white_check_mark: |

## Reporting a Vulnerability

If you discover a security vulnerability within this project, please report it through GitHub's private vulnerability reporting feature at [https://github.com/yourusername/git-context-switcher/security/advisories/new](https://github.com/yourusername/git-context-switcher/security/advisories/new) or send an email to security@yourdomain.com. All security vulnerabilities will be promptly addressed.

Please include the following information in your report:

- Type of issue (e.g., buffer overflow, SQL injection, cross-site scripting, etc.)
- Full paths of source file(s) related to the issue
- Steps to reproduce the issue
- Proof-of-concept or exploit code (if possible)
- Impact of the issue, including how an attacker might exploit it

Please do not disclose security vulnerabilities publicly until they have been addressed by the maintainers.

## Security Practices

This project follows these security best practices:

1. **Input Validation**: All user inputs are validated and sanitized before use
2. **Path Traversal Prevention**: File operations are secured against path traversal attacks
3. **Restrictive File Permissions**: Config files are created with restrictive permissions
4. **Code Security Linting**: Code is linted with eslint-plugin-security

## Security Considerations for Users

When using this tool:

1. Keep your Node.js installation up to date
2. Ensure your git installation is up to date
3. Use caution when configuring path patterns that match sensitive repositories
4. Consider using GPG key signing for all contexts that handle sensitive or professional code
5. Regularly check your git configuration to ensure it hasn't been tampered with