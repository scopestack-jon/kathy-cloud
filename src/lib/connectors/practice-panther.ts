import type { ActionSequence, RecordedAction } from '../types/actions'
import type { Connector } from './index'

const PRACTICE_PANTHER_URL_PATTERN = /app\.practicepanther\.com/i

const practicePantherActions: RecordedAction[] = [
  {
    id: 'pp-status-dropdown',
    type: 'click',
    selector: {
      cssPath: 'td[data-field="status"] .k-dropdown, td.status-column .dropdown-toggle, [data-kendo-dropdown]',
      dataAttributes: {
        'data-field': 'status'
      }
    },
    timestamp: 0
  },
  {
    id: 'pp-select-paid',
    type: 'click',
    selector: {
      cssPath: '.k-list .k-item:contains("Paid"), .dropdown-menu li:contains("Paid"), [data-value="Paid"]',
      textContent: 'Paid'
    },
    timestamp: 0
  }
]

export const practicePantherConnector: Connector = {
  name: 'Practice Panther',
  urlPattern: PRACTICE_PANTHER_URL_PATTERN,

  getActionSequence(): ActionSequence {
    return {
      id: 'practice-panther-default',
      applicationName: 'Practice Panther',
      urlPattern: 'app\\.practicepanther\\.com',
      actions: practicePantherActions.map(action => ({
        ...action,
        timestamp: Date.now()
      })),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }
  }
}

export function isPracticePanther(url: string): boolean {
  return PRACTICE_PANTHER_URL_PATTERN.test(url)
}
