import React, { useState, useEffect } from 'react'

export interface StatusUpdateProgressProps {
  isVisible: boolean
  currentStep: number
  totalSteps: number
  status: 'in-progress' | 'success' | 'error' | 'paused'
  message?: string
  onRetry?: () => void
  onDismiss?: () => void
}

export const StatusUpdateProgress: React.FC<StatusUpdateProgressProps> = ({
  isVisible,
  currentStep,
  totalSteps,
  status,
  message,
  onRetry,
  onDismiss
}) => {
  const [shouldRender, setShouldRender] = useState(isVisible)

  useEffect(() => {
    if (isVisible) {
      setShouldRender(true)
    } else {
      const timer = setTimeout(() => setShouldRender(false), 300)
      return () => clearTimeout(timer)
    }
  }, [isVisible])

  if (!shouldRender) return null

  const getStatusColor = () => {
    switch (status) {
      case 'success': return '#4CAF50'
      case 'error': return '#f44336'
      case 'paused': return '#FF9800'
      default: return '#2196F3'
    }
  }

  const getStatusIcon = () => {
    switch (status) {
      case 'success': return '✓'
      case 'error': return '✕'
      case 'paused': return '⏸'
      default: return '⟳'
    }
  }

  const getDefaultMessage = () => {
    switch (status) {
      case 'success': return 'Invoice status updated!'
      case 'error': return 'Failed to update status'
      case 'paused': return 'Session expired. Please log in and retry.'
      default: return `Updating invoice status... (${currentStep}/${totalSteps})`
    }
  }

  return (
    <div
      style={{
        position: 'fixed',
        bottom: '20px',
        right: '20px',
        backgroundColor: 'white',
        borderRadius: '8px',
        boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
        padding: '16px 20px',
        minWidth: '300px',
        maxWidth: '400px',
        zIndex: 999999,
        opacity: isVisible ? 1 : 0,
        transform: isVisible ? 'translateY(0)' : 'translateY(20px)',
        transition: 'opacity 0.3s, transform 0.3s',
        borderLeft: `4px solid ${getStatusColor()}`
      }}
    >
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
        <div
          style={{
            width: '32px',
            height: '32px',
            borderRadius: '50%',
            backgroundColor: getStatusColor(),
            color: 'white',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '16px',
            fontWeight: 'bold',
            flexShrink: 0,
            animation: status === 'in-progress' ? 'spin 1s linear infinite' : 'none'
          }}
        >
          {getStatusIcon()}
        </div>

        <div style={{ flex: 1 }}>
          <div style={{ fontWeight: '600', fontSize: '14px', color: '#333', marginBottom: '4px' }}>
            {status === 'in-progress' ? 'Updating Status' : 
             status === 'success' ? 'Update Complete' :
             status === 'paused' ? 'Action Required' : 'Update Failed'}
          </div>
          <div style={{ fontSize: '13px', color: '#666' }}>
            {message || getDefaultMessage()}
          </div>

          {status === 'in-progress' && (
            <div style={{ marginTop: '8px' }}>
              <div
                style={{
                  height: '4px',
                  backgroundColor: '#e0e0e0',
                  borderRadius: '2px',
                  overflow: 'hidden'
                }}
              >
                <div
                  style={{
                    height: '100%',
                    width: `${(currentStep / totalSteps) * 100}%`,
                    backgroundColor: getStatusColor(),
                    transition: 'width 0.3s'
                  }}
                />
              </div>
            </div>
          )}

          {(status === 'error' || status === 'paused') && (
            <div style={{ marginTop: '12px', display: 'flex', gap: '8px' }}>
              {onRetry && (
                <button
                  onClick={onRetry}
                  style={{
                    padding: '6px 12px',
                    fontSize: '12px',
                    fontWeight: '600',
                    backgroundColor: getStatusColor(),
                    color: 'white',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: 'pointer'
                  }}
                >
                  Retry
                </button>
              )}
              {onDismiss && (
                <button
                  onClick={onDismiss}
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
                  Dismiss
                </button>
              )}
            </div>
          )}

          {status === 'success' && onDismiss && (
            <button
              onClick={onDismiss}
              style={{
                marginTop: '8px',
                padding: '4px 8px',
                fontSize: '11px',
                backgroundColor: 'transparent',
                color: '#666',
                border: 'none',
                cursor: 'pointer',
                textDecoration: 'underline'
              }}
            >
              Dismiss
            </button>
          )}
        </div>

        {status !== 'in-progress' && onDismiss && (
          <button
            onClick={onDismiss}
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
        )}
      </div>

      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  )
}
