import { SuggestionCard } from '../SuggestionCard';

export default function SuggestionCardExample() {
  return (
    <div className="space-y-3 p-4 max-w-md">
      <SuggestionCard
        title="Versailles Palace & Gardens"
        category="cultural"
        description="Explore the opulent royal château with stunning gardens and Hall of Mirrors"
        location="Versailles, 20km from Paris"
        estimatedTime="4-5 hours"
        kidFriendly={true}
        onAdd={() => console.log('Added to itinerary')}
      />
      
      <SuggestionCard
        title="Morning Run at Bois de Boulogne"
        category="fitness"
        description="Scenic running route through Paris's largest park with lakes and trails"
        location="16th arrondissement"
        estimatedTime="1-2 hours"
        onAdd={() => console.log('Added to itinerary')}
      />
      
      <SuggestionCard
        title="Jazz Club at Caveau de la Huchette"
        category="nightlife"
        description="Historic jazz club in a medieval cellar, live music nightly"
        location="Latin Quarter"
        estimatedTime="2-3 hours"
        onAdd={() => console.log('Added to itinerary')}
      />
    </div>
  );
}
