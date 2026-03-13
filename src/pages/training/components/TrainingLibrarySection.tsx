import { CirclePlus } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DIFFICULTY_LABELS, EQUIPMENT_LABELS, MOVEMENT_LABELS, MUSCLE_GROUP_LABELS } from "@/features/training/catalog";
import type { TrainingCopy } from "@/pages/training/trainingConstants";
import type { ExerciseFilterInput, ExerciseRecord } from "@/types/training";

type TrainingLibrarySectionProps = {
  copy: TrainingCopy;
  filters: ExerciseFilterInput;
  exerciseLibrary: ExerciseRecord[];
  formatExerciseName: (exercise: ExerciseRecord) => string;
  onOpenCustomExercise: () => void;
  onFiltersChange: (updater: (current: ExerciseFilterInput) => ExerciseFilterInput) => void;
  onSelectExercise: (exerciseId: string) => void;
};

export function TrainingLibrarySection({
  copy,
  filters,
  exerciseLibrary,
  formatExerciseName,
  onOpenCustomExercise,
  onFiltersChange,
  onSelectExercise,
}: TrainingLibrarySectionProps) {
  return (
    <Card>
      <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <CardTitle>{copy.exerciseLibrary}</CardTitle>
          <CardDescription>{copy.exerciseLibraryDescription}</CardDescription>
        </div>
        <Button className="w-full sm:w-auto" onClick={onOpenCustomExercise}><CirclePlus className="mr-2 h-4 w-4" />{copy.customExercise}</Button>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Input placeholder={copy.searchExercise} value={filters.search ?? ""} onChange={(event) => onFiltersChange((current) => ({ ...current, search: event.target.value }))} />
          <Select value={filters.muscleGroup ?? "all"} onValueChange={(value) => onFiltersChange((current) => ({ ...current, muscleGroup: value as ExerciseFilterInput["muscleGroup"] }))}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{copy.allGroups}</SelectItem>
              {Object.entries(MUSCLE_GROUP_LABELS).map(([value, label]) => <SelectItem key={value} value={value}>{label}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={filters.equipment ?? "all"} onValueChange={(value) => onFiltersChange((current) => ({ ...current, equipment: value as ExerciseFilterInput["equipment"] }))}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{copy.allEquipment}</SelectItem>
              {Object.entries(EQUIPMENT_LABELS).map(([value, label]) => <SelectItem key={value} value={value}>{label}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={filters.movementType ?? "all"} onValueChange={(value) => onFiltersChange((current) => ({ ...current, movementType: value as ExerciseFilterInput["movementType"] }))}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{copy.allPatterns}</SelectItem>
              {Object.entries(MOVEMENT_LABELS).map(([value, label]) => <SelectItem key={value} value={value}>{label}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="grid gap-3 md:grid-cols-2">
          {exerciseLibrary.map((exercise) => (
            <button key={exercise.id} type="button" className="rounded-2xl border p-4 text-left hover:border-cyan-400/40 hover:bg-cyan-400/5" onClick={() => onSelectExercise(exercise.id)}>
              <div className="flex items-start justify-between gap-2">
                <div>
                  <div className="font-semibold">{formatExerciseName(exercise)}</div>
                  <div className="text-xs text-muted-foreground">{MUSCLE_GROUP_LABELS[exercise.muscle_group]} | {EQUIPMENT_LABELS[exercise.equipment]}</div>
                </div>
                {exercise.is_custom ? <Badge variant="secondary">{copy.customBadge}</Badge> : <Badge variant="outline">{copy.baseBadge}</Badge>}
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                <Badge variant="outline">{MOVEMENT_LABELS[exercise.movement_type]}</Badge>
                <Badge variant="outline">{DIFFICULTY_LABELS[exercise.difficulty]}</Badge>
              </div>
            </button>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
