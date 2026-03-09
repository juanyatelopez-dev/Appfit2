import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { AreaChart, BarChart, Card, DonutChart, Metric, Text, Title } from "@tremor/react";

import { useAuth } from "@/context/AuthContext";
import { DEFAULT_WATER_TIMEZONE } from "@/features/water/waterUtils";
import { getNutritionGoals, getNutritionRangeSummary } from "@/services/nutrition";

type TrendRow = {
  dateKey: string;
  label: string;
  weight: number | null;
  water: number;
  sleep_hours: number;
  sleep_quality: number | null;
  energy: number | null;
  stress: number | null;
  completion_count: number;
  goal_hits: number;
};

type CoreData = {
  recovery?: { score: number; status: string } | null;
  activeDays7?: number;
  water7d?: Array<{ date_key: string; total_ml: number }>;
  waterGoalMl?: number;
  sleep7d?: Array<{ date_key: string; total_minutes: number }>;
  sleepGoalMinutes?: number;
};

type Props = {
  trends: TrendRow[];
  core: CoreData | null | undefined;
};

const percent = (value: number, total: number) => {
  if (!Number.isFinite(value) || !Number.isFinite(total) || total <= 0) return 0;
  return Math.max(0, Math.min(100, Math.round((value / total) * 100)));
};

