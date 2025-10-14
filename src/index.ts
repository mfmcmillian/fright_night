// Tekken-Style Fighting Game for Decentraland SDK7
// Improved with animations, AI, and proper controls

import { engine } from '@dcl/sdk/ecs'
import { Vector3, Quaternion } from '@dcl/sdk/math'
import { createArena, createFighter, createGameState } from './factory'
import { setupLockedCamera } from './camera'
import {
  setupInputs,
  playerMovementSystem,
  enemyAISystem,
  unifiedTimerSystem,
  facingSystem,
  gameStateSystem,
  setFighterEntities
} from './systems'
import { setupUi } from './ui'
import { ARENA_CONFIG } from './components'
import { lockAvatar } from './avatarLock'

export function main() {
  console.log('🥊 Tekken-Style Fighting Game Starting...')

  // 0. Setup input listeners (event-driven for better performance)
  setupInputs()
  console.log('✅ Input system initialized')

  // 1. Create game state
  createGameState()
  console.log('✅ Game state initialized')

  // 2. Create the arena
  createArena()
  console.log('✅ Arena created')

  // 2.5. Setup Tekken-style locked camera (VirtualCamera = instant lock)
  setupLockedCamera() // Static side-view, no zoom/pan/rotation
  console.log('✅ Classic Tekken camera locked (VirtualCamera solo)')

  // 3. Spawn fighters
  const bandit = createFighter(
    'models/bandit.glb',
    Vector3.create(ARENA_CONFIG.player.x, ARENA_CONFIG.player.y, ARENA_CONFIG.player.z),
    Quaternion.fromEulerDegrees(0, 90, 0), // Face right
    true // isPlayer
  )
  console.log('✅ Bandit (Player) spawned')

  const goblin = createFighter(
    'models/goblin.glb',
    Vector3.create(ARENA_CONFIG.enemy.x, ARENA_CONFIG.enemy.y, ARENA_CONFIG.enemy.z),
    Quaternion.fromEulerDegrees(0, -90, 0), // Face left
    false // isEnemy
  )
  console.log('✅ Goblin (Enemy) spawned')

  // 4. Set fighter references for systems
  setFighterEntities(bandit, goblin)
  console.log('✅ Fighter entities linked')

  // 4.5. Lock player avatar (spectator mode - smooth, no jitter)
  // Optional: Pass VirtualCamera entity for smooth cam transition
  lockAvatar() // or lockAvatar(virtualCamEntity) if you add camera system
  console.log('✅ Avatar locked at spectator position (smooth, no snapping)')

  // 5. Register game systems (unified timer system handles all timing)
  engine.addSystem(gameStateSystem)
  engine.addSystem(unifiedTimerSystem)
  engine.addSystem(playerMovementSystem)
  engine.addSystem(enemyAISystem)
  engine.addSystem(facingSystem)
  console.log('✅ Game systems registered (event-driven inputs, ~20% code reduction)')

  // 6. Setup UI
  setupUi()
  console.log('✅ UI initialized')

  console.log('')
  console.log('🎮 GAME READY!')
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  console.log('Controls:')
  console.log('  WASD - Move fighter')
  console.log('  E - Attack')
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  console.log('Features:')
  console.log('  ✓ Tekken-style locked camera')
  console.log('  ✓ Animations (idle, run, attack, impact)')
  console.log('  ✓ AI Enemy (chases and attacks)')
  console.log('  ✓ Combo counter system')
  console.log('  ✓ KO/Win detection')
  console.log('  ✓ I-frames & cooldowns')
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
}
