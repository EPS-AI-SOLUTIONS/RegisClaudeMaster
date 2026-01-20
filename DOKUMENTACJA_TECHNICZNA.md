# DOKUMENTACJA TECHNICZNA
## Regis Matrix Lab v1.0.0

---

# SPIS TREŚCI

1. [Wprowadzenie](#1-wprowadzenie)
2. [Architektura systemu](#2-architektura-systemu)
3. [Struktura projektu](#3-struktura-projektu)
4. [Konfiguracja](#4-konfiguracja)
5. [Backend - Edge Functions](#5-backend---edge-functions)
6. [Frontend - React](#6-frontend---react)
7. [System autoryzacji](#7-system-autoryzacji)
8. [Integracje AI](#8-integracje-ai)
9. [Lokalizacja (i18n)](#9-lokalizacja-i18n)
10. [Storage i szyfrowanie](#10-storage-i-szyfrowanie)
11. [Testowanie](#11-testowanie)
12. [Deployment](#12-deployment)
13. [API Reference](#13-api-reference)
14. [Zmienne środowiskowe](#14-zmienne-środowiskowe)
15. [Skróty klawiaturowe](#15-skróty-klawiaturowe)

---

# 1. WPROWADZENIE

## 1.1 Opis projektu

**Regis Matrix Lab** to zaawansowany asystent badawczy oparty na sztucznej inteligencji z motywem "Matrix" (digital rain). Aplikacja łączy:

- **Web Grounding** - automatyczne wyszukiwanie kontekstu z Google Custom Search
- **Multi-Model AI** - obsługa 6 dostawców AI z automatycznym fallbackiem
- **Edge Computing** - backend na Vercel Edge Functions (niskolatencyjne odpowiedzi)
- **Offline Support** - Service Worker + szyfrowane backupy w IndexedDB

## 1.2 Główne funkcjonalności

| Funkcja | Opis |
|---------|------|
| **Grounding** | Automatyczny kontekst z Google Search (5 wyników) |
| **Multi-Provider** | Anthropic, OpenAI, Google, Mistral, Groq, Ollama |
| **JWT Auth** | Bezpieczna autoryzacja z httpOnly cookies |
| **Rate Limiting** | 20 żądań/min per IP |
| **Undo/Redo** | Historia wiadomości (Ctrl+Z/Y) |
| **Dark/Light** | Przełączanie motywu |
| **i18n** | Polski i angielski |
| **PWA** | Offline support + instalacja |
| **Encrypted Backup** | AES-256-GCM w IndexedDB |

## 1.3 Stack technologiczny

### Frontend
- React 19
- TypeScript 5.2
- Vite 5.1.4
- Tailwind CSS 3.4.1
- Framer Motion 11.0.8
- TanStack Query 5.56.2
- Zustand 4.5.2
- React Hook Form 7.51.2 + Zod 3.23.8
- i18next 23.12.2

### Backend
- Vercel Edge Functions
- jose 5.2.3 (JWT)
- Web Crypto API (AES-256)

---

# 2. ARCHITEKTURA SYSTEMU

## 2.1 Diagram wysokopoziomowy

```
┌─────────────────────────────────────────────────────────────────┐
│                         KLIENT (Browser)                        │
├─────────────────────────────────────────────────────────────────┤
│  React 19 App                                                   │
│  ├── App.tsx (State orchestration)                              │
│  ├── Components (ChatInterface, ResearchStatus, etc.)           │
│  ├── Lib (api-client, storage, utils)                           │
│  └── Service Worker (PWA offline)                               │
└────────────────────────┬────────────────────────────────────────┘
                         │ HTTPS (fetch)
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│                    VERCEL EDGE FUNCTIONS                        │
├─────────────────────────────────────────────────────────────────┤
│  Regions: cdg1 (Paris), fra1 (Frankfurt)                        │
│  ├── /api/execute (main handler, 60s timeout)                   │
│  ├── /api/models (lista modeli)                                 │
│  ├── /api/health (status dostawców)                             │
│  └── /api/auth/* (login, refresh, logout)                       │
└────────────────────────┬────────────────────────────────────────┘
                         │
          ┌──────────────┼──────────────┐
          ▼              ▼              ▼
┌──────────────┐ ┌──────────────┐ ┌──────────────┐
│ Google Search│ │  AI Providers │ │   JWT Auth   │
│ Custom Search│ │ (6 providers) │ │  (jose HS256)│
└──────────────┘ └──────────────┘ └──────────────┘
```

## 2.2 Przepływ żądania

```
1. User wpisuje prompt → App.tsx
2. React Hook Form validation (Zod)
3. api-client.ts: POST /api/execute
4. Edge Function:
   a. CORS validation
   b. Rate limit check (20/min)
   c. JWT verification (cookie)
   d. Grounding: Google Custom Search
   e. Provider selection (fallback order)
   f. AI call → response
   g. Metrics recording
5. Response → ChatInterface.tsx
6. Markdown rendering + syntax highlighting
```

---

# 3. STRUKTURA PROJEKTU

```
RegisClaudeMaster/
├── api/                           # Vercel Edge Functions
│   ├── auth/                      # Moduły autoryzacji
│   │   ├── login.ts               # POST /api/auth/login
│   │   ├── refresh.ts             # POST /api/auth/refresh
│   │   └── logout.ts              # POST /api/auth/logout
│   ├── execute.ts                 # POST /api/execute (główny handler)
│   ├── health.ts                  # GET /api/health
│   ├── models.ts                  # GET /api/models
│   ├── providers.ts               # Integracje AI (6 providers)
│   ├── auth-utils.ts              # JWT utilities
│   ├── cors.ts                    # CORS middleware
│   ├── logger.ts                  # Structured logging
│   └── metrics.ts                 # Usage metrics
│
├── src/                           # Frontend React
│   ├── components/
│   │   ├── ChatInterface.tsx      # Renderowanie wiadomości
│   │   ├── ResearchStatus.tsx     # Animacja grounding
│   │   ├── ErrorBoundary.tsx      # Error boundary
│   │   └── SkeletonMessage.tsx    # Loading placeholder
│   │
│   ├── lib/
│   │   ├── api-client.ts          # HTTP client z retry
│   │   ├── storage.ts             # IndexedDB + AES-256
│   │   ├── types.ts               # TypeScript interfaces
│   │   ├── utils.ts               # Utilities (cn, formatTime)
│   │   ├── preferences-store.ts   # Zustand store
│   │   ├── models.ts              # fetchModels()
│   │   └── health.ts              # fetchHealth()
│   │
│   ├── i18n/
│   │   ├── index.ts               # i18next config
│   │   └── locales/
│   │       ├── pl.json            # Polski
│   │       └── en.json            # English
│   │
│   ├── styles/
│   │   └── globals.css            # Tailwind + custom styles
│   │
│   ├── App.tsx                    # Główny komponent
│   └── main.tsx                   # Entry point
│
├── tests/
│   └── app.spec.ts                # Playwright E2E tests
│
├── public/
│   └── favicon.svg                # Ikona
│
└── [config files]
    ├── package.json
    ├── tsconfig.json
    ├── vite.config.ts
    ├── tailwind.config.js
    ├── vercel.json
    ├── playwright.config.ts
    └── openapi.yaml
```

---

# 4. KONFIGURACJA

## 4.1 package.json

```json
{
  "name": "regis-claude-master",
  "version": "1.0.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "tsc && vite build",
    "preview": "vite preview",
    "lint": "eslint src --ext ts,tsx",
    "type-check": "tsc --noEmit",
    "test:e2e": "playwright test",
    "generate:api": "openapi-typescript openapi.yaml -o src/lib/api-types.ts"
  }
}
```

### Główne zależności

| Pakiet | Wersja | Zastosowanie |
|--------|--------|--------------|
| react | 19.0.0 | UI framework |
| typescript | 5.2.2 | Type safety |
| vite | 5.1.4 | Build tool |
| tailwindcss | 3.4.1 | Styling |
| framer-motion | 11.0.8 | Animacje |
| @tanstack/react-query | 5.56.2 | Server state |
| zustand | 4.5.2 | Client state |
| react-hook-form | 7.51.2 | Formularze |
| zod | 3.23.8 | Validation |
| i18next | 23.12.2 | Lokalizacja |
| react-markdown | 9.0.1 | Markdown |
| rehype-highlight | 7.0.0 | Syntax highlighting |
| idb | 8.0.0 | IndexedDB |
| jose | 5.2.3 | JWT |

## 4.2 tsconfig.json

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "jsx": "react-jsx",
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "paths": {
      "@/*": ["./src/*"]
    }
  },
  "include": ["src"]
}
```

## 4.3 vite.config.ts

```typescript
export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      manifest: {
        name: 'Regis Matrix Lab',
        short_name: 'Regis Matrix',
        theme_color: '#00ff41',
        background_color: '#0a1f0a',
        display: 'standalone',
      },
    }),
  ],
  resolve: {
    alias: { '@': path.resolve(__dirname, './src') },
  },
  server: {
    port: 3000,
    proxy: { '/api': 'http://localhost:3001' },
  },
  build: {
    outDir: 'dist',
    sourcemap: true,
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom'],
          animations: ['framer-motion'],
          state: ['zustand'],
        },
      },
    },
  },
});
```

## 4.4 tailwind.config.js

```javascript
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        witcher: {
          silver: '#c0c0c0',
          gold: '#ffd700',
          blood: '#8b0000',
          dark: '#1a1a2e',
          steel: '#4a5568',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'Fira Code', 'monospace'],
      },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'glow': 'glow 2s ease-in-out infinite alternate',
      },
    },
  },
};
```

## 4.5 vercel.json

```json
{
  "framework": "vite",
  "buildCommand": "npm run build",
  "outputDirectory": "dist",
  "functions": {
    "api/execute.ts": {
      "maxDuration": 60,
      "runtime": "edge",
      "regions": ["cdg1", "fra1"]
    },
    "api/health.ts": { "runtime": "edge", "regions": ["cdg1", "fra1"] },
    "api/models.ts": { "runtime": "edge", "regions": ["cdg1", "fra1"] },
    "api/auth/*.ts": { "runtime": "edge", "regions": ["cdg1", "fra1"] }
  },
  "rewrites": [
    { "source": "/api/execute", "destination": "/api/execute" },
    { "source": "/api/health", "destination": "/api/health" },
    { "source": "/api/models", "destination": "/api/models" },
    { "source": "/api/auth/(.*)", "destination": "/api/auth/$1" },
    { "source": "/(.*)", "destination": "/index.html" }
  ],
  "headers": [
    {
      "source": "/assets/(.*)",
      "headers": [{ "key": "Cache-Control", "value": "public, max-age=31536000, immutable" }]
    }
  ]
}
```

---

# 5. BACKEND - EDGE FUNCTIONS

## 5.1 Główny handler: `/api/execute`

**Plik:** `api/execute.ts`

### Interfejsy

```typescript
interface InputPayload {
  prompt: string;
  model?: string;
  stream?: boolean;
}

