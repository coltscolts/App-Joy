import { createContext, type ReactNode, useContext, useMemo, useState } from 'react';
import type { Trip } from '@workspace/api-client-react';

type TripContextValue = {
  selectedTrip: Trip | null;
  selectTrip: (trip: Trip) => void;
  clearTrip: () => void;
};

const TripContext = createContext<TripContextValue | null>(null);

export function TripProvider({ children }: { children: ReactNode }) {
  const [selectedTrip, setSelectedTrip] = useState<Trip | null>(null);
  const value = useMemo(
    () => ({
      selectedTrip,
      selectTrip: setSelectedTrip,
      clearTrip: () => setSelectedTrip(null),
    }),
    [selectedTrip],
  );

  return <TripContext.Provider value={value}>{children}</TripContext.Provider>;
}

export function useTripSelection() {
  const context = useContext(TripContext);
  if (!context) {
    throw new Error('useTripSelection must be used inside TripProvider');
  }
  return context;
}