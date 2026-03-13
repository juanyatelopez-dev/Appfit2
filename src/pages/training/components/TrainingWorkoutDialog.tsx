import { CirclePlus, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { MUSCLE_GROUP_LABELS } from "@/features/training/catalog";
import { createClientId } from "@/lib/id";
import { toNumber, type TrainingCopy } from "@/pages/training/trainingConstants";
import type { ExerciseRecord, SaveWorkoutInput } from "@/types/training";

export type WorkoutExerciseDraft = SaveWorkoutInput["exercises"][number] & { clientId: string; exercise?: ExerciseRecord };

type TrainingWorkoutDialogProps = {
  copy: TrainingCopy;
  open: boolean;
  editingWorkoutId: string | null;
  workoutName: string;
  workoutDescription: string;
  exercisePickerId: string;
  exerciseLibrary: ExerciseRecord[];
  workoutExercises: WorkoutExerciseDraft[];
  isPending: boolean;
  formatExerciseName: (exercise: ExerciseRecord) => string;
  onOpenChange: (open: boolean) => void;
  onWorkoutNameChange: (value: string) => void;
  onWorkoutDescriptionChange: (value: string) => void;
  onExercisePickerChange: (value: string) => void;
  onWorkoutExercisesChange: (updater: (current: WorkoutExerciseDraft[]) => WorkoutExerciseDraft[]) => void;
  onSave: () => void;
};

export function TrainingWorkoutDialog({
  copy,
  open,
  editingWorkoutId,
  workoutName,
  workoutDescription,
  exercisePickerId,
  exerciseLibrary,
  workoutExercises,
  isPending,
  formatExerciseName,
  onOpenChange,
  onWorkoutNameChange,
  onWorkoutDescriptionChange,
  onExercisePickerChange,
  onWorkoutExercisesChange,
  onSave,
}: TrainingWorkoutDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl">
        <DialogHeader>
          <DialogTitle>{editingWorkoutId ? copy.editRoutine : copy.createRoutine}</DialogTitle>
          <DialogDescription>
            Define el nombre, la descripcion y los ejercicios que formaran parte de la rutina.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-5 xl:grid-cols-[0.95fr_1.2fr]">
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Nombre</Label>
              <Input value={workoutName} onChange={(event) => onWorkoutNameChange(event.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Descripcion</Label>
              <Textarea value={workoutDescription} onChange={(event) => onWorkoutDescriptionChange(event.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>{copy.addExercise}</Label>
              <Select value={exercisePickerId} onValueChange={onExercisePickerChange}>
                <SelectTrigger><SelectValue placeholder={copy.selectExercise} /></SelectTrigger>
                <SelectContent>{exerciseLibrary.map((exercise) => <SelectItem key={exercise.id} value={exercise.id}>{formatExerciseName(exercise)}</SelectItem>)}</SelectContent>
              </Select>
              <Button
                variant="outline"
                onClick={() => {
                  const exercise = exerciseLibrary.find((row) => row.id === exercisePickerId);
                  if (!exercise) return;
                  onWorkoutExercisesChange((current) => [
                    ...current,
                    {
                      clientId: createClientId(),
                      exercise_id: exercise.id,
                      order_index: current.length,
                      target_sets: 3,
                      target_reps: "8-10",
                      rest_seconds: 90,
                      notes: "",
                      exercise,
                    },
                  ]);
                  onExercisePickerChange("");
                }}
                disabled={!exercisePickerId}
              >
                <CirclePlus className="mr-2 h-4 w-4" />
                {copy.addExercise}
              </Button>
            </div>
          </div>

          <div className="space-y-3">
            {workoutExercises.map((exercise, index) => (
              <div key={exercise.clientId} className="rounded-2xl border p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="font-semibold">{index + 1}. {exercise.exercise ? formatExerciseName(exercise.exercise) : exercise.exercise_id}</div>
                    <div className="text-xs text-muted-foreground">{exercise.exercise ? MUSCLE_GROUP_LABELS[exercise.exercise.muscle_group] : "Ejercicio"}</div>
                  </div>
                  <Button variant="ghost" size="icon" onClick={() => onWorkoutExercisesChange((current) => current.filter((row) => row.clientId !== exercise.clientId))}><Trash2 className="h-4 w-4" /></Button>
                </div>
                <div className="mt-4 grid gap-3 md:grid-cols-3">
                  <div className="space-y-2">
                    <Label className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Repeticiones</Label>
                    <Input
                      aria-label={copy.targetReps}
                      placeholder="8-10"
                      value={exercise.target_reps}
                      onChange={(event) => onWorkoutExercisesChange((current) => current.map((row) => row.clientId === exercise.clientId ? { ...row, target_reps: event.target.value } : row))}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Series</Label>
                    <Input
                      aria-label={copy.targetSets}
                      placeholder="3"
                      value={String(exercise.target_sets)}
                      onChange={(event) => onWorkoutExercisesChange((current) => current.map((row) => row.clientId === exercise.clientId ? { ...row, target_sets: Math.max(1, toNumber(event.target.value)) } : row))}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Descanso (s)</Label>
                    <Input
                      aria-label="Descanso en segundos"
                      placeholder="90"
                      value={String(exercise.rest_seconds)}
                      onChange={(event) => onWorkoutExercisesChange((current) => current.map((row) => row.clientId === exercise.clientId ? { ...row, rest_seconds: Math.max(0, toNumber(event.target.value)) } : row))}
                    />
                  </div>
                </div>
                <Textarea className="mt-3" value={exercise.notes ?? ""} onChange={(event) => onWorkoutExercisesChange((current) => current.map((row) => row.clientId === exercise.clientId ? { ...row, notes: event.target.value } : row))} placeholder="Nota fija del ejercicio" />
              </div>
            ))}
          </div>
        </div>
        <DialogFooter>
          <Button className="w-full sm:w-auto" variant="outline" onClick={() => onOpenChange(false)}>{copy.cancel}</Button>
          <Button className="w-full sm:w-auto" onClick={onSave} disabled={isPending}>{copy.saveRoutine}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
