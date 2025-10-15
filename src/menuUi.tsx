/**
 * Menu UI for Fright Night - Mortal Kombat inspired
 * Flow: Title -> Character Select (Player) -> Character Select (Enemy) -> Stage Select -> Loading -> Battle
 */

import { Color4 } from '@dcl/sdk/math'
import ReactEcs, { Label, ReactEcsRenderer, UiEntity, Button } from '@dcl/sdk/react-ecs'
import { 
  MenuStateComponent, 
  getMenuState, 
  CHARACTERS, 
  STAGES, 
  Character, 
  Stage,
  CharacterId,
  StageId
} from './menuState'

export function setupMenuUi() {
  ReactEcsRenderer.setUiRenderer(menuUiComponent)
}

export const menuUiComponent = () => {
  const menuStateEntity = getMenuState()
  const menuState = menuStateEntity ? MenuStateComponent.getOrNull(menuStateEntity) : null
  
  if (!menuState) return null

  const currentScreen = menuState.currentScreen

  return (
    <UiEntity uiTransform={{ width: '100%', height: '100%' }}>
      {currentScreen === 'title' && <TitleScreen />}
      {currentScreen === 'characterSelect' && <CharacterSelectScreen />}
      {currentScreen === 'stageSelect' && <StageSelectScreen />}
      {currentScreen === 'loading' && <LoadingScreen />}
    </UiEntity>
  )
}

/**
 * Title Screen - Arcade Mode / VS Mode
 */
const TitleScreen = () => {
  const handleVSMode = () => {
    const menuStateEntity = getMenuState()
    if (menuStateEntity) {
      const menuState = MenuStateComponent.getMutable(menuStateEntity)
      menuState.currentScreen = 'characterSelect'
      menuState.selectingPlayer = true
      console.log('🎮 VS Mode selected')
    }
  }

  const handleArcadeMode = () => {
    console.log('⚠️ Arcade Mode - Coming Soon!')
  }

  return (
    <UiEntity
      uiTransform={{
        width: '100%',
        height: '100%',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
      }}
      uiBackground={{ color: Color4.create(0, 0, 0, 0.95) }}
    >
      {/* Title */}
      <Label
        value="FRIGHT NIGHT"
        fontSize={72}
        color={Color4.create(1, 0, 0, 1)}
        uiTransform={{ width: '100%', height: 100, margin: { bottom: 40 } }}
      />
      
      {/* Subtitle */}
      <Label
        value="CHOOSE YOUR DESTINY"
        fontSize={24}
        color={Color4.Yellow()}
        uiTransform={{ width: '100%', height: 40, margin: { bottom: 60 } }}
      />

      {/* VS Mode Button */}
      <Button
        value="VS MODE"
        variant="primary"
        fontSize={28}
        uiTransform={{ width: 400, height: 70, margin: { bottom: 20 } }}
        onMouseDown={handleVSMode}
      />

      {/* Arcade Mode Button */}
      <Button
        value="ARCADE MODE"
        variant="secondary"
        fontSize={28}
        uiTransform={{ width: 400, height: 70, margin: { bottom: 20 } }}
        onMouseDown={handleArcadeMode}
      />

      {/* Coming Soon Label for Arcade */}
      <Label
        value="(Arcade Mode - Coming Soon)"
        fontSize={14}
        color={Color4.Gray()}
        uiTransform={{ width: '100%', height: 30 }}
      />
    </UiEntity>
  )
}

/**
 * Character Select Screen - 3x3 Grid (Mortal Kombat style)
 */
const CharacterSelectScreen = () => {
  const menuStateEntity = getMenuState()
  const menuState = menuStateEntity ? MenuStateComponent.getOrNull(menuStateEntity) : null
  
  if (!menuState) return null

  const selectingPlayer = menuState.selectingPlayer
  const playerChar = menuState.playerCharacterId
  const enemyChar = menuState.enemyCharacterId

  const handleCharacterSelect = (charId: CharacterId) => {
    if (!menuStateEntity) return

    const character = CHARACTERS.find(c => c.id === charId)
    if (!character || !character.available) {
      console.log('⚠️ Character not available')
      return
    }

    const state = MenuStateComponent.getMutable(menuStateEntity)
    
    if (state.selectingPlayer) {
      // Player selecting
      state.playerCharacterId = charId
      state.selectingPlayer = false
      console.log(`✅ Player selected: ${character.name}`)
    } else {
      // Enemy selecting
      state.enemyCharacterId = charId
      state.currentScreen = 'stageSelect'
      console.log(`✅ Enemy selected: ${character.name}`)
    }
  }

  return (
    <UiEntity
      uiTransform={{
        width: '100%',
        height: '100%',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
      }}
      uiBackground={{ color: Color4.create(0, 0, 0, 0.95) }}
    >
      {/* Title */}
      <Label
        value={selectingPlayer ? 'SELECT YOUR FIGHTER' : 'SELECT ENEMY FIGHTER'}
        fontSize={48}
        color={selectingPlayer ? Color4.Yellow() : Color4.Red()}
        uiTransform={{ width: '100%', height: 80, margin: { bottom: 40 } }}
      />

      {/* Character Grid - 3x3 */}
      <UiEntity
        uiTransform={{
          width: 900,
          height: 600,
          flexDirection: 'column',
        }}
      >
        {/* Row 1 */}
        <UiEntity uiTransform={{ width: '100%', height: 200, flexDirection: 'row', justifyContent: 'space-between' }}>
          {CHARACTERS.slice(0, 3).map((char) => (
            <CharacterPortrait 
              character={char} 
              onSelect={handleCharacterSelect}
              isSelected={(selectingPlayer && playerChar === char.id) || (!selectingPlayer && enemyChar === char.id)}
            />
          ))}
        </UiEntity>

        {/* Row 2 */}
        <UiEntity uiTransform={{ width: '100%', height: 200, flexDirection: 'row', justifyContent: 'space-between' }}>
          {CHARACTERS.slice(3, 6).map((char) => (
            <CharacterPortrait 
              character={char} 
              onSelect={handleCharacterSelect}
              isSelected={(selectingPlayer && playerChar === char.id) || (!selectingPlayer && enemyChar === char.id)}
            />
          ))}
        </UiEntity>

        {/* Row 3 */}
        <UiEntity uiTransform={{ width: '100%', height: 200, flexDirection: 'row', justifyContent: 'space-between' }}>
          {CHARACTERS.slice(6, 9).map((char) => (
            <CharacterPortrait 
              character={char} 
              onSelect={handleCharacterSelect}
              isSelected={(selectingPlayer && playerChar === char.id) || (!selectingPlayer && enemyChar === char.id)}
            />
          ))}
        </UiEntity>
      </UiEntity>
    </UiEntity>
  )
}

