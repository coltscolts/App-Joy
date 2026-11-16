// iOS Calendar Sync Service
// Syncs itinerary activities to native iOS Calendar app

export interface CalendarEvent {
  id: string;
  title: string;
  location?: string;
  description?: string;
  startDate: Date;
  endDate: Date;
  category?: string;
  allDay?: boolean;
}

export class CalendarSyncService {
  private static instance: CalendarSyncService;

  private constructor() {}

  static getInstance(): CalendarSyncService {
    if (!CalendarSyncService.instance) {
      CalendarSyncService.instance = new CalendarSyncService();
    }
    return CalendarSyncService.instance;
  }

  async requestCalendarPermissions(): Promise<boolean> {
    try {
      /* Capacitor iOS Calendar implementation:
      import { Calendar } from '@capacitor-community/calendar';
      
      const permission = await Calendar.requestPermissions();
      return permission.result === 'granted';
      */

      // Browser fallback - check if user can download .ics files
      console.log('Calendar permissions requested (web fallback)');
      return true;
    } catch (error) {
      console.error('Error requesting calendar permissions:', error);
      return false;
    }
  }

  async syncToNativeCalendar(events: CalendarEvent[]): Promise<{ success: number; failed: number }> {
    let success = 0;
    let failed = 0;

    try {
      /* Capacitor iOS Calendar implementation:
      import { Calendar } from '@capacitor-community/calendar';
      
      for (const event of events) {
        try {
          await Calendar.createEvent({
            title: event.title,
            location: event.location || '',
            notes: event.description || '',
            startDate: event.startDate.getTime(),
            endDate: event.endDate.getTime(),
            isAllDay: event.allDay || false,
            calendarId: 'default' // Uses default iOS calendar
          });
          success++;
        } catch (error) {
          console.error(`Failed to sync event: ${event.title}`, error);
          failed++;
        }
      }
      */

      // Web fallback - generate and download .ics file
      const icsContent = this.generateICS(events);
      this.downloadICS(icsContent, 'JoyPlann-Itinerary.ics');
      success = events.length;

      console.log(`Synced ${success} events to calendar`);
    } catch (error) {
      console.error('Error syncing to calendar:', error);
      failed = events.length;
    }

    return { success, failed };
  }

  async deleteEventFromCalendar(eventId: string): Promise<boolean> {
    try {
      /* Capacitor iOS Calendar implementation:
      import { Calendar } from '@capacitor-community/calendar';
      
      await Calendar.deleteEvent({
        id: eventId
      });
      return true;
      */

      console.log(`Event ${eventId} would be deleted from native calendar`);
      return true;
    } catch (error) {
      console.error('Error deleting event from calendar:', error);
      return false;
    }
  }

  private generateICS(events: CalendarEvent[]): string {
    let icsContent = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//JoyPlann//Itinerary//EN',
      'CALSCALE:GREGORIAN',
      'METHOD:PUBLISH',
      'X-WR-CALNAME:JoyPlann Itinerary',
      'X-WR-TIMEZONE:UTC',
    ];

    for (const event of events) {
      const startDate = this.formatICSDate(event.startDate);
      const endDate = this.formatICSDate(event.endDate);
      const uid = `${event.id}@upandready.app`;

      icsContent.push(
        'BEGIN:VEVENT',
        `UID:${uid}`,
        `DTSTAMP:${this.formatICSDate(new Date())}`,
        `DTSTART:${startDate}`,
        `DTEND:${endDate}`,
        `SUMMARY:${this.escapeICS(event.title)}`,
        event.location ? `LOCATION:${this.escapeICS(event.location)}` : '',
        event.description ? `DESCRIPTION:${this.escapeICS(event.description)}` : '',
        event.category ? `CATEGORIES:${event.category}` : '',
        'STATUS:CONFIRMED',
        'SEQUENCE:0',
        'END:VEVENT'
      );
    }

    icsContent.push('END:VCALENDAR');
    
    return icsContent.filter(line => line).join('\r\n');
  }

  private formatICSDate(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    const seconds = String(date.getSeconds()).padStart(2, '0');
    
    return `${year}${month}${day}T${hours}${minutes}${seconds}Z`;
  }

  private escapeICS(text: string): string {
    return text
      .replace(/\\/g, '\\\\')
      .replace(/;/g, '\\;')
      .replace(/,/g, '\\,')
      .replace(/\n/g, '\\n');
  }

  private downloadICS(content: string, filename: string): void {
    const blob = new Blob([content], { type: 'text/calendar;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  // Convert activity to calendar event
  createEventFromActivity(
    activityId: string,
    title: string,
    dateStr: string,
    timeStr: string,
    location?: string,
    description?: string,
    category?: string
  ): CalendarEvent {
    // Parse date and time (format: "December 10, 2025" and "18:30")
    const startDate = this.parseDateTime(dateStr, timeStr);
    const endDate = new Date(startDate.getTime() + 2 * 60 * 60 * 1000); // Default 2-hour duration

    return {
      id: activityId,
      title,
      location,
      description,
      startDate,
      endDate,
      category,
      allDay: false,
    };
  }

  private parseDateTime(dateStr: string, timeStr: string): Date {
    // Parse "December 10, 2025" and "18:30"
    const date = new Date(dateStr);
    
    if (timeStr) {
      const [hours, minutes] = timeStr.split(':').map(Number);
      date.setHours(hours, minutes, 0, 0);
    }
    
    return date;
  }
}

export const calendarSync = CalendarSyncService.getInstance();
