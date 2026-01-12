'use client'

import { Suspense, useState } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { getSupabaseBrowserClient } from '@/lib/supabase-client'

const supabase = getSupabaseBrowserClient()

function LoginContent() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const extensionRedirect = searchParams.get('redirect')
  const registered = searchParams.get('registered')
  
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [organizationName, setOrganizationName] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [isSignUp, setIsSignUp] = useState(false)

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    // Validate sign-up fields
    if (isSignUp) {
      if (!firstName.trim()) {
        setError('Please enter your first name')
        setLoading(false)
        return
      }
      if (!lastName.trim()) {
        setError('Please enter your last name')
        setLoading(false)
        return
      }
      if (!organizationName.trim()) {
        setError('Please enter your organization name')
        setLoading(false)
        return
      }
    }

    try {
      const { data, error: authError } = isSignUp
        ? await supabase.auth.signUp({ 
            email, 
            password,
            options: {
              data: {
                first_name: firstName,
                last_name: lastName,
                organization_name: organizationName
              }
            }
          })
        : await supabase.auth.signInWithPassword({ email, password })

      if (authError) {
        setError(authError.message)
        setLoading(false)
        return
      }

      if (data.session) {
        // If from extension, store in localStorage and redirect to callback
        if (extensionRedirect) {
          // Store complete session data temporarily (including refresh_token)
          sessionStorage.setItem('kathy_temp_session', JSON.stringify({
            access_token: data.session.access_token,
            refresh_token: data.session.refresh_token,
            user: data.session.user
          }))
          
          // Redirect to callback page so our content script can pick it up
          window.location.href = `/auth/callback?redirect=extension`
        } else {
          // For web login, use full page navigation to ensure session is persisted
          window.location.href = '/dashboard'
        }
      } else if (isSignUp) {
        alert('✅ Sign up successful! Please check your email to verify your account.')
        setIsSignUp(false)
      }
    } catch (err: any) {
      setError(err.message || 'An error occurred')
      setLoading(false)
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
        width: '100%',
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
        <h1 style={{ fontSize: '24px', marginBottom: '12px', color: '#333', textAlign: 'center' }}>
          {isSignUp ? 'Create Account' : 'Sign in to Kathy'}
        </h1>
        <p style={{ fontSize: '14px', color: '#666', marginBottom: '24px', textAlign: 'center' }}>
          {isSignUp ? 'Start collecting payments' : 'Welcome back!'}
        </p>

        {registered && (
          <div style={{
            padding: '12px',
            background: '#e8f5e9',
            color: '#2e7d32',
            borderRadius: '6px',
            marginBottom: '16px',
            fontSize: '14px'
          }}>
            ✅ Account created successfully! Please sign in.
          </div>
        )}

        {error && (
          <div style={{
            padding: '12px',
            background: '#ffebee',
            color: '#c62828',
            borderRadius: '6px',
            marginBottom: '16px',
            fontSize: '14px'
          }}>
            {error}
          </div>
        )}

        <form onSubmit={handleLogin}>
          {isSignUp && (
            <>
              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', marginBottom: '8px', color: '#333' }}>
                  First Name
                </label>
                <input
                  type="text"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  required={isSignUp}
                  style={{
                    width: '100%',
                    padding: '12px',
                    fontSize: '14px',
                    border: '1px solid #ddd',
                    borderRadius: '6px',
                    boxSizing: 'border-box',
                    color: '#333',
                    backgroundColor: 'white'
                  }}
                  placeholder="John"
                />
              </div>

              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', marginBottom: '8px', color: '#333' }}>
                  Last Name
                </label>
                <input
                  type="text"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  required={isSignUp}
                  style={{
                    width: '100%',
                    padding: '12px',
                    fontSize: '14px',
                    border: '1px solid #ddd',
                    borderRadius: '6px',
                    boxSizing: 'border-box',
                    color: '#333',
                    backgroundColor: 'white'
                  }}
                  placeholder="Doe"
                />
              </div>
            </>
          )}

          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', marginBottom: '8px', color: '#333' }}>
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              style={{
                width: '100%',
                padding: '12px',
                fontSize: '14px',
                border: '1px solid #ddd',
                borderRadius: '6px',
                boxSizing: 'border-box',
                color: '#333',
                backgroundColor: 'white'
              }}
              placeholder="you@example.com"
            />
          </div>

          {isSignUp && (
            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', marginBottom: '8px', color: '#333' }}>
                Organization Name
              </label>
              <input
                type="text"
                value={organizationName}
                onChange={(e) => setOrganizationName(e.target.value)}
                required={isSignUp}
                style={{
                  width: '100%',
                  padding: '12px',
                  fontSize: '14px',
                  border: '1px solid #ddd',
                  borderRadius: '6px',
                  boxSizing: 'border-box',
                  color: '#333',
                  backgroundColor: 'white'
                }}
                placeholder="Your Law Firm Name"
              />
            </div>
          )}

          <div style={{ marginBottom: '24px' }}>
            <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', marginBottom: '8px', color: '#333' }}>
              Password
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
              style={{
                width: '100%',
                padding: '12px',
                fontSize: '14px',
                border: '1px solid #ddd',
                borderRadius: '6px',
                boxSizing: 'border-box',
                color: '#333',
                backgroundColor: 'white'
              }}
              placeholder="••••••••"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            style={{
              width: '100%',
              padding: '14px',
              fontSize: '16px',
              fontWeight: '600',
              color: 'white',
              background: loading ? '#ccc' : '#4CAF50',
              border: 'none',
              borderRadius: '8px',
              cursor: loading ? 'not-allowed' : 'pointer',
              marginBottom: '16px'
            }}
          >
            {loading ? 'Please wait...' : (isSignUp ? 'Sign Up' : 'Sign In')}
          </button>
        </form>

        <div style={{ textAlign: 'center', fontSize: '14px', color: '#666' }}>
          {isSignUp ? 'Already have an account?' : "Don't have an account?"}{' '}
          <button
            onClick={() => {
              setIsSignUp(!isSignUp)
              setError('')
            }}
            style={{
              background: 'none',
              border: 'none',
              color: '#4CAF50',
              cursor: 'pointer',
              textDecoration: 'underline',
              fontSize: '14px',
              padding: 0
            }}
          >
            {isSignUp ? 'Sign In' : 'Sign Up'}
          </button>
        </div>
      </div>
    </div>
  )
}

export default function ExtensionLoginPage() {
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
      <LoginContent />
    </Suspense>
  )
}

