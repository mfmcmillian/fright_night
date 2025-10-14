# Fighting Game Improvements Roadmap

## 🔥 HIGH IMPACT, LOW EFFORT (Priority 1)

### ✅ 1. Tekken-Style Static Camera

- **Status**: Created in `src/camera.ts`
- **Impact**: ⭐⭐⭐⭐⭐ (True Tekken feel)
- **Effort**: 30 min
- **Implementation**: Import and call `setupLockedCamera()` in main()

### 2. KO/Win Screen

- **Impact**: ⭐⭐⭐⭐⭐ (Essential game state)
- **Effort**: 1 hour
- **Tasks**:
  - Detect when health <= 0
  - Show victory/defeat UI overlay
  - Reset match button
  - Winner announcement

### 3. Combo Counter UI

- **Impact**: ⭐⭐⭐⭐ (Player feedback)
- **Effort**: 45 min
- **Tasks**:
  - Track consecutive hits (2+ within 1.5s)
  - Display "2 HIT COMBO!" with scaling animation
  - Reset on miss or timeout

### 4. Hit Flash/Shake Effect

- **Impact**: ⭐⭐⭐⭐ (Visual feedback)
- **Effort**: 30 min
- **Tasks**:
  - Red flash on health bar when hit
  - Screen shake (camera position jitter 0.1s)
  - Hit spark particle at contact point

### 5. Round System

- **Impact**: ⭐⭐⭐⭐ (Arcade feel)
- **Effort**: 1 hour
- **Tasks**:
  - Best of 3 rounds
  - Round counter UI
  - "ROUND 1... FIGHT!" announcements
  - Match point indicator

---

## ⚡ HIGH IMPACT, MEDIUM EFFORT (Priority 2)

### 6. Sound Effects

- **Impact**: ⭐⭐⭐⭐⭐ (Immersion)
- **Effort**: 2 hours
- **Tasks**:
  - Attack whoosh sound
  - Hit impact sound (heavy/light)
  - KO sound
  - Background music (looping)
  - Use AudioSource component

### 7. Multiple Attack Types

- **Impact**: ⭐⭐⭐⭐ (Gameplay depth)
- **Effort**: 2 hours
- **Tasks**:
  - E = Light punch (10 dmg, fast)
  - Q = Heavy punch (20 dmg, slow)
  - Shift+E = Special move (25 dmg, 2s cooldown)
  - Different hit ranges per attack

### 8. Blocking Mechanic

- **Impact**: ⭐⭐⭐⭐ (Strategic depth)
- **Effort**: 1.5 hours
- **Tasks**:
  - Hold Spacebar to block
  - Reduces damage by 50%
  - Can't move while blocking
  - Block animation

### 9. Better AI States

- **Impact**: ⭐⭐⭐⭐ (Challenge)
- **Effort**: 2 hours
- **Tasks**:
  - Patrol state (wander arena)
  - Block state (defend randomly)
  - Dodge state (sidestep attacks)
  - Difficulty levels (easy/medium/hard)

### 10. Character Select Screen

- **Impact**: ⭐⭐⭐⭐ (Polish)
- **Effort**: 2 hours
- **Tasks**:
  - Pre-match UI with character portraits
  - Choose Bandit or Goblin
  - Preview stats (speed, power, health)
  - "Press E to confirm" flow

---

## 💎 MEDIUM IMPACT, LOW EFFORT (Quick Wins)

### 11. Damage Numbers

- **Impact**: ⭐⭐⭐ (Feedback)
- **Effort**: 30 min
- **Tasks**:
  - Floating "-15" text above fighter on hit
  - Float upward and fade out (1s)
  - Color based on damage (red = high)

### 12. Health Bar Animation