interface OutputPayload {
  success: boolean;
  response: string;
  sources: SearchResult[];
  model_used: string;
  grounding_performed: boolean;
}

interface SearchResult {
  title: string;
  link: string;
  snippet: string;
}
```

### Konfiguracja

```typescript
export const config = {
  runtime: 'edge',
  regions: ['cdg1', 'fra1'],  // Paris, Frankfurt
};
```

### Rate Limiting

```typescript
const RATE_LIMIT_WINDOW = 60_000;  // 1 minuta
const RATE_LIMIT_MAX = 20;         // max 20 żądań

const rateLimitMap = new Map<string, { count: number; resetAt: number }>();

function isRateLimited(ip: string): boolean {
  const now = Date.now();
  const entry = rateLimitMap.get(ip);
  if (!entry || entry.resetAt < now) {
    rateLimitMap.set(ip, { count: 1, resetAt: now + RATE_LIMIT_WINDOW });
    return false;
  }
  if (entry.count >= RATE_LIMIT_MAX) return true;
  entry.count += 1;
  return false;
}
```

### Web Grounding

```typescript
async function performGrounding(query: string): Promise<SearchResult[]> {
  const apiKey = process.env.GOOGLE_API_KEY;
  const searchCx = process.env.GOOGLE_SEARCH_CX;

  if (!apiKey || !searchCx) return [];

  const url = `https://www.googleapis.com/customsearch/v1?key=${apiKey}&cx=${searchCx}&q=${encodeURIComponent(query)}&num=5`;

  const response = await fetch(url, { signal: AbortSignal.timeout(10000) });
  if (!response.ok) return [];

  const data = await response.json();
  return (data.items || []).map((item) => ({
    title: item.title,
    link: item.link,
    snippet: item.snippet || '',
  }));
}
```

### Główna logika

```typescript
export default async function handler(req: Request): Promise<Response> {
  const headers = buildCorsHeaders(req.headers.get('origin'));

  // Preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 200, headers });
  }

  // Only POST
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), { status: 405, headers });
  }

  // Rate limit
  if (isRateLimited(getClientIp(req))) {
    return new Response(JSON.stringify({ error: 'Rate limit exceeded' }), { status: 429, headers });
  }

  // Auth
  const userId = await verifyAccessToken(req);
  if (!userId && !validateApiKey(req)) {
    return new Response(JSON.stringify({ error: 'Invalid API key' }), { status: 401, headers });
  }

  // Process
  const input = await req.json();
  const sources = await performGrounding(input.prompt);
  const context = sources.map((s) => `- ${s.title}: ${s.snippet}`).join('\n');

  // Provider fallback
  const fallbackOrder = ['anthropic', 'openai', 'google', 'mistral', 'groq', 'ollama'];
  // ... provider selection logic

  return new Response(JSON.stringify({
    success: true,
    response,
    sources,
    model_used: modelUsed,
    grounding_performed: sources.length > 0,
  }), { status: 200, headers });
}
```

## 5.2 Health endpoint: `/api/health`

**Plik:** `api/health.ts`

```typescript
export default function handler(req: Request): Response {
  const headers = buildCorsHeaders(req.headers.get('origin'));

  const providers = listAvailableModels().map((model) => {
    const usage = getUsage(model.id);
    return {
      model: model.id,
      status: model.isConfigured() ? 'ok' : 'down',
      tokens: usage.tokens,
      cost: usage.cost,
    };
  });

  headers.set('Cache-Control', 's-maxage=300, stale-while-revalidate=60');

  return new Response(JSON.stringify({
    status: 'ok',
    timestamp: new Date().toISOString(),
    version: '1.1.0',
    providers,
  }), { status: 200, headers });
}
```

## 5.3 Models endpoint: `/api/models`

**Plik:** `api/models.ts`

```typescript
export default function handler(req: Request): Response {
  const models = listAvailableModels()
    .filter((model) => model.isConfigured())
    .map((model) => ({
      id: model.id,
      label: model.label,
      provider: model.provider,
    }));

  return new Response(JSON.stringify({ models }), { status: 200, headers });
}
```

## 5.4 CORS middleware

**Plik:** `api/cors.ts`

```typescript
export function buildCorsHeaders(origin: string | null): Headers {
  const allowed = (process.env.ALLOWED_ORIGINS || '')
    .split(',')
    .map((value) => value.trim())
    .filter(Boolean);

  const allowOrigin = origin && allowed.includes(origin) ? origin : allowed[0] ?? '';

  const headers = new Headers();
  if (allowOrigin) {
    headers.set('Access-Control-Allow-Origin', allowOrigin);
  }
  headers.set('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  headers.set('Access-Control-Allow-Headers', 'Content-Type, x-api-key');
  headers.set('Access-Control-Allow-Credentials', 'true');

  return headers;
}
```

## 5.5 Logger

**Plik:** `api/logger.ts`

```typescript
type LogLevel = 'debug' | 'info' | 'warn' | 'error';

export function log(level: LogLevel, message: string, meta?: Record<string, unknown>) {
  const payload = {
    level,
    message,
    meta,
    timestamp: new Date().toISOString(),
  };

  if (process.env.NODE_ENV === 'production') {
    console.log(JSON.stringify(payload));  // JSON dla Vercel Logs
  } else {
    console.log(`[${level}]`, message, meta ?? '');
  }
}
```

## 5.6 Metrics

**Plik:** `api/metrics.ts`

```typescript
interface ModelMetric {
  tokens: number;
  cost: number;
}

const metrics = new Map<string, ModelMetric>();

export function recordUsage(model: string, tokens: number, cost: number) {
  const current = metrics.get(model) ?? { tokens: 0, cost: 0 };
  metrics.set(model, {
    tokens: current.tokens + tokens,
    cost: current.cost + cost,
  });
}

export function getUsage(model: string): ModelMetric {
  return metrics.get(model) ?? { tokens: 0, cost: 0 };
}
```

---

# 6. FRONTEND - REACT

## 6.1 Entry point: `main.tsx`

```typescript
import React, { Suspense } from 'react';
import ReactDOM from 'react-dom/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { registerSW } from 'virtual:pwa-register';
import App from './App';
import './i18n';
import { ErrorBoundary } from './components/ErrorBoundary';
import './styles/globals.css';

const queryClient = new QueryClient();
registerSW({ immediate: true });

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <ErrorBoundary fallback={<div>Ups! Coś się wywaliło w matriksie.</div>}>
        <Suspense fallback={<div>Ładuję tłumaczenia...</div>}>
          <App />
        </Suspense>
      </ErrorBoundary>
    </QueryClientProvider>
  </React.StrictMode>
);
```

## 6.2 Główny komponent: `App.tsx`

### State management

```typescript
function App() {
  // Zustand store
  const { theme, setTheme, language, setLanguage } = usePreferencesStore();

  // Local state
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isResearching, setIsResearching] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedModel, setSelectedModel] = useState<string>('auto');

  // Undo/Redo history
  const [history, setHistory] = useState<Message[][]>([]);
  const [redoStack, setRedoStack] = useState<Message[][]>([]);

  // Online status
  const [isOnline, setIsOnline] = useState(() => navigator.onLine);

  // Refs
  const inputRef = useRef<HTMLInputElement | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  // i18n
  const { t, i18n } = useTranslation();

  // ...
}
```

### Form validation (Zod)

```typescript
const schema = useMemo(
  () => z.object({
    prompt: z.string()
      .min(3, t('forms.inputMin'))
      .nonempty(t('forms.inputRequired')),
  }),
  [t]
);

