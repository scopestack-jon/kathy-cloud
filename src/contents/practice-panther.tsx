import { createRoot } from "react-dom/client"
import React from "react"
import "./configurator" // Import configurator to register message listeners
import { panelManager, PanelEntity } from "../components/PanelManager"
import { executeStatusUpdate, hasActionSequenceForUrl } from "../lib/status-update-executor"
import { StatusUpdateProgress } from "../components/StatusUpdateProgress"

// Plasmo content script configuration
export const config = {
  matches: ["https://app.practicepanther.com/*"],
  run_at: "document_idle"
}

// Configuration
const KATHY_CLOUD_URL = process.env.PLASMO_PUBLIC_API_URL || 'http://localhost:3000'
const API_SECRET_KEY = process.env.PLASMO_PUBLIC_API_SECRET || 'dev-secret-key-change-in-production'

// Logging helper
function kathyLog(message: string, extra?: any) {
  if (extra !== undefined) {
    console.log(`Kathy: ${message}`, extra)
  } else {
    console.log(`Kathy: ${message}`)
  }
}

// API helper functions
async function createPaymentSession(invoiceData: InvoiceData) {
  try {
    // Get auth token from chrome.storage
    const { authToken } = await chrome.storage.local.get(['authToken'])
    
    if (!authToken) {
      throw new Error('Not authenticated. Please sign in to the Kathy extension.')
    }
    
    const response = await fetch(`${KATHY_CLOUD_URL}/api/payments`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authToken}`
      },
      body: JSON.stringify({
        invoiceId: invoiceData.invoiceId,
        amount: invoiceData.amount,
        currency: 'USD',
        practicePantherInvoiceUrl: window.location.href,
        organizationName: await getAuthenticatedOrganization()
      })
    })

    if (!response.ok) {
      throw new Error(`API error: ${response.status}`)
    }

    return await response.json()
  } catch (error) {
    kathyLog('Error creating payment session', error)
    throw error
  }
}

async function checkPaymentStatus(paymentSessionId: string) {
  try {
    // Get auth token from chrome.storage
    const { authToken } = await chrome.storage.local.get(['authToken'])
    
    if (!authToken) {
      throw new Error('Not authenticated. Please sign in to the Kathy extension.')
    }
    
    const response = await fetch(`${KATHY_CLOUD_URL}/api/payments/${paymentSessionId}/status`, {
      headers: {
        'Authorization': `Bearer ${authToken}`
      }
    })

    if (!response.ok) {
      throw new Error(`API error: ${response.status}`)
    }

    return await response.json()
  } catch (error) {
    kathyLog('Error checking payment status', error)
    throw error
  }
}

async function confirmPayment(paymentSessionId: string) {
  try {
    const response = await fetch(`${KATHY_CLOUD_URL}/api/payments/${paymentSessionId}/confirm`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${API_SECRET_KEY}`
      }
    })

    if (!response.ok) {
      throw new Error(`API error: ${response.status}`)
    }

    return await response.json()
  } catch (error) {
    kathyLog('Error confirming payment', error)
    throw error
  }
}

