# Release Process

This document describes how to release new versions of `git-context-switcher` using our automated CI/CD pipeline.

## Release Pipeline Overview

Our release process is fully automated via GitHub Actions and follows semantic versioning principles. The pipeline includes:

1. **Continuous Integration** - Testing and validating code
2. **Automated Release Management** - Preparing new versions
3. **GitHub Release Creation** - Creating tags and releases
4. **NPM Publishing** - Publishing the package to npm

## How to Use This Pipeline

### For Regular Development

1. Work on feature branches
2. Submit PRs for review
3. The CI workflow (`ci.yml`) ensures code quality by running tests and linting

### For Releasing a New Version

#### 1. Initiate a Release

- Go to the "Actions" tab in your GitHub repository
- Select the "Release Management" workflow
- Click "Run workflow"
- Choose the release type:
  - **patch** (1.0.0 → 1.0.1) - For backwards-compatible bug fixes
  - **minor** (1.0.0 → 1.1.0) - For backwards-compatible new features
  - **major** (1.0.0 → 2.0.0) - For breaking changes
- Optionally add a pre-release label (e.g., "beta.1", "rc.1") for pre-releases

#### 2. Review and Finalize the Release

- Review the automatically created PR that includes:
  - Updated version in package.json
  - Updated CHANGELOG.md with a template for your release notes
- Update the CHANGELOG.md with detailed release notes describing all changes
- Merge the PR when ready

#### 3. Automatic Publishing

Upon PR merge, the following happens automatically:

- GitHub creates a release and tag based on the version
- The npm-publish workflow detects the new release and:
  - Runs tests to ensure everything works
  - Publishes to npm
  - Updates the GitHub release with information about the npm package

## Semantic Versioning Guidelines

We follow [Semantic Versioning](https://semver.org/) for all releases:

- **MAJOR (X.0.0)**: Breaking changes that are not backward compatible
- **MINOR (0.X.0)**: New features that are backward compatible
- **PATCH (0.0.X)**: Bug fixes and minor improvements that are backward compatible
- **Pre-releases**: Append `-alpha.1`, `-beta.1`, or `-rc.1` for pre-release versions

## Troubleshooting

If you encounter issues with the release process:

1. **GitHub Actions failed**:

   - Check the specific workflow logs in the Actions tab
   - Make sure all tests are passing
   - Ensure CHANGELOG.md is properly updated

2. **npm publishing failed**:

   - Verify that the NPM_TOKEN secret is properly set in repository settings
   - Check that the version doesn't already exist on npm

3. **Release PR issues**:
   - Make sure your branch is up to date with the main/master branch
   - Check that you have proper permissions to create PRs

## Manual Release (Fallback)

In case the automated process fails, you can perform a manual release:

1. Update the version in package.json
2. Update CHANGELOG.md
3. Create and push a git tag: `git tag -a v1.0.1 -m "Version 1.0.1"`
4. Push the tag: `git push origin v1.0.1`
5. Create a GitHub release from the tag
6. Run `npm publish` locally (make sure you're logged in to npm)
