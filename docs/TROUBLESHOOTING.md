# Troubleshooting

This document provides solutions for common issues when using Git Context Switcher.

## Common Issues

### Permission Errors

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

### Context Not Applied

**Issue**: Git is not using the correct context configuration.

**Solution**: Check that your repository path matches the pattern defined in your context.

```bash
# Check which context applies
git-context apply

# If needed, update your context with a more specific path
git-context add --name work --path ~/exact/path/to/work/repos/ --user-name "Work User" --user-email "work@example.com"
```

### Merge Conflicts in .gitconfig

**Issue**: Git shows merge conflicts in your `.gitconfig` file.

**Solution**: The context switcher made changes to your config that conflict with other changes. Manually resolve the conflicts:

1. Check your backup config file (created automatically by the tool)
2. Manually merge the changes preserving both your modifications and the conditional includes

### Invalid Context Configuration

**Issue**: Error message about invalid configuration when adding a context.

**Solution**: Ensure your repository path pattern is valid and follows Git's pattern syntax:

```bash
# Use absolute paths with correct syntax
git-context add --name personal --path "/Users/username/personal/**"

# On Windows use proper path format
git-context add --name work --path "C:/Users/username/work/**"
```

## Fixing Misconfigured Contexts

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

## URL Pattern Issues

### URL Patterns Not Matching

**Issue**: URL-based context detection isn't working as expected.

**Solution**: Make sure your URL patterns are correctly formatted:

1. Check your current URL patterns:

   ```bash
   git-context list --detail
   ```

2. Make sure the pattern matches both HTTPS and SSH URL formats:

   ```bash
   # Good pattern (matches both formats):
   github.com/org-name/*

   # Instead of specific format patterns:
   https://github.com/org-name/*
   git@github.com:org-name/*
   ```

3. Test URL detection explicitly:
   ```bash
   # Check which context applies to the current repo's URL
   git-context detect-url
   ```

## Import/Export Issues

### Import Fails

**Issue**: Importing contexts from a file fails.

**Solution**:

1. Make sure the JSON file has the correct format:

   ```json
   [
     {
       "name": "context-name",
       "path": "~/path/pattern/",
       "userName": "Git User",
       "userEmail": "user@example.com",
       "signingKey": "optional-gpg-key",
       "urlPatterns": ["github.com/org/*"]
     }
   ]
   ```

2. Try using the `--merge` option to avoid conflicts with existing contexts:
   ```bash
   git-context import --file contexts.json --merge
   ```

## System-Specific Issues

### Windows Path Issues

**Issue**: Context paths don't work correctly on Windows.

**Solution**: Use forward slashes and proper Windows path format:

```bash
# Correct Windows path format with forward slashes
git-context add --name work --path "C:/Users/username/work/**"
```

### macOS/Linux Path Issues

**Issue**: Home directory shorthand not working.

**Solution**: Git Context Switcher should automatically expand `~` to your home directory, but if issues arise:

```bash
# Use explicit home path if ~ doesn't work
git-context add --name personal --path "/home/username/personal/**"
```

## Getting Help

If you encounter an issue not covered here:

1. Check the GitHub repository for open issues: [Git Context Switcher Issues](https://github.com/befreestudios-io/git-context-switcher/issues)

2. Open a new issue with:
   - The command you ran
   - The error message
   - Your OS and Git version
   - Relevant parts of your configuration (remove sensitive information)
