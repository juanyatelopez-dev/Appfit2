import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import type { DailyNote } from "@/services/dailyNotes";

type Props = {
  loading?: boolean;
  todayNote: DailyNote | null;
  latestNote: DailyNote | null;
  onSave: (payload: { title?: string | null; content: string }) => Promise<void>;
};

const TacticalNotesCard = ({ loading = false, todayNote, latestNote, onSave }: Props) => {
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    setTitle(todayNote?.title ?? "");
    setContent(todayNote?.content ?? "");
  }, [todayNote?.content, todayNote?.title]);

  if (loading) {
    return (
      <Card className="rounded-2xl border-border/60 bg-card/80 shadow-sm">
        <CardHeader>
          <CardTitle>Notas tácticas</CardTitle>
          <CardDescription>Libreta personal del día.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-24 w-full" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="rounded-2xl border-border/60 bg-card/80 shadow-sm">
      <CardHeader>
        <CardTitle>Notas tácticas</CardTitle>
        <CardDescription>Registra observaciones relevantes del día y mantenlas visibles en tu calendario.</CardDescription>
      </CardHeader>
      <CardContent className="grid gap-4 lg:grid-cols-2">
        <div className="space-y-2">
          <Input value={title} onChange={(event) => setTitle(event.target.value)} placeholder="Titulo de la nota" maxLength={120} />
          <Textarea
            value={content}
            onChange={(event) => setContent(event.target.value)}
            className="min-h-24"
            placeholder="Ejemplo: Fatiga por la tarde, ajustar hidratacion y volumen de entrenamiento."
          />
          <Button
            disabled={!content.trim() || isSaving}
            onClick={async () => {
              try {
                setIsSaving(true);
                await onSave({ title: title.trim() || null, content });
              } finally {
                setIsSaving(false);
              }
            }}
          >
            {isSaving ? "Guardando..." : "Guardar nota"}
          </Button>
        </div>

        <div className="rounded-lg border border-border/60 p-3">
          <p className="text-xs text-muted-foreground">Ultima nota registrada</p>
          {!latestNote ? (
            <p className="text-sm mt-2">Sin notas registradas.</p>
          ) : (
            <div className="mt-2 space-y-1">
              <p className="font-medium">{latestNote.title || "Nota sin titulo"}</p>
              <p className="text-xs text-muted-foreground">{latestNote.date_key}</p>
              <p className="text-sm text-muted-foreground">{latestNote.content}</p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default TacticalNotesCard;
