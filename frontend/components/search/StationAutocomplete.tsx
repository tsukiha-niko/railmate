"use client";

import { useMemo } from "react";
import Autocomplete from "@mui/material/Autocomplete";
import TextField from "@mui/material/TextField";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import InputAdornment from "@mui/material/InputAdornment";
import { MapPin, Star } from "lucide-react";
import type { Station } from "@/types/trains";
import { useStations } from "@/hooks/queries/useStations";
import { useUserContextStore } from "@/store/userContextStore";

interface Props {
  label: string;
  value: string;
  onChange: (value: string) => void;
  /** 由父级统一拉取并排序，避免多实例重复计算阻塞主线程 */
  stations: Station[];
  placeholder?: string;
  onEnter?: () => void;
  endAdornment?: React.ReactNode;
}

function matchStation(station: Station, input: string): boolean {
  const q = input.toLowerCase();
  if (station.name.toLowerCase().includes(q)) return true;
  if (station.city.toLowerCase().includes(q)) return true;
  if (station.pinyin?.toLowerCase().includes(q)) return true;
  if (station.initial?.toLowerCase().includes(q)) return true;
  if (station.code.toLowerCase().includes(q)) return true;
  return false;
}

export function StationAutocomplete({ label, value, onChange, stations, placeholder, onEnter, endAdornment }: Props) {
  const favorites = useUserContextStore((s) => s.favoriteStations);
  const addFavorite = useUserContextStore((s) => s.addFavoriteStation);
  const removeFavorite = useUserContextStore((s) => s.removeFavoriteStation);
  const favSet = useMemo(() => new Set(favorites), [favorites]);

  return (
    <Autocomplete
      freeSolo
      options={stations}
      inputValue={value}
      onInputChange={(_e, newValue) => onChange(newValue)}
      getOptionLabel={(option) => typeof option === "string" ? option : option.name}
      filterOptions={(options, { inputValue }) => {
        if (!inputValue) return options.slice(0, 30);
        return options.filter((s) => matchStation(s, inputValue)).slice(0, 30);
      }}
      renderOption={({ key, ...props }, option) => {
        const isFav = favSet.has(option.name);
        return (
          <Box component="li" key={key} {...props} sx={{ display: "flex", alignItems: "center", gap: 1, py: 0.5, px: 1.5 }}>
            <Box
              component="span"
              onClick={(e: React.MouseEvent) => {
                e.stopPropagation();
                if (isFav) removeFavorite(option.name);
                else addFavorite(option.name);
              }}
              sx={{ cursor: "pointer", flexShrink: 0, display: "flex" }}
            >
              <Star size={13} fill={isFav ? "#F59E0B" : "none"} stroke={isFav ? "#F59E0B" : "currentColor"} />
            </Box>
            <Typography variant="body2" fontWeight={option.is_hub ? 600 : 400}>{option.name}</Typography>
            <Typography variant="caption" color="text.secondary" sx={{ ml: "auto" }}>{option.city}</Typography>
          </Box>
        );
      }}
      renderInput={(params) => (
        <TextField
          {...params}
          label={label}
          placeholder={placeholder}
          onKeyDown={(e) => e.key === "Enter" && onEnter?.()}
          slotProps={{
            input: {
              ...params.InputProps,
              endAdornment: (
                <>
                  {endAdornment && <InputAdornment position="end">{endAdornment}</InputAdornment>}
                  {params.InputProps.endAdornment}
                </>
              ),
            },
          }}
        />
      )}
      slotProps={{
        paper: { sx: { borderRadius: "10px", mt: 0.5 } },
        listbox: { sx: { maxHeight: 280 } },
      }}
    />
  );
}
