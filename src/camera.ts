/**
 * Simple Tekken-Style Static Camera Lock
 * VirtualCamera overrides ALL default controls (zoom, pan, rotation)
 * Dead simple - no InputModifier needed for camera lock
 */

import { engine, Transform, VirtualCamera, MainCamera, Entity } from '@dcl/sdk/ecs'
import { Vector3, Quaternion } from '@dcl/sdk/math'

let sideCam: Entity | null = null

/**
 * Setup static side-view camera lock
 * VirtualCamera handles the lock solo - mouse/zoom do nothing
 */
export function setupLockedCamera(): void {
  console.log('📹 Setting up static side-view camera lock...')

  // Create static camera at good viewing angle
  sideCam = engine.addEntity()
  Transform.create(sideCam, {
    position: Vector3.create(8, 2, 4), // In front of arena, slightly elevated
    rotation: Quaternion.fromEulerDegrees(-5, 0, 0) // Look straight with slight downward tilt
  })

  VirtualCamera.create(sideCam, {
    defaultTransition: { transitionMode: VirtualCamera.Transition.Time(0) } // No fade - immediate lock
  })

  // Assign to MainCamera - this locks the view completely
  MainCamera.createOrReplace(engine.CameraEntity, {
    virtualCameraEntity: sideCam
  })

  console.log('✅ Camera locked (static side-view)')
  console.log('   → No zoom, no drag, no rotation')
  console.log('   → VirtualCamera overrides all controls')
}

/**
 * Restore default camera (unlock)
 */
export function restoreDefaultCamera(): void {
  console.log('🔓 Unlocking camera...')

  // Unset VirtualCamera to restore default controls
  const mainCam = MainCamera.getMutableOrNull(engine.CameraEntity)
  if (mainCam) {
    mainCam.virtualCameraEntity = undefined
  }

  // Cleanup camera entity
  if (sideCam) {
    engine.removeEntity(sideCam)
    sideCam = null
  }

  console.log('✅ Camera unlocked (default controls restored)')
}