const { register, handleSubmit, reset, formState } = useForm<{ prompt: string }>({
  resolver: zodResolver(schema),
  mode: 'onChange',
});
```

### TanStack Query hooks

```typescript
// Pobieranie listy modeli
const { data: models } = useQuery<ModelInfo[]>({
  queryKey: ['models'],
  queryFn: fetchModels,
});

// Pobieranie statusu zdrowotności
const { data: health } = useQuery({
  queryKey: ['health'],
  queryFn: fetchHealth,
  refetchInterval: 300000,  // co 5 minut
});
```

### Keyboard shortcuts

```typescript
useEffect(() => {
  const handleKeyDown = (event: KeyboardEvent) => {
    if (event.ctrlKey && event.key.toLowerCase() === 'k') {
      event.preventDefault();
      inputRef.current?.focus();
    }
    if (event.ctrlKey && event.key.toLowerCase() === 'l') {
      event.preventDefault();
      handleClearChat();
    }
    if (event.ctrlKey && event.key.toLowerCase() === 'z') {
      event.preventDefault();
      handleUndo();
    }
    if (event.ctrlKey && event.key.toLowerCase() === 'y') {
      event.preventDefault();
      handleRedo();
    }
  };

  window.addEventListener('keydown', handleKeyDown);
  return () => window.removeEventListener('keydown', handleKeyDown);
}, [messages, history, redoStack]);
```

### Submit handler

```typescript
const onSubmit = async ({ prompt }: { prompt: string }) => {
  if (isLoading) return;

  abortRef.current?.abort();
  const controller = new AbortController();
  abortRef.current = controller;

  const userMessage: Message = {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
    role: 'user',
    content: prompt.trim(),
    timestamp: new Date(),
  };

  setMessages((prev) => [...prev, userMessage]);
  setIsLoading(true);
  setIsResearching(true);
  reset();

  try {
    await new Promise((resolve) => setTimeout(resolve, 300));
    setIsResearching(false);

    const response = await executePrompt(prompt, selectedModel, controller.signal);

    const assistantMessage: Message = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
      role: 'assistant',
      content: response.response,
      sources: response.sources,
      modelUsed: response.model_used,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, assistantMessage]);
  } catch (err) {
    // Error handling with mapped messages
    const message = err instanceof Error ? err.message : 'UNKNOWN';
    const mapped = message === 'AUTH_ERROR' ? t('errors.auth')
      : message === 'TIMEOUT' ? t('errors.timeout')
      : message === 'RATE_LIMIT' ? t('errors.rateLimit')
      : t('errors.unknown');
    setError(mapped);
  } finally {
    setIsLoading(false);
    setIsResearching(false);
  }
};
```

## 6.3 ChatInterface.tsx

### Props

```typescript
interface ChatInterfaceProps {
  messages: Message[];
  isLoading: boolean;
}
```

### Markdown rendering

```typescript
<ReactMarkdown
  remarkPlugins={[remarkGfm]}
  rehypePlugins={[rehypeHighlight]}
  components={{
    a({ children, href }) {
      return (
        <a href={href} target="_blank" rel="noopener noreferrer" className="text-emerald-200 underline">
          {children}
        </a>
      );
    },
    code({ inline, className, children }) {
      if (inline) {
        return <code className="text-emerald-200/90">{children}</code>;
      }
      const language = className?.replace('language-', '') || 'text';
      const code = String(children).replace(/\n$/, '');
      return (
        <div className="rounded-lg overflow-hidden bg-emerald-950/70 border border-emerald-400/20">
          <div className="flex items-center justify-between px-4 py-2 bg-emerald-900/60 text-xs text-emerald-200/70">
            <span>{language}</span>
            <button onClick={() => handleCopy(code, copyKey)}>
              {isCopied ? 'Skopiowano!' : 'Kopiuj'}
            </button>
          </div>
          <pre className="p-4 overflow-x-auto text-sm">
            <code className={className}>{children}</code>
          </pre>
        </div>
      );
    },
  }}
