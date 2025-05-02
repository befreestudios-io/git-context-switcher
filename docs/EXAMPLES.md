# Usage Examples

This document provides detailed examples of common use cases for Git Context Switcher.

## Example 1: Setting up personal and work contexts

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

## Example 2: Working with multiple client contexts

```bash
# Add a client context
git-context add --name client1 --path ~/clients/client1/ --user-name "Your Name" --user-email "you@client1.com"

# Add another client context
git-context add --name client2 --path ~/clients/client2/ --user-name "Your Name" --user-email "you@client2.com"

# Later, remove a client when no longer needed
git-context remove --name client1
```

## Example 3: Using repository URL detection (New in v1.1.0)

```bash
# First, configure contexts with URL patterns
git-context add

# During the interactive setup:
# Name: github-personal
# Path Pattern: ~/repos/personal/**
# User Name: Your Name
# User Email: personal@example.com
# Add URL Patterns? Yes
# URL Pattern: github.com/your-username/*
# URL Pattern: <press Enter to finish>

# Add another context for work
git-context add

# Name: github-work
# Path Pattern: ~/repos/work/**
# User Name: Your Work Name
# User Email: you@company.com
# Add URL Patterns? Yes
# URL Pattern: github.com/company-org/*
# URL Pattern: <press Enter to finish>

# Now in any git repository, you can detect the context based on the remote URL
cd ~/projects/any-location/company-project/
git-context detect-url
# This will show: "Repository URL matches context: github-work"
```

This example demonstrates how Git Context Switcher can automatically use the right identity based on the remote repository URL, regardless of where the repository is located on your filesystem.

## Example 4: Using templates and import/export (New in v1.1.0)

```bash
# List available templates
git-context templates

# Add a new context using a template
git-context add
# Select "Use a template? Yes"
# Select template: personal
# Enter name: my-personal
# Enter path pattern: ~/projects/**
# Enter user name and email

# Export your contexts to share with teammates or use on another machine
git-context export
# Enter export path: ./my-contexts.json

# On another machine, import your contexts
git-context import
# Enter import path: ./my-contexts.json
# Select contexts to import
# Choose whether to replace existing contexts with same names
```

This allows you to quickly set up consistent contexts across different machines and share standard configurations with team members.
