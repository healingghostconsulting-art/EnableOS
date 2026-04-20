# Sanitization Audit

## Summary

A project-wide search was performed for legacy client-specific terms and prior seed labels after the CHCG content remap. The audit confirms that the live demo content and primary TypeScript/TSX product surfaces have been sanitized for presentation use.

## Search terms used

Aspirus, WMC, WMCHealth, APS, Cerner, Genesis, patient, provider, Northstar, Summit, Velocity

## Findings

| Location | Status | Notes |
| --- | --- | --- |
| `server/demoPlatform.ts` | Clean | No remaining legacy client names found in the active seeded demo data layer. |
| `client/src/pages/EnableOSViews.tsx` | Clean | No remaining imported client-specific references found in live role or landing UI copy. |
| `server/demo.router.test.ts` | Clean | Tests were updated to use sanitized tenant names and CHCG-aligned content. |
| `demo_blueprint.md` | Legacy planning reference | Contains earlier draft tenant names from a planning phase, not used by the product runtime. |
| `training_content_inventory.md` | Expected audit reference | Retains original client-specific references only to document what had to be removed during sanitization. |
| `pnpm-lock.yaml` | False positives | Matches on dependency words such as `provider`; not business content. |
| UI helper files such as `Map.tsx` / `tooltip.tsx` | False positives | Matches occur in technical strings like `proxy`, `provider`, or `tooltip-provider`, not customer content. |

## Conclusion

The CHCG EnableOS demo itself is currently sanitized for presentation and no longer depends on customer-identifying seed content in the live runtime surfaces reviewed during this pass. Remaining legacy references are confined to audit/inventory documentation or dependency metadata and do not appear in the demo experience.

## Recommended follow-up

1. Keep `training_content_inventory.md` as an internal sanitization reference and avoid attaching it in client-facing deliveries.
2. If desired, replace historical names in `demo_blueprint.md` as a final cleanup step so all project documentation is fully aligned with the sanitized state.
3. Continue using project-wide searches when importing additional training decks.
