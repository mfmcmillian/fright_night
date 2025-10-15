/**
 * Menu State Management for Fright Night
 * Tracks game flow: Title -> Character Select -> Stage Select -> Loading -> Battle
 */

import { engine, Entity } from '@dcl/sdk/ecs'
import { Schemas } from '@dcl/sdk/ecs'

export type MenuScreen = 'title' | 'characterSelect' | 'stageSelect' | 'loading' | 'battle'

export type CharacterId = 'bandit' | 'goblin' | 'char3' | 'char4' | 'char5' | 'char6' | 'char7' | 'char8' | 'char9'
export type StageId = 'space' | 'creepy'

// Character data structure
export interface Character {
  id: CharacterId
  name: string
  modelPath: string
  portraitPath: string // Placeholder for now
  available: boolean
}

// Stage data structure
export interface Stage {
  id: StageId
  name: string
  skyboxFolder: string
  previewPath: string // Placeholder for now
}

// Available characters (9 total - Mortal Kombat 3x3 grid)
export const CHARACTERS: Character[] = [
  {
    id: 'bandit',
    name: 'EXECUTIONER',
    modelPath: 'models/bandit.glb',
    portraitPath: 'images/portraits/1.jpg',
    available: true
  },
  {
    id: 'goblin',
    name: 'UNDEAD KNIGHT',
    modelPath: 'models/goblin.glb',
    portraitPath: 'images/portraits/4.jpg',
    available: true
  },
  {
    id: 'char3',
    name: 'OLIGAR',
    modelPath: 'models/Oligar.glb',
    portraitPath: 'images/portraits/6.jpg',
    available: true
  },
  {
    id: 'char4',
    name: 'CAPTAIN TREWS',
    modelPath: 'models/darkknight.glb',
    portraitPath: 'images/portraits/2.jpg',
    available: true
  },
  {
    id: 'char5',
    name: 'ANTROM GAURD',
    modelPath: 'models/knightsword.glb',
    portraitPath: 'images/portraits/5.jpg',
    available: true
  },
  {
    id: 'char6',
    name: 'WASTELANDER',
    modelPath: 'models/desertnpcm.glb',
    portraitPath: 'images/portraits/3.jpg',
    available: true
  },
  {
    id: 'char7',
    name: 'DEMON KING',
    modelPath: 'models/undeadking.glb',
    portraitPath: 'images/portraits/9.jpg',
    available: true
  },
  {
    id: 'char8',
    name: 'MORGANITE',
    modelPath: 'models/rockmonster.glb',
    portraitPath: 'images/portraits/7.jpg',
    available: true
  },
  {
    id: 'char9',
    name: 'AGIES',
    modelPath: 'models/treemonster.glb',
    portraitPath: 'images/portraits/8.jpg',
    available: true
  }
]

// Available stages (2 total)
export const STAGES: Stage[] = [
  {
    id: 'space',
    name: 'SPACE STATION',
    skyboxFolder: 'images/skybox/2',
    previewPath: 'images/stages/space station stage for fighting game.jpg'
  },
  {
    id: 'creepy',
    name: 'HAUNTED REALM',
    skyboxFolder: 'images/creepy-skybox',
    previewPath: 'images/stages/haunted roof top stage for fighting game.jpg'
  }
]

// Menu state component
export const MenuStateComponent = engine.defineComponent('menu::state', {
  currentScreen: Schemas.String,
  playerCharacterId: Schemas.String,
  enemyCharacterId: Schemas.String,
  stageId: Schemas.String,
  selectingPlayer: Schemas.Boolean, // true = player picking, false = enemy picking
  loadingTimer: Schemas.Number // Timer for loading screen (2 seconds)
})

let menuStateEntity: Entity | null = null

/**
 * Initialize menu state
 */
export function createMenuState(): Entity {
  menuStateEntity = engine.addEntity()
  MenuStateComponent.create(menuStateEntity, {
    currentScreen: 'title',
    playerCharacterId: '',
    enemyCharacterId: '',
    stageId: '',
    selectingPlayer: true,
    loadingTimer: 0
  })
  console.log('✅ Menu state initialized')
  return menuStateEntity
}

/**
 * Get menu state entity
 */
export function getMenuState(): Entity | null {
  return menuStateEntity
}

/**
 * Get character by ID
 */
export function getCharacterById(id: CharacterId): Character | undefined {
  return CHARACTERS.find((c) => c.id === id)
}

/**
 * Get stage by ID
 */
export function getStageById(id: StageId): Stage | undefined {
  return STAGES.find((s) => s.id === id)
}
