import { createRoot } from "react-dom/client"
import React, { useState } from "react"

// Plasmo content script configuration
export const config = {
  matches: ["<all_urls>"],
  exclude_matches: [
    "https://kathy-cloud.vercel.app/auth/*",
    "http://localhost:3000/auth/*"
  ],
  run_at: "document_idle"
}

// Configuration state
interface ConfigState {
  step: 'idle' | 'selectInvoiceId' | 'selectAmount' | 'selectStatus' | 'complete'
  invoiceIdColumnIndex: number | null
  amountColumnIndex: number | null
  statusColumnIndex: number | null
  invoiceIdSample: string | null
  amountSample: string | null
}

// Configuration UI Component
const ConfiguratorUI: React.FC<{
  state: ConfigState
  onCancel: () => void
}> = ({ state, onCancel }) => {
  const getStepText = () => {
    switch (state.step) {
      case 'selectInvoiceId':
        return 'Step 1/3: Click on any cell that contains an invoice ID (like "I-123")'
      case 'selectAmount':
        return 'Step 2/3: Click on any cell that contains the amount/balance to be paid'
      case 'selectStatus':
        return 'Step 3/3: Click on the cell where you want the "Collect with Kathy" button'
      case 'complete':
        return '✅ Configuration complete! Saving...'
      default:
        return 'Configuration mode active'
    }
  }

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      backgroundColor: '#667eea',
      color: 'white',
      padding: '16px 24px',
      zIndex: 999999,
      boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
    }}>
      <div>
        <div style={{ fontSize: '18px', fontWeight: 600, marginBottom: '4px' }}>
          🎯 Kathy Configuration Mode
        </div>
        <div style={{ fontSize: '14px', opacity: 0.95 }}>
          {getStepText()}
        </div>
        {state.invoiceIdSample && (
          <div style={{ fontSize: '12px', marginTop: '8px', opacity: 0.9 }}>
            ✓ Invoice ID: {state.invoiceIdSample} (Column {state.invoiceIdColumnIndex})
          </div>
        )}
        {state.amountSample && (
          <div style={{ fontSize: '12px', opacity: 0.9 }}>
            ✓ Amount: {state.amountSample} (Column {state.amountColumnIndex})
          </div>
        )}
      </div>
      <button
        onClick={onCancel}
        style={{
          padding: '10px 20px',
          background: 'rgba(255,255,255,0.2)',
          border: '2px solid white',
          borderRadius: '6px',
          color: 'white',
          cursor: 'pointer',
          fontWeight: 600,
          fontSize: '14px'
        }}
      >
        Cancel
      </button>
    </div>
  )
}

// Configurator Manager
class ConfiguratorManager {
  private container: HTMLDivElement | null = null
  private root: any = null
  private state: ConfigState = {
    step: 'idle',
    invoiceIdColumnIndex: null,
    amountColumnIndex: null,
    statusColumnIndex: null,
    invoiceIdSample: null,
    amountSample: null
  }
  private clickHandler: ((e: MouseEvent) => void) | null = null
  private highlightedCell: HTMLElement | null = null

  start() {
    console.log("Kathy: Starting configuration mode")
    
    // Initialize state
    this.state = {
      step: 'selectInvoiceId',
      invoiceIdColumnIndex: null,
      amountColumnIndex: null,
      statusColumnIndex: null,
      invoiceIdSample: null,
      amountSample: null
    }

    // Create UI
    this.createUI()

    // Add click handler
    this.clickHandler = (e: MouseEvent) => this.handleCellClick(e)
    document.addEventListener('click', this.clickHandler, true)

    // Add hover handler for highlighting
    document.addEventListener('mouseover', (e) => this.handleCellHover(e), true)
    document.addEventListener('mouseout', () => this.clearHighlight(), true)
  }

  private handleCellHover(e: MouseEvent) {
    const target = e.target as HTMLElement
    if (target.tagName === 'TD') {
      this.highlightCell(target)
    }
  }

  private highlightCell(cell: HTMLElement) {
    this.clearHighlight()
    this.highlightedCell = cell
    cell.style.outline = '3px solid #667eea'
    cell.style.outlineOffset = '-3px'
    cell.style.cursor = 'pointer'
  }

  private clearHighlight() {
    if (this.highlightedCell) {
      this.highlightedCell.style.outline = ''
      this.highlightedCell.style.outlineOffset = ''
      this.highlightedCell.style.cursor = ''
      this.highlightedCell = null
    }
  }

  private handleCellClick(e: MouseEvent) {
    const target = e.target as HTMLElement
    
    // Only handle clicks on table cells
    if (target.tagName !== 'TD') {
      return
    }

    e.preventDefault()
    e.stopPropagation()

    const row = target.parentElement as HTMLTableRowElement
    const cells = Array.from(row.cells).filter(cell => cell.offsetParent !== null)
    const columnIndex = cells.indexOf(target as HTMLTableCellElement)

    if (columnIndex === -1) {
      console.log("Kathy: Could not determine column index")
      return
    }

    const cellText = target.textContent?.trim() || ''

    switch (this.state.step) {
      case 'selectInvoiceId':
        this.state.invoiceIdColumnIndex = columnIndex
        this.state.invoiceIdSample = cellText
        this.state.step = 'selectAmount'
        console.log(`Kathy: Invoice ID column selected: ${columnIndex}`)
        this.updateUI()
        break

      case 'selectAmount':
        this.state.amountColumnIndex = columnIndex
        this.state.amountSample = cellText
        this.state.step = 'selectStatus'
        console.log(`Kathy: Amount column selected: ${columnIndex}`)
        this.updateUI()
        break

      case 'selectStatus':
        this.state.statusColumnIndex = columnIndex
        this.state.step = 'complete'
        console.log(`Kathy: Status column selected: ${columnIndex}`)
        this.updateUI()
        this.complete()
        break
    }
  }

