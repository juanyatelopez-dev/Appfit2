import { useState } from "react";

import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

export type PointKey = "neck" | "arm" | "waist" | "hip" | "thigh";

export type MeasurementPoint = {
  key: PointKey;
  label: string;
  valueText?: string;
  deltaText?: string;
  tone?: "neutral" | "positive" | "negative";
  x: number;
  y: number;
};

const labelTone: Record<NonNullable<MeasurementPoint["tone"]>, string> = {
  neutral: "border-slate-300/70 bg-slate-700/90 text-white",
  positive: "border-emerald-300/70 bg-emerald-700/90 text-white",
  negative: "border-rose-300/70 bg-rose-700/90 text-white",
};

const dotTone: Record<NonNullable<MeasurementPoint["tone"]>, string> = {
  neutral: "bg-slate-300 ring-slate-100/60",
  positive: "bg-emerald-400 ring-emerald-100/60",
  negative: "bg-rose-400 ring-rose-100/60",
};

const offsets: Record<PointKey, { dx: number; dy: number }> = {
  neck: { dx: 0, dy: -28 },
  arm: { dx: -46, dy: -8 },
  waist: { dx: 28, dy: -8 },
  hip: { dx: 28, dy: -8 },
  thigh: { dx: -46, dy: -8 },
};

export function BodyMannequin({
  points,
  imageSrc = "/body-mannequin.png",
  onPointClick,
}: {
  points: MeasurementPoint[];
  imageSrc?: string;
  onPointClick?: (key: PointKey) => void;
}) {
  const [imageError, setImageError] = useState(false);
  const showImage = Boolean(imageSrc) && !imageError;

  return (
    <div className="relative w-full max-w-[260px] aspect-[2/3]">
      {showImage ? (
        <img
          src={imageSrc}
          alt="Body measurement mannequin"
          className="absolute inset-0 h-full w-full object-contain"
          onError={() => setImageError(true)}
        />
      ) : (
        <div className="absolute inset-0 rounded-xl border border-border/60 bg-muted/20" />
      )}

      <TooltipProvider delayDuration={80}>
        {points.map((point) => {
          const offset = offsets[point.key];
          const angle = (Math.atan2(offset.dy, offset.dx) * 180) / Math.PI;
          const lineWidth = Math.max(8, Math.hypot(offset.dx, offset.dy) - 12);
          const tone = point.tone || "neutral";

          return (
            <Tooltip key={point.key}>
              <TooltipTrigger asChild>
                <div
                  className="absolute -translate-x-1/2 -translate-y-1/2"
                  style={{ left: `${point.x}%`, top: `${point.y}%` }}
                >
                  <button
                    type="button"
                    onClick={() => onPointClick?.(point.key)}
                    className={cn(
                      "absolute left-1/2 top-1/2 h-3.5 w-3.5 -translate-x-1/2 -translate-y-1/2 rounded-full ring-2 shadow focus:outline-none focus:ring-2 focus:ring-primary",
                      dotTone[tone],
                    )}
                    aria-label={`${point.label}: ${point.valueText ?? "sin dato"} ${point.deltaText ? `(${point.deltaText})` : ""}`}
                  />
                  <div
                    className="absolute left-1/2 top-1/2 h-px bg-white/80"
                    style={{
                      width: `${lineWidth}px`,
                      transform: `rotate(${angle}deg)`,
                      transformOrigin: "0 0",
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => onPointClick?.(point.key)}
                    className={cn(
                      "absolute rounded-md border px-2 py-1 text-[10px] font-semibold leading-none shadow-md backdrop-blur-sm transition hover:scale-[1.03] focus:outline-none focus:ring-2 focus:ring-primary/60",
                      labelTone[tone],
                    )}
                    style={{ transform: `translate(${offset.dx}px, ${offset.dy}px)` }}
                  >
                    {point.valueText ?? "--"}
                  </button>
                </div>
              </TooltipTrigger>
              <TooltipContent side="right" className="max-w-[220px]">
                <p className="text-xs font-medium">{point.label}</p>
                <p className="text-xs">{point.valueText ?? "Sin dato"}</p>
                <p className="text-xs text-muted-foreground">
                  {point.deltaText ? `${point.deltaText} since last measurement` : "Sin comparativa previa"}
                </p>
              </TooltipContent>
            </Tooltip>
          );
        })}
      </TooltipProvider>
    </div>
  );
}
