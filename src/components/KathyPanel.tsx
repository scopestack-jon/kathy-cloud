import React, { useState, useEffect } from "react"

// Panel types
export type PanelTab = "overview" | "payments" | "notes"

export interface PanelEntity {
  type: "invoice" | "contact" | "company"
  id: string
  displayName: string
  data: any
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
  
  useEffect(() => {
    const fetchEnrichedData = async () => {
      try {
        const response = await fetch(
          `${KATHY_CLOUD_URL}/api/entities/${entity.type}/${entity.id}`,
          {
            headers: {
              'Authorization': `Bearer ${API_SECRET_KEY}`
            }
          }
        )
        
        if (response.ok) {
          const data = await response.json()
          setEnrichedData(data.data)
        }
      } catch (error) {
        console.error("Error fetching enriched data", error)
      } finally {
        setLoading(false)
      }
    }
    
    fetchEnrichedData()
  }, [entity])
  
  if (entity.type === "invoice") {
    const { invoiceId, amount, status, lastUpdated } = entity.data
    const summary = enrichedData?.summary
    
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
            {(summary?.latestStatus === 'confirmed' || summary?.latestStatus === 'paid_and_confirmed') ? (
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
                  const response = await fetch(
                    `${KATHY_CLOUD_URL}/api/entities/${entity.type}/${entity.id}`,
                    {
                      headers: {
                        'Authorization': `Bearer ${API_SECRET_KEY}`
                      }
                    }
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
                  await fetch(`${KATHY_CLOUD_URL}/api/actions`, {
                    method: 'POST',
                    headers: {
                      'Content-Type': 'application/json',
                      'Authorization': `Bearer ${API_SECRET_KEY}`
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
  
  useEffect(() => {
    // Fetch payment history
    const fetchPayments = async () => {
      try {
        const response = await fetch(
          `${KATHY_CLOUD_URL}/api/entities/${entity.type}/${entity.id}`,
          {
            headers: {
              'Authorization': `Bearer ${API_SECRET_KEY}`
            }
          }
        )
        
        if (response.ok) {
          const data = await response.json()
          setPayments(data.data.paymentSessions || [])
        }
      } catch (error) {
        console.error("Error fetching payments", error)
      } finally {
        setLoading(false)
      }
    }
    
    fetchPayments()
  }, [entity])
  
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


// Main Panel Component
export const KathyPanel: React.FC<KathyPanelProps> = ({ isOpen, entity, onClose }) => {
  const [activeTab, setActiveTab] = useState<PanelTab>("overview")
  
  useEffect(() => {
    // Reset to overview tab when entity changes
    setActiveTab("overview")
  }, [entity])
  
  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) {
        onClose()
      }
    }
    
    document.addEventListener("keydown", handleKeyDown)
    return () => document.removeEventListener("keydown", handleKeyDown)
  }, [isOpen, onClose])
  
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
        
        {/* Tabs */}
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
        
        {/* Content */}
        <div style={{
          flex: 1,
          overflowY: "auto",
          backgroundColor: "white"
        }}>
          {activeTab === "overview" && <OverviewTab entity={entity} />}
          {activeTab === "payments" && <PaymentsTab entity={entity} />}
          {activeTab === "notes" && <NotesTab entity={entity} />}
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

