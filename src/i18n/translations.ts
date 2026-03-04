export type AppLanguage = "en" | "es";

export type TranslationKey =
  | "nav.dashboard"
  | "nav.profile"
  | "nav.goals"
  | "nav.statistics"
  | "nav.water"
  | "nav.weight"
  | "nav.calendar"
  | "nav.settings"
  | "sidebar.editProfile"
  | "sidebar.guest"
  | "sidebar.user"
  | "header.dashboard"
  | "settings.title"
  | "settings.loading"
  | "settings.profileTitle"
  | "settings.profileDescription"
  | "settings.guestWarning"
  | "settings.avatarFromProfile"
  | "settings.fullName"
  | "settings.birthDate"
  | "settings.weight"
  | "settings.height"
  | "settings.fitnessGoal"
  | "settings.selectGoal"
  | "settings.goal.buildMuscles"
  | "settings.goal.loseWeight"
  | "settings.goal.keepFit"
  | "settings.goal.improveEndurance"
  | "settings.saveChanges"
  | "settings.saving"
  | "settings.success"
  | "settings.fail"
  | "settings.heightError"
  | "settings.weightError"
  | "settings.preferencesTitle"
  | "settings.preferencesDescription"
  | "settings.language"
  | "settings.languageDescription"
  | "settings.theme"
  | "settings.themeDescription"
  | "settings.language.en"
  | "settings.language.es"
  | "settings.theme.light"
  | "settings.theme.dark"
  | "settings.theme.system"
  | "calendar.title"
  | "calendar.description"
  | "calendar.loading"
  | "calendar.today"
  | "calendar.prevMonth"
  | "calendar.nextMonth"
  | "calendar.monthStats.activeDays"
  | "calendar.monthStats.waterGoalDays"
  | "calendar.monthStats.avgWater"
  | "calendar.monthStats.avgWeight"
  | "calendar.summaryTitle"
  | "calendar.summaryEmpty"
  | "calendar.summary.weight"
  | "calendar.summary.water"
  | "calendar.summary.goalReached"
  | "calendar.summary.goalPending"
  | "calendar.summary.noWeight"
  | "calendar.summary.noWater"
  | "calendar.summary.logsTitle"
  | "calendar.summary.noLogs"
  | "calendar.quickAddTitle"
  | "calendar.quickAdd.water"
  | "calendar.quickAdd.weight"
  | "calendar.quickAdd.addWater"
  | "calendar.quickAdd.addWeight"
  | "calendar.quickAdd.waterPlaceholder"
  | "calendar.quickAdd.weightPlaceholder"
  | "calendar.quickAdd.savedWater"
  | "calendar.quickAdd.savedWeight"
  | "calendar.quickAdd.saveError";

type Dict = Record<TranslationKey, string>;

