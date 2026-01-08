import { createRoot } from "react-dom/client"
import React from "react"

// Plasmo content script configuration
export const config = {
  matches: ["https://app.practicepanther.com/*"],
  run_at: "document_idle"
}

// Logging helper
function kathyLog(message: string, extra?: any) {
  if (extra !== undefined) {
    console.log(`Kathy: ${message}`, extra)
  } else {
    console.log(`Kathy: ${message}`)
  }
}

// Type definitions
interface InvoiceData {
  invoiceId: string
  amount: number
  row: HTMLTableRowElement
  statusCell: HTMLTableCellElement
}

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

  show(invoiceId: string, amount: number, onConfirm: () => void) {
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
        onCancel={() => this.hide()}
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

// Parse balance from cell text
function parseBalance(cellText: string): number | null {
  const match = cellText.match(/\$?([\d,]+\.?\d*)/);
  if (!match) return null;
  
  const numStr = match[1].replace(/,/g, '');
  const num = parseFloat(numStr);
  
  return isNaN(num) ? null : num;
}

// Extract invoice data from row
function extractInvoiceData(row: HTMLTableRowElement): InvoiceData | null {
  try {
    const cells = Array.from(row.cells).filter(cell => cell.offsetParent !== null)
    
    if (cells.length <= 3) {
      kathyLog("DOM structure changed - contact support", { cellCount: cells.length })
      return null
    }

    // Status column should be 4th visible cell (index 3)
    const statusCell = cells[3] as HTMLTableCellElement
    
    // Find balance cell (usually first cell with $ amount)
    let amount: number | null = null
    let balanceCell: HTMLTableCellElement | null = null
    
    for (const cell of cells) {
      const balance = parseBalance(cell.textContent || "")
      if (balance !== null && balance > 0) {
        amount = balance
        balanceCell = cell as HTMLTableCellElement
        break
      }
    }

    if (amount === null || amount <= 0) {
      return null
    }

    // Extract invoice ID (usually in first or second cell)
    let invoiceId = ""
    for (let i = 0; i < Math.min(3, cells.length); i++) {
      const text = cells[i].textContent || ""
      const match = text.match(/I-\d+/)
      if (match) {
        invoiceId = match[0]
        break
      }
    }

    if (!invoiceId) {
      kathyLog("Cannot find invoice ID for row")
      return null
    }

    return { invoiceId, amount, row, statusCell }
  } catch (error) {
    kathyLog("Error extracting invoice data", error)
    return null
  }
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
  button.appendChild(document.createTextNode("Pay"))
  
  // Click handler
  button.addEventListener("click", async (e) => {
    e.preventDefault()
    e.stopPropagation()
    
    const { invoiceId, amount } = invoiceData
    
    // Show alert with payment info
    alert(`Payment for Invoice #${invoiceId} ($${amount.toFixed(2)})`)
    
    kathyLog("Payment initiated", { invoiceId, amount })
    
    // Show consent modal
    modalManager.show(invoiceId, amount, async () => {
      try {
        // Mark invoice as paid in UI
        markInvoiceAsPaid(invoiceData)
        
        // Log to cloud
        await logToCloud({
          action: "mark_paid",
          invoiceId,
          amount,
          timestamp: new Date().toISOString()
        })
        
        kathyLog("Payment marked as paid", { invoiceId, amount })
      } catch (error) {
        kathyLog("Error marking payment as paid", error)
      }
    })
  })
  
  return button
}

// Mark invoice as paid in UI
function markInvoiceAsPaid(invoiceData: InvoiceData) {
  const { statusCell } = invoiceData
  
  // Update status text
  const statusText = statusCell.querySelector('[class*="status"]') || statusCell
  if (statusText) {
    statusText.textContent = "PAID"
  }
  
  // Add visual indicator
  statusCell.style.backgroundColor = "#E8F5E9"
  statusCell.style.color = "#2E7D32"
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
    
    kathyLog(`Scanning ${rows.length} rows`)
    
    rows.forEach((row) => {
      // Skip if already injected
      if (row.querySelector('[data-kathy-injected]')) {
        return
      }
      
      // Extract invoice data
      const invoiceData = extractInvoiceData(row)
      if (!invoiceData) {
        return
      }
      
      // Create and inject button
      const button = createPayButton(invoiceData)
      
      // Insert button before status text
      const statusCell = invoiceData.statusCell
      if (statusCell.firstChild) {
        statusCell.insertBefore(button, statusCell.firstChild)
      } else {
        statusCell.appendChild(button)
      }
      
      kathyLog(`Injected button for invoice ${invoiceData.invoiceId}`)
    })
  } catch (error) {
    kathyLog("Error during scan and inject", error)
  }
}

// Setup observers for SPA navigation
function setupObservers() {
  // Debounce helper
  let debounceTimer: NodeJS.Timeout
  const debouncedScan = () => {
    clearTimeout(debounceTimer)
    debounceTimer = setTimeout(() => {
      scanAndInject()
    }, 500)
  }
  
  // MutationObserver for DOM changes
  const observer = new MutationObserver((mutations) => {
    const hasRelevantChanges = mutations.some(mutation => 
      mutation.addedNodes.length > 0 || mutation.removedNodes.length > 0
    )
    
    if (hasRelevantChanges) {
      debouncedScan()
    }
  })
  
  // Observe the document body for changes
  observer.observe(document.body, {
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

// Initialize
function init() {
  kathyLog("Extension loaded")
  
  // Initial scan
  setTimeout(() => {
    scanAndInject()
  }, 1000)
  
  // Setup observers
  setupObservers()
}

// Start when DOM is ready
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", init)
} else {
  init()
}

