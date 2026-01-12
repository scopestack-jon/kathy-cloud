import React from 'react'

export interface ConsentModalProps {
  invoiceId: string
  amount: number
  appName?: string
  isVisible: boolean
  onConfirm: () => void
  onCancel: () => void
}

export const ConsentModal: React.FC<ConsentModalProps> = ({
  invoiceId,
  amount,
  appName = 'the application',
  isVisible,
  onConfirm,
  onCancel
}) => {
  if (!isVisible) return null

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
        maxWidth: "420px",
        width: "90%"
      }}>
        <h3 style={{
          margin: "0 0 16px 0",
          fontSize: "18px",
          fontWeight: "600",
          color: "#333"
        }}>
          Confirm Payment & Update Status
        </h3>
        <p style={{
          margin: "0 0 12px 0",
          fontSize: "14px",
          color: "#666"
        }}>
          Mark invoice <strong>#{invoiceId}</strong> as paid for <strong>${amount.toFixed(2)}</strong>?
        </p>
        <p style={{
          margin: "0 0 20px 0",
          fontSize: "13px",
          color: "#888",
          backgroundColor: "#f5f5f5",
          padding: "8px 12px",
          borderRadius: "4px"
        }}>
          This will also update the invoice status in <strong>{appName}</strong>.
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
              cursor: "pointer",
              fontWeight: "600"
            }}
          >
            Confirm & Update
          </button>
        </div>
      </div>
    </div>
  )
}
