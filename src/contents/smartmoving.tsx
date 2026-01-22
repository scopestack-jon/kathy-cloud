import { createRoot } from "react-dom/client"
import React, { useState } from "react"
import { authenticatedFetch } from "../lib/auth-refresh"

// Plasmo content script configuration
export const config = {
  matches: ["https://app.smartmoving.com/*"],
  run_at: "document_idle"
}

// Configuration
const KATHY_CLOUD_URL = process.env.PLASMO_PUBLIC_API_URL || 'http://localhost:3000'

// Logging helper
function kathyLog(message: string, extra?: any) {
  if (extra !== undefined) {
    console.log(`Kathy (SmartMoving): ${message}`, extra)
  } else {
    console.log(`Kathy (SmartMoving): ${message}`)
  }
}

// Get authenticated organization ID
async function getAuthenticatedOrganization(): Promise<string | undefined> {
  try {
    const response = await authenticatedFetch(`${KATHY_CLOUD_URL}/api/auth/me`)

    if (!response.ok) {
      kathyLog('Failed to fetch user organization', response.status)
      return undefined
    }

    const data = await response.json()
    return data.organization?.id
  } catch (error) {
    kathyLog("Could not get authenticated organization", error)
    return undefined
  }
}

// Extract opportunity ID from URL
function extractOpportunityId(): string | null {
  // SmartMoving opportunity URLs: https://app.smartmoving.com/opportunities/{opportunityId}/...
  const match = window.location.pathname.match(/\/opportunities\/([^\/]+)/)
  return match ? match[1] : null
}

// Check if we're on an estimate/sales page
function isEstimatePage(): boolean {
  const path = window.location.pathname
  return path.includes('/opportunities/') && (
    path.includes('/sales') ||
    path.includes('/estimate') ||
    path.includes('/quote')
  )
}

// Payment Link Modal Component
interface PaymentLinkModalProps {
  paymentUrl: string
  feeBreakdown: {
    estimateAmount: number
    processingFee: number
    feePercent: number
    totalAmount: number
  }
  customer: {
    name: string
    email: string
  }
  onClose: () => void
}

