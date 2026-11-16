import { FilterChips } from '../FilterChips';
import { useState } from 'react';
import type { ActivityCategory } from '../CategoryIcon';

export default function FilterChipsExample() {
  const [selectedCategories, setSelectedCategories] = useState<ActivityCategory[]>(['cultural', 'restaurant']);

  const handleToggle = (category: ActivityCategory) => {
    setSelectedCategories(prev =>
      prev.includes(category)
        ? prev.filter(c => c !== category)
        : [...prev, category]
    );
  };

  return (
    <div className="p-4">
      <h3 className="text-sm font-medium mb-3">Filter Activities</h3>
      <FilterChips
        selectedCategories={selectedCategories}
        onToggleCategory={handleToggle}
        onClearAll={() => setSelectedCategories([])}
      />
      <p className="text-xs text-muted-foreground mt-4">
        Selected: {selectedCategories.length > 0 ? selectedCategories.join(', ') : 'None'}
      </p>
    </div>
  );
}
