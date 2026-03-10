export type AppLanguage = "en" | "es";

export type TranslationKey =
  | "nav.today"
  | "nav.nutrition"
  | "nav.training"
  | "nav.body"
  | "nav.progress"
  | "nav.calendar"
  | "nav.fitnessProfile"
  | "nav.settings"
  | "nav.dashboard"
  | "nav.profile"
  | "nav.goals"
  | "nav.statistics"
  | "nav.water"
  | "nav.weight"
  | "nav.sleep"
  | "nav.biofeedback"
  | "nav.measurements"
  | "nav.weeklyReview"
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
  | "settings.accentColor"
  | "settings.accentColorDescription"
  | "settings.accentSelected"
  | "settings.accountTitle"
  | "settings.accountDescription"
  | "settings.switchUser"
  | "settings.switchUserGuest"
  | "settings.switchUserHint"
  | "settings.switchUserError"
  | "settings.language.en"
  | "settings.language.es"
  | "settings.theme.light"
  | "settings.theme.dark"
  | "settings.theme.system"
  | "settings.sleepGoal"
  | "settings.sleepGoalHint"
  | "settings.sleepGoalError"
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
  | "calendar.summary.sleep"
  | "calendar.summary.noSleep"
  | "calendar.quickAddTitle"
  | "calendar.quickAdd.water"
  | "calendar.quickAdd.weight"
  | "calendar.quickAdd.addWater"
  | "calendar.quickAdd.addWeight"
  | "calendar.quickAdd.waterPlaceholder"
  | "calendar.quickAdd.weightPlaceholder"
  | "calendar.quickAdd.savedWater"
  | "calendar.quickAdd.savedWeight"
  | "calendar.quickAdd.sleep"
  | "calendar.quickAdd.addSleep"
  | "calendar.quickAdd.sleepPlaceholder"
  | "calendar.quickAdd.savedSleep"
  | "calendar.quickAdd.saveError"
  | "sleep.card.title"
  | "sleep.card.description"
  | "sleep.card.progressLabel"
  | "sleep.card.quickButton"
  | "sleep.page.title"
  | "sleep.page.description"
  | "sleep.page.range.7d"
  | "sleep.page.range.30d"
  | "sleep.page.range.month"
  | "sleep.page.today"
  | "sleep.page.goal"
  | "sleep.page.avg"
  | "sleep.page.daysMet"
  | "sleep.page.logs"
  | "sleep.page.noLogs"
  | "sleep.page.addTitle"
  | "sleep.page.totalHours"
  | "sleep.page.quality"
  | "sleep.page.notes"
  | "sleep.page.advanced"
  | "sleep.page.sleepStart"
  | "sleep.page.sleepEnd"
  | "sleep.page.save"
  | "sleep.page.saved"
  | "sleep.page.saveError"
  | "sleep.error.invalidDuration"
  | "common.cancel"
  | "common.hours"
  | "common.minutes";

type Dict = Record<TranslationKey, string>;