/**
 * Character Portrait - Individual character slot
 */
const CharacterPortrait = ({ character, onSelect, isSelected }: { 
  character: Character, 
  onSelect: (id: CharacterId) => void,
  isSelected: boolean
}) => {
  return (
    <UiEntity
      uiTransform={{
        width: 280,
        height: 190,
        flexDirection: 'column',
      }}
      uiBackground={{ 
        color: isSelected 
          ? Color4.Yellow() 
          : character.available 
            ? Color4.create(0.2, 0.2, 0.2, 0.9) 
            : Color4.create(0.1, 0.1, 0.1, 0.9)
      }}
      onMouseDown={() => onSelect(character.id as CharacterId)}
    >
      {/* Portrait image */}
      <UiEntity
        uiTransform={{ width: '100%', height: 140 }}
        uiBackground={
          character.available 
            ? { 
                textureMode: 'stretch',
                texture: { src: character.portraitPath },
                color: Color4.White()
              }
            : { color: Color4.create(0.1, 0.1, 0.1, 1) }
        }
      >
        {!character.available && (
          <Label
            value="🔒"
            fontSize={48}
            color={Color4.White()}
            uiTransform={{ width: '100%', height: '100%' }}
          />
        )}
      </UiEntity>

      {/* Character name */}
      <Label
        value={character.name}
        fontSize={character.available ? 16 : 14}
        color={character.available ? Color4.White() : Color4.Gray()}
        uiTransform={{ width: '100%', height: 50 }}
      />
    </UiEntity>
  )
}

/**
 * Stage Select Screen - 2 stages
 */
const StageSelectScreen = () => {
  const menuStateEntity = getMenuState()
  
  const handleStageSelect = (stageId: StageId) => {
    if (!menuStateEntity) return

    const state = MenuStateComponent.getMutable(menuStateEntity)
    state.stageId = stageId
    state.currentScreen = 'loading'
    
    const stage = STAGES.find(s => s.id === stageId)
    console.log(`✅ Stage selected: ${stage?.name}`)
    
    // Loading screen timer will be handled by menuSystem
  }

  return (
    <UiEntity
      uiTransform={{
        width: '100%',
        height: '100%',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
      }}
      uiBackground={{ color: Color4.create(0, 0, 0, 0.95) }}
    >
      {/* Title */}
      <Label
        value="SELECT YOUR BATTLEFIELD"
        fontSize={48}
        color={Color4.Red()}
        uiTransform={{ width: '100%', height: 80, margin: { bottom: 60 } }}
      />

      {/* Stage Selection - 2 stages side by side */}
      <UiEntity
        uiTransform={{
          width: 1000,
          height: 400,
          flexDirection: 'row',
          justifyContent: 'space-between',
        }}
      >
        {STAGES.map((stage) => (
          <StagePreview stage={stage} onSelect={handleStageSelect} />
        ))}
      </UiEntity>
    </UiEntity>
  )
}

/**
 * Stage Preview - Individual stage slot
 */
const StagePreview = ({ stage, onSelect }: { stage: Stage, onSelect: (id: StageId) => void }) => {
  return (
    <UiEntity
      uiTransform={{
        width: 480,
        height: 400,
        flexDirection: 'column',
      }}
      uiBackground={{ color: Color4.create(0.2, 0.2, 0.2, 0.9) }}
      onMouseDown={() => onSelect(stage.id as StageId)}
    >
      {/* Stage preview image */}
      <UiEntity
        uiTransform={{ width: '100%', height: 320 }}
        uiBackground={{ 
          textureMode: 'stretch',
          texture: { src: stage.previewPath },
          color: Color4.White()
        }}
      />

      {/* Stage name */}
      <Label
        value={stage.name}
        fontSize={24}
        color={Color4.Yellow()}
        uiTransform={{ width: '100%', height: 80 }}
      />
    </UiEntity>
  )
}

/**
 * Loading Screen - Quick transition
 */
const LoadingScreen = () => {
  return (
    <UiEntity
      uiTransform={{
        width: '100%',
        height: '100%',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
      }}
      uiBackground={{ color: Color4.create(0, 0, 0, 1) }}
    >
      <Label
        value="LOADING..."
        fontSize={64}
        color={Color4.Red()}
        uiTransform={{ width: '100%', height: 100 }}
      />
      
      <Label
        value="PREPARE FOR BATTLE"
        fontSize={28}
        color={Color4.Yellow()}
        uiTransform={{ width: '100%', height: 60, margin: { top: 20 } }}
      />
    </UiEntity>
  )
}

