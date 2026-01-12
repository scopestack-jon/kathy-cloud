export interface RetryOptions {
  maxRetries: number
  baseDelayMs: number
  onRetry?: (attempt: number, error: Error, nextDelayMs: number) => void
  onExhausted?: (error: Error, totalAttempts: number) => void
}

const DEFAULT_OPTIONS: RetryOptions = {
  maxRetries: 3,
  baseDelayMs: 1000
}

function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}

function getExponentialDelay(attempt: number, baseDelayMs: number): number {
  return baseDelayMs * Math.pow(2, attempt - 1)
}

export async function withRetry<T>(
  fn: () => Promise<T>,
  options: Partial<RetryOptions> = {}
): Promise<T> {
  const opts = { ...DEFAULT_OPTIONS, ...options }
  let lastError: Error = new Error('Unknown error')

  for (let attempt = 1; attempt <= opts.maxRetries + 1; attempt++) {
    try {
      return await fn()
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error))

      if (attempt > opts.maxRetries) {
        console.log(`RetryHandler: All ${opts.maxRetries} retries exhausted`)
        opts.onExhausted?.(lastError, attempt)
        throw lastError
      }

      const delayMs = getExponentialDelay(attempt, opts.baseDelayMs)
      console.log(`RetryHandler: Attempt ${attempt} failed, retrying in ${delayMs}ms`, lastError.message)
      opts.onRetry?.(attempt, lastError, delayMs)

      await delay(delayMs)
    }
  }

  throw lastError
}

export class RetryableAction {
  private options: RetryOptions
  private currentAttempt = 0
  private isPending = false

  constructor(options: Partial<RetryOptions> = {}) {
    this.options = { ...DEFAULT_OPTIONS, ...options }
  }

  async execute<T>(fn: () => Promise<T>): Promise<T> {
    if (this.isPending) {
      throw new Error('Action already in progress')
    }

    this.isPending = true
    this.currentAttempt = 0

    try {
      return await withRetry(fn, {
        ...this.options,
        onRetry: (attempt, error, nextDelayMs) => {
          this.currentAttempt = attempt
          this.options.onRetry?.(attempt, error, nextDelayMs)
        },
        onExhausted: (error, totalAttempts) => {
          this.options.onExhausted?.(error, totalAttempts)
        }
      })
    } finally {
      this.isPending = false
    }
  }

  getCurrentAttempt(): number {
    return this.currentAttempt
  }

  isInProgress(): boolean {
    return this.isPending
  }

  getMaxRetries(): number {
    return this.options.maxRetries
  }
}

export function createRetryHandler(options: Partial<RetryOptions> = {}): RetryableAction {
  return new RetryableAction(options)
}
