import { engine, Transform, inputSystem, InputAction, Entity, Animator } from '@dcl/sdk/ecs'
import { Vector3, Quaternion } from '@dcl/sdk/math'
import { FighterComponent, ARENA_CONFIG, AnimationState, GameState } from './components'
import { getGameState } from './factory'

// Movement constants
const MOVEMENT_SPEED = 3.0
const ENEMY_SPEED = 2.1

// Combat constants
const COMBO_TIMEOUT = 1.5 // Seconds between hits to maintain combo

// Track hit detection per attack animation
const pendingHitChecks = new Map<Entity, number>()

/**
 * Setup input event listeners (call once in main)
 * Note: SDK7 uses inputSystem.isPressed() for polling, not events
 */
export function setupInputs() {
  console.log('✅ Input system ready (using SDK7 inputSystem)')
  // SDK7 uses inputSystem.isPressed() for input polling
  // No setup needed - inputs checked per-frame in movement system
}

/**
 * Get fighter by role (replaces global entity refs)
 */
function getFighterByRole(isPlayer: boolean): Entity | null {
  for (const [entity, fighter] of engine.getEntitiesWith(FighterComponent)) {
    if (fighter.isPlayer === isPlayer) return entity
  }
  return null
}

/**
 * Play animation with proper state management
 */
export function playAnimation(entity: Entity, animationName: AnimationState, durationMs?: number) {
  const animator = Animator.getMutableOrNull(entity)
  const fighter = FighterComponent.getMutableOrNull(entity)

  if (!animator || !fighter) return

  // Stop all animations first for clean transition
  for (const state of animator.states) {
    state.playing = false
  }

  // Play target animation
  const targetState = animator.states.find((s) => s.clip === animationName)
  if (targetState) {
    targetState.playing = true
    targetState.speed = 1.0
    fighter.currentAnimation = animationName

    // Set timer if duration provided
    if (durationMs) {
      fighter.animationTimer = durationMs / 1000
    }
  }
}

/**
 * Reset fighter to idle animation
 */
function resetToIdle(entity: Entity) {
  const animator = Animator.getMutableOrNull(entity)
  const fighter = FighterComponent.getMutableOrNull(entity)

  if (!animator || !fighter) return

  for (const state of animator.states) {
    state.playing = state.clip === 'idle'
  }
  fighter.currentAnimation = 'idle'
  fighter.animationTimer = 0
}

/**
 * Unified timer system - handles all timing (animations, i-frames, hit checks, cooldowns)
 */
export function unifiedTimerSystem(dt: number) {
  // Update per-fighter timers
  for (const [entity, fighter] of engine.getEntitiesWith(FighterComponent)) {
    const mutableFighter = FighterComponent.getMutable(entity)

    // Invincibility frames (prevents damage spam)
    if (mutableFighter.invincibilityTimer > 0) {
      mutableFighter.invincibilityTimer -= dt
    }

    // Attack cooldown
    if (mutableFighter.attackCooldown > 0) {
      mutableFighter.attackCooldown -= dt
    }

    // Animation timer
    if (mutableFighter.animationTimer > 0) {
      mutableFighter.animationTimer -= dt

      if (mutableFighter.animationTimer <= 0) {
        resetToIdle(entity)
      }
    }
  }

  // Hit detection timers (mid-animation hit checks)
  for (const [entity, timer] of pendingHitChecks.entries()) {
    const newTimer = timer - dt
    if (newTimer <= 0) {
      pendingHitChecks.delete(entity)
      checkAttackHit(entity)
    } else {
      pendingHitChecks.set(entity, newTimer)
    }
  }
}

/**
 * Player input and movement system (event-driven, normalized diagonals)
 */
