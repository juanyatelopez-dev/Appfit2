import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { NUTRITION_ARCHETYPE_META } from "@/features/nutrition/nutritionProfiles";
import type { NutritionDayArchetype, NutritionProfileRecord } from "@/modules/nutrition/types";

type NutritionProfileDialogProps = {
  open: boolean;
  editingProfile: NutritionProfileRecord | null;
  profileName: string;
  profileArchetype: NutritionDayArchetype;
  profileIsDefault: boolean;
  isPending: boolean;
  onOpenChange: (open: boolean) => void;
  onProfileNameChange: (value: string) => void;
  onProfileArchetypeChange: (value: NutritionDayArchetype) => void;
  onProfileIsDefaultChange: (value: boolean) => void;
  onSave: () => void;
};

export function NutritionProfileDialog({
  open,
  editingProfile,
  profileName,
  profileArchetype,
  profileIsDefault,
  isPending,
  onOpenChange,
  onProfileNameChange,
  onProfileArchetypeChange,
  onProfileIsDefaultChange,
  onSave,
}: NutritionProfileDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="app-dialog-surface max-w-xl">
          <DialogHeader>
            <DialogTitle>{editingProfile ? "Editar plantilla del dia" : "Crear plantilla del dia"}</DialogTitle>
            <DialogDescription>
              Configura una plantilla para recalcular metas caloricas y macros segun el tipo de dia.
            </DialogDescription>
          </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Nombre</Label>
            <Input value={profileName} onChange={(event) => onProfileNameChange(event.target.value)} placeholder="Ej. Pierna, Torso, Descanso" className="app-input-surface" />
          </div>
          <div className="space-y-2">
            <Label>Tipo de dia</Label>
            <Select value={profileArchetype} onValueChange={(value) => onProfileArchetypeChange(value as NutritionDayArchetype)}>
              <SelectTrigger className="app-input-surface"><SelectValue /></SelectTrigger>
              <SelectContent>{Object.entries(NUTRITION_ARCHETYPE_META).map(([key, meta]) => <SelectItem key={key} value={key}>{meta.label}</SelectItem>)}</SelectContent>
            </Select>
            <div className="app-surface-soft rounded-2xl p-4 text-sm">{NUTRITION_ARCHETYPE_META[profileArchetype].description}</div>
          </div>
          <label className="app-surface-muted flex items-center gap-3 text-sm">
            <Checkbox checked={profileIsDefault} onCheckedChange={(checked) => onProfileIsDefaultChange(Boolean(checked))} />
            Marcar como plantilla inicial
          </label>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} className="w-full app-outline-button sm:w-auto">Cancelar</Button>
          <Button onClick={onSave} disabled={isPending} className="w-full bg-primary text-primary-foreground hover:bg-primary/90 sm:w-auto">Guardar plantilla</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