async function cancelPayment(paymentSessionId: string) {
  try {
    const response = await fetch(`${KATHY_CLOUD_URL}/api/payments/${paymentSessionId}/cancel`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${API_SECRET_KEY}`
      }
    })

    if (!response.ok) {
      throw new Error(`API error: ${response.status}`)
    }

    return await response.json()
  } catch (error) {
    kathyLog('Error cancelling payment', error)
    throw error
  }
}

// Type definitions
interface InvoiceData {
  invoiceId: string
  amount: number
  row: HTMLTableRowElement
  statusCell: HTMLTableCellElement
  organizationName?: string
}

interface ExtensionConfig {
  invoiceIdColumnIndex: number
  amountColumnIndex: number
  statusColumnIndex: number
  invoiceIdPattern: string
  amountPattern: string
}

// Default configuration (Practice Panther defaults)
const defaultConfig: ExtensionConfig = {
  invoiceIdColumnIndex: 0,
  amountColumnIndex: 2,
  statusColumnIndex: 3,
  invoiceIdPattern: "I-\\d+",
  amountPattern: "\\$?([\\d,]+\\.?\\d*)"
}

// Global config (loaded from storage)
let currentConfig: ExtensionConfig = defaultConfig

// Consent Modal Component
interface ConsentModalProps {
  invoiceId: string
  amount: number
  onConfirm: () => void
  onCancel: () => void
}

const ConsentModal: React.FC<ConsentModalProps> = ({ invoiceId, amount, onConfirm, onCancel }) => {
  return (
    <div style={{
      position: "fixed",
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: "rgba(0, 0, 0, 0.5)",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      zIndex: 999999
    }}>
      <div style={{
        backgroundColor: "white",
        padding: "24px",
        borderRadius: "8px",
        boxShadow: "0 4px 6px rgba(0, 0, 0, 0.1)",
        maxWidth: "400px",
        width: "90%"
      }}>
        <h3 style={{
          margin: "0 0 16px 0",
          fontSize: "18px",
          fontWeight: "600",
          color: "#333"
        }}>
          Confirm Payment
        </h3>
        <p style={{
          margin: "0 0 24px 0",
          fontSize: "14px",
          color: "#666"
        }}>
          Mark invoice #{invoiceId} as paid for ${amount.toFixed(2)}?
        </p>
        <div style={{
          display: "flex",
          gap: "12px",
          justifyContent: "flex-end"
        }}>
          <button
            onClick={onCancel}
            style={{
              padding: "8px 16px",
              fontSize: "14px",
              border: "1px solid #ddd",
              borderRadius: "4px",
              backgroundColor: "white",
              color: "#333",
              cursor: "pointer"
            }}
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            style={{
              padding: "8px 16px",
              fontSize: "14px",
              border: "none",
              borderRadius: "4px",
              backgroundColor: "#4CAF50",
              color: "white",
              cursor: "pointer"
            }}
          >
            Confirm
          </button>
        </div>
      </div>
    </div>
  )
}

// Modal Manager
class ModalManager {
  private container: HTMLDivElement | null = null
  private root: any = null

  show(invoiceId: string, amount: number, onConfirm: () => void, onCancel?: () => void) {
    if (!this.container) {
      this.container = document.createElement("div")
      this.container.id = "kathy-modal-root"
      document.body.appendChild(this.container)
      this.root = createRoot(this.container)
    }

    this.root.render(
      <ConsentModal
        invoiceId={invoiceId}
        amount={amount}
        onConfirm={() => {
          this.hide()
          onConfirm()
        }}
        onCancel={() => {
          this.hide()
          if (onCancel) onCancel()
        }}
      />
    )
  }

  hide() {
    if (this.root) {
      this.root.render(null)
    }
  }
}

const modalManager = new ModalManager()

// Status Update Progress Manager
class StatusProgressManager {
  private container: HTMLDivElement | null = null
  private root: any = null
  private state = {
    isVisible: false,
    currentStep: 0,
    totalSteps: 0,
    status: 'in-progress' as 'in-progress' | 'success' | 'error' | 'paused',
    message: '',
    onRetry: undefined as (() => void) | undefined
  }

  show() {
    if (!this.container) {
      this.container = document.createElement("div")
      this.container.id = "kathy-status-progress-root"
      document.body.appendChild(this.container)
      this.root = createRoot(this.container)
    }
    this.state.isVisible = true
    this.state.status = 'in-progress'
    this.render()
  }

  updateProgress(step: number, total: number) {
    this.state.currentStep = step
    this.state.totalSteps = total
    this.render()
  }

  showSuccess() {
    this.state.status = 'success'
    this.state.message = 'Invoice status updated!'
    this.render()
    setTimeout(() => this.hide(), 3000)
  }

  showError(message: string, onRetry?: () => void) {
    this.state.status = 'error'
    this.state.message = message
    this.state.onRetry = onRetry
    this.render()
  }

  showPaused(onRetry: () => void) {
    this.state.status = 'paused'
    this.state.message = 'Session expired. Please log in and click Retry.'
    this.state.onRetry = onRetry
    this.render()
  }

  hide() {
    this.state.isVisible = false
    this.render()
  }

  private render() {
    if (this.root) {
      this.root.render(
        <StatusUpdateProgress
          isVisible={this.state.isVisible}
          currentStep={this.state.currentStep}
          totalSteps={this.state.totalSteps}
          status={this.state.status}
          message={this.state.message}
          onRetry={this.state.onRetry}
          onDismiss={() => this.hide()}
        />
      )
    }
  }
}

const statusProgressManager = new StatusProgressManager()

// Parse balance from cell text using configured pattern
function parseBalance(cellText: string): number | null {
  try {
    const regex = new RegExp(currentConfig.amountPattern)
    const match = cellText.match(regex)
    if (!match) return null
    
    // Extract the captured group (the number part)
    const numStr = (match[1] || match[0]).replace(/,/g, '')
    const num = parseFloat(numStr)
    
    return isNaN(num) ? null : num
  } catch (error) {
    kathyLog("Error parsing balance with pattern", error)
    return null
  }
}

// Extract invoice data from row using configured column indices
function extractInvoiceData(row: HTMLTableRowElement): InvoiceData | null {
  try {
    const cells = Array.from(row.cells).filter(cell => cell.offsetParent !== null)
    
    // Check if we have enough cells based on configuration
    const maxIndex = Math.max(
      currentConfig.invoiceIdColumnIndex,
      currentConfig.amountColumnIndex,
      currentConfig.statusColumnIndex
    )
    
    if (cells.length <= maxIndex) {
      // Not enough cells in this row
      return null
    }

    // Get cells based on configuration
    const invoiceIdCell = cells[currentConfig.invoiceIdColumnIndex] as HTMLTableCellElement
    const amountCell = cells[currentConfig.amountColumnIndex] as HTMLTableCellElement
    const statusCell = cells[currentConfig.statusColumnIndex] as HTMLTableCellElement

    // Extract invoice ID using configured pattern
    let invoiceId = ""
    try {
      const regex = new RegExp(currentConfig.invoiceIdPattern)
      const match = (invoiceIdCell.textContent || "").match(regex)
      if (match) {
        invoiceId = match[0]
      }
    } catch (error) {
      kathyLog("Error matching invoice ID pattern", error)
    }

    if (!invoiceId) {
      // Silently skip rows without invoice IDs
      return null
    }

    // Extract amount from configured column
    const amount = parseBalance(amountCell.textContent || "")
    
    if (amount === null || amount <= 0) {
      return null
    }

    // Note: organizationName will be added when creating entity (from authenticated user)
    return { invoiceId, amount, row, statusCell }
  } catch (error) {
    kathyLog("Error extracting invoice data", error)
    return null
  }
}

// Create Kathy badge button (opens side panel)
function createKathyBadge(invoiceData: InvoiceData): HTMLButtonElement {
  const badge = document.createElement("button")
  badge.className = "kathy-badge"
  badge.setAttribute("data-kathy-badge", "true")
  badge.setAttribute("data-invoice-id", invoiceData.invoiceId)
  badge.title = "View in Kathy Panel"
  
  // Default styling for K badge
  badge.style.cssText = `
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 24px;
    height: 24px;
    margin-right: 6px;
    font-size: 12px;
    font-weight: 600;
    color: white;
    background: linear-gradient(135deg, #4CAF50 0%, #45a049 100%);
    border: none;
    border-radius: 50%;
    cursor: pointer;
    vertical-align: middle;
    box-shadow: 0 2px 4px rgba(0,0,0,0.1);
    transition: all 0.2s;
  `
  
  badge.textContent = "K"
  
  // Check if invoice is confirmed and update UI
  checkIfPaid(invoiceData.invoiceId).then(isPaid => {
    if (isPaid) {
      // Change to "Paid" badge
      badge.style.cssText = `
        display: inline-flex;
        align-items: center;
        justify-content: center;
        padding: 4px 10px;
        margin-right: 8px;
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
    }
  })
  
  // Hover effect
  badge.addEventListener("mouseenter", () => {
    badge.style.transform = "scale(1.05)"
    badge.style.boxShadow = "0 4px 8px rgba(0,0,0,0.15)"
  })
  
  badge.addEventListener("mouseleave", () => {
    badge.style.transform = "scale(1)"
    badge.style.boxShadow = "0 2px 4px rgba(0,0,0,0.1)"
  })
  
  // Click handler - opens panel
  badge.addEventListener("click", async (e) => {
    e.preventDefault()
    e.stopPropagation()
    
    // Get organization from authenticated user
    const organizationId = await getAuthenticatedOrganization()
    
    const entity: PanelEntity = {
      type: "invoice",
      id: invoiceData.invoiceId,
      displayName: `Invoice ${invoiceData.invoiceId}`,
      data: {
        invoiceId: invoiceData.invoiceId,
        amount: invoiceData.amount,
        status: "pending",
        lastUpdated: new Date().toISOString(),
        organizationName: organizationId
      }
    }
    
    panelManager.open(entity)
  })
  
  return badge
}

