import { TripHeader } from '../TripHeader';

export default function TripHeaderExample() {
  return (
    <div>
      <TripHeader
        tripName="European Adventure"
        destination="Paris → Rome → Barcelona"
        dates="Dec 10-25, 2025"
        travelers={{ adults: 2, children: 1 }}
        onSettingsClick={() => console.log('Settings clicked')}
        onNotificationsClick={() => console.log('Notifications clicked')}
      />
      <div className="p-4">
        <p className="text-muted-foreground">Content below header...</p>
      </div>
    </div>
  );
}
