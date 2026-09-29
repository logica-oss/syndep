# syndep

Sync `node_modules` after git operations when manifests drifted.

`syndep` is a hook body: it hashes `package.json` plus lockfiles, compares against the recorded hash in `node_modules/.cache/syndep/`, and runs the right package-manager install when they differ (or when `node_modules` is missing). It never fails the git operation; install failures only warn.

## Install

```sh
npm i -D syndep simple-git-hooks
```

Wire the hooks in `package.json` (hook installation itself is delegated to `simple-git-hooks`):

```json
{
  "simple-git-hooks": {
    "post-merge": "npx syndep",
    "post-checkout": "npx syndep",
    "post-rewrite": "npx syndep"
  }
}
```

`simple-git-hooks` installs hooks on `prepare` (`npm run prepare` runs automatically on local `npm install`).

## How it works

- Detection order: `packageManager` field → lockfile → `npm_config_user_agent`.
- Hashed files follow the detected manager: `package.json` plus its lockfile (`bun.lock(b)`, `pnpm-lock.yaml`, `yarn.lock`, `package-lock.json`, `deno.lock(b)`); `deno.json(c)` only when Deno is detected.
- Hash is self-computed (sha256), so it works outside git checkouts too.
- Record lives at `node_modules/.cache/syndep/hash`: gitignore-free, and naturally resets when `node_modules` is removed.
- Missing `node_modules` always counts as drift.
- Recursion guard via `SYNDEP_RUNNING=1` while the install runs.
- On CI (`CI=true` or `CI=1`), npm switches to `npm ci`; bun/pnpm use `--frozen-lockfile`, yarn uses `--immutable`.

## Bins

- `syndep` (`#!/usr/bin/env node`): primary entry, works from npm/pnpm/yarn/bun via `npx`/`bunx`.
- `syndep-bun` (`#!/usr/bin/env bun`): thin variant with the same body for Bun-only environments without node.

## License

MIT