export const translations: Record<AppLanguage, Dict> = {
  en: {
    "nav.dashboard": "Dashboard",
    "nav.profile": "Profile",
    "nav.goals": "Goals",
    "nav.statistics": "Statistics",
    "nav.water": "Water",
    "nav.weight": "Weight",
    "nav.calendar": "Calendar",
    "nav.settings": "Settings",
    "sidebar.editProfile": "Edit Profile",
    "sidebar.guest": "Guest",
    "sidebar.user": "User",
    "header.dashboard": "Dashboard",
    "settings.title": "Settings",
    "settings.loading": "Loading settings...",
    "settings.profileTitle": "Profile Information",
    "settings.profileDescription": "Manage your personal details and fitness goals.",
    "settings.guestWarning": "Guest mode: changes won't be saved.",
    "settings.avatarFromProfile": "Avatar can be updated from Edit Profile.",
    "settings.fullName": "Full Name",
    "settings.birthDate": "Birth Date",
    "settings.weight": "Weight (kg)",
    "settings.height": "Height (cm)",
    "settings.fitnessGoal": "Fitness Goal",
    "settings.selectGoal": "Select your goal",
    "settings.goal.buildMuscles": "Build Muscles",
    "settings.goal.loseWeight": "Lose Weight",
    "settings.goal.keepFit": "Keep Fit",
    "settings.goal.improveEndurance": "Improve Endurance",
    "settings.saveChanges": "Save Changes",
    "settings.saving": "Saving...",
    "settings.success": "Settings updated successfully",
    "settings.fail": "Failed to update settings",
    "settings.heightError": "Height must be a positive number.",
    "settings.weightError": "Weight must be a positive number.",
    "settings.preferencesTitle": "App Preferences",
    "settings.preferencesDescription": "Customize language and visual theme.",
    "settings.language": "Language",
    "settings.languageDescription": "Choose the app language.",
    "settings.theme": "Theme",
    "settings.themeDescription": "Choose a light, dark or system theme.",
    "settings.language.en": "English",
    "settings.language.es": "Spanish",
    "settings.theme.light": "Light",
    "settings.theme.dark": "Dark",
    "settings.theme.system": "System",
    "calendar.title": "Activity Calendar",
    "calendar.description": "Track daily water and weight history by month.",
    "calendar.loading": "Loading calendar...",
    "calendar.today": "Today",
    "calendar.prevMonth": "Previous month",
    "calendar.nextMonth": "Next month",
    "calendar.monthStats.activeDays": "Active Days",
    "calendar.monthStats.waterGoalDays": "Water Goal Days",
    "calendar.monthStats.avgWater": "Avg Daily Water",
    "calendar.monthStats.avgWeight": "Avg Weight",
    "calendar.summaryTitle": "Daily Summary",
    "calendar.summaryEmpty": "Select a day to see details.",
    "calendar.summary.weight": "Weight",
    "calendar.summary.water": "Water",
    "calendar.summary.goalReached": "Goal reached",
    "calendar.summary.goalPending": "Goal pending",
    "calendar.summary.noWeight": "No weight registered",
    "calendar.summary.noWater": "No water logged",
    "calendar.summary.logsTitle": "Water logs",
    "calendar.summary.noLogs": "No water logs for this day.",
    "calendar.quickAddTitle": "Quick Add",
    "calendar.quickAdd.water": "Water (ml)",
    "calendar.quickAdd.weight": "Weight (kg)",
    "calendar.quickAdd.addWater": "Add Water",
    "calendar.quickAdd.addWeight": "Save Weight",
    "calendar.quickAdd.waterPlaceholder": "e.g. 250",
    "calendar.quickAdd.weightPlaceholder": "e.g. 70.5",
    "calendar.quickAdd.savedWater": "Water log saved.",
    "calendar.quickAdd.savedWeight": "Weight entry saved.",
    "calendar.quickAdd.saveError": "Could not save entry.",
  },
  es: {
    "nav.dashboard": "Inicio",
    "nav.profile": "Perfil",
    "nav.goals": "Objetivos",
    "nav.statistics": "Estadísticas",
    "nav.water": "Agua",
    "nav.weight": "Peso",
    "nav.calendar": "Calendario",
    "nav.settings": "Ajustes",
    "sidebar.editProfile": "Editar perfil",
    "sidebar.guest": "Invitado",
    "sidebar.user": "Usuario",
    "header.dashboard": "Inicio",
    "settings.title": "Ajustes",
    "settings.loading": "Cargando ajustes...",
    "settings.profileTitle": "Información de perfil",
    "settings.profileDescription": "Administra tus datos personales y objetivos fitness.",
    "settings.guestWarning": "Modo invitado: los cambios no se guardarán.",
    "settings.avatarFromProfile": "El avatar se puede actualizar desde Editar perfil.",
    "settings.fullName": "Nombre completo",
    "settings.birthDate": "Fecha de nacimiento",
    "settings.weight": "Peso (kg)",
    "settings.height": "Altura (cm)",
    "settings.fitnessGoal": "Objetivo fitness",
    "settings.selectGoal": "Selecciona tu objetivo",
    "settings.goal.buildMuscles": "Ganar músculo",
    "settings.goal.loseWeight": "Bajar de peso",
    "settings.goal.keepFit": "Mantenerse en forma",
    "settings.goal.improveEndurance": "Mejorar resistencia",
    "settings.saveChanges": "Guardar cambios",
    "settings.saving": "Guardando...",
    "settings.success": "Ajustes actualizados correctamente",
    "settings.fail": "No se pudieron actualizar los ajustes",
    "settings.heightError": "La altura debe ser un número positivo.",
    "settings.weightError": "El peso debe ser un número positivo.",
    "settings.preferencesTitle": "Preferencias de la app",
    "settings.preferencesDescription": "Personaliza idioma y tema visual.",
    "settings.language": "Idioma",
    "settings.languageDescription": "Elige el idioma de la aplicación.",
    "settings.theme": "Tema",
    "settings.themeDescription": "Elige tema claro, oscuro o del sistema.",
    "settings.language.en": "Inglés",
    "settings.language.es": "Español",
    "settings.theme.light": "Claro",
    "settings.theme.dark": "Oscuro",
    "settings.theme.system": "Sistema",
    "calendar.title": "Calendario de actividad",
    "calendar.description": "Revisa historial diario de agua y peso por mes.",
    "calendar.loading": "Cargando calendario...",
    "calendar.today": "Hoy",
    "calendar.prevMonth": "Mes anterior",
    "calendar.nextMonth": "Mes siguiente",
    "calendar.monthStats.activeDays": "Días activos",
    "calendar.monthStats.waterGoalDays": "Días con meta de agua",
    "calendar.monthStats.avgWater": "Promedio diario de agua",
    "calendar.monthStats.avgWeight": "Peso promedio",
    "calendar.summaryTitle": "Resumen diario",
    "calendar.summaryEmpty": "Selecciona un día para ver detalles.",
    "calendar.summary.weight": "Peso",
    "calendar.summary.water": "Agua",
    "calendar.summary.goalReached": "Meta cumplida",
    "calendar.summary.goalPending": "Meta pendiente",
    "calendar.summary.noWeight": "Sin peso registrado",
    "calendar.summary.noWater": "Sin agua registrada",
    "calendar.summary.logsTitle": "Registros de agua",
    "calendar.summary.noLogs": "No hay registros de agua para este día.",
    "calendar.quickAddTitle": "Registro rápido",
    "calendar.quickAdd.water": "Agua (ml)",
    "calendar.quickAdd.weight": "Peso (kg)",
    "calendar.quickAdd.addWater": "Agregar agua",
    "calendar.quickAdd.addWeight": "Guardar peso",
    "calendar.quickAdd.waterPlaceholder": "ej. 250",
    "calendar.quickAdd.weightPlaceholder": "ej. 70.5",
    "calendar.quickAdd.savedWater": "Registro de agua guardado.",
    "calendar.quickAdd.savedWeight": "Registro de peso guardado.",
    "calendar.quickAdd.saveError": "No se pudo guardar el registro.",
  },
};
