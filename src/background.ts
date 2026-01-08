// Background service worker for Kathy extension
// Minimal implementation with no automated behavior

// Logging helper
function kathyLog(message: string, extra?: any) {
  if (extra !== undefined) {
    console.log(`Kathy: ${message}`, extra)
  } else {
    console.log(`Kathy: ${message}`)
  }
}

// Extension installed handler
chrome.runtime.onInstalled.addListener((details) => {
  kathyLog("Extension installed", { reason: details.reason })
})

// Message handler for cloud logging
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



