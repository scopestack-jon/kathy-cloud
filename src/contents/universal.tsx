import React from 'react'
import { createRoot } from 'react-dom/client'
import type { PlasmoCSConfig } from 'plasmo'
import { authenticatedFetch } from '../lib/auth-refresh'
import { panelManager, PanelEntity } from '../components/PanelManager'

export const config: PlasmoCSConfig = {
  matches: ["<all_urls>"],
  exclude_matches: [
    "https://kathy-cloud.vercel.app/*",
    "https://kathy.dev/*",
    "https://www.kathy.dev/*",
    "http://localhost:3000/*"
  ],
  run_at: "document_idle",
  all_frames: false
}

const API_URL = process.env.PLASMO_PUBLIC_API_URL || 'http://localhost:3000'

interface AppConfig {
  id: string
  applicationName: string
  urlPattern: string
  selectorConfig: {
    invoiceIdColumn: number
    amountColumn: number
    statusColumn: number
    invoiceIdPattern: string
    amountPattern: string
    tableSelector?: string
  }
}

class UniversalKathyInjector {
  private appConfig: AppConfig | null = null
  private isAuthenticated: boolean = false
  private trialUsage: number = 0
  private authToken: string | null = null
  private observer: MutationObserver | null = null

  async init() {
    console.log('Kathy: Universal injector initializing...')

    // Get auth token and trial status
    const storage = await chrome.storage.local.get(['authToken', 'trialUsage'])
    this.authToken = storage.authToken || null
    this.trialUsage = storage.trialUsage || 0
    this.isAuthenticated = !!this.authToken

    if (!this.isAuthenticated && this.trialUsage >= 3) {
      console.log('Kathy: Trial expired, skipping injection')
      this.showTrialExpiredBanner()
      return
    }

    // Try to find matching configuration
    await this.loadConfiguration()

    if (this.appConfig) {
      console.log(`Kathy: Detected ${this.appConfig.applicationName}`)
      this.injectUI()
      this.setupObserver()
    } else {
      // No configuration for this URL - do nothing
      // Users should explicitly add applications via the popup
      console.log('Kathy: No configuration for this application')
    }
  }

  private async loadConfiguration() {
    try {
      if (this.isAuthenticated) {
        // Fetch from API with auto token refresh
        console.log(`Kathy: Fetching configurations from ${API_URL}/api/applications`)
        const response = await authenticatedFetch(`${API_URL}/api/applications`)

        if (response.ok) {
          const { applications } = await response.json()
          console.log(`Kathy: Received ${applications.length} application(s)`, applications)
          
          // Find matching config for current URL
          this.appConfig = applications.find((app: AppConfig) => {
            const pattern = new RegExp(app.urlPattern.replace(/\*/g, '.*'))
            const matches = pattern.test(window.location.href)
            console.log(`Kathy: Testing ${app.applicationName} (${app.urlPattern}) against ${window.location.href}: ${matches}`)
            return matches
          })
          
          if (this.appConfig) {
            console.log(`Kathy: Matched configuration:`, this.appConfig)
          } else {
            console.log(`Kathy: No matching configuration found for ${window.location.href}`)
          }
        } else {
          console.error(`Kathy: API request failed with status ${response.status}`)
        }
      } else {
        // Trial mode - use localStorage cache or default configs
        const cachedConfigs = localStorage.getItem('kathy_trial_configs')
        if (cachedConfigs) {
          const configs = JSON.parse(cachedConfigs)
          this.appConfig = configs.find((app: AppConfig) => 
            new RegExp(app.urlPattern.replace(/\*/g, '.*')).test(window.location.href)
          )
        }
      }
    } catch (error) {
      console.error('Kathy: Error loading configuration:', error)
    }
  }

  private setupObserver() {
    // Watch for dynamically loaded content
    this.observer = new MutationObserver((mutations) => {
      let shouldReinject = false
      
      mutations.forEach((mutation) => {
        if (mutation.addedNodes.length) {
          mutation.addedNodes.forEach((node) => {
            if (node.nodeType === 1 && (node as Element).matches('table, tbody, tr')) {
              shouldReinject = true
            }
          })
        }
      })

      if (shouldReinject) {
        setTimeout(() => this.injectUI(), 100)
      }
    })

    this.observer.observe(document.body, {
      childList: true,
      subtree: true
    })
  }

