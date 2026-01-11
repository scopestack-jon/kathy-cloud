export type ActionType = 'click' | 'input' | 'change' | 'submit' | 'navigate'

export interface ElementSelector {
  id?: string
  dataAttributes?: Record<string, string>
  cssPath: string
  xpath?: string
  textContent?: string
}

export interface RecordedAction {
  id: string
  type: ActionType
  selector: ElementSelector
  value?: string
  timestamp: number
  targetUrl?: string
  expectedUrlPattern?: string
  waitForNavigation?: boolean
}

export interface ActionSequence {
  id: string
  applicationName: string
  urlPattern: string
  actions: RecordedAction[]
  createdAt: string
  updatedAt: string
}

export interface ActionPlayerOptions {
  delayBetweenActions: number
  elementWaitTimeout: number
  maxRetries: number
  onProgress?: (step: number, total: number, action: RecordedAction) => void
  onError?: (error: Error, action: RecordedAction, step: number) => void
  onComplete?: () => void
}

export interface ActionRecorderOptions {
  maxActions: number
  onActionRecorded?: (action: RecordedAction, index: number) => void
  onMaxActionsReached?: () => void
}

export interface PlaybackResult {
  success: boolean
  completedSteps: number
  totalSteps: number
  error?: Error
  failedAction?: RecordedAction
}
