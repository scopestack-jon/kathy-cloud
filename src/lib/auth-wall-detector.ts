export interface AuthWallDetectorOptions {
  onAuthWallDetected?: (type: AuthWallType) => void
  customSelectors?: string[]
  customTextPatterns?: string[]
}

export type AuthWallType = 'login-form' | 'session-expired' | 'oauth-redirect' | 'unknown'

const LOGIN_FORM_SELECTORS = [
  'input[type="password"]',
  'form[action*="login"]',
  'form[action*="signin"]',
  'form[action*="auth"]',
  '#login-form',
  '.login-form',
  '[data-testid="login-form"]',
  '[data-testid="signin-form"]'
]

const SESSION_EXPIRED_PATTERNS = [
  /session\s*(has\s*)?expired/i,
  /please\s*(log|sign)\s*in\s*again/i,
  /your\s*session\s*has\s*timed?\s*out/i,
  /authentication\s*required/i,
  /login\s*required/i,
  /unauthorized/i,
  /access\s*denied/i
]

const OAUTH_REDIRECT_PATTERNS = [
  /accounts\.google\.com/i,
  /login\.microsoftonline\.com/i,
  /auth0\.com/i,
  /okta\.com/i,
  /login\.salesforce\.com/i
]

export class AuthWallDetector {
  private options: AuthWallDetectorOptions
  private observer: MutationObserver | null = null
  private isMonitoring = false

  constructor(options: AuthWallDetectorOptions = {}) {
    this.options = options
  }

  detect(): { detected: boolean; type: AuthWallType | null } {
    if (this.detectOAuthRedirect()) {
      return { detected: true, type: 'oauth-redirect' }
    }

    if (this.detectLoginForm()) {
      return { detected: true, type: 'login-form' }
    }

    if (this.detectSessionExpiredModal()) {
      return { detected: true, type: 'session-expired' }
    }

    return { detected: false, type: null }
  }

  private detectLoginForm(): boolean {
    const selectors = [...LOGIN_FORM_SELECTORS, ...(this.options.customSelectors || [])]

    for (const selector of selectors) {
      try {
        const element = document.querySelector(selector)
        if (element && this.isVisible(element as HTMLElement)) {
          return true
        }
      } catch {
        continue
      }
    }

    return false
  }

  private detectSessionExpiredModal(): boolean {
    const patterns = [...SESSION_EXPIRED_PATTERNS]
    if (this.options.customTextPatterns) {
      patterns.push(...this.options.customTextPatterns.map(p => new RegExp(p, 'i')))
    }

    const modals = document.querySelectorAll(
      '[role="dialog"], [role="alertdialog"], .modal, .dialog, [class*="modal"], [class*="popup"]'
    )

    for (let i = 0; i < modals.length; i++) {
      const modal = modals[i] as HTMLElement
      if (!this.isVisible(modal)) continue

      const text = modal.textContent || ''
      for (const pattern of patterns) {
        if (pattern.test(text)) {
          return true
        }
      }
    }

    const bodyText = document.body?.textContent || ''
    for (const pattern of patterns) {
      if (pattern.test(bodyText)) {
        const hasPasswordField = document.querySelector('input[type="password"]')
        if (hasPasswordField && this.isVisible(hasPasswordField as HTMLElement)) {
          return true
        }
      }
    }

    return false
  }

  private detectOAuthRedirect(): boolean {
    const url = window.location.href

    for (const pattern of OAUTH_REDIRECT_PATTERNS) {
      if (pattern.test(url)) {
        return true
      }
    }

    return false
  }

  private isVisible(element: HTMLElement): boolean {
    if (!element) return false

    const style = window.getComputedStyle(element)
    if (style.display === 'none' || style.visibility === 'hidden' || style.opacity === '0') {
      return false
    }

    const rect = element.getBoundingClientRect()
    return rect.width > 0 && rect.height > 0
  }

  startMonitoring(checkInterval = 500): void {
    if (this.isMonitoring) return

    this.isMonitoring = true

    const check = () => {
      if (!this.isMonitoring) return

      const result = this.detect()
      if (result.detected && result.type) {
        this.options.onAuthWallDetected?.(result.type)
      }

      setTimeout(check, checkInterval)
    }

    check()
  }

  stopMonitoring(): void {
    this.isMonitoring = false
    if (this.observer) {
      this.observer.disconnect()
      this.observer = null
    }
  }
}
