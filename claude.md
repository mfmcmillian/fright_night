# Fright Night - Fighting Game Project Context

## Project Overview

A Tekken-style fighting game built with Decentraland SDK7. Player controls Bandit against an AI-controlled Goblin in an arena with proper animations, combat, and health tracking.

## Tech Stack

- **Platform**: Decentraland SDK7
- **Language**: TypeScript
- **Architecture**: Entity Component System (ECS)
- **UI**: React-ECS (@dcl/sdk/react-ecs)
- **Dependencies**: @dcl-sdk/utils (for utilities)

## Project Structure

```
src/
├── index.ts       - Main entry point, initializes game
├── components.ts  - ECS component definitions
├── factory.ts     - Entity creation functions (arena, fighters)
├── systems.ts     - Game logic systems (movement, AI, combat)
├── ui.tsx         - React-based UI components
└── utils.ts       - Utility functions (currently minimal)

models/
├── bandit.glb     - Player character model
└── goblin.glb     - Enemy character model
```

## Architecture: ECS Pattern

### Components (Data Only)

- **FighterComponent**: Health, animation state, timers

  - `isPlayer: boolean`
  - `health: number`
  - `maxHealth: number`
  - `animationTimer: number`
  - `currentAnimation: string`

- **ARENA_CONFIG**: Constants for arena dimensions and boundaries
  - Arena size: 14x10 (fits in 16x16 parcel)
  - Player spawn: (3, 0, 8) - Left side
  - Enemy spawn: (13, 0, 8) - Right side
  - Boundaries: xMin: 1, xMax: 15, zMin: 4, zMax: 12
  - **Note**: Scene is 1x1 parcel, coordinates must be 0-16

### Systems (Logic Only)

All systems are registered in `main()` and run every frame with delta time (`dt`).

1. **playerMovementSystem**:

   - Handles WASD input
   - Applies movement with bounds checking
   - Triggers run/idle animations

2. **enemyAISystem**:

   - Chases player when 2-8m away
   - Attacks when within 2.5m (random chance)
   - Triggers appropriate animations

3. **animationTimerSystem**:

   - Counts down animation timers
   - Resets to idle when timer expires

4. **hitDetectionTimerSystem**:

   - Delays hit checks by 0.4s after attack starts
   - Checks distance and applies damage

5. **facingSystem**:
   - Rotates both fighters to face each other

## Animation System

### Animation States

- `idle` - Default standing pose
- `run` - Movement animation
- `attack` - Attack animation (0.8s)
- `impact` - Hit reaction (0.5s)

### Animation Flow

1. `playAnimation()` stops all non-idle animations
2. Plays target animation
3. Sets `animationTimer` if duration provided
4. `animationTimerSystem` counts down
5. When timer hits 0, `resetToIdle()` restores idle

**Important**: Animations must exist in GLB models or they won't play!

## Combat System

### Attack Flow

1. Player presses E → `performAttack()` called
2. Attack animation plays (0.8s duration)
3. Hit check scheduled for 0.4s later
4. `checkAttackHit()` measures distance
5. If < 2.5m, damage applied via `applyDamage()`
6. Impact animation plays on hit (0.5s)

### Combat Constants

- Attack range: 2.5 meters
- Attack damage: 15 HP
- Starting health: 100 HP
- Attack duration: 0.8 seconds
- Hit detection delay: 0.4 seconds
- Impact duration: 0.5 seconds

## Controls

- **W/A/S/D** - Movement (forward/left/back/right)
- **E** - Attack (maps to `InputAction.IA_PRIMARY`)

## Important Patterns

### Getting Mutable vs Immutable Components

```typescript
// Immutable (read-only)
const fighter = FighterComponent.getOrNull(entity)

// Mutable (can modify)
const fighter = FighterComponent.getMutableOrNull(entity)
```

**Rule**: Only use `getMutable` when you need to change values!

### Creating Entities

```typescript
const entity = engine.addEntity()
Transform.create(entity, { position, rotation, scale })
GltfContainer.create(entity, { src: 'models/model.glb' })
FighterComponent.create(entity, { ...data })
```

