"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { checkInTicketOrder, checkInTicketScan, listTicketOrders, refundTicket } from "@/services/ticketing";
import { useChatStore } from "@/store/chatStore";

export function useTrips(options?: { refetchIntervalMs?: number | false }) {
  const userId = useChatStore((s) => s.userId);
  const interval = options?.refetchIntervalMs ?? 60_000;

  return useQuery({
    queryKey: ["trips", userId],
    queryFn: () => listTicketOrders(userId),
    refetchInterval: interval === false ? false : interval,
  });
}

export function useRefundTicket() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (orderId: number) => refundTicket(orderId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["trips"] });
    },
  });
}

export function useCheckInTicket() {
  const queryClient = useQueryClient();
  const userId = useChatStore((s) => s.userId);

  return useMutation({
    mutationFn: ({ qrPayload }: { qrPayload: string }) => checkInTicketScan(qrPayload, userId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["trips"] });
    },
  });
}

export function useCheckInTicketDirect() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (orderId: number) => checkInTicketOrder(orderId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["trips"] });
    },
  });
}
