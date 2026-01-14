import React, { useState, useEffect } from "react"
import { authenticatedFetch } from "../lib/auth-refresh"

// Panel types
export type PanelTab = "overview" | "payments" | "notes"

export interface PanelEntity {
  type: "invoice" | "contact" | "company"
  id: string
  displayName: string
  data: any
}

export interface CheckoutState {
  paymentUrl: string
  paymentSessionId: string
  invoiceId: string
  amount: number
}

export interface KathyPanelProps {
  isOpen: boolean
  entity: PanelEntity | null
  onClose: () => void
}

// API Configuration
const KATHY_CLOUD_URL = process.env.PLASMO_PUBLIC_API_URL || 'http://localhost:3000'
const API_SECRET_KEY = process.env.PLASMO_PUBLIC_API_SECRET || 'dev-secret-key-change-in-production'

// Tab content components
const OverviewTab: React.FC<{ entity: PanelEntity }> = ({ entity }) => {
  const [enrichedData, setEnrichedData] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [refreshTrigger, setRefreshTrigger] = useState(0)
  
  useEffect(() => {
    const fetchEnrichedData = async () => {
      setLoading(true)
      try {
        const response = await authenticatedFetch(
          `${KATHY_CLOUD_URL}/api/entities/${entity.type}/${entity.id}`
        )
        
        if (response.ok) {
          const data = await response.json()
          setEnrichedData(data.data)
          console.log('Kathy Panel: Fetched enriched data', data.data)
        }
      } catch (error) {
        console.error("Error fetching enriched data", error)
      } finally {
        setLoading(false)
      }
    }
    
    fetchEnrichedData()
  }, [entity, refreshTrigger])
  
  // Listen for manual refresh requests
  useEffect(() => {
    const handleRefresh = () => {
      console.log('Kathy Panel: Refreshing data...')
      setRefreshTrigger(prev => prev + 1)
    }
    
    document.addEventListener('kathy:panel:refresh', handleRefresh)
    return () => document.removeEventListener('kathy:panel:refresh', handleRefresh)
  }, [])
  
  if (entity.type === "invoice") {
    const { invoiceId, amount, status, lastUpdated } = entity.data
    const summary = enrichedData?.summary
    
    // Debug logging
    console.log('Kathy Panel: Rendering OverviewTab', {
      invoiceId,
      hasEnrichedData: !!enrichedData,
      summary,
      entityStatus: status,
      shouldShowPaid: summary?.latestStatus === 'confirmed' || 
                      summary?.latestStatus === 'paid_and_confirmed' || 
                      status === 'confirmed' ||
                      status === 'paid_and_confirmed'
    })
    
    // Show loading only if we're still fetching AND don't have basic data
    if (loading && !invoiceId) {
      return (
        <div style={{ padding: "16px", textAlign: "center" }}>
          <div style={{ fontSize: "14px", color: "#666" }}>Loading...</div>
        </div>
      )
    }
    
    return (
      <div style={{ padding: "16px" }}>
        {entity.data.organizationName && (
          <div style={{ marginBottom: "16px" }}>
            <div style={{ fontSize: "12px", color: "#666", marginBottom: "4px" }}>Organization</div>
            <div style={{ fontSize: "14px", fontWeight: "600", color: "#333" }}>{entity.data.organizationName}</div>
          </div>
        )}
        <div style={{ marginBottom: "16px" }}>
          <div style={{ fontSize: "12px", color: "#666", marginBottom: "4px" }}>Invoice ID</div>
          <div style={{ fontSize: "16px", fontWeight: "600" }}>{invoiceId}</div>
        </div>
        <div style={{ marginBottom: "16px" }}>
          <div style={{ fontSize: "12px", color: "#666", marginBottom: "4px" }}>Amount</div>
          <div style={{ fontSize: "20px", fontWeight: "700", color: "#4CAF50" }}>
            {amount.toLocaleString('en-US', { style: 'currency', currency: 'USD' })}
          </div>
        </div>
        {summary && (
          <>
            <div style={{ marginBottom: "16px" }}>
              <div style={{ fontSize: "12px", color: "#666", marginBottom: "4px" }}>Status</div>
              <div style={{ 
                display: "inline-block",
                padding: "4px 12px",
                borderRadius: "12px",
                fontSize: "12px",
                fontWeight: "500",
                backgroundColor: (summary.latestStatus === "confirmed" || summary.latestStatus === "paid_and_confirmed") ? "#E8F5E9" : "#FFF3E0",
                color: (summary.latestStatus === "confirmed" || summary.latestStatus === "paid_and_confirmed") ? "#2E7D32" : "#E65100"
              }}>
                {summary.latestStatus}
              </div>
            </div>
            <div style={{ marginBottom: "16px" }}>
              <div style={{ fontSize: "12px", color: "#666", marginBottom: "4px" }}>Total Paid</div>
              <div style={{ fontSize: "16px", fontWeight: "600" }}>
                {summary.totalPaid.toLocaleString('en-US', { style: 'currency', currency: 'USD' })}
              </div>
            </div>
            <div style={{ marginBottom: "16px" }}>
              <div style={{ fontSize: "12px", color: "#666", marginBottom: "4px" }}>Payment Sessions</div>
              <div style={{ fontSize: "16px", fontWeight: "600" }}>
                {summary.totalSessions}
              </div>
            </div>
          </>
        )}
        {lastUpdated && (
          <div style={{ marginBottom: "16px" }}>
            <div style={{ fontSize: "12px", color: "#666", marginBottom: "4px" }}>Last Updated</div>
            <div style={{ fontSize: "14px" }}>{new Date(lastUpdated).toLocaleString()}</div>
          </div>
        )}
        
        {/* Quick Actions */}
        <div style={{ marginTop: "24px", paddingTop: "16px", borderTop: "1px solid #eee" }}>
          <div style={{ fontSize: "12px", fontWeight: "600", color: "#666", marginBottom: "12px" }}>
            Quick Actions
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
            {(summary?.latestStatus === 'confirmed' || 
              summary?.latestStatus === 'paid_and_confirmed' || 
              entity.data.status === 'confirmed' ||
              entity.data.status === 'paid_and_confirmed') ? (
              <div style={{
                padding: "12px 16px",
                fontSize: "14px",
                fontWeight: "600",
                color: "#2E7D32",
                backgroundColor: "#E8F5E9",
                border: "2px solid #4CAF50",
                borderRadius: "6px",
                textAlign: "left"
              }}>
                ✓ Payment Confirmed
              </div>
            ) : (
              <button
                onClick={() => {
                  // Trigger payment flow
                  const event = new CustomEvent('kathy:start-payment', {
                    detail: { 
                      invoiceId: entity.id,
                      amount: entity.data.amount
                    }
                  })
                  document.dispatchEvent(event)
                }}
                style={{
                  padding: "12px 16px",
                  fontSize: "14px",
                  fontWeight: "600",
                  color: "white",
                  backgroundColor: "#4CAF50",
                  border: "none",
                  borderRadius: "6px",
                  cursor: "pointer",
                  textAlign: "left",
                  transition: "all 0.2s",
                  boxShadow: "0 2px 4px rgba(76, 175, 80, 0.3)"
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = "#45a049"
                  e.currentTarget.style.boxShadow = "0 4px 8px rgba(76, 175, 80, 0.4)"
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = "#4CAF50"
                  e.currentTarget.style.boxShadow = "0 2px 4px rgba(76, 175, 80, 0.3)"
                }}
              >
                💳 Collect Payment
              </button>
            )}
            <button
              onClick={async () => {
                // Refresh data without page reload
                try {
                  const response = await authenticatedFetch(
                    `${KATHY_CLOUD_URL}/api/entities/${entity.type}/${entity.id}`
                  )
                  
                  if (response.ok) {
                    const data = await response.json()
                    // Trigger a re-render by dispatching an update event
                    const event = new CustomEvent('kathy:panel:update', {
                      detail: {
                        entity: {
                          ...entity,
                          data: {
                            ...entity.data,
                            ...data.data
                          }
                        }
                      }
                    })
                    document.dispatchEvent(event)
                    alert('Invoice data refreshed!')
                  }
                } catch (error) {
                  console.error('Error refreshing data', error)
                  alert('Failed to refresh data')
                }
              }}
              style={{
                padding: "10px 16px",
                fontSize: "13px",
                fontWeight: "500",
                color: "#4CAF50",
                backgroundColor: "white",
                border: "1px solid #4CAF50",
                borderRadius: "6px",
                cursor: "pointer",
                textAlign: "left",
                transition: "all 0.2s"
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = "#f1f8f4"
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = "white"
              }}
            >
              🔄 Refresh Invoice Data
            </button>
            <button
              onClick={async () => {
                // Trigger action via API
                try {
                  await authenticatedFetch(`${KATHY_CLOUD_URL}/api/actions`, {
                    method: 'POST',
                    headers: {
                      'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                      action: 'mark_as_reviewed',
                      entityType: entity.type,
                      entityId: entity.id
                    })
                  })
                  alert('Marked as reviewed!')
                } catch (error) {
                  console.error('Error marking as reviewed', error)
                }
              }}
              style={{
                padding: "10px 16px",
                fontSize: "13px",
                fontWeight: "500",
                color: "#666",
                backgroundColor: "white",
                border: "1px solid #ddd",
                borderRadius: "6px",
                cursor: "pointer",
                textAlign: "left",
                transition: "all 0.2s"
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = "#f9f9f9"
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = "white"
              }}
            >
              ✓ Mark as Reviewed
            </button>
          </div>
        </div>
      </div>
    )
  }
  
  return <div style={{ padding: "16px", color: "#666" }}>No data available</div>
}

