import { DaySection } from '../DaySection';
import { ActivityCard } from '../ActivityCard';

export default function DaySectionExample() {
  return (
    <div className="p-4 max-w-2xl">
      <DaySection
        date="December 12, 2025"
        dayOfWeek="Monday"
        totalDistance="8.5 km"
        onAddActivity={() => console.log('Add activity clicked')}
      >
        <ActivityCard
          id="1"
          title="Eiffel Tower"
          category="tour"
          time="9:00 AM - 11:00 AM"
          location="Champ de Mars, Paris"
          distance="2.3 km from hotel"
          kidFriendly={true}
        />
        
        <ActivityCard
          id="2"
          title="Lunch at Café de Flore"
          category="restaurant"
          time="12:30 PM"
          location="172 Boulevard Saint-Germain"
          distance="1.5 km"
        />
        
        <ActivityCard
          id="3"
          title="Seine River Cruise"
          category="tour"
          time="3:00 PM - 5:00 PM"
          location="Port de la Bourdonnais"
          distance="1.8 km"
        />
      </DaySection>
    </div>
  );
}
