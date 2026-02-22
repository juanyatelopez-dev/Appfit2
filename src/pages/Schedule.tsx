import { CalendarDays } from "lucide-react";

const Schedule = () => (
  <div className="flex flex-col items-center justify-center h-[60vh] text-muted-foreground">
    <CalendarDays className="w-16 h-16 mb-4 text-primary/40" />
    <h1 className="text-2xl font-semibold text-foreground">Schedule</h1>
    <p className="mt-2 text-sm">Coming soon — plan your workout schedule.</p>
  </div>
);

export default Schedule;
