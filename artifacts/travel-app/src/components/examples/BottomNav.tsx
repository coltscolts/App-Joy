import { BottomNav } from '../BottomNav';
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "../../lib/queryClient";

export default function BottomNavExample() {
  return (
    <QueryClientProvider client={queryClient}>
      <div className="h-screen flex flex-col">
        <div className="flex-1 p-4">
          <p className="text-center text-muted-foreground">App content goes here</p>
        </div>
        <BottomNav />
      </div>
    </QueryClientProvider>
  );
}