const PaymentLinkModal: React.FC<PaymentLinkModalProps> = ({
  paymentUrl,
  feeBreakdown,
  customer,
  onClose
}) => {
  const [copied, setCopied] = useState(false)

  const copyToClipboard = () => {
    navigator.clipboard.writeText(paymentUrl)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const openInNewTab = () => {
    window.open(paymentUrl, '_blank')
  }

  const emailSubject = encodeURIComponent('Payment Link for Your Moving Quote')
  const emailBody = encodeURIComponent(
    `Hi ${customer.name},\n\n` +
    `Please use the following secure link to complete your deposit payment:\n\n` +
    `${paymentUrl}\n\n` +
    `Payment Details:\n` +
    `Estimate Amount: $${feeBreakdown.estimateAmount.toFixed(2)}\n` +
    `Processing Fee (${feeBreakdown.feePercent}%): $${feeBreakdown.processingFee.toFixed(2)}\n` +
    `Total to Pay: $${feeBreakdown.totalAmount.toFixed(2)}\n\n` +
    `If you have any questions, please don't hesitate to reach out.\n\n` +
    `Thank you!`
  )
  const mailtoLink = `mailto:${customer.email}?subject=${emailSubject}&body=${emailBody}`

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
        padding: "32px",
        borderRadius: "12px",
        boxShadow: "0 8px 24px rgba(0, 0, 0, 0.15)",
        maxWidth: "560px",
        width: "90%"
      }}>
        <h3 style={{
          margin: "0 0 8px 0",
          fontSize: "24px",
          fontWeight: "700",
          color: "#1a1a1a",
          display: "flex",
          alignItems: "center",
          gap: "8px"
        }}>
          <span style={{ fontSize: "28px" }}>✓</span>
          Payment Link Generated
        </h3>

        <p style={{
          margin: "0 0 24px 0",
          fontSize: "14px",
          color: "#666"
        }}>
          Share this secure payment link with <strong>{customer.name}</strong>
        </p>

        {/* Fee Breakdown */}
        <div style={{
          backgroundColor: "#f8f9fa",
          padding: "16px",
          borderRadius: "8px",
          marginBottom: "20px",
          fontSize: "14px"
        }}>
          <div style={{
            display: "flex",
            justifyContent: "space-between",
            marginBottom: "8px",
            color: "#555"
          }}>
            <span>Estimate Amount:</span>
            <span><strong>${feeBreakdown.estimateAmount.toFixed(2)}</strong></span>
          </div>
          <div style={{
            display: "flex",
            justifyContent: "space-between",
            marginBottom: "8px",
            color: "#555"
          }}>
            <span>Processing Fee ({feeBreakdown.feePercent}%):</span>
            <span><strong>${feeBreakdown.processingFee.toFixed(2)}</strong></span>
          </div>
          <div style={{
            borderTop: "1px solid #ddd",
            paddingTop: "8px",
            marginTop: "8px",
            display: "flex",
            justifyContent: "space-between",
            fontSize: "16px",
            color: "#1a1a1a"
          }}>
            <span><strong>Total to Pay:</strong></span>
            <span><strong>${feeBreakdown.totalAmount.toFixed(2)}</strong></span>
          </div>
        </div>

        {/* Payment Link */}
        <div style={{
          marginBottom: "20px"
        }}>
          <label style={{
            display: "block",
            fontSize: "13px",
            fontWeight: "600",
            color: "#555",
            marginBottom: "8px"
          }}>
            Payment Link:
          </label>
          <div style={{
            display: "flex",
            gap: "8px"
          }}>
            <input
              type="text"
              value={paymentUrl}
              readOnly
              style={{
                flex: 1,
                padding: "10px 12px",
                fontSize: "13px",
                border: "1px solid #ddd",
                borderRadius: "6px",
                backgroundColor: "#f8f9fa",
                fontFamily: "monospace"
              }}
            />
            <button
              onClick={copyToClipboard}
              style={{
                padding: "10px 16px",
                fontSize: "14px",
                fontWeight: "600",
                border: "1px solid #4CAF50",
                borderRadius: "6px",
                backgroundColor: copied ? "#4CAF50" : "white",
                color: copied ? "white" : "#4CAF50",
                cursor: "pointer",
                transition: "all 0.2s",
                whiteSpace: "nowrap"
              }}
            >
              {copied ? "✓ Copied!" : "Copy"}
            </button>
          </div>
        </div>

        {/* Action Buttons */}
        <div style={{
          display: "flex",
          gap: "12px",
          marginBottom: "16px"
        }}>
          <button
            onClick={openInNewTab}
            style={{
              flex: 1,
              padding: "12px 16px",
              fontSize: "14px",
              fontWeight: "600",
              border: "1px solid #ddd",
              borderRadius: "6px",
              backgroundColor: "white",
              color: "#333",
              cursor: "pointer",
              transition: "all 0.2s"
            }}
          >
            Preview Link
          </button>
          <a
            href={mailtoLink}
            style={{
              flex: 1,
              padding: "12px 16px",
              fontSize: "14px",
              fontWeight: "600",
              border: "none",
              borderRadius: "6px",
              backgroundColor: "#4CAF50",
              color: "white",
              cursor: "pointer",
              textAlign: "center",
              textDecoration: "none",
              display: "block",
              transition: "all 0.2s"
            }}
          >
            📧 Email to Customer
          </a>
        </div>

        {/* Close Button */}
        <button
          onClick={onClose}
          style={{
            width: "100%",
            padding: "10px",
            fontSize: "14px",
            border: "1px solid #ddd",
            borderRadius: "6px",
            backgroundColor: "white",
            color: "#666",
            cursor: "pointer",
            transition: "all 0.2s"
          }}
        >
          Close
        </button>

        {/* Customer Info */}
        <p style={{
          marginTop: "16px",
          fontSize: "12px",
          color: "#999",
          textAlign: "center"
        }}>
          Customer: {customer.name} ({customer.email})
        </p>
      </div>
    </div>
  )
}

// Modal Manager
class PaymentLinkModalManager {
  private container: HTMLDivElement | null = null
  private root: any = null

  show(paymentUrl: string, feeBreakdown: any, customer: any) {
    if (!this.container) {
      this.container = document.createElement("div")
      this.container.id = "kathy-smartmoving-modal-root"
      document.body.appendChild(this.container)
      this.root = createRoot(this.container)
    }

    this.root.render(
      <PaymentLinkModal
        paymentUrl={paymentUrl}
        feeBreakdown={feeBreakdown}
        customer={customer}
        onClose={() => this.hide()}
      />
    )
  }

  hide() {
    if (this.root) {
      this.root.render(null)
    }
  }
}

const modalManager = new PaymentLinkModalManager()