// Check if invoice has been paid and confirmed
async function checkIfPaid(invoiceId: string): Promise<boolean> {
  try {
    // Get auth token from chrome.storage
    const { authToken } = await chrome.storage.local.get(['authToken'])
    
    if (!authToken) {
      return false // Not authenticated, can't check
    }
    
    const response = await fetch(`${KATHY_CLOUD_URL}/api/entities/invoice/${invoiceId}`, {
      headers: {
        'Authorization': `Bearer ${authToken}`
      }
    })
    
    if (response.ok) {
      const data = await response.json()
      const status = data.data?.summary?.latestStatus
      return status === 'confirmed' || status === 'paid_and_confirmed'
    }
  } catch (error) {
    // Silently fail - don't block UI
  }
  return false
}

// Create payment button
function createPayButton(invoiceData: InvoiceData): HTMLButtonElement {
  const button = document.createElement("button")
  button.className = "kathy-pay-button"
  button.setAttribute("data-kathy-injected", "true")
  
  // Create icon
  const icon = document.createElement("img")
  icon.src = chrome.runtime.getURL("payment-icon.png")
  icon.style.cssText = "width: 16px; height: 16px; margin-right: 4px; vertical-align: middle;"
  
  // Button styling
  button.style.cssText = `
    display: inline-flex;
    align-items: center;
    padding: 4px 12px;
    margin-right: 8px;
    font-size: 12px;
    font-weight: 500;
    color: white;
    background-color: #4CAF50;
    border: none;
    border-radius: 4px;
    cursor: pointer;
    vertical-align: middle;
  `
  
  button.appendChild(icon)
  button.appendChild(document.createTextNode("Collect with Kathy"))
  
  // Click handler - integrated with Kathy Cloud
  button.addEventListener("click", async (e) => {
    e.preventDefault()
    e.stopPropagation()
    
    const { invoiceId, amount } = invoiceData
    
    // Disable button during processing
    button.disabled = true
    button.textContent = "Processing..."
    
    try {
      kathyLog("Creating payment session", { invoiceId, amount })
      
      // Step 1: Create payment session with Kathy Cloud
      const { paymentSessionId, paymentUrl } = await createPaymentSession(invoiceData)
      
      kathyLog("Payment session created", { paymentSessionId, paymentUrl })
      
      // Step 2: Show alert with payment info
      alert(`Payment for Invoice #${invoiceId} ($${amount.toFixed(2)})\n\nYou will now be redirected to complete payment.`)
      
      // Step 3: Open payment URL in new tab
      window.open(paymentUrl, '_blank')
      
      kathyLog("Payment window opened, starting polling")
      button.textContent = "Waiting for payment..."
      
      // Step 4: Poll for payment status
      const pollInterval = 3000 // 3 seconds
      const maxAttempts = 60 // 3 minutes max
      let attempts = 0
      
      const pollStatus = setInterval(async () => {
        attempts++
        
        if (attempts > maxAttempts) {
          clearInterval(pollStatus)
          button.disabled = false
          button.textContent = "Collect with Kathy"
          kathyLog("Payment polling timeout")
          return
        }
        
        try {
          const status = await checkPaymentStatus(paymentSessionId)
          kathyLog("Payment status check", { status: status.status, attempt: attempts })
          
          // Step 5: When payment succeeds, show consent modal
          if (status.status === 'paid_pending_consent') {
            clearInterval(pollStatus)
            kathyLog("Payment successful, showing consent modal")
            
            // Open side panel to show payment details
            const entity: PanelEntity = {
              type: "invoice",
              id: invoiceId,
              displayName: `Invoice ${invoiceId}`,
              data: {
                invoiceId,
                amount,
                status: 'paid_pending_consent',
                lastUpdated: new Date().toISOString()
              }
            }
            panelManager.open(entity)
            
            modalManager.show(invoiceId, amount, async () => {
              try {
                // User confirmed - mark as paid
                await confirmPayment(paymentSessionId)
                markInvoiceAsPaid(invoiceData)
                kathyLog("Payment confirmed and invoice marked as paid", { invoiceId })
                button.textContent = "Paid ✓"
                button.style.backgroundColor = "#2E7D32"
                
                // Update panel with confirmed status
                panelManager.update({
                  type: "invoice",
                  id: invoiceId,
                  displayName: `Invoice ${invoiceId}`,
                  data: {
                    invoiceId,
                    amount,
                    status: 'confirmed',
                    lastUpdated: new Date().toISOString()
                  }
                })
              } catch (error) {
                kathyLog("Error confirming payment", error)
                button.disabled = false
                button.textContent = "Collect with Kathy"
              }
            }, async () => {
              try {
                // User cancelled - move to manual review
                await cancelPayment(paymentSessionId)
                kathyLog("Payment cancelled by user", { invoiceId })
                button.disabled = false
                button.textContent = "Collect with Kathy"
                
                // Update panel with cancelled status
                panelManager.update({
                  type: "invoice",
                  id: invoiceId,
                  displayName: `Invoice ${invoiceId}`,
                  data: {
                    invoiceId,
                    amount,
                    status: 'cancelled_by_user',
                    lastUpdated: new Date().toISOString()
                  }
                })
              } catch (error) {
                kathyLog("Error cancelling payment", error)
              }
            })
          } else if (status.status === 'failed') {
            clearInterval(pollStatus)
            button.disabled = false
            button.textContent = "Collect with Kathy"
            kathyLog("Payment failed", { invoiceId })
            alert("Payment failed. Please try again.")
          }
        } catch (error) {
          kathyLog("Error polling payment status", error)
        }
      }, pollInterval)
      
    } catch (error) {
      kathyLog("Error initiating payment", error)
      button.disabled = false
      button.textContent = "Collect with Kathy"
      alert("Failed to initiate payment. Please check your connection and try again.")
    }
  })
  
  return button
}

