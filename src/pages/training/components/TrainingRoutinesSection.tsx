import type { ReactNode } from "react";
import { CirclePlus, Copy, PlayCircle, Trash2 } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { LocalizedText, WorkoutRecord, WorkoutTemplateRecord } from "@/types/training";
import type { TrainingCopy } from "@/pages/training/trainingConstants";

type TrainingRoutinesSectionProps = {
  copy: TrainingCopy;
  workouts: WorkoutRecord[];
  templates: WorkoutTemplateRecord[];
  hasActiveSession: boolean;
  isStartPending: boolean;
  isSavePending: boolean;
  isDeletePending: boolean;
  isDuplicatePending: boolean;
  renderPlaceholder: (message: string) => ReactNode;
  getWorkoutPreviewText: (workoutId: string) => string;
  localizeText: (value: LocalizedText | null | undefined, fallback: string | null | undefined) => string;
  onCreateRoutine: () => void;
  onStartWorkout: (workoutId: string) => void;
  onEditWorkout: (workoutId: string) => void;
  onDeleteWorkout: (workoutId: string) => void;
  onDuplicateTemplate: (templateId: string) => void;
};

export function TrainingRoutinesSection({
  copy,
  workouts,
  templates,
  hasActiveSession,
  isStartPending,
  isSavePending,
  isDeletePending,
  isDuplicatePending,
  renderPlaceholder,
  getWorkoutPreviewText,
  localizeText,
  onCreateRoutine,
  onStartWorkout,
  onEditWorkout,
  onDeleteWorkout,
  onDuplicateTemplate,
}: TrainingRoutinesSectionProps) {
  return (
    <div className="grid gap-5 xl:grid-cols-[1.2fr_0.9fr]">
      <Card>
        <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <CardTitle>{copy.personalRoutines}</CardTitle>
            <CardDescription>{copy.personalRoutinesDescription}</CardDescription>
          </div>
          <Button className="w-full sm:w-auto" onClick={onCreateRoutine}>
            <CirclePlus className="mr-2 h-4 w-4" />
            {copy.newRoutine}
          </Button>
        </CardHeader>
        <CardContent className="space-y-3">
          {workouts.length === 0 ? renderPlaceholder(copy.noRoutines) : null}
          {workouts.map((workout) => (
            <div key={workout.id} className="rounded-2xl border p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <div className="text-lg font-semibold">{workout.name}</div>
                  <div className="text-sm text-muted-foreground">{workout.description || copy.noDescription}</div>
                  <div className="mt-3 rounded-xl border border-border/70 bg-muted/20 px-3 py-2 text-sm text-muted-foreground">
                    <div className="mb-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground/80">{copy.routineExercises}</div>
                    {getWorkoutPreviewText(workout.id)}
                  </div>
                </div>
                <div className="grid w-full gap-2 sm:flex sm:w-auto sm:flex-wrap">
                  <Button className="w-full sm:w-auto" variant="outline" onClick={() => onStartWorkout(workout.id)} disabled={hasActiveSession || isStartPending}><PlayCircle className="mr-2 h-4 w-4" />{copy.start}</Button>
                  <Button className="w-full sm:w-auto" variant="outline" onClick={() => onEditWorkout(workout.id)} disabled={isSavePending}>{copy.edit}</Button>
                  <Button className="w-full text-destructive hover:text-destructive sm:w-auto" variant="ghost" onClick={() => onDeleteWorkout(workout.id)} disabled={isDeletePending}><Trash2 className="mr-2 h-4 w-4" />{copy.delete}</Button>
                </div>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{copy.templates}</CardTitle>
          <CardDescription>{copy.templatesDescription}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {templates.map((template) => (
            <div key={template.id} className="rounded-2xl border p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="font-semibold">{localizeText(template.name_i18n, template.name)}</div>
                  <div className="text-sm text-muted-foreground">{localizeText(template.description_i18n, template.description)}</div>
                </div>
                <Badge>{template.focus_tags.join(" / ")}</Badge>
              </div>
              <Button className="mt-4 w-full" variant="outline" disabled={isDuplicatePending} onClick={() => onDuplicateTemplate(template.id)}><Copy className="mr-2 h-4 w-4" />{copy.duplicateTemplate}</Button>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
