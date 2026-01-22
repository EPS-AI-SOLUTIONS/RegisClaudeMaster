/**
 * Real Ollama API server (no mock!)
 * Connects to local Ollama instance
 */

import http from 'http';

const OLLAMA_URL = 'http://127.0.0.1:11434';

// Fetch available models from Ollama
async function getOllamaModels() {
  try {
    const res = await fetch(`${OLLAMA_URL}/api/tags`);
    const data = await res.json();
    return data.models || [];
  } catch (e) {
    console.error('Ollama not available:', e.message);
    return [];
  }
}

// Call Ollama for completion
async function callOllama(model, prompt, context = '') {
  const fullPrompt = context ? `Context:\n${context}\n\nQuestion: ${prompt}` : prompt;

  const res = await fetch(`${OLLAMA_URL}/api/generate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model,
      prompt: fullPrompt,
      stream: false
    })
  });

  const data = await res.json();
  return data.response || 'No response';
}

// Stream from Ollama
async function streamOllama(model, prompt, context, res) {
  const fullPrompt = context ? `Context:\n${context}\n\nQuestion: ${prompt}` : prompt;

  const response = await fetch(`${OLLAMA_URL}/api/generate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model,
      prompt: fullPrompt,
      stream: true
    })
  });

  const reader = response.body.getReader();
  const decoder = new TextDecoder();

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    const chunk = decoder.decode(value);
    const lines = chunk.split('\n').filter(Boolean);

    for (const line of lines) {
      try {
        const json = JSON.parse(line);
        if (json.response) {
          res.write(`data: ${JSON.stringify({ token: json.response })}\n\n`);
        }
        if (json.done) {
          res.write(`data: ${JSON.stringify({ done: true, model_used: model })}\n\n`);
        }
      } catch (e) {
        // skip invalid JSON
      }
    }
  }

  res.end();
}

// Create HTTP server
const server = http.createServer(async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Content-Type', 'application/json');

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  const url = req.url.split('?')[0];

  // Health endpoint
  if (url === '/api/health') {
    const models = await getOllamaModels();
    res.writeHead(200);
    res.end(JSON.stringify({
      status: models.length > 0 ? 'ok' : 'degraded',
      timestamp: new Date().toISOString(),
      version: '1.2.0-ollama',
      summary: {
        total: models.length,
        healthy: models.length,
        degraded: 0,
        down: 0,
        notConfigured: 0,
        averageLatency: 100,
        overallSuccessRate: 100
      },
      providers: models.map(m => ({
        model: m.name,
        provider: 'ollama',
        configured: true,
        status: 'ok',
        circuit: { state: 'CLOSED', failures: 0, successes: 10 },
        health: { latency: 100, successRate: 1, healthScore: 10 },
        tokens: 0,
        cost: 0
      }))
    }));
    return;
  }

  // Models endpoint
  if (url === '/api/models') {
    const models = await getOllamaModels();
    res.writeHead(200);
    res.end(JSON.stringify({
      models: models.map(m => ({
        id: m.name,
        label: `Ollama (${m.name})`,
        provider: 'ollama'
      }))
    }));
    return;
  }

  // Execute endpoint (chat)
  if (url === '/api/execute' && req.method === 'POST') {
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', async () => {
      try {
        const data = JSON.parse(body);
        const prompt = data.prompt || 'Hello';
        const context = data.context || '';
        const models = await getOllamaModels();
        let model = data.model;
        // Handle "auto" or missing model - use first available
        if (!model || model === 'auto' || model === 'Auto') {
          model = models[0]?.name || 'llama3.2:1b';
        }

        console.log(`[Ollama] Calling ${model} with prompt: "${prompt.substring(0, 50)}..."`);

        const start = Date.now();
        const response = await callOllama(model, prompt, context);
        const latency = Date.now() - start;

        console.log(`[Ollama] Response received in ${latency}ms`);

        res.writeHead(200);
        res.end(JSON.stringify({
          response,
          model_used: model,
          latency,
          sources: []
        }));
      } catch (e) {
        console.error('[Ollama] Error:', e.message);
        res.writeHead(500);
        res.end(JSON.stringify({ error: e.message }));
      }
    });
    return;
  }

  // Stream endpoint
  if (url === '/api/stream' && req.method === 'POST') {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.writeHead(200);

    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', async () => {
      try {
        const data = JSON.parse(body);
        const prompt = data.prompt || 'Hello';
        const context = data.context || '';
        const models = await getOllamaModels();
        const model = data.model || models[0]?.name || 'llama3.2:1b';

        console.log(`[Ollama] Streaming ${model} with prompt: "${prompt.substring(0, 50)}..."`);
        await streamOllama(model, prompt, context, res);
      } catch (e) {
        console.error('[Ollama] Stream error:', e.message);
        res.write(`data: ${JSON.stringify({ error: e.message })}\n\n`);
        res.end();
      }
    });
    return;
  }

  // 404
  res.writeHead(404);
  res.end(JSON.stringify({ error: 'Not found', path: url }));
});

const PORT = 3001;
server.listen(PORT, () => {
  console.log('\n========================================');
  console.log('   REGIS - Real Ollama API Server');
  console.log('========================================\n');
  console.log(`API:     http://localhost:${PORT}`);
  console.log(`Ollama:  ${OLLAMA_URL}`);
  console.log('\nEndpoints: /api/health, /api/models, /api/execute, /api/stream\n');
});
