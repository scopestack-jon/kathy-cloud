import React, { useState, useEffect, useCallback } from 'react'
import { ActionRecorder } from '../lib/action-recorder'
import type { RecordedAction } from '../lib/types/actions'

interface ActionConfiguratorProps {
  isOpen: boolean
  applicationName: string
  onSave: (actions: RecordedAction[]) => void
  onCancel: () => void
  maxActions?: number
}

export const ActionConfigurator: React.FC<ActionConfiguratorProps> = ({
  isOpen,
  applicationName,
  onSave,
  onCancel,
  maxActions = 3
}) => {
  const [recorder] = useState(() => new ActionRecorder({ maxActions }))
  const [recordedActions, setRecordedActions] = useState<RecordedAction[]>([])
  const [isRecording, setIsRecording] = useState(false)
  const [highlightedElement, setHighlightedElement] = useState<HTMLElement | null>(null)

  const handleMouseOver = useCallback((e: MouseEvent) => {
    if (!isRecording) return
    const target = e.target as HTMLElement
    if (target.closest('[data-kathy-configurator]')) return
    
    if (highlightedElement) {
      highlightedElement.style.outline = ''
    }
    target.style.outline = '2px solid #4CAF50'
    setHighlightedElement(target)
  }, [isRecording, highlightedElement])

  const handleMouseOut = useCallback((e: MouseEvent) => {
    const target = e.target as HTMLElement
    target.style.outline = ''
  }, [])

  useEffect(() => {
    if (isRecording) {
      document.addEventListener('mouseover', handleMouseOver, true)
      document.addEventListener('mouseout', handleMouseOut, true)
    } else {
      document.removeEventListener('mouseover', handleMouseOver, true)
      document.removeEventListener('mouseout', handleMouseOut, true)
      if (highlightedElement) {
        highlightedElement.style.outline = ''
      }
    }

    return () => {
      document.removeEventListener('mouseover', handleMouseOver, true)
      document.removeEventListener('mouseout', handleMouseOut, true)
    }
  }, [isRecording, handleMouseOver, handleMouseOut, highlightedElement])

  const startRecording = () => {
    setRecordedActions([])
    recorder.start()
    setIsRecording(true)
  }

  const stopRecording = () => {
    const actions = recorder.stop()
    setRecordedActions(actions)
    setIsRecording(false)
  }

  const handleSave = () => {
    onSave(recordedActions)
  }

  useEffect(() => {
    if (!isOpen) {
      recorder.stop()
      setIsRecording(false)
      setRecordedActions([])
    }
  }, [isOpen, recorder])

  if (!isOpen) return null

  return (
    <div
      data-kathy-configurator="true"
      style={{
        position: 'fixed',
        top: '20px',
        right: '20px',
        backgroundColor: 'white',
        borderRadius: '12px',
        boxShadow: '0 8px 32px rgba(0, 0, 0, 0.2)',
        padding: '20px',
        width: '340px',
        zIndex: 999999,
        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
      }}
    >
      <div style={{ marginBottom: '16px' }}>
        <h3 style={{ margin: '0 0 4px 0', fontSize: '16px', fontWeight: '600', color: '#333' }}>
          Configure Status Update
        </h3>
        <p style={{ margin: 0, fontSize: '13px', color: '#666' }}>
          {applicationName}
        </p>
      </div>

      {!isRecording && recordedActions.length === 0 && (
        <div style={{ marginBottom: '16px' }}>
          <p style={{ fontSize: '13px', color: '#666', marginBottom: '12px' }}>
            Click the button below, then perform the steps to mark an invoice as paid.
            We'll record up to {maxActions} actions.
          </p>
          <button
            onClick={startRecording}
            style={{
              width: '100%',
              padding: '12px',
              backgroundColor: '#4CAF50',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              fontSize: '14px',
              fontWeight: '600',
              cursor: 'pointer'
            }}
          >
            🔴 Start Recording
          </button>
        </div>
      )}

      {isRecording && (
        <div style={{ marginBottom: '16px' }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            marginBottom: '12px',
            padding: '8px 12px',
            backgroundColor: '#FFF3E0',
            borderRadius: '6px'
          }}>
            <span style={{ animation: 'blink 1s infinite', color: '#FF5722', fontSize: '12px' }}>●</span>
            <span style={{ fontSize: '13px', color: '#E65100' }}>
              Recording... ({recorder.getActions().length}/{maxActions} actions)
            </span>
          </div>
          <p style={{ fontSize: '12px', color: '#666', marginBottom: '12px' }}>
            Click on elements to record. Elements will highlight in green when hovered.
          </p>
          <button
            onClick={stopRecording}
            style={{
              width: '100%',
              padding: '10px',
              backgroundColor: '#FF5722',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              fontSize: '14px',
              fontWeight: '600',
              cursor: 'pointer'
            }}
          >
            ⏹ Stop Recording
          </button>
        </div>
      )}

      {recordedActions.length > 0 && !isRecording && (
        <div style={{ marginBottom: '16px' }}>
          <h4 style={{ margin: '0 0 8px 0', fontSize: '14px', fontWeight: '600', color: '#333' }}>
            Recorded Actions ({recordedActions.length})
          </h4>
          <div style={{ maxHeight: '150px', overflowY: 'auto' }}>
            {recordedActions.map((action, index) => (
              <div
                key={action.id}
                style={{
                  padding: '8px',
                  backgroundColor: '#f5f5f5',
                  borderRadius: '4px',
                  marginBottom: '4px',
                  fontSize: '12px'
                }}
              >
                <strong>Step {index + 1}:</strong> {action.type}
                {action.value && <span> → "{action.value}"</span>}
              </div>
            ))}
          </div>
        </div>
      )}

      <div style={{ display: 'flex', gap: '8px' }}>
        <button
          onClick={onCancel}
          style={{
            flex: 1,
            padding: '10px',
            backgroundColor: 'white',
            color: '#666',
            border: '1px solid #ddd',
            borderRadius: '6px',
            fontSize: '14px',
            cursor: 'pointer'
          }}
        >
          Cancel
        </button>
        {recordedActions.length > 0 && !isRecording && (
          <button
            onClick={handleSave}
            style={{
              flex: 1,
              padding: '10px',
              backgroundColor: '#4CAF50',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              fontSize: '14px',
              fontWeight: '600',
              cursor: 'pointer'
            }}
          >
            Save Actions
          </button>
        )}
      </div>

      <style>{`
        @keyframes blink {
          0%, 100% { opacity: 1; }
          50% { opacity: 0; }
        }
      `}</style>
    </div>
  )
}
