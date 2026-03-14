import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { TrainingHistorySection } from "@/pages/training/components/TrainingHistorySection";
import { TRAINING_COPY } from "@/pages/training/trainingConstants";

describe("TrainingHistorySection", () => {
  it("renders placeholder when history is empty", () => {
    const renderPlaceholder = vi.fn((message: string) => <div>{message}</div>);

    render(
      <TrainingHistorySection
        copy={TRAINING_COPY.es}
        history={[]}
        renderPlaceholder={renderPlaceholder}
        formatDateTime={() => "13 mar"}
      />,
    );

    expect(renderPlaceholder).toHaveBeenCalledWith(TRAINING_COPY.es.noHistory);
    expect(screen.getByText(TRAINING_COPY.es.noHistory)).toBeInTheDocument();
  });

  it("renders session history rows", () => {
    render(
      <TrainingHistorySection
        copy={TRAINING_COPY.es}
        history={[
          {
            id: "session-1",
            workout_name: "Push A",
            started_at: "2026-03-13T10:00:00.000Z",
            status: "completed",
            total_volume: 1840.4,
          },
        ]}
        renderPlaceholder={(message) => <div>{message}</div>}
        formatDateTime={() => "13 mar, 10:00"}
      />,
    );

    expect(screen.getByText("Push A")).toBeInTheDocument();
    expect(screen.getByText("13 mar, 10:00")).toBeInTheDocument();
    expect(screen.getByText("completed")).toBeInTheDocument();
    expect(screen.getByText("1840 kg")).toBeInTheDocument();
  });
});
