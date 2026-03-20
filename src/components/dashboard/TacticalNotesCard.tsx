import { useEffect, useRef, useState } from "react";
import { CalendarCheck2, Circle } from "lucide-react";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import type { DailyNote } from "@/services/dailyNotes";

type Props = {
  loading?: boolean;
  todayNote: DailyNote | null;
  latestNote: DailyNote | null;
  onSave: (payload: { title?: string | null; content: string }) => Promise<void>;
};

const TacticalNotesCard = ({ loading = false, todayNote, latestNote, onSave }: Props) => {
  const [content, setContent] = useState("");
  const [isExpanded, setIsExpanded] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveState, setSaveState] = useState<"idle" | "typing" | "saving" | "saved" | "error">("idle");
  const [savedAt, setSavedAt] = useState<Date | null>(null);
  const skipAutosaveRef = useRef(true);
  const saveTimerRef = useRef<number | null>(null);
  const lastSavedContentRef = useRef("");

  useEffect(() => {
    setContent(todayNote?.content ?? "");
    lastSavedContentRef.current = (todayNote?.content ?? "").trim();
    setSaveState(todayNote?.content ? "saved" : "idle");
    setSavedAt(null);
    setIsExpanded(false);
    skipAutosaveRef.current = true;
  }, [todayNote?.content]);

  useEffect(() => {
    if (skipAutosaveRef.current) {
      skipAutosaveRef.current = false;
      return;
    }

    if (saveTimerRef.current !== null) {
      window.clearTimeout(saveTimerRef.current);
      saveTimerRef.current = null;
    }

    const next = content.trim();
    if (!next) {
      setSaveState("idle");
      return;
    }
    if (next === lastSavedContentRef.current) {
      if (!isSaving) setSaveState("saved");
      return;
    }

    setSaveState("typing");
    saveTimerRef.current = window.setTimeout(async () => {
      try {
        setIsSaving(true);
        setSaveState("saving");
        await onSave({ title: null, content: next });
        lastSavedContentRef.current = next;
        setSavedAt(new Date());
        setSaveState("saved");
      } catch {
        setSaveState("error");
      } finally {
        setIsSaving(false);
      }
    }, 850);

    return () => {
      if (saveTimerRef.current !== null) {
        window.clearTimeout(saveTimerRef.current);
        saveTimerRef.current = null;
      }
    };
  }, [content, isSaving, onSave]);

  if (loading) {
    return (
      <Card className="rounded-2xl border-border/60 bg-card/80 shadow-sm">
        <CardHeader>
          <CardTitle>Nota del dia</CardTitle>
          <CardDescription>Registro rapido para el calendario.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <Skeleton className="h-20 w-full" />
          <Skeleton className="h-4 w-48" />
        </CardContent>
      </Card>
    );
  }

  const savedAtLabel = savedAt
    ? savedAt.toLocaleTimeString("es-PE", { hour: "2-digit", minute: "2-digit" })
    : null;

  const saveIndicatorClass =
    saveState === "saved"
      ? "text-emerald-400"
      : saveState === "saving" || saveState === "typing"
        ? "text-amber-400"
        : saveState === "error"
          ? "text-rose-400"
          : "text-muted-foreground";

  const saveIndicatorText =
    saveState === "saved"
      ? `Guardado en calendario${savedAtLabel ? ` · ${savedAtLabel}` : ""}`
      : saveState === "saving"
        ? "Guardando en calendario..."
        : saveState === "typing"
          ? "Escribiendo..."
          : saveState === "error"
            ? "No se pudo guardar. Intenta de nuevo."
            : "Escribe una nota para hoy";

  return (
    <Card className="rounded-2xl border-border/60 bg-card/80 shadow-sm">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <CalendarCheck2 className="h-4 w-4 text-primary" />
          Nota del dia
        </CardTitle>
        <CardDescription>Captura rapida. Se sincroniza directo con tu calendario.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="rounded-xl border border-border/60 bg-background/35 p-2.5">
          <Textarea
            value={content}
            onChange={(event) => setContent(event.target.value)}
            onFocus={() => setIsExpanded(true)}
            className={cn(
              "resize-none border-0 bg-transparent px-1.5 py-1.5 shadow-none transition-all focus-visible:ring-0",
              isExpanded ? "min-h-24" : "min-h-12",
            )}
            placeholder="Agregar nota del dia..."
          />
        </div>

        <div className="flex items-center justify-between gap-3 text-xs">
          <div className={cn("inline-flex items-center gap-1.5", saveIndicatorClass)}>
            <Circle className="h-2.5 w-2.5 fill-current" />
            <span className="font-medium">{saveIndicatorText}</span>
          </div>
          <span className="text-muted-foreground">{isExpanded ? "Campo expandido" : "Toca para expandir"}</span>
        </div>

        {latestNote && latestNote.date_key !== todayNote?.date_key ? (
          <div className="rounded-lg border border-border/50 bg-background/25 px-3 py-2 text-xs text-muted-foreground">
            Ultima nota: <span className="font-medium text-foreground">{latestNote.date_key}</span>
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
};

export default TacticalNotesCard;
