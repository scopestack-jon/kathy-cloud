import { createClient } from '@supabase/supabase-js'

export const config = {
  matches: [
    "https://kathy-cloud.vercel.app/auth/callback*",
    "https://kathy.dev/auth/callback*",
    "https://www.kathy.dev/auth/callback*",
    "http://localhost:3000/auth/callback*"
  ],
  run_at: "document_end"
}

console.log('🟢 Kathy: Auth callback content script loaded!', window.location.href)

const supabase = createClient(
  process.env.PLASMO_PUBLIC_SUPABASE_URL!,
  process.env.PLASMO_PUBLIC_SUPABASE_ANON_KEY!
)

console.log('🟢 Kathy: Supabase client created')

// Function to try multiple times to get the session
async function captureAuthSession(attempts = 0) {
  const maxAttempts = 5
  
  try {
    console.log(`🔍 Kathy: Attempt ${attempts + 1}/${maxAttempts} to get session...`)
    
    // First check sessionStorage for session from login page
    const tempSessionStr = sessionStorage.getItem('kathy_temp_session')
    
    if (tempSessionStr) {
      console.log('✅ Kathy: Found temp session from login page!')
      const tempSession = JSON.parse(tempSessionStr)
      
      // Store in chrome.storage (including refresh_token for token refresh)
      await chrome.storage.local.set({
        authToken: tempSession.access_token,
        refreshToken: tempSession.refresh_token,
        user: tempSession.user
      })
      
      console.log('✅ Kathy: Auth session stored successfully from sessionStorage!', tempSession.user.email)
      
      // Clear temp storage
      sessionStorage.removeItem('kathy_temp_session')
      
      // Verify it was stored
      const verify = await chrome.storage.local.get(['authToken', 'refreshToken', 'user'])
      console.log('✅ Kathy: Verified storage:', { email: verify.user?.email, hasRefreshToken: !!verify.refreshToken })
      
      // Show success message
      showSuccessMessage(tempSession.user.email)
      return
    }
    
    // Fallback: Get the session from Supabase
    const { data: { session }, error } = await supabase.auth.getSession()
    
    console.log('🔍 Kathy: Session data:', session ? 'Found!' : 'None', 'Error:', error)
    
    if (session && !error) {
      console.log('✅ Kathy: Found auth session!', session.user.email)
      
      // Store in chrome.storage so the extension can access it (including refresh_token)
      await chrome.storage.local.set({
        authToken: session.access_token,
        refreshToken: session.refresh_token,
        user: session.user
      })
      
      console.log('✅ Kathy: Auth session stored successfully in chrome.storage!')
      
      // Verify it was stored
      const verify = await chrome.storage.local.get(['authToken', 'refreshToken', 'user'])
      console.log('✅ Kathy: Verified storage:', { email: verify.user?.email, hasRefreshToken: !!verify.refreshToken })
      
      // Show success message
      showSuccessMessage(session.user.email)
    } else if (attempts < maxAttempts - 1) {
      // Try again in 1 second
      console.log('⏳ Kathy: No session yet, retrying in 1s...')
      setTimeout(() => captureAuthSession(attempts + 1), 1000)
    } else {
      console.error('❌ Kathy: Failed to get session after', maxAttempts, 'attempts')
      const errorDiv = document.createElement('div')
      errorDiv.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: #f44336;
        color: white;
        padding: 16px 24px;
        border-radius: 8px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.3);
        z-index: 999999;
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
        font-size: 14px;
        font-weight: 600;
      `
      errorDiv.textContent = '⚠️ Authentication issue. Please try signing in again.'
      document.body.appendChild(errorDiv)
    }
  } catch (err) {
    console.error('❌ Kathy: Error in auth callback:', err)
  }
}

// Helper function to show success message
function showSuccessMessage(email: string) {
  const messageDiv = document.createElement('div')
  messageDiv.style.cssText = `
    position: fixed;
    top: 20px;
    right: 20px;
    background: #4CAF50;
    color: white;
    padding: 16px 24px;
    border-radius: 8px;
    box-shadow: 0 4px 12px rgba(0,0,0,0.3);
    z-index: 999999;
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
    font-size: 14px;
    font-weight: 600;
  `
  messageDiv.textContent = `✅ Signed in as ${email}! Closing in 3s...`
  document.body.appendChild(messageDiv)
  
  // Auto-close after 3 seconds
  setTimeout(() => {
    window.close()
  }, 3000)
}

// Start trying to capture the session
captureAuthSession()

