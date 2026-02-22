import { Trophy } from "lucide-react";

const Achievements = () => (
  <div className="flex flex-col items-center justify-center h-[60vh] text-muted-foreground">
    <Trophy className="w-16 h-16 mb-4 text-primary/40" />
    <h1 className="text-2xl font-semibold text-foreground">Achievements</h1>
    <p className="mt-2 text-sm">Coming soon — celebrate your milestones.</p>
  </div>
);

export default Achievements;
