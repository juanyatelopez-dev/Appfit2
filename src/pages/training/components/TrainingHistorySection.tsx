import type { ReactNode } from "react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { TrainingCopy } from "@/pages/training/trainingConstants";

type WorkoutHistoryItem = {
  id: string;
  workout_name: string;
  started_at: string;
  status: string;
  total_volume: number;
};

type TrainingHistorySectionProps = {
  copy: TrainingCopy;
  history: WorkoutHistoryItem[];
  renderPlaceholder: (message: string) => ReactNode;
  formatDateTime: (value: string | null) => string;
};

export function TrainingHistorySection({
  copy,
  history,
  renderPlaceholder,
  formatDateTime,
}: TrainingHistorySectionProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{copy.historyTitle}</CardTitle>
        <CardDescription>{copy.historyDescription}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {history.length === 0 ? renderPlaceholder(copy.noHistory) : null}
        {history.map((session) => (
          <div key={session.id} className="rounded-2xl border p-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <div className="font-semibold">{session.workout_name}</div>
                <div className="text-sm text-muted-foreground">{formatDateTime(session.started_at)}</div>
              </div>
              <div className="flex flex-wrap gap-2">
                <Badge variant={session.status === "completed" ? "default" : "secondary"}>{session.status}</Badge>
                <Badge variant="outline">{Math.round(session.total_volume)} kg</Badge>
              </div>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
