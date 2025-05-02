# How It Works

Git Context Switcher uses Git's [conditional includes](https://git-scm.com/docs/git-config#_conditional_includes) feature to apply different configurations based on the repository path or URL.

## Core Mechanism

The core mechanism of Git Context Switcher is quite simple but powerful:

1. **Configuration Organization**: The tool creates a `.gitconfig.d` directory in your home folder to store separate configuration files for each context.

2. **Conditional Includes**: It sets up conditional includes in your main `.gitconfig` file that tell Git which configuration file to use based on the repository location.

3. **Automatic Context Detection**: When you work in a repository, Git automatically uses the matching context's configuration, applying the correct user name, email, and other settings.

## Example Configuration Structure

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

## URL-Based Detection

For repositories that aren't organized by directory, Git Context Switcher also supports detecting contexts based on the repository's remote URL:

1. **URL Pattern Configuration**: Each context can have URL patterns associated with it.

2. **Pattern Matching**: The tool matches these patterns against the remote URL of the current repository.

3. **Pattern Priority**: If multiple contexts match a repository URL, the most specific pattern takes precedence.

The implementation uses these conditional includes:

```
[includeIf "hasconfig:remote.*.url:**/github.com/personal-org/**"]
    path = ~/.gitconfig.d/personal.gitconfig

[includeIf "hasconfig:remote.*.url:**/github.com/work-org/**"]
    path = ~/.gitconfig.d/work.gitconfig
```

## Command Implementation

The tool is built with a modular architecture:

1. **Command Structure**: Each command is implemented as a separate module with a consistent interface.

2. **Configuration Management**: The tool carefully manages the `.gitconfig` file, preserving existing settings while adding the conditional includes.

3. **User Interface**: Provides both interactive and non-interactive modes to accommodate different usage scenarios.

4. **Error Handling**: Implements safeguards like configuration backups to prevent data loss.

## Technical Details

Here are some additional technical details about the implementation:

- **Backup System**: Before making changes to your `.gitconfig`, the tool creates a backup with a timestamp.

- **Pattern Syntax**: Git's pattern matching syntax is used for directory paths, supporting wildcards and nested directories.

- **Path Normalization**: Handles different path formats across operating systems, ensuring the configuration works on Windows, macOS, and Linux.

- **Persistent Storage**: Context configurations are stored in individual files, making them easy to edit manually if needed.
