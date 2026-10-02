<!-- DO NOT EDIT: Generated mirror of /.github/copilot-instructions.md. Edit /.github/copilot-instructions.md instead. -->

# Repository Instructions

- Attach exactly one of the `patch`, `minor`, or `major` labels when creating or updating a PR.
- Verify the label is attached with `gh pr view --json labels` before finishing.

## Verification

- After any code change: `bun run check`, `bun run knip`, `bun run lint`, `bun run format`, `bun run build`, `bun run test`.
- After any Actions change: `actionlint`, `ghalint run`, `ghalint run-action`, `zizmor`.
