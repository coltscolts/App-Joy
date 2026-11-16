import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { t } from '@/lib/i18n';

export const REMINDER_TIMING_OPTIONS = [
  { minutes: 15, get label() { return t('reminder_15'); } },
  { minutes: 30, get label() { return t('reminder_30'); } },
  { minutes: 60, get label() { return t('reminder_60'); } },
  { minutes: 120, get label() { return t('reminder_120'); } },
  { minutes: 1440, get label() { return t('reminder_1440'); } },
] as const satisfies ReadonlyArray<{ minutes: number; readonly label: string }>;

type ReminderActivity = {
  id: number;
  title: string;
  date: string;
  time?: string | null;
  location?: string | null;
};

type ReminderRecord = {
  notificationId: string;
  leadMinutes: number;
};

type ReminderResult =
  | { status: 'scheduled'; message: string }
  | { status: 'needs-time' | 'past' | 'unsupported' | 'denied' | 'error'; message: string };

const notificationRecords = new Map<number, ReminderRecord>();
const ANDROID_CHANNEL_ID = 'activity-reminders';
const REMINDER_STORAGE_KEY = 'trip-planner.activity-reminders';
export const NOTIFICATION_PERMISSION_PROMPT_KEY = 'trip-planner.notification-permission-prompt-v1';

export type NotificationPermissionState = {
  granted: boolean;
  canAskAgain: boolean;
  status: string;
  supported: boolean;
};

if (Platform.OS !== 'web') {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldPlaySound: true,
      shouldSetBadge: false,
      shouldShowBanner: true,
      shouldShowList: true,
    }),
  });
}

function getActivityDateTime(activity: ReminderActivity): Date | null {
  if (!activity.time?.trim()) return null;

  const match = activity.time.trim().match(/^(\d{1,2}):(\d{2})(?:\s*(AM|PM))?$/i);
  if (!match) return null;

  let hours = Number(match[1]);
  const minutes = Number(match[2]);
  const meridiem = match[3]?.toUpperCase();
  if (minutes > 59 || hours > 23 || hours < 0) return null;
  if (meridiem) {
    if (hours < 1 || hours > 12) return null;
    if (meridiem === 'PM' && hours !== 12) hours += 12;
    if (meridiem === 'AM' && hours === 12) hours = 0;
  }

  const dateTime = new Date(`${activity.date}T${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:00`);
  return Number.isNaN(dateTime.getTime()) ? null : dateTime;
}

async function readReminderRecords(): Promise<Record<string, ReminderRecord>> {
  if (Platform.OS === 'web') return {};
  const serialized = await AsyncStorage.getItem(REMINDER_STORAGE_KEY);
  if (!serialized) return {};

  try {
    const parsed = JSON.parse(serialized);
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return {};
    return parsed as Record<string, ReminderRecord>;
  } catch {
    return {};
  }
}

async function storeReminderRecord(activityId: number, record: ReminderRecord) {
  notificationRecords.set(activityId, record);
  const records = await readReminderRecords();
  records[String(activityId)] = record;
  await AsyncStorage.setItem(REMINDER_STORAGE_KEY, JSON.stringify(records));
}

async function removeReminderRecord(activityId: number) {
  notificationRecords.delete(activityId);
  const records = await readReminderRecords();
  delete records[String(activityId)];
  await AsyncStorage.setItem(REMINDER_STORAGE_KEY, JSON.stringify(records));
}

async function configureAndroidChannel() {
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync(ANDROID_CHANNEL_ID, {
      name: t('reminder_channel_name'),
      description: t('reminder_channel_desc'),
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 250, 150, 250],
      sound: 'default',
    });
  }
}

export async function getNotificationPermissionState(): Promise<NotificationPermissionState> {
  if (Platform.OS === 'web') {
    if (typeof Notification === 'undefined') {
      return { granted: false, canAskAgain: false, status: 'unsupported', supported: false };
    }

    const status = Notification.permission;
    return {
      granted: status === 'granted',
      canAskAgain: status === 'default',
      status,
      supported: true,
    };
  }

  const permission = await Notifications.getPermissionsAsync();
  return {
    granted: permission.granted,
    canAskAgain: permission.canAskAgain,
    status: permission.status,
    supported: true,
  };
}

