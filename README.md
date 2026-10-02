# syndep

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![autofix.ci](https://github.com/logica-oss/syndep/actions/workflows/autofix.yaml/badge.svg)](https://github.com/logica-oss/syndep/actions/workflows/autofix.yaml)
[![Verify (App)](https://github.com/logica-oss/syndep/actions/workflows/verify-app.yaml/badge.svg)](https://github.com/logica-oss/syndep/actions/workflows/verify-app.yaml)
[![Verify (Actions)](https://github.com/logica-oss/syndep/actions/workflows/verify-actions.yaml/badge.svg)](https://github.com/logica-oss/syndep/actions/workflows/verify-actions.yaml)
[![CodeQL Advanced](https://github.com/logica-oss/syndep/actions/workflows/codeql.yaml/badge.svg)](https://github.com/logica-oss/syndep/actions/workflows/codeql.yaml)

Sync `node_modules` after git operations when manifests drifted.  
Syncs when `package.json` or lockfiles changed, or when `node_modules` is missing.

Requires Node.js 20 or later (`syndep-bun` runs on Bun without Node).

## What is syndep?

### What it does

- Auto-installs dependencies only when manifests changed or `node_modules` is missing; stays silent otherwise.
- Never blocks git, even if install fails.

### What it is for

- Runs from git hooks (`post-merge`, `post-checkout`, `post-rewrite`) to keep `node_modules` fresh after `pull` and branch switches.
- `syndep` itself does not manage hooks; hook installation is delegated to other tools like [`simple-git-hooks`](https://github.com/toplenboren/simple-git-hooks).

## Usage

Pairing with [`simple-git-hooks`](https://github.com/toplenboren/simple-git-hooks) is recommended.  
Hook installation itself is delegated to `simple-git-hooks`.

Pick your package manager below.

<details>
<summary>npm</summary>

Install `syndep` plus `simple-git-hooks`:

```sh
npm i -D syndep simple-git-hooks
```

Wire the hooks in `package.json`:

```json
{
  "scripts": {
    "prepare": "simple-git-hooks"
  },
  "simple-git-hooks": {
    "post-merge": "npm exec -- syndep",
    "post-checkout": "npm exec -- syndep",
    "post-rewrite": "npm exec -- syndep"
  }
}
```

Hooks are installed on `prepare` (`prepare` runs automatically on local install):

```sh
npm install
```

</details>

<details>
<summary>pnpm</summary>

Install `syndep` plus `simple-git-hooks`:

```sh
pnpm add -D syndep simple-git-hooks
```

Wire the hooks in `package.json`:

```json
{
  "scripts": {
    "prepare": "simple-git-hooks"
  },
  "simple-git-hooks": {
    "post-merge": "pnpm syndep",
    "post-checkout": "pnpm syndep",
    "post-rewrite": "pnpm syndep"
  }
}
```

Hooks are installed on `prepare` (`prepare` runs automatically on local install):

```sh
pnpm install
```

</details>

<details>
<summary>yarn</summary>

Install `syndep` plus `simple-git-hooks`:

```sh
yarn add -D syndep simple-git-hooks
```

Wire the hooks in `package.json`:

```json
{
  "scripts": {
    "prepare": "simple-git-hooks"
  },
  "simple-git-hooks": {
    "post-merge": "yarn syndep",
    "post-checkout": "yarn syndep",
    "post-rewrite": "yarn syndep"
  }
}
```

Hooks are installed on `prepare` (`prepare` runs automatically on local install):

```sh
yarn install
```

</details>

<details>
<summary>bun</summary>

Install `syndep` plus `simple-git-hooks`:

```sh
bun add -d syndep simple-git-hooks
```

Wire the hooks in `package.json`:

```json
{
  "scripts": {
    "prepare": "simple-git-hooks"
  },
  "simple-git-hooks": {
    "post-merge": "bun run syndep-bun",
    "post-checkout": "bun run syndep-bun",
    "post-rewrite": "bun run syndep-bun"
  }
}
```

Uses `syndep-bun`, so it runs without node.

Hooks are installed on `prepare` (`prepare` runs automatically on local install):

```sh
bun install
```

</details>

<details>
<summary>deno</summary>

Install `syndep` plus `simple-git-hooks`:

```sh
deno add -D npm:syndep npm:simple-git-hooks
```

`deno.json(c)`:

```json
{
  "tasks": {
    "syndep": "syndep"
  }
}
```

`package.json`:

```json
{
  "scripts": {
    "prepare": "simple-git-hooks"
  },
  "simple-git-hooks": {
    "post-merge": "deno task syndep",
    "post-checkout": "deno task syndep",
    "post-rewrite": "deno task syndep"
  }
}
```

Hooks are installed on `prepare` (`prepare` runs automatically on local install):

```sh
deno install
```

</details>

## Why syndep?

Similar tools for this already existed, but each had a drawback, so syndep was built to cover them.

### [post-merge-install](https://www.npmjs.com/package/post-merge-install)

- Only covers npm / yarn.
- Includes hook setup; only handles `post-merge` / `post-rebase`.
- No release since 2021.

### [install-deps-postmerge](https://github.com/camacho/install-deps-postmerge)

- Only covers npm / yarn.
- Includes hook setup; only handles `post-merge`.
- Stops working outside git checkouts.
- No release since 2020.

### [package-changed](https://github.com/thdk/package-changed)

- npm-centered.
- Needs a separate `.packagehash` file you have to gitignore.
- No release since 2023.

### [check-dependencies](https://github.com/mgol/check-dependencies)

- Only covers npm / yarn / pnpm.
- Doesn't look at lockfiles.
  - Compares installed versions against `package.json` ranges.

## How it works

- Detect
  - `packageManager` field → lockfile → `npm_config_user_agent` (fallback: npm)
  - `package-lock.json` wins over `deno.lock(b)`
    - Set `packageManager` to force Deno
- Hash
  - `package.json` + lockfile (`deno.json(c)` only for Deno)
  - Missing `node_modules` always reinstalls
- Sync
  - sha256 at `node_modules/.cache/syndep/hash`; reinstall on mismatch
  - Never blocks git
  - `SYNDEP_RUNNING=1` guards recursion
  - CI (`CI=true` or `1`): `npm ci`, `--frozen-lockfile` (bun/pnpm), `--immutable` (yarn)
