import { Button } from "@/components/ui/button";
import { Plus, Sparkles } from "lucide-react";

interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description: string;
  actionLabel?: string;
  secondaryActionLabel?: string;
  onAction?: () => void;
  onSecondaryAction?: () => void;
}

export function EmptyState({
  icon,
  title,
  description,
  actionLabel,
  secondaryActionLabel,
  onAction,
  onSecondaryAction
}: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
      {icon && (
        <div className="mb-4 text-muted-foreground">
          {icon}
        </div>
      )}
      
      <h3 className="text-lg font-semibold mb-2" data-testid="text-empty-title">
        {title}
      </h3>
      
      <p className="text-sm text-muted-foreground mb-6 max-w-sm">
        {description}
      </p>
      
      <div className="flex gap-2">
        {actionLabel && onAction && (
          <Button onClick={onAction} className="gap-2" data-testid="button-empty-action">
            <Plus className="w-4 h-4" />
            {actionLabel}
          </Button>
        )}
        
        {secondaryActionLabel && onSecondaryAction && (
          <Button 
            variant="outline" 
            onClick={onSecondaryAction}
            className="gap-2"
            data-testid="button-empty-secondary"
          >
            <Sparkles className="w-4 h-4" />
            {secondaryActionLabel}
          </Button>
        )}
      </div>
    </div>
  );
}
