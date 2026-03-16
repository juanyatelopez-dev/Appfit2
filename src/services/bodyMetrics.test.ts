import { beforeEach, describe, expect, it, vi } from "vitest";

type QueryResult = { data: unknown; error: unknown };
type BuilderThen = (value: QueryResult) => void;
type BuilderCatch = (reason?: unknown) => void;
type MockBuilder = {
  select: ReturnType<typeof vi.fn>;
  eq: ReturnType<typeof vi.fn>;
  order: ReturnType<typeof vi.fn>;
  gte: ReturnType<typeof vi.fn>;
  upsert: ReturnType<typeof vi.fn>;
  delete: ReturnType<typeof vi.fn>;
  single: ReturnType<typeof vi.fn>;
  then: (resolve: BuilderThen, reject?: BuilderCatch) => Promise<void>;
};

const queuedResults: QueryResult[] = [];
const builders: MockBuilder[] = [];
const fromMock = vi.fn();

const queueResult = (result: QueryResult) => {
  queuedResults.push(result);
};

const makeBuilder = (result: QueryResult): MockBuilder => {
  const builder = {} as MockBuilder;
  builder.select = vi.fn(() => builder);
  builder.eq = vi.fn(() => builder);
  builder.order = vi.fn(() => builder);
  builder.gte = vi.fn(() => builder);
  builder.upsert = vi.fn(() => builder);
  builder.delete = vi.fn(() => builder);
  builder.single = vi.fn(async () => result);
  builder.then = (resolve: BuilderThen, reject?: BuilderCatch) => Promise.resolve(result).then(resolve, reject);
  return builder;
};

vi.mock("@/services/supabaseClient", () => ({
  supabase: {
    from: (...args: unknown[]) => fromMock(...args),
  },
}));

import {
  deleteBodyMetric,
  listBodyMetrics,
  listBodyMetricsByRange,
  upsertBodyMetric,
} from "@/services/bodyMetrics";

describe("bodyMetrics service", () => {
  beforeEach(() => {
    queuedResults.length = 0;
    builders.length = 0;
    fromMock.mockReset();
    fromMock.mockImplementation(() => {
      const result = queuedResults.shift() ?? { data: [], error: null };
      const builder = makeBuilder(result);
      builders.push(builder);
      return builder;
    });
  });

  it("lists metrics ordered by measured_at desc", async () => {
    queueResult({ data: [{ id: "1", measured_at: "2026-03-01" }], error: null });

    const result = await listBodyMetrics("user-1", false);

    const builder = builders[0];
    expect(result).toEqual([{ id: "1", measured_at: "2026-03-01" }]);
    expect(fromMock).toHaveBeenCalledWith("body_metrics");
    expect(builder.select).toHaveBeenCalledWith("*");
    expect(builder.eq).toHaveBeenCalledWith("user_id", "user-1");
    expect(builder.order).toHaveBeenCalledWith("measured_at", { ascending: false });
  });

  it("lists metrics by range with ascending order and date filter", async () => {
    queueResult({ data: [], error: null });

    await listBodyMetricsByRange("user-1", "30d", false);

    const builder = builders[0];
    expect(builder.order).toHaveBeenCalledWith("measured_at", { ascending: true });
    expect(builder.gte).toHaveBeenCalled();
  });

  it("upserts metric using conflict key user_id,measured_at", async () => {
    queueResult({
      data: {
        id: "row-1",
        user_id: "user-1",
        measured_at: "2026-03-03",
        weight_kg: 82.1,
        notes: null,
        created_at: "2026-03-03T00:00:00.000Z",
      },
      error: null,
    });

    const saved = await upsertBodyMetric({
      userId: "user-1",
      measured_at: "2026-03-03",
      weight_kg: 82.1,
      notes: null,
      isGuest: false,
    });

    const builder = builders[0];
    expect(builder.upsert).toHaveBeenCalledWith(
      {
        user_id: "user-1",
        measured_at: "2026-03-03",
        weight_kg: 82.1,
        notes: null,
      },
      { onConflict: "user_id,measured_at" },
    );
    expect(builder.select).toHaveBeenCalledWith("*");
    expect(builder.single).toHaveBeenCalled();
    expect(saved?.id).toBe("row-1");
  });

  it("deletes metric by id and owner", async () => {
    queueResult({ data: null, error: null });

    await deleteBodyMetric("metric-1", "user-1", false);

    const builder = builders[0];
    expect(builder.delete).toHaveBeenCalled();
    expect(builder.eq).toHaveBeenCalledWith("id", "metric-1");
    expect(builder.eq).toHaveBeenCalledWith("user_id", "user-1");
  });
});
