# Specification — Community Gravity Package Surface

**Implementation Mode:** Autonomous

## Decisions

- **D1** Every public package README must include: promise line, install, code sample (or honest “usually transitive” sample), when/not when, ownership non-goals, links home.
- **D2** Prefer Simple Agent API samples on entry packages; platform packages show typed contracts + “usually with agent-framework”.
- **D3** No Blueprint-number-only READMEs on npm.
- **D4** Root README removes unpublished-scaffold caveat; adds visual + good-first-issue CTA.
- **D5** `pnpm verify-package-readmes` fails if any public package README lacks install cue + fenced code + minimum length.
- **D6** Architecture ownership unchanged — marketing clarifies graduation path only.
- **D7** Selective patch publish so npm registry reflects README upgrades.

## Acceptance

| ID | Criterion |
|---|---|
| A1 | No public package README ≤ 5 lines |
| A2 | Every README has a fenced code sample |
| A3 | Entry packages (framework, scaffold, anthropic) are hero-quality |
| A4 | Root README has visual + contributor CTA; no stale “until published” scaffold note |
| A5 | verify-package-readmes green in verify/CI |
| A6 | Patched packages published to npm |
