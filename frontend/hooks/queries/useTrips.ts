"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { checkInTicketOrder, checkInTicketScan, listTicketOrders, refundTicket } from "@/services/ticketing";
import { useChatStore } from "@/store/chatStore";

export function useTrips() {
  const userId = useChatStore((s) => s.userId);

  return useQuery({
    queryKey: ["trips", userId],
    queryFn: () => listTicketOrders(userId),
    refetchInterval: 60_000,
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
