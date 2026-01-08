import React, { useState, useEffect } from "react"
import { createRoot } from "react-dom/client"
import { KathyPanel, PanelEntity } from "./KathyPanel"

// Global state for the panel
interface PanelState {
  isOpen: boolean
  entity: PanelEntity | null
}

// Event system for cross-script communication
const PANEL_EVENTS = {
  OPEN: "kathy:panel:open",
  CLOSE: "kathy:panel:close",
  UPDATE: "kathy:panel:update"
}

// Panel Manager Component
const PanelManagerComponent: React.FC = () => {
  const [state, setState] = useState<PanelState>({
    isOpen: false,
    entity: null
  })
  
  useEffect(() => {
    // Listen for panel events
    const handleOpen = (event: CustomEvent) => {
      setState({
        isOpen: true,
        entity: event.detail.entity
      })
    }
    
    const handleClose = () => {
      setState({
        isOpen: false,
        entity: null
      })
    }
    
    const handleUpdate = (event: CustomEvent) => {
      setState(prev => ({
        ...prev,
        entity: event.detail.entity
      }))
    }
    
    document.addEventListener(PANEL_EVENTS.OPEN, handleOpen as EventListener)
    document.addEventListener(PANEL_EVENTS.CLOSE, handleClose)
    document.addEventListener(PANEL_EVENTS.UPDATE, handleUpdate as EventListener)
    
    return () => {
      document.removeEventListener(PANEL_EVENTS.OPEN, handleOpen as EventListener)
      document.removeEventListener(PANEL_EVENTS.CLOSE, handleClose)
      document.removeEventListener(PANEL_EVENTS.UPDATE, handleUpdate as EventListener)
    }
  }, [])
  
  return (
    <KathyPanel
      isOpen={state.isOpen}
      entity={state.entity}
      onClose={() => {
        document.dispatchEvent(new CustomEvent(PANEL_EVENTS.CLOSE))
      }}
    />
  )
}

// Singleton Panel Manager
class PanelManager {
  private static instance: PanelManager
  private container: HTMLDivElement | null = null
  private root: any = null
  
  private constructor() {
    this.initialize()
  }
  
  static getInstance(): PanelManager {
    if (!PanelManager.instance) {
      PanelManager.instance = new PanelManager()
    }
    return PanelManager.instance
  }
  
  private initialize() {
    if (this.container) return
    
    // Create container
    this.container = document.createElement("div")
    this.container.id = "kathy-panel-root"
    this.container.style.cssText = "all: initial; position: fixed; z-index: 999997;"
    document.body.appendChild(this.container)
    
    // Create React root
    this.root = createRoot(this.container)
    this.root.render(<PanelManagerComponent />)
  }
  
  open(entity: PanelEntity) {
    document.dispatchEvent(new CustomEvent(PANEL_EVENTS.OPEN, {
      detail: { entity }
    }))
  }
  
  close() {
    document.dispatchEvent(new CustomEvent(PANEL_EVENTS.CLOSE))
  }
  
  update(entity: PanelEntity) {
    document.dispatchEvent(new CustomEvent(PANEL_EVENTS.UPDATE, {
      detail: { entity }
    }))
  }
  
  toggle(entity?: PanelEntity) {
    // If entity is provided, always open with that entity
    // If no entity, just close
    if (entity) {
      this.open(entity)
    } else {
      this.close()
    }
  }
}

// Export singleton instance
export const panelManager = PanelManager.getInstance()

// Export types
export type { PanelEntity }
export { PANEL_EVENTS }

