import { CategoryIcon, getCategoryColor, getCategoryBg, categoryLabels, type ActivityCategory } from '../CategoryIcon';

export default function CategoryIconExample() {
  const categories: ActivityCategory[] = [
    'flight', 'hotel', 'restaurant', 'train', 'tour', 
    'fitness', 'cultural', 'nightlife', 'kids', 'general'
  ];

  return (
    <div className="flex flex-wrap gap-4 p-4">
      {categories.map(category => (
        <div key={category} className="flex items-center gap-2">
          <div className={`p-2 rounded-md ${getCategoryBg(category)}`}>
            <CategoryIcon category={category} className={`w-5 h-5 ${getCategoryColor(category)}`} />
          </div>
          <span className="text-sm">{categoryLabels[category]}</span>
        </div>
      ))}
    </div>
  );
}