export async function requestReminderPermission(): Promise<{ granted: boolean; message?: string }> {
  if (Platform.OS === 'web') {
    return {
      granted: false,
      message: t('reminder_web_not_supported'),
    };
  }

  await configureAndroidChannel();
  const current = await Notifications.getPermissionsAsync();
  const permission = current.granted ? current : await Notifications.requestPermissionsAsync();

  if (permission.granted) return { granted: true };

  return {
    granted: false,
    message: permission.canAskAgain
      ? t('reminder_permission_denied_can_ask')
      : t('reminder_permission_denied_settings'),
  };
}

export async function scheduleActivityReminder(
  activity: ReminderActivity,
  leadMinutes: number,
): Promise<ReminderResult> {
  if (Platform.OS === 'web') {
    return {
      status: 'unsupported',
      message: t('reminder_unsupported'),
    };
  }

  const activityDateTime = getActivityDateTime(activity);
  if (!activityDateTime) {
    return {
      status: 'needs-time',
      message: t('reminder_needs_time'),
    };
  }

  const triggerDate = new Date(activityDateTime.getTime() - leadMinutes * 60_000);
  if (triggerDate.getTime() <= Date.now()) {
    return {
      status: 'past',
      message: t('reminder_past'),
    };
  }

  let notificationId: string | undefined;
  try {
    const permission = await requestReminderPermission();
    if (!permission.granted) {
      return { status: 'denied', message: permission.message ?? t('reminder_no_permission') };
    }

    await cancelActivityReminder(activity.id);
    notificationId = await Notifications.scheduleNotificationAsync({
      content: {
        title: t('reminder_soon_title', { title: activity.title }),
        body: activity.location
          ? t('reminder_body_with_location', { time: activity.time ?? '', location: activity.location })
          : t('reminder_body_no_location', { time: activity.time ?? '' }),
        sound: 'default',
        data: { activityId: activity.id },
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DATE,
        date: triggerDate,
        ...(Platform.OS === 'android' ? { channelId: ANDROID_CHANNEL_ID } : {}),
      },
    });
    await storeReminderRecord(activity.id, { notificationId, leadMinutes });
    return { status: 'scheduled', message: t('reminder_scheduled') };
  } catch {
    if (notificationId) {
      try {
        await Notifications.cancelScheduledNotificationAsync(notificationId);
      } catch {
        // Keep the scheduling failure non-fatal to the saved activity.
      }
      try {
        await removeReminderRecord(activity.id);
      } catch {
        // The in-memory record was cleared before attempting storage cleanup.
      }
    }
    return {
      status: 'error',
      message: t('reminder_error'),
    };
  }
}

export async function cancelActivityReminder(activityId: number) {
  if (Platform.OS === 'web') return;
  const records = await readReminderRecords();
  const record = notificationRecords.get(activityId) ?? records[String(activityId)];
  if (!record) return;
  try {
    await Notifications.cancelScheduledNotificationAsync(record.notificationId);
  } catch {
    // The native notification may already be gone after an OS restart. The
    // persisted record must still be removed so the app cannot show it as active.
  } finally {
    await removeReminderRecord(activityId);
  }
}

export async function isActivityReminderScheduled(activityId: number) {
  if (Platform.OS === 'web') return false;
  try {
    const records = await readReminderRecords();
    const record = notificationRecords.get(activityId) ?? records[String(activityId)];
    if (!record?.notificationId) return false;

    const scheduledNotifications = await Notifications.getAllScheduledNotificationsAsync();
    const isScheduled = scheduledNotifications.some(
      (notification) => notification.identifier === record.notificationId,
    );
    if (!isScheduled) {
      try {
        await removeReminderRecord(activityId);
      } catch {
        notificationRecords.delete(activityId);
      }
    }
    return isScheduled;
  } catch {
    // A record without confirmation from the native scheduler is never enough
    // to display an active reminder.
    return false;
  }
}

export async function getReminderLeadMinutes(activityId: number) {
  const records = await readReminderRecords();
  return notificationRecords.get(activityId)?.leadMinutes ?? records[String(activityId)]?.leadMinutes ?? 60;
}
