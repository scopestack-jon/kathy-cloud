import React, { useState, useEffect } from 'react'

export interface FailureToastProps {
  isVisible: boolean
  invoiceId: string
  message?: string
  queued?: boolean
  onRetry?: () => void
  onDismiss?: () => void
  autoDismissMs?: number
}

export const FailureToast: React.FC<FailureToastProps> = ({
  isVisible,
  invoiceId,
  message,
  queued = false,
  onRetry,
  onDismiss,
  autoDismissMs = 10000
}) => {
  const [shouldRender, setShouldRender] = useState(isVisible)
  const [countdown, setCountdown] = useState(autoDismissMs / 1000)

  useEffect(() => {
    if (isVisible) {
      setShouldRender(true)
      setCountdown(autoDismissMs / 1000)
    } else {
      const timer = setTimeout(() => setShouldRender(false), 300)
      return () => clearTimeout(timer)
    }
  }, [isVisible, autoDismissMs])

  useEffect(() => {
    if (!isVisible || !autoDismissMs) return

    const interval = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) {
          onDismiss?.()
          return 0
        }
        return prev - 1
      })
    }, 1000)

    return () => clearInterval(interval)
  }, [isVisible, autoDismissMs, onDismiss])

  if (!shouldRender) return null

  return (
    <div
      onClick={onRetry}
      style={{
        position: 'fixed',
        bottom: '20px',
        right: '20px',
        backgroundColor: 'white',
        borderRadius: '8px',
        boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
        padding: '16px 20px',
        minWidth: '320px',
        maxWidth: '400px',
        zIndex: 999999,
        opacity: isVisible ? 1 : 0,
        transform: isVisible ? 'translateY(0)' : 'translateY(20px)',
        transition: 'opacity 0.3s, transform 0.3s',
        borderLeft: '4px solid #f44336',
        cursor: onRetry ? 'pointer' : 'default'
      }}
    >
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
        <div
          style={{
            width: '32px',
            height: '32px',
            borderRadius: '50%',
            backgroundColor: '#f44336',
            color: 'white',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '16px',
            fontWeight: 'bold',
            flexShrink: 0
          }}
        >
          !
        </div>

        <div style={{ flex: 1 }}>
          <div style={{ fontWeight: '600', fontSize: '14px', color: '#333', marginBottom: '4px' }}>
            Status Update Failed
          </div>
          <div style={{ fontSize: '13px', color: '#666', marginBottom: '8px' }}>
            {message || `Could not update invoice #${invoiceId}.`}
            {onRetry && ' Click to retry.'}
          </div>

          {queued && (
            <div style={{
              fontSize: '12px',
              color: '#4CAF50',
              backgroundColor: '#E8F5E9',
              padding: '4px 8px',
              borderRadius: '4px',
              display: 'inline-block',
              marginBottom: '8px'
            }}>
              ✓ Queued for manual review
            </div>
          )}

          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            {onRetry && (
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  onRetry()
                }}
                style={{
                  padding: '6px 12px',
                  fontSize: '12px',
                  fontWeight: '600',
                  backgroundColor: '#f44336',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer'
                }}
              >
                Retry Now
              </button>
            )}
            <button
              onClick={(e) => {
                e.stopPropagation()
                onDismiss?.()
              }}
              style={{
                padding: '6px 12px',
                fontSize: '12px',
                fontWeight: '500',
                backgroundColor: 'transparent',
                color: '#666',
                border: '1px solid #ddd',
                borderRadius: '4px',
                cursor: 'pointer'
              }}
            >
              Dismiss ({countdown}s)
            </button>
          </div>
        </div>

        <button
          onClick={(e) => {
            e.stopPropagation()
            onDismiss?.()
          }}
          style={{
            background: 'none',
            border: 'none',
            fontSize: '18px',
            color: '#999',
            cursor: 'pointer',
            padding: '0',
            lineHeight: 1
          }}
        >
          ×
        </button>
      </div>
    </div>
  )
}
