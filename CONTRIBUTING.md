# Contributing to EduGames

EduGames is a child-directed platform for reviewed HTML5 games in a native shell. During bootstrap, we optimize for clear decisions, small pull requests, and safe defaults over fast repo sprawl.

## Start Here

Read these docs before proposing non-trivial changes:

- `docs/implementation-decisions.md`
- `docs/testing-strategy.md`
- `docs/adr/`

If your change conflicts with a locked decision, update the relevant ADR or propose a new one in the same pull request.

## Current Repo Expectations

- Treat this repo as the single MVP monorepo.
- Assume root tooling and workspace automation are still being bootstrapped.
- Do not add broad repo-level structure, dependencies, or automation without a clear need tied to an issue, spec, or ADR.
- Keep changes focused. One pull request should do one coherent thing.

## Pull Requests

- Open a pull request for all production-facing changes.
- Do not push directly to `main`.
- Explain what changed, why it changed, and any follow-up work that is intentionally out of scope.
- Include screenshots or artifacts for UI changes when they help review.
- Call out risk areas plainly, especially around child safety, policy, runtime restrictions, and release operations.

## Testing

Follow `docs/testing-strategy.md`.

In particular:

- behavior changes need matching tests
- bug fixes should start with a failing reproduction when practical
- visual changes should include visual evidence
- if tooling is not ready yet, say what you validated manually and what still needs automation

## Docs and Decision Hygiene

- Update docs when behavior, policy, or operational steps change.
- Add or revise ADRs for changes to platform shape, runtime model, data handling, or parent controls.
- Keep runbooks concrete. If a workflow is still manual, say so directly.

## Security and Child Safety

- Do not introduce child PII collection without an explicit design and review path.
- Do not add ads, chat, arbitrary external links, or in-game login flows to MVP surfaces.
- Report suspected vulnerabilities through `SECURITY.md`, not public issues.

## Code of Conduct

By participating in this project, you agree to follow `CODE_OF_CONDUCT.md`.