>
  {message.content}
</ReactMarkdown>
```

## 6.4 ResearchStatus.tsx

Animowany komponent wyświetlany podczas grounding'u:

```typescript
const steps = [
  { icon: Search, labelKey: 'status.steps.scan' },
  { icon: Globe, labelKey: 'status.steps.ground' },
  { icon: Database, labelKey: 'status.steps.analyze' },
  { icon: Sparkles, labelKey: 'status.steps.generate' },
];

export function ResearchStatus() {
  const { t } = useTranslation();

  return (
    <motion.div
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: 'auto' }}
      exit={{ opacity: 0, height: 0 }}
    >
      {/* Animated steps grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {steps.map((step, index) => (
          <motion.div
            key={step.labelKey}
            animate={{
              opacity: [0.3, 1, 0.3],
              scale: [0.95, 1, 0.95],
            }}
            transition={{
              duration: 0.3,
              repeat: Infinity,
              delay: index * 0.1,
            }}
          >
            <step.icon className="w-5 h-5 text-emerald-300" />
            <span>{t(step.labelKey)}</span>
          </motion.div>
        ))}
      </div>

      {/* Animated progress bar */}
      <motion.div
        animate={{ x: ['-100%', '100%'] }}
        transition={{ duration: 0.3, repeat: Infinity }}
      />
    </motion.div>
  );
}
```

## 6.5 ErrorBoundary.tsx

```typescript
export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { hasError: false };

  static getDerivedStateFromError(): ErrorBoundaryState {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('UI error boundary captured:', error, info);
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback;
    }
    return this.props.children;
  }
}
```

## 6.6 SkeletonMessage.tsx

```typescript
export function SkeletonMessage() {
  return (
    <div className="flex gap-4 animate-pulse">
      <div className="w-10 h-10 rounded-lg bg-emerald-400/20 border border-emerald-400/50" />
      <div className="flex-1 space-y-3">
        <div className="h-4 w-3/5 rounded bg-emerald-900/60" />
        <div className="h-4 w-4/5 rounded bg-emerald-900/60" />
        <div className="h-4 w-2/5 rounded bg-emerald-900/60" />
      </div>
    </div>
  );
}
```

---

# 7. SYSTEM AUTORYZACJI

## 7.1 JWT Configuration

**Plik:** `api/auth-utils.ts`

```typescript
import { SignJWT, jwtVerify } from 'jose';

const ACCESS_TOKEN_TTL = 60 * 15;        // 15 minut
const REFRESH_TOKEN_TTL = 60 * 60 * 24 * 7;  // 7 dni

function getSecret(): Uint8Array {
  const secret = process.env.JWT_SECRET;
  if (!secret) throw new Error('JWT_SECRET not configured');
  return new TextEncoder().encode(secret);
}
```

## 7.2 Token generation

```typescript
export async function signTokens(userId: string) {
  const secret = getSecret();

  const accessToken = await new SignJWT({ sub: userId, type: 'access' })
    .setProtectedHeader({ alg: 'HS256' })
    .setExpirationTime(`${ACCESS_TOKEN_TTL}s`)
    .sign(secret);

  const refreshToken = await new SignJWT({ sub: userId, type: 'refresh' })
    .setProtectedHeader({ alg: 'HS256' })
    .setExpirationTime(`${REFRESH_TOKEN_TTL}s`)
    .sign(secret);

  return { accessToken, refreshToken };
}
```

## 7.3 Cookie management

```typescript
export function setAuthCookies(headers: Headers, tokens: { accessToken: string; refreshToken: string }) {
  const secure = process.env.NODE_ENV === 'production' ? '; Secure' : '';
  const common = `Path=/; HttpOnly; SameSite=Strict${secure}`;

  headers.append('Set-Cookie', `access_token=${tokens.accessToken}; Max-Age=${ACCESS_TOKEN_TTL}; ${common}`);
  headers.append('Set-Cookie', `refresh_token=${tokens.refreshToken}; Max-Age=${REFRESH_TOKEN_TTL}; ${common}`);
}

export function clearAuthCookies(headers: Headers) {
  const secure = process.env.NODE_ENV === 'production' ? '; Secure' : '';
  const common = `Path=/; HttpOnly; SameSite=Strict${secure}`;

  headers.append('Set-Cookie', `access_token=; Max-Age=0; ${common}`);
  headers.append('Set-Cookie', `refresh_token=; Max-Age=0; ${common}`);
}
```

## 7.4 Token verification

```typescript
export async function verifyAccessToken(req: Request): Promise<string | null> {
  try {
    const cookies = parseCookies(req);
    const token = cookies.access_token;
    if (!token) return null;

    const { payload } = await jwtVerify(token, getSecret());
    return typeof payload.sub === 'string' ? payload.sub : null;
  } catch {
    return null;
  }
}

