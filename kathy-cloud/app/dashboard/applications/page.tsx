'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'

interface Application {
  id: string
  applicationName: string
  applicationUrl: string
  urlPattern: string
  isEnabled: boolean
  selectorConfig: {
    invoiceIdColumn: number
    amountColumn: number
    statusColumn: number
    invoiceIdPattern: string
    amountPattern: string
  }
  createdAt: string
  updatedAt: string
}

export default function ApplicationsPage() {
  const router = useRouter()
  const [applications, setApplications] = useState<Application[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    loadApplications()
  }, [])

  async function loadApplications() {
    try {
      setLoading(true)
      const response = await fetch('/api/applications', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('authToken')}`
        }
      })

      if (response.ok) {
        const data = await response.json()
        setApplications(data.applications)
      } else {
        setError('Failed to load applications')
      }
    } catch (err) {
      setError('Network error')
    } finally {
      setLoading(false)
    }
  }

  async function toggleApplication(id: string, currentState: boolean) {
    try {
      const response = await fetch(`/api/applications/${id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('authToken')}`
        },
        body: JSON.stringify({ isEnabled: !currentState })
      })

      if (response.ok) {
        loadApplications()
      } else {
        alert('Failed to update application')
      }
    } catch (err) {
      alert('Network error')
    }
  }

  async function deleteApplication(id: string, name: string) {
    if (!confirm(`Are you sure you want to remove ${name}?`)) {
      return
    }

    try {
      const response = await fetch(`/api/applications/${id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('authToken')}`
        }
      })

      if (response.ok) {
        loadApplications()
      } else {
        alert('Failed to delete application')
      }
    } catch (err) {
      alert('Network error')
    }
  }

  if (loading) {
    return (
      <div style={{ padding: '48px', textAlign: 'center' }}>
        <div style={{ fontSize: '18px', color: '#666' }}>Loading applications...</div>
      </div>
    )
  }

  return (
    <div style={{ padding: '48px', maxWidth: '1200px', margin: '0 auto' }}>
      {/* Header */}
      <div style={{ marginBottom: '32px' }}>
        <h1 style={{ fontSize: '32px', fontWeight: '700', marginBottom: '8px' }}>
          Application Configurations
        </h1>
        <p style={{ fontSize: '16px', color: '#666' }}>
          Manage which applications Kathy works with for your organization
        </p>
      </div>

      {error && (
        <div style={{
          background: '#FFEBEE',
          border: '1px solid #EF5350',
          borderRadius: '8px',
          padding: '16px',
          marginBottom: '24px',
          color: '#C62828'
        }}>
          {error}
        </div>
      )}

      {/* Application Grid */}
      {applications.length === 0 ? (
        <div style={{
          textAlign: 'center',
          padding: '64px',
          background: '#F5F5F5',
          borderRadius: '12px'
        }}>
          <div style={{ fontSize: '48px', marginBottom: '16px' }}>🎯</div>
          <h3 style={{ fontSize: '20px', marginBottom: '8px' }}>No Applications Configured</h3>
          <p style={{ color: '#666', marginBottom: '24px' }}>
            Get started by configuring your first application
          </p>
          <button
            onClick={() => alert('Open the extension, navigate to your app, and click "Configure"')}
            style={{
              padding: '12px 24px',
              background: '#4CAF50',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              fontSize: '16px',
              fontWeight: '600',
              cursor: 'pointer'
            }}
          >
            How to Configure
          </button>
        </div>
      ) : (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
          gap: '24px'
        }}>
          {applications.map(app => (
            <div
              key={app.id}
              style={{
                background: 'white',
                border: app.isEnabled ? '2px solid #4CAF50' : '2px solid #E0E0E0',
                borderRadius: '12px',
                padding: '24px',
                position: 'relative'
              }}
            >
              {/* Status Badge */}
              <div style={{
                position: 'absolute',
                top: '16px',
                right: '16px',
                padding: '4px 12px',
                borderRadius: '12px',
                fontSize: '12px',
                fontWeight: '600',
                background: app.isEnabled ? '#E8F5E9' : '#F5F5F5',
                color: app.isEnabled ? '#2E7D32' : '#666'
              }}>
                {app.isEnabled ? '✓ Enabled' : 'Disabled'}
              </div>

              {/* Application Name */}
              <h3 style={{
                fontSize: '20px',
                fontWeight: '600',
                marginBottom: '8px',
                paddingRight: '80px'
              }}>
                {app.applicationName}
              </h3>

              {/* URL */}
              <p style={{
                fontSize: '14px',
                color: '#666',
                marginBottom: '16px',
                wordBreak: 'break-all'
              }}>
                {app.applicationUrl}
              </p>

              {/* Configuration Details */}
              <div style={{
                background: '#F9F9F9',
                borderRadius: '8px',
                padding: '12px',
                marginBottom: '16px',
                fontSize: '13px'
              }}>
                <div style={{ marginBottom: '4px' }}>
                  <strong>Invoice ID:</strong> Column {app.selectorConfig.invoiceIdColumn}
                </div>
                <div style={{ marginBottom: '4px' }}>
                  <strong>Amount:</strong> Column {app.selectorConfig.amountColumn}
                </div>
                <div>
                  <strong>Status:</strong> Column {app.selectorConfig.statusColumn}
                </div>
              </div>

              {/* Actions */}
              <div style={{ display: 'flex', gap: '8px' }}>
                <button
                  onClick={() => toggleApplication(app.id, app.isEnabled)}
                  style={{
                    flex: 1,
                    padding: '10px',
                    background: app.isEnabled ? '#FFF3E0' : '#4CAF50',
                    color: app.isEnabled ? '#E65100' : 'white',
                    border: 'none',
                    borderRadius: '6px',
                    fontSize: '14px',
                    fontWeight: '600',
                    cursor: 'pointer'
                  }}
                >
                  {app.isEnabled ? 'Disable' : 'Enable'}
                </button>
                <button
                  onClick={() => deleteApplication(app.id, app.applicationName)}
                  style={{
                    padding: '10px 16px',
                    background: '#FFEBEE',
                    color: '#C62828',
                    border: 'none',
                    borderRadius: '6px',
                    fontSize: '14px',
                    fontWeight: '600',
                    cursor: 'pointer'
                  }}
                >
                  Remove
                </button>
              </div>

              {/* Last Updated */}
              <div style={{
                marginTop: '12px',
                fontSize: '12px',
                color: '#999',
                textAlign: 'center'
              }}>
                Updated {new Date(app.updatedAt).toLocaleDateString()}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Instructions */}
      <div style={{
        marginTop: '48px',
        padding: '24px',
        background: '#E8F5E9',
        borderRadius: '12px',
        border: '2px solid #4CAF50'
      }}>
        <h3 style={{ fontSize: '18px', fontWeight: '600', marginBottom: '12px', color: '#2E7D32' }}>
          💡 How to Add New Applications
        </h3>
        <ol style={{ color: '#2E7D32', lineHeight: '1.8', paddingLeft: '20px' }}>
          <li>Navigate to the web application you want to configure (e.g., Practice Panther, Clio)</li>
          <li>Click the Kathy extension icon in your browser</li>
          <li>Click "Visual Configurator" or "Configure App"</li>
          <li>Follow the on-screen instructions to select invoice columns</li>
          <li>Your new application will appear here automatically!</li>
        </ol>
      </div>

      {/* Back Link */}
      <div style={{ marginTop: '32px', textAlign: 'center' }}>
        <button
          onClick={() => router.push('/dashboard')}
          style={{
            padding: '12px 24px',
            background: 'transparent',
            color: '#4CAF50',
            border: '2px solid #4CAF50',
            borderRadius: '8px',
            fontSize: '16px',
            fontWeight: '600',
            cursor: 'pointer'
          }}
        >
          ← Back to Dashboard
        </button>
      </div>
    </div>
  )
}


