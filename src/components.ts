import { Schemas, engine } from '@dcl/sdk/ecs'

// Animation states
export type AnimationState = 'idle' | 'run' | 'attack' | 'impact'

// Fighter component - ECS-based fighter data
export const FighterComponent = engine.defineComponent('fighter::component', {
  isPlayer: Schemas.Boolean,
  health: Schemas.Number,
  maxHealth: Schemas.Number,
  animationTimer: Schemas.Number, // For timed animation resets
  currentAnimation: Schemas.String,
  invincibilityTimer: Schemas.Number, // I-frames after hit (prevents spam damage)
  attackCooldown: Schemas.Number // Per-fighter attack cooldown
})

// Animation timer component - tracks when to reset animations
export const AnimationTimer = engine.defineComponent('fighter::animation-timer', {
  remainingTime: Schemas.Number,
  targetAnimation: Schemas.String
})

// Game state component
export const GameState = engine.defineComponent('game::state', {
  isMatchActive: Schemas.Boolean,
  winner: Schemas.String, // 'player' | 'enemy' | 'draw' | ''
  comboCount: Schemas.Number,
  lastHitTime: Schemas.Number,
  roundNumber: Schemas.Number,
  countdownTimer: Schemas.Number // 3-second countdown before fight starts
})

// Arena configuration constants
export const ARENA_CONFIG = {
  // Arena dimensions
  width: 14,
  depth: 10,
  height: 0.1,

  // Fighter spawn positions (centered for camera at 8,2,4)
  player: {
    x: 5, // Left fighter
    y: 0,
    z: 9
  },
  enemy: {
    x: 11, // Right fighter
    y: 0,
    z: 9
  },

  // Movement boundaries (tighter for camera view)
  xMin: 4,
  xMax: 12,
  zMin: 7,
  zMax: 11
}