  private injectUI() {
    if (!this.appConfig) return

    const config = this.appConfig.selectorConfig
    
    // Find invoice tables
    const tables = document.querySelectorAll('table')
    
    tables.forEach(table => {
      const rows = table.querySelectorAll('tbody tr')
      
      rows.forEach(row => {
        // Skip if already injected
        if (row.querySelector('[data-kathy-badge]')) {
          return
        }

        const cells = Array.from(row.cells)
        
        if (cells.length <= Math.max(config.invoiceIdColumn, config.amountColumn, config.statusColumn)) {
          return // Not enough columns
        }
        
        const invoiceIdCell = cells[config.invoiceIdColumn] as HTMLTableCellElement
        const amountCell = cells[config.amountColumn] as HTMLTableCellElement
        const statusCell = cells[config.statusColumn] as HTMLTableCellElement
        
        const invoiceId = this.extractInvoiceId(invoiceIdCell.textContent || '', config.invoiceIdPattern)
        const amount = this.extractAmount(amountCell.textContent || '', config.amountPattern)

        // Extract opportunity ID from any link in the row (for SmartMoving)
        const opportunityId = this.extractOpportunityIdFromRow(row)

        if (invoiceId && amount) {
          this.injectBadge(statusCell, { invoiceId, amount, row, opportunityId })
        }
      })
    })
  }

  private async injectBadge(cell: HTMLTableCellElement, data: { invoiceId: string, amount: number, row: Element, opportunityId?: string | null }) {
    // Check if badge already exists
    const existingBadge = cell.querySelector('[data-kathy-badge]')
    if (existingBadge) return

    // Check if invoice is already paid
    const isPaid = await this.checkIfPaid(data.invoiceId)

    const badge = document.createElement('span')
    badge.setAttribute('data-kathy-badge', 'true')
    badge.setAttribute('data-invoice-id', data.invoiceId) // Add invoice ID for later reference
    if (data.opportunityId) {
      badge.setAttribute('data-opportunity-id', data.opportunityId) // SmartMoving opportunity ID
    }
    
    if (isPaid) {
      // Inject as "Paid" badge
      badge.textContent = '✓ Paid'
      badge.style.cssText = `
        display: inline-flex;
        align-items: center;
        justify-content: center;
        padding: 4px 10px;
        margin-left: 8px;
        font-size: 12px;
        font-weight: 600;
        color: white;
        background: linear-gradient(135deg, #2E7D32 0%, #1B5E20 100%);
        border: none;
        border-radius: 12px;
        cursor: pointer;
        vertical-align: middle;
        box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        transition: all 0.2s;
        white-space: nowrap;
      `
      badge.title = "Collected with Kathy - Click for details"
      
      // Add subtle background to row
      const row = badge.closest('tr')
      if (row) {
        (row as HTMLElement).style.backgroundColor = "#f1f8f4"
      }
    } else {
      // Inject as "K" badge
      badge.textContent = 'K'
      badge.style.cssText = `
        display: inline-block;
        background: #4CAF50;
        color: white;
        padding: 4px 8px;
        border-radius: 4px;
        font-weight: bold;
        cursor: pointer;
        margin-left: 8px;
        font-size: 12px;
        transition: all 0.2s;
      `
      
      badge.onmouseenter = () => {
        badge.style.backgroundColor = '#45a049'
        badge.style.transform = 'scale(1.05)'
      }
      
      badge.onmouseleave = () => {
        badge.style.backgroundColor = '#4CAF50'
        badge.style.transform = 'scale(1)'
      }
    }
    
    badge.onclick = async (e) => {
      e.stopPropagation()
      await this.handleBadgeClick({ invoiceId: data.invoiceId, amount: data.amount, opportunityId: data.opportunityId })
    }
    
    cell.appendChild(badge)
  }
  
  private async checkIfPaid(invoiceId: string): Promise<boolean> {
    try {
      const API_URL = process.env.PLASMO_PUBLIC_API_URL || 'http://localhost:3000'
      const response = await authenticatedFetch(`${API_URL}/api/entities/invoice/${invoiceId}`)
      
      if (response.ok) {
        const data = await response.json()
        const status = data.data?.summary?.latestStatus
        return status === 'paid_and_confirmed' || status === 'confirmed'
      }
    } catch (error) {
      console.error('Kathy: Error checking payment status', error)
    }
    return false
  }
  
