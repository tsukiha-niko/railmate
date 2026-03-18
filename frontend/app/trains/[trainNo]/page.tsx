"use client";

import { useEffect, useState } from "react";
import { useParams, useSearchParams, useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { ArrowLeft, ArrowRight, Clock, Calendar } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { TrainTimeline } from "@/components/tickets/TrainTimeline";
import { getTrainSchedule, getTrainPrices } from "@/services/trains";
import type { TrainPrices } from "@/services/trains";
import type { TrainScheduleStop } from "@/types/trains";
import { getTrainTypeLabel, getTrainTypeColor } from "@/utils/format";
import { formatDateLocalized, getToday } from "@/utils/date";
import { cn } from "@/utils/cn";
import { useI18n } from "@/lib/i18n/i18n";

export default function TrainDetailPage() {
  const router = useRouter();
  const params = useParams();
  const searchParams = useSearchParams();
  const trainNo = params.trainNo as string;
  const date = searchParams.get("date") || getToday();
  const fromStation = searchParams.get("from");
  const toStation = searchParams.get("to");
  const { t, locale } = useI18n();
  const dateLocale = locale === "en" ? "en" : "zh-CN";

  const [stops, setStops] = useState<TrainScheduleStop[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [prices, setPrices] = useState<TrainPrices | null>(null);
  const [pricesLoading, setPricesLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      setError(null);
      try {
        const data = await getTrainSchedule(trainNo, date, fromStation || undefined, toStation || undefined);
        if (!cancelled) setStops(data.stops || []);
      } catch (err) {
        if (!cancelled) {
          const msg = err instanceof Error ? err.message : t("common.loadFailed");
          if (msg.includes("未找到") || msg.includes("404") || msg.includes("Not Found")) {
            setStops([]);
          } else {
            setError(msg);
          }
        }
      } finally { if (!cancelled) setLoading(false); }
    }
    load();
    return () => { cancelled = true; };
  }, [trainNo, date, fromStation, toStation, t]);

  useEffect(() => {
    if (!fromStation || !toStation) return;
    let cancelled = false;
    async function loadPrices() {
      setPricesLoading(true);
      try {
        const res = await getTrainPrices(trainNo, date, fromStation!, toStation!);
        if (!cancelled) setPrices(res.prices);
      } catch {
        // price fetch is best-effort
      } finally {
        if (!cancelled) setPricesLoading(false);
      }
    }
    loadPrices();
    return () => { cancelled = true; };
  }, [trainNo, date, fromStation, toStation]);

  const trainType = trainNo.charAt(0);

  const originStop = stops.length > 0 ? stops[0] : null;
  const terminalStop = stops.length > 1 ? stops[stops.length - 1] : null;
  const totalStops = stops.length;

  return (
    <div className="w-full max-w-3xl mx-auto px-4 py-4 space-y-4 overflow-y-auto">
      <button
        onClick={() => router.back()}
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        <ArrowLeft className="h-4 w-4" />{t("train.backToSearch")}
      </button>

      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
        <Card>
          <CardContent className="pt-5 pb-4">
            <div className="flex items-center gap-3 mb-4">
              <span className={cn("inline-flex items-center rounded-lg px-3 py-1.5 text-base font-bold text-white", getTrainTypeColor(trainType))}>{trainNo}</span>
              <Badge variant="secondary">{getTrainTypeLabel(trainType)}</Badge>
              <div className="flex items-center gap-1.5 ml-auto text-xs text-muted-foreground">
                <Calendar className="h-3.5 w-3.5" />{formatDateLocalized(date, dateLocale)}
              </div>
            </div>

            {(fromStation && toStation) || (originStop && terminalStop) ? (
              <div className="flex items-center justify-between gap-4 rounded-lg bg-muted/50 px-4 py-3">
                <div className="text-center">
                  <p className="text-lg font-semibold">{fromStation || originStop?.station_name}</p>
                  {originStop && (
                    <p className="text-sm text-muted-foreground tabular-nums">{originStop.departure_time !== "--" ? originStop.departure_time : ""}</p>
                  )}
                </div>
                <div className="flex flex-col items-center gap-0.5 flex-1 min-w-0">
                  <div className="flex items-center gap-1 w-full">
                    <div className="h-px flex-1 bg-border" />
                    <ArrowRight className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                    <div className="h-px flex-1 bg-border" />
                  </div>
                  {totalStops > 0 && (
                    <span className="text-[11px] text-muted-foreground">
                      {locale === "en" ? `${totalStops} stops` : `共${totalStops}站`}
                    </span>
                  )}
                </div>
                <div className="text-center">
                  <p className="text-lg font-semibold">{toStation || terminalStop?.station_name}</p>
                  {terminalStop && (
                    <p className="text-sm text-muted-foreground tabular-nums">{terminalStop.arrival_time !== "--" ? terminalStop.arrival_time : ""}</p>
                  )}
                </div>
              </div>
            ) : null}
          </CardContent>
        </Card>
      </motion.div>

      {fromStation && toStation && (
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.08 }}>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <span className="text-base">¥</span>
                {locale === "en" ? "Ticket Prices" : "票价"}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {pricesLoading ? (
                <div className="grid grid-cols-2 gap-2">
                  {Array.from({ length: 4 }).map((_, i) => (
                    <Skeleton key={i} className="h-10 w-full rounded-lg" />
                  ))}
                </div>
              ) : prices && Object.values(prices).some(v => v != null) ? (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {[
                    { key: "business_seat", label: locale === "en" ? "Business" : "商务/特等座" },
                    { key: "first_seat",    label: locale === "en" ? "1st Class" : "一等座" },
                    { key: "second_seat",   label: locale === "en" ? "2nd Class" : "二等座" },
                    { key: "soft_sleeper",  label: locale === "en" ? "Soft Sleeper" : "软卧" },
                    { key: "hard_sleeper",  label: locale === "en" ? "Hard Sleeper" : "硬卧" },
                    { key: "hard_seat",     label: locale === "en" ? "Hard Seat" : "硬座" },
                    { key: "no_seat",       label: locale === "en" ? "No Seat" : "无座" },
                  ]
                    .filter(({ key }) => (prices as Record<string, number | null | undefined>)[key] != null)
                    .map(({ key, label }) => (
                      <div key={key} className="flex flex-col items-center justify-center rounded-xl bg-muted/50 px-3 py-2.5 gap-0.5">
                        <span className="text-[11px] text-muted-foreground">{label}</span>
                        <span className="text-base font-bold text-foreground">
                          ¥{(prices as Record<string, number | null | undefined>)[key]?.toFixed(0)}
                        </span>
                      </div>
                    ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground text-center py-3">
                  {locale === "en" ? "Prices unavailable (login to 12306 for real-time prices)" : "暂无票价（登录 12306 账户后可查看实时票价）"}
                </p>
              )}
            </CardContent>
          </Card>
        </motion.div>
      )}

      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2"><Clock className="h-4 w-4 text-primary" />{t("train.schedule")}</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="space-y-4">{Array.from({ length: 8 }).map((_, i) => (<Skeleton key={i} className="h-6 w-full" />))}</div>
            ) : error ? (
              <div className="text-center py-8">
                <p className="text-sm text-destructive">{error}</p>
                <Button variant="outline" size="sm" className="mt-3" onClick={() => window.location.reload()}>{t("common.retry")}</Button>
              </div>
            ) : stops.length > 0 ? (
              <TrainTimeline stops={stops} highlightFrom={fromStation} highlightTo={toStation} />
            ) : (
              <p className="text-sm text-muted-foreground text-center py-8">{t("train.noSchedule")}</p>
            )}
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}
