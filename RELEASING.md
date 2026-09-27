# Releasing

Releases are driven by version tags. Pushing `vX.Y.Z` runs `.github/workflows/release.yml`, which checks, publishes to npm and creates the GitHub release.

## Steps

1. On `main`, move the changes from `## [X.Y.Z] - Unreleased` (or add a section) in `CHANGELOG.md` and give it today's date. The release notes are taken from this section, and the release fails if it's missing.
2. Bump the version and tag in one go:

   ```bash
   npm version major   # or minor / patch / prerelease --preid beta
   git push --follow-tags
   ```

   `npm version` updates `package.json` and `package-lock.json`, commits, and creates the `vX.Y.Z` tag.

3. Watch the **Release** workflow in the Actions tab. It:
   - runs `npm run check` (lint, type check, tests)
   - fails if the tag doesn't match `package.json`
   - publishes to npm with provenance via trusted publishing
   - creates the GitHub release with the CHANGELOG section as notes

Prerelease versions (`2.1.0-beta.1`) are published under the `next` dist-tag and marked as prereleases on GitHub.

## One-time setup

- **npm trusted publishing**: on npmjs.com, open the package's settings → Trusted publishing → GitHub Actions, and enter owner `befreestudios-io`, repository `git-context-switcher`, workflow `release.yml`. Once a release has gone through, the `NPM_TOKEN` repository secret is no longer used and can be deleted.
- **Codecov** (optional): the `CODECOV_TOKEN` secret enables coverage uploads from CI.

## If something fails

- **Before `Publish to npm`**: nothing was published. Fix the problem, delete the tag (`git push --delete origin vX.Y.Z && git tag -d vX.Y.Z`), and tag again.
- **After npm publish, at `Create GitHub release`**: the package is out; create the release by hand from the tag (`gh release create vX.Y.Z --notes-file <section>`). npm versions can't be republished, so don't re-run the whole job.
