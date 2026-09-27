# Releasing

Releases are driven by version tags. Pushing `vX.Y.Z` runs `.github/workflows/release.yml`, which checks the code, **stages** the package on npm and creates a draft GitHub release. Nothing goes live until you approve it with 2FA.

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
   - stages the package on npm with provenance via trusted publishing
   - creates a draft GitHub release with the CHANGELOG section as notes

4. Approve it. The workflow's summary page repeats these commands:

   ```bash
   npm stage list git-context-switcher
   npm stage approve <stage-id>              # asks for your 2FA code; the version goes live
   gh release edit vX.Y.Z --draft=false      # or publish the draft on GitHub
   ```

   Changed your mind? `npm stage reject <stage-id>`, delete the draft release, and delete the tag.

Prerelease versions (`2.1.0-beta.1`) are staged under the `next` dist-tag and marked as prereleases on GitHub.

## One-time setup

- **npm trusted publishing**: on npmjs.com, open the package's settings → Trusted Publisher → GitHub Actions, and enter owner `befreestudios-io`, repository `git-context-switcher`, workflow `release.yml`. Leave **Allow npm publish** unticked so the workflow can only stage. Under Publishing access, choose "Require two-factor authentication and disallow bypass 2fa tokens". The `NPM_TOKEN` repository secret is no longer used and can be deleted.
- **Codecov** (optional): the `CODECOV_TOKEN` secret enables coverage uploads from CI.

## If something fails

- **Before `Stage on npm`**: nothing was staged. Fix the problem, delete the tag (`git push --delete origin vX.Y.Z && git tag -d vX.Y.Z`), and tag again.
- **At `Create draft GitHub release`**: the package is staged but not live. Create the release by hand (`gh release create vX.Y.Z --notes-file <section>`) and carry on with the approval, or reject the staged package and start over.
