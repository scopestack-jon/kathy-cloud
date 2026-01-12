import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.PLASMO_PUBLIC_SUPABASE_URL!,
  process.env.PLASMO_PUBLIC_SUPABASE_ANON_KEY!
)

/**
 * Check if JWT token is expired or expiring soon
 */
function isTokenExpired(token: string): boolean {
  try {
    // JWT structure: header.payload.signature
    const payload = token.split('.')[1]
    const decoded = JSON.parse(atob(payload))
    const exp = decoded.exp * 1000 // Convert to milliseconds
    const now = Date.now()
    
    // Consider expired if less than 5 minutes remaining
    const bufferTime = 5 * 60 * 1000
    return exp - now < bufferTime
  } catch (error) {
    console.error('Kathy: Error checking token expiration', error)
    return true // Treat as expired if we can't decode
  }
}

/**
 * Get a valid auth token, refreshing if necessary
 */
export async function getValidAuthToken(): Promise<string | null> {
  try {
    // Get current token and refresh token from storage
    const { authToken, refreshToken, user } = await chrome.storage.local.get(['authToken', 'refreshToken', 'user'])
    
    if (!authToken) {
      console.log('Kathy: No auth token found')
      return null
    }
    
    // Check if token is expired
    if (!isTokenExpired(authToken)) {
      // Token is still valid
      return authToken
    }
    
    console.log('Kathy: Token expired, refreshing...')
    
    if (!refreshToken) {
      console.error('Kathy: No refresh token available')
      await chrome.storage.local.remove(['authToken', 'user', 'organizationId'])
      return null
    }
    
    // Set the session first so Supabase can refresh it
    await supabase.auth.setSession({
      access_token: authToken,
      refresh_token: refreshToken
    })
    
    // Token is expired, try to refresh
    const { data, error } = await supabase.auth.refreshSession()
    
    if (error || !data.session) {
      console.error('Kathy: Failed to refresh token', error)
      // Clear invalid token
      await chrome.storage.local.remove(['authToken', 'refreshToken', 'user', 'organizationId'])
      return null
    }
    
    console.log('Kathy: Token refreshed successfully')
    
    // Store new tokens
    await chrome.storage.local.set({
      authToken: data.session.access_token,
      refreshToken: data.session.refresh_token,
      user: data.session.user
    })
    
    return data.session.access_token
  } catch (error) {
    console.error('Kathy: Error getting valid auth token', error)
    return null
  }
}

/**
 * Make an authenticated API request with automatic token refresh
 */
export async function authenticatedFetch(
  url: string, 
  options: RequestInit = {}
): Promise<Response> {
  // Get valid token (will refresh if needed)
  const token = await getValidAuthToken()
  
  if (!token) {
    throw new Error('Not authenticated. Please sign in to the Kathy extension.')
  }
  
  // Add auth header
  const headers = {
    ...options.headers,
    'Authorization': `Bearer ${token}`
  }
  
  // Make request
  const response = await fetch(url, { ...options, headers })
  
  // If we get 401, token might have been revoked or session ended
  if (response.status === 401) {
    console.error('Kathy: 401 Unauthorized - token may be invalid')
    // Clear storage to force re-login
    await chrome.storage.local.remove(['authToken', 'refreshToken', 'user', 'organizationId'])
  }
  
  return response
}

