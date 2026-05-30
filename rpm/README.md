# `rpm/` — mixed input + transient-output area

This directory has two distinct roles, both consumed by
`.github/workflows/update-repos.yml`. **R2 is the source of truth
for published packages and repodata** as of 2026-04-17.

## INPUTS (checked-in, load-bearing)

These files are uploaded verbatim to R2 by `update-repos.yml` on each
run; the in-tree copy is canonical:

- `RPM-GPG-KEY` — the public half of the RPM signing key. Uploaded to
  `s3://<bucket>/rpm/RPM-GPG-KEY` by `update-repos.yml` (line 363).
  Also baked into the `xiboplayer-release` RPM by
  `build-release-pkg.yml` (line 42).
- `xibo-players.repo` — the dnf `.repo` config consumers download from
  `https://dl.xiboplayer.org/rpm/xibo-players.repo`. Uploaded by
  `update-repos.yml` (line 367-369). The filename is part of the
  public contract — downstream consumers have it pinned in
  `/etc/yum.repos.d/`, so do **not** rename without a deprecation
  window even though `xibo-players` is the pre-2026-04-19 org slug.

## TRANSIENT OUTPUT (regenerated on every workflow run)

- `fedora/{43,44}/{x86_64,aarch64,noarch,SRPMS}/repodata/*` — repodata
  produced by `createrepo_c` inside the GitHub Actions runner.
  `update-repos.yml` downloads RPMs from R2 into these paths, runs
  `createrepo_c`, then uploads everything back to R2. The files
  currently checked in here are **stale leftovers from before R2
  became the source of truth** and have no functional effect — the
  workflow overwrites them. They are kept tracked for now to avoid
  introducing a `.gitignore` carve-out mid-task; pending a separate
  audit they are safe to remove from the working tree.

## Editing

- `RPM-GPG-KEY` and `xibo-players.repo` may be edited in-tree and the
  change takes effect on the next `update-repos.yml` run.
- `fedora/**` should **not** be edited by hand — anything you put
  there is overwritten on the next workflow run.

See also: `_repos/README.md` for the `xiboplayer-release` package
sources.
