export interface GeoLocation {
  city: string;
  province?: string | null;
  country?: string;
  latitude?: number | null;
  longitude?: number | null;
  ip?: string | null;
  source: "ip" | "gps" | "manual" | "unknown";
  station?: string | null;
}

export interface GPSLocationInput {
  latitude: number;
  longitude: number;
  city?: string;
}

export interface GeoLocationResponse {
  success: boolean;
  location?: GeoLocation;
  message?: string;
}

export interface UserLocationResponse {
  success: boolean;
  location?: Record<string, unknown>;
  message?: string;
}

export interface UserContextResponse {
  success: boolean;
  context?: Record<string, unknown>;
}