// Mark invoice as paid in UI
function markInvoiceAsPaid(invoiceData: InvoiceData) {
  // Note: The "✓ Paid" pill badge is already shown via scanAndInject
  // We just need to refresh the badge to show the paid state
  // No need to add extra "PAID" text - the pill badge is enough!
  
  // Just add a subtle visual indicator to the row
  const row = invoiceData.row
  if (row) {
    row.style.backgroundColor = "#f1f8f4" // Very subtle green tint
  }
}

// Get organization from authenticated user's Kathy account
async function getAuthenticatedOrganization(): Promise<string | undefined> {
  try {
    // Get user's organization from chrome storage (set during authentication)
    return new Promise((resolve) => {
      chrome.storage.local.get(['kathyUser'], (result) => {
        if (result.kathyUser?.organizationId) {
          resolve(result.kathyUser.organizationId)
        } else {
          resolve(undefined)
        }
      })
    })
  } catch (error) {
    kathyLog("Could not get authenticated organization", error)
    return undefined
  }
}

// Log to cloud
async function logToCloud(payload: any) {
  try {
    // Send message to background script for logging
    chrome.runtime.sendMessage({
      type: "cloudLog",
      payload
    })
    
    kathyLog("Cloud log sent", payload)
  } catch (error) {
    kathyLog("Failed to send cloud log", error)
  }
}