- **Impact**: ⭐⭐⭐ (Polish)
- **Effort**: 30 min
- **Tasks**:
  - Smooth lerp (don't snap instantly)
  - Delayed "damage shadow" (shows previous health briefly)
  - Pulse effect when critical (<30%)

### 13. Match Timer

- **Impact**: ⭐⭐⭐ (Competitive)
- **Effort**: 45 min
- **Tasks**:
  - 60-second countdown per round
  - Displayed at top center
  - Time out = player with more HP wins
  - "HURRY!" warning at 10s

### 14. Stage Hazards

- **Impact**: ⭐⭐⭐ (Fun factor)
- **Effort**: 1 hour
- **Tasks**:
  - Spawn damage zones at random
  - Fire pillars, spikes, etc.
  - 5 dmg per second if standing in it
  - Visual warning before spawn

### 15. Tutorial Overlay

- **Impact**: ⭐⭐⭐ (UX)
- **Effort**: 30 min
- **Tasks**:
  - First-time instructions
  - Arrow keys tutorial
  - "Press E to attack" prompt
  - Fade out after 5 seconds

---

## 🚀 HIGH IMPACT, HIGH EFFORT (Future Goals)

### 16. Multiplayer P2P

- **Impact**: ⭐⭐⭐⭐⭐ (Replayability)
- **Effort**: 8+ hours
- **Tasks**:
  - MessageBus for state sync
  - Input prediction
  - Server-authoritative hit detection
  - Lobby system

### 17. Particle Effects System

- **Impact**: ⭐⭐⭐⭐ (Visual pop)
- **Effort**: 3 hours
- **Tasks**:
  - Hit sparks (stars, dust)
  - Attack trails (motion blur)
  - Blood/damage particles
  - Victory confetti

### 18. Combo System

- **Impact**: ⭐⭐⭐⭐ (Skill ceiling)
- **Effort**: 4 hours
- **Tasks**:
  - Chain attacks (E -> E -> Q)
  - Combo window (0.5s between hits)
  - Juggle mechanics
  - Combo breakers

### 19. More Characters

- **Impact**: ⭐⭐⭐⭐ (Variety)
- **Effort**: 3 hours per character
- **Tasks**:
  - Add 2-3 more fighters
  - Unique move sets
  - Different stats (speed, power)
  - Character-specific animations

### 20. Replay System

- **Impact**: ⭐⭐⭐ (Social)
- **Effort**: 6 hours
- **Tasks**:
  - Record inputs per frame
  - Playback with camera controls
  - Save to local storage
  - Share via link

---

## 🎨 POLISH (Low Priority, High Impact on Feel)

### 21. Better Arena Visuals

- **Effort**: 2 hours
- Textured floor, ropes, crowd sprites

### 22. Intro Animation

- **Effort**: 1 hour
- Fighters enter from sides, "READY... FIGHT!"

### 23. Taunt Emotes

- **Effort**: 1 hour
- Press T to taunt (leaves you vulnerable)

### 24. Leaderboard

- **Effort**: 3 hours
- Track wins/losses, display top players

### 25. Achievement System

- **Effort**: 2 hours
- "First Blood", "Perfect Victory", "Combo Master"

---

## 📊 **Recommended Implementation Order**

For a **hackathon demo** (next 8 hours):

1. ✅ Static Camera (30min) → Immediate Tekken feel
2. KO/Win Screen (1h) → Essential game state
3. Combo Counter (45min) → Player feedback
4. Round System (1h) → Arcade structure
5. Sound Effects (2h) → Immersion boost
6. Hit Flash (30min) → Impact feel
7. Multiple Attacks (2h) → Depth

**Total**: ~8 hours = **Polished demo-ready game**

For **MVP launch** (next 2 weeks):

- Add above 7 + Blocking + Better AI + Character Select

For **Full Release** (1 month):

- Add Multiplayer + Particles + Combo System

---

## 🔧 **Technical Debt to Address**

1. **Animation Events**: Use GLB animation events instead of timers
2. **Hitbox System**: Proper collision volumes vs distance checks
3. **State Machine**: Formal FSM for fighter states
4. **Input Buffer**: Queue inputs for responsive feel
5. **Config File**: Move all constants to JSON for easy tweaking

---

## 📝 **Next Steps**

**Right now, I recommend:**

1. Integrate the camera system I just created
2. Implement KO/Win screen (biggest missing piece)
3. Add combo counter for juice

Want me to implement any of these? I can start with the top 3!