export async function verifyRefreshToken(req: Request): Promise<string | null> {
  try {
    const cookies = parseCookies(req);
    const token = cookies.refresh_token;
    if (!token) return null;

    const { payload } = await jwtVerify(token, getSecret());
    return typeof payload.sub === 'string' ? payload.sub : null;
  } catch {
    return null;
  }
}
```

## 7.5 Auth endpoints

### Login (`/api/auth/login`)

```typescript
export default async function handler(req: Request): Promise<Response> {
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), { status: 405, headers });
  }

  const { userId } = await req.json();
  const safeUserId = userId || 'demo-user';
  const tokens = await signTokens(safeUserId);
  setAuthCookies(headers, tokens);

  log('info', 'User logged in', { userId: safeUserId });
  return new Response(JSON.stringify({ success: true }), { status: 200, headers });
}
```

### Refresh (`/api/auth/refresh`)

```typescript
export default async function handler(req: Request): Promise<Response> {
  const userId = await verifyRefreshToken(req);
  if (!userId) {
    return new Response(JSON.stringify({ error: 'Invalid refresh token' }), { status: 401, headers });
  }

  const tokens = await signTokens(userId);
  setAuthCookies(headers, tokens);

  log('info', 'Session refreshed', { userId });
  return new Response(JSON.stringify({ success: true }), { status: 200, headers });
}
```

### Logout (`/api/auth/logout`)

```typescript
export default function handler(req: Request): Response {
  clearAuthCookies(headers);
  log('info', 'User logged out');
  return new Response(JSON.stringify({ success: true }), { status: 200, headers });
}
```

## 7.6 Client-side token refresh

**Plik:** `src/lib/api-client.ts`

```typescript
async function refreshSession(): Promise<boolean> {
  const response = await fetch('/api/auth/refresh', {
    method: 'POST',
    credentials: 'include',
  });
  return response.ok;
}

// W executePrompt():
if (response.status === 401) {
  const refreshed = await refreshSession();
  if (refreshed) {
    return executePrompt(prompt, model, signal);  // Retry
  }
  await fetch('/api/auth/logout', { method: 'POST', credentials: 'include' });
  throw new Error('AUTH_ERROR');
}
```

---

# 8. INTEGRACJE AI

## 8.1 Provider interface

**Plik:** `api/providers.ts`

```typescript
interface ProviderCallInput {
  prompt: string;
  context: string;
  model: string;
}

