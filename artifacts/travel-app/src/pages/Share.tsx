import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Share2, Instagram, Facebook, Download,
  Map, Calendar, Image as ImageIcon
} from "lucide-react";
import { SiX } from "react-icons/si";
import europeanCityImg from "@assets/generated_images/European_city_sunset_skyline_95222b32.png";
import { fmtDate, t } from "@/lib/i18n";

export default function Share() {
  const [caption, setCaption] = useState(t("share.defaultCaption"));
  const [shareType, setShareType] = useState<"itinerary" | "map" | "activity">("itinerary");

  const shareOptions = [
    { id: "itinerary", label: t("share.fullItinerary"), icon: Calendar },
    { id: "map", label: t("share.mapView"), icon: Map },
    { id: "activity", label: t("share.activityCard"), icon: ImageIcon },
  ];

  return (
    <div className="min-h-screen bg-background pb-20">
      <div className="sticky top-0 z-40 bg-card border-b border-border backdrop-blur-lg bg-opacity-95 px-4 py-4">
        <div className="flex items-center gap-2 mb-2">
          <Share2 className="w-6 h-6 text-primary" />
          <h1 className="text-2xl font-bold">{t("share.title")}</h1>
        </div>
        <p className="text-sm text-muted-foreground">
          {t("share.subtitle")}
        </p>
      </div>

      <div className="p-4 space-y-4">
        {/* Share Type Selection */}
        <div>
          <h3 className="text-sm font-medium mb-3">{t("share.whatToShare")}</h3>
          <div className="flex gap-2 overflow-x-auto pb-2">
            {shareOptions.map((option) => {
              const Icon = option.icon;
              return (
                <Badge
                  key={option.id}
                  variant={shareType === option.id ? "default" : "outline"}
                  className="cursor-pointer gap-1.5 flex-shrink-0 hover-elevate active-elevate-2"
                  onClick={() => setShareType(option.id as typeof shareType)}
                  data-testid={`share-type-${option.id}`}
                  aria-pressed={shareType === option.id}
                >
                  <Icon className="w-3 h-3" />
                  {option.label}
                </Badge>
              );
            })}
          </div>
        </div>

        {/* Preview */}
        <Card className="overflow-hidden">
          <div className="aspect-[4/3] relative">
            <img
              src={europeanCityImg}
              alt={t("share.previewAlt")}
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
            <div className="absolute bottom-0 left-0 right-0 p-4 text-white">
              <h2 className="text-xl font-bold mb-1">{t("share.sampleTitle")}</h2>
              <p className="text-sm opacity-90">Paris → Rome → Barcelona</p>
              <p className="text-xs opacity-75 mt-1">
                {fmtDate("2025-12-10", { month: "short", day: "numeric" })} – {fmtDate("2025-12-25", { month: "short", day: "numeric", year: "numeric" })}
              </p>
            </div>
          </div>
        </Card>

        {/* Caption */}
        <div>
          <h3 className="text-sm font-medium mb-2">{t("share.caption")}</h3>
          <Textarea
            placeholder={t("share.captionPlaceholder")}
            value={caption}
            onChange={(e) => setCaption(e.target.value)}
            rows={3}
            data-testid="input-share-caption"
          />
        </div>

        {/* Social Media Buttons */}
        <div>
          <h3 className="text-sm font-medium mb-3">{t("share.shareTo")}</h3>
          <div className="grid grid-cols-2 gap-3">
            <Button
              variant="outline"
              className="gap-2 justify-start"
              onClick={() => console.log('Share to Instagram')}
              data-testid="button-share-instagram"
            >
              <Instagram className="w-4 h-4" />
              Instagram
            </Button>

            <Button
              variant="outline"
              className="gap-2 justify-start"
              onClick={() => console.log('Share to Facebook')}
              data-testid="button-share-facebook"
            >
              <Facebook className="w-4 h-4" />
              Facebook
            </Button>

            <Button
              variant="outline"
              className="gap-2 justify-start"
              onClick={() => console.log('Share to Twitter')}
              data-testid="button-share-twitter"
            >
              <SiX className="w-4 h-4" />
              Twitter/X
            </Button>

            <Button
              variant="outline"
              className="gap-2 justify-start"
              onClick={() => console.log('Download image')}
              data-testid="button-download"
            >
              <Download className="w-4 h-4" />
              {t("share.download")}
            </Button>
          </div>
        </div>

        {/* Share Button */}
        <Button
          className="w-full gap-2"
          size="lg"
          onClick={() => console.log('Sharing...')}
          data-testid="button-share-now"
        >
          <Share2 className="w-4 h-4" />
          {t("share.shareNow")}
        </Button>
      </div>
    </div>
  );
}
