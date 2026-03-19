"use client";

import { MapPin, Star, TrendingUp, Navigation } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { useUserContextStore } from "@/store/userContextStore";
import { useGeoLocation } from "@/hooks/useGeoLocation";
import { useI18n } from "@/lib/i18n/i18n";

export function ContextSidebar() {
  const location = useUserContextStore((s) => s.location);
  const preference = useUserContextStore((s) => s.preference);
  const planningMode = useUserContextStore((s) => s.planningMode);
  const favorites = useUserContextStore((s) => s.favoriteStations);
  const { detectByIP, loading } = useGeoLocation();
  const { t } = useI18n();

  const prefLabels: Record<string, string> = {
    fast: t("context.pref.fast"),
    cheap: t("context.pref.cheap"),
    balanced: t("context.pref.balanced"),
  };
  const modeLabels: Record<string, string> = {
    efficient: t("context.mode.efficient"),
    rail_experience: t("context.mode.rail_experience"),
    stopover_explore: t("context.mode.stopover_explore"),
  };

  return (
    <div className="flex h-full flex-col gap-3.5 overflow-y-auto p-3.5">
      <Card>
        <CardHeader className="p-4 pb-2">
          <CardTitle className="flex items-center gap-2 text-sm">
            <MapPin className="h-4 w-4 text-primary" />
            {t("context.location")}
          </CardTitle>
        </CardHeader>
        <CardContent className="p-4 pt-0">
          {location ? (
            <div className="space-y-1.5">
              <p className="text-sm font-semibold">{location.city}</p>
              {location.station && (
                <p className="text-xs text-muted-foreground">{t("context.location.recommendStation", { station: location.station })}</p>
              )}
              <Badge variant="secondary" className="text-xs mt-1">
                <Navigation className="h-3 w-3 mr-1" />
                {location.source === "ip" ? t("context.location.ip") : location.source === "gps" ? t("context.location.gps") : t("context.location.manual")}
              </Badge>
            </div>
          ) : (
            <div className="space-y-2">
              <p className="text-xs text-muted-foreground">{t("context.location.unset")}</p>
              <Button variant="outline" size="sm" onClick={() => detectByIP()} disabled={loading} className="w-full text-xs">
                {loading ? t("context.location.locating") : t("context.location.autoLocate")}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="p-4 pb-2">
          <CardTitle className="flex items-center gap-2 text-sm">
            <TrendingUp className="h-4 w-4 text-primary" />
            {t("context.preference")}
          </CardTitle>
        </CardHeader>
        <CardContent className="p-4 pt-0">
          <Badge variant="default" className="px-3 py-1 text-xs">{prefLabels[preference]}</Badge>
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="p-4 pb-2">
          <CardTitle className="flex items-center gap-2 text-sm">
            <TrendingUp className="h-4 w-4 text-primary" />
            {t("context.mode")}
          </CardTitle>
        </CardHeader>
        <CardContent className="p-4 pt-0">
          <Badge variant="secondary" className="px-3 py-1 text-xs">{modeLabels[planningMode]}</Badge>
        </CardContent>
      </Card>
      {favorites.length > 0 && (
        <>
          <Separator />
          <Card>
            <CardHeader className="p-4 pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <Star className="h-4 w-4 text-warning" />
                {t("context.favorites")}
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 pt-0">
              <div className="flex flex-wrap gap-1.5">
                {favorites.map((s) => (<Badge key={s} variant="secondary">{s}</Badge>))}
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
