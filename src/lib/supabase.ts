import { createClient } from '@supabase/supabase-js'

// Supabase client for extension
const supabaseUrl = process.env.PLASMO_PUBLIC_SUPABASE_URL || ''
const supabaseAnonKey = process.env.PLASMO_PUBLIC_SUPABASE_ANON_KEY || ''

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: {
      getItem: async (key) => {
        const result = await chrome.storage.local.get(key)
        return result[key] || null
      },
      setItem: async (key, value) => {
        await chrome.storage.local.set({ [key]: value })
      },
      removeItem: async (key) => {
        await chrome.storage.local.remove(key)
      }
    },
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true
  }
})

/**
 * Initialize Supabase auth listener
 * Call this in background script
 */
export function initSupabaseAuth() {
  supabase.auth.onAuthStateChange((event, session) => {
    console.log('Kathy: Auth state changed:', event)
    
    if (session) {
      // Store auth token and user info
      chrome.storage.local.set({
        authToken: session.access_token,
        refreshToken: session.refresh_token,
        user: session.user,
        session: session
      })
      
      console.log('Kathy: User authenticated:', session.user.email)
    } else {
      // Clear auth data
      chrome.storage.local.remove(['authToken', 'refreshToken', 'user', 'session'])
      console.log('Kathy: User signed out')
    }
  })
}

/**
 * Sign in with Google OAuth
 * Opens OAuth flow in browser
 */
export async function signInWithGoogle() {
  try {
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: chrome.runtime.getURL('popup.html'),
        queryParams: {
          access_type: 'offline',
          prompt: 'consent'
        }
      }
    })

    if (error) throw error
    
    // Open OAuth URL in new tab
    if (data.url) {
      await chrome.tabs.create({ url: data.url })
    }

    return { success: true }
  } catch (error) {
    console.error('Kathy: Sign in error:', error)
    return { success: false, error }
  }
}

/**
 * Sign out current user
 */
export async function signOut() {
  try {
    const { error } = await supabase.auth.signOut()
    if (error) throw error
    
    return { success: true }
  } catch (error) {
    console.error('Kathy: Sign out error:', error)
    return { success: false, error }
  }
}

/**
 * Get current session
 */
export async function getSession() {
  const { data: { session }, error } = await supabase.auth.getSession()
  
  if (error) {
    console.error('Kathy: Get session error:', error)
    return null
  }
  
  return session
}

/**
 * Get current user
 */
export async function getUser() {
  const { data: { user }, error } = await supabase.auth.getUser()
  
  if (error) {
    console.error('Kathy: Get user error:', error)
    return null
  }
  
  return user
}

/**
 * Refresh session if needed
 */
export async function refreshSession() {
  try {
    const { data: { session }, error } = await supabase.auth.refreshSession()
    
    if (error) throw error
    
    return session
  } catch (error) {
    console.error('Kathy: Refresh session error:', error)
    return null
  }
}

/**
 * Check if user is authenticated
 */
export async function isAuthenticated(): Promise<boolean> {
  const session = await getSession()
  return !!session
}


