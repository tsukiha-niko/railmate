"use client";

import { useEffect, useState } from "react";
import { useParams, useSearchParams } from "next/navigation";
import { motion } from "framer-motion";
import { ArrowLeft, ArrowRight, Clock, Calendar } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { TrainTimeline } from "@/components/tickets/TrainTimeline";
import { getTrainSchedule } from "@/services/trains";
import type { TrainScheduleStop } from "@/types/trains";
import { getTrainTypeLabel, getTrainTypeColor } from "@/utils/format";
import { formatDateLocalized, getToday } from "@/utils/date";
import { cn } from "@/utils/cn";
import { useI18n } from "@/lib/i18n/i18n";

export default function TrainDetailPage() {
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

  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        const data = await getTrainSchedule(trainNo, date);
        setStops(data.stops || []);
      } catch (err) {
        setError(err instanceof Error ? err.message : t("common.loadFailed"));
      } finally { setLoading(false); }
    }
    load();
  }, [trainNo, date, t]);

  const trainType = trainNo.charAt(0);

  return (
    <div className="max-w-2xl mx-auto p-4 space-y-5">
      <Link href="/search" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors">
        <ArrowLeft className="h-4 w-4" />{t("train.backToSearch")}
      </Link>

      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center gap-3">
              <span className={cn("inline-flex items-center rounded-lg px-3 py-1 text-sm font-bold text-white", getTrainTypeColor(trainType))}>{trainNo}</span>
              <Badge variant="secondary">{getTrainTypeLabel(trainType)}</Badge>
              <div className="flex items-center gap-1.5 ml-auto text-xs text-muted-foreground">
                <Calendar className="h-3.5 w-3.5" />{formatDateLocalized(date, dateLocale)}
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {fromStation && toStation && (
              <div className="flex items-center gap-3 mb-4 text-lg">
                <span className="font-semibold">{fromStation}</span>
                <ArrowRight className="h-4 w-4 text-muted-foreground" />
                <span className="font-semibold">{toStation}</span>
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>

      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2"><Clock className="h-4 w-4 text-primary" />{t("train.schedule")}</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="space-y-4">{Array.from({ length: 6 }).map((_, i) => (<Skeleton key={i} className="h-6 w-full" />))}</div>
            ) : error ? (
              <div className="text-center py-8">
                <p className="text-sm text-destructive">{error}</p>
                <Button variant="outline" size="sm" className="mt-3" onClick={() => window.location.reload()}>{t("common.retry")}</Button>
              </div>
            ) : stops.length > 0 ? (
              <TrainTimeline stops={stops} />
            ) : (
              <p className="text-sm text-muted-foreground text-center py-8">{t("train.noSchedule")}</p>
            )}
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}
