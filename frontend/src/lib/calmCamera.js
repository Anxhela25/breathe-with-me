// Bridge to the native CalmCamera plugin (CalmCameraPlugin.swift).
// One reading per frame: { t, r, g, b } with the average colour 0-255.
import { Capacitor, registerPlugin } from '@capacitor/core'

const CalmCamera = registerPlugin('CalmCamera')

/** Needs the camera + flash, so iPhone app only. */
export const calmCameraAvailable = () => Capacitor.getPlatform() === 'ios'

/** Starts the camera and flash. Returns a function that stops them. */
export async function startCalmCamera(onFrame) {
  const listener = await CalmCamera.addListener('frame', onFrame)
  try {
    await CalmCamera.start()
  } catch (err) {
    await listener.remove()
    throw err
  }
  return async () => {
    await listener.remove()
    await CalmCamera.stop()
  }
}

/** Lock exposure once the finger is in place. */
export const lockCalmExposure = () => CalmCamera.lockExposure()
