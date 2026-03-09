import { differenceInYears } from "date-fns";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Progress } from "@/components/ui/progress";

type Props = {
  name: string;
  birthDate: string | null;
  avatarUrl: string | null;
  latestWeight: number | null;
  height: number | null;
  targetWeight: number | null;
  targetDate: string | null;
  progressPct: number | null;
  streakDays: number;
  onEditProfile: () => void;
  showGuestWarning?: boolean;
};

const ProfileSummaryCard = ({
  name,
  birthDate,
  avatarUrl,
  latestWeight,
  height,
  targetWeight,
  targetDate,
  progressPct,
  streakDays,
  onEditProfile,
  showGuestWarning = false,
}: Props) => {
  const parsedAge = birthDate ? differenceInYears(new Date(), new Date(birthDate)) : null;
  const age = parsedAge !== null && Number.isFinite(parsedAge) ? parsedAge : null;
  const hasMissing = age === null || latestWeight === null || height === null || targetWeight === null || !targetDate;

  return (
    <Card className="sticky top-24">
      <CardHeader className="items-center text-center">
        <Avatar className="w-20 h-20 ring-2 ring-primary/30">
          <AvatarImage src={avatarUrl || undefined} alt="Avatar de perfil" />
          <AvatarFallback>{name.slice(0, 2).toUpperCase()}</AvatarFallback>
        </Avatar>
        <CardTitle className="text-xl">{name}</CardTitle>
        {showGuestWarning && <p className="text-xs text-amber-700">Modo invitado: los datos no se guardarán.</p>}
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-3 gap-3 text-center">
          <div>
            <p className="text-xs text-muted-foreground">Edad</p>
            <p className="font-semibold">{age ?? "--"}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Peso</p>
            <p className="font-semibold">{latestWeight !== null ? `${latestWeight.toFixed(1)} kg` : "--"}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Altura</p>
            <p className="font-semibold">{height !== null ? `${height} cm` : "--"}</p>
          </div>
        </div>

        <div className="space-y-2">
          <p className="text-xs text-muted-foreground">Meta</p>
          <p className="font-semibold">
            {targetWeight !== null ? `${targetWeight.toFixed(1)} kg` : "--"}
            {" · "}
            {targetDate || "--"}
          </p>
          <Progress value={progressPct ?? 0} />
          <p className="text-xs text-muted-foreground">
            Progreso: {progressPct !== null ? `${progressPct.toFixed(0)}%` : "--"}
          </p>
        </div>

        <p className="text-sm font-medium">Racha: {streakDays} días</p>

        {hasMissing && (
          <Button variant="outline" className="w-full" onClick={onEditProfile}>
            Completar perfil
          </Button>
        )}
      </CardContent>
    </Card>
  );
};

export default ProfileSummaryCard;
