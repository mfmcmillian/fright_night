import {
  engine,
} from '@dcl/sdk/ecs'
import { Color4 } from '@dcl/sdk/math'
import ReactEcs, { Label, ReactEcsRenderer, UiEntity, Button } from '@dcl/sdk/react-ecs'
import { FighterComponent, GameState } from './components'
import { getPlayerEntity, getEnemyEntity, resetMatch } from './systems'
import { getGameState } from './factory'
import { returnToMainMenu } from './menuSystem'
import { MenuStateComponent, getMenuState } from './menuState'

export function setupUi() {
  ReactEcsRenderer.setUiRenderer(battleUiComponent)
}

export const battleUiComponent = () => {
  // Check if we're in battle mode
  const menuStateEntity = getMenuState()
  const menuState = menuStateEntity ? MenuStateComponent.getOrNull(menuStateEntity) : null
  
  // Only show battle UI when in battle
  if (!menuState || menuState.currentScreen !== 'battle') {
    return null
  }
  
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
      {/* Top HUD Container - Centered and Compact */}
      <UiEntity
        uiTransform={{
          width: '100%',
          height: 120,
          flexDirection: 'row',
          justifyContent: 'center',
          alignItems: 'center',
          padding: 20,
        }}
      >
        {/* Player 1 Health Bar (Left) */}
        <UiEntity
          uiTransform={{
            width: 280,
            height: 100,
            flexDirection: 'column',
            margin: { right: 15 }
          }}
        >
          <Label
            value="BANDIT (PLAYER)"
            fontSize={16}
            color={Color4.White()}
            uiTransform={{ width: '100%', height: 25, margin: {bottom: 5} }}
          />
          <UiEntity
            uiTransform={{
              width: '100%',
              height: 35,
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
            value={`HP: ${p1Health}/${p1MaxHealth}${playerFighter && playerFighter.blocking ? ' | 🛡️ BLOCK' : ''}`}
            fontSize={12}
            color={playerFighter && playerFighter.blocking ? Color4.create(0.3, 0.8, 1, 1) : Color4.White()}
            uiTransform={{ width: '100%', height: 20 }}
          />
        </UiEntity>

        {/* Center - VS Text & Combo Counter */}
        <UiEntity
          uiTransform={{
            width: 120,
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
              value={`${comboCount} COMBO!`}
              fontSize={18}
              color={Color4.create(1, 0.5, 0, 1)}
              uiTransform={{ width: '100%', height: 30 }}
            />
          )}
        </UiEntity>

        {/* Player 2 Health Bar (Right) */}
        <UiEntity
          uiTransform={{
            width: 280,
            height: 100,
            flexDirection: 'column',
            alignItems: 'flex-end',
            margin: { left: 15 }
          }}
        >
          <Label
            value="GOBLIN (AI)"
            fontSize={16}
            color={Color4.White()}
            uiTransform={{ width: '100%', height: 25, margin: {bottom: 5} }}
          />
          <UiEntity
            uiTransform={{
              width: '100%',
              height: 35,
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
            value={`HP: ${p2Health}/${p2MaxHealth}${enemyFighter && enemyFighter.blocking ? ' | 🛡️ BLOCK' : ''}`}
            fontSize={12}
            color={enemyFighter && enemyFighter.blocking ? Color4.create(0.3, 0.8, 1, 1) : Color4.White()}
            uiTransform={{ width: '100%', height: 20 }}
          />
        </UiEntity>
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
            
            {/* Main Menu Button */}
            <Button
              value="MAIN MENU"
              variant="secondary"
              uiTransform={{ width: 300, height: 40, margin: { top: 10 } }}
              fontSize={14}
              onMouseDown={() => {
                console.log('🔙 Returning to main menu')
                returnToMainMenu()
              }}
            />
          </UiEntity>
        </UiEntity>
      )}
    </UiEntity>
  )
}
