import { ActionPlayer } from './action-player'
import type { RecordedAction, ActionSequence, PlaybackResult } from './types/actions'
import { getPrebuiltActionSequence, hasPrebuiltConnector } from './connectors'
import { withRetry } from './retry-handler'
import { queueFailedUpdate } from './status-update-queue'

export interface StatusUpdateCallbacks {
  onProgress: (step: number, total: number) => void
  onSuccess: () => void
  onError: (error: Error, queued?: boolean) => void
  onAuthWall: (onRetry: () => void) => void
}

export interface StatusUpdateContext {
  paymentSessionId?: string
  applicationConfigId?: string
  invoiceId: string
}

export interface StatusUpdateResult {
  success: boolean
  error?: Error
  completedSteps: number
  totalSteps: number
}

async function getActionSequence(applicationConfigId: string): Promise<ActionSequence | null> {
  try {
    const result = await chrome.storage.local.get(['actionSequences'])
    const sequences = (result.actionSequences || {}) as Record<string, ActionSequence>
    return sequences[applicationConfigId] || null
  } catch (error) {
    console.error('StatusUpdateExecutor: Failed to get action sequence', error)
    return null
  }
}

async function getActionSequenceForUrl(url: string): Promise<ActionSequence | null> {
  try {
    // First check for user-configured sequences
    const result = await chrome.storage.local.get(['actionSequences'])
    const sequences = (result.actionSequences || {}) as Record<string, ActionSequence>

    for (const sequence of Object.values(sequences)) {
      if (sequence.urlPattern) {
        const regex = new RegExp(sequence.urlPattern)
        if (regex.test(url)) {
          console.log('StatusUpdateExecutor: Using user-configured sequence')
          return sequence
        }
      }
    }

    // Fall back to pre-built connector
    const prebuilt = getPrebuiltActionSequence(url)
    if (prebuilt) {
      console.log('StatusUpdateExecutor: Using pre-built connector')
      return prebuilt
    }

    return null
  } catch (error) {
    console.error('StatusUpdateExecutor: Failed to get action sequence for URL', error)
    return null
  }
}

export async function executeStatusUpdate(
  invoiceRow: HTMLTableRowElement,
  callbacks: StatusUpdateCallbacks,
  context?: StatusUpdateContext
): Promise<StatusUpdateResult> {
  const sequence = await getActionSequenceForUrl(window.location.href)

  if (!sequence || sequence.actions.length === 0) {
    const error = new Error('No action sequence configured for this application')
    callbacks.onError(error)
    return {
      success: false,
      error,
      completedSteps: 0,
      totalSteps: 0
    }
  }

  const actions = contextualizeActions(sequence.actions, invoiceRow)
  let lastResult: PlaybackResult | null = null

  try {
    await withRetry(
      async () => {
        const player = new ActionPlayer({
          delayBetweenActions: 500,
          elementWaitTimeout: 5000,
          onProgress: (step, total) => {
            callbacks.onProgress(step, total)
          },
          onAuthWallDetected: (onRetry) => {
            callbacks.onAuthWall(onRetry)
          }
        })

        const result = await player.play(actions)
        lastResult = result

        if (!result.success) {
          throw result.error || new Error('Action playback failed')
        }

        return result
      },
      {
        maxRetries: 3,
        baseDelayMs: 1000,
        onRetry: (attempt, error, nextDelayMs) => {
          console.log(`StatusUpdateExecutor: Retry ${attempt}, waiting ${nextDelayMs}ms`, error.message)
        },
        onExhausted: (error, totalAttempts) => {
          console.log(`StatusUpdateExecutor: All ${totalAttempts} attempts failed`, error.message)
        }
      }
    )

    callbacks.onSuccess()
    return {
      success: true,
      completedSteps: lastResult?.completedSteps || actions.length,
      totalSteps: actions.length
    }
  } catch (error) {
    const err = error instanceof Error ? error : new Error(String(error))

    let queued = false
    if (context?.paymentSessionId && context?.applicationConfigId) {
      try {
        await queueFailedUpdate({
          paymentSessionId: context.paymentSessionId,
          applicationConfigId: context.applicationConfigId,
          invoiceId: context.invoiceId,
          errorMessage: err.message
        })
        queued = true
        console.log('StatusUpdateExecutor: Failed update queued for manual review')
      } catch (queueError) {
        console.error('StatusUpdateExecutor: Failed to queue update', queueError)
      }
    }

    callbacks.onError(err, queued)
    return {
      success: false,
      error: err,
      completedSteps: lastResult?.completedSteps || 0,
      totalSteps: actions.length
    }
  }
}

function contextualizeActions(
  actions: RecordedAction[],
  invoiceRow: HTMLTableRowElement
): RecordedAction[] {
  return actions.map(action => {
    const contextualizedAction = { ...action }

    if (action.selector.cssPath.includes(':nth-of-type')) {
      const rowIndex = Array.from(invoiceRow.parentElement?.children || []).indexOf(invoiceRow) + 1
      contextualizedAction.selector = {
        ...action.selector,
        cssPath: action.selector.cssPath.replace(
          /tr:nth-of-type\(\d+\)/,
          `tr:nth-of-type(${rowIndex})`
        )
      }
    }

    return contextualizedAction
  })
}

export async function saveActionSequence(
  applicationConfigId: string,
  sequence: ActionSequence
): Promise<void> {
  try {
    const result = await chrome.storage.local.get(['actionSequences'])
    const sequences = (result.actionSequences || {}) as Record<string, ActionSequence>
    sequences[applicationConfigId] = sequence
    await chrome.storage.local.set({ actionSequences: sequences })
    console.log('StatusUpdateExecutor: Saved action sequence', applicationConfigId)
  } catch (error) {
    console.error('StatusUpdateExecutor: Failed to save action sequence', error)
    throw error
  }
}

export async function hasActionSequence(applicationConfigId: string): Promise<boolean> {
  const sequence = await getActionSequence(applicationConfigId)
  return sequence !== null && sequence.actions.length > 0
}

export async function hasActionSequenceForUrl(url: string): Promise<boolean> {
  // Check pre-built connectors first (synchronous)
  if (hasPrebuiltConnector(url)) {
    return true
  }
  
  // Then check user-configured sequences
  const sequence = await getActionSequenceForUrl(url)
  return sequence !== null && sequence.actions.length > 0
}
