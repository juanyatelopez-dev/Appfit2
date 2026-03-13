import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import type { TrainingCopy } from "@/pages/training/trainingConstants";

type TrainingDeleteWorkoutDialogProps = {
  copy: TrainingCopy;
  workoutId: string | null;
  onOpenChange: (open: boolean) => void;
  onConfirm: (workoutId: string) => void;
};

export function TrainingDeleteWorkoutDialog({
  copy,
  workoutId,
  onOpenChange,
  onConfirm,
}: TrainingDeleteWorkoutDialogProps) {
  return (
    <AlertDialog open={Boolean(workoutId)} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{copy.deleteRoutineTitle}</AlertDialogTitle>
          <AlertDialogDescription>{copy.deleteRoutineDescription}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>{copy.cancel}</AlertDialogCancel>
          <AlertDialogAction onClick={() => workoutId && onConfirm(workoutId)}>
            {copy.deleteRoutineConfirm}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