export function playerMovementSystem(dt: number) {
  // Check if match has started (countdown finished)
  const gameStateEntity = getGameState()
  if (gameStateEntity) {
    const gameState = GameState.getOrNull(gameStateEntity)
    if (gameState && (gameState.countdownTimer > 0 || !gameState.isMatchActive)) {
      return // Don't allow movement during countdown or after match end
    }
  }

  const player = getFighterByRole(true)
  if (!player) return

  const transform = Transform.getMutableOrNull(player)
  const fighter = FighterComponent.getMutableOrNull(player)

  if (!transform || !fighter) return

  // Skip if dead, animation-locked, or invincible
  if (fighter.health <= 0) return
  if (fighter.animationTimer > 0 || fighter.invincibilityTimer > 0) {
    return
  }

  // Read input using SDK7 inputSystem (polling-based)
  let moveX = 0
  let moveZ = 0

  if (inputSystem.isPressed(InputAction.IA_RIGHT)) moveX += 1 // D key
  if (inputSystem.isPressed(InputAction.IA_LEFT)) moveX -= 1 // A key
  if (inputSystem.isPressed(InputAction.IA_FORWARD)) moveZ += 1 // W key
  if (inputSystem.isPressed(InputAction.IA_BACKWARD)) moveZ -= 1 // S key

  const movement = Vector3.create(moveX, 0, moveZ)
  const movementLength = Vector3.length(movement)

  // Apply movement with normalized diagonals
  if (movementLength > 0.1) {
    const normalizedMovement = Vector3.normalize(movement)
    const velocity = Vector3.scale(normalizedMovement, MOVEMENT_SPEED * dt)

    // Direct movement (no lerp to prevent "running in place" visuals)
    let newPosition = Vector3.add(transform.position, velocity)

    // Constrain to arena bounds
    newPosition.x = Math.max(ARENA_CONFIG.xMin, Math.min(ARENA_CONFIG.xMax, newPosition.x))
    newPosition.z = Math.max(ARENA_CONFIG.zMin, Math.min(ARENA_CONFIG.zMax, newPosition.z))
    newPosition.y = 0 // Keep on ground

    transform.position = newPosition

    // Play run animation
    if (fighter.currentAnimation !== 'run') {
      playAnimation(player, 'run')
    }

    // Smooth rotation toward movement direction
    const moveAngle = Math.atan2(moveX, moveZ) * (180 / Math.PI)
    const targetRotation = Quaternion.fromEulerDegrees(0, moveAngle, 0)
    transform.rotation = Quaternion.slerp(transform.rotation, targetRotation, dt * 5)
  } else if (fighter.currentAnimation !== 'idle') {
    // Return to idle when not moving
    playAnimation(player, 'idle')
  }

  // Attack input (E key or Primary button) with cooldown
  if (inputSystem.isPressed(InputAction.IA_PRIMARY) && fighter.attackCooldown <= 0) {
    performAttack(player)
  }
}

/**
 * Perform attack with cooldown management
 */
function performAttack(attacker: Entity) {
  const fighter = FighterComponent.getMutableOrNull(attacker)
  if (!fighter) return

  playAnimation(attacker, 'attack', 800) // 0.8 second attack animation

  // Set cooldown
  fighter.attackCooldown = 0.8

  // Schedule hit detection for mid-attack (0.4 seconds)
  pendingHitChecks.set(attacker, 0.4)
}

/**
 * Check if attack hits opponent
 */
function checkAttackHit(attacker: Entity) {
  const attackerTransform = Transform.getOrNull(attacker)
  const attackerFighter = FighterComponent.getOrNull(attacker)

  if (!attackerTransform || !attackerFighter) return

  // Find opponent
  const opponent = getFighterByRole(!attackerFighter.isPlayer)
  if (!opponent) return

  const opponentTransform = Transform.getOrNull(opponent)
  const opponentFighter = FighterComponent.getOrNull(opponent)

  if (!opponentTransform || !opponentFighter) return

  // Check if opponent is invincible (i-frames)
  if (opponentFighter.invincibilityTimer > 0) return

  // Check distance
  const distance = Vector3.distance(attackerTransform.position, opponentTransform.position)
  const hitRange = 2.5

  if (distance < hitRange) {
    // Hit landed!
    applyDamage(opponent, 15)
    console.log(`💥 ${attackerFighter.isPlayer ? 'Player' : 'Enemy'} hit! Distance: ${distance.toFixed(2)}m`)
  }
}

/**
 * Apply damage with i-frames and combo tracking
 */
