import { notificationService } from "./notifications";
import type { NotificationTiming } from "@/components/NotificationSettings";
import { t, locale } from "@/lib/i18n";

type ReminderActivity = {
  id: number;
  category: string;
  title: string;
  date: string;
  time?: string | null;
  location?: string | null;
  reminderEnabled?: boolean | null;
};

interface ScheduledReminder {
  activityId: number;
  timing: NotificationTiming;
  scheduledTime: Date;
  timeoutId: ReturnType<typeof setTimeout>;
}

interface ReminderSettings {
  enabled: boolean;
  timings: NotificationTiming[];
  categories: {
    flights: boolean;
    hotels: boolean;
    activities: boolean;
    restaurants: boolean;
    fitness: boolean;
  };
}

const DEFAULT_SETTINGS: ReminderSettings = {
  enabled: true,
  timings: ["1hour", "1day"],
  categories: {
    flights: true,
    hotels: true,
    activities: true,
    restaurants: true,
    fitness: true,
  },
};

const TIMING_MS: Record<NotificationTiming, number> = {
  "15min": 15 * 60 * 1000,
  "30min": 30 * 60 * 1000,
  "1hour": 60 * 60 * 1000,
  "2hours": 2 * 60 * 60 * 1000,
  "1day": 24 * 60 * 60 * 1000,
};

/** Return the localised duration label for a timing key. */
function getTimingLabel(timing: NotificationTiming): string {
  const map: Record<NotificationTiming, string> = {
    "15min": t("reminders.timing15min"),
    "30min": t("reminders.timing30min"),
    "1hour": t("reminders.timing1hour"),
    "2hours": t("reminders.timing2hours"),
    "1day": t("reminders.timing1day"),
  };
  return map[timing];
}

export class ReminderService {
  private static instance: ReminderService;
  private scheduledReminders: Map<string, ScheduledReminder> = new Map();
  private settings: ReminderSettings;

  private constructor() {
    this.settings = this.loadSettings();
  }

  static getInstance(): ReminderService {
    if (!ReminderService.instance) {
      ReminderService.instance = new ReminderService();
    }
    return ReminderService.instance;
  }

  private loadSettings(): ReminderSettings {
    try {
      const stored = localStorage.getItem("reminderSettings");
      if (stored) {
        return { ...DEFAULT_SETTINGS, ...JSON.parse(stored) };
      }
    } catch (error) {
      console.error("Error loading reminder settings:", error);
    }
    return DEFAULT_SETTINGS;
  }

  saveSettings(settings: Partial<ReminderSettings>): void {
    this.settings = { ...this.settings, ...settings };
    try {
      localStorage.setItem("reminderSettings", JSON.stringify(this.settings));
    } catch (error) {
      console.error("Error saving reminder settings:", error);
    }
  }

  getSettings(): ReminderSettings {
    return this.settings;
  }

  private getCategoryGroup(category: string): keyof ReminderSettings["categories"] | null {
    const categoryMap: Record<string, keyof ReminderSettings["categories"]> = {
      flight: "flights",
      train: "flights",
      hotel: "hotels",
      tour: "activities",
      cultural: "activities",
      nightlife: "activities",
      kids: "activities",
      transfer: "activities",
      transportation: "activities",
      general: "activities",
      restaurant: "restaurants",
      bar: "activities",
      fitness: "fitness",
    };
    return categoryMap[category] || null;
  }

  private shouldNotifyCategory(category: string): boolean {
    const group = this.getCategoryGroup(category);
    if (!group) return true;
    return this.settings.categories[group];
  }

