#!/usr/bin/env node
/**
 * Development server with real Ollama API
 * Runs Vite dev server + Ollama API proxy together
 *
 * Usage: node dev-ollama.mjs
 * Or:    npm run dev:ollama
 */

import { spawn } from 'child_process';
import { createServer } from 'http';

const VITE_PORT = 5173;
const API_PORT = 3001;
const OLLAMA_URL = 'http://127.0.0.1:11434';

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
};

function log(prefix, color, message) {
  console.log(`${color}[${prefix}]${colors.reset} ${message}`);
}

// Check if Ollama is running
async function checkOllama() {
  try {
    const response = await fetch(`${OLLAMA_URL}/api/tags`);
    if (response.ok) {
      const data = await response.json();
      const models = data.models?.map(m => m.name) || [];
      log('ollama', colors.green, `Connected! Models: ${models.join(', ') || 'none'}`);
      return true;
    }
  } catch {
    log('ollama', colors.yellow, `Not running at ${OLLAMA_URL}`);
    log('ollama', colors.yellow, 'Start with: ollama serve');
    return false;
  }
  return false;
}

// Start Vite dev server
function startVite() {
  log('vite', colors.cyan, `Starting on port ${VITE_PORT}...`);

  const vite = spawn('npx', ['vite', '--port', VITE_PORT.toString()], {
    stdio: 'pipe',
    shell: true,
    env: { ...process.env, FORCE_COLOR: '1' },
  });

  vite.stdout.on('data', (data) => {
    const lines = data.toString().split('\n').filter(Boolean);
    lines.forEach(line => {
      if (line.includes('ready') || line.includes('Local:')) {
        log('vite', colors.cyan, line.trim());
      }
    });
  });

  vite.stderr.on('data', (data) => {
    log('vite', colors.yellow, data.toString().trim());
  });

  return vite;
}

// Start Ollama API proxy
function startApiProxy() {
  log('api', colors.magenta, `Starting proxy on port ${API_PORT}...`);

  const api = spawn('node', ['ollama-api.mjs'], {
    stdio: 'pipe',
    shell: true,
    env: { ...process.env, PORT: API_PORT.toString() },
  });

  api.stdout.on('data', (data) => {
    const lines = data.toString().split('\n').filter(Boolean);
    lines.forEach(line => {
      log('api', colors.magenta, line.trim());
    });
  });

  api.stderr.on('data', (data) => {
    log('api', colors.yellow, data.toString().trim());
  });

  return api;
}

// Main
async function main() {
  console.log('\n' + '='.repeat(50));
  log('dev', colors.green, 'Starting development environment with Ollama');
  console.log('='.repeat(50) + '\n');

  // Check Ollama first
  const ollamaReady = await checkOllama();
  if (!ollamaReady) {
    log('dev', colors.yellow, 'Continuing without Ollama (will retry on requests)');
  }

  // Start both servers
  const viteProcess = startVite();
  const apiProcess = startApiProxy();

  // Wait a moment then show URLs
  setTimeout(() => {
    console.log('\n' + '-'.repeat(50));
    log('dev', colors.green, 'Development servers ready:');
    console.log(`  ${colors.cyan}Frontend:${colors.reset} http://localhost:${VITE_PORT}`);
    console.log(`  ${colors.magenta}API:${colors.reset}      http://localhost:${API_PORT}`);
    console.log(`  ${colors.blue}Ollama:${colors.reset}   ${OLLAMA_URL}`);
    console.log('-'.repeat(50));
    console.log(`\nPress ${colors.yellow}Ctrl+C${colors.reset} to stop all servers\n`);
  }, 2000);

  // Handle shutdown
  const shutdown = () => {
    console.log('\n');
    log('dev', colors.yellow, 'Shutting down...');
    viteProcess.kill();
    apiProcess.kill();
    process.exit(0);
  };

  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);

  // Keep alive
  viteProcess.on('exit', (code) => {
    log('vite', colors.yellow, `Exited with code ${code}`);
    apiProcess.kill();
    process.exit(code || 0);
  });

  apiProcess.on('exit', (code) => {
    log('api', colors.yellow, `Exited with code ${code}`);
    viteProcess.kill();
    process.exit(code || 0);
  });
}

main().catch(console.error);
