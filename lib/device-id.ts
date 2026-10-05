/**
 * Device ID generation and management
 * Uses a combination of browser fingerprinting and localStorage persistence
 */

export function generateDeviceId(): string {
  // Check if we already have a device ID stored
  const stored = localStorage.getItem('clips_device_id')
  if (stored) return stored

  // Generate a new device ID based on browser fingerprint
  const fingerprint = [
    navigator.userAgent,
    navigator.language,
    screen.width + 'x' + screen.height,
    new Date().getTimezoneOffset(),
    navigator.hardwareConcurrency || 0,
    navigator.deviceMemory || 0,
  ].join('|')

  // Create a hash from the fingerprint
  let hash = 0
  for (let i = 0; i < fingerprint.length; i++) {
    const char = fingerprint.charCodeAt(i)
    hash = ((hash << 5) - hash) + char
    hash = hash & hash // Convert to 32bit integer
  }

  // Add random component to ensure uniqueness
  const random = Math.random().toString(36).substring(2, 15)
  const deviceId = `${Math.abs(hash).toString(36)}-${random}`

  // Store it
  localStorage.setItem('clips_device_id', deviceId)

  return deviceId
}

export function getDeviceId(): string {
  return generateDeviceId()
}

export function clearDeviceId(): void {
  localStorage.removeItem('clips_device_id')
}
