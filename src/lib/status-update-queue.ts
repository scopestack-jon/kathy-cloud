const KATHY_CLOUD_URL = process.env.PLASMO_PUBLIC_API_URL || 'http://localhost:3000'

export interface PendingUpdateData {
  paymentSessionId: string
  applicationConfigId: string
  invoiceId: string
  errorMessage: string
}

export interface QueuedUpdate {
  id: string
  pendingUpdateId?: string
  data: PendingUpdateData
  queuedAt: string
}

async function getAuthToken(): Promise<string | null> {
  try {
    const result = await chrome.storage.local.get(['authToken'])
    return (result.authToken as string) || null
  } catch {
    return null
  }
}

export async function queueFailedUpdate(data: PendingUpdateData): Promise<string | null> {
  const authToken = await getAuthToken()

  if (!authToken) {
    console.error('StatusUpdateQueue: No auth token, storing locally only')
    return storeLocally(data)
  }

  try {
    const response = await fetch(`${KATHY_CLOUD_URL}/api/status-updates/pending`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authToken}`
      },
      body: JSON.stringify(data)
    })

    if (!response.ok) {
      console.error('StatusUpdateQueue: API error, storing locally')
      return storeLocally(data)
    }

    const result = await response.json()
    const pendingUpdateId = result.pendingUpdate?.id

    if (pendingUpdateId) {
      await trackPendingUpdate(pendingUpdateId, data)
    }

    console.log('StatusUpdateQueue: Queued failed update', pendingUpdateId)
    return pendingUpdateId
  } catch (error) {
    console.error('StatusUpdateQueue: Network error, storing locally', error)
    return storeLocally(data)
  }
}

async function storeLocally(data: PendingUpdateData): Promise<string> {
  const localId = `local-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`

  const result = await chrome.storage.local.get(['pendingUpdatesLocal'])
  const pending = (result.pendingUpdatesLocal || []) as QueuedUpdate[]

  pending.push({
    id: localId,
    data,
    queuedAt: new Date().toISOString()
  })

  await chrome.storage.local.set({ pendingUpdatesLocal: pending })
  console.log('StatusUpdateQueue: Stored locally', localId)

  return localId
}

async function trackPendingUpdate(pendingUpdateId: string, data: PendingUpdateData): Promise<void> {
  const result = await chrome.storage.local.get(['pendingUpdatesTracked'])
  const tracked = (result.pendingUpdatesTracked || []) as QueuedUpdate[]

  tracked.push({
    id: `tracked-${Date.now()}`,
    pendingUpdateId,
    data,
    queuedAt: new Date().toISOString()
  })

  await chrome.storage.local.set({ pendingUpdatesTracked: tracked })
}

export async function getLocalPendingUpdates(): Promise<QueuedUpdate[]> {
  const result = await chrome.storage.local.get(['pendingUpdatesLocal'])
  return (result.pendingUpdatesLocal || []) as QueuedUpdate[]
}

export async function getTrackedPendingUpdates(): Promise<QueuedUpdate[]> {
  const result = await chrome.storage.local.get(['pendingUpdatesTracked'])
  return (result.pendingUpdatesTracked || []) as QueuedUpdate[]
}

export async function removeLocalPendingUpdate(id: string): Promise<void> {
  const result = await chrome.storage.local.get(['pendingUpdatesLocal'])
  const pending = (result.pendingUpdatesLocal || []) as QueuedUpdate[]
  const filtered = pending.filter(p => p.id !== id)
  await chrome.storage.local.set({ pendingUpdatesLocal: filtered })
}

export async function syncLocalToServer(): Promise<number> {
  const authToken = await getAuthToken()
  if (!authToken) return 0

  const localUpdates = await getLocalPendingUpdates()
  let synced = 0

  for (const update of localUpdates) {
    try {
      const response = await fetch(`${KATHY_CLOUD_URL}/api/status-updates/pending`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`
        },
        body: JSON.stringify(update.data)
      })

      if (response.ok) {
        await removeLocalPendingUpdate(update.id)
        synced++
      }
    } catch {
      continue
    }
  }

  console.log(`StatusUpdateQueue: Synced ${synced} local updates to server`)
  return synced
}
