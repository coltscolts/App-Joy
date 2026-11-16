import { ActivityCard } from '../ActivityCard';
import { useState } from 'react';

export default function ActivityCardExample() {
  const [alarms, setAlarms] = useState<Set<string>>(new Set(['1']));

  const toggleAlarm = (id: string) => {
    setAlarms(prev => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return newSet;
    });
  };

  return (
    <div className="space-y-4 p-4 max-w-md">
      <ActivityCard
        id="1"
        title="Louvre Museum"
        category="cultural"
        time="10:00 AM - 2:00 PM"
        location="Rue de Rivoli, Paris"
        distance="1.2 km from hotel"
        description="Explore the world's largest art museum and historic monument in Paris"
        kidFriendly={true}
        alarmSet={alarms.has('1')}
        onAlarmToggle={() => toggleAlarm('1')}
        onClick={() => console.log('Louvre clicked')}
      />
      
      <ActivityCard
        id="2"
        title="Morning Yoga Session"
        category="fitness"
        time="7:00 AM - 8:00 AM"
        location="Jardin du Luxembourg"
        distance="800m from hotel"
        alarmSet={alarms.has('2')}
        onAlarmToggle={() => toggleAlarm('2')}
        onClick={() => console.log('Yoga clicked')}
      />
      
      <ActivityCard
        id="3"
        title="Le Jules Verne"
        category="restaurant"
        time="7:30 PM"
        location="Eiffel Tower, Paris"
        description="Fine dining at the Eiffel Tower with panoramic views"
        alarmSet={alarms.has('3')}
        onAlarmToggle={() => toggleAlarm('3')}
        onClick={() => console.log('Restaurant clicked')}
      />
    </div>
  );
}
