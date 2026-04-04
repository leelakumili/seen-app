import { contextBridge, ipcRenderer } from 'electron'

// Single scoped stream listener — replaced on each onStream call so offStream
// only removes the specific handler registered last, not all IPC listeners.
let _streamCb: ((_e: unknown, chunk: string) => void) | null = null

// Expose a typed API to the renderer — renderer never touches Node/SQLite directly
contextBridge.exposeInMainWorld('seen', {
  // Entries
  entries: {
    list:   (filters?: Record<string, unknown>) => ipcRenderer.invoke('entries:list', filters),
    create: (payload: unknown)                  => ipcRenderer.invoke('entries:create', payload),
    update: (id: string, payload: unknown)      => ipcRenderer.invoke('entries:update', id, payload),
    delete: (id: string)                        => ipcRenderer.invoke('entries:delete', id),
  },

  // Settings
  settings: {
    get: (key: string)              => ipcRenderer.invoke('settings:get', key),
    set: (key: string, value: string) => ipcRenderer.invoke('settings:set', key, value),
    getAll: ()                      => ipcRenderer.invoke('settings:getAll'),
  },

  // AI
  ai: {
    suggestBucket:    (content: string)          => ipcRenderer.invoke('ai:suggestBucket', content),
    generateBragMonth:(params: unknown)           => ipcRenderer.invoke('ai:generateBragMonth', params),
    generateBragDoc:  (params: unknown)           => ipcRenderer.invoke('ai:generateBragDoc', params),
    generateQuarterly:(params: unknown)           => ipcRenderer.invoke('ai:generateQuarterly', params),
    correctSpelling:  (content: string)           => ipcRenderer.invoke('ai:correctSpelling', content),
    ask:              (messages: unknown, style?: string) => ipcRenderer.invoke('ai:ask', { messages, style }),
    // Streaming: scoped listener — offStream removes only the registered cb
    onStream: (cb: (chunk: string) => void) => {
      if (_streamCb) ipcRenderer.removeListener('ai:stream-chunk', _streamCb)
      _streamCb = (_e, chunk) => cb(chunk)
      ipcRenderer.on('ai:stream-chunk', _streamCb)
    },
    offStream: () => {
      if (_streamCb) {
        ipcRenderer.removeListener('ai:stream-chunk', _streamCb)
        _streamCb = null
      }
    },
  },

  // Generations (cached outputs)
  generations: {
    get:  (params: unknown)                => ipcRenderer.invoke('generations:get', params),
    save: (id: string, output: string)     => ipcRenderer.invoke('generations:save', id, output),
  },

  // Goal buckets
  buckets: {
    list:   ()                                            => ipcRenderer.invoke('buckets:list'),
    create: (payload: unknown)                            => ipcRenderer.invoke('buckets:create', payload),
    update: (id: string, payload: unknown)                => ipcRenderer.invoke('buckets:update', id, payload),
    delete: (id: string)                                  => ipcRenderer.invoke('buckets:delete', id),
  },

  // File export
  file: {
    save: (content: string, defaultName: string) => ipcRenderer.invoke('file:save', { content, defaultName }),
  },

  // App info
  platform: process.platform,
})
