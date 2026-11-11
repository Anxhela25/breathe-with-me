// Bridge to the native CalmCamera plugin (ios/App/App/CalmCameraPlugin.swift).
// The plugin sends one small reading per camera frame: { t: seconds, r, g, b: average colour 0-255 }.
import { Capacitor, registerPlugin } from '@capacitor/core'

const CalmCamera = registerPlugin('CalmCamera')

/** The calm check needs the camera and flash, which only the iPhone app can use. */
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

/** Stops the camera from changing its brightness by itself once the finger is in place. */
export const lockCalmExposure = () => CalmCamera.lockExposure()
