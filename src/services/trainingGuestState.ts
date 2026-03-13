import type { GuestTrainingState } from "@/services/trainingShared";

const GUEST_TRAINING_KEY = "appfit_guest_training_state";

export const defaultGuestTrainingState = (): GuestTrainingState => ({
  customExercises: [],
  workouts: [],
  workoutExercises: [],
  schedule: [],
  sessions: [],
  sets: [],
  sessionNotes: [],
  prs: [],
});

export const readGuestTrainingState = (): GuestTrainingState => {
  const raw = localStorage.getItem(GUEST_TRAINING_KEY);
  if (!raw) return defaultGuestTrainingState();
  try {
    const parsed = JSON.parse(raw) as GuestTrainingState;
    return { ...defaultGuestTrainingState(), ...parsed };
  } catch {
    return defaultGuestTrainingState();
  }
};

export const saveGuestTrainingState = (state: GuestTrainingState) => {
  localStorage.setItem(GUEST_TRAINING_KEY, JSON.stringify(state));
};
