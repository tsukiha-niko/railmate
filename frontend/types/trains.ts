export interface TrainSearchResult {
  train_no: string;
  train_type: string;
  from_station: string;
  to_station: string;
  departure_time: string;
  arrival_time: string;
  duration_minutes: number;
  price_second_seat?: number | null;
  price_first_seat?: number | null;
  price_business_seat?: number | null;
  remaining_tickets?: number | null;
}

export interface TrainSearchParams {
  from_station: string;
  to_station: string;
  travel_date: string;
  train_type?: string;
}

export interface QuickSearchParams {
  from_station: string;
  to_station: string;
  travel_date: string;
}

export interface TrainScheduleStop {
  station_name: string;
  arrival_time: string | null;
  departure_time: string | null;
  stop_index: number;
  stop_duration?: number;
}

export interface TrainSchedule {
  train_no: string;
  date: string;
  stops: TrainScheduleStop[];
}

export interface Station {
  code: string;
  name: string;
  city: string;
  is_hub: boolean;
}
