import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import {
  MapPin, Navigation, Layers, Maximize2,
  ChevronUp, ChevronDown
} from "lucide-react";
import { CategoryIcon, getCategoryColor, getCategoryBg } from "@/components/CategoryIcon";
import mediterraneanImg from "@assets/generated_images/Mediterranean_coastal_city_destination_95f89823.png";
import { t } from "@/lib/i18n";

// TODO: Replace with real map implementation (Leaflet/Mapbox)
const mockLocations = [
  { id: "1", name: "Hotel Plaza Athénée", category: "hotel" as const, lat: 48.8662, lng: 2.3035 },
  { id: "2", name: "Eiffel Tower", category: "tour" as const, lat: 48.8584, lng: 2.2945 },
  { id: "3", name: "Louvre Museum", category: "cultural" as const, lat: 48.8606, lng: 2.3376 },
  { id: "4", name: "Café de Flore", category: "restaurant" as const, lat: 48.8543, lng: 2.3320 },
];

export default function MapView() {
  const [isDrawerOpen, setIsDrawerOpen] = useState(true);
  const [selectedLocation, setSelectedLocation] = useState<typeof mockLocations[0] | null>(null);

  return (
    <div className="h-screen bg-background flex flex-col">
      {/* Map Container */}
      <div className="flex-1 relative">
        {/* TODO: Replace with actual map component */}
        <div
          className="w-full h-full bg-muted relative"
          style={{
            backgroundImage: `url(${mediterraneanImg})`,
            backgroundSize: 'cover',
            backgroundPosition: 'center'
          }}
        >
          {/* Map overlay for demonstration */}
          <div className="absolute inset-0 bg-background/40 backdrop-blur-[2px]" />

          {/* Mock map markers */}
          <div className="absolute inset-0">
            {mockLocations.map((location, index) => (
              <button
                key={location.id}
                className={`absolute p-2 rounded-full ${getCategoryBg(location.category)} shadow-lg hover-elevate active-elevate-2 transition-all`}
                style={{
                  left: `${30 + index * 15}%`,
                  top: `${30 + index * 10}%`,
                }}
                onClick={() => setSelectedLocation(location)}
                data-testid={`marker-${location.category}`}
                aria-label={location.name}
              >
                <CategoryIcon
                  category={location.category}
                  className={`w-5 h-5 ${getCategoryColor(location.category)}`}
                />
              </button>
            ))}
          </div>

          {/* Map Controls */}
          <div className="absolute top-4 right-4 flex flex-col gap-2">
            <Button
              size="icon"
              variant="secondary"
              className="bg-card shadow-lg"
              data-testid="button-map-layers"
              aria-label={t("mapView.layers")}
            >
              <Layers className="w-4 h-4" />
            </Button>
            <Button
              size="icon"
              variant="secondary"
              className="bg-card shadow-lg"
              data-testid="button-map-center"
              aria-label={t("mapView.center")}
            >
              <Navigation className="w-4 h-4" />
            </Button>
            <Button
              size="icon"
              variant="secondary"
              className="bg-card shadow-lg"
              data-testid="button-map-fullscreen"
              aria-label={t("mapView.fullscreen")}
            >
              <Maximize2 className="w-4 h-4" />
            </Button>
          </div>

          {/* Selected Location Popup */}
          {selectedLocation && (
            <Card className="absolute top-4 left-4 right-4 p-4 shadow-xl">
              <div className="flex items-start gap-3">
                <div className={`p-2 rounded-md ${getCategoryBg(selectedLocation.category)}`}>
                  <CategoryIcon
                    category={selectedLocation.category}
                    className={`w-5 h-5 ${getCategoryColor(selectedLocation.category)}`}
                  />
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold mb-1">{selectedLocation.name}</h3>
                  <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                    <MapPin className="w-3.5 h-3.5" />
                    <span>{t("mapView.tapForDirections")}</span>
                  </div>
                </div>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => setSelectedLocation(null)}
                  aria-label={t("mapView.close")}
                >
                  ✕
                </Button>
              </div>
            </Card>
          )}
        </div>
      </div>

      {/* Bottom Drawer */}
      <div className={`bg-card border-t border-border transition-all ${isDrawerOpen ? 'h-64' : 'h-16'}`}>
        <button
          className="w-full p-3 flex items-center justify-between hover-elevate active-elevate-2"
          onClick={() => setIsDrawerOpen(!isDrawerOpen)}
          data-testid="button-drawer-toggle"
          aria-expanded={isDrawerOpen}
        >
          <div className="flex items-center gap-2">
            <MapPin className="w-5 h-5 text-primary" />
            <span className="font-semibold">
              {t("mapView.locations", { count: String(mockLocations.length) })}
            </span>
          </div>
          {isDrawerOpen ? (
            <ChevronDown className="w-5 h-5 text-muted-foreground" />
          ) : (
            <ChevronUp className="w-5 h-5 text-muted-foreground" />
          )}
        </button>

        {isDrawerOpen && (
          <div className="px-4 pb-20 overflow-y-auto">
            <div className="mb-3">
              <Badge variant="secondary" className="gap-1.5">
                <Navigation className="w-3 h-3" />
                {t("mapView.totalDistance", { dist: "12.5 km" })}
              </Badge>
            </div>

            <div className="space-y-2">
              {mockLocations.map((location) => (
                <button
                  key={location.id}
                  className="w-full p-3 bg-muted/50 rounded-lg text-left hover-elevate active-elevate-2 transition-all"
                  onClick={() => setSelectedLocation(location)}
                  data-testid={`location-item-${location.category}`}
                >
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-md ${getCategoryBg(location.category)}`}>
                      <CategoryIcon
                        category={location.category}
                        className={`w-4 h-4 ${getCategoryColor(location.category)}`}
                      />
                    </div>
                    <span className="font-medium">{location.name}</span>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