export interface ProviderDefinition {
  id: string;
  label: string;
  provider: string;
  costPer1kTokens: number;
  isConfigured: () => boolean;
  call: (input: ProviderCallInput) => Promise<string>;
}
```

## 8.2 Dostępne modele

```typescript
export const providerModels = {
  anthropic: () => getModelsFromEnv('ANTHROPIC_MODELS', ['claude-3-5-sonnet-20240620']),
  openai: () => getModelsFromEnv('OPENAI_MODELS', ['gpt-4o-mini']),
  google: () => getModelsFromEnv('GOOGLE_MODELS', ['gemini-2.0-flash']),
  mistral: () => getModelsFromEnv('MISTRAL_MODELS', ['mistral-small-latest']),
  groq: () => getModelsFromEnv('GROQ_MODELS', ['llama-3.1-70b-versatile']),
  ollama: () => getModelsFromEnv('OLLAMA_MODELS', ['qwen2.5-coder:7b']),
};
```

## 8.3 Provider implementations

### Anthropic (Claude)

```typescript
async function callAnthropic({ prompt, context, model }: ProviderCallInput): Promise<string> {
  const apiKey = process.env.ANTHROPIC_API_KEY;

  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model,
      max_tokens: 2048,
      messages: [{
        role: 'user',
        content: context ? `Context:\n${context}\n\nUser:\n${prompt}` : prompt,
      }],
    }),
    signal: AbortSignal.timeout(60000),
  });

  const data = await response.json();
  return data?.content?.[0]?.text || 'No response generated';
}
```

### OpenAI (GPT)

```typescript
async function callOpenAI({ prompt, context, model }: ProviderCallInput): Promise<string> {
  const apiKey = process.env.OPENAI_API_KEY;

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model,
      messages: [{
        role: 'user',
        content: context ? `Context:\n${context}\n\nUser:\n${prompt}` : prompt,
      }],
      temperature: 0.7,
    }),
    signal: AbortSignal.timeout(60000),
  });

  const data = await response.json();
  return data?.choices?.[0]?.message?.content || 'No response generated';
}
```

### Google (Gemini)

```typescript
async function callGoogle({ prompt, context, model }: ProviderCallInput): Promise<string> {
  const apiKey = process.env.GOOGLE_API_KEY;

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{
          parts: [{
            text: context
              ? `Context from web search:\n${context}\n\nUser request:\n${prompt}`
              : prompt,
          }],
        }],
        generationConfig: {
          temperature: 0.7,
          maxOutputTokens: 2048,
        },
      }),
      signal: AbortSignal.timeout(60000),
    }
  );

  const data = await response.json();
  return data.candidates?.[0]?.content?.parts?.[0]?.text || 'No response generated';
}
```

### Mistral

```typescript
async function callMistral({ prompt, context, model }: ProviderCallInput): Promise<string> {
  const apiKey = process.env.MISTRAL_API_KEY;

  const response = await fetch('https://api.mistral.ai/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model,
      messages: [{
        role: 'user',
        content: context ? `Context:\n${context}\n\nUser:\n${prompt}` : prompt,
      }],
    }),
    signal: AbortSignal.timeout(60000),
  });

  const data = await response.json();
  return data?.choices?.[0]?.message?.content || 'No response generated';
}
```

### Groq

```typescript
async function callGroq({ prompt, context, model }: ProviderCallInput): Promise<string> {
  const apiKey = process.env.GROQ_API_KEY;

  const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model,
      messages: [{
        role: 'user',
        content: context ? `Context:\n${context}\n\nUser:\n${prompt}` : prompt,
      }],
    }),
    signal: AbortSignal.timeout(60000),
  });

  const data = await response.json();
  return data?.choices?.[0]?.message?.content || 'No response generated';
}
```

### Ollama (local)

```typescript
async function callOllama({ prompt, context, model }: ProviderCallInput): Promise<string> {
  const tunnelUrl = process.env.CLOUDFLARE_TUNNEL_URL;

  const response = await fetch(`${tunnelUrl}/api/generate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model,
      prompt: context ? `Context:\n${context}\n\nTask:\n${prompt}` : prompt,
      stream: false,
    }),
    signal: AbortSignal.timeout(120000),  // 2 min dla local
  });

  const data = await response.json();
  return data.response || '';
}
```

## 8.4 Fallback logic

```typescript
const fallbackOrder = ['anthropic', 'openai', 'google', 'mistral', 'groq', 'ollama'];

for (const definition of candidates) {
  if (!definition.isConfigured()) continue;

  try {
    response = await definition.call({ prompt, context, model: definition.id });
    modelUsed = definition.id;

    const tokens = Math.ceil(response.length / 4);
    cost = (tokens / 1000) * definition.costPer1kTokens;
    recordUsage(definition.id, tokens, cost);
    break;
  } catch (error) {
    log('warn', 'Provider call failed', { provider: definition.provider, error });
    // Kontynuuj do następnego providera
  }
}

if (!response) {
  throw new Error('All providers failed');
}
```

## 8.5 Koszty per provider

| Provider | Model | Koszt/1k tokenów |
|----------|-------|------------------|
| Anthropic | claude-3-5-sonnet | $0.003 |
| OpenAI | gpt-4o-mini | $0.00015 |
| Google | gemini-2.0-flash | $0.0001 |
| Mistral | mistral-small | $0.0002 |
| Groq | llama-3.1-70b | $0.0002 |
| Ollama | local | $0.00 |

---

# 9. LOKALIZACJA (i18n)

## 9.1 Konfiguracja

**Plik:** `src/i18n/index.ts`

```typescript
import i18n from 'i18next';
import resourcesToBackend from 'i18next-resources-to-backend';
import { initReactI18next } from 'react-i18next';

void i18n
  .use(
    resourcesToBackend((language: string) => {
      return import(`./locales/${language}.json`);  // Lazy loading
    })
  )
  .use(initReactI18next)
  .init({
    lng: 'pl',           // Domyślny język
    fallbackLng: 'en',   // Fallback
    interpolation: { escapeValue: false },
    react: { useSuspense: true },
  });

export default i18n;
```

## 9.2 Struktura tłumaczeń

### Polski (`pl.json`)

```json
{
  "app": {
    "title": "Regis Matrix Lab",
    "subtitle": "Asystent badawczy z efektem digital rain",
    "welcomeTitle": "Witaj w Regis Matrix",
    "welcomeBody": "Twój zielony asystent badawczy. Zadaj pytanie...",
    "inputPlaceholder": "Wpisz pytanie do Regis...",
    "poweredBy": "Zasilane przez Edge Functions + Google Grounding",
    "themeLight": "Włącz jasny motyw",
    "themeDark": "Włącz ciemny motyw",
    "shortcuts": "Skróty",
    "clearChat": "Wyczyść czat",
    "clearChatShortcut": "Ctrl+L",
    "focusInputShortcut": "Ctrl+K",
    "undoShortcut": "Ctrl+Z",
    "redoShortcut": "Ctrl+Y"
  },
  "status": {
    "title": "Pracuję nad odpowiedzią...",
    "subtitle": "Zbieram kontekst z internetu",
    "steps": {
      "scan": "Skanuję",
      "ground": "Uziemiam",
      "analyze": "Analizuję",
      "generate": "Generuję"
    }
  },
  "messages": {
    "thinking": "Myślę...",
    "sources": "Źródła ({{count}})",
    "copy": "Kopiuj",
    "copied": "Skopiowano!",
    "modelUsed": "Model: {{model}}",
    "timestamp": "{{time}}"
  },
  "errors": {
    "auth": "Uwierzytelnianie nieudane. Zaloguj się ponownie.",
    "timeout": "Przekroczono limit czasu. Spróbuj prostszego zapytania.",
    "rateLimit": "Limit żądań przekroczony. Spróbuj później.",
    "unknown": "Coś poszło nie tak."
  },
  "health": {
    "title": "Panel zdrowia",
    "status": "Status",
    "tokens": "Tokeny",
    "cost": "Koszt"
  },
  "forms": {
    "inputRequired": "To pole jest wymagane.",
    "inputMin": "Wpisz co najmniej 3 znaki."
  },
  "statusLabels": {
    "online": "Online",
    "offline": "Offline"
  }
}
```

### English (`en.json`)

```json
{
  "app": {
    "title": "Regis Matrix Lab",
    "subtitle": "Research assistant with digital rain effect",
    "welcomeTitle": "Welcome to Regis Matrix",
    "welcomeBody": "Your green research assistant. Ask a question...",
    "inputPlaceholder": "Ask Regis a question...",
    "poweredBy": "Powered by Edge Functions + Google Grounding"
  },
  "status": {
    "title": "Working on the answer...",
    "subtitle": "Gathering context from the internet",
    "steps": {
      "scan": "Scanning",
      "ground": "Grounding",
      "analyze": "Analyzing",
      "generate": "Generating"
    }
  },
  "messages": {
    "thinking": "Thinking...",
    "sources": "Sources ({{count}})",
    "copy": "Copy",
    "copied": "Copied!"
  },
  "errors": {
    "auth": "Authentication failed. Please log in again.",
    "timeout": "Request timed out. Try a simpler query.",
    "rateLimit": "Rate limit exceeded. Try again later.",
    "unknown": "Something went wrong."
  }
}
```

## 9.3 Użycie w komponentach

```typescript
import { useTranslation } from 'react-i18next';

function MyComponent() {
  const { t, i18n } = useTranslation();

  return (
    <div>
      <h1>{t('app.title')}</h1>
      <p>{t('messages.sources', { count: 5 })}</p>

      <button onClick={() => i18n.changeLanguage('en')}>
        English
      </button>
    </div>
  );
}
```

---

# 10. STORAGE I SZYFROWANIE

## 10.1 IndexedDB Setup

**Plik:** `src/lib/storage.ts`

```typescript
import { openDB } from 'idb';

const DB_NAME = 'regis-matrix-db';
const STORE_NAME = 'chat-backups';
const KEY_STORAGE = 'regis-matrix-aes-key';
const MAX_BACKUPS = 10;

async function getDb() {
  return openDB(DB_NAME, 1, {
    upgrade(db) {
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'id' });
      }
    },
  });
}
```

## 10.2 AES-256 Key Management

```typescript
async function getKey(): Promise<CryptoKey> {
  const stored = localStorage.getItem(KEY_STORAGE);

  if (stored) {
    // Import existing key
    const raw = Uint8Array.from(atob(stored), (c) => c.charCodeAt(0));
    return crypto.subtle.importKey('raw', raw, 'AES-GCM', true, ['encrypt', 'decrypt']);
  }

  // Generate new key
  const key = await crypto.subtle.generateKey(
    { name: 'AES-GCM', length: 256 },
    true,
    ['encrypt', 'decrypt']
  );

  // Export and store
  const raw = new Uint8Array(await crypto.subtle.exportKey('raw', key));
  localStorage.setItem(KEY_STORAGE, btoa(String.fromCharCode(...raw)));

  return key;
}
```

## 10.3 Encryption/Decryption

```typescript
async function encryptPayload(payload: string): Promise<{ iv: string; data: string }> {
  const key = await getKey();
  const iv = crypto.getRandomValues(new Uint8Array(12));  // 96-bit IV
  const encoded = new TextEncoder().encode(payload);

  const encrypted = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    key,
    encoded
  );

  return {
    iv: btoa(String.fromCharCode(...iv)),
    data: btoa(String.fromCharCode(...new Uint8Array(encrypted))),
  };
}

async function decryptPayload(payload: { iv: string; data: string }): Promise<string> {
  const key = await getKey();
  const iv = Uint8Array.from(atob(payload.iv), (c) => c.charCodeAt(0));
  const data = Uint8Array.from(atob(payload.data), (c) => c.charCodeAt(0));

  const decrypted = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv },
    key,
    data
  );

  return new TextDecoder().decode(decrypted);
}
```

## 10.4 Backup Operations

```typescript
export async function saveBackup(messages: Message[]): Promise<void> {
  const db = await getDb();
  const payload = JSON.stringify({
    messages,
    createdAt: new Date().toISOString(),
  });

  const encrypted = await encryptPayload(payload);
  const id = Date.now();

  await db.put(STORE_NAME, { id, ...encrypted });

  // Prune old backups (keep max 10)
  const keys = await db.getAllKeys(STORE_NAME);
  const excess = keys.length - MAX_BACKUPS;
  if (excess > 0) {
    const sorted = keys.sort();
    await Promise.all(sorted.slice(0, excess).map((key) => db.delete(STORE_NAME, key)));
  }
}

export async function loadLatestBackup(): Promise<Message[] | null> {
  const db = await getDb();
  const keys = await db.getAllKeys(STORE_NAME);

  if (keys.length === 0) return null;

  const latestKey = keys.sort().at(-1);
  if (latestKey === undefined) return null;

  const record = await db.get(STORE_NAME, latestKey);
  if (!record) return null;

  const decrypted = await decryptPayload({ iv: record.iv, data: record.data });
  const parsed = JSON.parse(decrypted);

  return parsed.messages.map((message: Message) => ({
    ...message,
    timestamp: new Date(message.timestamp),
  }));
}
```

## 10.5 Auto-backup w App.tsx

```typescript
// Restore on mount
useEffect(() => {
  loadLatestBackup()
    .then((stored) => {
      if (stored) setMessages(stored);
    })
    .catch((err) => console.warn('Backup restore failed', err));
}, []);

// Auto-save every 5 minutes
useEffect(() => {
  const interval = setInterval(() => {
    saveBackup(messages).catch((err) => console.warn('Backup failed', err));
  }, 300000);

  return () => clearInterval(interval);
}, [messages]);
```

---

# 11. TESTOWANIE

## 11.1 Playwright Configuration

**Plik:** `playwright.config.ts`

```typescript
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests',
  timeout: 30000,
  fullyParallel: true,
  retries: process.env.CI ? 1 : 0,
  reporter: [['list'], ['html', { open: 'never' }]],

  use: {
    baseURL: 'http://localhost:4173',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },

  webServer: {
    command: 'pnpm dev --host 0.0.0.0 --port 4173',
    url: 'http://localhost:4173',
    reuseExistingServer: !process.env.CI,
    timeout: 120000,
  },

  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
    { name: 'firefox', use: { ...devices['Desktop Firefox'] } },
    { name: 'webkit', use: { ...devices['Desktop Safari'] } },
  ],
});
```

## 11.2 E2E Tests

**Plik:** `tests/app.spec.ts`

```typescript
import { expect, test } from '@playwright/test';

test('shows the matrix header and input', async ({ page }) => {
  await page.goto('/');

  await expect(page.getByRole('heading', { name: 'Regis Matrix Lab' })).toBeVisible();
  await expect(page.getByText('Asystent badawczy z efektem digital rain')).toBeVisible();
  await expect(page.getByPlaceholder('Wpisz pytanie do Regis...')).toBeVisible();
});

test('renders suggestion chips', async ({ page }) => {
  await page.goto('/');

  const suggestions = [
    'Wyjaśnij komputery kwantowe',
    'Napisz sortowanie w Pythonie',
    'Porównaj REST vs GraphQL',
  ];

  for (const label of suggestions) {
    await expect(page.getByRole('button', { name: label })).toBeVisible();
  }
});

test('toggles the theme switch', async ({ page }) => {
  await page.goto('/');

  const toggle = page.getByRole('button', { name: /Włącz/ });
  await expect(toggle).toBeVisible();

  const initialTheme = await page.evaluate(() => document.documentElement.dataset.theme);
  await toggle.click();
  // Theme should change
});
```

## 11.3 Uruchamianie testów

```bash
# Uruchom wszystkie testy
pnpm test:e2e

# Uruchom z UI
pnpm playwright test --ui

# Uruchom tylko Chromium
pnpm playwright test --project=chromium

# Debug mode
pnpm playwright test --debug
```

---

# 12. DEPLOYMENT

## 12.1 Vercel Deployment

### Automatyczny deployment

1. Połącz repozytorium z Vercel
2. Ustaw zmienne środowiskowe w Vercel Dashboard
3. Push do `main` → automatyczny deploy

### Manual deployment

```bash
# Zainstaluj Vercel CLI
npm i -g vercel

# Deploy preview
vercel

# Deploy production
vercel --prod
```

## 12.2 Build process

```bash
# Local build
pnpm build

# Output:
# dist/
# ├── index.html
# ├── assets/
# │   ├── index-[hash].js
# │   ├── index-[hash].css
# │   ├── vendor-[hash].js
# │   ├── animations-[hash].js
# │   └── state-[hash].js
# └── favicon.svg
```

## 12.3 Edge Function regions

```
cdg1 - Paris, France
fra1 - Frankfurt, Germany
```

Niskolatencyjne odpowiedzi dla użytkowników z Europy.

---

# 13. API REFERENCE

## 13.1 POST `/api/execute`

**Opis:** Główny endpoint do przetwarzania promptów AI z grounding'iem.

### Request

```http
POST /api/execute
Content-Type: application/json
Cookie: access_token=...; refresh_token=...

{
  "prompt": "string (required)",
  "model": "string (optional)",
  "stream": "boolean (optional)"
}
```

### Response (200)

```json
{
  "success": true,
  "response": "Generated AI response...",
  "sources": [
    {
      "title": "Source Title",
      "link": "https://example.com/article",
      "snippet": "Brief description..."
    }
  ],
  "model_used": "claude-3-5-sonnet-20240620",
  "grounding_performed": true
}
```

### Errors

| Status | Error | Opis |
|--------|-------|------|
| 400 | Missing prompt | Brak wymaganego pola `prompt` |
| 401 | Invalid API key | Nieprawidłowa autoryzacja |
| 405 | Method not allowed | Tylko POST dozwolone |
| 429 | Rate limit exceeded | Przekroczono 20 żądań/min |
| 500 | Internal server error | Błąd serwera |

---

## 13.2 GET `/api/models`

**Opis:** Lista dostępnych modeli AI.

### Response (200)

```json
{
  "models": [
    {
      "id": "claude-3-5-sonnet-20240620",
      "label": "Claude (claude-3-5-sonnet-20240620)",
      "provider": "anthropic"
    },
    {
      "id": "gpt-4o-mini",
      "label": "OpenAI (gpt-4o-mini)",
      "provider": "openai"
    }
  ]
}
```

---

## 13.3 GET `/api/health`

**Opis:** Status zdrowotności systemu i providerów.

### Response (200)

```json
{
  "status": "ok",
  "timestamp": "2024-01-15T10:30:00.000Z",
  "version": "1.1.0",
  "providers": [
    {
      "model": "claude-3-5-sonnet-20240620",
      "status": "ok",
      "tokens": 15420,
      "cost": 0.0463
    },
    {
      "model": "gpt-4o-mini",
      "status": "down",
      "tokens": 0,
      "cost": 0
    }
  ]
}
```

---

## 13.4 POST `/api/auth/login`

**Opis:** Logowanie i generowanie tokenów JWT.

### Request

```json
{
  "userId": "string (optional, defaults to 'demo-user')"
}
```

### Response (200)

```http
Set-Cookie: access_token=...; Max-Age=900; Path=/; HttpOnly; SameSite=Strict
Set-Cookie: refresh_token=...; Max-Age=604800; Path=/; HttpOnly; SameSite=Strict

{
  "success": true
}
```

---

## 13.5 POST `/api/auth/refresh`

**Opis:** Odświeżanie tokenów JWT.

### Request

```http
Cookie: refresh_token=...
```

### Response (200)

```json
{
  "success": true
}
```

### Error (401)

```json
{
  "error": "Invalid refresh token"
}
```

---

## 13.6 POST `/api/auth/logout`

**Opis:** Wylogowanie i czyszczenie cookies.

### Response (200)

```http
Set-Cookie: access_token=; Max-Age=0; ...
Set-Cookie: refresh_token=; Max-Age=0; ...

{
  "success": true
}
```

---

# 14. ZMIENNE ŚRODOWISKOWE

## 14.1 Wymagane

| Zmienna | Opis | Przykład |
|---------|------|----------|
| `JWT_SECRET` | Klucz do podpisywania JWT | `your-secret-key-min-32-chars` |
| `ALLOWED_ORIGINS` | Dozwolone originy dla CORS | `https://example.com,https://www.example.com` |

## 14.2 Google Search (wymagane dla grounding)

| Zmienna | Opis |
|---------|------|
| `GOOGLE_API_KEY` | API key dla Google APIs |
| `GOOGLE_SEARCH_CX` | Custom Search Engine ID |

## 14.3 AI Providers (min. 1 wymagany)

| Zmienna | Provider | Domyślny model |
|---------|----------|----------------|
| `ANTHROPIC_API_KEY` | Anthropic | claude-3-5-sonnet-20240620 |
| `OPENAI_API_KEY` | OpenAI | gpt-4o-mini |
| `MISTRAL_API_KEY` | Mistral | mistral-small-latest |
| `GROQ_API_KEY` | Groq | llama-3.1-70b-versatile |
| `CLOUDFLARE_TUNNEL_URL` | Ollama (local) | qwen2.5-coder:7b |

## 14.4 Opcjonalne konfiguracje modeli

| Zmienna | Opis | Format |
|---------|------|--------|
| `ANTHROPIC_MODELS` | Custom modele Anthropic | `claude-3-opus,claude-3-sonnet` |
| `OPENAI_MODELS` | Custom modele OpenAI | `gpt-4,gpt-4-turbo` |
| `GOOGLE_MODELS` | Custom modele Google | `gemini-pro,gemini-ultra` |
| `MISTRAL_MODELS` | Custom modele Mistral | `mistral-large,mistral-medium` |
| `GROQ_MODELS` | Custom modele Groq | `llama-3.1-8b,mixtral-8x7b` |
| `OLLAMA_MODELS` | Custom modele Ollama | `llama3,codellama` |

## 14.5 Inne

| Zmienna | Opis |
|---------|------|
| `INTERNAL_AUTH_KEY` | Opcjonalny klucz API dla x-api-key header |
| `NODE_ENV` | Środowisko (`production` dla secure cookies) |

## 14.6 Przykładowy `.env`

```env
# JWT
JWT_SECRET=your-very-secure-secret-key-at-least-32-characters

# CORS
ALLOWED_ORIGINS=http://localhost:3000,https://yourdomain.com

# Google Search
GOOGLE_API_KEY=AIza...
GOOGLE_SEARCH_CX=017576...

# AI Providers (minimum 1)
ANTHROPIC_API_KEY=sk-ant-api03-...
OPENAI_API_KEY=sk-proj-...
GOOGLE_API_KEY=AIza...  # same as search or different
MISTRAL_API_KEY=...
GROQ_API_KEY=gsk_...
CLOUDFLARE_TUNNEL_URL=https://your-tunnel.trycloudflare.com

# Optional
INTERNAL_AUTH_KEY=internal-api-key-for-direct-access
```

---

# 15. SKRÓTY KLAWIATUROWE

| Skrót | Akcja |
|-------|-------|
| `Ctrl+K` | Focus na polu input |
| `Ctrl+L` | Wyczyść czat |
| `Ctrl+Z` | Cofnij (undo) |
| `Ctrl+Y` | Ponów (redo) |

---

# PODSUMOWANIE

**Regis Matrix Lab** to nowoczesna, full-stack aplikacja AI demonstrująca:

- **Edge Computing** - niskolatencyjne Vercel Edge Functions
- **Multi-Model AI** - 6 providerów z automatycznym fallbackiem
- **Web Grounding** - kontekst z Google Custom Search
- **Security** - JWT z httpOnly cookies, CORS, Rate Limiting
- **Offline Support** - PWA + szyfrowane backupy AES-256
- **Modern React** - React 19, TypeScript, TanStack Query, Zustand
- **i18n** - Polski i angielski z lazy-loading
- **UX** - Animacje Framer Motion, Dark/Light mode, Undo/Redo
- **Testing** - Playwright E2E na 3 przeglądarkach

---

*Dokumentacja wygenerowana: 2024*
