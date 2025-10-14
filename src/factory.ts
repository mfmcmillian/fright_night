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
 * Create simple skybox cube around the arena using textured planes
 */
function createSkybox(): void {
  const skyboxSize = 15 // Fits within 1 parcel (16x16)
  const skyboxHeight = 12
  const skyboxRoot = engine.addEntity()
  arenaEntities.push(skyboxRoot)

  Transform.create(skyboxRoot, {
    position: Vector3.create(8, 6, 8) // Centered at arena position
  })

  // Front (PZ) - facing inward (negative Z direction)
  const skyboxPZ = engine.addEntity()
  arenaEntities.push(skyboxPZ)
  Transform.create(skyboxPZ, {
    position: Vector3.create(0, 0, skyboxSize / 2),
    rotation: Quaternion.fromEulerDegrees(0, 180, 0), // Flip to face inward
    scale: Vector3.create(skyboxSize, skyboxHeight, 1),
    parent: skyboxRoot
  })
  MeshRenderer.setPlane(skyboxPZ)
  Material.setBasicMaterial(skyboxPZ, {
    texture: Material.Texture.Common({ src: 'images/creepy-skybox/nz.png' }) // Swapped NZ and PZ
  })

  // Back (NZ) - facing inward (positive Z direction)
  const skyboxNZ = engine.addEntity()
  arenaEntities.push(skyboxNZ)
  Transform.create(skyboxNZ, {
    position: Vector3.create(0, 0, -skyboxSize / 2),
    rotation: Quaternion.fromEulerDegrees(0, 0, 0), // Face inward
    scale: Vector3.create(skyboxSize, skyboxHeight, 1),
    parent: skyboxRoot
  })
  MeshRenderer.setPlane(skyboxNZ)
  Material.setBasicMaterial(skyboxNZ, {
    texture: Material.Texture.Common({ src: 'images/creepy-skybox/pz.png' }) // Swapped NZ and PZ
  })

  // Top (PY) - facing down
  const skyboxPY = engine.addEntity()
  arenaEntities.push(skyboxPY)
  Transform.create(skyboxPY, {
    position: Vector3.create(0, skyboxHeight / 2, 0),
    rotation: Quaternion.fromEulerDegrees(90, 0, 0), // Flip to face down
    scale: Vector3.create(skyboxSize, skyboxSize, 1),
    parent: skyboxRoot
  })
  MeshRenderer.setPlane(skyboxPY)
  Material.setBasicMaterial(skyboxPY, {
    texture: Material.Texture.Common({ src: 'images/creepy-skybox/py.png' })
  })

  // Bottom (NY) - facing up
  const skyboxNY = engine.addEntity()
  arenaEntities.push(skyboxNY)
  Transform.create(skyboxNY, {
    position: Vector3.create(0, -skyboxHeight / 2, 0),
    rotation: Quaternion.fromEulerDegrees(-90, 180, 0), // Flip to face up + rotate 180
    scale: Vector3.create(skyboxSize, skyboxSize, 1),
    parent: skyboxRoot
  })
  MeshRenderer.setPlane(skyboxNY)
  Material.setBasicMaterial(skyboxNY, {
    texture: Material.Texture.Common({ src: 'images/creepy-skybox/ny.png' })
  })

  // Right (PX) - facing inward (negative X direction)
  const skyboxPX = engine.addEntity()
  arenaEntities.push(skyboxPX)
  Transform.create(skyboxPX, {
    position: Vector3.create(skyboxSize / 2, 0, 0),
    rotation: Quaternion.fromEulerDegrees(0, -90, 0), // Flip to face inward
    scale: Vector3.create(skyboxSize, skyboxHeight, 1),
    parent: skyboxRoot
  })
  MeshRenderer.setPlane(skyboxPX)
  Material.setBasicMaterial(skyboxPX, {
    texture: Material.Texture.Common({ src: 'images/creepy-skybox/nx.png' }) // Swapped PX and NX
  })

  // Left (NX) - facing inward (positive X direction)
  const skyboxNX = engine.addEntity()
  arenaEntities.push(skyboxNX)
  Transform.create(skyboxNX, {
    position: Vector3.create(-skyboxSize / 2, 0, 0),
    rotation: Quaternion.fromEulerDegrees(0, 90, 0), // Flip to face inward
    scale: Vector3.create(skyboxSize, skyboxHeight, 1),
    parent: skyboxRoot
  })
  MeshRenderer.setPlane(skyboxNX)
  Material.setBasicMaterial(skyboxNX, {
    texture: Material.Texture.Common({ src: 'images/creepy-skybox/px.png' }) // Swapped PX and NX
  })

  console.log('✅ Skybox created (6 textured planes facing inward)')
}

/**
 * Create the fighting arena with floor and boundaries
 */
export function createArena(): void {
  console.log('🥊 Creating fighting arena...')

  // Create skybox first
  createSkybox()

  // Floor removed - bottom skybox texture acts as ground
  // Arena markers removed - clean immersive environment

  console.log('✅ Arena created')
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
