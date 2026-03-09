export type AppBackgroundStyleId = "focus" | "mesh" | "plain";

export const APP_BACKGROUND_STYLES: Array<{
  id: AppBackgroundStyleId;
  label: { es: string; en: string };
  description: { es: string; en: string };
}> = [
  {
    id: "focus",
    label: { es: "Foco", en: "Focus" },
    description: {
      es: "Gradiente suave con brillo centrado en el color principal.",
      en: "Soft gradient with a highlight tied to the primary color.",
    },
  },
  {
    id: "mesh",
    label: { es: "Malla", en: "Mesh" },
    description: {
      es: "Fondo con capas y una cuadricula sutil para un look mas tecnico.",
      en: "Layered background with a subtle grid for a more technical look.",
    },
  },
  {
    id: "plain",
    label: { es: "Plano", en: "Plain" },
    description: {
      es: "Base limpia y menos dramatica para una lectura mas neutra.",
      en: "Cleaner and less dramatic base for a more neutral reading experience.",
    },
  },
];

export const getDefaultBackgroundStyleId = (): AppBackgroundStyleId => "focus";

export const isAppBackgroundStyleId = (value: string | null | undefined): value is AppBackgroundStyleId =>
  APP_BACKGROUND_STYLES.some((style) => style.id === value);