// Scan and inject buttons
function scanAndInject() {
  try {
    const rows = document.querySelectorAll<HTMLTableRowElement>('tr[role="row"]')
    
    if (rows.length === 0) {
      return // No rows to scan, exit early
    }
    
    let injectedCount = 0
    
    rows.forEach((row) => {
      // Skip if already injected (check for kathy-badge)
      if (row.querySelector('.kathy-badge')) {
        return
      }
      
      // Extract invoice data
      const invoiceData = extractInvoiceData(row)
      if (!invoiceData) {
        return
      }
      
      // Create and inject badge only (button removed for cleaner UI)
      const badge = createKathyBadge(invoiceData)
      
      // Insert badge before status text
      const statusCell = invoiceData.statusCell
      if (statusCell.firstChild) {
        statusCell.insertBefore(badge, statusCell.firstChild)
      } else {
        statusCell.appendChild(badge)
      }
      
      injectedCount++
    })
    
    // Only log if we actually injected buttons
    if (injectedCount > 0) {
      kathyLog(`Injected ${injectedCount} button(s)`)
    }
  } catch (error) {
    kathyLog("Error during scan and inject", error)
  }
}

// Setup observers for SPA navigation
function setupObservers() {
  // Debounce helper with longer delay to avoid triggering Practice Panther rate limits
  let debounceTimer: NodeJS.Timeout
  let lastScanTime = 0
  const MIN_SCAN_INTERVAL = 2000 // Minimum 2 seconds between scans
  
  const debouncedScan = () => {
    clearTimeout(debounceTimer)
    debounceTimer = setTimeout(() => {
      const now = Date.now()
      if (now - lastScanTime < MIN_SCAN_INTERVAL) {
        // Too soon, skip this scan
        return
      }
      lastScanTime = now
      scanAndInject()
    }, 1000) // Increased from 500ms to 1000ms
  }
  
  // MutationObserver for DOM changes - more selective
  const observer = new MutationObserver((mutations) => {
    // Only react to changes in table elements to avoid excessive triggers
    const hasTableChanges = mutations.some(mutation => {
      const target = mutation.target as HTMLElement
      return (
        target.tagName === 'TABLE' ||
        target.tagName === 'TBODY' ||
        target.tagName === 'TR' ||
        (mutation.addedNodes.length > 0 && 
         Array.from(mutation.addedNodes).some(node => 
           (node as HTMLElement).tagName === 'TR'
         ))
      )
    })
    
    if (hasTableChanges) {
      debouncedScan()
    }
  })
  
  // Observe only table container, not entire body to reduce noise
  const tableContainer = document.querySelector('table') || document.body
  observer.observe(tableContainer, {
    childList: true,
    subtree: true
  })
  
  kathyLog("MutationObserver setup complete")
  
  // URL change detection for SPA navigation
  let lastUrl = window.location.href
  setInterval(() => {
    const currentUrl = window.location.href
    if (currentUrl !== lastUrl) {
      lastUrl = currentUrl
      if (currentUrl.includes('/invoices')) {
        kathyLog("URL changed to invoices page, re-scanning")
        setTimeout(() => scanAndInject(), 1000)
      }
    }
  }, 1000)
  
  kathyLog("URL change detection setup complete")
}