const TremorAnalyticsPanel = ({ trends, core }: Props) => {
  const { user, isGuest, profile } = useAuth();
  const userId = user?.id ?? null;
  const timeZone = (profile as any)?.timezone || DEFAULT_WATER_TIMEZONE;

  const today = useMemo(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  }, []);

  const nutritionWeekQuery = useQuery({
    queryKey: ["dashboard_tremor_nutrition_7d", userId, isGuest, timeZone],
    queryFn: async () => {
      const from = new Date(today);
      from.setDate(from.getDate() - 6);
      const [range, goals] = await Promise.all([
        getNutritionRangeSummary(userId, from, today, { isGuest, timeZone }).catch(() => ({
          days: [],
          averages: { calories: 0, protein_g: 0, carbs_g: 0, fat_g: 0 },
        })),
        getNutritionGoals(userId, { isGuest, profile: profile as any }).catch(() => ({
          calorie_goal: 2000,
          protein_goal_g: 150,
          carb_goal_g: 250,
          fat_goal_g: 70,
          day_archetype: "base",
          bmr: 0,
          tdee: 0,
          activity_multiplier: 1.375,
          goal_multiplier: 1,
          archetype_delta: 0,
          calorie_target: 2000,
          final_target_calories: 2000,
        })),
      ]);
      return { range, goals };
    },
    enabled: Boolean(userId) || isGuest,
  });

  const hydrationSleepData = useMemo(
    () =>
      trends.map((row) => ({
        fecha: row.label,
        Agua: Math.round(row.water || 0),
        Sueno: Number((row.sleep_hours || 0).toFixed(1)),
      })),
    [trends],
  );

  const consistencyData = useMemo(
    () =>
      trends.map((row) => ({
        fecha: row.label,
        Completadas: row.completion_count || 0,
        Metas: row.goal_hits || 0,
      })),
    [trends],
  );

  const biofeedbackData = useMemo(
    () =>
      trends.map((row) => ({
        fecha: row.label,
        Energia: row.energy ?? 0,
        Estres: row.stress ?? 0,
        CalidadSueno: row.sleep_quality ?? 0,
      })),
    [trends],
  );

  const weightData = useMemo(() => {
    let rolling: number[] = [];
    return trends.map((row) => {
      if (row.weight !== null && row.weight !== undefined) {
        rolling = [...rolling, row.weight].slice(-3);
      }
      const avg = rolling.length ? rolling.reduce((sum, item) => sum + item, 0) / rolling.length : null;
      return {
        fecha: row.label,
        Peso: row.weight ?? null,
        Media3d: avg !== null ? Number(avg.toFixed(2)) : null,
      };
    });
  }, [trends]);

  const waterGoal = Number(core?.waterGoalMl ?? 2000);
  const sleepGoal = Number(core?.sleepGoalMinutes ?? 480);
  const waterDaysMet = (core?.water7d || []).filter((row) => Number(row.total_ml || 0) >= waterGoal).length;
  const sleepDaysMet = (core?.sleep7d || []).filter((row) => Number(row.total_minutes || 0) >= sleepGoal).length;
  const activeDays = Number(core?.activeDays7 ?? 0);
  const recoveryScore = Number(core?.recovery?.score ?? 0);

  const nutritionGoals = nutritionWeekQuery.data?.goals;
  const nutritionAverages = nutritionWeekQuery.data?.range?.averages;
  const calorieAdherence = percent(Number(nutritionAverages?.calories ?? 0), Number(nutritionGoals?.calorie_goal ?? 2000));
  const proteinAdherence = percent(Number(nutritionAverages?.protein_g ?? 0), Number(nutritionGoals?.protein_goal_g ?? 150));
  const carbsAdherence = percent(Number(nutritionAverages?.carbs_g ?? 0), Number(nutritionGoals?.carb_goal_g ?? 250));
  const fatAdherence = percent(Number(nutritionAverages?.fat_g ?? 0), Number(nutritionGoals?.fat_goal_g ?? 70));

  const adherenceDonut = [
    { name: "Calorias", value: calorieAdherence },
    { name: "Proteina", value: proteinAdherence },
    { name: "Carbs", value: carbsAdherence },
    { name: "Grasas", value: fatAdherence },
  ];

  return (
    <div className="grid gap-4">
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Card>
          <Text>Recovery score hoy</Text>
          <Metric>{recoveryScore}/100</Metric>
          <Text>{core?.recovery?.status ?? "Sin datos"}</Text>
        </Card>
        <Card>
          <Text>Dias activos (7d)</Text>
          <Metric>{activeDays}/7</Metric>
          <Text>Actividad en agua, sueno, notas o biofeedback</Text>
        </Card>
        <Card>
          <Text>Adherencia agua (7d)</Text>
          <Metric>
            {waterDaysMet}/{core?.water7d?.length || 7}
          </Metric>
          <Text>Meta diaria: {waterGoal} ml</Text>
        </Card>
        <Card>
          <Text>Adherencia sueno (7d)</Text>
          <Metric>
            {sleepDaysMet}/{core?.sleep7d?.length || 7}
          </Metric>
          <Text>Meta diaria: {(sleepGoal / 60).toFixed(1)} h</Text>
        </Card>
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <Card>
          <Title>Habitos diarios (7d)</Title>
          <Text>Agua y sueno por dia.</Text>
          <AreaChart
            className="mt-4 h-72"
            data={hydrationSleepData}
            index="fecha"
            categories={["Agua", "Sueno"]}
            colors={["cyan", "indigo"]}
            valueFormatter={(value: number) => `${value}`}
          />
        </Card>

        <Card>
          <Title>Consistencia de metricas</Title>
          <Text>Completadas del To-Do vs metas de agua/sueno.</Text>
          <BarChart
            className="mt-4 h-72"
            data={consistencyData}
            index="fecha"
            categories={["Completadas", "Metas"]}
            colors={["emerald", "amber"]}
            valueFormatter={(value: number) => `${value}`}
          />
        </Card>
      </div>

      <div className="grid gap-4 xl:grid-cols-3">
        <Card className="xl:col-span-2">
          <Title>Biofeedback (7d)</Title>
          <Text>Energia, estres y calidad de sueno subjetiva.</Text>
          <AreaChart
            className="mt-4 h-72"
            data={biofeedbackData}
            index="fecha"
            categories={["Energia", "Estres", "CalidadSueno"]}
            colors={["blue", "rose", "violet"]}
            valueFormatter={(value: number) => `${value}/10`}
          />
        </Card>

        <Card>
          <Title>Adherencia nutricional</Title>
          <Text>Promedio 7d vs objetivo.</Text>
          <DonutChart className="mt-4" data={adherenceDonut} category="value" index="name" />
          <div className="mt-4 space-y-1 text-sm">
            <p>Calorias: {calorieAdherence}%</p>
            <p>Proteina: {proteinAdherence}%</p>
            <p>Carbs: {carbsAdherence}%</p>
            <p>Grasas: {fatAdherence}%</p>
          </div>
        </Card>
      </div>

      <Card>
        <Title>Tendencia de peso</Title>
        <Text>Peso diario y media movil corta.</Text>
        <AreaChart
          className="mt-4 h-72"
          data={weightData}
          index="fecha"
          categories={["Peso", "Media3d"]}
          colors={["amber", "gray"]}
          valueFormatter={(value: number) => `${value} kg`}
        />
      </Card>
    </div>
  );
};

export default TremorAnalyticsPanel;
