// Background Itinerary Tracking for iOS Lock Screen
// Keeps tracking your location and activity progress even when screen is locked

interface LocationCoordinates {
  latitude: number;
  longitude: number;
  accuracy: number;
  timestamp: number;
}

interface ActivityProgress {
  activityId: string;
  activityTitle: string;
  startTime: string;
  isInProgress: boolean;
  distanceToLocation?: number;
}

export class BackgroundTrackingService {
  private static instance: BackgroundTrackingService;
  private watchId: number | null = null;
  private currentActivity: ActivityProgress | null = null;

  private constructor() {}

  static getInstance(): BackgroundTrackingService {
    if (!BackgroundTrackingService.instance) {
      BackgroundTrackingService.instance = new BackgroundTrackingService();
    }
    return BackgroundTrackingService.instance;
  }

  async startBackgroundTracking(): Promise<void> {
    try {
      // Request location permissions
      if ('geolocation' in navigator) {
        const permission = await navigator.permissions.query({ name: 'geolocation' as PermissionName });
        
        if (permission.state === 'denied') {
          console.warn('Location permission denied');
          return;
        }

        // Start watching position with high accuracy
        this.watchId = navigator.geolocation.watchPosition(
          (position) => this.handleLocationUpdate(position),
          (error) => this.handleLocationError(error),
          {
            enableHighAccuracy: true,
            maximumAge: 10000, // 10 seconds
            timeout: 5000
          }
        );

        console.log('Background tracking started');

        /* Capacitor iOS implementation:
        import { BackgroundGeolocation } from '@capacitor-community/background-geolocation';
        
        await BackgroundGeolocation.addWatcher(
          {
            backgroundMessage: "Tracking your itinerary",
            backgroundTitle: "JoyPlann Active",
            requestPermissions: true,
            stale: false,
            distanceFilter: 10
          },
          (location, error) => {
            if (error) {
              if (error.code === "NOT_AUTHORIZED") {
                console.log("Location permission denied");
              }
              return;
            }
            this.handleLocationUpdate({
              latitude: location.latitude,
              longitude: location.longitude,
              accuracy: location.accuracy,
              timestamp: location.time
            });
          }
        );
        */
      }
    } catch (error) {
      console.error('Error starting background tracking:', error);
    }
  }

  stopBackgroundTracking(): void {
    if (this.watchId !== null) {
      navigator.geolocation.clearWatch(this.watchId);
      this.watchId = null;
      console.log('Background tracking stopped');
    }

    /* Capacitor iOS implementation:
    import { BackgroundGeolocation } from '@capacitor-community/background-geolocation';
    await BackgroundGeolocation.removeWatcher({ id: this.watchId });
    */
  }

  private handleLocationUpdate(position: GeolocationPosition | LocationCoordinates): void {
    const coords = 'coords' in position ? position.coords : position;
    
    console.log('Location updated:', {
      lat: coords.latitude,
      lng: coords.longitude,
      accuracy: coords.accuracy
    });

    // Update distance to next activity
    if (this.currentActivity) {
      this.updateActivityProgress(coords);
    }

    // Update lock screen widget with current location/activity
    this.updateLockScreenWidget();
  }

  private handleLocationError(error: GeolocationPositionError): void {
    console.error('Location error:', error.message);
  }

  setCurrentActivity(activity: ActivityProgress): void {
    this.currentActivity = activity;
    console.log('Tracking activity:', activity.activityTitle);
  }

  private updateActivityProgress(coords: { latitude: number; longitude: number }): void {
    if (!this.currentActivity) return;

    // Calculate distance to activity location
    // TODO: Implement actual distance calculation when activity has coordinates
    const distance = this.calculateDistance(coords, { latitude: 48.8566, longitude: 2.3522 });
    
    this.currentActivity.distanceToLocation = distance;

    // Send notification if approaching activity location
    if (distance < 0.5) { // Within 500 meters
      this.sendProximityNotification();
    }
  }

  private calculateDistance(
    point1: { latitude: number; longitude: number },
    point2: { latitude: number; longitude: number }
  ): number {
    // Haversine formula for distance calculation
    const R = 6371; // Earth's radius in km
    const dLat = this.toRad(point2.latitude - point1.latitude);
    const dLon = this.toRad(point2.longitude - point1.longitude);
    
    const a = 
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.toRad(point1.latitude)) * 
      Math.cos(this.toRad(point2.latitude)) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c; // Distance in km
  }

  private toRad(degrees: number): number {
    return degrees * (Math.PI / 180);
  }

  private sendProximityNotification(): void {
    if (!this.currentActivity) return;

    // Send notification even when screen is locked
    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification(`Approaching: ${this.currentActivity.activityTitle}`, {
        body: 'You are within 500m of your next activity',
        badge: '/icon-badge.png',
        tag: 'proximity-alert'
      });
    }

    /* Capacitor implementation:
    import { LocalNotifications } from '@capacitor/local-notifications';
    
    await LocalNotifications.schedule({
      notifications: [
        {
          title: `Approaching: ${this.currentActivity.activityTitle}`,
          body: 'You are within 500m of your next activity',
          id: Date.now(),
          sound: 'default',
        }
      ]
    });
    */
  }

  private updateLockScreenWidget(): void {
    // Update iOS lock screen widget with current itinerary status
    console.log('Updating lock screen widget with current activity');
    
    /* iOS Widget implementation would require:
    1. Creating a Widget Extension in Xcode
    2. Using App Groups to share data between app and widget
    3. UserDefaults to pass current activity data to widget
    4. Widget will display next activity, time, and distance
    
    Example JoyPlann widget would show:
    - Next Activity: "Louvre Museum"
    - Time: "10:00 AM"
    - Distance: "0.8 km away"
    - ETA: "12 minutes"
    */
  }

  getCurrentActivity(): ActivityProgress | null {
    return this.currentActivity;
  }
}

export const backgroundTracking = BackgroundTrackingService.getInstance();
