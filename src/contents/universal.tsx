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
        
        if (invoiceId && amount) {
          this.injectBadge(statusCell, { invoiceId, amount, row })
        }
      })
    })
  }

  private injectBadge(cell: HTMLTableCellElement, data: { invoiceId: string, amount: number, row: Element }) {
    // Check if invoice is already paid
    const existingBadge = cell.querySelector('[data-kathy-badge]')
    if (existingBadge) return

    const badge = document.createElement('span')
    badge.setAttribute('data-kathy-badge', 'true')
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
    
    badge.onclick = async (e) => {
      e.stopPropagation()
      await this.handleBadgeClick(data)
    }
    
    cell.appendChild(badge)
  }

  private async handleBadgeClick(data: { invoiceId: string, amount: number }) {
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
        sourceUrl: window.location.href
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

  destroy() {
    if (this.observer) {
      this.observer.disconnect()
    }
  }
}

// API Helper Functions
async function createPaymentSession(invoiceId: string, amount: number, applicationName: string, applicationConfigId: string) {
  const API_URL = process.env.PLASMO_PUBLIC_API_URL || 'http://localhost:3000'
  
  try {
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
        sourceUrl: window.location.href
      })
    })

    if (!response.ok) {
      throw new Error(`API error: ${response.status}`)
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
  const { invoiceId, amount } = event.detail
  const API_URL = process.env.PLASMO_PUBLIC_API_URL || 'http://localhost:3000'
  
  console.log('Kathy: Payment triggered from panel', { invoiceId, amount })
  
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
    
    console.log('Kathy: Creating payment session', { invoiceId, amount, app: currentApp.applicationName })
    
    // Step 1: Create payment session
    const { paymentSessionId, paymentUrl } = await createPaymentSession(
      invoiceId, 
      amount, 
      currentApp.applicationName,
      currentApp.id
    )
    
    console.log('Kathy: Payment session created', { paymentSessionId, paymentUrl })
    
    // Step 2: Show alert
    alert(`Payment for Invoice #${invoiceId} (${amount.toLocaleString('en-US', { style: 'currency', currency: 'USD' })})\n\nYou will now be redirected to complete payment.`)
    
    // Step 3: Open payment URL
    window.open(paymentUrl, '_blank')
    
    console.log('Kathy: Payment window opened, starting polling')
    
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
              
              // Update panel
              panelManager.update({
                type: 'invoice',
                id: invoiceId,
                displayName: `Invoice ${invoiceId}`,
                data: {
                  invoiceId,
                  amount,
                  status: 'confirmed',
                  lastUpdated: new Date().toISOString()
                }
              })
              
              alert('✅ Payment confirmed and invoice marked as paid!')
              
              // Refresh the page to show updated status
              window.location.reload()
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

// Cleanup on page unload
window.addEventListener('beforeunload', () => {
  injector.destroy()
})