  markInvoiceAsPaid(invoiceId: string) {
    // Find the badge for this invoice
    const badge = document.querySelector(`[data-invoice-id="${invoiceId}"]`) as HTMLSpanElement
    if (!badge) {
      console.log('Kathy: Badge not found for invoice', invoiceId)
      return
    }
    
    // Update badge to "Paid" state
    badge.style.cssText = `
      display: inline-flex;
      align-items: center;
      justify-content: center;
      padding: 4px 10px;
      margin-left: 8px;
      font-size: 12px;
      font-weight: 600;
      color: white;
      background: linear-gradient(135deg, #2E7D32 0%, #1B5E20 100%);
      border: none;
      border-radius: 12px;
      cursor: pointer;
      vertical-align: middle;
      box-shadow: 0 2px 4px rgba(0,0,0,0.1);
      transition: all 0.2s;
      white-space: nowrap;
    `
    badge.textContent = "✓ Paid"
    badge.title = "Collected with Kathy - Click for details"
    
    // Also add subtle background color to the row
    const row = badge.closest('tr')
    if (row) {
      (row as HTMLElement).style.backgroundColor = "#f1f8f4" // Very subtle green tint
    }
    
    console.log('Kathy: Badge updated to Paid state', { invoiceId })
  }

  private async handleBadgeClick(data: { invoiceId: string, amount: number, opportunityId?: string | null }) {
    // Check trial status
    if (!this.isAuthenticated) {
      if (this.trialUsage >= 3) {
        this.showSignUpPrompt()
        return
      }
    }

    // Open panel with invoice data
    const entity: PanelEntity = {
      type: 'invoice',
      id: data.invoiceId,
      displayName: `Invoice ${data.invoiceId}`,
      data: {
        invoiceId: data.invoiceId,
        amount: data.amount,
        applicationName: this.appConfig!.applicationName,
        applicationConfigId: this.appConfig!.id,
        sourceUrl: window.location.href,
        opportunityId: data.opportunityId || undefined
      }
    }

    console.log('Kathy: Opening panel for invoice:', entity)
    panelManager.open(entity)

    // Increment trial usage if not authenticated
    if (!this.isAuthenticated) {
      this.trialUsage++
      await chrome.storage.local.set({ trialUsage: this.trialUsage })
    }
  }

