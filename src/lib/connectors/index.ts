import type { ActionSequence } from '../types/actions'
import { practicePantherConnector } from './practice-panther'

export interface Connector {
  name: string
  urlPattern: RegExp
  getActionSequence: () => ActionSequence
}

const connectors: Connector[] = [
  practicePantherConnector
]

export function getConnectorForUrl(url: string): Connector | null {
  for (const connector of connectors) {
    if (connector.urlPattern.test(url)) {
      return connector
    }
  }
  return null
}

export function getPrebuiltActionSequence(url: string): ActionSequence | null {
  const connector = getConnectorForUrl(url)
  if (connector) {
    return connector.getActionSequence()
  }
  return null
}

export function hasPrebuiltConnector(url: string): boolean {
  return getConnectorForUrl(url) !== null
}

export { practicePantherConnector }
