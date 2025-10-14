# Avatar Locking Implementation Request

## 🎯 Goal

Lock the player's avatar at position `(7.99, 0.88, 0.97)` while allowing WASD to control a separate fighter entity.

## 📍 Current Status

### What Works:

- ✅ Fighter entities (Bandit & Goblin) spawn and move correctly
- ✅ WASD controls the fighter entity with animations
- ✅ Combat system with AI enemy

### What's Missing:

- ❌ **Avatar is NOT locked** - player can still walk around freely
- ❌ Avatar is visible and follows normal movement
- ❌ No avatar hiding implemented

## 🔧 Implementation Needed

### File: `src/avatarLock.ts`

This file has been created with 4 methods to lock the avatar:

1. **Method 1: Teleport Avatar**

   ```typescript
   movePlayerTo({
     newRelativePosition: Vector3.create(7.99, 0.88, 0.97),
     cameraTarget: Vector3.create(8, 2, 8)
   })
   ```

   - Uses `~system/RestrictedActions`
   - **QUESTION**: Is this import available in SDK7? Sometimes restricted.

2. **Method 2: AvatarModifierArea**

   ```typescript
   AvatarModifierArea.create(entity, {
     area: Vector3.create(32, 50, 32),
     modifiers: [AvatarModifierType.AMT_HIDE_AVATARS]
   })
   ```

   - Hides all avatars in the area
   - Should work but may have visibility edge cases

3. **Method 3: Direct Scale to Zero**

   ```typescript
   const playerTransform = Transform.getMutableOrNull(engine.PlayerEntity)
   playerTransform.scale = Vector3.Zero()
   ```

   - Simple and direct
   - **QUESTION**: Does `engine.PlayerEntity` exist and is it mutable?

4. **Method 4: Collision Cage**

   ```typescript
   // Creates 6 invisible collision walls around lock position
   MeshCollider.setBox(entity, ColliderLayer.CL_PHYSICS)
   ```

   - Physical barrier to prevent avatar movement
   - Most reliable if other methods fail

5. **Method 5: Freeze System**
   ```typescript
   function freezeAvatarSystem(dt: number) {
     // Constantly snaps avatar back to lock position
     avatarTransform.position = AVATAR_LOCK_POSITION
   }
   ```
   - Runs every frame
   - Catches any avatar movement and resets it

## 🚨 Potential Issues

### Issue 1: `movePlayerTo` Import

```typescript
import { movePlayerTo } from '~system/RestrictedActions'
```

**Question**: Is this API available? Sometimes requires special permissions or different import path in SDK7.

**Alternative**: If not available, remove Method 1 and rely on Methods 2-5.

### Issue 2: `engine.PlayerEntity`

```typescript
const playerTransform = Transform.getMutableOrNull(engine.PlayerEntity)
```

**Question**: Can we access and mutate the PlayerEntity transform?

**Test**: Check if `engine.PlayerEntity` is defined and has a Transform component.

### Issue 3: Avatar Still Visible

If avatar hiding doesn't work:

- AvatarModifierArea might have wrong size/position
- Scale to zero might be overridden by engine
- May need to use `AvatarModifierType` differently

### Issue 4: Camera Controls

Currently using default camera. Player can still:

- Pan camera with mouse
- Zoom in/out
- Rotate view

**Might need**: Camera locking to fixed angle (not implemented yet).

## 📝 Integration Steps

### Step 1: Add to `src/index.ts`

```typescript
import { lockAvatar, unlockAvatar } from './avatarLock'

export function main() {
  // ... existing code ...

  // After spawning fighters, lock the avatar
  lockAvatar()
  console.log('✅ Avatar locked at (7.99, 0.88, 0.97)')

  // ... rest of code ...
}
```

### Step 2: Test the Lock

Run `npm run start` and check console for:

```
🔒 Locking avatar at position: (7.99, 0.88, 0.97)
✅ Avatar teleported to lock position
✅ Avatar modifier area created (hiding avatars)
✅ Avatar scaled to zero (hidden)
✓ Created 6 collision walls
🔒 Avatar locked successfully
```

### Step 3: Verify Behavior

- [ ] Avatar teleports to (7.99, 0.88, 0.97)
- [ ] Avatar is invisible
- [ ] Avatar cannot move (frozen in place)
- [ ] WASD still controls fighter entity
- [ ] Console shows "Avatar snapped back" if movement attempted

## 🐛 Debugging Commands

Add to console for testing:

```typescript
// In browser console:
__fightingArena.checkAvatarPosition = () => {
  const transform = Transform.getOrNull(engine.PlayerEntity)
  console.log('Avatar position:', transform?.position)
}

__fightingArena.testLock = () => {
  lockAvatar()
}

__fightingArena.testUnlock = () => {
  unlockAvatar()
}
```

## ❓ Questions for Senior Dev

1. **Is `movePlayerTo` from `~system/RestrictedActions` available in SDK7?**

   - If not, what's the alternative?

2. **Can we mutate `engine.PlayerEntity` transform?**

   - Is `engine.PlayerEntity` accessible?
   - Can we set its scale to zero?

3. **Best practice for avatar hiding in SDK7?**

   - AvatarModifierArea vs Transform.scale?
   - Any other methods?

4. **Collision cage physics - will it work?**

   - Can MeshCollider block player avatar?
   - Correct ColliderLayer value?

5. **Freeze system performance?**

   - Is snapping position every frame (60fps) acceptable?
   - Better pattern for constant position enforcement?

6. **Alternative approaches?**
   - Any SDK7-specific APIs we're missing?
   - Better way to achieve "avatar spectator mode"?

## 📚 Reference Implementation

The full reference is in `/fightingArena/arenaMovement.ts` (lines 107-170).

Key differences from reference:

- Reference uses `AVATAR_PARK` position at `(0, 21, -8)`
- We want `(7.99, 0.88, 0.97)` for 1x1 parcel
- Reference includes InputModifier (not implemented yet)

## ✅ Expected Result

When working correctly:

1. Player spawns in the scene
2. Avatar instantly teleports to (7.99, 0.88, 0.97)
3. Avatar becomes invisible
4. WASD controls the Bandit fighter, not the avatar
5. Player sees third-person view of the fight
6. Avatar cannot move from lock position

---

**Created**: 2025-10-14  
**Contact**: Ask senior Decentraland dev about the 6 questions above