  private showConfigPrompt() {
    // Check if user has permanently dismissed config prompts
    const dismissed = localStorage.getItem('kathy_config_prompt_dismissed')
    if (dismissed === 'true') {
      console.log('Kathy: Config prompt dismissed by user')
      return
    }
    
    // Only show on pages with tables (likely to have invoice data)
    const hasTables = document.querySelectorAll('table').length > 0
    if (!hasTables) {
      console.log('Kathy: No tables found, skipping config prompt')
      return
    }
    
    const banner = document.createElement('div')
    banner.id = 'kathy-config-prompt'
    banner.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      background: linear-gradient(135deg, #4CAF50 0%, #45a049 100%);
      color: white;
      padding: 12px 24px;
      text-align: center;
      z-index: 999999;
      box-shadow: 0 2px 8px rgba(0,0,0,0.2);
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
    `
    
    banner.innerHTML = `
      <div style="display: flex; align-items: center; justify-content: center; gap: 16px;">
        <strong>🎯 Kathy Extension</strong>
        <span>Want to collect payments here? Configure this app.</span>
        <button id="kathy-config-btn" style="
          padding: 6px 16px;
          background: white;
          color: #4CAF50;
          border: none;
          border-radius: 4px;
          cursor: pointer;
          font-weight: 600;
          font-size: 14px;
        ">
          Configure Now
        </button>
        <button id="kathy-dismiss-btn" style="
          padding: 6px 12px;
          background: transparent;
          color: white;
          border: 1px solid white;
          border-radius: 4px;
          cursor: pointer;
          font-size: 14px;
        ">
          Don't Ask Again
        </button>
      </div>
    `
    
    document.body.appendChild(banner)
    
    document.getElementById('kathy-config-btn')!.onclick = () => {
      chrome.runtime.sendMessage({ type: 'startConfiguration' })
      banner.remove()
    }
    
    document.getElementById('kathy-dismiss-btn')!.onclick = () => {
      localStorage.setItem('kathy_config_prompt_dismissed', 'true')
      banner.remove()
      console.log('Kathy: Config prompts permanently dismissed')
    }
  }

  private showTrialExpiredBanner() {
    const banner = document.createElement('div')
    banner.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      background: linear-gradient(135deg, #FF9800 0%, #F57C00 100%);
      color: white;
      padding: 12px 24px;
      text-align: center;
      z-index: 999999;
      box-shadow: 0 2px 8px rgba(0,0,0,0.2);
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
    `
    
    banner.innerHTML = `
      <div style="display: flex; align-items: center; justify-content: center; gap: 16px;">
        <strong>⏱️ Trial Expired</strong>
        <span>You've used all 3 free payments. Sign up for unlimited access!</span>
        <button id="kathy-signup-btn" style="
          padding: 6px 16px;
          background: white;
          color: #FF9800;
          border: none;
          border-radius: 4px;
          cursor: pointer;
          font-weight: 600;
          font-size: 14px;
        ">
          Sign Up Now
        </button>
      </div>
    `
    
    document.body.appendChild(banner)
    
    document.getElementById('kathy-signup-btn')!.onclick = () => {
      chrome.tabs.create({ url: 'https://getkathy.io/signup' })
    }
  }

  private showSignUpPrompt() {
    alert("You've used all 3 free payments!\n\nSign up for unlimited access to Kathy.\n\nClick OK to visit the sign-up page.")
    chrome.tabs.create({ url: 'https://getkathy.io/signup' })
  }

  private extractInvoiceId(text: string, pattern: string): string | null {
    try {
      const match = text.match(new RegExp(pattern))
      return match ? match[0] : null
    } catch (error) {
      console.error('Kathy: Invalid invoice ID pattern:', pattern, error)
      return null
    }
  }

  private extractAmount(text: string, pattern: string): number | null {
    try {
      const match = text.match(new RegExp(pattern))
      if (!match || !match[1]) return null

      const cleaned = match[1].replace(/,/g, '')
      const amount = parseFloat(cleaned)
      return isNaN(amount) ? null : amount
    } catch (error) {
      console.error('Kathy: Invalid amount pattern:', pattern, error)
      return null
    }
  }

  private extractOpportunityIdFromRow(row: Element): string | null {
    // Look for links containing /opportunities/ in the row
    const links = row.querySelectorAll('a[href*="/opportunities/"]')
    for (const link of links) {
      const href = link.getAttribute('href')
      if (href) {
        // Match opportunity ID (UUID format), stopping at ; or /
        const match = href.match(/\/opportunities\/([a-f0-9-]+)/i)
        if (match) {
          console.log('Kathy: Extracted opportunity ID from row:', match[1])
          return match[1]
        }
      }
    }
    return null
  }

  destroy() {
    if (this.observer) {
      this.observer.disconnect()
    }
  }
}

// SmartMoving Detection Helpers
function isSmartMovingPage(): boolean {
  return window.location.hostname === 'app.smartmoving.com'
}

function extractSmartMovingOpportunityId(): string | null {
  // SmartMoving opportunity URLs: https://app.smartmoving.com/opportunities/{opportunityId}/...
  const match = window.location.pathname.match(/\/opportunities\/([^\/]+)/)
  return match ? match[1] : null
}

function isSmartMovingEstimatePage(): boolean {
  const path = window.location.pathname
  return path.includes('/opportunities/') && (
    path.includes('/sales') ||
    path.includes('/estimate') ||
    path.includes('/quote')
  )
}

// API Helper Functions
async function createPaymentSession(invoiceId: string, amount: number, applicationName: string, applicationConfigId: string, opportunityIdFromRow?: string) {
  const API_URL = process.env.PLASMO_PUBLIC_API_URL || 'http://localhost:3000'

  try {
    // Detect SmartMoving context
    const smartMovingMetadata: any = {}
    if (isSmartMovingPage()) {
      // Use opportunity ID from row link first, fall back to URL extraction
      const opportunityId = opportunityIdFromRow || extractSmartMovingOpportunityId()
      if (opportunityId) {
        smartMovingMetadata.opportunityId = opportunityId
        smartMovingMetadata.quoteNumber = invoiceId
        console.log('Kathy: Using SmartMoving opportunity', { opportunityId, quoteNumber: invoiceId, fromRow: !!opportunityIdFromRow })
      }
    }

    const response = await authenticatedFetch(`${API_URL}/api/payments`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        invoiceId,
        amount,
        currency: 'USD',
        applicationName,
        applicationConfigId,
        sourceUrl: window.location.href,
        smartMovingMetadata: Object.keys(smartMovingMetadata).length > 0 ? smartMovingMetadata : undefined
      })
    })

    if (!response.ok) {
      // Clone the response so we can read it multiple times
      const responseClone = response.clone()
      let errorMessage = `API error: ${response.status}`
      let errorDetails: any = null
      
      try {
        // Try to get detailed error information from the response
        const errorData = await response.json()
        errorMessage = errorData.details || errorData.error || errorMessage
        errorDetails = errorData
        
        console.error('Kathy: Payment API error details', {
          status: response.status,
          error: errorData.error,
          details: errorData.details,
          debugInfo: errorData.debugInfo,
          stack: errorData.stack,
          fullError: errorData
        })
        
        // Show user-friendly error with details
        if (errorData.debugInfo) {
          console.error('Kathy: Environment check:', {
            hasApiKey: errorData.debugInfo.hasApiKey,
            hasCcMid: errorData.debugInfo.hasCcMid,
            hasRefreshToken: errorData.debugInfo.hasRefreshToken,
            mode: errorData.debugInfo.mode,
            nodeEnv: errorData.debugInfo.nodeEnv,
            apiKeyPrefix: errorData.debugInfo.apiKeyPrefix,
            ccMidPrefix: errorData.debugInfo.ccMidPrefix
          })
        }
      } catch (e) {
        // If response isn't JSON, try to read as text
        try {
          const statusText = await responseClone.text()
          errorMessage = `API error: ${response.status} - ${statusText}`
          console.error('Kathy: Failed to parse error response as JSON:', e)
          console.error('Kathy: Error response text:', statusText)
        } catch (textError) {
          errorMessage = `API error: ${response.status} - ${response.statusText}`
          console.error('Kathy: Failed to read error response:', textError)
        }
      }
      
      const fullError = new Error(errorMessage)
      // @ts-ignore - attach details for debugging
      fullError.details = errorDetails
      throw fullError
    }

    return await response.json()
  } catch (error) {
    console.error('Kathy: Error creating payment session', error)
    throw error
  }
}

