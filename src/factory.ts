import { Entity, engine, Transform, MeshRenderer, MeshCollider, GltfContainer, Animator, Material } from '@dcl/sdk/ecs'
import { Vector3, Quaternion, Color4 } from '@dcl/sdk/math'
import { FighterComponent, ARENA_CONFIG, GameState } from './components'

let arenaEntities: Entity[] = []
let gameStateEntity: Entity | null = null

// Animation states that all fighters should have
const FIGHTER_ANIMATIONS = [
  { clip: 'idle', playing: true, loop: true },
  { clip: 'run', playing: false, loop: true },
  { clip: 'attack', playing: false, loop: false },
  { clip: 'impact', playing: false, loop: false },
  { clip: 'stun', playing: false, loop: false },
  { clip: 'die', playing: false, loop: false },
  { clip: 'block', playing: false, loop: true }
]

/**
 * Create game state entity
 */
export function createGameState(): Entity {
  gameStateEntity = engine.addEntity()
  GameState.create(gameStateEntity, {
    isMatchActive: false, // Start inactive during countdown
    winner: '',
    comboCount: 0,
    lastHitTime: 0,
    roundNumber: 1,
    countdownTimer: 3.0 // 3 seconds before fight starts
  })
  return gameStateEntity
}

/**
 * Get game state entity
 */
export function getGameState(): Entity | null {
  return gameStateEntity
}

/**
 * Create the fighting arena with floor and boundaries
 */
export function createArena(): void {
  console.log('🥊 Creating fighting arena...')

  // Create floor
  const floor = engine.addEntity()
  arenaEntities.push(floor)

  MeshRenderer.setBox(floor)
  Transform.create(floor, {
    position: Vector3.create(8, -0.05, 8), // Centered in 16x16 parcel
    scale: Vector3.create(ARENA_CONFIG.width, ARENA_CONFIG.height, ARENA_CONFIG.depth)
  })
  Material.setPbrMaterial(floor, {
    albedoColor: Color4.create(0.3, 0.3, 0.35, 1),
    metallic: 0.2,
    roughness: 0.8
  })
  MeshCollider.setBox(floor)

  // Create boundary markers (visual guides)
  createArenaMarkers()

  console.log('✅ Arena created')
}

/**
 * Create visual markers for spawn points and boundaries
 */
function createArenaMarkers(): void {
  // Player spawn marker (blue)
  const playerMarker = engine.addEntity()
  arenaEntities.push(playerMarker)
  MeshRenderer.setCylinder(playerMarker)
  Transform.create(playerMarker, {
    position: Vector3.create(ARENA_CONFIG.player.x, 0.05, ARENA_CONFIG.player.z),
    scale: Vector3.create(1, 0.1, 1)
  })
  Material.setPbrMaterial(playerMarker, {
    albedoColor: Color4.Blue()
  })

  // Enemy spawn marker (red)
  const enemyMarker = engine.addEntity()
  arenaEntities.push(enemyMarker)
  MeshRenderer.setCylinder(enemyMarker)
  Transform.create(enemyMarker, {
    position: Vector3.create(ARENA_CONFIG.enemy.x, 0.05, ARENA_CONFIG.enemy.z),
    scale: Vector3.create(1, 0.1, 1)
  })
  Material.setPbrMaterial(enemyMarker, {
    albedoColor: Color4.Red()
  })

  // Center line (yellow divider)
  const centerLine = engine.addEntity()
  arenaEntities.push(centerLine)
  MeshRenderer.setBox(centerLine)
  Transform.create(centerLine, {
    position: Vector3.create(8, 0.06, 8), // Centered in parcel
    scale: Vector3.create(0.1, 0.05, ARENA_CONFIG.depth)
  })
  Material.setPbrMaterial(centerLine, {
    albedoColor: Color4.Yellow()
  })
}

/**
 * Remove all arena entities
 */
export function removeArena(): void {
  console.log('🧹 Removing arena...')
  for (const entity of arenaEntities) {
    engine.removeEntity(entity)
  }
  arenaEntities = []
  console.log('✅ Arena removed')
}

/**
 * Create a fighter entity with model and animations
 */
export function createFighter(modelPath: string, position: Vector3, rotation: Quaternion, isPlayer: boolean): Entity {
  const entity = engine.addEntity()

  // Load model
  GltfContainer.create(entity, {
    src: modelPath,
    invisibleMeshesCollisionMask: 0,
    visibleMeshesCollisionMask: 0
  })

  // Transform
  Transform.create(entity, {
    position: position,
    rotation: rotation,
    scale: Vector3.One()
  })

  // Fighter component
  FighterComponent.create(entity, {
    isPlayer: isPlayer,
    health: 100,
    maxHealth: 100,
    animationTimer: 0,
    currentAnimation: 'idle',
    invincibilityTimer: 0,
    attackCooldown: 0,
    stunTimer: 0,
    blocking: false,
    knockbackActive: false,
    knockbackProgress: 0,
    knockbackDirX: 0,
    knockbackDirY: 0,
    knockbackDirZ: 0,
    animRampProgress: 1.0
  })

  // Animator with standard states
  Animator.create(entity, {
    states: [...FIGHTER_ANIMATIONS]
  })

  console.log(`✅ ${isPlayer ? 'Player' : 'Enemy'} fighter created`)
  return entity
}
