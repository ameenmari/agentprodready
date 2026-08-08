## Summary

<!-- What changed and why -->

## Audience

- [ ] App-developer DX (docs / examples / Simple API / scaffold)
- [ ] Platform contributor (blueprint / architecture — link plan + specification)

## Checklist

- [ ] Tests added or updated when behavior changes
- [ ] Docs updated when public behavior / DX changes
- [ ] No secrets, tokens, or `.env` contents in the diff
- [ ] No fabricated adoption, audit, or benchmark claims
- [ ] Architecture ownership unchanged (or ADR linked if it must change)
- [ ] `good first issue` scope stays docs/examples/tests/small DX when applicable

## Verification

```bash
# commands you ran
pnpm verify
pnpm verify-versioning
pnpm test:public-dx
# pnpm test:scaffold-dx   # when scaffold touched
```

## Notes

<!-- Limitations, follow-ups, related issues -->
