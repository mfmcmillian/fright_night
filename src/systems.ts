import { engine, Transform, inputSystem, InputAction, Entity, Animator } from '@dcl/sdk/ecs'
import { Vector3, Quaternion } from '@dcl/sdk/math'
import { FighterComponent, ARENA_CONFIG, AnimationState, GameState } from './components'
import { getGameState } from './factory'

// Movement constants
const MOVEMENT_SPEED = 4.0 // Faster movement for more tactical positioning
const ENEMY_SPEED = 3.2 // AI needs to keep up

// Combat constants
const COMBO_TIMEOUT = 1.5 // Seconds between hits to maintain combo
const KNOCKBACK_FORCE = 1.5 // Distance to push opponent back
const KNOCKBACK_DURATION = 0.25 // Smooth knockback over 0.25s
const STUN_DURATION = 0.2 // Hit stun duration
const HIT_RANGE = 2.0 // Shorter range - must get close to hit (down from 2.5)

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

    // Stun timer (blocks all actions)
    if (mutableFighter.stunTimer > 0) {
      mutableFighter.stunTimer -= dt
    }

    // Animation timer
    if (mutableFighter.animationTimer > 0) {
      mutableFighter.animationTimer -= dt

      if (mutableFighter.animationTimer <= 0) {
        resetToIdle(entity)
      }
    }

    // Knockback slide (smooth pushback over time)
    if (mutableFighter.knockbackActive) {
      mutableFighter.knockbackProgress += dt / KNOCKBACK_DURATION
      const progress = Math.min(1, mutableFighter.knockbackProgress)

      // Ease out for smooth deceleration
      const easeProgress = 1 - Math.pow(1 - progress, 3)

      // Reconstruct knockback direction
      const knockbackDir = Vector3.create(
        mutableFighter.knockbackDirX,
        mutableFighter.knockbackDirY,
        mutableFighter.knockbackDirZ
      )

      // Apply smooth slide (slows down over time)
      const slideSpeed = (KNOCKBACK_FORCE / KNOCKBACK_DURATION) * (1 - easeProgress)
      const slideDistance = Vector3.scale(knockbackDir, slideSpeed * dt)

      const transform = Transform.getMutable(entity)
      let newPos = Vector3.add(transform.position, slideDistance)

      // Constrain to arena
      newPos.x = Math.max(ARENA_CONFIG.xMin, Math.min(ARENA_CONFIG.xMax, newPos.x))
      newPos.z = Math.max(ARENA_CONFIG.zMin, Math.min(ARENA_CONFIG.zMax, newPos.z))
      newPos.y = 0

      transform.position = newPos

      // End knockback when complete
      if (progress >= 1) {
        mutableFighter.knockbackActive = false
        mutableFighter.knockbackProgress = 0
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

  // Skip if dead, animation-locked, stunned, OR during attack cooldown grace period
  if (fighter.health <= 0) return
  if (fighter.animationTimer > 0 || fighter.stunTimer > 0) {
    return
  }

  // Prevent movement during early attack cooldown (prevents run animation flicker when spamming E)
  const isInAttackRecovery = fighter.attackCooldown > 0.6 // First 0.2s of 0.8s cooldown
  if (isInAttackRecovery) {
    // Still allow blocking during recovery, but no movement
    const isBlocking = inputSystem.isPressed(InputAction.IA_SECONDARY)
    if (isBlocking && fighter.currentAnimation !== 'block') {
      fighter.blocking = true
      playAnimation(player, 'block')
    } else if (!isBlocking && fighter.currentAnimation === 'block') {
      fighter.blocking = false
      playAnimation(player, 'idle')
    }
    return // Block movement input during attack recovery
  }

  // Block input (F key = IA_SECONDARY) - Blocks movement but not attacks
  const isBlocking = inputSystem.isPressed(InputAction.IA_SECONDARY)

  if (isBlocking) {
    fighter.blocking = true
    if (fighter.currentAnimation !== 'block') {
      playAnimation(player, 'block')
    }
  } else {
    fighter.blocking = false
  }

  // Read input using SDK7 inputSystem (polling-based)
  let moveX = 0
  let moveZ = 0

  // Can't move while blocking
  if (!isBlocking) {
    if (inputSystem.isPressed(InputAction.IA_RIGHT)) moveX += 1 // D key
    if (inputSystem.isPressed(InputAction.IA_LEFT)) moveX -= 1 // A key
    if (inputSystem.isPressed(InputAction.IA_FORWARD)) moveZ += 1 // W key
    if (inputSystem.isPressed(InputAction.IA_BACKWARD)) moveZ -= 1 // S key
  }

  const movement = Vector3.create(moveX, 0, moveZ)
  const movementLength = Vector3.length(movement)

  // Apply movement with normalized diagonals (only if not blocking)
  if (movementLength > 0.1 && !isBlocking) {
    const normalizedMovement = Vector3.normalize(movement)
    const velocity = Vector3.scale(normalizedMovement, MOVEMENT_SPEED * dt)

    // Direct movement (no lerp to prevent "running in place" visuals)
    let newPosition = Vector3.add(transform.position, velocity)

    // Constrain to arena bounds
    newPosition.x = Math.max(ARENA_CONFIG.xMin, Math.min(ARENA_CONFIG.xMax, newPosition.x))
    newPosition.z = Math.max(ARENA_CONFIG.zMin, Math.min(ARENA_CONFIG.zMax, newPosition.z))
    newPosition.y = 0 // Keep on ground

    transform.position = newPosition

    // Play walk animation
    if (fighter.currentAnimation !== 'walk') {
      playAnimation(player, 'walk')
    }
  } else if (fighter.currentAnimation !== 'idle' && !isBlocking) {
    // Return to idle when not moving (and not blocking)
    playAnimation(player, 'idle')
  }

  // Attack input (E key or Primary button) with cooldown - Can attack while blocking (block-cancel into attack)
  if (inputSystem.isPressed(InputAction.IA_PRIMARY) && fighter.attackCooldown <= 0) {
    fighter.blocking = false // Cancel block on attack
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
  const hitRange = HIT_RANGE

  if (distance < hitRange) {
    // Check if opponent is blocking
    if (opponentFighter.blocking) {
      // Blocked! Reduce damage by 50%
      applyDamage(opponent, 7.5) // 15 * 0.5 = 7.5
      console.log(`🛡️ ${opponentFighter.isPlayer ? 'Player' : 'Enemy'} BLOCKED! Reduced damage`)

      // No knockback or stun on block, but play impact animation
      playAnimation(opponent, 'impact', 300)
    } else {
      // Hit landed unblocked!
      applyDamage(opponent, 15)

      // Check current combo count from game state
      const gameStateEntity = getGameState()
      const currentCombo = gameStateEntity ? GameState.getOrNull(gameStateEntity)?.comboCount || 0 : 0

      // Apply SMOOTH knockback ONLY on 3+ hit combos
      if (currentCombo >= 3) {
        const pushDir = Vector3.normalize(Vector3.subtract(opponentTransform.position, attackerTransform.position))
        const opponentMutableFighter = FighterComponent.getMutable(opponent)

        // Store knockback direction
        opponentMutableFighter.knockbackDirX = pushDir.x
        opponentMutableFighter.knockbackDirY = pushDir.y
        opponentMutableFighter.knockbackDirZ = pushDir.z

        // Activate smooth knockback slide
        opponentMutableFighter.knockbackActive = true
        opponentMutableFighter.knockbackProgress = 0

        console.log(`🔥 ${currentCombo} HIT COMBO! KNOCKBACK!`)
      }

      // Apply stun (blocks all actions for 0.2s) - always on hit
      const opponentMutableFighter = FighterComponent.getMutable(opponent)
      opponentMutableFighter.stunTimer = STUN_DURATION

      console.log(
        `💥 ${attackerFighter.isPlayer ? 'Player' : 'Enemy'} hit! Distance: ${distance.toFixed(2)}m | Stun applied!`
      )
    }
  } else {
    // WHIFF PUNISHMENT: Missed attack = longer cooldown (punish spam!)
    const attackerMutableFighter = FighterComponent.getMutable(attacker)
    attackerMutableFighter.attackCooldown += 0.3 // Add 0.3s penalty to cooldown
    console.log(`⚠️ ${attackerFighter.isPlayer ? 'Player' : 'Enemy'} WHIFFED! Longer recovery`)
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
      playerFighter.stunTimer = 0
      playerFighter.blocking = false
      playerFighter.knockbackActive = false
      playerFighter.knockbackProgress = 0
      playerFighter.knockbackDirX = 0
      playerFighter.knockbackDirY = 0
      playerFighter.knockbackDirZ = 0
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
      enemyFighter.stunTimer = 0
      enemyFighter.blocking = false
      enemyFighter.knockbackActive = false
      enemyFighter.knockbackProgress = 0
      enemyFighter.knockbackDirX = 0
      enemyFighter.knockbackDirY = 0
      enemyFighter.knockbackDirZ = 0
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

  // Don't act if dead or during animations/stun
  if (enemyFighter.health <= 0 || playerFighter.health <= 0) return
  if (enemyFighter.animationTimer > 0 || enemyFighter.stunTimer > 0) return

  // Calculate distance to player
  const distance = Vector3.distance(enemyTransform.position, playerTransform.position)
  const rand = Math.random()

  // Smart blocking logic - block when player is close and likely to attack
  const playerFighterState = FighterComponent.getOrNull(player)
  const shouldConsiderBlocking = distance < 2.5 && playerFighterState && playerFighterState.attackCooldown <= 0.3

  // AI decides to block (0.5% chance per frame = occasional blocking, not constant)
  if (shouldConsiderBlocking && rand < 0.005) {
    enemyFighter.blocking = true
    if (enemyFighter.currentAnimation !== 'block') {
      playAnimation(enemy, 'block')
    }
  } else if (rand < 0.01) {
    // Stop blocking with slightly higher chance to not get stuck
    enemyFighter.blocking = false
  }

  // AI behavior based on distance (only if not blocking)
  if (!enemyFighter.blocking) {
    // AGGRESSIVE: Punish player during their attack cooldown (they're vulnerable!)
    const playerIsVulnerable = playerFighterState && playerFighterState.attackCooldown > 0.4

    if (distance > 2.0) {
      // Chase player (adjusted to match new HIT_RANGE)
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

      if (enemyFighter.currentAnimation !== 'walk') {
        playAnimation(enemy, 'walk')
      }
    } else if (distance <= 2.3) {
      // In attack range - MUCH more aggressive (slightly beyond HIT_RANGE for pressure)

      // If player just attacked, PUNISH THEM! (20% chance - easier now)
      if (playerIsVulnerable && rand < 0.2 && enemyFighter.attackCooldown <= 0) {
        performAttack(enemy)
        console.log('🔥 AI PUNISHED YOUR WHIFF!')
      }
      // Normal attacks (3% chance per frame = attacks every ~0.5 seconds - much easier)
      else if (rand < 0.03 && enemyFighter.attackCooldown <= 0) {
        performAttack(enemy)
      }
      // Idle
      else if (enemyFighter.currentAnimation !== 'idle' && enemyFighter.currentAnimation !== 'attack') {
        playAnimation(enemy, 'idle')
      }
    }
  }
}

/**
 * Facing system - makes both fighters always face each other (like Street Fighter/Tekken)
 */
export function facingSystem(dt: number) {
  const player = getFighterByRole(true)
  const enemy = getFighterByRole(false)

  if (!player || !enemy) return

  const playerTransform = Transform.getMutableOrNull(player)
  const enemyTransform = Transform.getMutableOrNull(enemy)

  if (!playerTransform || !enemyTransform) return

  // Make player face enemy
  const toEnemy = Vector3.subtract(enemyTransform.position, playerTransform.position)
  toEnemy.y = 0
  if (Vector3.length(toEnemy) > 0.1) {
    const playerAngle = Math.atan2(toEnemy.x, toEnemy.z) * (180 / Math.PI)
    const playerTargetRotation = Quaternion.fromEulerDegrees(0, playerAngle, 0)
    playerTransform.rotation = Quaternion.slerp(playerTransform.rotation, playerTargetRotation, dt * 10)
  }

  // Make enemy face player
  const toPlayer = Vector3.subtract(playerTransform.position, enemyTransform.position)
  toPlayer.y = 0
  if (Vector3.length(toPlayer) > 0.1) {
    const enemyAngle = Math.atan2(toPlayer.x, toPlayer.z) * (180 / Math.PI)
    const enemyTargetRotation = Quaternion.fromEulerDegrees(0, enemyAngle, 0)
    enemyTransform.rotation = Quaternion.slerp(enemyTransform.rotation, enemyTargetRotation, dt * 10)
  }
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
