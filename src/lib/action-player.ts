import type {
  RecordedAction,
  ActionPlayerOptions,
  PlaybackResult,
  ElementSelector
} from './types/actions'

const DEFAULT_OPTIONS: ActionPlayerOptions = {
  delayBetweenActions: 500,
  elementWaitTimeout: 5000,
  maxRetries: 3
}

function findElementBySelector(selector: ElementSelector): HTMLElement | null {
  if (selector.id) {
    const el = document.getElementById(selector.id)
    if (el) return el
  }

  if (selector.dataAttributes) {
    for (const [attr, value] of Object.entries(selector.dataAttributes)) {
      const el = document.querySelector(`[${attr}="${value}"]`) as HTMLElement
      if (el) return el
    }
  }

  if (selector.cssPath) {
    try {
      const el = document.querySelector(selector.cssPath) as HTMLElement
      if (el) return el
    } catch {
      console.warn('ActionPlayer: Invalid CSS path', selector.cssPath)
    }
  }

  if (selector.textContent) {
    const walker = document.createTreeWalker(
      document.body,
      NodeFilter.SHOW_ELEMENT,
      {
        acceptNode(node) {
          const el = node as HTMLElement
          if (el.textContent?.trim() === selector.textContent) {
            return NodeFilter.FILTER_ACCEPT
          }
          return NodeFilter.FILTER_SKIP
        }
      }
    )
    const node = walker.nextNode() as HTMLElement
    if (node) return node
  }

  return null
}

async function waitForElement(
  selector: ElementSelector,
  timeout: number
): Promise<HTMLElement> {
  const startTime = Date.now()

  return new Promise((resolve, reject) => {
    const check = () => {
      const element = findElementBySelector(selector)
      if (element) {
        resolve(element)
        return
      }

      if (Date.now() - startTime >= timeout) {
        reject(new Error(`Element not found within ${timeout}ms: ${selector.cssPath}`))
        return
      }

      requestAnimationFrame(check)
    }

    check()
  })
}

function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}

function waitForNavigation(expectedPattern?: string, timeout = 10000): Promise<void> {
  return new Promise((resolve, reject) => {
    const startTime = Date.now()
    const startUrl = window.location.href

    const checkNavigation = () => {
      const currentUrl = window.location.href

      if (currentUrl !== startUrl) {
        if (expectedPattern) {
          const regex = new RegExp(expectedPattern)
          if (regex.test(currentUrl)) {
            waitForPageReady().then(resolve)
            return
          }
        } else {
          waitForPageReady().then(resolve)
          return
        }
      }

      if (Date.now() - startTime >= timeout) {
        reject(new Error(`Navigation timeout: expected ${expectedPattern || 'any URL change'}`))
        return
      }

      setTimeout(checkNavigation, 100)
    }

    setTimeout(checkNavigation, 100)
  })
}

function waitForPageReady(timeout = 5000): Promise<void> {
  return new Promise((resolve) => {
    if (document.readyState === 'complete') {
      setTimeout(resolve, 500)
      return
    }

    const startTime = Date.now()

    const checkReady = () => {
      if (document.readyState === 'complete') {
        setTimeout(resolve, 500)
        return
      }

      if (Date.now() - startTime >= timeout) {
        resolve()
        return
      }

      setTimeout(checkReady, 100)
    }

    checkReady()
  })
}

async function executeAction(action: RecordedAction, element: HTMLElement): Promise<void> {
  switch (action.type) {
    case 'click':
      element.click()
      break

    case 'input':
      if (element instanceof HTMLInputElement || element instanceof HTMLTextAreaElement) {
        element.focus()
        element.value = action.value || ''
        element.dispatchEvent(new Event('input', { bubbles: true }))
      }
      break

    case 'change':
      if (element instanceof HTMLSelectElement) {
        element.value = action.value || ''
        element.dispatchEvent(new Event('change', { bubbles: true }))
      } else if (element instanceof HTMLInputElement) {
        element.value = action.value || ''
        element.dispatchEvent(new Event('change', { bubbles: true }))
      }
      break

    case 'submit':
      if (element instanceof HTMLFormElement) {
        element.submit()
      }
      break

    case 'navigate':
      break

    default:
      console.warn('ActionPlayer: Unknown action type', action.type)
  }
}

export class ActionPlayer {
  private options: ActionPlayerOptions
  private isPlaying = false
  private isPaused = false
  private currentStep = 0

  constructor(options: Partial<ActionPlayerOptions> = {}) {
    this.options = { ...DEFAULT_OPTIONS, ...options }
  }

  async play(actions: RecordedAction[]): Promise<PlaybackResult> {
    if (this.isPlaying) {
      return {
        success: false,
        completedSteps: 0,
        totalSteps: actions.length,
        error: new Error('Playback already in progress')
      }
    }

    this.isPlaying = true
    this.isPaused = false
    this.currentStep = 0

    const totalSteps = actions.length

    try {
      for (let i = 0; i < actions.length; i++) {
        if (!this.isPlaying) {
          return {
            success: false,
            completedSteps: i,
            totalSteps,
            error: new Error('Playback stopped')
          }
        }

        while (this.isPaused) {
          await delay(100)
        }

        const action = actions[i]
        this.currentStep = i

        this.options.onProgress?.(i + 1, totalSteps, action)

        try {
          const element = await waitForElement(action.selector, this.options.elementWaitTimeout)
          await executeAction(action, element)

          if (action.waitForNavigation) {
            await waitForNavigation(action.expectedUrlPattern)
          } else {
            await delay(this.options.delayBetweenActions)
          }
        } catch (error) {
          const err = error instanceof Error ? error : new Error(String(error))
          this.options.onError?.(err, action, i)
          
          this.isPlaying = false
          return {
            success: false,
            completedSteps: i,
            totalSteps,
            error: err,
            failedAction: action
          }
        }
      }

      this.isPlaying = false
      this.options.onComplete?.()

      return {
        success: true,
        completedSteps: totalSteps,
        totalSteps
      }
    } catch (error) {
      this.isPlaying = false
      const err = error instanceof Error ? error : new Error(String(error))
      return {
        success: false,
        completedSteps: this.currentStep,
        totalSteps,
        error: err
      }
    }
  }

  stop(): void {
    this.isPlaying = false
    this.isPaused = false
  }

  pause(): void {
    if (this.isPlaying) {
      this.isPaused = true
    }
  }

  resume(): void {
    this.isPaused = false
  }

  isActive(): boolean {
    return this.isPlaying
  }

  getCurrentStep(): number {
    return this.currentStep
  }
}