// Create "Generate Kathy Payment Link" button
function createKathyButton(): HTMLButtonElement {
  const button = document.createElement("button")
  button.className = "kathy-smartmoving-button"
  button.setAttribute("data-kathy-injected", "true")

  // Button styling
  button.style.cssText = `
    display: inline-flex;
    align-items: center;
    gap: 8px;
    padding: 10px 16px;
    margin-left: 12px;
    font-size: 14px;
    font-weight: 600;
    color: white;
    background: linear-gradient(135deg, #4CAF50 0%, #45a049 100%);
    border: none;
    border-radius: 6px;
    cursor: pointer;
    box-shadow: 0 2px 4px rgba(0,0,0,0.1);
    transition: all 0.2s;
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
  `

  button.innerHTML = `
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
      <path d="M12 2v20M2 12h20"/>
    </svg>
    <span>Generate Kathy Payment Link</span>
  `

  // Hover effect
  button.addEventListener("mouseenter", () => {
    button.style.transform = "translateY(-1px)"
    button.style.boxShadow = "0 4px 8px rgba(0,0,0,0.15)"
  })

  button.addEventListener("mouseleave", () => {
    button.style.transform = "translateY(0)"
    button.style.boxShadow = "0 2px 4px rgba(0,0,0,0.1)"
  })

  // Click handler
  button.addEventListener("click", async (e) => {
    e.preventDefault()
    e.stopPropagation()

    // Show loading state
    button.disabled = true
    button.innerHTML = `
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="animation: spin 1s linear infinite">
        <circle cx="12" cy="12" r="10"/>
      </svg>
      <span>Generating...</span>
    `

    try {
      // Get opportunity ID from URL
      const opportunityId = extractOpportunityId()
      if (!opportunityId) {
        throw new Error('Could not extract opportunity ID from URL')
      }

      // Get organization ID
      const organizationId = await getAuthenticatedOrganization()
      if (!organizationId) {
        throw new Error('Please log in to Kathy first')
      }

      kathyLog('Generating payment link', { opportunityId, organizationId })

      // Call API to generate payment link
      const response = await authenticatedFetch(
        `${KATHY_CLOUD_URL}/api/payment-sessions/from-smartmoving`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            opportunityId,
            organizationId
          })
        }
      )

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to generate payment link')
      }

      const data = await response.json()

      kathyLog('Payment link generated', data)

      // Show modal with payment link
      modalManager.show(data.paymentUrl, data.feeBreakdown, data.customer)

      // Reset button
      button.disabled = false
      button.innerHTML = `
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M12 2v20M2 12h20"/>
        </svg>
        <span>Generate Kathy Payment Link</span>
      `

    } catch (error) {
      kathyLog('Error generating payment link', error)

      // Show error
      alert(error instanceof Error ? error.message : 'Failed to generate payment link. Please try again.')

      // Reset button
      button.disabled = false
      button.innerHTML = `
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M12 2v20M2 12h20"/>
        </svg>
        <span>Generate Kathy Payment Link</span>
      `
    }
  })

  // Add spinning animation
  const style = document.createElement('style')
  style.textContent = `
    @keyframes spin {
      from { transform: rotate(0deg); }
      to { transform: rotate(360deg); }
    }
  `
  document.head.appendChild(style)

  return button
}

// Inject button into SmartMoving UI
function injectButton() {
  // Only inject on estimate pages
  if (!isEstimatePage()) {
    kathyLog('Not on estimate page, skipping injection')
    return
  }

  // Check if already injected
  if (document.querySelector('[data-kathy-injected="true"]')) {
    kathyLog('Button already injected, skipping')
    return
  }

  // Find a good location to inject the button
  // SmartMoving has various page layouts, try multiple strategies

  // Strategy 1: Look for action buttons near the top of the page
  const actionBar = document.querySelector('[class*="action"]') ||
                    document.querySelector('[class*="button"]') ||
                    document.querySelector('header') ||
                    document.querySelector('[role="banner"]')

  if (actionBar) {
    const button = createKathyButton()
    actionBar.appendChild(button)
    kathyLog('Button injected into action bar')
    return
  }

  // Strategy 2: Create a floating button if we can't find a good spot
  const floatingContainer = document.createElement('div')
  floatingContainer.style.cssText = `
    position: fixed;
    top: 80px;
    right: 20px;
    z-index: 9999;
  `
  floatingContainer.appendChild(createKathyButton())
  document.body.appendChild(floatingContainer)
  kathyLog('Button injected as floating element')
}

// Setup observers for SPA navigation
function setupObservers() {
  // Debounce helper
  let debounceTimer: NodeJS.Timeout

  const debouncedInject = () => {
    clearTimeout(debounceTimer)
    debounceTimer = setTimeout(() => {
      injectButton()
    }, 500)
  }

  // MutationObserver for DOM changes
  const observer = new MutationObserver(() => {
    debouncedInject()
  })

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
      kathyLog("URL changed, re-injecting button")
      setTimeout(() => injectButton(), 500)
    }
  }, 1000)

  kathyLog("URL change detection setup complete")
}

// Initialize
async function init() {
  kathyLog("SmartMoving extension loaded")

  // Initial injection
  setTimeout(() => {
    injectButton()
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
