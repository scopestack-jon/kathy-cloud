// Background service worker for Kathy extension
// Handles authentication and message routing

import { initSupabaseAuth } from './lib/supabase'

// Logging helper
function kathyLog(message: string, extra?: any) {
  if (extra !== undefined) {
    console.log(`Kathy: ${message}`, extra)
  } else {
    console.log(`Kathy: ${message}`)
  }
}

// Initialize Supabase auth listener
initSupabaseAuth()

// Extension installed handler
chrome.runtime.onInstalled.addListener((details) => {
  kathyLog("Extension installed", { reason: details.reason })
})

// Listen for auth messages from the OAuth callback page
if (typeof window !== 'undefined') {
  window.addEventListener('message', async (event) => {
    if (event.data.type === 'kathy-auth-success') {
      kathyLog('Received auth success message')
      // Store the session
      await chrome.storage.local.set({
        authToken: event.data.session.access_token,
        user: event.data.session.user
      })
      kathyLog('Auth token stored in extension')
    }
  })
}

// Message handler for cloud logging and auth
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === "cloudLog") {
    handleCloudLog(message.payload)
      .then(() => sendResponse({ success: true }))
      .catch((error) => {
        kathyLog("Cloud log error", error)
        sendResponse({ success: false, error: error.message })
      })
    return true // Keep message channel open for async response
  }
  
  if (message.type === 'checkAuth') {
    // Check authentication status
    chrome.storage.local.get(['authToken', 'user'], (result) => {
      sendResponse({
        isAuthenticated: !!result.authToken,
        user: result.user || null
      })
    })
    return true
  }
  
  if (message.type === 'openPanel') {
    // Handle panel opening
    kathyLog('Opening panel for invoice:', message.data)
    sendResponse({ success: true })
    return true
  }
  
  if (message.type === 'startConfiguration' || message.type === 'start-visual-config') {
    // Send message to configurator content script
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs[0]?.id) {
        chrome.tabs.sendMessage(tabs[0].id, { type: 'start-visual-config' })
      }
    })
    sendResponse({ success: true })
    return true
  }
  
  if (message.type === 'openPaymentPopup') {
    // Open payment URL in a popup window (not a normal tab)
    kathyLog('Received openPaymentPopup message')
    kathyLog('Opening payment in popup window:', message.url?.substring(0, 100) + '...')
    
    try {
      chrome.windows.create({
        url: message.url,
        type: 'popup',
        width: 600,
        height: 800,
        focused: true,
        left: Math.round((screen.width - 600) / 2),
        top: Math.round((screen.height - 800) / 2)
      }, (window) => {
        if (chrome.runtime.lastError) {
          kathyLog('Error creating popup window:', chrome.runtime.lastError)
          sendResponse({ success: false, error: chrome.runtime.lastError.message })
        } else if (window) {
          kathyLog('Payment popup opened', { windowId: window.id })
          sendResponse({ success: true, windowId: window.id })
        } else {
          kathyLog('Failed to open payment popup - no window returned')
          sendResponse({ success: false, error: 'No window created' })
        }
      })
    } catch (error) {
      kathyLog('Exception opening popup:', error)
      sendResponse({ success: false, error: String(error) })
    }
    
    return true // Keep message channel open for async response
  }
})

// Cloud logging function
async function handleCloudLog(payload: any): Promise<void> {
  try {
    // Log endpoint - configurable
    const CLOUD_LOG_ENDPOINT = "http://localhost:3000/kathy-log"
    
    kathyLog("Sending cloud log", payload)
    
    const response = await fetch(CLOUD_LOG_ENDPOINT, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(payload)
    })
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`)
    }
    
    kathyLog("Cloud log sent successfully")
  } catch (error) {
    kathyLog("Failed to send cloud log", error)
    // Don't retry - single attempt only as per requirements
    throw error
  }
}

kathyLog("Background service worker initialized")




