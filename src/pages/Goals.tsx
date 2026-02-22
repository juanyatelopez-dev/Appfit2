import { Target } from "lucide-react";

const Goals = () => (
  <div className="flex flex-col items-center justify-center h-[60vh] text-muted-foreground">
    <Target className="w-16 h-16 mb-4 text-primary/40" />
    <h1 className="text-2xl font-semibold text-foreground">My Goals</h1>
    <p className="mt-2 text-sm">Coming soon — track and manage your fitness goals.</p>
  </div>
);

export default Goals;