async function checkPaymentStatus(paymentSessionId: string) {
  const API_URL = process.env.PLASMO_PUBLIC_API_URL || 'http://localhost:3000'
  
  try {
    const response = await authenticatedFetch(`${API_URL}/api/payments/${paymentSessionId}/status`)

    if (!response.ok) {
      throw new Error(`API error: ${response.status}`)
    }

    return await response.json()
  } catch (error) {
    console.error('Kathy: Error checking payment status', error)
    throw error
  }
}

async function confirmPayment(paymentSessionId: string) {
  const API_URL = process.env.PLASMO_PUBLIC_API_URL || 'http://localhost:3000'
  
  try {
    const response = await authenticatedFetch(`${API_URL}/api/payments/${paymentSessionId}/confirm`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      }
    })

    if (!response.ok) {
      throw new Error(`API error: ${response.status}`)
    }

    return await response.json()
  } catch (error) {
    console.error('Kathy: Error confirming payment', error)
    throw error
  }
}

// Listen for payment trigger from panel
document.addEventListener('kathy:start-payment', async (event: any) => {
  const { invoiceId, amount, opportunityId } = event.detail
  const API_URL = process.env.PLASMO_PUBLIC_API_URL || 'http://localhost:3000'

  console.log('Kathy: Payment triggered from panel', { invoiceId, amount, opportunityId })
  
  try {
    // Get application info from the current page
    const storage = await chrome.storage.local.get(['authToken'])
    if (!storage.authToken) {
      alert("Please sign in to collect payments.")
      return
    }
    
    // Fetch application configs to find the current app
    const appsResponse = await authenticatedFetch(`${API_URL}/api/applications`)
    if (!appsResponse.ok) {
      throw new Error('Failed to fetch application configuration')
    }
    
    const { applications } = await appsResponse.json()
    const currentApp = applications.find((app: AppConfig) => 
      new RegExp(app.urlPattern.replace(/\*/g, '.*')).test(window.location.href)
    )
    
    if (!currentApp) {
      throw new Error('No application configuration found for this page')
    }
    
    console.log('Kathy: Creating payment session', { invoiceId, amount, app: currentApp.applicationName, opportunityId })

    // Step 1: Create payment session
    const { paymentSessionId, paymentUrl } = await createPaymentSession(
      invoiceId,
      amount,
      currentApp.applicationName,
      currentApp.id,
      opportunityId
    )
    
    console.log('Kathy: Payment session created', { paymentSessionId, paymentUrl })
    
    // Step 2: Open panel for invoice details
    const entity: PanelEntity = {
      type: 'invoice',
      id: invoiceId,
      displayName: `Invoice ${invoiceId}`,
      data: {
        invoiceId,
        amount,
        applicationName: currentApp.applicationName,
        applicationConfigId: currentApp.id,
        sourceUrl: window.location.href
      }
    }
    
    panelManager.open(entity)
    
    // Step 3: Open payment in popup window (skip iframe)
    console.log('Kathy: Opening payment popup')
    chrome.runtime.sendMessage({
      type: 'openPaymentPopup',
      url: paymentUrl
    }, (response) => {
      if (chrome.runtime.lastError) {
        console.error('Kathy: Failed to open popup, falling back to new tab', chrome.runtime.lastError)
        window.open(paymentUrl, '_blank')
      } else {
        console.log('Kathy: Popup opened successfully', response)
      }
    })
    
    console.log('Kathy: Starting payment status polling')
    
    // Step 4: Poll for payment status
    const pollInterval = 3000 // 3 seconds
    const maxAttempts = 60 // 3 minutes max
    let attempts = 0
    
    const pollStatus = setInterval(async () => {
      attempts++
      
      if (attempts > maxAttempts) {
        clearInterval(pollStatus)
        console.log('Kathy: Payment polling timeout')
        return
      }
      
      try {
        const status = await checkPaymentStatus(paymentSessionId)
        console.log('Kathy: Payment status check', { status: status.status, attempt: attempts })
        
        // Step 5: When payment succeeds, show update in panel
        if (status.status === 'paid_pending_consent') {
          clearInterval(pollStatus)
          console.log('Kathy: Payment successful!')
          
          // Show confirmation prompt
          if (confirm(`Payment received for Invoice #${invoiceId}!\n\nConfirm to mark as paid?`)) {
            try {
              await confirmPayment(paymentSessionId)
              console.log('Kathy: Payment confirmed', { invoiceId })
              
              // Update the K badge to show "✓ Paid"
              const injector = (window as any).__kathyInjector
              if (injector) {
                injector.markInvoiceAsPaid(invoiceId)
              }
              
              // Update panel with new status
              panelManager.update({
                type: 'invoice',
                id: invoiceId,
                displayName: `Invoice ${invoiceId}`,
                data: {
                  invoiceId,
                  amount,
                  status: 'paid_and_confirmed',
                  lastUpdated: new Date().toISOString()
                }
              })
              
              // Trigger panel refresh to fetch latest data from API
              document.dispatchEvent(new CustomEvent('kathy:panel:refresh'))
              
              alert('✅ Payment confirmed and invoice marked as paid!')
              
              // Give the panel a moment to refresh, then reload page
              setTimeout(() => {
                window.location.reload()
              }, 1000)
            } catch (error) {
              console.error('Kathy: Error confirming payment', error)
              alert('Error confirming payment. Please try again.')
            }
          }
        } else if (status.status === 'failed') {
          clearInterval(pollStatus)
          console.log('Kathy: Payment failed', { invoiceId })
          alert("Payment failed. Please try again.")
        }
      } catch (error) {
        console.error('Kathy: Error polling payment status', error)
      }
    }, pollInterval)
    
  } catch (error) {
    console.error('Kathy: Error initiating payment', error)
    alert("Failed to initiate payment. Please check your connection and try again.")
  }
})

// Initialize injector
const injector = new UniversalKathyInjector()
injector.init()

// Expose injector to global scope for cross-function access
;(window as any).__kathyInjector = injector

// Cleanup on page unload
window.addEventListener('beforeunload', () => {
  injector.destroy()
})

