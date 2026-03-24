import type { ReactNode } from "react";
import { CheckCircle2, PlayCircle, TimerReset, XCircle } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { Textarea } from "@/components/ui/textarea";
import { DAY_LABELS, MUSCLE_GROUP_LABELS } from "@/modules/training/catalog";
import type { TrainingCopy } from "@/modules/training/ui/trainingConstants";
import type { ExerciseRecord, WorkoutDetail, WorkoutRecord, WorkoutScheduleDay, WorkoutSessionDetail } from "@/modules/training/types";

type SetDraft = {
  weight: string;
  reps: string;
  rir: string;
  notes: string;
  completed: boolean;
};

type ActiveProgress = {
  completed: number;
  target: number;
  percent: number;
};

type TrainingTodaySectionProps = {
  copy: TrainingCopy;
  activeSession: WorkoutSessionDetail | null;
  scheduledWorkout: WorkoutDetail | null;
  isRestDayToday: boolean;
  schedule: WorkoutScheduleDay[];
  workouts: WorkoutRecord[];
  activeProgress: ActiveProgress;
  restRemaining: number;
  finishNotes: string;
  noteDrafts: Record<string, string>;
  renderPlaceholder: (message: string) => ReactNode;
  formatDateTime: (value: string | null) => string;
  formatRest: (seconds: number) => string;
  formatExerciseName: (exercise: ExerciseRecord) => string;
  getSetDraft: (sessionId: string, exerciseId: string, setNumber: number) => SetDraft;
  getExerciseDraftCount: (sessionId: string, exerciseId: string) => number;
  onFinishNotesChange: (value: string) => void;
  onNoteDraftsChange: (updater: (current: Record<string, string>) => Record<string, string>) => void;
  onDraftsChange: (updater: (current: Record<string, SetDraft>) => Record<string, SetDraft>) => void;
  onStartWorkout: (workoutId: string) => void;
  onFinishSession: (payload: { sessionId: string; status: "completed" | "cancelled" }) => void;
  onSaveExerciseNote: (payload: { sessionId: string; exerciseId: string; notes: string | null }) => void;
  onSaveSet: (sessionId: string, exerciseId: string, setNumber: number, restSeconds: number, complete: boolean) => void;
  onDeleteSet: (payload: { sessionId: string; exerciseId: string; setNumber: number }) => void;
  onOpenPlanning?: () => void;
  isStartPending: boolean;
  isFinishPending: boolean;
  isSaveSessionNotePending: boolean;
  isSaveSetPending: boolean;
  isDeleteSetPending: boolean;
};

