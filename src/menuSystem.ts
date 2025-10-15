/**
 * Menu System - Handles menu flow and battle initialization
 */

import { engine, Entity } from '@dcl/sdk/ecs'
import { Vector3, Quaternion } from '@dcl/sdk/math'
import { MenuStateComponent, getMenuState, getCharacterById, getStageById } from './menuState'
import { createArena, createFighter, createGameState, removeArena, resetGameState, getGameState } from './factory'
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
import { ARENA_CONFIG } from './components'
import { lockAvatar } from './avatarLock'

let battleInitialized = false
let systemsRegistered = false // Track if systems are already added
let playerFighterEntity: Entity | null = null
let enemyFighterEntity: Entity | null = null

/**
 * Menu flow system - handles loading timer and battle initialization
 */
export function menuFlowSystem(dt: number) {
  const menuStateEntity = getMenuState()
  if (!menuStateEntity) return

  const menuState = MenuStateComponent.getMutableOrNull(menuStateEntity)
  if (!menuState) return

  // Handle loading screen timer
  if (menuState.currentScreen === 'loading') {
    menuState.loadingTimer += dt

    if (menuState.loadingTimer >= 2.0) {
      // Loading complete - start battle!
      menuState.currentScreen = 'battle'
      menuState.loadingTimer = 0
      console.log('⚔️ Loading complete - Starting battle!')
    }
  }

  // Initialize battle when screen changes to 'battle'
  if (menuState.currentScreen === 'battle' && !battleInitialized) {
    initializeBattle(menuState.playerCharacterId, menuState.enemyCharacterId, menuState.stageId)
    battleInitialized = true
  }
}

/**
 * Initialize the battle with selected characters and stage
 */
function initializeBattle(playerCharId: string, enemyCharId: string, stageId: string) {
  console.log('🥊 Initializing battle...')
  console.log(`  Player: ${playerCharId}`)
  console.log(`  Enemy: ${enemyCharId}`)
  console.log(`  Stage: ${stageId}`)

  // Clean up old entities from previous match
  if (playerFighterEntity) {
    engine.removeEntity(playerFighterEntity)
    playerFighterEntity = null
  }
  if (enemyFighterEntity) {
    engine.removeEntity(enemyFighterEntity)
    enemyFighterEntity = null
  }
  removeArena()
  const oldGameState = getGameState()
  if (oldGameState) {
    engine.removeEntity(oldGameState)
    resetGameState()
  }

  // Get character data
  const playerChar = getCharacterById(playerCharId as any)
  const enemyChar = getCharacterById(enemyCharId as any)
  const stage = getStageById(stageId as any)

  if (!playerChar || !enemyChar || !stage) {
    console.error('❌ Failed to get character or stage data!')
    return
  }

  // Setup input system
  setupInputs()
  console.log('✅ Input system initialized')

  // Create game state
  createGameState()
  console.log('✅ Game state initialized')

  // Create arena with selected stage skybox
  createArena(stage.skyboxFolder)
  console.log(`✅ Arena created (Stage: ${stage.name})`)

  // Setup camera
  setupLockedCamera()
  console.log('✅ Camera locked')

  // Spawn fighters
  playerFighterEntity = createFighter(
    playerChar.modelPath,
    Vector3.create(ARENA_CONFIG.player.x, ARENA_CONFIG.player.y, ARENA_CONFIG.player.z),
    Quaternion.fromEulerDegrees(0, 90, 0),
    true
  )
  console.log(`✅ ${playerChar.name} spawned`)

  enemyFighterEntity = createFighter(
    enemyChar.modelPath,
    Vector3.create(ARENA_CONFIG.enemy.x, ARENA_CONFIG.enemy.y, ARENA_CONFIG.enemy.z),
    Quaternion.fromEulerDegrees(0, -90, 0),
    false
  )
  console.log(`✅ ${enemyChar.name} spawned`)

  // Link fighters
  setFighterEntities(playerFighterEntity, enemyFighterEntity)
  console.log('✅ Fighter entities linked')

  // Lock avatar
  lockAvatar()
  console.log('✅ Avatar locked')

  // Register game systems (only once!)
  if (!systemsRegistered) {
    engine.addSystem(gameStateSystem)
    engine.addSystem(unifiedTimerSystem)
    engine.addSystem(playerMovementSystem)
    engine.addSystem(enemyAISystem)
    engine.addSystem(facingSystem)
    systemsRegistered = true
    console.log('✅ Game systems registered')
  } else {
    console.log('✅ Game systems already registered (reusing)')
  }

  console.log('⚔️ BATTLE START!')
}

/**
 * Reset battle and return to menu
 */
export function returnToMainMenu() {
  console.log('🔙 Returning to main menu...')

  // Clean up visible entities
  if (playerFighterEntity) {
    engine.removeEntity(playerFighterEntity)
    playerFighterEntity = null
  }
  if (enemyFighterEntity) {
    engine.removeEntity(enemyFighterEntity)
    enemyFighterEntity = null
  }
  removeArena()

  const oldGameState = getGameState()
  if (oldGameState) {
    engine.removeEntity(oldGameState)
    resetGameState()
  }

  // Reset menu state to show title
  const menuStateEntity = getMenuState()
  if (menuStateEntity) {
    const menuState = MenuStateComponent.getMutable(menuStateEntity)
    menuState.currentScreen = 'title'
    menuState.playerCharacterId = ''
    menuState.enemyCharacterId = ''
    menuState.stageId = ''
    menuState.selectingPlayer = true
    menuState.loadingTimer = 0
  }

  // Reset battle flag
  battleInitialized = false

  console.log('✅ Back to title screen')
}
