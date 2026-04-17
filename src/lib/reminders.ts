import { registerPlugin } from '@capacitor/core'

interface RemindersPlugin {
  requestPermission(): Promise<{ granted: boolean }>
  syncItems(options: { items: { id: string; title: string; completed: boolean }[] }): Promise<void>
  getCompletions(): Promise<{ items: { id: string; completed: boolean }[] }>
}

const RemindersPlugin = registerPlugin<RemindersPlugin>('Reminders')

// Returns true if running inside a Capacitor native app (not web browser)
function isNative(): boolean {
  const cap = (window as any).Capacitor
  console.log('[Reminders] Capacitor:', JSON.stringify(cap))
  if (!cap) return false
  if (typeof cap.isNativePlatform === 'function') return cap.isNativePlatform()
  if (cap.platform) return cap.platform !== 'web'
  return false
}

export async function requestRemindersPermission(): Promise<boolean> {
  console.log('[Reminders] isNative:', isNative())
  console.log('[Reminders] Capacitor object:', (window as any).Capacitor)
  if (!isNative()) { console.log('[Reminders] not native, skipping'); return false }
  try {
    console.log('[Reminders] calling requestPermission...')
    const { granted } = await RemindersPlugin.requestPermission()
    console.log('[Reminders] granted:', granted)
    return granted
  } catch (e) {
    console.log('[Reminders] error:', e)
    return false
  }
}

export async function syncGroceriesToReminders(
  items: { id: string; text: string; checked: boolean }[]
): Promise<void> {
  if (!isNative()) return
  try {
    await RemindersPlugin.syncItems({
      items: items.map(i => ({ id: i.id, title: i.text, completed: i.checked })),
    })
  } catch {
    // Silently fail — sync is best-effort
  }
}

export async function pullCompletionsFromReminders(
  items: { id: string; text: string; checked: boolean }[]
): Promise<{ id: string; text: string; checked: boolean }[]> {
  if (!isNative()) return items
  try {
    const { items: remoteItems } = await RemindersPlugin.getCompletions()
    const remoteMap = new Map(remoteItems.map(r => [r.id, r.completed]))
    return items.map(item =>
      remoteMap.has(item.id) ? { ...item, checked: remoteMap.get(item.id)! } : item
    )
  } catch {
    return items
  }
}
