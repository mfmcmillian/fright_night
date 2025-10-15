/**
 * Unified UI System - Switches between Menu UI and Battle UI based on menu state
 */

import ReactEcs, { ReactEcsRenderer, UiEntity } from '@dcl/sdk/react-ecs'
import { MenuStateComponent, getMenuState } from './menuState'
import { menuUiComponent } from './menuUi'
import { battleUiComponent } from './ui'

export function setupUnifiedUi() {
  ReactEcsRenderer.setUiRenderer(unifiedUiComponent)
}

const unifiedUiComponent = () => {
  const menuStateEntity = getMenuState()
  const menuState = menuStateEntity ? MenuStateComponent.getOrNull(menuStateEntity) : null
  
  if (!menuState) {
    // No menu state yet, show nothing
    return null
  }

  // Switch between menu and battle UI based on current screen
  if (menuState.currentScreen === 'battle') {
    // Show battle UI
    return battleUiComponent()
  } else {
    // Show menu UI (title, character select, stage select, loading)
    return menuUiComponent()
  }
}


