import type {
  ActionType,
  ElementSelector,
  RecordedAction,
  ActionRecorderOptions
} from './types/actions'

function generateId(): string {
  return `action-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
}

function getElementSelector(element: HTMLElement): ElementSelector {
  const selector: ElementSelector = {
    cssPath: getCssPath(element)
  }

  if (element.id) {
    selector.id = element.id
  }

  const dataAttrs: Record<string, string> = {}
  for (let i = 0; i < element.attributes.length; i++) {
    const attr = element.attributes[i]
    if (attr.name.startsWith('data-')) {
      dataAttrs[attr.name] = attr.value
    }
  }
  if (Object.keys(dataAttrs).length > 0) {
    selector.dataAttributes = dataAttrs
  }

  const text = element.textContent?.trim()
  if (text && text.length < 100) {
    selector.textContent = text
  }

  return selector
}

function getCssPath(element: HTMLElement): string {
  const path: string[] = []
  let current: HTMLElement | null = element

  while (current && current !== document.body) {
    let selector = current.tagName.toLowerCase()

    if (current.id) {
      selector = `#${current.id}`
      path.unshift(selector)
      break
    }

    if (current.className && typeof current.className === 'string') {
      const classes = current.className.trim().split(/\s+/).filter(c => c)
      if (classes.length > 0) {
        selector += `.${classes.slice(0, 2).join('.')}`
      }
    }

    const parent = current.parentElement
    if (parent) {
      const siblings = Array.from(parent.children).filter(
        child => child.tagName === current!.tagName
      )
      if (siblings.length > 1) {
        const index = siblings.indexOf(current) + 1
        selector += `:nth-of-type(${index})`
      }
    }

    path.unshift(selector)
    current = current.parentElement
  }

  return path.join(' > ')
}

export class ActionRecorder {
  private actions: RecordedAction[] = []
  private isRecording = false
  private options: ActionRecorderOptions
  private boundHandlers: {
    click: (e: MouseEvent) => void
    input: (e: Event) => void
    change: (e: Event) => void
    submit: (e: Event) => void
  }

  constructor(options: Partial<ActionRecorderOptions> = {}) {
    this.options = {
      maxActions: 3,
      ...options
    }

    this.boundHandlers = {
      click: this.handleClick.bind(this),
      input: this.handleInput.bind(this),
      change: this.handleChange.bind(this),
      submit: this.handleSubmit.bind(this)
    }
  }

  start(): void {
    if (this.isRecording) return

    this.isRecording = true
    this.actions = []

    document.addEventListener('click', this.boundHandlers.click, true)
    document.addEventListener('input', this.boundHandlers.input, true)
    document.addEventListener('change', this.boundHandlers.change, true)
    document.addEventListener('submit', this.boundHandlers.submit, true)

    console.log('ActionRecorder: Started recording')
  }

  stop(): RecordedAction[] {
    if (!this.isRecording) return this.actions

    this.isRecording = false

    document.removeEventListener('click', this.boundHandlers.click, true)
    document.removeEventListener('input', this.boundHandlers.input, true)
    document.removeEventListener('change', this.boundHandlers.change, true)
    document.removeEventListener('submit', this.boundHandlers.submit, true)

    console.log('ActionRecorder: Stopped recording', this.actions)
    return this.actions
  }

  getActions(): RecordedAction[] {
    return [...this.actions]
  }

  isActive(): boolean {
    return this.isRecording
  }

  private recordAction(type: ActionType, element: HTMLElement, value?: string): void {
    if (!this.isRecording) return

    if (this.actions.length >= this.options.maxActions) {
      console.log('ActionRecorder: Max actions reached')
      this.options.onMaxActionsReached?.()
      return
    }

    const action: RecordedAction = {
      id: generateId(),
      type,
      selector: getElementSelector(element),
      value,
      timestamp: Date.now()
    }

    this.actions.push(action)
    this.options.onActionRecorded?.(action, this.actions.length - 1)

    console.log(`ActionRecorder: Recorded ${type}`, action)
  }

  private handleClick(event: MouseEvent): void {
    const target = event.target as HTMLElement
    if (!target || target.closest('[data-kathy-recorder]')) return

    this.recordAction('click', target)
  }

  private handleInput(event: Event): void {
    const target = event.target as HTMLInputElement | HTMLTextAreaElement
    if (!target) return

    this.recordAction('input', target, target.value)
  }

  private handleChange(event: Event): void {
    const target = event.target as HTMLSelectElement | HTMLInputElement
    if (!target) return

    this.recordAction('change', target, target.value)
  }

  private handleSubmit(event: Event): void {
    const target = event.target as HTMLFormElement
    if (!target) return

    this.recordAction('submit', target)
  }
}