### Adding Systems

```typescript
engine.addSystem(systemFunction)
// System signature: function systemName(dt: number) { }
```

### Timing Without setTimeout

We use ECS-based timing with Maps:

```typescript
const timers = new Map<Entity, number>()

// Set timer
timers.set(entity, 0.5) // 0.5 seconds

// In system
for (const [entity, timer] of timers.entries()) {
  const newTimer = timer - dt
  if (newTimer <= 0) {
    timers.delete(entity)
    // Do action
  } else {
    timers.set(entity, newTimer)
  }
}
```

**Why**: `setTimeout` doesn't exist in Decentraland runtime!

## Common Tasks

### Adding New Animation

1. Ensure animation exists in GLB model
2. Add to `FIGHTER_ANIMATIONS` array in `factory.ts`
3. Use `playAnimation(entity, 'animName', durationMs)`

### Modifying Combat

- Damage: Change in `checkAttackHit()`
- Range: Modify `hitRange` in `checkAttackHit()`
- Speed: Adjust `MOVEMENT_SPEED` in `systems.ts`

### Adjusting Arena

- Size/bounds: Edit `ARENA_CONFIG` in `components.ts`
- Visual: Modify `createArena()` in `factory.ts`

### Changing AI Behavior

- Chase distance: Modify conditions in `enemyAISystem()`
- Attack frequency: Adjust `Math.random() < 0.015` threshold
- Speed: Change multiplier in velocity calculation

## Known Issues & Limitations

1. **Animations**: If models don't have `idle`, `run`, `attack`, `impact` animations, they won't play
2. **Camera**: Uses default Decentraland camera (no custom Tekken-style view implemented)
3. **Hit Detection**: Distance-based only, no hitbox/hurtbox system
4. **No Multiplayer**: Single-player only (AI opponent)
5. **No Avatar Lock**: Player avatar still visible and movable

## File Conventions

- **Components**: Pure data, no logic
- **Systems**: Pure logic, no data storage (except refs to entities)
- **Factory**: Entity creation only
- **UI**: Reactive components, read-only data access
- **No globals**: Use entity refs passed through `setFighterEntities()`

## Testing Checklist

When making changes, verify:

- [ ] Linter passes (`npm run build` or check IDE)
- [ ] Player can move with WASD
- [ ] Run animation plays when moving
- [ ] Attack animation plays when pressing E
- [ ] Enemy chases player
- [ ] Enemy attacks when close
- [ ] Damage applies and health bars update
- [ ] Impact animation plays on hit
- [ ] Fighters face each other
- [ ] Arena boundaries work (can't walk off edge)

## Debug Tips

### Enable verbose logging

Add console.logs in systems to track state:

```typescript
console.log(`Animation: ${fighter.currentAnimation}, Timer: ${fighter.animationTimer}`)
```

### Check animation names

Models might use different clip names. Check GLB in 3D software or log:

```typescript
const animator = Animator.getOrNull(entity)
console.log(
  'Available animations:',
  animator?.states.map((s) => s.clip)
)
```

### Distance debugging

```typescript
const dist = Vector3.distance(pos1, pos2)
console.log(`Distance: ${dist.toFixed(2)}m`)
```

## Future Enhancement Ideas

Priority features to consider:

1. **Camera System**: Tekken-style side-view with avatar lock
2. **Combo System**: Chain attacks with timing windows
3. **Blocking**: Add defense mechanics
4. **Special Moves**: Unique attacks per character
5. **Multiplayer**: P2P combat with input sync
6. **Sound**: Attack sounds, impact effects, music
7. **Particles**: Visual effects for hits
8. **Character Select**: Multiple playable fighters

## References

- [Decentraland SDK7 Docs](https://docs.decentraland.org/creator/)
- [ECS Pattern](https://docs.decentraland.org/creator/development-guide/sdk7/architecture/)
- Reference implementation in `/fightingArena/` folder (full featured version)
