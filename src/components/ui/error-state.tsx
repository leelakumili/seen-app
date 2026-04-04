/**
 * SAMPLE — Error state components
 *
 * Two patterns:
 *   <QueryError>     — full-area error for when a useQuery fails.
 *                      Drop it in the empty-state position of any screen.
 *   <InlineError>    — small inline error for form/action failures
 *                      (e.g. entry save failed, bucket delete failed).
 *
 * Usage example in a screen:
 *
 *   const { data, isError, error, refetch } = useQuery(...)
 *   if (isError) return <QueryError message={error?.message} onRetry={refetch} />
 *
 * Usage example for inline:
 *   {saveError && <InlineError message={saveError} />}
 */

import { AlertTriangle, RefreshCw, WifiOff } from 'lucide-react'
import { Button } from './button'

// ── Full-area query error ───────────────────────────────────────────────────

interface QueryErrorProps {
  /** Short human-readable description. Defaults to a generic message. */
  message?: string
  /** Called when the user clicks "Try again". Usually `refetch` from useQuery. */
  onRetry?: () => void
}

export function QueryError({ message, onRetry }: QueryErrorProps) {
  const isNetwork = message?.toLowerCase().includes('fetch') || message?.toLowerCase().includes('network')

  return (
    <div className="flex flex-col items-center justify-center py-16 gap-4 text-center">
      <div className="w-10 h-10 rounded-full bg-red-50 border border-red-100 flex items-center justify-center">
        {isNetwork
          ? <WifiOff size={18} className="text-red-400" />
          : <AlertTriangle size={18} className="text-red-400" />
        }
      </div>
      <div>
        <p className="text-sm font-medium text-ink mb-1">
          {isNetwork ? 'Connection problem' : 'Something went wrong'}
        </p>
        <p className="text-xs text-muted max-w-xs">
          {isNetwork
            ? 'Could not reach the AI provider. Check that Ollama is running or your API key is valid.'
            : (message ?? 'Could not load your data. Your entries are safe — this is a display issue.')}
        </p>
      </div>
      {onRetry && (
        <Button variant="outline" size="sm" onClick={onRetry} className="gap-1.5">
          <RefreshCw size={12} /> Try again
        </Button>
      )}
    </div>
  )
}

// ── Inline error for actions ────────────────────────────────────────────────

interface InlineErrorProps {
  message: string
}

export function InlineError({ message }: InlineErrorProps) {
  return (
    <div className="flex items-start gap-2 p-2.5 bg-red-50 border border-red-100 rounded-md">
      <AlertTriangle size={13} className="text-red-500 mt-0.5 flex-shrink-0" />
      <p className="text-xs text-red-700">{message}</p>
    </div>
  )
}

// ── AI provider error (streaming failed) ───────────────────────────────────

interface AiErrorProps {
  provider: 'ollama' | 'anthropic' | string
  onRetry?: () => void
}

export function AiError({ provider, onRetry }: AiErrorProps) {
  const hint = provider === 'ollama'
    ? 'Make sure Ollama is running: ollama serve'
    : 'Check your API key is set correctly in Settings → AI provider.'

  return (
    <div className="flex flex-col gap-3 p-4 bg-red-50 border border-red-100 rounded-lg">
      <div className="flex items-center gap-2">
        <WifiOff size={14} className="text-red-500" />
        <p className="text-xs font-medium text-red-700">AI provider unreachable</p>
      </div>
      <p className="text-xs text-red-600">{hint}</p>
      {onRetry && (
        <Button variant="outline" size="sm" onClick={onRetry} className="self-start gap-1.5 text-red-700 border-red-200 hover:bg-red-50">
          <RefreshCw size={11} /> Try again
        </Button>
      )}
    </div>
  )
}
