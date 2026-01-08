import React, { useState, useEffect } from 'react'
import { createRoot } from 'react-dom/client'

type TabView = 'home' | 'settings'

function PopupPage() {
  const [currentTab, setCurrentTab] = useState<TabView>('home')
  const [userConfig, setUserConfig] = useState({
    organizationId: '',
    userId: '',
    email: ''
  })
  const [tableConfig, setTableConfig] = useState({
    invoiceIdColumnIndex: 0,
    amountColumnIndex: 2,
    statusColumnIndex: 3,
    invoiceIdPattern: 'I-\\d+',
    amountPattern: '\\$?([\\d,]+\\.?\\d*)'
  })
  const [isConfigured, setIsConfigured] = useState(false)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    // Load configuration
    chrome.storage.local.get(['kathyUser', 'kathyConfig'], (result) => {
      if (result.kathyUser) {
        setUserConfig(result.kathyUser)
        setIsConfigured(!!result.kathyUser.organizationId)
      }
      if (result.kathyConfig) {
        setTableConfig(result.kathyConfig)
      }
    })
  }, [])

  const handleUserConfigChange = (field: string, value: string) => {
    setUserConfig({ ...userConfig, [field]: value })
    setSaved(false)
  }

  const handleTableConfigChange = (field: string, value: any) => {
    setTableConfig({ ...tableConfig, [field]: value })
    setSaved(false)
  }

  const saveConfig = () => {
    chrome.storage.local.set({ 
      kathyUser: userConfig,
      kathyConfig: tableConfig
    }, () => {
      setIsConfigured(!!userConfig.organizationId)
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
    })
  }

  const openDashboard = () => {
    chrome.tabs.create({ url: 'http://localhost:3000/dashboard' })
    window.close()
  }

  const startVisualConfig = () => {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs[0]?.id) {
        chrome.tabs.sendMessage(tabs[0].id, { type: 'start-visual-config' })
        window.close()
      }
    })
  }

  if (currentTab === 'settings') {
    return (
      <div style={{
        width: '400px',
        maxHeight: '600px',
        overflowY: 'auto',
        padding: '20px',
        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
      }}>
        {/* Header with Back Button */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          marginBottom: '20px',
          paddingBottom: '16px',
          borderBottom: '2px solid #f0f0f0'
        }}>
          <button
            onClick={() => setCurrentTab('home')}
            style={{
              background: 'none',
              border: 'none',
              fontSize: '20px',
              cursor: 'pointer',
              padding: '0',
              marginRight: '12px'
            }}
          >
            ←
          </button>
          <div>
            <h2 style={{ margin: '0', fontSize: '18px', color: '#333' }}>Settings</h2>
            <p style={{ margin: '4px 0 0 0', fontSize: '12px', color: '#666' }}>Configure your account & table parsing</p>
          </div>
        </div>

        {/* User Account Section */}
        <div style={{ marginBottom: '24px' }}>
          <h3 style={{ fontSize: '14px', color: '#4CAF50', marginBottom: '12px', fontWeight: '600' }}>
            👤 User Account
          </h3>
          
          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: '#333', marginBottom: '6px' }}>
              Organization ID *
            </label>
            <input
              type="text"
              value={userConfig.organizationId}
              onChange={(e) => handleUserConfigChange('organizationId', e.target.value)}
              placeholder="e.g., acme-law-firm"
              style={{
                width: '100%',
                padding: '8px',
                fontSize: '13px',
                border: '1px solid #ddd',
                borderRadius: '4px',
                boxSizing: 'border-box'
              }}
            />
            <span style={{ fontSize: '11px', color: '#999', display: 'block', marginTop: '4px' }}>
              Your company identifier
            </span>
          </div>

          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: '#333', marginBottom: '6px' }}>
              User ID (optional)
            </label>
            <input
              type="text"
              value={userConfig.userId}
              onChange={(e) => handleUserConfigChange('userId', e.target.value)}
              placeholder="e.g., john-doe"
              style={{
                width: '100%',
                padding: '8px',
                fontSize: '13px',
                border: '1px solid #ddd',
                borderRadius: '4px',
                boxSizing: 'border-box'
              }}
            />
          </div>

          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: '#333', marginBottom: '6px' }}>
              Email (optional)
            </label>
            <input
              type="email"
              value={userConfig.email}
              onChange={(e) => handleUserConfigChange('email', e.target.value)}
              placeholder="e.g., john@acme.com"
              style={{
                width: '100%',
                padding: '8px',
                fontSize: '13px',
                border: '1px solid #ddd',
                borderRadius: '4px',
                boxSizing: 'border-box'
              }}
            />
          </div>
        </div>

        {/* Table Configuration Section */}
        <div style={{ marginBottom: '24px' }}>
          <h3 style={{ fontSize: '14px', color: '#4CAF50', marginBottom: '12px', fontWeight: '600' }}>
            ⚙️ Invoice Table Configuration
          </h3>

          <button
            onClick={startVisualConfig}
            style={{
              width: '100%',
              padding: '10px',
              fontSize: '13px',
              fontWeight: '500',
              color: 'white',
              background: '#2196F3',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
              marginBottom: '16px'
            }}
          >
            ✨ Visual Configuration
          </button>

          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: '#333', marginBottom: '6px' }}>
              Invoice ID Column Index
            </label>
            <input
              type="number"
              value={tableConfig.invoiceIdColumnIndex}
              onChange={(e) => handleTableConfigChange('invoiceIdColumnIndex', parseInt(e.target.value))}
              style={{
                width: '100%',
                padding: '8px',
                fontSize: '13px',
                border: '1px solid #ddd',
                borderRadius: '4px',
                boxSizing: 'border-box'
              }}
            />
          </div>

          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: '#333', marginBottom: '6px' }}>
              Amount Column Index
            </label>
            <input
              type="number"
              value={tableConfig.amountColumnIndex}
              onChange={(e) => handleTableConfigChange('amountColumnIndex', parseInt(e.target.value))}
              style={{
                width: '100%',
                padding: '8px',
                fontSize: '13px',
                border: '1px solid #ddd',
                borderRadius: '4px',
                boxSizing: 'border-box'
              }}
            />
          </div>

          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: '#333', marginBottom: '6px' }}>
              Status Column Index
            </label>
            <input
              type="number"
              value={tableConfig.statusColumnIndex}
              onChange={(e) => handleTableConfigChange('statusColumnIndex', parseInt(e.target.value))}
              style={{
                width: '100%',
                padding: '8px',
                fontSize: '13px',
                border: '1px solid #ddd',
                borderRadius: '4px',
                boxSizing: 'border-box'
              }}
            />
          </div>
        </div>

        {/* Save Button */}
        <button
          onClick={saveConfig}
          style={{
            width: '100%',
            padding: '12px',
            fontSize: '14px',
            fontWeight: '600',
            color: 'white',
            background: saved ? '#4CAF50' : '#4CAF50',
            border: 'none',
            borderRadius: '6px',
            cursor: 'pointer',
            marginBottom: '12px'
          }}
        >
          {saved ? '✓ Saved!' : 'Save Settings'}
        </button>

        {!userConfig.organizationId && (
          <div style={{
            padding: '12px',
            background: '#FFF3E0',
            borderLeft: '4px solid #FF9800',
            borderRadius: '4px',
            fontSize: '12px',
            color: '#E65100'
          }}>
            ⚠️ Please set your Organization ID to enable multi-tenant tracking
          </div>
        )}
      </div>
    )
  }

  // Home view
  return (
    <div style={{
      width: '320px',
      padding: '20px',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
    }}>
      {/* Header */}
      <div style={{
        textAlign: 'center',
        marginBottom: '20px',
        paddingBottom: '16px',
        borderBottom: '2px solid #f0f0f0'
      }}>
        <div style={{
          width: '48px',
          height: '48px',
          margin: '0 auto 12px',
          background: 'linear-gradient(135deg, #4CAF50 0%, #45a049 100%)',
          borderRadius: '50%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'white',
          fontSize: '24px',
          fontWeight: '700',
          boxShadow: '0 4px 12px rgba(76, 175, 80, 0.3)'
        }}>
          K
        </div>
        <h2 style={{ margin: '0', fontSize: '20px', color: '#333' }}>Kathy</h2>
        <p style={{ margin: '4px 0 0 0', fontSize: '12px', color: '#666' }}>v1.0.0</p>
      </div>

      {/* User Info */}
      {isConfigured ? (
        <div style={{
          background: '#E8F5E9',
          padding: '12px',
          borderRadius: '8px',
          marginBottom: '16px',
          border: '1px solid #4CAF50'
        }}>
          <div style={{ fontSize: '11px', color: '#666', marginBottom: '4px' }}>Organization</div>
          <div style={{ fontSize: '14px', fontWeight: '600', color: '#2E7D32' }}>
            {userConfig.organizationId}
          </div>
          {userConfig.email && (
            <>
              <div style={{ fontSize: '11px', color: '#666', marginTop: '8px', marginBottom: '4px' }}>Email</div>
              <div style={{ fontSize: '12px', color: '#666' }}>
                {userConfig.email}
              </div>
            </>
          )}
        </div>
      ) : (
        <div style={{
          background: '#FFF3E0',
          padding: '12px',
          borderRadius: '8px',
          marginBottom: '16px',
          border: '1px solid #FF9800'
        }}>
          <div style={{ fontSize: '13px', color: '#E65100', fontWeight: '500' }}>
            ⚠️ Setup Required
          </div>
          <div style={{ fontSize: '12px', color: '#666', marginTop: '4px' }}>
            Configure your organization in settings.
          </div>
        </div>
      )}

      {/* Menu Items */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        <button
          onClick={() => setCurrentTab('settings')}
          style={{
            width: '100%',
            padding: '12px 16px',
            fontSize: '14px',
            fontWeight: '500',
            color: '#333',
            background: 'white',
            border: '1px solid #ddd',
            borderRadius: '6px',
            cursor: 'pointer',
            textAlign: 'left',
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            transition: 'all 0.2s'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = '#f9f9f9'
            e.currentTarget.style.borderColor = '#4CAF50'
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'white'
            e.currentTarget.style.borderColor = '#ddd'
          }}
        >
          <span style={{ fontSize: '18px' }}>⚙️</span>
          <span>Settings & Configuration</span>
        </button>

        <button
          onClick={openDashboard}
          style={{
            width: '100%',
            padding: '12px 16px',
            fontSize: '14px',
            fontWeight: '500',
            color: '#333',
            background: 'white',
            border: '1px solid #ddd',
            borderRadius: '6px',
            cursor: 'pointer',
            textAlign: 'left',
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            transition: 'all 0.2s'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = '#f9f9f9'
            e.currentTarget.style.borderColor = '#4CAF50'
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'white'
            e.currentTarget.style.borderColor = '#ddd'
          }}
        >
          <span style={{ fontSize: '18px' }}>📊</span>
          <span>View Dashboard</span>
        </button>

        <a
          href="https://github.com/your-repo/kathy"
          target="_blank"
          style={{
            width: '100%',
            padding: '12px 16px',
            fontSize: '14px',
            fontWeight: '500',
            color: '#333',
            background: 'white',
            border: '1px solid #ddd',
            borderRadius: '6px',
            cursor: 'pointer',
            textAlign: 'left',
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            transition: 'all 0.2s',
            textDecoration: 'none'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = '#f9f9f9'
            e.currentTarget.style.borderColor = '#4CAF50'
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'white'
            e.currentTarget.style.borderColor = '#ddd'
          }}
        >
          <span style={{ fontSize: '18px' }}>📖</span>
          <span>Documentation</span>
        </a>
      </div>

      {/* Footer */}
      <div style={{
        marginTop: '20px',
        paddingTop: '16px',
        borderTop: '1px solid #eee',
        textAlign: 'center',
        fontSize: '11px',
        color: '#999'
      }}>
        Powered by Kathy Cloud
      </div>
    </div>
  )
}

// Mount the popup
const container = document.getElementById('root')
if (container) {
  const root = createRoot(container)
  root.render(<PopupPage />)
}

export default PopupPage

