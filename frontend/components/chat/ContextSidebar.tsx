"use client";

import { useState } from "react";
import { MapPin, Star, TrendingUp, Navigation, X, Plus } from "lucide-react";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import CardHeader from "@mui/material/CardHeader";
import Button from "@mui/material/Button";
import Chip from "@mui/material/Chip";
import Divider from "@mui/material/Divider";
import Typography from "@mui/material/Typography";
import Box from "@mui/material/Box";
import TextField from "@mui/material/TextField";
import IconButton from "@mui/material/IconButton";
import { useUserContextStore } from "@/store/userContextStore";
import { useGeoLocation } from "@/hooks/useGeoLocation";
import { useI18n } from "@/lib/i18n/i18n";

export function ContextSidebar() {
  const location = useUserContextStore((s) => s.location);
  const preference = useUserContextStore((s) => s.preference);
  const planningMode = useUserContextStore((s) => s.planningMode);
  const favorites = useUserContextStore((s) => s.favoriteStations);
  const addFavorite = useUserContextStore((s) => s.addFavoriteStation);
  const removeFavorite = useUserContextStore((s) => s.removeFavoriteStation);
  const { detectByIP, loading } = useGeoLocation();
  const { t } = useI18n();
  const [addingFav, setAddingFav] = useState(false);
  const [newFav, setNewFav] = useState("");

  const prefLabels: Record<string, string> = { fast: t("context.pref.fast"), cheap: t("context.pref.cheap"), balanced: t("context.pref.balanced") };
  const modeLabels: Record<string, string> = { efficient: t("context.mode.efficient"), rail_experience: t("context.mode.rail_experience"), stopover_explore: t("context.mode.stopover_explore") };

  return (
    <Box sx={{ display: "flex", flexDirection: "column", gap: 2, overflow: "auto", p: 2, height: "100%" }}>
      <Card variant="outlined" sx={{ borderRadius: "16px", borderColor: (th) => `${th.palette.divider}50`, boxShadow: "var(--shadow-xs)" }}>
        <CardHeader
          title={
            <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
              <Box sx={{ display: "flex", alignItems: "center", justifyContent: "center", width: 26, height: 26, borderRadius: "10px", bgcolor: (th) => `${th.palette.primary.main}0C` }}>
                <MapPin size={14} style={{ color: "var(--primary)" }} />
              </Box>
              <Typography variant="subtitle2">{t("context.location")}</Typography>
            </Box>
          }
          sx={{ pb: 0, px: 2, pt: 2 }}
        />
        <CardContent sx={{ px: 2, pt: 1 }}>
          {location ? (
            <Box>
              <Typography variant="body2" fontWeight={700}>{location.city}</Typography>
              {location.station && <Typography variant="caption" color="text.secondary">{t("context.location.recommendStation", { station: location.station })}</Typography>}
              <Box sx={{ mt: 0.75 }}>
                <Chip icon={<Navigation size={12} />} label={location.source === "ip" ? t("context.location.ip") : location.source === "gps" ? t("context.location.gps") : t("context.location.manual")} size="small" />
              </Box>
            </Box>
          ) : (
            <Box>
              <Typography variant="caption" color="text.secondary">{t("context.location.unset")}</Typography>
              <Button variant="outlined" size="small" fullWidth onClick={() => detectByIP()} disabled={loading} sx={{ mt: 1, borderRadius: "12px" }}>
                {loading ? t("context.location.locating") : t("context.location.autoLocate")}
              </Button>
            </Box>
          )}
        </CardContent>
      </Card>

      <Card variant="outlined" sx={{ borderRadius: "16px", borderColor: (th) => `${th.palette.divider}50`, boxShadow: "var(--shadow-xs)" }}>
        <CardHeader
          title={
            <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
              <Box sx={{ display: "flex", alignItems: "center", justifyContent: "center", width: 26, height: 26, borderRadius: "10px", bgcolor: (th) => `${th.palette.primary.main}0C` }}>
                <TrendingUp size={14} style={{ color: "var(--primary)" }} />
              </Box>
              <Typography variant="subtitle2">{t("context.preference")}</Typography>
            </Box>
          }
          sx={{ pb: 0, px: 2, pt: 2 }}
        />
        <CardContent sx={{ px: 2, pt: 1 }}>
          <Chip label={prefLabels[preference]} color="primary" size="small" />
        </CardContent>
      </Card>

      <Card variant="outlined" sx={{ borderRadius: "16px", borderColor: (th) => `${th.palette.divider}50`, boxShadow: "var(--shadow-xs)" }}>
        <CardHeader
          title={
            <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
              <Box sx={{ display: "flex", alignItems: "center", justifyContent: "center", width: 26, height: 26, borderRadius: "10px", bgcolor: (th) => `${th.palette.primary.main}0C` }}>
                <TrendingUp size={14} style={{ color: "var(--primary)" }} />
              </Box>
              <Typography variant="subtitle2">{t("context.mode")}</Typography>
            </Box>
          }
          sx={{ pb: 0, px: 2, pt: 2 }}
        />
        <CardContent sx={{ px: 2, pt: 1 }}>
          <Chip label={modeLabels[planningMode]} size="small" />
        </CardContent>
      </Card>

      <Divider sx={{ borderColor: (th) => `${th.palette.divider}40` }} />
      <Card variant="outlined" sx={{ borderRadius: "16px", borderColor: (th) => `${th.palette.divider}50`, boxShadow: "var(--shadow-xs)" }}>
        <CardHeader
          title={
            <Box sx={{ display: "flex", alignItems: "center", gap: 1, width: "100%" }}>
              <Box sx={{ display: "flex", alignItems: "center", justifyContent: "center", width: 26, height: 26, borderRadius: "10px", bgcolor: "rgba(245,158,11,0.08)" }}>
                <Star size={14} style={{ color: "#F59E0B" }} />
              </Box>
              <Typography variant="subtitle2">{t("context.favorites")}</Typography>
              <IconButton size="small" sx={{ ml: "auto" }} onClick={() => setAddingFav(!addingFav)}>
                <Plus size={14} />
              </IconButton>
            </Box>
          }
          sx={{ pb: 0, px: 2, pt: 2 }}
        />
        <CardContent sx={{ px: 2, pt: 1 }}>
          {addingFav && (
            <Box sx={{ display: "flex", gap: 0.5, mb: 1 }}>
              <TextField
                size="small"
                placeholder={t("context.favorites.addPlaceholder")}
                value={newFav}
                onChange={(e) => setNewFav(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && newFav.trim()) {
                    addFavorite(newFav.trim());
                    setNewFav("");
                    setAddingFav(false);
                  }
                }}
                sx={{ flex: 1 }}
              />
              <Button
                size="small"
                variant="contained"
                disabled={!newFav.trim()}
                onClick={() => { addFavorite(newFav.trim()); setNewFav(""); setAddingFav(false); }}
                sx={{ borderRadius: "10px", minWidth: 0, px: 1.5 }}
              >
                <Plus size={14} />
              </Button>
            </Box>
          )}
          {favorites.length > 0 ? (
            <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.75 }}>
              {favorites.map((s) => (
                <Chip
                  key={s}
                  label={s}
                  size="small"
                  onDelete={() => removeFavorite(s)}
                  deleteIcon={<X size={12} />}
                />
              ))}
            </Box>
          ) : (
            <Typography variant="caption" color="text.secondary">{t("context.favorites.empty")}</Typography>
          )}
        </CardContent>
      </Card>
    </Box>
  );
}
