# Regis Claude Master

> AI-Powered Research Assistant with Vercel Edge Functions and React Frontend

[![Vercel](https://img.shields.io/badge/Vercel-Deployed-black?logo=vercel)](https://vercel.com)
[![Edge](https://img.shields.io/badge/Vercel-Edge-black?logo=vercel)](https://vercel.com)
[![React](https://img.shields.io/badge/React-19-blue?logo=react)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.2-blue?logo=typescript)](https://www.typescriptlang.org/)

## Overview

Regis Claude Master is a full-stack AI research assistant that combines:

- **Vercel Edge Functions Backend** - Low-latency API runtime with provider fallbacks
- **React Frontend** - Modern UI with Framer Motion animations
- **Web Grounding** - Google Custom Search for context-aware responses
- **Multi-Model Support** - Anthropic → OpenAI → Google → Mistral → Groq → Ollama
- **Offline Support** - Service Worker + AES-256 encrypted IndexedDB backups
- **Internationalization** - i18next with lazy-loaded locales

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    Vercel Platform                       │
├─────────────────────────────────────────────────────────┤
│  ┌─────────────────┐    ┌─────────────────────────────┐ │
│  │   Static Site   │    │   Serverless Function       │ │
│  │   (React/Vite)  │    │   (Edge/TypeScript)         │ │
│  │                 │    │                             │ │
│  │  src/App.tsx    │───▶│  /api/execute               │ │
│  │  src/components │    │                             │ │
│  │  dist/          │    │  1. Grounding (Google CSE)  │ │
│  └─────────────────┘    │  2. Provider Fallback       │ │
│                         │  3. Response Generation     │ │
│                         └─────────────────────────────┘ │
└─────────────────────────────────────────────────────────┘
                              │
          ┌───────────────────┼───────────────────┐
          ▼                   ▼                   ▼
    ┌──────────┐       ┌──────────┐       ┌──────────┐
    │  Google  │       │  Gemini  │       │  Ollama  │
    │ Search   │       │  API     │       │ (Tunnel) │
    └──────────┘       └──────────┘       └──────────┘
```

## Features

| Feature | Description |
|---------|-------------|
| **Web Grounding** | Automatic context from Google Custom Search |
| **Smart Routing** | Code tasks → Ollama, General → Gemini |
| **Matrix Theme** | Glassmorphism UI with green accent |
| **Research Status** | Visual indicator during grounding phase |
| **Code Highlighting** | Markdown rendering with syntax highlighting |
| **Source Attribution** | Links to search results used |
| **Health Dashboard** | Provider status + token/cost counters |
| **JWT Auth** | httpOnly cookies with refresh tokens |

## Tech Stack

### Backend (`api/`)
- **TypeScript** - Edge runtime
- **Vercel Edge Functions** - Low latency execution
- **jose** - JWT signing/verification

### Frontend (`src/`)
- **React 19** - UI framework
- **TypeScript** - Type safety
- **Vite** - Build tool
- **Tailwind CSS** - Styling
- **Framer Motion** - Animations
- **TanStack Query** - Server state
- **Zustand** - Shared state (reserved for global needs)
- **React Hook Form + Zod** - Forms and validation
- **i18next** - Localization
- **Lucide React** - Icons

## Project Structure

```
RegisClaudeMaster/
├── api/                        # Vercel Edge Functions
│   ├── execute.ts              # Main request handler
│   ├── stream.ts               # Streaming response handler
│   ├── health.ts               # Health check endpoint
│   ├── models.ts               # Available models endpoint
│   ├── metrics.ts              # Metrics collection
│   ├── metrics-dashboard.ts    # Dashboard data aggregation
│   ├── alerts.ts               # Alert management
│   ├── providers.ts            # AI provider orchestration
│   ├── provider-health.ts      # Provider health monitoring
│   ├── provider-admin.ts       # Provider administration
│   ├── provider-config.ts      # Provider configuration
│   ├── grounding.ts            # Web grounding (Google CSE)
│   ├── cache.ts                # Response caching
│   ├── cache-admin.ts          # Cache administration
│   ├── circuit-breaker.ts      # Circuit breaker pattern
│   ├── dedup.ts                # Request deduplication
│   ├── rate-limit.ts           # Rate limiting
│   ├── cors.ts                 # CORS middleware
│   ├── errors.ts               # Error handling utilities
│   ├── logger.ts               # Logging utilities
│   ├── logs.ts                 # Log retrieval endpoint
│   ├── audit.ts                # Audit logging
│   ├── auth-utils.ts           # JWT utilities
│   └── auth/                   # JWT auth endpoints
│       ├── login.ts
│       ├── logout.ts
│       └── refresh.ts
├── src/                        # React Frontend
│   ├── components/
│   │   ├── ChatInterface.tsx       # Main chat UI
│   │   ├── ResearchStatus.tsx      # Research indicator
│   │   ├── MetricsDashboard.tsx    # Main metrics dashboard
│   │   ├── CostDisplay.tsx         # Token/cost display
│   │   ├── ErrorBoundary.tsx       # React error boundary
│   │   ├── ErrorDisplay.tsx        # Error message display
│   │   ├── FeedbackButton.tsx      # User feedback
│   │   ├── GroundingToggle.tsx     # Web grounding toggle
│   │   ├── OfflineIndicator.tsx    # Offline status
│   │   ├── ProgressIndicator.tsx   # Loading progress
│   │   ├── ProviderManager.tsx     # Provider selection
│   │   ├── SkeletonMessage.tsx     # Loading skeleton
│   │   ├── SourcesList.tsx         # Search sources
│   │   └── metrics/                # Metrics sub-components
│   │       ├── index.ts            # Barrel export
│   │       ├── AlertBadge.tsx      # Alert indicator
│   │       ├── ErrorRow.tsx        # Error list row
│   │       ├── ProviderCard.tsx    # Provider status card
│   │       ├── Sparkline.tsx       # Mini chart
│   │       └── StatCard.tsx        # Statistics card
│   ├── hooks/
│   │   ├── useChatState.ts         # Chat state management
│   │   ├── useOfflineQueue.ts      # Offline request queue
│   │   └── useOptimisticUpdates.ts # Optimistic UI updates
│   ├── types/
│   │   └── metrics.ts              # Metrics type definitions
│   ├── lib/
│   │   ├── api-client.ts           # API client with retry
│   │   ├── crypto.ts               # AES-256-GCM encryption
│   │   ├── backup.ts               # Encrypted chat backups
│   │   ├── storage.ts              # IndexedDB storage
│   │   ├── http-error-handler.ts   # Centralized HTTP errors
│   │   ├── error-handler.ts        # General error handling
│   │   ├── format.ts               # Formatting utilities
│   │   ├── stream-parser.ts        # SSE stream parsing
│   │   ├── health.ts               # Health check client
│   │   ├── models.ts               # Models client
│   │   ├── models-store.ts         # Models Zustand store
│   │   ├── preferences-store.ts    # User preferences store
│   │   ├── types.ts                # Shared type definitions
│   │   └── utils.ts                # General utilities
│   ├── i18n/
│   │   ├── index.ts                # i18next configuration
│   │   └── locales/
│   │       ├── en.json             # English translations
│   │       └── pl.json             # Polish translations
│   ├── styles/
│   │   └── globals.css             # Tailwind + Matrix theme
│   ├── App.tsx                     # Main app component
│   ├── main.tsx                    # Entry point
│   └── vite-env.d.ts               # Vite type definitions
├── public/
│   └── favicon.svg
├── vercel.json                 # Vercel configuration
├── package.json
├── tailwind.config.js
├── tsconfig.json
├── vite.config.ts
├── vitest.config.ts            # Unit test configuration
└── playwright.config.ts        # E2E test configuration
```

## Modular Architecture

The codebase follows a modular architecture with clear separation of concerns:

### Crypto Module (`src/lib/crypto.ts`)
- AES-256-GCM encryption with non-extractable keys
- Keys stored securely in IndexedDB
- Protection against XSS key extraction

### Backup Module (`src/lib/backup.ts`)
- Encrypted chat backup storage
- Automatic pruning (max 10 backups)
- Auto-restore on app load

### HTTP Error Handler (`src/lib/http-error-handler.ts`)
- Centralized HTTP error handling
- Automatic auth token refresh
- Timeout management with AbortController

### Chat State Hook (`src/hooks/useChatState.ts`)
- Complete chat state management
- Undo/redo history
- Auto-backup integration
- Request cancellation support

### Metrics Dashboard (`src/components/metrics/`)
- Component-based dashboard architecture
- StatCard, ProviderCard, AlertBadge, ErrorRow, Sparkline
- Type-safe with dedicated types (`src/types/metrics.ts`)

### Format Utilities (`src/lib/format.ts`)
- Reusable formatting functions
- Number, currency, latency, relative time, percentage, bytes

## Deployment

### Prerequisites

1. [Vercel Account](https://vercel.com)
2. [Google Cloud Project](https://console.cloud.google.com) with:
   - Custom Search API enabled
   - Programmable Search Engine created
3. (Optional) Cloudflare Tunnel for Ollama

### Environment Variables

Set these in Vercel Dashboard → Project Settings → Environment Variables:

| Variable | Required | Description |
|----------|----------|-------------|
| `GOOGLE_API_KEY` | Yes | Google Cloud API key |
| `GOOGLE_SEARCH_CX` | Yes | Custom Search Engine ID |
| `CLOUDFLARE_TUNNEL_URL` | No | Ollama tunnel URL |
| `INTERNAL_AUTH_KEY` | No | API authentication key |
| `JWT_SECRET` | Yes | JWT signing secret |
| `ALLOWED_ORIGINS` | Yes | Comma-separated allowed origins |
| `ANTHROPIC_API_KEY` | No | Anthropic API key |
| `OPENAI_API_KEY` | No | OpenAI API key |
| `MISTRAL_API_KEY` | No | Mistral API key |
| `GROQ_API_KEY` | No | Groq API key |

### Deploy to Vercel

```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel

# Production deploy
vercel --prod
```

Or use the Vercel Dashboard:
1. Import from GitHub
2. Framework: Vite
3. Build Command: `npm run build`
4. Output Directory: `dist`

### Environments

- **dev**: local development
- **preview**: Vercel preview deployments
- **prod**: main branch

## Local Development

### Frontend

```bash
# Install dependencies
pnpm install

# Start dev server
pnpm dev
```

### Backend (Edge Functions)

For local development, use Vercel CLI:

```bash
# Install Vercel CLI
pnpm add -g vercel

# Run locally with Vercel runtime
vercel dev
```

### Testy end-to-end (Playwright)

```bash
# Run Playwright tests
pnpm test:e2e
```

## API Reference

OpenAPI spec is available in `openapi.yaml` and can generate TypeScript types:

```bash
pnpm generate:api
```

### POST /api/execute

Execute a prompt with web grounding.

**Request:**
```json
{
  "prompt": "Explain quantum computing",
  "model": "auto"
}
```

**Headers:**
- `Content-Type: application/json`
- `x-api-key: <your-key>` (if configured)

**Response:**
```json
{
  "success": true,
  "response": "Quantum computing is...",
  "sources": [
    {
      "title": "Wikipedia",
      "link": "https://...",
      "snippet": "..."
    }
  ],
  "model_used": "gemini-2.0-flash",
  "grounding_performed": true
}
```

### GET /api/models

Returns the list of available models based on configured provider keys.

### GET /api/health

Returns provider status with token/cost counters.

## Contributing

1. Fork the repository
2. Create feature branch (`git checkout -b feature/amazing`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing`)
5. Open Pull Request

## License

MIT License - see [LICENSE](LICENSE) for details.

---

Built with Edge Functions + React on Vercel | Powered by multi-model AI