  private createUI() {
    if (!this.container) {
      this.container = document.createElement("div")
      this.container.id = "kathy-configurator-root"
      document.body.appendChild(this.container)
      this.root = createRoot(this.container)
    }
    this.updateUI()
  }

  private updateUI() {
    if (this.root) {
      this.root.render(
        <ConfiguratorUI
          state={this.state}
          onCancel={() => this.cancel()}
        />
      )
    }
  }

  private async complete() {
    // Extract patterns from samples
    const invoiceIdPattern = this.extractInvoiceIdPattern(this.state.invoiceIdSample || '')
    const amountPattern = "\\$?([\\d,]+\\.?\\d*)" // Standard amount pattern

    // Prompt for application name
    const applicationName = prompt(
      "What application is this?\n\nExamples: Practice Panther, Clio, MyCase, QuickBooks\n\nEnter application name:"
    ) || "Custom Application"

    const config = {
      applicationName,
      applicationUrl: window.location.origin,
      urlPattern: `${window.location.origin}/*`,
      selectorConfig: {
        invoiceIdColumn: this.state.invoiceIdColumnIndex!,
        amountColumn: this.state.amountColumnIndex!,
        statusColumn: this.state.statusColumnIndex!,
        invoiceIdPattern,
        amountPattern,
        tableSelector: 'table' // Can be enhanced later
      }
    }

    console.log("Kathy: Saving configuration", config)

    // Check if user is authenticated
    const { authToken } = await chrome.storage.local.get('authToken')

    if (authToken) {
      // Save to backend API
      try {
        const API_URL = process.env.PLASMO_PUBLIC_API_URL || 'http://localhost:3000'
        const response = await fetch(`${API_URL}/api/applications`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${authToken}`
          },
          body: JSON.stringify(config)
        })

        if (response.ok) {
          alert(`✅ ${applicationName} configured successfully!\n\n` +
                `Invoice ID: Column ${config.selectorConfig.invoiceIdColumn}\n` +
                `Amount: Column ${config.selectorConfig.amountColumn}\n` +
                `Status: Column ${config.selectorConfig.statusColumn}\n\n` +
                `Kathy will now work on this application!`)
        } else {
          const error = await response.json()
          alert(`❌ Error saving configuration: ${error.error}\n\nPlease try again or contact support.`)
        }
      } catch (error) {
        console.error('Kathy: Error saving to API:', error)
        alert(`❌ Network error while saving configuration.\n\nPlease check your connection and try again.`)
      }
    } else {
      // Save locally for trial mode
      const existingConfigs = localStorage.getItem('kathy_trial_configs')
      const configs = existingConfigs ? JSON.parse(existingConfigs) : []
      
      // Update or add config
      const existingIndex = configs.findIndex((c: any) => c.applicationName === applicationName)
      if (existingIndex >= 0) {
        configs[existingIndex] = config
      } else {
        configs.push({ ...config, id: crypto.randomUUID() })
      }
      
      localStorage.setItem('kathy_trial_configs', JSON.stringify(configs))
      
      alert(`✅ ${applicationName} configured (Trial Mode)!\n\n` +
            `Sign up to sync across devices and unlock unlimited payments.`)
    }

    this.cancel()
  }

  private extractInvoiceIdPattern(sample: string): string {
    // Try to detect common patterns
    if (/I-\d+/.test(sample)) return "I-\\d+"
    if (/INV-\d+/i.test(sample)) return "INV-\\d+"
    if (/#\d+/.test(sample)) return "#\\d+"
    if (/\d+/.test(sample)) return "\\d+"
    
    // Default fallback
    return "I-\\d+"
  }

  cancel() {
    console.log("Kathy: Configuration cancelled")
    
    // Remove event listeners
    if (this.clickHandler) {
      document.removeEventListener('click', this.clickHandler, true)
      this.clickHandler = null
    }

    // Clear highlight
    this.clearHighlight()

    // Remove UI
    if (this.root) {
      this.root.unmount()
    }
    if (this.container) {
      this.container.remove()
      this.container = null
    }

    // Reset state
    this.state = {
      step: 'idle',
      invoiceIdColumnIndex: null,
      amountColumnIndex: null,
      statusColumnIndex: null,
      invoiceIdSample: null,
      amountSample: null
    }
  }
}

export const configuratorManager = new ConfiguratorManager()

// Listen for messages from popup/options page
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'start-visual-config' || message.type === 'startConfiguration') {
    configuratorManager.start()
    sendResponse({ success: true })
  }
  return true
})


