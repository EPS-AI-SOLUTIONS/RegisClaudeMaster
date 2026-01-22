# Changelog

## Unreleased
- Add Edge Functions with provider fallback routing and JWT auth.
- Introduce i18next localization, Markdown rendering, and skeleton loaders.
- Add Health Dashboard, model selector, and offline encrypted backups.
- Update documentation and configuration for new runtime.

## [1.3.0] - 2026-01-22

### Refactored
- Split `MetricsDashboard.tsx` (618 → 319 lines) into focused sub-components.
- Extracted `useChatState` hook from `App.tsx` (516 → 402 lines) for cleaner state management.
- Split monolithic `storage.ts` into `crypto.ts`, `storage.ts`, and `backup.ts` modules.
- Extracted shared error handling logic to `lib/http-error-handler.ts`.

### Added
- `src/types/metrics.ts` — TypeScript types for metrics dashboard.
- `src/lib/format.ts` — Shared formatting utilities.
- `src/lib/http-error-handler.ts` — Centralized HTTP error handling.
- `src/lib/crypto.ts` — Encryption/decryption utilities.
- `src/lib/backup.ts` — Backup management logic.
- `src/hooks/useChatState.ts` — Chat state management hook.
- `src/components/metrics/AlertBadge.tsx` — Alert indicator component.
- `src/components/metrics/StatCard.tsx` — Statistics card component.
- `src/components/metrics/ProviderCard.tsx` — Provider status card component.
- `src/components/metrics/ErrorRow.tsx` — Error display row component.
- `src/components/metrics/Sparkline.tsx` — Sparkline chart component.
