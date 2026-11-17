import * as Notifications from 'expo-notifications';

// Avisos locales: llegan aunque la app esté cerrada (recordatorios, juntas, briefing).
Notifications.setNotificationHandler({
  handleNotification: async () => ({ shouldShowBanner: false, shouldShowList: true, shouldPlaySound: false, shouldSetBadge: false }),
});

const PREFIX = 'leadovex-';

export async function sync(items: { id: string; title: string; body: string; at: string }[]) {
  let perm = await Notifications.getPermissionsAsync();
  if (!perm.granted) perm = await Notifications.requestPermissionsAsync();
  if (!perm.granted) throw new Error('Permite las notificaciones en Ajustes del iPhone → Leadovex');
  const scheduled = await Notifications.getAllScheduledNotificationsAsync();
  await Promise.all(scheduled.filter((n) => n.identifier.startsWith(PREFIX)).map((n) => Notifications.cancelScheduledNotificationAsync(n.identifier)));
  let count = 0;
  for (const it of items.slice(0, 60)) {
    const date = new Date(it.at);
    if (date.getTime() <= Date.now()) continue;
    await Notifications.scheduleNotificationAsync({
      identifier: `${PREFIX}${it.id}`.slice(0, 200),
      content: { title: it.title, body: it.body, sound: 'default' },
      trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date },
    });
    count++;
  }
  return { scheduled: count };
}
