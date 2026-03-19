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
import { getFareLabel, getTrainTypeLabel, getTrainTypeColor } from "@/utils/format";
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
  const [priceMeta, setPriceMeta] = useState<{ logged_in?: boolean; requires_login?: boolean; source?: string } | null>(null);

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
        if (!cancelled) {
          setPrices(res.prices);
          setPriceMeta({
            logged_in: res.logged_in,
            requires_login: res.requires_login,
            source: res.source,
          });
        }
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
    <div className="mx-auto w-full max-w-6xl space-y-4 overflow-y-auto px-4 py-4 sm:px-6 lg:px-8">
      <button
        onClick={() => router.back()}
        className="inline-flex items-center gap-1.5 rounded-full border border-border/70 bg-card/45 px-3 py-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" />{t("train.backToSearch")}
      </button>

      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
        <Card>
          <CardContent className="pt-5 pb-4">
            <div className="mb-4 flex flex-wrap items-center gap-3">
              <span className={cn("inline-flex items-center rounded-lg px-3 py-1.5 text-base font-bold text-white shadow-sm", getTrainTypeColor(trainType))}>{trainNo}</span>
              <Badge variant="secondary">{getTrainTypeLabel(trainType, locale === "en" ? "en" : "zh-CN")}</Badge>
              <div className="ml-auto flex items-center gap-1.5 text-xs text-muted-foreground">
                <Calendar className="h-3.5 w-3.5" />{formatDateLocalized(date, dateLocale)}
              </div>
            </div>

            {(fromStation && toStation) || (originStop && terminalStop) ? (
              <div className="grid gap-4 rounded-xl border border-border/70 bg-muted/35 px-4 py-4 md:grid-cols-[minmax(0,1fr)_minmax(180px,240px)_minmax(0,1fr)] md:items-center">
                <div className="text-center">
                  <p className="text-lg font-semibold md:text-2xl">{fromStation || originStop?.station_name}</p>
                  {originStop && (
                    <p className="text-sm text-muted-foreground tabular-nums">{originStop.departure_time !== "--" ? originStop.departure_time : ""}</p>
                  )}
                </div>
                <div className="flex min-w-0 flex-col items-center gap-1">
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
                  <p className="text-lg font-semibold md:text-2xl">{toStation || terminalStop?.station_name}</p>
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
            <CardContent className="space-y-3 pt-4">
              <CardTitle className="flex items-center gap-2 text-base">
                <span className="text-base">¥</span>
                {t("train.price.title")}
              </CardTitle>
              {pricesLoading ? (
                <div className="grid gap-2 [grid-template-columns:repeat(auto-fit,minmax(150px,1fr))]">
                  {Array.from({ length: 4 }).map((_, i) => (
                    <Skeleton key={i} className="h-[84px] w-full rounded-xl" />
                  ))}
                </div>
              ) : prices && Object.values(prices).some(v => v != null) ? (
                <div className="grid gap-2 [grid-template-columns:repeat(auto-fit,minmax(150px,1fr))]">
                  {[
                    { key: "business_seat", label: locale === "en" ? "Business" : "商务/特等座" },
                    { key: "first_seat",    label: getFareLabel("price_first_seat", locale === "en" ? "en" : "zh-CN") },
                    { key: "second_seat",   label: getFareLabel("price_second_seat", locale === "en" ? "en" : "zh-CN") },
                    { key: "soft_sleeper",  label: getFareLabel("price_soft_sleeper", locale === "en" ? "en" : "zh-CN") },
                    { key: "hard_sleeper",  label: getFareLabel("price_hard_sleeper", locale === "en" ? "en" : "zh-CN") },
                    { key: "hard_seat",     label: getFareLabel("price_hard_seat", locale === "en" ? "en" : "zh-CN") },
                    { key: "no_seat",       label: getFareLabel("price_no_seat", locale === "en" ? "en" : "zh-CN") },
                  ]
                    .filter(({ key }) => (prices as Record<string, number | null | undefined>)[key] != null)
                    .map(({ key, label }) => (
                      <div key={key} className="flex min-h-[84px] flex-col items-center justify-center gap-1 rounded-xl border border-border/65 bg-muted/35 px-3 py-2.5 text-center">
                        <span title={label} className="max-w-full truncate whitespace-nowrap text-[11px] text-muted-foreground">
                          {label}
                        </span>
                        <span className="text-lg font-bold tabular-nums text-foreground">
                          ¥{(prices as Record<string, number | null | undefined>)[key]?.toFixed(0)}
                        </span>
                      </div>
                    ))}
                </div>
              ) : (
                <div className="flex flex-col items-center gap-3 py-3 text-center">
                  <p className="text-sm text-muted-foreground">
                    {t("train.price.unavailable")}
                  </p>
                  <p className="max-w-md text-xs text-muted-foreground">
                    {priceMeta?.requires_login
                      ? t("train.price.needLogin")
                      : t("train.price.partial")}
                  </p>
                  <div className="flex flex-wrap items-center justify-center gap-2">
                    {priceMeta?.requires_login ? (
                      <Button variant="default" size="sm" onClick={() => router.push("/settings")}>
                        {t("train.price.goLogin")}
                      </Button>
                    ) : null}
                    <Button variant="outline" size="sm" onClick={() => window.location.reload()}>
                      {t("train.price.retry")}
                    </Button>
                  </div>
                </div>
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
