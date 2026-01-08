import React, { useState, useEffect } from 'react'
import { createRoot } from 'react-dom/client'
import './options.css'

function OptionsPage() {
  const [config, setConfig] = useState({
    invoiceIdColumnIndex: 0,
    amountColumnIndex: 2,
    statusColumnIndex: 3,
    invoiceIdPattern: 'I-\\d+',
    amountPattern: '\\$?([\\d,]+\\.?\\d*)'
  })
  
  const [userConfig, setUserConfig] = useState({
    organizationId: '',
    userId: '',
    email: ''
  })
  
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    // Load configuration from storage
    chrome.storage.local.get(['kathyConfig', 'kathyUser'], (result) => {
      if (result.kathyConfig) {
        setConfig(result.kathyConfig)
      }
      if (result.kathyUser) {
        setUserConfig(result.kathyUser)
      }
    })
  }, [])

  const handleConfigChange = (field: string, value: any) => {
    setConfig({ ...config, [field]: value })
    setSaved(false)
  }
  
  const handleUserConfigChange = (field: string, value: string) => {
    setUserConfig({ ...userConfig, [field]: value })
    setSaved(false)
  }

  const saveConfig = () => {
    chrome.storage.local.set({ 
      kathyConfig: config,
      kathyUser: userConfig
    }, () => {
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
    })
  }

  const startVisualConfig = () => {
    // Send message to configurator to start
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs[0]?.id) {
        chrome.tabs.sendMessage(tabs[0].id, { type: 'start-visual-config' })
        window.close()
      }
    })
  }
  
  // Listen for configurator results
  useEffect(() => {
    const handleMessage = (message: any) => {
      if (message.type === 'visual-config-result') {
        setConfig({
          ...config,
          ...message.config
        })
        setSaved(false)
      }
    }
    
    chrome.runtime.onMessage.addListener(handleMessage)
    return () => chrome.runtime.onMessage.removeListener(handleMessage)
  }, [config])

  return (
    <div className="options-container">
      <h1>Kathy Extension Settings</h1>
      
      <div className="section">
        <h2>👤 User Account (Multi-Tenancy)</h2>
        <p className="description">
          Your organization ID is used to tag all payments. This ensures proper data isolation in multi-tenant environments.
        </p>
        
        <div className="form-group">
          <label htmlFor="organizationId">
            Organization ID *
            <span className="hint">Your company/firm identifier in Kathy</span>
          </label>
          <input
            id="organizationId"
            type="text"
            value={userConfig.organizationId}
            onChange={(e) => handleUserConfigChange('organizationId', e.target.value)}
            placeholder="e.g., acme-law-firm"
          />
        </div>
        
        <div className="form-group">
          <label htmlFor="userId">
            User ID (optional)
            <span className="hint">Your unique user identifier</span>
          </label>
          <input
            id="userId"
            type="text"
            value={userConfig.userId}
            onChange={(e) => handleUserConfigChange('userId', e.target.value)}
            placeholder="e.g., john-doe"
          />
        </div>
        
        <div className="form-group">
          <label htmlFor="email">
            Email (optional)
            <span className="hint">For notifications and audit logs</span>
          </label>
          <input
            id="email"
            type="email"
            value={userConfig.email}
            onChange={(e) => handleUserConfigChange('email', e.target.value)}
            placeholder="e.g., john@example.com"
          />
        </div>
      </div>

      <div className="section">
        <h2>⚙️ Invoice Table Configuration</h2>
        <p className="description">
          Configure how Kathy extracts invoice data from Practice Panther tables.
        </p>
        
        <button onClick={startVisualConfig} className="visual-config-button">
          ✨ Visual Configuration
        </button>
        
        <div className="form-group">
          <label htmlFor="invoiceIdCol">Invoice ID Column Index</label>
          <input
            id="invoiceIdCol"
            type="number"
            value={config.invoiceIdColumnIndex}
            onChange={(e) => handleConfigChange('invoiceIdColumnIndex', parseInt(e.target.value))}
          />
        </div>

        <div className="form-group">
          <label htmlFor="amountCol">Amount Column Index</label>
          <input
            id="amountCol"
            type="number"
            value={config.amountColumnIndex}
            onChange={(e) => handleConfigChange('amountColumnIndex', parseInt(e.target.value))}
          />
        </div>

        <div className="form-group">
          <label htmlFor="statusCol">Status Column Index</label>
          <input
            id="statusCol"
            type="number"
            value={config.statusColumnIndex}
            onChange={(e) => handleConfigChange('statusColumnIndex', parseInt(e.target.value))}
          />
        </div>

        <div className="form-group">
          <label htmlFor="invoicePattern">Invoice ID Pattern (regex)</label>
          <input
            id="invoicePattern"
            type="text"
            value={config.invoiceIdPattern}
            onChange={(e) => handleConfigChange('invoiceIdPattern', e.target.value)}
          />
        </div>

        <div className="form-group">
          <label htmlFor="amountPattern">Amount Pattern (regex)</label>
          <input
            id="amountPattern"
            type="text"
            value={config.amountPattern}
            onChange={(e) => handleConfigChange('amountPattern', e.target.value)}
          />
        </div>
      </div>

      <div className="button-group">
        <button onClick={saveConfig} className="save-button">
          {saved ? '✓ Saved!' : 'Save Settings'}
        </button>
      </div>
      
      {!userConfig.organizationId && (
        <div className="warning-message">
          ⚠️ Please set your Organization ID to enable multi-tenant tracking
        </div>
      )}
    </div>
  )
}

// Mount the options page
const container = document.getElementById('root')
if (container) {
  const root = createRoot(container)
  root.render(<OptionsPage />)
}

export default OptionsPage
