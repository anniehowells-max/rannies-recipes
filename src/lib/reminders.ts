import { registerPlugin } from '@capacitor/core'

interface RemindersPlugin {
  requestPermission(): Promise<{ granted: boolean }>
  syncItems(options: { items: { id: string; title: string; completed: boolean }[] }): Promise<void>
  getCompletions(): Promise<{ items: { id: string; completed: boolean }[] }>
}

const RemindersPlugin = registerPlugin<RemindersPlugin>('Reminders')

// Returns true if running inside a Capacitor native app (not web browser)
function isNative(): boolean {
  return !!(window as unknown as { Capacitor?: { isNativePlatform?: () => boolean } })
    .Capacitor?.isNativePlatform?.()
}

export async function requestRemindersPermission(): Promise<boolean> {
  if (!isNative()) return false
  try {
    const { granted } = await RemindersPlugin.requestPermission()
    return granted
  } catch {
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