function applyDamage(target: Entity, amount: number) {
  const fighter = FighterComponent.getMutableOrNull(target)
  if (!fighter) return

  // Skip if invincible
  if (fighter.invincibilityTimer > 0) return

  // Update game state for combo tracking
  const gameStateEntity = getGameState()
  if (gameStateEntity) {
    const gameState = GameState.getMutableOrNull(gameStateEntity)
    if (gameState) {
      const currentTime = Date.now() / 1000 // Convert to seconds

      // Check if this continues a combo (within timeout window)
      if (currentTime - gameState.lastHitTime < COMBO_TIMEOUT) {
        gameState.comboCount += 1
        console.log(`🔥 ${gameState.comboCount} HIT COMBO!`)
      } else {
        gameState.comboCount = 1 // Reset combo
      }

      gameState.lastHitTime = currentTime
    }
  }

  fighter.health = Math.max(0, fighter.health - amount)
  console.log(`${fighter.isPlayer ? 'Player' : 'Enemy'} HP: ${fighter.health}/${fighter.maxHealth}`)

  // Grant i-frames to prevent spam damage
  fighter.invincibilityTimer = 0.3

  if (fighter.health > 0) {
    playAnimation(target, 'impact', 500) // Hit reaction
  } else {
    // KO detected! Play die animation
    console.log(`💀 ${fighter.isPlayer ? 'Player' : 'Enemy'} is KO'd!`)

    // Play die animation (one-shot, stays at final frame)
    const animator = Animator.getMutableOrNull(target)
    if (animator) {
      for (const state of animator.states) {
        state.playing = false
      }
      const dieState = animator.states.find((s) => s.clip === 'die')
      if (dieState) {
        dieState.playing = true
        dieState.loop = false // Play once and stop at last frame
      }
    }

    fighter.currentAnimation = 'die'
    fighter.animationTimer = 99999

    // Update game state
    if (gameStateEntity) {
      const gameState = GameState.getMutableOrNull(gameStateEntity)
      if (gameState) {
        gameState.isMatchActive = false
        gameState.winner = fighter.isPlayer ? 'enemy' : 'player'
        console.log(`🏆 ${gameState.winner.toUpperCase()} WINS!`)
      }
    }
  }
}

/**
 * Reset match - called when player clicks "Restart Match"
 */
export function resetMatch() {
  console.log('🔄 Resetting match...')

  // Reset player
  const player = getFighterByRole(true)
  if (player) {
    const playerFighter = FighterComponent.getMutableOrNull(player)
    const playerTransform = Transform.getMutableOrNull(player)
    const playerAnimator = Animator.getMutableOrNull(player)

    if (playerFighter && playerTransform) {
      playerFighter.health = playerFighter.maxHealth
      playerFighter.animationTimer = 0
      playerFighter.invincibilityTimer = 0
      playerFighter.attackCooldown = 0
      playerTransform.position = Vector3.create(ARENA_CONFIG.player.x, ARENA_CONFIG.player.y, ARENA_CONFIG.player.z)
      playerTransform.rotation = Quaternion.fromEulerDegrees(0, 90, 0)

      // Reset animations
      if (playerAnimator) {
        for (const state of playerAnimator.states) {
          state.playing = state.clip === 'idle'
        }
      }

      playerFighter.currentAnimation = 'idle'
    }
  }

  // Reset enemy
  const enemy = getFighterByRole(false)
  if (enemy) {
    const enemyFighter = FighterComponent.getMutableOrNull(enemy)
    const enemyTransform = Transform.getMutableOrNull(enemy)
    const enemyAnimator = Animator.getMutableOrNull(enemy)

    if (enemyFighter && enemyTransform) {
      enemyFighter.health = enemyFighter.maxHealth
      enemyFighter.animationTimer = 0
      enemyFighter.invincibilityTimer = 0
      enemyFighter.attackCooldown = 0
      enemyTransform.position = Vector3.create(ARENA_CONFIG.enemy.x, ARENA_CONFIG.enemy.y, ARENA_CONFIG.enemy.z)
      enemyTransform.rotation = Quaternion.fromEulerDegrees(0, -90, 0)

      // Reset animations
      if (enemyAnimator) {
        for (const state of enemyAnimator.states) {
          state.playing = state.clip === 'idle'
        }
      }

      enemyFighter.currentAnimation = 'idle'
    }
  }

  // Reset game state with countdown
  const gameStateEntity = getGameState()
  if (gameStateEntity) {
    const gameState = GameState.getMutableOrNull(gameStateEntity)
    if (gameState) {
      gameState.isMatchActive = false
      gameState.winner = ''
      gameState.comboCount = 0
      gameState.lastHitTime = 0
      gameState.countdownTimer = 3.0
      gameState.roundNumber += 1
    }
  }

  console.log('✅ Match reset - countdown starting!')
}

/**
 * Game state system - handles match flow, countdown, and combo resets
 */