export function TrainingTodaySection({
  copy,
  activeSession,
  scheduledWorkout,
  isRestDayToday,
  schedule,
  workouts,
  activeProgress,
  restRemaining,
  finishNotes,
  noteDrafts,
  renderPlaceholder,
  formatDateTime,
  formatRest,
  formatExerciseName,
  getSetDraft,
  getExerciseDraftCount,
  onFinishNotesChange,
  onNoteDraftsChange,
  onDraftsChange,
  onStartWorkout,
  onFinishSession,
  onSaveExerciseNote,
  onSaveSet,
  onDeleteSet,
  onOpenPlanning,
  isStartPending,
  isFinishPending,
  isSaveSessionNotePending,
  isSaveSetPending,
  isDeleteSetPending,
}: TrainingTodaySectionProps) {
  const todayIndex = new Date().getDay();
  const plannedDays = schedule.filter((day) => day.is_rest_day || day.workout_id !== null).length;
  const quickStartWorkoutId = workouts[0]?.id ?? null;

  return (
    <div className="grid gap-5 pb-24 xl:grid-cols-[1.4fr_0.9fr] xl:pb-0">
      <Card>
        <CardHeader>
          <CardTitle>{copy.tabs.train}</CardTitle>
          <CardDescription>La sesion activa tiene prioridad sobre todo lo demas.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {!activeSession && scheduledWorkout ? (
            <div className="rounded-2xl border p-4">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <div className="text-xl font-bold md:text-2xl">{scheduledWorkout.name}</div>
                  <div className="text-sm text-muted-foreground">{scheduledWorkout.description || "Rutina programada para hoy."}</div>
                </div>
                <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row">
                  <Button className="w-full sm:w-auto" onClick={() => onStartWorkout(scheduledWorkout.id)} disabled={isStartPending}>
                    <PlayCircle className="mr-2 h-4 w-4" />
                    {copy.startWorkout}
                  </Button>
                  {onOpenPlanning ? (
                    <Button className="w-full sm:w-auto" variant="outline" onClick={onOpenPlanning}>
                      {copy.viewPlanning}
                    </Button>
                  ) : null}
                </div>
              </div>
            </div>
          ) : null}

          {activeSession ? (
            <div className="space-y-4">
              <div className="rounded-2xl border p-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <div className="text-lg font-bold md:text-xl">{activeSession.workout.name}</div>
                    <div className="text-sm text-muted-foreground">{copy.startedAt} {formatDateTime(activeSession.started_at)}</div>
                  </div>
                  <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row">
                    <Button className="w-full sm:w-auto" variant="outline" disabled={isFinishPending} onClick={() => onFinishSession({ sessionId: activeSession.id, status: "cancelled" })}>
                      <XCircle className="mr-2 h-4 w-4" />
                      {copy.cancel}
                    </Button>
                    <Button className="w-full sm:w-auto" disabled={isFinishPending} onClick={() => onFinishSession({ sessionId: activeSession.id, status: "completed" })}>
                      <CheckCircle2 className="mr-2 h-4 w-4" />
                      {copy.finish}
                    </Button>
                  </div>
                </div>
                <Progress value={activeProgress.percent} className="mt-4 h-3" />
                <div className="mt-2 text-sm text-muted-foreground">{activeProgress.completed}/{activeProgress.target} {copy.completedSets}</div>
                <Textarea className="mt-4" placeholder={copy.sessionNotes} value={finishNotes} onChange={(event) => onFinishNotesChange(event.target.value)} />
              </div>

              {activeSession.exercises.map((exercise) => {
                const draftRows = getExerciseDraftCount(activeSession.id, exercise.exercise_id);
                const totalRows = Math.max(exercise.target_sets, exercise.sets.length, draftRows);
                const noteKey = `${activeSession.id}:${exercise.exercise_id}`;
                const localizedExerciseName = formatExerciseName(exercise.exercise);

                return (
                  <div key={exercise.id} className="rounded-2xl border p-4">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <div className="text-lg font-semibold">{localizedExerciseName}</div>
                        <div className="text-sm text-muted-foreground">
                          {copy.target}: {exercise.target_sets} {copy.targetSets.toLowerCase()} | {copy.targetReps}: {exercise.target_reps} | {copy.restLabel}: {formatRest(exercise.rest_seconds)}
                        </div>
                      </div>
                      <Badge variant="outline">{MUSCLE_GROUP_LABELS[exercise.exercise.muscle_group]}</Badge>
                    </div>

                    <div className="mt-4 rounded-xl bg-muted/35 p-3 text-sm">
                      <div className="font-medium">{copy.previousPerformance}</div>
                      {exercise.lastPerformance ? (
                        <div className="mt-1 text-muted-foreground">
                          {formatDateTime(exercise.lastPerformance.performed_at)} | {Math.round(exercise.lastPerformance.max_weight)} kg | {Math.round(exercise.lastPerformance.total_volume)} kg
                        </div>
                      ) : (
                        <div className="mt-1 text-muted-foreground">{copy.noPreviousPerformance}</div>
                      )}
                    </div>

                    <div className="mt-4 flex flex-col gap-2 sm:flex-row">
                      <Textarea
                        className="min-h-24"
                        value={noteDrafts[noteKey] ?? ""}
                        placeholder={copy.exerciseNote}
                        onChange={(event) => onNoteDraftsChange((current) => ({ ...current, [noteKey]: event.target.value }))}
                      />
                      <Button
                        className="w-full shrink-0 sm:w-auto"
                        variant="outline"
                        disabled={isSaveSessionNotePending}
                        onClick={() => onSaveExerciseNote({ sessionId: activeSession.id, exerciseId: exercise.exercise_id, notes: noteDrafts[noteKey] || null })}
                      >
                        {copy.saveNote}
                      </Button>
                    </div>

                    <div className="mt-4 space-y-3">
                      {Array.from({ length: totalRows }, (_, index) => {
                        const setNumber = index + 1;
                        const key = `${activeSession.id}:${exercise.exercise_id}:${setNumber}`;
                        const draft = getSetDraft(activeSession.id, exercise.exercise_id, setNumber);
                        const existingSet = exercise.sets.find((set) => set.set_number === setNumber);
                        return (
                          <div key={key} className="rounded-xl border p-3">
                            <div className="mb-3 flex items-center justify-between">
                              <div className="font-medium">{copy.setLabel} {setNumber}</div>
                              <Badge variant={draft.completed || existingSet?.completed ? "default" : "secondary"}>
                                {draft.completed || existingSet?.completed ? copy.markDone : copy.markUndone}
                              </Badge>
                            </div>
                            <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
                              <Input
                                aria-label={`${copy.weight} ${setNumber}`}
                                value={draft.weight}
                                onChange={(event) => onDraftsChange((current) => ({ ...current, [key]: { ...draft, weight: event.target.value } }))}
                                placeholder={copy.weight}
                              />
                              <Input
                                aria-label={`${copy.reps} ${setNumber}`}
                                value={draft.reps}
                                onChange={(event) => onDraftsChange((current) => ({ ...current, [key]: { ...draft, reps: event.target.value } }))}
                                placeholder={copy.reps}
                              />
                              <Input
                                aria-label={`${copy.rir} ${setNumber}`}
                                value={draft.rir}
                                onChange={(event) => onDraftsChange((current) => ({ ...current, [key]: { ...draft, rir: event.target.value } }))}
                                placeholder={copy.rir}
                              />
                              <Input
                                aria-label={`${copy.notes} ${setNumber}`}
                                className="col-span-2 md:col-span-1"
                                value={draft.notes}
                                onChange={(event) => onDraftsChange((current) => ({ ...current, [key]: { ...draft, notes: event.target.value } }))}
                                placeholder={copy.notes}
                              />
                            </div>
                            <div className="mt-3 grid gap-2 sm:flex sm:flex-wrap">
                              <Button className="w-full sm:w-auto" variant="outline" disabled={isSaveSetPending} onClick={() => onSaveSet(activeSession.id, exercise.exercise_id, setNumber, 0, false)}>
                                {copy.saveDraft}
                              </Button>
                              <Button className="w-full sm:w-auto" disabled={isSaveSetPending} onClick={() => onSaveSet(activeSession.id, exercise.exercise_id, setNumber, exercise.rest_seconds, true)}>
                                {copy.markDone}
                              </Button>
                              {(existingSet || setNumber > exercise.target_sets) ? (
                                <Button
                                  variant="ghost"
                                  className="w-full text-destructive hover:text-destructive sm:w-auto"
                                  disabled={isDeleteSetPending}
                                  onClick={() => onDeleteSet({ sessionId: activeSession.id, exerciseId: exercise.exercise_id, setNumber })}
                                >
                                  {copy.removeSet}
                                </Button>
                              ) : null}
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    <Button
                      className="mt-4"
                      variant="outline"
                      onClick={() =>
                        onDraftsChange((current) => ({
                          ...current,
                          [`${activeSession.id}:${exercise.exercise_id}:${totalRows + 1}`]: { weight: "0", reps: "0", rir: "", notes: "", completed: false },
                        }))
                      }
                    >
                      <TimerReset className="mr-2 h-4 w-4" />
                      {copy.addSet}
                    </Button>
                  </div>
                );
              })}
            </div>
          ) : null}

          {!activeSession && !scheduledWorkout ? (
            <div className="space-y-3">
              {renderPlaceholder(isRestDayToday ? copy.restDayNotice : copy.noWorkoutScheduled)}
              <div className="rounded-2xl border border-border/70 bg-muted/15 p-3 text-sm text-muted-foreground">{isRestDayToday ? copy.restDayHint : copy.noWorkoutScheduledHint}</div>
              <div className="grid gap-2 sm:flex sm:flex-wrap">
                {isRestDayToday ? (
                  <div className="rounded-xl border border-primary/30 bg-primary/10 px-3 py-2 text-sm font-medium text-foreground">
                    {copy.restDayCelebrate}
                  </div>
                ) : quickStartWorkoutId ? (
                  <Button className="w-full sm:w-auto" onClick={() => onStartWorkout(quickStartWorkoutId)} disabled={isStartPending}>
                    <PlayCircle className="mr-2 h-4 w-4" />
                    {copy.startWorkout}
                  </Button>
                ) : null}
                {onOpenPlanning ? (
                  <Button className="w-full sm:w-auto" variant="outline" onClick={onOpenPlanning}>
                    {copy.viewPlanning}
                  </Button>
                ) : null}
              </div>
            </div>
          ) : null}
        </CardContent>
      </Card>

      <div className="space-y-5">
        {restRemaining > 0 ? (
          <div className="app-surface-tile rounded-2xl p-4">
            <div className="app-surface-caption text-[11px] uppercase tracking-[0.22em]">{copy.rest}</div>
            <div className="app-surface-heading mt-2 text-lg font-semibold">{formatRest(restRemaining)}</div>
          </div>
        ) : null}

        <Card>
          <CardHeader>
            <CardTitle>{copy.planningSummaryTitle}</CardTitle>
            <CardDescription>{copy.planningSummaryDescription}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="rounded-2xl border border-border/70 bg-muted/20 p-3">
              <div className="mb-3 flex items-center justify-between gap-3">
                <span className="text-xs uppercase tracking-[0.18em] text-muted-foreground">{copy.week}</span>
                <Badge variant="outline">{plannedDays}/7</Badge>
              </div>
              <div className="grid grid-cols-7 gap-2">
                {schedule.map((day) => {
                  const isToday = day.day_of_week === todayIndex;
                  const isPlanned = day.is_rest_day || Boolean(day.workout_id);
                  return (
                    <div key={day.day_of_week} className="space-y-1 text-center">
                      <div className="text-[11px] text-muted-foreground">{DAY_LABELS[day.day_of_week].slice(0, 1)}</div>
                      <div className={`rounded-md border px-1 py-1 text-xs ${isPlanned ? "border-primary/60 bg-primary/10 text-foreground" : "border-dashed text-muted-foreground"}`}>
                        {day.is_rest_day ? "R" : isPlanned ? "OK" : "-"}
                      </div>
                      {isToday ? <div className="text-[10px] font-semibold text-primary">{copy.todayBadge}</div> : <div className="h-[14px]" />}
                    </div>
                  );
                })}
              </div>
              <div className="mt-2 text-[11px] text-muted-foreground">
                <span className="font-semibold text-foreground">R</span> = {copy.rest}
              </div>
            </div>
            {onOpenPlanning ? (
              <Button className="w-full" variant="outline" onClick={onOpenPlanning}>
                {copy.viewPlanning}
              </Button>
            ) : null}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{copy.quickStart}</CardTitle>
            <CardDescription>{copy.quickStartDescription}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {workouts.length === 0 ? renderPlaceholder(copy.firstCreateRoutine) : null}
            {workouts.map((workout) => (
              <div key={workout.id} className="flex flex-col gap-2 rounded-xl border px-3 py-3 sm:flex-row sm:items-center sm:justify-between">
                <span>{workout.name}</span>
                <Button className="w-full sm:w-auto" variant="outline" onClick={() => onStartWorkout(workout.id)} disabled={Boolean(activeSession) || isStartPending}>{copy.start}</Button>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

    </div>
  );
}
