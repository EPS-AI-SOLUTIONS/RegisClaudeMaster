# ARCHITECTURE

## High-level Flow

1. **UI (React + Vite)** collects the prompt via React Hook Form + Zod.
2. The client sends `POST /api/execute` with `{ prompt, model }`.
3. The Edge Function:
   - validates JWT (httpOnly cookies) or internal API key,
   - performs grounding with Google Custom Search,
   - routes to providers in fallback order:
     **Anthropic → OpenAI → Google → Mistral → Groq → Ollama**,
   - records token + cost metrics.
4. The client renders:
   - messages + sources,
   - health dashboard,
   - localized UI (i18next).

## Project Structure

```
src/
├── App.tsx                    # Main UI entry, uses useChatState hook
├── main.tsx                   # React entry point
│
├── components/
│   ├── ChatInterface.tsx      # Markdown rendering and sources
│   ├── MetricsDashboard.tsx   # Main dashboard (uses sub-components)
│   ├── ErrorBoundary.tsx      # React error boundary
│   ├── ErrorDisplay.tsx       # Error message display
│   ├── SkeletonMessage.tsx    # Loading skeleton
│   ├── SourcesList.tsx        # Sources display
│   ├── CostDisplay.tsx        # Cost information
│   ├── FeedbackButton.tsx     # User feedback
│   ├── GroundingToggle.tsx    # Search grounding toggle
│   ├── OfflineIndicator.tsx   # Offline status
│   ├── ProgressIndicator.tsx  # Progress bar
│   ├── ProviderManager.tsx    # Provider selection
│   ├── ResearchStatus.tsx     # Research status display
│   │
│   └── metrics/               # MetricsDashboard sub-components
│       ├── index.ts           # Barrel export
│       ├── AlertBadge.tsx     # Alert severity badge
│       ├── StatCard.tsx       # Statistics card
│       ├── ProviderCard.tsx   # Provider status card
│       ├── ErrorRow.tsx       # Error list row
│       └── Sparkline.tsx      # Mini chart component
│
├── hooks/
│   ├── useChatState.ts        # Chat messages, history, undo/redo
│   ├── useOptimisticUpdates.ts
│   └── useOfflineQueue.ts
│
├── lib/
│   ├── api-client.ts          # API calls with retry logic
│   ├── http-error-handler.ts  # Centralized HTTP error handling
│   ├── crypto.ts              # AES-256-GCM encryption
│   ├── backup.ts              # Encrypted backup operations
│   ├── storage.ts             # Storage orchestration (re-exports)
│   ├── format.ts              # Number/currency/time formatting
│   ├── error-handler.ts       # General error handling
│   ├── health.ts              # Health check utilities
│   ├── models.ts              # Model definitions
│   ├── models-store.ts        # Model state management
│   ├── preferences-store.ts   # User preferences
│   ├── stream-parser.ts       # SSE stream parsing
│   ├── types.ts               # Shared types
│   └── utils.ts               # General utilities
│
├── types/
│   └── metrics.ts             # Metrics dashboard types
│
└── i18n/
    └── index.ts               # i18next configuration
```

## Key Modules

### Frontend

#### Core
- `src/App.tsx` – main UI, delegates chat state to `useChatState` hook.
- `src/components/ChatInterface.tsx` – Markdown rendering and sources.

#### Hooks
- `src/hooks/useChatState.ts` – manages chat messages, history (undo/redo), message submission, and auto-backup.

#### API Layer
- `src/lib/api-client.ts` – retry + refresh session.
- `src/lib/http-error-handler.ts` – centralized HTTP error analysis, auth refresh, and timeout handling.

#### Storage Layer (refactored)
- `src/lib/crypto.ts` – AES-256-GCM encryption/decryption with non-extractable keys.
- `src/lib/backup.ts` – encrypted chat backup save/load to IndexedDB.
- `src/lib/storage.ts` – orchestration layer, re-exports crypto and backup functions.

#### Metrics Dashboard (refactored)
- `src/components/MetricsDashboard.tsx` – main dashboard component.
- `src/components/metrics/` – extracted sub-components:
  - `AlertBadge.tsx` – severity badge (warning/critical)
  - `StatCard.tsx` – individual metric card
  - `ProviderCard.tsx` – provider status and latency
  - `ErrorRow.tsx` – error list item
  - `Sparkline.tsx` – mini time-series chart
- `src/types/metrics.ts` – TypeScript interfaces (RequestMetric, AggregatedMetrics, Alert, etc.)
- `src/lib/format.ts` – formatting utilities (formatNumber, formatCurrency, formatLatency, formatRelativeTime, formatPercent, formatBytes)

### Backend (Edge Functions)
- `api/execute.ts` – main handler with fallback routing.
- `api/models.ts` – list models based on available provider keys.
- `api/health.ts` – provider status, token + cost counters.
- `api/auth/*` – JWT login/refresh/logout.
- `api/providers.ts` – provider integrations.

## Security & Auth

- JWT stored in **httpOnly cookies**.
- Refresh tokens issued automatically by `/api/auth/refresh`.
- Client retries after 401; on failure, user is logged out.
- All secrets are provided via environment variables only.
- Encryption keys are **non-extractable** (cannot be exported via XSS).

## Offline & Backup

- Service Worker caches static assets.
- Messages are backed up every 5 minutes to IndexedDB.
- Backups are AES-256-GCM encrypted, with crypto operations logged.
- Storage system supports:
  - `saveBackup()` / `loadLatestBackup()` – encrypted persistence
  - Auto-pruning (max 10 backups)
  - Migration from legacy localStorage

## Observability

- Structured JSON logs in production via `api/logger.ts`.
- Health dashboard uses `/api/health`.
- Metrics types defined in `src/types/metrics.ts`:
  - `RequestMetric` – individual request data
  - `AggregatedMetrics` – totals, rates, breakdowns
  - `LatencyPercentiles` – p50, p95, p99
  - `Alert` – cost, error rate, latency, provider alerts
