import {
  engine,
} from '@dcl/sdk/ecs'
import { Color4 } from '@dcl/sdk/math'
import ReactEcs, { Label, ReactEcsRenderer, UiEntity, Button } from '@dcl/sdk/react-ecs'
import { FighterComponent, GameState } from './components'
import { getPlayerEntity, getEnemyEntity, resetMatch } from './systems'
import { getGameState } from './factory'

export function setupUi() {
  ReactEcsRenderer.setUiRenderer(uiComponent)
}

const uiComponent = () => {
  const playerEntity = getPlayerEntity()
  const enemyEntity = getEnemyEntity()
  const gameStateEntity = getGameState()
  
  const playerFighter = playerEntity ? FighterComponent.getOrNull(playerEntity) : null
  const enemyFighter = enemyEntity ? FighterComponent.getOrNull(enemyEntity) : null
  const gameState = gameStateEntity ? GameState.getOrNull(gameStateEntity) : null
  
  const p1Health = playerFighter ? playerFighter.health : 0
  const p1MaxHealth = playerFighter ? playerFighter.maxHealth : 100
  const p1Anim = playerFighter ? playerFighter.currentAnimation : 'idle'
  
  const p2Health = enemyFighter ? enemyFighter.health : 0
  const p2MaxHealth = enemyFighter ? enemyFighter.maxHealth : 100
  const p2Anim = enemyFighter ? enemyFighter.currentAnimation : 'idle'
  
  const comboCount = gameState ? gameState.comboCount : 0
  const isMatchActive = gameState ? gameState.isMatchActive : true
  const winner = gameState ? gameState.winner : ''
  const countdownTimer = gameState ? gameState.countdownTimer : 0
  
  return (
    <UiEntity
      uiTransform={{
        width: '100%',
        height: '100%',
        flexDirection: 'column',
      }}
    >
      {/* Top HUD Container */}
      <UiEntity
        uiTransform={{
          width: '100%',
          height: 120,
          flexDirection: 'row',
          justifyContent: 'space-between',
          padding: 20,
        }}
      >
        {/* Player 1 Health Bar (Left) */}
        <UiEntity
          uiTransform={{
            width: 400,
            height: 100,
            flexDirection: 'column',
          }}
        >
          <Label
            value="BANDIT (PLAYER)"
            fontSize={20}
            color={Color4.White()}
            uiTransform={{ width: '100%', height: 30, margin: {bottom: 5} }}
          />
          <UiEntity
            uiTransform={{
              width: '100%',
              height: 40,
              margin: { bottom: 5 }
            }}
            uiBackground={{ color: Color4.create(0.2, 0.2, 0.2, 0.8) }}
          >
            <UiEntity
              uiTransform={{
                width: `${(p1Health / p1MaxHealth) * 100}%`,
                height: '100%',
              }}
              uiBackground={{ color: Color4.create(0.8, 0.2, 0.2, 1) }}
            />
          </UiEntity>
          <Label
            value={`HP: ${p1Health}/${p1MaxHealth} | ${p1Anim.toUpperCase()}`}
            fontSize={14}
            color={Color4.White()}
            uiTransform={{ width: '100%', height: 20 }}
          />
        </UiEntity>

        {/* Center - VS Text & Combo Counter */}
        <UiEntity
          uiTransform={{
            width: 150,
            height: 100,
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Label
            value="VS"
            fontSize={36}
            color={Color4.Yellow()}
            uiTransform={{ width: '100%', height: 50 }}
          />
          {comboCount > 1 && (
            <Label
              value={`${comboCount} HIT COMBO!`}
              fontSize={20}
              color={Color4.create(1, 0.5, 0, 1)}
              uiTransform={{ width: '100%', height: 30 }}
            />
          )}
        </UiEntity>

        {/* Player 2 Health Bar (Right) */}
        <UiEntity
          uiTransform={{
            width: 400,
            height: 100,
            flexDirection: 'column',
            alignItems: 'flex-end',
          }}
        >
          <Label
            value="GOBLIN (AI)"
            fontSize={20}
            color={Color4.White()}
            uiTransform={{ width: '100%', height: 30, margin: {bottom: 5} }}
          />
          <UiEntity
            uiTransform={{
              width: '100%',
              height: 40,
              margin: { bottom: 5 }
            }}
            uiBackground={{ color: Color4.create(0.2, 0.2, 0.2, 0.8) }}
          >
            <UiEntity
              uiTransform={{
                width: `${(p2Health / p2MaxHealth) * 100}%`,
                height: '100%',
              }}
              uiBackground={{ color: Color4.create(0.2, 0.8, 0.2, 1) }}
            />
          </UiEntity>
          <Label
            value={`HP: ${p2Health}/${p2MaxHealth} | ${p2Anim.toUpperCase()}`}
            fontSize={14}
            color={Color4.White()}
            uiTransform={{ width: '100%', height: 20 }}
          />
        </UiEntity>
      </UiEntity>

      {/* Controls Hint (Bottom) */}
      <UiEntity
        uiTransform={{
          width: 600,
          height: 180,
          position: { bottom: 20, left: '50%' },
          positionType: 'absolute',
          flexDirection: 'column',
          alignItems: 'center',
        }}
        uiBackground={{ color: Color4.create(0, 0, 0, 0.7) }}
      >
        <Label
          value="CONTROLS"
          fontSize={18}
          color={Color4.Yellow()}
          uiTransform={{ width: '100%', height: 30, margin: {top: 10} }}
        />
        <Label
          value="WASD - Move | E - Attack"
          fontSize={14}
          color={Color4.White()}
          uiTransform={{ width: '100%', height: 25 }}
        />
        <Label
          value="Get close to your opponent to land hits!"
          fontSize={12}
          color={Color4.Gray()}
          uiTransform={{ width: '100%', height: 25 }}
        />
        <Label
          value="Enemy AI will chase and attack you!"
          fontSize={12}
          color={Color4.create(1, 0.5, 0.5, 1)}
          uiTransform={{ width: '100%', height: 25 }}
        />
        <Label
          value="Animations play based on your actions"
          fontSize={11}
          color={Color4.create(0.7, 0.7, 0.7, 1)}
          uiTransform={{ width: '100%', height: 25 }}
        />
      </UiEntity>

      {/* Countdown Overlay */}
      {countdownTimer > 0 && (
        <UiEntity
          uiTransform={{
            width: '100%',
            height: '100%',
            position: { top: 0, left: 0 },
            positionType: 'absolute',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
          }}
          uiBackground={{ color: Color4.create(0, 0, 0, 0.5) }}
        >
          <Label
            value={countdownTimer > 2 ? 'ROUND 1' : countdownTimer > 1 ? 'READY...' : 'FIGHT!'}
            fontSize={72}
            color={Color4.Yellow()}
            uiTransform={{ width: '100%', height: 120 }}
          />
          <Label
            value={Math.ceil(countdownTimer).toString()}
            fontSize={48}
            color={Color4.White()}
            uiTransform={{ width: '100%', height: 80, margin: { top: 20 } }}
          />
        </UiEntity>
      )}

      {/* KO/Win Screen Overlay */}
      {!isMatchActive && winner && (
        <UiEntity
          uiTransform={{
            width: '100%',
            height: '100%',
            position: { top: 0, left: 0 },
            positionType: 'absolute',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
          }}
          uiBackground={{ color: Color4.create(0, 0, 0, 0.85) }}
        >
          <Label
            value={winner === 'player' ? '🏆 YOU WIN! 🏆' : '💀 YOU LOSE 💀'}
            fontSize={48}
            color={winner === 'player' ? Color4.Yellow() : Color4.Red()}
            uiTransform={{ width: '100%', height: 80, margin: {bottom: 20} }}
          />
          <Label
            value={winner === 'player' ? 'VICTORY!' : 'DEFEAT'}
            fontSize={32}
            color={Color4.White()}
            uiTransform={{ width: '100%', height: 50, margin: {bottom: 30} }}
          />
          <UiEntity
            uiTransform={{
              width: 500,
              height: 220,
              flexDirection: 'column',
              alignItems: 'center',
            }}
            uiBackground={{ color: Color4.create(0.1, 0.1, 0.1, 0.9) }}
          >
            <Label
              value="Match Over"
              fontSize={24}
              color={Color4.Gray()}
              uiTransform={{ width: '100%', height: 40, margin: {top: 15} }}
            />
            <Label
              value={`Final Score: ${p1Health} HP vs ${p2Health} HP`}
              fontSize={16}
              color={Color4.White()}
              uiTransform={{ width: '100%', height: 30 }}
            />
            
            {/* Restart Match Button */}
            <Button
              value="RESTART MATCH"
              variant="primary"
              uiTransform={{ width: 300, height: 50, margin: { top: 20 } }}
              fontSize={18}
              onMouseDown={() => {
                console.log('🔄 Restart button clicked')
                resetMatch()
              }}
            />
            
            {/* Main Menu Button (placeholder) */}
            <Button
              value="MAIN MENU (Coming Soon)"
              variant="secondary"
              uiTransform={{ width: 300, height: 40, margin: { top: 10 } }}
              fontSize={14}
              onMouseDown={() => {
                console.log('⚠️ Main menu not implemented yet')
              }}
            />
          </UiEntity>
        </UiEntity>
      )}
    </UiEntity>
  )
}
