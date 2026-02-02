'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { getSupabaseBrowserClient } from '@/lib/supabase-client'

const supabase = getSupabaseBrowserClient()

interface SmartMovingConfig {
  apiKey: string
  clientId: string
  enabled: boolean
  ccProcessingFeePercent: number
  confirmCategory: string
  depositFieldNames?: string[]
  paymentPageEnabled?: boolean
  // Payment provider configuration
  paymentProvider?: 'runpayments' | 'fluidpay'
  fluidpay?: {
    apiKey: string
    environment: 'sandbox' | 'production'
  }
}

interface Organization {
  id: string
  name: string
  slug: string
  settings?: {
    smartMoving?: SmartMovingConfig
  }
}

export default function SmartMovingPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [organization, setOrganization] = useState<Organization | null>(null)
  const [config, setConfig] = useState<SmartMovingConfig>({
    apiKey: '',
    clientId: '',
    enabled: false,
    ccProcessingFeePercent: 2.75,
    confirmCategory: 'deposit',
    depositFieldNames: ['Travel Fee', 'Trip Charge'],
    paymentPageEnabled: true,
    paymentProvider: 'runpayments',
    fluidpay: {
      apiKey: '',
      environment: 'sandbox'
    }
  })
  const [depositFieldNamesInput, setDepositFieldNamesInput] = useState('Travel Fee, Trip Charge')
  const [testOpportunityId, setTestOpportunityId] = useState('')
  const [testLoading, setTestLoading] = useState(false)
  const [testResult, setTestResult] = useState<any>(null)
  const [auditLogs, setAuditLogs] = useState<any[]>([])
  const [saveMessage, setSaveMessage] = useState<{type: 'success' | 'error', text: string} | null>(null)

  useEffect(() => {
    loadOrganization()
  }, [])

  async function loadOrganization() {
    try {
      setLoading(true)

      const { data: { user }, error } = await supabase.auth.getUser()
      if (error || !user) {
        router.push('/auth/login')
        return
      }

      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        router.push('/auth/login')
        return
      }

      // Get user's organization
      const response = await fetch('/api/auth/me', {
        headers: {
          'Authorization': `Bearer ${session.access_token}`
        }
      })

      if (!response.ok) {
        const errorText = await response.text()
        console.error('Failed to fetch organization:', response.status, errorText)
        throw new Error('Failed to fetch organization')
      }

      const data = await response.json()
      console.log('Loaded organization data:', {
        hasOrganization: !!data.organization,
        organizationId: data.organization?.id,
        hasSettings: !!data.organization?.settings,
        hasSmartMoving: !!data.organization?.settings?.smartMoving
      })

      setOrganization(data.organization)

      // Set config from organization settings
      if (data.organization?.settings?.smartMoving) {
        console.log('Loading SmartMoving config from settings:', data.organization.settings.smartMoving)
        const loadedConfig = data.organization.settings.smartMoving
        setConfig(loadedConfig)
        // Update deposit field names input
        if (loadedConfig.depositFieldNames?.length) {
          setDepositFieldNamesInput(loadedConfig.depositFieldNames.join(', '))
        }
      } else {
        console.log('No SmartMoving config found in settings, using defaults')
      }

      // Load recent audit logs
      loadAuditLogs(session.access_token)
    } catch (error) {
      console.error('Error loading organization:', error)
    } finally {
      setLoading(false)
    }
  }

  async function loadAuditLogs(token?: string) {
    try {
      const { data: { session } } = await supabase.auth.getSession()
      const authToken = token || session?.access_token

      if (!authToken) return

      const response = await fetch('/api/payments/sessions', {
        headers: {
          'Authorization': `Bearer ${authToken}`
        }
      })

      if (response.ok) {
        const data = await response.json()

        // Filter for SmartMoving-related audit logs
        const allLogs = data.sessions.flatMap((s: any) =>
          (s.auditLogs || []).map((log: any) => ({
            ...log,
            paymentSessionId: s.id,
            invoiceId: s.invoiceId
          }))
        )

        const smartMovingLogs = allLogs.filter((log: any) =>
          log.action.includes('smartmoving') ||
          log.action === 'payment_initiated_from_smartmoving'
        )

        setAuditLogs(smartMovingLogs)
      }
    } catch (error) {
      console.error('Error loading audit logs:', error)
    }
  }

  async function saveConfig() {
    if (!organization) {
      setSaveMessage({ type: 'error', text: 'Organization not loaded' })
      return
    }

    try {
      setSaving(true)
      setSaveMessage(null)

      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        setSaveMessage({ type: 'error', text: 'Session expired. Please log in again.' })
        setTimeout(() => router.push('/auth/login'), 2000)
        return
      }

      console.log('Saving SmartMoving config:', {
        organizationId: organization.id,
        enabled: config.enabled,
        hasApiKey: !!config.apiKey,
        hasClientId: !!config.clientId
      })

      const response = await fetch('/api/organizations/update-settings', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          organizationId: organization.id,
          settings: {
            ...organization.settings,
            smartMoving: config
          }
        })
      })

      console.log('Save response status:', response.status)

      if (response.ok) {
        setSaveMessage({ type: 'success', text: 'SmartMoving configuration saved successfully!' })
        setTimeout(() => setSaveMessage(null), 5000)
        loadOrganization()
      } else {
        const error = await response.json()
        console.error('Save failed:', error)
        setSaveMessage({ type: 'error', text: `Failed to save: ${error.error || error.details || 'Unknown error'}` })
      }
    } catch (error) {
      console.error('Error saving config:', error)
      setSaveMessage({ type: 'error', text: `Error: ${error instanceof Error ? error.message : 'Failed to save configuration'}` })
    } finally {
      setSaving(false)
    }
  }

  async function testPaymentLink() {
    if (!testOpportunityId || !organization) return

    try {
      setTestLoading(true)
      setTestResult(null)

      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        router.push('/auth/login')
        return
      }

      const response = await fetch('/api/payment-sessions/from-smartmoving', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          opportunityId: testOpportunityId,
          organizationId: organization.id
        })
      })

      const data = await response.json()

      if (response.ok) {
        setTestResult(data)
        // Reload audit logs to show the new entry
        loadAuditLogs()
      } else {
        setTestResult({ error: data.error || data.details || 'Failed to generate payment link' })
      }
    } catch (error) {
      console.error('Error testing payment link:', error)
      setTestResult({ error: error instanceof Error ? error.message : 'Unknown error' })
    } finally {
      setTestLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-500 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading SmartMoving settings...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold">SmartMoving Integration</h1>
            <p className="text-gray-600 mt-2">Configure SmartMoving API credentials and test the integration</p>
          </div>
          <button
            onClick={() => router.push('/dashboard')}
            className="px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 font-medium"
          >
            ← Back to Dashboard
          </button>
        </div>

        {/* Organization Info */}
        {organization && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
            <div className="flex items-start gap-3">
              <svg className="w-5 h-5 text-blue-600 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
              </svg>
              <div>
                <div className="font-semibold text-blue-900">Organization: {organization.name}</div>
                <div className="text-sm text-blue-700">Slug: {organization.slug}</div>
              </div>
            </div>
          </div>
        )}

        {/* Configuration Form */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">API Configuration</h2>

          <div className="space-y-4">
            {/* Enabled Toggle */}
            <div className="flex items-center justify-between">
              <div>
                <label className="block text-sm font-medium text-gray-700">Enable SmartMoving Integration</label>
                <p className="text-sm text-gray-500">Automatically sync payments to SmartMoving</p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={config.enabled}
                  onChange={(e) => setConfig({ ...config, enabled: e.target.checked })}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-green-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-green-600"></div>
              </label>
            </div>

            {/* API Key */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">API Key</label>
              <input
                type="password"
                value={config.apiKey}
                onChange={(e) => setConfig({ ...config, apiKey: e.target.value })}
                placeholder="sm_live_..."
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
              />
              <p className="text-xs text-gray-500 mt-1">SmartMoving API key (x-api-key header)</p>
            </div>

            {/* Client ID */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Client ID</label>
              <input
                type="text"
                value={config.clientId}
                onChange={(e) => setConfig({ ...config, clientId: e.target.value })}
                placeholder="client_..."
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
              />
              <p className="text-xs text-gray-500 mt-1">SmartMoving client ID (x-client-id header)</p>
            </div>

            {/* Processing Fee */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Credit Card Processing Fee (%)</label>
              <input
                type="number"
                step="0.01"
                value={config.ccProcessingFeePercent}
                onChange={(e) => setConfig({ ...config, ccProcessingFeePercent: parseFloat(e.target.value) })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
              />
              <p className="text-xs text-gray-500 mt-1">Fee added to estimate amount (default: 2.75%)</p>
            </div>

            {/* Confirm Category */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Confirmation Category</label>
              <select
                value={config.confirmCategory}
                onChange={(e) => setConfig({ ...config, confirmCategory: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
              >
                <option value="deposit">Deposit</option>
                <option value="balance">Balance</option>
                <option value="full">Full Payment</option>
              </select>
              <p className="text-xs text-gray-500 mt-1">Category used when confirming jobs</p>
            </div>

            {/* Deposit Field Names */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Deposit Field Names</label>
              <input
                type="text"
                value={depositFieldNamesInput}
                onChange={(e) => {
                  setDepositFieldNamesInput(e.target.value)
                  const names = e.target.value.split(',').map(n => n.trim()).filter(Boolean)
                  setConfig({ ...config, depositFieldNames: names })
                }}
                placeholder="Travel Fee, Trip Charge, Fuel Fee"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
              />
              <p className="text-xs text-gray-500 mt-1">Comma-separated list of charge names to look for when extracting deposit amount (default: Travel Fee, Trip Charge)</p>
            </div>

            {/* Payment Provider Selection */}
            <div className="border-t border-gray-200 pt-4 mt-4">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Payment Provider</h3>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Payment Provider</label>
                <select
                  value={config.paymentProvider || 'runpayments'}
                  onChange={(e) => setConfig({ ...config, paymentProvider: e.target.value as 'runpayments' | 'fluidpay' })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                >
                  <option value="runpayments">RunPayments (Legacy)</option>
                  <option value="fluidpay">FluidPay (Recommended)</option>
                </select>
                <p className="text-xs text-gray-500 mt-1">FluidPay supports Apple Pay, ACH, and mobile terminals</p>
              </div>

              {/* FluidPay Configuration */}
              {config.paymentProvider === 'fluidpay' && (
                <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg space-y-4">
                  <h4 className="font-medium text-blue-900">FluidPay Configuration</h4>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">FluidPay API Key</label>
                    <input
                      type="password"
                      value={config.fluidpay?.apiKey || ''}
                      onChange={(e) => setConfig({
                        ...config,
                        fluidpay: { ...config.fluidpay, apiKey: e.target.value, environment: config.fluidpay?.environment || 'sandbox' }
                      })}
                      placeholder="Enter your FluidPay secret key..."
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                    <p className="text-xs text-gray-500 mt-1">Your FluidPay secret API key (not the public key)</p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Environment</label>
                    <select
                      value={config.fluidpay?.environment || 'sandbox'}
                      onChange={(e) => setConfig({
                        ...config,
                        fluidpay: { ...config.fluidpay, apiKey: config.fluidpay?.apiKey || '', environment: e.target.value as 'sandbox' | 'production' }
                      })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    >
                      <option value="sandbox">Sandbox (Testing)</option>
                      <option value="production">Production (Live)</option>
                    </select>
                    <p className="text-xs text-gray-500 mt-1">Use Sandbox for testing, Production for live payments</p>
                  </div>

                  {config.fluidpay?.environment === 'production' && (
                    <div className="p-3 bg-yellow-50 border border-yellow-200 rounded">
                      <div className="flex items-start gap-2">
                        <svg className="w-5 h-5 text-yellow-600 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                        </svg>
                        <div className="text-sm text-yellow-800">
                          <strong>Production Mode:</strong> Real payments will be processed. Make sure your FluidPay account is fully configured.
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Payment Page URL */}
            {organization && config.enabled && (
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <label className="block text-sm font-medium text-green-800 mb-2">Customer Payment Page URL</label>
                <p className="text-xs text-green-700 mb-2">Add this link to your SmartMoving email templates. Replace {'{JobNumber}'} with the SmartMoving template variable.</p>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={`${typeof window !== 'undefined' ? window.location.origin : 'https://kathy.app'}/pay/${organization.slug}/{JobNumber}`}
                    readOnly
                    className="flex-1 px-3 py-2 bg-white border border-green-300 rounded text-sm font-mono"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      const url = `${window.location.origin}/pay/${organization.slug}/{JobNumber}`
                      navigator.clipboard.writeText(url)
                      alert('Copied to clipboard!')
                    }}
                    className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 text-sm font-medium"
                  >
                    Copy
                  </button>
                </div>
                <p className="text-xs text-green-600 mt-2">Example: /pay/{organization.slug}/35493-1</p>
              </div>
            )}

            {/* Save Message */}
            {saveMessage && (
              <div className={`p-4 rounded-lg ${saveMessage.type === 'success' ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'}`}>
                <div className={`text-sm font-medium ${saveMessage.type === 'success' ? 'text-green-800' : 'text-red-800'}`}>
                  {saveMessage.type === 'success' ? '✅ ' : '❌ '}
                  {saveMessage.text}
                </div>
              </div>
            )}

            {/* Save Button */}
            <div className="pt-4">
              <button
                onClick={saveConfig}
                disabled={saving || !config.apiKey || !config.clientId}
                className="w-full px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 font-medium disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {saving ? 'Saving...' : 'Save Configuration'}
              </button>
            </div>
          </div>
        </div>

        {/* Test Payment Link Generator */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">Test Payment Link Generation</h2>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">SmartMoving Opportunity ID</label>
              <input
                type="text"
                value={testOpportunityId}
                onChange={(e) => setTestOpportunityId(e.target.value)}
                placeholder="Enter SmartMoving opportunity ID..."
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
              />
              <p className="text-xs text-gray-500 mt-1">
                Find this in the SmartMoving URL: https://app.smartmoving.com/opportunities/<strong>OPPORTUNITY_ID</strong>/sales
              </p>
            </div>

            <button
              onClick={testPaymentLink}
              disabled={testLoading || !testOpportunityId || !config.enabled}
              className="w-full px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 font-medium disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {testLoading ? 'Generating...' : 'Generate Test Payment Link'}
            </button>

            {/* Test Result */}
            {testResult && (
              <div className={`mt-4 p-4 rounded-lg ${testResult.error ? 'bg-red-50 border border-red-200' : 'bg-green-50 border border-green-200'}`}>
                {testResult.error ? (
                  <div>
                    <div className="font-semibold text-red-900 mb-2">❌ Error</div>
                    <div className="text-sm text-red-700">{testResult.error}</div>
                  </div>
                ) : (
                  <div>
                    <div className="font-semibold text-green-900 mb-3">✅ Payment Link Generated!</div>

                    {/* Fee Breakdown */}
                    <div className="bg-white rounded p-3 mb-3">
                      <div className="text-xs font-semibold text-gray-600 uppercase mb-2">Fee Breakdown</div>
                      <div className="space-y-1 text-sm">
                        <div className="flex justify-between">
                          <span>Estimate Amount:</span>
                          <span className="font-semibold">${testResult.feeBreakdown?.estimateAmount.toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Processing Fee ({testResult.feeBreakdown?.feePercent}%):</span>
                          <span className="font-semibold">${testResult.feeBreakdown?.processingFee.toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between border-t pt-1">
                          <span className="font-semibold">Total:</span>
                          <span className="font-semibold">${testResult.feeBreakdown?.totalAmount.toFixed(2)}</span>
                        </div>
                      </div>
                    </div>

                    {/* Customer Info */}
                    <div className="bg-white rounded p-3 mb-3">
                      <div className="text-xs font-semibold text-gray-600 uppercase mb-2">Customer</div>
                      <div className="text-sm">
                        <div><strong>Name:</strong> {testResult.customer?.name}</div>
                        <div><strong>Email:</strong> {testResult.customer?.email}</div>
                      </div>
                    </div>

                    {/* Payment Link */}
                    <div>
                      <label className="block text-xs font-semibold text-gray-600 uppercase mb-1">Payment Link:</label>
                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={testResult.paymentUrl}
                          readOnly
                          className="flex-1 px-3 py-2 bg-white border border-gray-300 rounded text-sm font-mono"
                        />
                        <button
                          onClick={() => {
                            navigator.clipboard.writeText(testResult.paymentUrl)
                            alert('Copied to clipboard!')
                          }}
                          className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 text-sm font-medium"
                        >
                          Copy
                        </button>
                        <a
                          href={testResult.paymentUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 text-sm font-medium"
                        >
                          Open
                        </a>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Audit Logs */}
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold">SmartMoving Sync Audit Logs</h2>
            <button
              onClick={() => loadAuditLogs()}
              className="px-3 py-1 bg-gray-200 text-gray-700 rounded hover:bg-gray-300 text-sm font-medium"
            >
              Refresh
            </button>
          </div>

          {auditLogs.length === 0 ? (
            <p className="text-gray-500 text-center py-8">No SmartMoving audit logs yet</p>
          ) : (
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {auditLogs.map((log) => (
                <div key={log.id} className="border border-gray-200 rounded p-3 text-sm">
                  <div className="flex justify-between items-start mb-2">
                    <div className="font-semibold text-gray-900">{log.action}</div>
                    <div className="text-xs text-gray-500">{new Date(log.timestamp).toLocaleString()}</div>
                  </div>
                  <div className="text-xs text-gray-600">Invoice: {log.invoiceId}</div>
                  {log.metadata && (
                    <div className="mt-2 bg-gray-50 rounded p-2 font-mono text-xs overflow-x-auto">
                      {JSON.stringify(log.metadata, null, 2)}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