export const translations: Record<AppLanguage, Dict> = {
  en: {
    "nav.today": "Today",
    "nav.training": "Training",
    "nav.body": "Body",
    "nav.progress": "Progress",
    "nav.fitnessProfile": "Fitness Profile",
    "nav.dashboard": "Dashboard",
    "nav.profile": "Profile",
    "nav.goals": "Goals",
    "nav.statistics": "Statistics",
    "nav.water": "Water",
    "nav.weight": "Weight",
    "nav.sleep": "Sleep",
    "nav.nutrition": "Nutrition",
    "nav.biofeedback": "Biofeedback",
    "nav.measurements": "Measurements",
    "nav.weeklyReview": "Weekly Review",
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
    "settings.accentColor": "Main UI Color",
    "settings.accentColorDescription": "Pick one of the 16 Minecraft wool colors for your app accent.",
    "settings.accentSelected": "Selected color",
    "settings.accountTitle": "Account",
    "settings.accountDescription": "Log out and switch to another user account.",
    "settings.switchUser": "Log out and switch user",
    "settings.switchUserGuest": "Sign in with another user",
    "settings.switchUserHint": "You'll be redirected to the login screen.",
    "settings.switchUserError": "Could not change account.",
    "settings.language.en": "English",
    "settings.language.es": "Spanish",
    "settings.theme.light": "Light",
    "settings.theme.dark": "Dark",
    "settings.theme.system": "System",
    "settings.sleepGoal": "Sleep Goal (minutes)",
    "settings.sleepGoalHint": "Recommended: 480 minutes (8 hours).",
    "settings.sleepGoalError": "Sleep goal must be between 1 and 1440 minutes.",
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
    "calendar.summary.sleep": "Sleep",
    "calendar.summary.noSleep": "No sleep logged",
    "calendar.quickAddTitle": "Quick Add",
    "calendar.quickAdd.water": "Water (ml)",
    "calendar.quickAdd.weight": "Weight (kg)",
    "calendar.quickAdd.addWater": "Add Water",
    "calendar.quickAdd.addWeight": "Save Weight",
    "calendar.quickAdd.waterPlaceholder": "e.g. 250",
    "calendar.quickAdd.weightPlaceholder": "e.g. 70.5",
    "calendar.quickAdd.savedWater": "Water log saved.",
    "calendar.quickAdd.savedWeight": "Weight entry saved.",
    "calendar.quickAdd.sleep": "Sleep (minutes)",
    "calendar.quickAdd.addSleep": "Save Sleep",
    "calendar.quickAdd.sleepPlaceholder": "e.g. 480",
    "calendar.quickAdd.savedSleep": "Sleep log saved.",
    "calendar.quickAdd.saveError": "Could not save entry.",
    "sleep.card.title": "Sleep",
    "sleep.card.description": "Sleep today/night vs your goal.",
    "sleep.card.progressLabel": "Goal progress",
    "sleep.card.quickButton": "Log sleep",
    "sleep.page.title": "Sleep",
    "sleep.page.description": "Track daily sleep and quality trends.",
    "sleep.page.range.7d": "Week",
    "sleep.page.range.30d": "30 days",
    "sleep.page.range.month": "This month",
    "sleep.page.today": "Today",
    "sleep.page.goal": "Goal",
    "sleep.page.avg": "Average",
    "sleep.page.daysMet": "Goal reached days",
    "sleep.page.logs": "Sleep logs",
    "sleep.page.noLogs": "No sleep logs for this day.",
    "sleep.page.addTitle": "Log sleep",
    "sleep.page.totalHours": "Hours",
    "sleep.page.quality": "Quality (1-5)",
    "sleep.page.notes": "Notes",
    "sleep.page.advanced": "Advanced fields",
    "sleep.page.sleepStart": "Sleep start",
    "sleep.page.sleepEnd": "Sleep end",
    "sleep.page.save": "Save sleep",
    "sleep.page.saved": "Sleep registered.",
    "sleep.page.saveError": "Could not save sleep.",
    "sleep.error.invalidDuration": "Invalid sleep duration.",
    "common.cancel": "Cancel",
    "common.hours": "Hours",
    "common.minutes": "Minutes",
  },
  es: {
    "nav.today": "Hoy",
    "nav.training": "Entrenamiento",
    "nav.body": "Cuerpo",
    "nav.progress": "Progreso",
    "nav.fitnessProfile": "Perfil Fitness",
    "nav.dashboard": "Inicio",
    "nav.profile": "Perfil",
    "nav.goals": "Objetivos",
    "nav.statistics": "Estadísticas",
    "nav.water": "Agua",
    "nav.weight": "Peso",
    "nav.sleep": "Sueño",
    "nav.nutrition": "Alimentacion",
    "nav.biofeedback": "Biofeedback",
    "nav.measurements": "Medidas",
    "nav.weeklyReview": "Revisión semanal",
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
    "settings.accentColor": "Color principal de la UI",
    "settings.accentColorDescription": "Elige uno de los 16 colores de lana de Minecraft para el acento de la app.",
    "settings.accentSelected": "Color seleccionado",
    "settings.accountTitle": "Cuenta",
    "settings.accountDescription": "Cierra sesión y cambia a otro usuario.",
    "settings.switchUser": "Cerrar sesión y cambiar usuario",
    "settings.switchUserGuest": "Iniciar sesión con otro usuario",
    "settings.switchUserHint": "Serás redirigido a la pantalla de login.",
    "settings.switchUserError": "No se pudo cambiar de cuenta.",
    "settings.theme.system": "Sistema",
    "settings.sleepGoal": "Meta de sueño (minutos)",
    "settings.sleepGoalHint": "Recomendado: 480 minutos (8 horas).",
    "settings.sleepGoalError": "La meta de sueño debe estar entre 1 y 1440 minutos.",
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
    "calendar.summary.sleep": "Sueño",
    "calendar.summary.noSleep": "Sin sueño registrado",
    "calendar.quickAddTitle": "Registro rápido",
    "calendar.quickAdd.water": "Agua (ml)",
    "calendar.quickAdd.weight": "Peso (kg)",
    "calendar.quickAdd.addWater": "Agregar agua",
    "calendar.quickAdd.addWeight": "Guardar peso",
    "calendar.quickAdd.waterPlaceholder": "ej. 250",
    "calendar.quickAdd.weightPlaceholder": "ej. 70.5",
    "calendar.quickAdd.savedWater": "Registro de agua guardado.",
    "calendar.quickAdd.savedWeight": "Registro de peso guardado.",
    "calendar.quickAdd.sleep": "Sueño (minutos)",
    "calendar.quickAdd.addSleep": "Guardar sueño",
    "calendar.quickAdd.sleepPlaceholder": "ej. 480",
    "calendar.quickAdd.savedSleep": "Registro de sueño guardado.",
    "calendar.quickAdd.saveError": "No se pudo guardar el registro.",
    "sleep.card.title": "Sueño",
    "sleep.card.description": "Sueño de hoy/anoche frente a tu meta.",
    "sleep.card.progressLabel": "Progreso de meta",
    "sleep.card.quickButton": "Registrar sueño",
    "sleep.page.title": "Sueño",
    "sleep.page.description": "Sigue tu sueño diario y tendencia de calidad.",
    "sleep.page.range.7d": "Semana",
    "sleep.page.range.30d": "30 días",
    "sleep.page.range.month": "Este mes",
    "sleep.page.today": "Hoy",
    "sleep.page.goal": "Meta",
    "sleep.page.avg": "Promedio",
    "sleep.page.daysMet": "Días con meta cumplida",
    "sleep.page.logs": "Registros de sueño",
    "sleep.page.noLogs": "No hay registros de sueño para este día.",
    "sleep.page.addTitle": "Registrar sueño",
    "sleep.page.totalHours": "Horas",
    "sleep.page.quality": "Calidad (1-5)",
    "sleep.page.notes": "Notas",
    "sleep.page.advanced": "Campos avanzados",
    "sleep.page.sleepStart": "Inicio de sueño",
    "sleep.page.sleepEnd": "Fin de sueño",
    "sleep.page.save": "Guardar sueño",
    "sleep.page.saved": "Sueño registrado.",
    "sleep.page.saveError": "No se pudo registrar el sueño.",
    "sleep.error.invalidDuration": "Duración de sueño inválida.",
    "common.cancel": "Cancelar",
    "common.hours": "Horas",
    "common.minutes": "Minutos",
  },
};
