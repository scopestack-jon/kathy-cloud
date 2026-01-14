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

// Initialize injector
const injector = new UniversalKathyInjector()
injector.init()

// Cleanup on page unload
window.addEventListener('beforeunload', () => {
  injector.destroy()
})

