"use client";

import { useQuery } from "@tanstack/react-query";
import { getTrainSchedule, getTrainPrices } from "@/services/trains";
import { getTicketingCapabilities } from "@/services/ticketing";

export function useTrainSchedule(
  trainNo: string,
  date: string,
  fromStation?: string | null,
  toStation?: string | null,
) {
  return useQuery({
    queryKey: ["trainSchedule", trainNo, date, fromStation, toStation],
    queryFn: () =>
      getTrainSchedule(trainNo, date, fromStation || undefined, toStation || undefined),
    enabled: !!trainNo,
  });
}

export function useTrainPrices(
  trainNo: string,
  date: string,
  fromStation?: string | null,
  toStation?: string | null,
) {
  return useQuery({
    queryKey: ["trainPrices", trainNo, date, fromStation, toStation],
    queryFn: () => getTrainPrices(trainNo, date, fromStation!, toStation!),
    enabled: !!trainNo && !!fromStation && !!toStation,
  });
}

export function useTicketingCapabilities() {
  return useQuery({
    queryKey: ["ticketingCapabilities"],
    queryFn: getTicketingCapabilities,
    staleTime: 5 * 60_000,
  });
}