export function gameStateSystem(dt: number) {
  const gameStateEntity = getGameState()
  if (!gameStateEntity) return

  const gameState = GameState.getMutableOrNull(gameStateEntity)
  if (!gameState) return

  // Handle countdown timer at match start
  if (gameState.countdownTimer > 0) {
    gameState.countdownTimer -= dt

    if (gameState.countdownTimer <= 0) {
      gameState.countdownTimer = 0
      gameState.isMatchActive = true
      console.log('🥊 FIGHT!')
    }
    return // Don't process other logic during countdown
  }

  // Reset combo if timeout expired
  const currentTime = Date.now() / 1000
  if (gameState.comboCount > 0 && currentTime - gameState.lastHitTime > COMBO_TIMEOUT) {
    gameState.comboCount = 0
  }

  // Prevent movement if match is over
  if (!gameState.isMatchActive) {
    // Match is over
  }
}

/**
 * Enhanced enemy AI system with states
 */
export function enemyAISystem(dt: number) {
  // Check if match has started (countdown finished)
  const gameStateEntity = getGameState()
  if (gameStateEntity) {
    const gameState = GameState.getOrNull(gameStateEntity)
    if (gameState && (gameState.countdownTimer > 0 || !gameState.isMatchActive)) {
      return // Don't allow AI movement during countdown or after match end
    }
  }

  const enemy = getFighterByRole(false)
  const player = getFighterByRole(true)

  if (!enemy || !player) return

  const enemyTransform = Transform.getMutableOrNull(enemy)
  const enemyFighter = FighterComponent.getMutableOrNull(enemy)
  const playerTransform = Transform.getOrNull(player)
  const playerFighter = FighterComponent.getOrNull(player)

  if (!enemyTransform || !enemyFighter || !playerTransform || !playerFighter) return

  // Don't act if dead or during animations/i-frames
  if (enemyFighter.health <= 0 || playerFighter.health <= 0) return
  if (enemyFighter.animationTimer > 0 || enemyFighter.invincibilityTimer > 0) return

  // Calculate distance to player
  const distance = Vector3.distance(enemyTransform.position, playerTransform.position)
  const rand = Math.random()

  // AI behavior based on distance
  if (distance > 2.2) {
    // Chase player
    const direction = Vector3.subtract(playerTransform.position, enemyTransform.position)
    direction.y = 0
    const normalizedDirection = Vector3.normalize(direction)
    const velocity = Vector3.scale(normalizedDirection, ENEMY_SPEED * dt)

    let newPosition = Vector3.add(enemyTransform.position, velocity)

    // Constrain to arena
    newPosition.x = Math.max(ARENA_CONFIG.xMin, Math.min(ARENA_CONFIG.xMax, newPosition.x))
    newPosition.z = Math.max(ARENA_CONFIG.zMin, Math.min(ARENA_CONFIG.zMax, newPosition.z))
    newPosition.y = 0

    enemyTransform.position = newPosition

    if (enemyFighter.currentAnimation !== 'run') {
      playAnimation(enemy, 'run')
    }
  } else if (distance <= 2.2) {
    // In attack range - attack more frequently
    if (rand < 0.05 && enemyFighter.attackCooldown <= 0) {
      // ~5% chance per frame = attacks every ~1 second when in range
      performAttack(enemy)
    } else if (enemyFighter.currentAnimation !== 'idle' && enemyFighter.currentAnimation !== 'attack') {
      playAnimation(enemy, 'idle')
    }
  }

  // Smooth facing toward player
  const toPlayer = Vector3.subtract(playerTransform.position, enemyTransform.position)
  toPlayer.y = 0
  if (Vector3.length(toPlayer) > 0.1) {
    const angle = Math.atan2(toPlayer.x, toPlayer.z) * (180 / Math.PI)
    const targetRotation = Quaternion.fromEulerDegrees(0, angle, 0)
    enemyTransform.rotation = Quaternion.slerp(enemyTransform.rotation, targetRotation, dt * 3)
  }
}

/**
 * Facing system - enemy already faces player in enemyAISystem
 * Player faces movement direction in playerMovementSystem
 * This system is kept for compatibility but does nothing
 */
export function facingSystem(dt: number) {
  // Facing is now handled in individual movement systems
  // Enemy: handled in enemyAISystem
  // Player: handled in playerMovementSystem
}

// Legacy exports for compatibility
export function setFighterEntities(player: Entity, enemy: Entity) {
  // No longer needed - using component queries
  console.log('✅ Fighter entities set (using component queries)')
}

export function getPlayerEntity() {
  return getFighterByRole(true)
}

export function getEnemyEntity() {
  return getFighterByRole(false)
}
