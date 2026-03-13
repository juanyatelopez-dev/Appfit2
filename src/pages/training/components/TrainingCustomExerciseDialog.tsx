import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { DIFFICULTY_LABELS, EQUIPMENT_LABELS, MOVEMENT_LABELS, MUSCLE_GROUP_LABELS } from "@/features/training/catalog";
import type { TrainingCopy } from "@/pages/training/trainingConstants";
import type { SaveExerciseInput } from "@/types/training";

type TrainingCustomExerciseDialogProps = {
  copy: TrainingCopy;
  open: boolean;
  form: SaveExerciseInput;
  isPending: boolean;
  onOpenChange: (open: boolean) => void;
  onFormChange: (updater: (current: SaveExerciseInput) => SaveExerciseInput) => void;
  onSave: () => void;
};

export function TrainingCustomExerciseDialog({
  copy,
  open,
  form,
  isPending,
  onOpenChange,
  onFormChange,
  onSave,
}: TrainingCustomExerciseDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>{copy.createCustomExercise}</DialogTitle>
          <DialogDescription>
            Guarda un ejercicio personalizado para reutilizarlo en la biblioteca y en tus rutinas.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2 md:col-span-2">
            <Label>Nombre</Label>
            <Input value={form.name} onChange={(event) => onFormChange((current) => ({ ...current, name: event.target.value }))} />
          </div>
          <div className="space-y-2">
            <Label>Grupo muscular</Label>
            <Select value={form.muscle_group} onValueChange={(value) => onFormChange((current) => ({ ...current, muscle_group: value as SaveExerciseInput["muscle_group"] }))}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{Object.entries(MUSCLE_GROUP_LABELS).map(([value, label]) => <SelectItem key={value} value={value}>{label}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Equipamiento</Label>
            <Select value={form.equipment} onValueChange={(value) => onFormChange((current) => ({ ...current, equipment: value as SaveExerciseInput["equipment"] }))}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{Object.entries(EQUIPMENT_LABELS).map(([value, label]) => <SelectItem key={value} value={value}>{label}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Tipo de movimiento</Label>
            <Select value={form.movement_type} onValueChange={(value) => onFormChange((current) => ({ ...current, movement_type: value as SaveExerciseInput["movement_type"] }))}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{Object.entries(MOVEMENT_LABELS).map(([value, label]) => <SelectItem key={value} value={value}>{label}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Dificultad</Label>
            <Select value={form.difficulty} onValueChange={(value) => onFormChange((current) => ({ ...current, difficulty: value as SaveExerciseInput["difficulty"] }))}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{Object.entries(DIFFICULTY_LABELS).map(([value, label]) => <SelectItem key={value} value={value}>{label}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="space-y-2 md:col-span-2">
            <Label>Musculos secundarios (coma separada)</Label>
            <Input value={form.secondary_muscles.join(", ")} onChange={(event) => onFormChange((current) => ({ ...current, secondary_muscles: event.target.value.split(",").map((item) => item.trim()).filter(Boolean) }))} />
          </div>
          <div className="space-y-2 md:col-span-2">
            <Label>Instrucciones</Label>
            <Textarea value={form.instructions ?? ""} onChange={(event) => onFormChange((current) => ({ ...current, instructions: event.target.value }))} />
          </div>
          <div className="space-y-2 md:col-span-2">
            <Label>Video URL</Label>
            <Input value={form.video_url ?? ""} onChange={(event) => onFormChange((current) => ({ ...current, video_url: event.target.value }))} />
          </div>
        </div>
        <DialogFooter>
          <Button className="w-full sm:w-auto" variant="outline" onClick={() => onOpenChange(false)}>{copy.cancel}</Button>
          <Button className="w-full sm:w-auto" onClick={onSave} disabled={isPending}>{copy.saveExercise}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
