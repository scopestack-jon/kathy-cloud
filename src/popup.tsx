import React, { useState, useEffect } from 'react'
import { createRoot } from 'react-dom/client'
import { supabase } from '~lib/supabase'
import { authenticatedFetch } from '~lib/auth-refresh'

type TabView = 'home' | 'settings'

interface AuthState {
  isAuthenticated: boolean
  user: any | null
  loading: boolean
}

function PopupPage() {
  const [currentTab, setCurrentTab] = useState<TabView>('home')
  const [authState, setAuthState] = useState<AuthState>({
    isAuthenticated: false,
    user: null,
    loading: true
  })
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
    // Check authentication status
    checkAuthStatus()
    
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

  const checkAuthStatus = async () => {
    try {
      // Check chrome.storage for auth token (stored by the auth callback content script)
      const result = await chrome.storage.local.get(['authToken', 'user', 'organizationId'])
      
      console.log('Kathy: Checking auth status...', result)
      
      if (result.authToken && result.user) {
        // Always fetch from API to get latest user data (firstName, lastName, organization)
        console.log('Kathy: Fetching latest user profile from API...')
        try {
          const API_URL = process.env.PLASMO_PUBLIC_API_URL || 'https://kathy-cloud.vercel.app'
          const response = await authenticatedFetch(`${API_URL}/api/auth/me`)
            
            if (response.ok) {
              const data = await response.json()
              console.log('Kathy: Fetched user profile:', data.user)
              console.log('Kathy: Organization ID:', data.user.organizationId)
              
              // Store the organizationId and user data
              await chrome.storage.local.set({
                organizationId: data.user.organizationId,
                user: {
                  id: data.user.id,
                  email: data.user.email,
                  firstName: data.user.firstName,
                  lastName: data.user.lastName,
                  role: data.user.role,
                  organization: data.user.organization
                }
              })
              
              setAuthState({
                isAuthenticated: true,
                user: {
                  ...data.user,
                  organization: data.user.organization // Include organization info
                },
                loading: false
              })
              setUserConfig({
                organizationId: data.user.organizationId,
                userId: data.user.id,
                email: data.user.email
              })
              setIsConfigured(true)
              console.log(`Kathy: User is authenticated: ${data.user.email}, Org: ${data.user.organization?.name}`)
            } else {
              // Try to get error details
              let errorDetails = response.statusText
              try {
                const errorData = await response.json()
                errorDetails = errorData.details || errorData.error || response.statusText
              } catch (e) {
                // Ignore JSON parse errors
              }
              
              console.error('Kathy: Failed to fetch user profile:', response.status, errorDetails)
              // Keep them authenticated even if org fetch fails
              setAuthState({
                isAuthenticated: true,
                user: result.user,
                loading: false
              })
              setUserConfig({
                organizationId: '',
                userId: result.user.id,
                email: result.user.email
              })
              console.warn('Kathy: Using stored user data, org fetch failed')
            }
          } catch (error) {
            console.error('Kathy: Error fetching user profile:', error)
            // Keep them authenticated even if org fetch fails
            setAuthState({
              isAuthenticated: true,
              user: result.user,
              loading: false
            })
            setUserConfig({
              organizationId: '',
              userId: result.user.id,
              email: result.user.email
            })
            console.warn('Kathy: Using stored user data, org fetch errored')
          }
      } else {
        console.log('Kathy: No auth token found')
        setAuthState({
          isAuthenticated: false,
          user: null,
          loading: false
        })
      }
    } catch (error) {
      console.error('Kathy: Auth check error:', error)
      setAuthState({
        isAuthenticated: false,
        user: null,
        loading: false
      })
    }
  }

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

  const handleLogin = () => {
    try {
      const API_URL = process.env.PLASMO_PUBLIC_API_URL || 'http://localhost:3000'
      console.log('Kathy: Opening login page at:', API_URL)
      
      // Open login page in new tab
      chrome.tabs.create({ 
        url: `${API_URL}/auth/login?redirect=extension` 
      }, (tab) => {
        if (chrome.runtime.lastError) {
          console.error('Kathy: Error opening tab:', chrome.runtime.lastError)
          alert('Error opening login page: ' + chrome.runtime.lastError.message)
        } else {
          console.log('Kathy: Opened login tab:', tab?.id)
        }
      })
      
      // Don't close immediately - let the tab open first
      setTimeout(() => window.close(), 100)
    } catch (error) {
      console.error('Kathy: Login error:', error)
      alert('Error: ' + error)
    }
  }

  const handleLogout = async () => {
    try {
      console.log('Kathy: Logging out...')
      // Clear auth data from chrome.storage
      await chrome.storage.local.remove(['authToken', 'user'])
      
      // Try to sign out from Supabase (optional, in case there's a session)
      try {
        await supabase.auth.signOut()
      } catch (e) {
        console.log('Kathy: Supabase signout skipped (no session)')
      }
      
      setAuthState({
        isAuthenticated: false,
        user: null,
        loading: false
      })
      
      console.log('Kathy: Logged out successfully')
    } catch (error) {
      console.error('Kathy: Logout error:', error)
    }
  }

  const openDashboard = () => {
    const API_URL = process.env.PLASMO_PUBLIC_API_URL || 'http://localhost:3000'
    chrome.tabs.create({ url: `${API_URL}/dashboard` })
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

  const addNewApplication = () => {
    // Get current tab URL
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      const currentUrl = tabs[0]?.url || ''
      
      // Ask for application name
      const appName = prompt('What application is this?\n\nExamples: Practice Panther, Clio, MyCase', '')
      
      if (!appName || !appName.trim()) {
        return
      }
      
      // Extract domain from current URL
      let suggestedPattern = '*'
      try {
        const url = new URL(currentUrl)
        suggestedPattern = `${url.origin}/*`
      } catch (e) {
        // Invalid URL
      }
      
      // Ask for URL pattern
      const urlPattern = prompt(
        `URL Pattern for ${appName}:\n\nEnter the URL pattern where Kathy should work.\nUse * as wildcard.\n\nExamples:\n- https://app.practicepanther.com/*\n- https://app.clio.com/matters/*`,
        suggestedPattern
      )
      
      if (!urlPattern || !urlPattern.trim()) {
        return
      }
      
      // Now start visual config on the current tab
      if (tabs[0]?.id) {
        // Send app info to content script
        chrome.tabs.sendMessage(tabs[0].id, { 
          type: 'start-visual-config',
          appName: appName.trim(),
          urlPattern: urlPattern.trim()
        })
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
            📱 Applications
          </h3>

          <button
            onClick={addNewApplication}
            style={{
              width: '100%',
              padding: '10px',
              fontSize: '13px',
              fontWeight: '600',
              color: 'white',
              background: '#4CAF50',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
              marginBottom: '10px'
            }}
          >
            ➕ Add New Application
          </button>

          <button
            onClick={() => {
              const API_URL = process.env.PLASMO_PUBLIC_API_URL || 'https://kathy-cloud.vercel.app'
              chrome.tabs.create({ url: `${API_URL}/dashboard/applications` })
              window.close()
            }}
            style={{
              width: '100%',
              padding: '10px',
              fontSize: '13px',
              fontWeight: '500',
              color: '#666',
              background: 'white',
              border: '1px solid #ddd',
              borderRadius: '4px',
              cursor: 'pointer',
              marginBottom: '16px'
            }}
          >
            📋 Manage Applications
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

      {/* Authentication Status */}
      {authState.loading ? (
        <div style={{
          background: '#f5f5f5',
          padding: '12px',
          borderRadius: '8px',
          marginBottom: '16px',
          textAlign: 'center',
          color: '#666'
        }}>
          Loading...
        </div>
      ) : authState.isAuthenticated ? (
        <div style={{
          background: '#E8F5E9',
          padding: '16px',
          borderRadius: '8px',
          marginBottom: '16px',
          border: '1px solid #4CAF50'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
            <div>
              <div style={{ fontSize: '16px', fontWeight: '600', color: '#2E7D32', marginBottom: '8px' }}>
                Welcome, {
                  authState.user?.firstName 
                    ? authState.user.firstName.charAt(0).toUpperCase() + authState.user.firstName.slice(1).toLowerCase()
                    : authState.user?.email?.split('@')[0] || 'User'
                }! 👋
              </div>
              <div style={{ fontSize: '13px', color: '#555', marginBottom: '4px' }}>
                {authState.user?.email}
              </div>
              {(authState.user?.organization?.name || userConfig.organizationId) && (
                <div style={{ 
                  fontSize: '13px', 
                  color: '#666',
                  marginTop: '8px',
                  paddingTop: '8px',
                  borderTop: '1px solid rgba(76, 175, 80, 0.2)'
                }}>
                  <strong>Organization:</strong> {authState.user?.organization?.name || userConfig.organizationId}
                </div>
              )}
            </div>
            <button
              onClick={handleLogout}
              style={{
                padding: '6px 12px',
                fontSize: '11px',
                background: 'white',
                border: '1px solid #ddd',
                borderRadius: '4px',
                cursor: 'pointer',
                color: '#666',
                whiteSpace: 'nowrap'
              }}
            >
              Logout
            </button>
          </div>
        </div>
      ) : (
        <div style={{
          background: '#E3F2FD',
          padding: '12px',
          borderRadius: '8px',
          marginBottom: '16px',
          border: '1px solid #2196F3'
        }}>
          <div style={{ fontSize: '13px', color: '#1565C0', fontWeight: '500', marginBottom: '8px' }}>
            🔐 Sign in to Kathy
          </div>
          <div style={{ fontSize: '12px', color: '#666', marginBottom: '12px' }}>
            Access your organization, save configurations, and track payments.
          </div>
          <button
            onClick={handleLogin}
            style={{
              width: '100%',
              padding: '10px',
              fontSize: '14px',
              fontWeight: '600',
              color: 'white',
              background: '#4CAF50',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer'
            }}
          >
            Sign In / Sign Up
          </button>
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

