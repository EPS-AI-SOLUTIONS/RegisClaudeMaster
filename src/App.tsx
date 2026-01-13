import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Send, BookOpen, Zap, Sun, Moon } from 'lucide-react';
import { ChatInterface } from './components/ChatInterface';
import { ResearchStatus } from './components/ResearchStatus';
import { useChat } from './lib/useChat';

function App() {
  const [input, setInput] = useState('');
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');
  const { messages, isLoading, isResearching, sendMessage, error } = useChat();

  useEffect(() => {
    const media = window.matchMedia('(prefers-color-scheme: light)');
    const initialTheme = media.matches ? 'light' : 'dark';
    setTheme(initialTheme);
    document.documentElement.dataset.theme = initialTheme;

    const handleChange = (event: MediaQueryListEvent) => {
      const nextTheme = event.matches ? 'light' : 'dark';
      setTheme(nextTheme);
      document.documentElement.dataset.theme = nextTheme;
    };

    media.addEventListener('change', handleChange);
    return () => {
      media.removeEventListener('change', handleChange);
    };
  }, []);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
  }, [theme]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    const prompt = input.trim();
    setInput('');
    await sendMessage(prompt);
  };

  return (
    <div className="min-h-screen text-emerald-50">
      {/* Header */}
      <header className="sticky top-0 z-10 border-b border-emerald-400/20 bg-emerald-950/60 backdrop-blur">
        <div className="max-w-5xl mx-auto px-4 py-4 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-emerald-400/20 flex items-center justify-center border border-emerald-400/40">
              <img
                src="https://pawelserkowski.pl/logo.webp"
                alt="Logo Regis"
                className="w-8 h-8"
                loading="lazy"
              />
            </div>
            <div>
              <h1 className="text-xl font-semibold text-emerald-100">
                Regis Matrix Lab
              </h1>
              <p className="text-xs text-emerald-300/70">
                Asystent badawczy z efektem digital rain
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3 text-emerald-200/80 text-sm">
            <div className="flex items-center gap-2 px-3 py-2 rounded-full bg-emerald-400/10 border border-emerald-400/30">
              <Zap className="w-4 h-4 text-emerald-300" />
              <span>Rust + React 19</span>
            </div>
            <button
              type="button"
              onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
              className="p-2 rounded-full border border-emerald-400/30 bg-emerald-950/60 hover:bg-emerald-900/70 transition-colors"
              aria-label={theme === 'dark' ? 'Włącz jasny motyw' : 'Włącz ciemny motyw'}
            >
              {theme === 'dark' ? (
                <Sun className="w-4 h-4 text-emerald-200" />
              ) : (
                <Moon className="w-4 h-4 text-emerald-200" />
              )}
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-5xl mx-auto px-4 py-8 pb-36">
        {/* Empty State */}
        {messages.length === 0 && !isLoading && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center py-16"
          >
            <div className="w-20 h-20 mx-auto mb-6 rounded-2xl bg-emerald-400/10 border border-emerald-400/30 flex items-center justify-center">
              <BookOpen className="w-10 h-10 text-emerald-300" />
            </div>
            <h2 className="text-2xl font-semibold text-emerald-100 mb-2">
              Witaj w Regis Matrix
            </h2>
            <p className="text-emerald-200/70 max-w-md mx-auto mb-8">
              Twój zielony asystent badawczy. Zadaj pytanie, a ja wyszukam kontekst,
              przeanalizuję źródła i odpowiem.
            </p>
            <div className="flex flex-wrap justify-center gap-2">
              {[
                'Wyjaśnij komputery kwantowe',
                'Napisz sortowanie w Pythonie',
                'Porównaj REST vs GraphQL',
              ].map((suggestion) => (
                <button
                  key={suggestion}
                  onClick={() => setInput(suggestion)}
                  className="px-4 py-2 rounded-lg bg-emerald-950/60 hover:bg-emerald-900/70 text-emerald-200 text-sm transition-colors border border-emerald-400/20"
                >
                  {suggestion}
                </button>
              ))}
            </div>
          </motion.div>
        )}

        {/* Research Status */}
        <AnimatePresence>
          {isResearching && <ResearchStatus />}
        </AnimatePresence>

        {/* Chat Messages */}
        <ChatInterface messages={messages} isLoading={isLoading} />

        {/* Error Display */}
        <AnimatePresence>
          {error && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="mt-4 p-4 rounded-lg bg-red-500/10 border border-red-500/30 text-red-200"
            >
              {error}
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Input Form */}
      <div className="fixed bottom-0 left-0 right-0 bg-gradient-to-t from-emerald-950 via-emerald-950/95 to-transparent pt-8 pb-6">
        <form onSubmit={handleSubmit} className="max-w-5xl mx-auto px-4">
          <div className="relative">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Wpisz pytanie do Regis..."
              disabled={isLoading}
              className="w-full px-6 py-4 pr-14 rounded-2xl bg-emerald-950/70 border border-emerald-400/30
                       text-emerald-50 placeholder:text-emerald-300/60 focus:outline-none focus:ring-2
                       focus:ring-emerald-400/50 focus:border-emerald-300/70 transition-all
                       disabled:opacity-50 disabled:cursor-not-allowed"
            />
            <button
              type="submit"
              disabled={!input.trim() || isLoading}
              className="absolute right-2 top-1/2 -translate-y-1/2 p-3 rounded-xl
                       bg-emerald-400 hover:bg-emerald-300 disabled:bg-emerald-900
                       disabled:cursor-not-allowed transition-colors"
            >
              <Send className="w-5 h-5 text-emerald-950" />
            </button>
          </div>
          <p className="text-center text-xs text-emerald-300/60 mt-3">
            Zasilane przez funkcje Rust + Google Grounding
          </p>
        </form>
      </div>
    </div>
  );
}

export default App;
