import { NotificationSettings } from '../NotificationSettings';

export default function NotificationSettingsExample() {
  return (
    <div className="p-4 max-w-md">
      <NotificationSettings
        onSave={(settings) => console.log('Settings saved:', settings)}
      />
    </div>
  );
}