  scheduleRemindersForActivity(activity: ReminderActivity): void {
    if (!this.settings.enabled) return;
    if (!activity.reminderEnabled) return;
    if (!this.shouldNotifyCategory(activity.category)) return;

    const activityDateTime = this.getActivityDateTime(activity);
    if (!activityDateTime) return;

    this.cancelRemindersForActivity(activity.id);

    for (const timing of this.settings.timings) {
      const reminderTime = new Date(activityDateTime.getTime() - TIMING_MS[timing]);
      const now = new Date();

      if (reminderTime > now) {
        const key = `${activity.id}-${timing}`;
        const timeUntilReminder = reminderTime.getTime() - now.getTime();

        const timeoutId = setTimeout(() => {
          this.sendReminder(activity, timing);
          this.scheduledReminders.delete(key);
        }, timeUntilReminder);

        this.scheduledReminders.set(key, {
          activityId: activity.id,
          timing,
          scheduledTime: reminderTime,
          timeoutId,
        });

        console.log(
          t("reminders.logScheduled", {
            title: activity.title,
            at: reminderTime.toLocaleString(locale),
            label: getTimingLabel(timing),
          })
        );
      }
    }
  }

  cancelRemindersForActivity(activityId: number): void {
    const entries = Array.from(this.scheduledReminders.entries());
    for (const [key, reminder] of entries) {
      if (reminder.activityId === activityId) {
        clearTimeout(reminder.timeoutId);
        this.scheduledReminders.delete(key);
      }
    }
  }

  cancelAllReminders(): void {
    const values = Array.from(this.scheduledReminders.values());
    for (const reminder of values) {
      clearTimeout(reminder.timeoutId);
    }
    this.scheduledReminders.clear();
    console.log(t("reminders.logAllCancelled"));
  }

  private getActivityDateTime(activity: ReminderActivity): Date | null {
    if (!activity.date) return null;

    try {
      let dateTimeStr = activity.date;
      if (activity.time) {
        const timeMatch = activity.time.match(/(\d{1,2}):(\d{2})\s*(AM|PM)?/i);
        if (timeMatch) {
          let hours = parseInt(timeMatch[1]);
          const minutes = parseInt(timeMatch[2]);
          const ampm = timeMatch[3]?.toUpperCase();

          if (ampm === "PM" && hours !== 12) hours += 12;
          if (ampm === "AM" && hours === 12) hours = 0;

          dateTimeStr = `${activity.date}T${hours.toString().padStart(2, "0")}:${minutes.toString().padStart(2, "0")}:00`;
        }
      } else {
        dateTimeStr = `${activity.date}T09:00:00`;
      }

      const date = new Date(dateTimeStr);
      return isNaN(date.getTime()) ? null : date;
    } catch (error) {
      console.error("Error parsing activity date/time:", error);
      return null;
    }
  }

  private async sendReminder(activity: ReminderActivity, timing: NotificationTiming): Promise<void> {
    const timeLabel = getTimingLabel(timing);

    const title = t("reminders.title", { activityTitle: activity.title });

    let body = t("reminders.bodyBase", { timeLabel });
    if (activity.location) {
      body += t("reminders.bodyAt", { location: activity.location });
    }
    if (activity.time) {
      body += t("reminders.bodyTime", { time: activity.time });
    }

    try {
      if ("Notification" in window && Notification.permission === "granted") {
        new Notification(title, {
          body,
          icon: "/favicon.ico",
          tag: `activity-${activity.id}`,
          requireInteraction: true,
        });
      }

      await notificationService.scheduleLocalNotification(title, body, new Date());
    } catch (error) {
      console.error("Error sending reminder:", error);
    }
  }

  scheduleRemindersForTrip(activities: ReminderActivity[]): void {
    for (const activity of activities) {
      this.scheduleRemindersForActivity(activity);
    }
  }

  getScheduledReminders(): { activityId: number; timing: NotificationTiming; scheduledTime: Date }[] {
    return Array.from(this.scheduledReminders.values()).map(({ activityId, timing, scheduledTime }) => ({
      activityId,
      timing,
      scheduledTime,
    }));
  }

  async requestPermissionAndEnable(): Promise<boolean> {
    const granted = await notificationService.requestPermissions();
    if (granted) {
      this.saveSettings({ enabled: true });
    }
    return granted;
  }
}

export const reminderService = ReminderService.getInstance();
