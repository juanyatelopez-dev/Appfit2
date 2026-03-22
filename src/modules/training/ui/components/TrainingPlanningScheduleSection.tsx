import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DAY_LABELS } from "@/modules/training/catalog";
import type { TrainingCopy } from "@/modules/training/ui/trainingConstants";
import type { WorkoutRecord, WorkoutScheduleDay } from "@/modules/training/types";

type TrainingPlanningScheduleSectionProps = {
  copy: TrainingCopy;
  schedule: WorkoutScheduleDay[];
  workouts: WorkoutRecord[];
  isSaveSchedulePending: boolean;
  onSaveScheduleDay: (payload: { dayOfWeek: number; workoutId: string | null; isRestDay: boolean }) => void;
};

export function TrainingPlanningScheduleSection({
  copy,
  schedule,
  workouts,
  isSaveSchedulePending,
  onSaveScheduleDay,
}: TrainingPlanningScheduleSectionProps) {
  const todayIndex = new Date().getDay();

  return (
    <Card>
      <CardHeader>
        <CardTitle>{copy.planningSectionTitle}</CardTitle>
        <CardDescription>{copy.planningSectionDescription}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {schedule.map((day) => (
          <div key={day.day_of_week} className="grid gap-2 rounded-2xl border p-3">
            <div className="flex items-center justify-between gap-3">
              <span className="font-medium">{DAY_LABELS[day.day_of_week]}</span>
              {day.day_of_week === todayIndex ? <Badge variant="secondary">{copy.todayBadge}</Badge> : null}
            </div>
            <Select
              value={day.is_rest_day ? "rest" : day.workout_id ?? "none"}
              disabled={isSaveSchedulePending}
              onValueChange={(value) =>
                onSaveScheduleDay({
                  dayOfWeek: day.day_of_week,
                  workoutId: value === "none" || value === "rest" ? null : value,
                  isRestDay: value === "rest",
                })
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">{copy.unassigned}</SelectItem>
                <SelectItem value="rest">{copy.rest}</SelectItem>
                {workouts.map((workout) => (
                  <SelectItem key={workout.id} value={workout.id}>
                    {workout.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
