import { Activity } from "lucide-react";
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { ExerciseHistoryEntry, ExercisePrRecord, ExerciseProgressPoint, ExerciseRecord } from "@/modules/training/types";
import type { TrainingCopy } from "@/modules/training/ui/trainingConstants";

type TrainingProgressSectionProps = {
  copy: TrainingCopy;
  selectedExerciseId: string | null;
  exerciseLibrary: ExerciseRecord[];
  prs: ExercisePrRecord[];
  progress: ExerciseProgressPoint[];
  history: ExerciseHistoryEntry[];
  prLabelMap: Record<ExercisePrRecord["pr_type"], string>;
  formatDateTime: (value: string | null) => string;
  formatExerciseName: (exercise: ExerciseRecord) => string;
  onSelectExercise: (value: string) => void;
};

export function TrainingProgressSection({
  copy,
  selectedExerciseId,
  exerciseLibrary,
  prs,
  progress,
  history,
  prLabelMap,
  formatDateTime,
  formatExerciseName,
  onSelectExercise,
}: TrainingProgressSectionProps) {
  return (
    <div className="grid gap-5 xl:grid-cols-[1.15fr_0.95fr]">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Activity className="h-5 w-5 text-primary" />{copy.progressTitle}</CardTitle>
          <CardDescription>{copy.progressDescription}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Select value={selectedExerciseId ?? ""} onValueChange={onSelectExercise}>
            <SelectTrigger><SelectValue placeholder={copy.selectExercise} /></SelectTrigger>
            <SelectContent>{exerciseLibrary.map((exercise) => <SelectItem key={exercise.id} value={exercise.id}>{formatExerciseName(exercise)}</SelectItem>)}</SelectContent>
          </Select>
          <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-3">
            {prs.map((pr) => (
              <div key={pr.id} className="rounded-2xl border p-4">
                <div className="text-[11px] uppercase tracking-[0.2em] text-muted-foreground">{prLabelMap[pr.pr_type]}</div>
                <div className="mt-2 text-xl font-black md:text-2xl">{pr.value_num}</div>
              </div>
            ))}
          </div>
          {prs.length === 0 ? <div className="rounded-2xl border border-dashed p-3 text-sm text-muted-foreground">{copy.noPrsYet}</div> : null}
          <div className="h-60 rounded-2xl border p-4 md:h-72">
            {progress.length === 0 ? (
              <div className="text-sm text-muted-foreground">{copy.noProgress}</div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={progress}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date_key" />
                  <YAxis />
                  <Tooltip />
                  <Line type="monotone" dataKey="max_weight" stroke="#dc2626" strokeWidth={2.5} dot={false} />
                  <Line type="monotone" dataKey="estimated_1rm" stroke="#ef4444" strokeWidth={2.5} dot={false} />
                  <Line type="monotone" dataKey="total_volume" stroke="#fb7185" strokeWidth={2.5} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            )}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{copy.exerciseHistoryTitle}</CardTitle>
          <CardDescription>{copy.exerciseHistoryDescription}</CardDescription>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[420px] pr-3 md:h-[640px]">
            <div className="space-y-3">
              {history.length === 0 ? <div className="rounded-2xl border border-dashed p-3 text-sm text-muted-foreground">{copy.noExerciseHistory}</div> : null}
              {history.map((entry) => (
                <div key={entry.session_id} className="rounded-2xl border p-4">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <div className="font-semibold">{entry.workout_name}</div>
                      <div className="text-sm text-muted-foreground">{formatDateTime(entry.started_at)}</div>
                    </div>
                    <Badge variant="outline">{Math.round(entry.total_volume)} kg</Badge>
                  </div>
                  <div className="mt-3 space-y-2">
                    {entry.sets.map((set) => (
                      <div key={set.id} className="flex flex-col gap-1 rounded-xl border px-3 py-2 text-sm sm:flex-row sm:items-center sm:justify-between">
                        <span>Set {set.set_number}</span>
                        <span>{set.weight} kg x {set.reps} reps</span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );
}
