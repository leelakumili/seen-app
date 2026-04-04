import Anthropic from '@anthropic-ai/sdk'
import type Database from 'better-sqlite3'
import type { ChatMessage } from './prompts/ask'

export interface AiProvider {
  complete(prompt: string, opts?: { maxTokens?: number }): Promise<string>
  stream(prompt: string, onChunk: (chunk: string) => void): Promise<void>
  streamChat(system: string, messages: ChatMessage[], onChunk: (chunk: string) => void): Promise<void>
}

export function getProvider(db: Database.Database): AiProvider {
  const rows = db.prepare(
    `SELECT key, value FROM settings WHERE key IN ('ai_provider', 'ai_model', 'ollama_host', 'anthropic_api_key')`
  ).all() as { key: string; value: string }[]
  const s = Object.fromEntries(rows.map(r => [r.key, r.value]))

  const provider   = s.ai_provider  ?? process.env.AI_PROVIDER  ?? 'ollama'
  const model      = s.ai_model     ?? process.env.AI_MODEL     ?? 'llama3'
  const ollamaHost = s.ollama_host  ?? process.env.OLLAMA_HOST  ?? 'http://localhost:11434'
  // Settings take priority over env var so users can rotate keys without restarting the app
  const apiKey     = s.anthropic_api_key || process.env.ANTHROPIC_API_KEY || ''

  return provider === 'anthropic'
    ? buildAnthropicProvider(model, apiKey)
    : buildOllamaProvider(model, ollamaHost)
}

// ── Ollama ─────────────────────────────────────────────────────────────────

function buildOllamaProvider(model: string, baseUrl: string): AiProvider {
  async function readStream(res: Response, onChunk: (c: string) => void) {
    const reader  = res.body?.getReader()
    if (!reader) return
    const decoder = new TextDecoder()
    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      for (const line of decoder.decode(value).split('\n').filter(Boolean)) {
        try {
          const obj  = JSON.parse(line) as { response?: string; message?: { content?: string } }
          const text = obj.response ?? obj.message?.content
          if (text) onChunk(text)
        } catch { /* skip malformed chunk */ }
      }
    }
  }

  return {
    async complete(prompt, opts = {}) {
      const res  = await fetch(`${baseUrl}/api/generate`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ model, prompt, stream: false, options: { num_predict: opts.maxTokens ?? 1000 } }),
      })
      const data = await res.json() as { response?: string }
      return data.response ?? ''
    },

    async stream(prompt, onChunk) {
      const res = await fetch(`${baseUrl}/api/generate`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ model, prompt, stream: true }),
      })
      await readStream(res, onChunk)
    },

    async streamChat(system, messages, onChunk) {
      const res = await fetch(`${baseUrl}/api/chat`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ model, stream: true, messages: [{ role: 'system', content: system }, ...messages] }),
      })
      await readStream(res, onChunk)
    },
  }
}

// ── Anthropic (via SDK) ────────────────────────────────────────────────────

function buildAnthropicProvider(model: string, apiKey: string): AiProvider {
  const client = new Anthropic({ apiKey })

  return {
    async complete(prompt, opts = {}) {
      const msg = await client.messages.create({
        model,
        max_tokens: opts.maxTokens ?? 1000,
        messages:   [{ role: 'user', content: prompt }],
      })
      const block = msg.content[0]
      return block?.type === 'text' ? block.text : ''
    },

    async stream(prompt, onChunk) {
      const stream = await client.messages.stream({
        model,
        max_tokens: 2048,
        messages:   [{ role: 'user', content: prompt }],
      })
      for await (const event of stream) {
        if (event.type === 'content_block_delta' && event.delta.type === 'text_delta') {
          onChunk(event.delta.text)
        }
      }
    },

    async streamChat(system, messages, onChunk) {
      const stream = await client.messages.stream({
        model,
        max_tokens: 2048,
        system,
        messages,
      })
      for await (const event of stream) {
        if (event.type === 'content_block_delta' && event.delta.type === 'text_delta') {
          onChunk(event.delta.text)
        }
      }
    },
  }
}
