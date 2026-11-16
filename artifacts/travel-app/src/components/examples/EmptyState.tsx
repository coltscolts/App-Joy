import { EmptyState } from '../EmptyState';
import { Calendar } from 'lucide-react';

export default function EmptyStateExample() {
  return (
    <div className="p-4">
      <EmptyState
        icon={<Calendar className="w-16 h-16" />}
        title="No activities yet"
        description="Start building your perfect itinerary by adding activities or getting AI-powered suggestions"
        actionLabel="Add Activity"
        secondaryActionLabel="Get Suggestions"
        onAction={() => console.log('Add activity clicked')}
        onSecondaryAction={() => console.log('Get suggestions clicked')}
      />
    </div>
  );
}
