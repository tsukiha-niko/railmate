"use client";

import { useState, useCallback } from "react";
import { useUserContextStore } from "@/store/userContextStore";
import { autoLocate, locateByGPS } from "@/services/chat";
import type { GeoLocation } from "@/types/geo";
import { useI18n } from "@/lib/i18n/i18n";

export function useGeoLocation() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const setLocation = useUserContextStore((s) => s.setLocation);
  const { t } = useI18n();

  const detectByIP = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const res = await autoLocate();
      if (res.success && res.location) { setLocation(res.location as GeoLocation); return res.location as GeoLocation; }
      setError(res.message || t("errors.ipLocateFailed"));
      return null;
    } catch (err) {
      setError(err instanceof Error ? err.message : t("errors.locateFailed"));
      return null;
    } finally { setLoading(false); }
  }, [setLocation, t]);

  const detectByGPS = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const pos = await new Promise<GeolocationPosition>((resolve, reject) =>
        navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 10000 }),
      );
      const res = await locateByGPS({ latitude: pos.coords.latitude, longitude: pos.coords.longitude });
      if (res.success && res.location) { setLocation(res.location as GeoLocation); return res.location as GeoLocation; }
      setError(res.message || t("errors.gpsLocateFailed"));
      return null;
    } catch (err) {
      setError(err instanceof Error ? err.message : t("errors.gpsLocateFailed"));
      return null;
    } finally { setLoading(false); }
  }, [setLocation, t]);

  return { detectByIP, detectByGPS, loading, error };
}