// Load configuration from storage
async function loadConfig() {
  return new Promise<ExtensionConfig>((resolve) => {
    chrome.storage.local.get(['kathyConfig'], (result) => {
      if (result.kathyConfig) {
        kathyLog("Loaded custom configuration", result.kathyConfig)
        resolve(result.kathyConfig)
      } else {
        kathyLog("Using default configuration")
        resolve(defaultConfig)
      }
    })
  })
}

// Listen for payment trigger from panel
document.addEventListener('kathy:start-payment', async (event: CustomEvent) => {
  const { invoiceId, amount } = event.detail
  kathyLog("Payment triggered from panel", { invoiceId, amount })
  
  // Find the invoice data from the DOM
  const rows = document.querySelectorAll<HTMLTableRowElement>('tr[role="row"]')
  let invoiceData: InvoiceData | null = null
  
  for (const row of rows) {
    const data = extractInvoiceData(row)
    if (data && data.invoiceId === invoiceId) {
      invoiceData = data
      break
    }
  }
  
  if (!invoiceData) {
    kathyLog("Could not find invoice data for", invoiceId)
    alert("Could not find invoice data. Please try again.")
    return
  }
  
  // Run the payment flow (extracted from button click handler)
  try {
    kathyLog("Creating payment session", { invoiceId, amount })
    
    // Step 1: Create payment session with Kathy Cloud
    const { paymentSessionId, paymentUrl } = await createPaymentSession(invoiceData)
    
    kathyLog("Payment session created", { paymentSessionId, paymentUrl })
    
    // Step 2: Show alert with payment info
    alert(`Payment for Invoice #${invoiceId} (${amount.toLocaleString('en-US', { style: 'currency', currency: 'USD' })})\n\nYou will now be redirected to complete payment.`)
    
    // Step 3: Open payment URL in new tab
    window.open(paymentUrl, '_blank')
    
    kathyLog("Payment window opened, starting polling")
    
    // Step 4: Poll for payment status
    const pollInterval = 3000 // 3 seconds
    const maxAttempts = 60 // 3 minutes max
    let attempts = 0
    
    const pollStatus = setInterval(async () => {
      attempts++
      
      if (attempts > maxAttempts) {
        clearInterval(pollStatus)
        kathyLog("Payment polling timeout")
        return
      }
      
      try {
        const status = await checkPaymentStatus(paymentSessionId)
        kathyLog("Payment status check", { status: status.status, attempt: attempts })
        
        // Step 5: When payment succeeds, show consent modal
        if (status.status === 'paid_pending_consent') {
          clearInterval(pollStatus)
          kathyLog("Payment successful, showing consent modal")
          
          // Open side panel to show payment details
          const entity: PanelEntity = {
            type: "invoice",
            id: invoiceId,
            displayName: `Invoice ${invoiceId}`,
            data: {
              invoiceId,
              amount,
              status: 'paid_pending_consent',
              lastUpdated: new Date().toISOString()
            }
          }
          panelManager.open(entity)
          
          modalManager.show(invoiceId, amount, async () => {
            try {
              // User confirmed - mark as paid
              await confirmPayment(paymentSessionId)
              kathyLog("Payment confirmed, executing status update", { invoiceId })
              
              // Check if we have an action sequence configured
              const hasSequence = await hasActionSequenceForUrl(window.location.href)
              
              if (hasSequence && invoiceData?.row) {
                // Execute automated status update
                statusProgressManager.show()
                
                const result = await executeStatusUpdate(invoiceData.row, {
                  onProgress: (step, total) => {
                    statusProgressManager.updateProgress(step, total)
                  },
                  onSuccess: () => {
                    statusProgressManager.showSuccess()
                    kathyLog("Status update completed successfully", { invoiceId })
                  },
                  onError: (error) => {
                    statusProgressManager.showError(error.message, () => {
                      // Retry logic will be handled by retry-handler
                      kathyLog("User requested retry", { invoiceId })
                    })
                    kathyLog("Status update failed", { invoiceId, error: error.message })
                  },
                  onAuthWall: (onRetry) => {
                    statusProgressManager.showPaused(onRetry)
                    kathyLog("Auth wall detected, paused for user intervention", { invoiceId })
                  }
                })
                
                if (result.success) {
                  markInvoiceAsPaid(invoiceData)
                }
              } else {
                // No action sequence - just mark visually
                markInvoiceAsPaid(invoiceData!)
                kathyLog("No action sequence configured, marked visually only", { invoiceId })
              }
              
              // Update panel with confirmed status
              panelManager.update({
                type: "invoice",
                id: invoiceId,
                displayName: `Invoice ${invoiceId}`,
                data: {
                  invoiceId,
                  amount,
                  status: 'confirmed',
                  lastUpdated: new Date().toISOString()
                }
              })
            } catch (error) {
              kathyLog("Error confirming payment", error)
            }
          }, async () => {
            try {
              // User cancelled - move to manual review
              await cancelPayment(paymentSessionId)
              kathyLog("Payment cancelled by user", { invoiceId })
              
              // Update panel with cancelled status
              panelManager.update({
                type: "invoice",
                id: invoiceId,
                displayName: `Invoice ${invoiceId}`,
                data: {
                  invoiceId,
                  amount,
                  status: 'cancelled_by_user',
                  lastUpdated: new Date().toISOString()
                }
              })
            } catch (error) {
              kathyLog("Error cancelling payment", error)
            }
          })
        } else if (status.status === 'failed') {
          clearInterval(pollStatus)
          kathyLog("Payment failed", { invoiceId })
          alert("Payment failed. Please try again.")
        }
      } catch (error) {
        kathyLog("Error polling payment status", error)
      }
    }, pollInterval)
    
  } catch (error) {
    kathyLog("Error initiating payment", error)
    alert("Failed to initiate payment. Please check your connection and try again.")
  }
})

// Initialize
async function init() {
  kathyLog("Extension loaded")
  
  // Load configuration
  currentConfig = await loadConfig()
  
  // Initial scan
  setTimeout(() => {
    scanAndInject()
  }, 1000)
  
  // Setup observers
  setupObservers()
  
  // Listen for configuration changes
  chrome.storage.onChanged.addListener((changes, areaName) => {
    if (areaName === 'local' && changes.kathyConfig) {
      kathyLog("Configuration updated, reloading...")
      currentConfig = changes.kathyConfig.newValue
      // Re-scan with new configuration
      scanAndInject()
    }
  })
}

// Start when DOM is ready
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", init)
} else {
  init()
}

