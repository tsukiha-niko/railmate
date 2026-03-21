"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { listTicketOrders, refundTicket } from "@/services/ticketing";
import { useChatStore } from "@/store/chatStore";

export function useTrips() {
  const userId = useChatStore((s) => s.userId);

  return useQuery({
    queryKey: ["trips", userId],
    queryFn: () => listTicketOrders(userId),
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
