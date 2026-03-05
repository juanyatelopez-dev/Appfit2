import { cn } from "@/lib/utils";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

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

const toneClass: Record<NonNullable<MeasurementPoint["tone"]>, string> = {
  neutral: "border-white/20 bg-white/10",
  positive: "border-emerald-400/50 bg-emerald-500/20",
  negative: "border-rose-400/50 bg-rose-500/20",
};

export function BodyMannequin({
  points,
  // Place provided PNG in public/body-mannequin.png (transparent background).
  imageSrc = "/body-mannequin.png",
  onPointClick,
}: {
  points: MeasurementPoint[];
  imageSrc?: string;
  onPointClick?: (key: PointKey) => void;
}) {
  const hasImage = Boolean(imageSrc);

  return (
    <div className="relative w-full max-w-[340px] aspect-[2/3]">
      {hasImage ? (
        <img
          src={imageSrc}
          alt="Body measurement mannequin"
          className="absolute inset-0 h-full w-full object-contain"
          onError={(event) => {
            event.currentTarget.style.display = "none";
          }}
        />
      ) : null}
      <svg
        viewBox="0 0 300 500"
        className="absolute inset-0 h-full w-full text-foreground/20"
        role="img"
        aria-label="Body measurement mannequin fallback"
      >
        <g fill="none" stroke="currentColor" strokeOpacity="0.22" strokeWidth="8">
          <circle cx="150" cy="65" r="35" />
          <path d="M135 105 C140 130, 160 130, 165 105" />
          <path d="M90 150 C120 120, 180 120, 210 150" />
          <path d="M90 150 C95 230, 110 285, 135 320" />
          <path d="M210 150 C205 230, 190 285, 165 320" />
          <path d="M135 320 C125 350, 125 380, 140 400" />
          <path d="M165 320 C175 350, 175 380, 160 400" />
          <path d="M140 400 C125 430, 120 460, 120 490" />
          <path d="M160 400 C175 430, 180 460, 180 490" />
          <path d="M90 155 C70 210, 70 260, 85 320" />
          <path d="M210 155 C230 210, 230 260, 215 320" />
        </g>
      </svg>

      <TooltipProvider delayDuration={80}>
        {points.map((p) => (
          <Tooltip key={p.key}>
            <TooltipTrigger asChild>
              <button
                type="button"
                className={cn(
                  "absolute -translate-x-1/2 -translate-y-1/2 rounded-full border min-h-5 px-2 py-0.5 text-[10px] font-semibold shadow-sm hover:scale-105 transition focus:outline-none focus:ring-2 focus:ring-primary/50",
                  toneClass[p.tone || "neutral"],
                )}
                style={{ left: `${p.x}%`, top: `${p.y}%` }}
                onClick={() => onPointClick?.(p.key)}
                aria-label={`${p.label}: ${p.valueText ?? "sin dato"} ${p.deltaText ? `(${p.deltaText})` : ""}`}
              >
                {p.valueText ?? "—"}
              </button>
            </TooltipTrigger>
            <TooltipContent side="right" className="max-w-[220px]">
              <p className="text-xs font-medium">{p.label}</p>
              <p className="text-xs">{p.valueText ?? "Sin dato"}</p>
              <p className="text-xs text-muted-foreground">{p.deltaText ? `${p.deltaText} since last measurement` : "Sin comparativa previa"}</p>
            </TooltipContent>
          </Tooltip>
        ))}
      </TooltipProvider>
    </div>
  );
}
