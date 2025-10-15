// Tekken-Style Fighting Game for Decentraland SDK7
// With Mortal Kombat-style Menus

import { engine } from '@dcl/sdk/ecs'
import { createMenuState } from './menuState'
import { setupUnifiedUi } from './unifiedUi'
import { menuFlowSystem } from './menuSystem'

export function main() {
  console.log('🥊 FRIGHT NIGHT - Fighting Game Starting...')

  // 1. Create menu state (starts at title screen)
  createMenuState()
  console.log('✅ Menu state initialized')

  // 2. Setup unified UI (switches between menu and battle)
  setupUnifiedUi()
  console.log('✅ Unified UI initialized')

  // 3. Register menu flow system (handles loading and battle init)
  engine.addSystem(menuFlowSystem)
  console.log('✅ Menu flow system registered')

  console.log('')
  console.log('🎮 TITLE SCREEN READY!')
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  console.log('Welcome to FRIGHT NIGHT')
  console.log('Choose your fighter and begin!')
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
}