const PaymentsTab: React.FC<{ entity: PanelEntity }> = ({ entity }) => {
  const [payments, setPayments] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshTrigger, setRefreshTrigger] = useState(0)
  
  useEffect(() => {
    // Fetch payment history
    const fetchPayments = async () => {
      setLoading(true)
      try {
        const response = await authenticatedFetch(
          `${KATHY_CLOUD_URL}/api/entities/${entity.type}/${entity.id}`
        )
        
        if (response.ok) {
          const data = await response.json()
          setPayments(data.data.paymentSessions || [])
          console.log('Kathy Panel: Fetched payment history', data.data.paymentSessions)
        }
      } catch (error) {
        console.error("Error fetching payments", error)
      } finally {
        setLoading(false)
      }
    }
    
    fetchPayments()
  }, [entity, refreshTrigger])
  
  // Listen for manual refresh requests
  useEffect(() => {
    const handleRefresh = () => {
      console.log('Kathy Panel: Refreshing payments tab...')
      setRefreshTrigger(prev => prev + 1)
    }
    
    document.addEventListener('kathy:panel:refresh', handleRefresh)
    return () => document.removeEventListener('kathy:panel:refresh', handleRefresh)
  }, [])
  
  if (loading) {
    return (
      <div style={{ padding: "16px", textAlign: "center" }}>
        <div style={{ fontSize: "14px", color: "#666" }}>Loading payments...</div>
      </div>
    )
  }
  
  const getStatusColor = (status: string) => {
    switch (status) {
      case "confirmed": return { bg: "#E8F5E9", color: "#2E7D32" }
      case "paid_pending_consent": return { bg: "#FFF3E0", color: "#E65100" }
      case "failed": return { bg: "#FFEBEE", color: "#C62828" }
      default: return { bg: "#F5F5F5", color: "#666" }
    }
  }
  
  return (
    <div style={{ padding: "16px" }}>
      <div style={{ fontSize: "14px", fontWeight: "600", marginBottom: "12px" }}>Payment History</div>
      {payments.length === 0 ? (
        <div style={{ fontSize: "14px", color: "#666", textAlign: "center", padding: "20px" }}>
          No payment history yet
        </div>
      ) : (
        <div>
          {payments.map((payment, idx) => {
            const statusStyle = getStatusColor(payment.status)
            return (
              <div key={idx} style={{
                padding: "12px",
                borderBottom: idx < payments.length - 1 ? "1px solid #eee" : "none",
                fontSize: "13px",
                marginBottom: "8px"
              }}>
                <div style={{ 
                  display: "flex", 
                  justifyContent: "space-between",
                  alignItems: "center",
                  marginBottom: "6px"
                }}>
                  <div style={{ fontWeight: "600", fontSize: "15px" }}>
                    {payment.amount.toLocaleString('en-US', { style: 'currency', currency: 'USD' })}
                  </div>
                  <div style={{
                    padding: "3px 8px",
                    borderRadius: "8px",
                    fontSize: "11px",
                    fontWeight: "500",
                    backgroundColor: statusStyle.bg,
                    color: statusStyle.color
                  }}>
                    {payment.status}
                  </div>
                </div>
                <div style={{ color: "#666", fontSize: "12px", marginBottom: "4px" }}>
                  {new Date(payment.createdAt).toLocaleString()}
                </div>
                {payment.processorPaymentId && (
                  <div style={{ color: "#999", fontSize: "11px" }}>
                    ID: {payment.processorPaymentId.substring(0, 20)}...
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

const NotesTab: React.FC<{ entity: PanelEntity }> = ({ entity }) => {
  return (
    <div style={{ padding: "16px" }}>
      <div style={{ fontSize: "14px", fontWeight: "600", marginBottom: "12px" }}>Notes</div>
      <div style={{ fontSize: "14px", color: "#666", textAlign: "center", padding: "20px" }}>
        Notes feature coming soon
      </div>
    </div>
  )
}

// Checkout Tab Component
const CheckoutTab: React.FC<{ 
  checkout: CheckoutState, 
  onClose: () => void 
}> = ({ checkout, onClose }) => {
  const [iframeLoading, setIframeLoading] = useState(true)
  const [embedBlocked, setEmbedBlocked] = useState(false)
  const [loadTimeout, setLoadTimeout] = useState(false)
  
  useEffect(() => {
    // Start a timer to detect if iframe fails to load
    const timer = setTimeout(() => {
      if (iframeLoading) {
        console.log('Kathy Checkout: Iframe load timeout - may be blocked')
        setLoadTimeout(true)
      }
    }, 3000) // 3 second timeout
    
    return () => clearTimeout(timer)
  }, [iframeLoading])
  
  const handleIframeLoad = () => {
    console.log('Kathy Checkout: Iframe loaded successfully')
    setIframeLoading(false)
    setEmbedBlocked(false)
  }
  
  const handleIframeError = () => {
    console.log('Kathy Checkout: Iframe failed to load')
    setIframeLoading(false)
    setEmbedBlocked(true)
  }
  
  const openInPopup = () => {
    console.log('Kathy Checkout: Opening in popup window')
    chrome.runtime.sendMessage({
      type: 'openPaymentPopup',
      url: checkout.paymentUrl
    })
  }
  
  const openInNewTab = () => {
    console.log('Kathy Checkout: Opening in new tab')
    window.open(checkout.paymentUrl, '_blank')
  }
  
  return (
    <div style={{ 
      height: "100%", 
      display: "flex", 
      flexDirection: "column",
      backgroundColor: "#f5f5f5"
    }}>
      {/* Checkout Header */}
      <div style={{ 
        padding: "16px 20px", 
        backgroundColor: "white",
        borderBottom: "1px solid #e0e0e0"
      }}>
        <div style={{ fontSize: "16px", fontWeight: "600", color: "#333", marginBottom: "4px" }}>
          Complete Payment
        </div>
        <div style={{ fontSize: "13px", color: "#666" }}>
          Invoice #{checkout.invoiceId} • {checkout.amount.toLocaleString('en-US', { style: 'currency', currency: 'USD' })}
        </div>
      </div>
      
      {/* Iframe Container */}
      <div style={{ 
        flex: 1, 
        position: "relative", 
        backgroundColor: "white",
        overflow: "hidden"
      }}>
        {/* Loading Spinner */}
        {iframeLoading && (
          <div style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            backgroundColor: "white",
            zIndex: 10
          }}>
            <div style={{
              width: "40px",
              height: "40px",
              border: "4px solid #f3f3f3",
              borderTop: "4px solid #4CAF50",
              borderRadius: "50%",
              animation: "spin 1s linear infinite"
            }} />
            <div style={{ marginTop: "16px", fontSize: "14px", color: "#666" }}>
              Loading secure checkout...
            </div>
          </div>
        )}
        
        {/* Embed Blocked Warning */}
        {(embedBlocked || loadTimeout) && (
          <div style={{
            position: "absolute",
            top: "20px",
            left: "20px",
            right: "20px",
            padding: "12px 16px",
            backgroundColor: "#FFF3E0",
            border: "1px solid #FFB74D",
            borderRadius: "6px",
            fontSize: "13px",
            color: "#E65100",
            zIndex: 20
          }}>
            <strong>Embedded checkout may be blocked.</strong><br />
            Use the buttons below to complete payment.
          </div>
        )}
        
        {/* Payment Iframe */}
        <iframe
          src={checkout.paymentUrl}
          onLoad={handleIframeLoad}
          onError={handleIframeError}
          style={{
            width: "100%",
            height: "100%",
            border: "none",
            display: "block"
          }}
          title="Payment Checkout"
          sandbox="allow-same-origin allow-scripts allow-forms allow-popups allow-top-navigation"
        />
      </div>
      
      {/* Fallback Actions */}
      <div style={{ 
        padding: "16px 20px", 
        backgroundColor: "white",
        borderTop: "1px solid #e0e0e0",
        display: "flex",
        flexDirection: "column",
        gap: "8px"
      }}>
        <div style={{ fontSize: "12px", color: "#666", marginBottom: "4px" }}>
          Payment not loading?
        </div>
        <button
          onClick={openInPopup}
          style={{
            padding: "10px 16px",
            fontSize: "14px",
            fontWeight: "500",
            color: "white",
            backgroundColor: "#4CAF50",
            border: "none",
            borderRadius: "6px",
            cursor: "pointer",
            textAlign: "center"
          }}
        >
          Open in Popup Window
        </button>
        <button
          onClick={openInNewTab}
          style={{
            padding: "10px 16px",
            fontSize: "14px",
            fontWeight: "500",
            color: "#4CAF50",
            backgroundColor: "white",
            border: "1px solid #4CAF50",
            borderRadius: "6px",
            cursor: "pointer",
            textAlign: "center"
          }}
        >
          Open in New Tab
        </button>
        <button
          onClick={onClose}
          style={{
            padding: "8px 16px",
            fontSize: "13px",
            fontWeight: "400",
            color: "#666",
            backgroundColor: "transparent",
            border: "none",
            cursor: "pointer",
            textAlign: "center"
          }}
        >
          Cancel
        </button>
      </div>
      
      {/* Spinner Animation */}
      <style>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  )
}


// Main Panel Component
export const KathyPanel: React.FC<KathyPanelProps> = ({ isOpen, entity, onClose }) => {
  const [activeTab, setActiveTab] = useState<PanelTab>("overview")
  const [checkout, setCheckout] = useState<CheckoutState | null>(null)
  
  useEffect(() => {
    // Reset to overview tab when entity changes
    setActiveTab("overview")
    // Clear checkout when entity changes
    setCheckout(null)
  }, [entity])
  
  // Listen for checkout:open event
  useEffect(() => {
    const handleCheckoutOpen = (event: any) => {
      const { paymentUrl, paymentSessionId, invoiceId, amount } = event.detail
      console.log('Kathy Panel: Opening checkout', { paymentSessionId, invoiceId, amount })
      setCheckout({
        paymentUrl,
        paymentSessionId,
        invoiceId,
        amount
      })
    }
    
    document.addEventListener('kathy:checkout:open', handleCheckoutOpen)
    return () => document.removeEventListener('kathy:checkout:open', handleCheckoutOpen)
  }, [])
  
  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) {
        if (checkout) {
          // Close checkout view
          setCheckout(null)
        } else {
          // Close panel
          onClose()
        }
      }
    }
    
    document.addEventListener("keydown", handleKeyDown)
    return () => document.removeEventListener("keydown", handleKeyDown)
  }, [isOpen, onClose, checkout])
  
  const handleCloseCheckout = () => {
    console.log('Kathy Panel: Closing checkout')
    setCheckout(null)
  }
  
  if (!isOpen || !entity) return null
  
  const tabs: { id: PanelTab; label: string }[] = [
    { id: "overview", label: "Overview" },
    { id: "payments", label: "Payments" },
    { id: "notes", label: "Notes" }
  ]
  
  return (
    <>
      {/* Backdrop */}
      <div
        onClick={onClose}
        style={{
          position: "fixed",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: "rgba(0, 0, 0, 0.3)",
          zIndex: 999998,
          animation: "kathy-fade-in 0.2s ease-out"
        }}
      />
      
      {/* Panel */}
      <div
        style={{
          position: "fixed",
          top: 0,
          right: 0,
          bottom: 0,
          width: "400px",
          maxWidth: "90vw",
          backgroundColor: "white",
          boxShadow: "-2px 0 8px rgba(0, 0, 0, 0.15)",
          zIndex: 999999,
          display: "flex",
          flexDirection: "column",
          animation: "kathy-slide-in 0.3s ease-out"
        }}
      >
        {/* Header */}
        <div style={{
          padding: "16px 20px",
          borderBottom: "1px solid #e0e0e0",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between"
        }}>
          <div>
            <div style={{ fontSize: "18px", fontWeight: "600", color: "#333" }}>
              {entity.displayName}
            </div>
            <div style={{ fontSize: "12px", color: "#666", marginTop: "2px" }}>
              {entity.type.charAt(0).toUpperCase() + entity.type.slice(1)}
            </div>
          </div>
          <button
            onClick={onClose}
            style={{
              background: "none",
              border: "none",
              fontSize: "24px",
              color: "#666",
              cursor: "pointer",
              padding: "0",
              width: "32px",
              height: "32px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              borderRadius: "4px"
            }}
            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = "#f5f5f5"}
            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = "transparent"}
          >
            ×
          </button>
        </div>
        
        {/* Tabs - hide when checkout is active */}
        {!checkout && (
          <div style={{
            display: "flex",
            borderBottom: "1px solid #e0e0e0",
            backgroundColor: "#fafafa"
          }}>
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                style={{
                  flex: 1,
                  padding: "12px 8px",
                  border: "none",
                  background: "none",
                  fontSize: "13px",
                  fontWeight: activeTab === tab.id ? "600" : "400",
                  color: activeTab === tab.id ? "#4CAF50" : "#666",
                  cursor: "pointer",
                  borderBottom: activeTab === tab.id ? "2px solid #4CAF50" : "2px solid transparent",
                  transition: "all 0.2s"
                }}
              >
                {tab.label}
              </button>
            ))}
          </div>
        )}
        
        {/* Content */}
        <div style={{
          flex: 1,
          overflowY: checkout ? "hidden" : "auto",
          backgroundColor: "white",
          display: "flex",
          flexDirection: "column"
        }}>
          {checkout ? (
            <CheckoutTab checkout={checkout} onClose={handleCloseCheckout} />
          ) : (
            <>
              {activeTab === "overview" && <OverviewTab entity={entity} />}
              {activeTab === "payments" && <PaymentsTab entity={entity} />}
              {activeTab === "notes" && <NotesTab entity={entity} />}
            </>
          )}
        </div>
        
        {/* Footer */}
        <div style={{
          padding: "12px 20px",
          borderTop: "1px solid #e0e0e0",
          fontSize: "11px",
          color: "#999",
          textAlign: "center"
        }}>
          Powered by Kathy
        </div>
      </div>
      
      {/* Animations */}
      <style>{`
        @keyframes kathy-fade-in {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        
        @keyframes kathy-slide-in {
          from {
            transform: translateX(100%);
            opacity: 0;
          }
          to {
            transform: translateX(0);
            opacity: 1;
          }
        }
      `}</style>
    </>
  )
}

