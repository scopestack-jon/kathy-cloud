'use client'

import { Suspense, useEffect } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

function AuthCallbackContent() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const extensionRedirect = searchParams.get('extension_redirect')

  useEffect(() => {
    handleCallback()
  }, [])

  const handleCallback = async () => {
    try {
      // Get the session from the URL hash
      const { data: { session }, error } = await supabase.auth.getSession()

      if (error) {
        console.error('Callback error:', error)
        showError('Authentication failed. Please try again.')
        return
      }

      if (session) {
        // If this is from extension
        if (extensionRedirect) {
          // Store in localStorage for the extension to pick up
          localStorage.setItem('kathy_auth_token', session.access_token)
          localStorage.setItem('kathy_auth_user', JSON.stringify(session.user))
          
          showSuccess('✅ Authentication successful! Please close this tab and click the Kathy extension icon.')
          
          // Keep tab open so user can read the message
        } else {
          // Regular web app login - redirect to dashboard
          router.push('/dashboard')
        }
      } else {
        showError('No session found. Please try logging in again.')
      }
    } catch (err) {
      console.error('Unexpected error:', err)
      showError('An unexpected error occurred.')
    }
  }

  const showSuccess = (message: string) => {
    const el = document.getElementById('message')
    if (el) {
      el.textContent = message
      el.style.color = '#4CAF50'
    }
  }

  const showError = (message: string) => {
    const el = document.getElementById('message')
    if (el) {
      el.textContent = message
      el.style.color = '#f44336'
    }
  }

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
    }}>
      <div style={{
        background: 'white',
        padding: '40px',
        borderRadius: '12px',
        boxShadow: '0 10px 40px rgba(0,0,0,0.2)',
        textAlign: 'center',
        maxWidth: '400px'
      }}>
        <div style={{
          width: '64px',
          height: '64px',
          margin: '0 auto 20px',
          background: 'linear-gradient(135deg, #4CAF50 0%, #45a049 100%)',
          borderRadius: '50%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'white',
          fontSize: '32px',
          fontWeight: '700'
        }}>
          K
        </div>
        <h1 style={{ fontSize: '24px', marginBottom: '12px', color: '#333' }}>
          Completing Sign In
        </h1>
        <p id="message" style={{ fontSize: '14px', color: '#666', marginBottom: '24px' }}>
          Processing authentication...
        </p>
        <div style={{
          width: '40px',
          height: '40px',
          margin: '0 auto',
          border: '4px solid #f3f3f3',
          borderTop: '4px solid #4CAF50',
          borderRadius: '50%',
          animation: 'spin 1s linear infinite'
        }} />
      </div>
      <style>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  )
}

export default function AuthCallbackPage() {
  return (
    <Suspense fallback={
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
      }}>
        <div style={{ color: 'white', fontSize: '18px' }}>Loading...</div>
      </div>
    }>
      <AuthCallbackContent />
    </Suspense>
  )
}

