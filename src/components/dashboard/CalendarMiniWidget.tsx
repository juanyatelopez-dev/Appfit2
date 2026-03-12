import { useMemo, useState } from "react";
import { addDays, addMonths, endOfMonth, endOfWeek, format, isSameMonth, startOfMonth, startOfWeek } from "date-fns";
import { ChevronLeft, ChevronRight } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

type ActivityDay = {
  dateKey: string;
  waterMl: number;
  sleepMinutes: number;
  weightKg: number | null;
  hasWater: boolean;
  hasSleep: boolean;
  hasWeight: boolean;
  hasBiofeedback: boolean;
  hasNote: boolean;
  hasNutrition: boolean;
};

type Props = {
  month: Date;
  onMonthChange: (month: Date) => void;
  activity?: Map<string, ActivityDay>;
  loading?: boolean;
};

const toKey = (date: Date) => format(date, "yyyy-MM-dd");

const CalendarMiniWidget = ({ month, onMonthChange, activity, loading = false }: Props) => {
  const [selectedDateKey, setSelectedDateKey] = useState(() => toKey(new Date()));

  const monthStart = startOfMonth(month);
  const monthEnd = endOfMonth(month);
  const gridStart = startOfWeek(monthStart, { weekStartsOn: 1 });
  const gridEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });

  const days = useMemo(() => {
    const output: Date[] = [];
    let cursor = new Date(gridStart);
    while (cursor <= gridEnd) {
      output.push(cursor);
      cursor = addDays(cursor, 1);
    }
    return output;
  }, [gridEnd, gridStart]);

  const selected = activity?.get(selectedDateKey);

  return (
    <Card className="rounded-2xl border-border/60 bg-card/80 shadow-sm">
      <CardHeader className="pb-2 md:pb-3">
        <div className="flex items-center justify-between gap-3">
          <div>
            <CardTitle>Actividad en calendario</CardTitle>
            <CardDescription>Dias con actividad y resumen rapido.</CardDescription>
          </div>
          <div className="flex items-center gap-1">
            <Button variant="outline" size="icon" className="h-9 w-9 md:h-8 md:w-8" onClick={() => onMonthChange(addMonths(month, -1))}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="icon" className="h-9 w-9 md:h-8 md:w-8" onClick={() => onMonthChange(addMonths(month, 1))}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-sm font-medium capitalize">{month.toLocaleDateString("es-ES", { month: "long", year: "numeric" })}</p>
        {loading ? (
          <Skeleton className="h-52 w-full" />
        ) : (
          <div className="grid grid-cols-7 gap-1">
            {days.map((date) => {
              const key = toKey(date);
              const day = activity?.get(key);
              const inMonth = isSameMonth(date, month);
              const isSelected = key === selectedDateKey;
              const hasAny = Boolean(day?.hasWater || day?.hasSleep || day?.hasWeight || day?.hasBiofeedback || day?.hasNote || day?.hasNutrition);
              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => setSelectedDateKey(key)}
                    className={`h-8 rounded-md text-[11px] transition border md:h-9 md:text-xs ${
                    isSelected
                      ? "border-primary bg-primary/15"
                      : hasAny
                      ? "border-primary/40 bg-primary/10 hover:bg-primary/15"
                      : "border-border/60 hover:border-primary/30"
                  } ${inMonth ? "" : "opacity-40"}`}
                >
                  <div className="flex h-full flex-col items-center justify-center">
                    <span>{date.getDate()}</span>
                    <span className="mt-0.5 flex items-center gap-0.5">
                      {day?.hasWater ? <span className="h-1 w-1 rounded-full bg-sky-500" /> : null}
                      {day?.hasSleep ? <span className="h-1 w-1 rounded-full bg-indigo-500" /> : null}
                      {day?.hasWeight ? <span className="h-1 w-1 rounded-full bg-amber-500" /> : null}
                      {day?.hasBiofeedback ? <span className="h-1 w-1 rounded-full bg-rose-500" /> : null}
                      {day?.hasNote ? <span className="h-1 w-1 rounded-full bg-emerald-500" /> : null}
                      {day?.hasNutrition ? <span className="h-1 w-1 rounded-full bg-lime-500" /> : null}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        )}

        <div className="rounded-lg border border-border/60 p-3 text-xs space-y-1">
          <p className="font-medium">{selectedDateKey}</p>
          <p className="text-muted-foreground">
            Agua: {selected?.waterMl ?? 0} ml | Sueño: {((selected?.sleepMinutes ?? 0) / 60).toFixed(1)} h
          </p>
          <p className="text-muted-foreground">
            Peso: {selected?.weightKg !== null && selected?.weightKg !== undefined ? `${selected.weightKg} kg` : "--"} | Bio:{" "}
            {selected?.hasBiofeedback ? "si" : "no"} | Nota: {selected?.hasNote ? "si" : "no"} | Nutricion: {selected?.hasNutrition ? "si" : "no"}
          </p>
        </div>
      </CardContent>
    </Card>
  );
};

export default CalendarMiniWidget;
