import { BarChart3 } from "lucide-react";

const Stats = () => (
  <div className="flex flex-col items-center justify-center h-[60vh] text-muted-foreground">
    <BarChart3 className="w-16 h-16 mb-4 text-primary/40" />
    <h1 className="text-2xl font-semibold text-foreground">Statistics</h1>
    <p className="mt-2 text-sm">Coming soon — view your performance analytics.</p>
  </div>
);

export default Stats;
