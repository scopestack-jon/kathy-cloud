'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { PaymentStatus } from '@prisma/client'
import { getSupabaseBrowserClient } from '@/lib/supabase-client'

const supabase = getSupabaseBrowserClient()

interface PaymentSession {
  id: string
  organizationId: string
  firmId: string | null
  applicationName: string | null
  invoiceId: string
  amount: number
  currency: string
  status: PaymentStatus
  createdAt: string
  processorPaymentId: string | null
  auditLogs: Array<{
    id: string
    action: string
    timestamp: string
  }>
}

export default function DashboardPage() {
  const router = useRouter()
  const [paymentSessions, setPaymentSessions] = useState<PaymentSession[]>([])
  const [applications, setApplications] = useState<string[]>([])
  const [selectedApp, setSelectedApp] = useState<string>('all')
  const [loading, setLoading] = useState(true)
  const [authToken, setAuthToken] = useState<string | null>(null)

  useEffect(() => {
    checkAuthAndLoadData()
  }, [])

  async function checkAuthAndLoadData() {
    // Check if user is authenticated (getUser validates and refreshes token)
    const { data: { user }, error } = await supabase.auth.getUser()
    
    if (error || !user) {
      console.log('Not authenticated, redirecting to login:', error?.message)
      router.push('/auth/login')
      return
    }
    
    // Get session after verifying user
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) {
      console.error('User verified but no session found')
      router.push('/auth/login')
      return
    }
    
    setAuthToken(session.access_token)
    loadData(session.access_token)
  }

  async function loadData(token?: string) {
    try {
      setLoading(true)
      
      // Get current session token
      let tokenToUse = token
      if (!tokenToUse) {
        // Use getUser() instead of getSession() - it will refresh the token if needed
        const { data: { user }, error } = await supabase.auth.getUser()
        
        if (error || !user) {
          console.error('No active session, redirecting to login:', error?.message)
          router.push('/auth/login')
          return
        }
        
        // Get the current session after user verification
        const { data: { session } } = await supabase.auth.getSession()
        if (!session) {
          console.error('Session not found after user verification')
          router.push('/auth/login')
          return
        }
        
        tokenToUse = session.access_token
      }
      
      // Fetch payment sessions from API
      const response = await fetch('/api/payments/sessions', {
        headers: {
          'Authorization': `Bearer ${tokenToUse}`
        }
      })
      
      if (response.status === 401) {
        // Unauthorized, clear session and redirect to login
        console.error('API returned 401, clearing session and redirecting to login')
        await supabase.auth.signOut()
        router.push('/auth/login')
        return
      }
      
      if (response.ok) {
        const data = await response.json()
        setPaymentSessions(data.sessions || [])
        
        // Get unique application names
        const uniqueApps = Array.from(new Set(
          (data.sessions || []).map((s: PaymentSession) => s.applicationName).filter(Boolean) as string[]
        ))
        setApplications(uniqueApps)
      } else {
        console.error('Failed to load payment sessions:', response.status)
      }
    } catch (error) {
      console.error('Error loading payment sessions:', error)
    } finally {
      setLoading(false)
    }
  }

  const filteredSessions = selectedApp === 'all' 
    ? paymentSessions 
    : paymentSessions.filter(s => s.applicationName === selectedApp)

  const statusCounts = Object.entries(
    filteredSessions.reduce((acc, session) => {
      acc[session.status] = (acc[session.status] || 0) + 1
      return acc
    }, {} as Record<string, number>)
  )

  // Show loading while checking auth
  if (loading && !authToken) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-500 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading dashboard...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold">Kathy Cloud Dashboard</h1>
          
          {/* Application Filter */}
          <div className="flex items-center gap-4">
            <span className="text-sm font-medium text-gray-700">Filter by Application:</span>
            <select
              value={selectedApp}
              onChange={(e) => setSelectedApp(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
            >
              <option value="all">All Applications</option>
              {applications.map(app => (
                <option key={app} value={app}>{app}</option>
              ))}
            </select>
            
            <button
              onClick={loadData}
              disabled={loading}
              className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 font-medium disabled:opacity-50"
            >
              {loading ? 'Loading...' : 'Refresh'}
            </button>
            
            <button
              onClick={() => window.location.href = '/dashboard/applications'}
              className="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 font-medium"
            >
              Manage Apps
            </button>

            <button
              onClick={() => window.location.href = '/dashboard/smartmoving'}
              className="px-4 py-2 bg-purple-500 text-white rounded-lg hover:bg-purple-600 font-medium"
            >
              SmartMoving
            </button>
          </div>
        </div>

        {/* Status Summary */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          {statusCounts.map(([status, count]) => (
            <div key={status} className="bg-white p-6 rounded-lg shadow">
              <div className="text-sm text-gray-600 uppercase">{status.replace(/_/g, ' ')}</div>
              <div className="text-3xl font-bold mt-2">{count}</div>
            </div>
          ))}
        </div>

        {/* Payment Sessions Table */}
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
            <h2 className="text-xl font-semibold">Recent Payment Sessions</h2>
            {selectedApp !== 'all' && (
              <span className="text-sm text-gray-600">
                Showing {filteredSessions.length} payments from {selectedApp}
              </span>
            )}
          </div>
          
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Organization
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Application
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Invoice ID
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Amount
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Created At
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Processor ID
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredSessions.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-6 py-8 text-center text-gray-500">
                      No payment sessions found
                    </td>
                  </tr>
                ) : (
                  filteredSessions.map((session) => (
                    <tr key={session.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {session.firmId || <span className="text-gray-400 italic">Not set</span>}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                        {session.applicationName || <span className="text-gray-400 italic">Unknown</span>}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {session.invoiceId}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {parseFloat(session.amount.toString()).toLocaleString('en-US', {
                          style: 'currency',
                          currency: session.currency
                        })}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <StatusBadge status={session.status} />
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {new Date(session.createdAt).toLocaleString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 font-mono">
                        {session.processorPaymentId?.substring(0, 20) || '-'}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Manual Review Section */}
        <div className="mt-8 bg-white rounded-lg shadow overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-xl font-semibold">Payments Requiring Manual Review</h2>
          </div>
          
          <div className="p-6">
            {filteredSessions.filter(s => s.status === 'manual_review' || s.status === 'paid_pending_consent').length === 0 ? (
              <p className="text-gray-500">No payments requiring manual review</p>
            ) : (
              <div className="space-y-4">
                {filteredSessions
                  .filter(s => s.status === 'manual_review' || s.status === 'paid_pending_consent')
                  .map((session) => (
                    <div key={session.id} className="border border-gray-200 rounded-lg p-4">
                      <div className="flex justify-between items-start">
                        <div>
                          <div className="font-semibold">Invoice #{session.invoiceId}</div>
                          <div className="text-sm text-gray-500 mt-1">
                            Application: {session.applicationName || 'Unknown'}
                          </div>
                          <div className="text-sm text-gray-500">
                            Amount: {parseFloat(session.amount.toString()).toLocaleString('en-US', {
                              style: 'currency',
                              currency: session.currency
                            })}
                          </div>
                          <div className="text-sm text-gray-500">
                            Created: {new Date(session.createdAt).toLocaleString()}
                          </div>
                        </div>
                        <StatusBadge status={session.status} />
                      </div>
                      {session.auditLogs && session.auditLogs.length > 0 && (
                        <div className="mt-4 pt-4 border-t border-gray-200">
                          <div className="text-xs font-semibold text-gray-600 uppercase mb-2">Recent Activity</div>
                          {session.auditLogs.map((log) => (
                            <div key={log.id} className="text-sm text-gray-600 mb-1">
                              {log.action} - {new Date(log.timestamp).toLocaleString()}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

function StatusBadge({ status }: { status: PaymentStatus }) {
  const colors: Record<PaymentStatus, string> = {
    initiated: 'bg-gray-100 text-gray-800',
    pending: 'bg-blue-100 text-blue-800',
    paid_pending_consent: 'bg-yellow-100 text-yellow-800',
    paid_and_confirmed: 'bg-green-100 text-green-800',
    cancelled: 'bg-red-100 text-red-800',
    failed: 'bg-red-100 text-red-800',
    manual_review: 'bg-orange-100 text-orange-800'
  }

  return (
    <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${colors[status]}`}>
      {status.replace(/_/g, ' ')}
    </span>
  )
}


