/**
 * Minimal static i18n module — detects device language once at startup.
 *
 * Rules:
 *  - If navigator.languages / navigator.language starts with "es" → Spanish.
 *  - Otherwise → English (default).
 *
 * Usage:
 *   import { t, lang, locale, fmtDate, fmtNumber, fmtCurrency } from "@/lib/i18n";
 *
 * Language is passed to all generated API hooks that support it:
 *  - POST /api/suggestions       → SuggestionParams.language  (ActivityDialog)
 *  - GET  /api/transit-recommendations → GetTransitRecommendationsParams.language (Itinerary)
 *  - GET  /api/flight-lookup     → FlightLookupParams.language (ActivityDialog)
 */

function detectLanguage(): "en" | "es" {
  try {
    const candidates =
      (navigator.languages as readonly string[] | undefined) ??
      (navigator.language ? [navigator.language] : []);
    for (const tag of candidates) {
      if (tag.toLowerCase().startsWith("es")) return "es";
    }
  } catch {
    // SSR / test environment — fall through to default
  }
  return "en";
}

export type Lang = "en" | "es";

/** Detected device language (stable for the lifetime of the page). */
export const lang: Lang = detectLanguage();

/** BCP-47 locale string suitable for Intl APIs. */
export const locale: string = lang === "es" ? "es-419" : "en-US";

// Set document language attribute immediately
if (typeof document !== "undefined") {
  document.documentElement.lang = locale;
}

// ---------------------------------------------------------------------------
// Translation dictionary
// ---------------------------------------------------------------------------

type Translations = typeof en;

const en = {
  // BottomNav
  nav: {
    myTrips: "My Trips",
    calendar: "Calendar",
    map: "Map",
    discover: "Discover",
    history: "History",
    profile: "Profile",
  },

  // MyTrips page
  myTrips: {
    eyebrow: "JOYPLANN",
    title: "My Trips",
    tripCount_one: "{{count}} trip",
    tripCount_other: "{{count}} trips",
    enRoute: "ON THE ROAD",
    tagline: "Plan. Travel. Enjoy.",
    sectionTitle: "Upcoming experiences",
    emptyTitle: "Your next trip starts here",
    emptyDesc: "Start planning your next adventure!",
    noUpcomingTitle: "No upcoming trips yet",
    noUpcomingDesc: "Your past adventures are safely saved in your travel history.",
    viewHistory: "View travel history",
    emptyAction: "Create trip",
    createTrip: "Create New Trip",
    createTripDesc: "Start planning your next adventure",
    tripName: "Trip Name",
    tripNamePlaceholder: "Summer Vacation",
    tripType: "Trip type",
    singleDest: "Single destination",
    multiDest: "Multi-destination",
    destination: "Destination",
    destinationPlaceholder: "Paris, France",
    startDate: "Start Date",
    endDate: "End Date",
    stops: "Stops",
    stop: "Stop {{num}}",
    addStop: "Add stop",
    cityPlaceholder: "City",
    adults: "Adults",
    children: "Children",
    creating: "Creating...",
    create: "Create Trip",
    shareTrip: "Share Trip",
    deleteTrip: "Delete",
    viewItinerary: "View itinerary",
    share: "Share",
    tripCreated: "Trip created",
    tripCreatedDesc: "Your trip has been added successfully",
    tripDeleted: "Trip deleted",
    tripDeletedDesc: "Your trip has been removed",
    sharedSuccess: "Shared successfully",
    sharedSuccessDesc: "Trip shared with your contacts",
    linkCopied: "Link copied",
    linkCopiedDesc: "Share this link with friends and family",
    shareNativeText: "Join me on my trip to {{destination}}!",
    errorCreate: "Failed to create trip",
    errorDelete: "Failed to delete trip",
    error: "Error",
    // Form validation
    nameRequired: "Name is required",
    destinationRequired: "Required",
    startDateRequired: "Required",
    endDateRequired: "Required",
    endDateAfterStart: "End date must be after start date",
    atLeastTwoStops: "At least two stops required",
    stopEndAfterStart: "End date after start date",
    stopOverlap: "A stop may start on the previous stop's checkout date",
    formatDate: "Format: YYYY-MM-DD",
  },
  dateTime: {
    selectDate: "Select date",
    clearDate: "Clear date",
    hour: "Hour",
    minute: "Minute",
    period: "AM/PM",
    clearTime: "Clear time",
  },
  auth: {
    landingDescription: "Bring every destination, reservation, and memorable moment together in one beautifully organized itinerary.",
    signIn: "Sign in",
    createAccount: "Create account",
  },
  history: {
    eyebrow: "PAST ADVENTURES",
    title: "Travel History",
    tagline: "Every journey is worth remembering.",
    sectionTitle: "Completed trips",
    completed: "Completed",
    emptyTitle: "No travel history yet",
    emptyDesc: "Trips will appear here once their end date has passed.",
  },

  // Itinerary page
  itinerary: {
    tripNotFound: "Trip not found",
    invalidId: "Invalid trip ID",
    tripDoesNotExist: "This trip does not exist",
    trackingTitle: "Lock Screen Tracking",
    trackingActive: "Active even when screen is locked",
    trackingInactive: "Enable to track when locked",
    trackingStart: "Start",
    trackingStop: "Stop",
    trackingEnabled: "Tracking enabled",
    trackingEnabledDesc: "Your itinerary will be tracked even when screen is locked",
    trackingStopped: "Tracking stopped",
    trackingStoppedDesc: "Background tracking has been disabled",
    aiSuggestions: "Get AI Suggestions",
    noActivities: "No activities yet",
    noActivitiesDesc: "Add activities to your itinerary to get started",
    addActivity: "Add Activity",
    noActivitiesFilter: "No activities match filters",
    noActivitiesFilterDesc: "Try adjusting your filters or add new activities",
    clearFilters: "Clear Filters",
    deleteConfirm: "Are you sure you want to delete this activity?",
    activityDeleted: "Activity deleted",
    activityDeletedDesc: "The activity has been removed from your itinerary",
    alarmSet: "Alarm set",
    alarmSetDesc: "You'll be notified before {{title}}",
    alarmCancelled: "Alarm cancelled",
    alarmCancelledDesc: "Alarm removed for {{title}}",
    errorDelete: "Failed to delete activity",
    error: "Error",
    // Transit section
    betweenCities: "BETWEEN CITIES",
    howToMove: "How to get around",
    updating: "Updating…",
    transitError: "Could not prepare options",
    transitErrorDesc: "Try again to see transport recommendations.",
    retry: "Retry",
    transferDate: "Transfer on",
    recommendation: "Recommendation:",
    recommended: "Recommended",
    estimated: "Estimated",
    scheduledChecked: "Schedule verified",
    chosen: "Chosen",
    costFrom: "From {{cost}}",
    source: "Source",
    estimated_tag: "· estimated",
  },

  // ActivityDialog
  activityDialog: {
    addActivity: "Add Activity",
    editActivity: "Edit Activity",
    addBooking: "Add Booking",
    editBooking: "Edit Booking",
    addDesc: "Add a new item to your itinerary",
    editDesc: "Update the details below",
    activityType: "Activity type",
    selectActivity: "Select activity type",
    recordType: "Record type",
    activity: "Activity",
    booking: "Booking",
    date: "Date",
    dateWithAsterisk: "Date *",
    day: "Day",
    dayPlaceholder: "Monday",
    flightNumber: "Flight number",
    distance: "Distance",
    distancePlaceholder: "2.5 km",
    description: "Description",
    budget: "Budget",
    selectBudget: "Select budget",
    budgetLow: "Low",
    budgetMedium: "Medium",
    budgetHigh: "High",
    kidFriendly: "Kid Friendly",
    hotelCheckinLabel: "Check-in time",
    confirmationNumber: "Confirmation Number",
    confirmationPlaceholder: "ABC123456",
    details: "Details",
    detailsPlaceholder: "Booking details...",
    status: "Status",
    selectStatus: "Select status",
    statusConfirmed: "Confirmed",
    statusPending: "Pending",
    reminder: "Reminder",
    reminderOn: "Get notified before this activity",
    reminderOff: "Reminder disabled",
    saving: "Saving...",
    updateActivity: "Update Activity",
    add: "Add Activity",
    added: "Activity added",
    addedWithReminder: "Your activity has been added with reminder notifications",
    addedNoReminder: "Your activity has been added to the itinerary",
    updated: "Activity updated",
    updatedDesc: "Your changes have been saved",
    errorAdd: "Failed to add activity",
    errorUpdate: "Failed to update activity",
    error: "Error",
    flightMissingNumber: "Missing flight number",
    flightMissingNumberDesc: "Enter a flight number before searching.",
    flightMissingDate: "Enter the flight date",
    flightMissingDateDesc: "The date helps find the correct schedule.",
    flightLoaded: "Flight details loaded",
    flightLoadedDesc: "Successfully loaded details for {{flightNumber}}",
    flightTitle: "{{airline}} Flight {{flightNumber}}",
    flightStatus: "Status",
    flightDepartureTerminal: "Departure terminal",
    flightDepartureGate: "Departure gate",
    flightArrivalTerminal: "Arrival terminal",
    flightArrivalGate: "Arrival gate",
    flightArrivalTime: "Arrival time",
    flightLookupFailed: "Lookup failed",
    flightLookupFailedDesc: "Could not find flight details",
    lookingUp: "Searching...",
    autofill: "Autofill",
    aiIdeas: "AI Ideas",
    aiDesc: "Uses city, category, {{adults}} adult(s) and {{children}} child(ren).",
    aiSuggest: "Suggest",
    aiThinking: "Thinking...",
    aiTapToApply: "Tap a suggestion to apply it. Verify schedules and availability.",
    aiError: "Could not generate suggestions",
    aiErrorDesc: "Please try again in a moment.",
    selectCategoryError: "Select your activity",
    selectCategoryForSuggestions: "Select activity type to get suggestions",
    selectDateForSuggestions: "Select a valid date to get suggestions",
    addCityForSuggestions: "Add a city to get suggestions",
    cityLabel: "City",
    cityPlaceholder: "Activity city",
    cityHint: "We suggest the stop for this date; you can choose another city.",
    locationHint: "You can reuse a place from this trip or enter a new one.",
    todayStop: "Today's stop",
    onItinerary: "On your itinerary",
    worldCatalog: "World catalog",
    usedInTrip: "Used in this trip",
    useManualCity: 'Use "{{value}}" as city',
    useManualPlace: 'Use "{{value}}" as place',
    hotel: "hotel",
    hotelCountQuestion: "Will you stay at one hotel for the whole trip or two hotels?",
    oneHotel: "One hotel",
    twoHotels: "Two hotels",
    hotelCoverageHint: "Hotel stays must cover the whole trip. For two hotels, checkout and check-in share the same date.",
    hotelStay: "Hotel stay {{number}}",
    hotelName: "Hotel name",
    hotelNamePlaceholder: "Search for a hotel",
    hotelAddress: "Address",
    hotelAddressPlaceholder: "Hotel street address",
    checkIn: "Check-in",
    checkOut: "Check-out",
    hotelManualFallback: "Hotel search is unavailable. Enter the name, address, and city manually.",
    hotelValidation: "Check hotel details",
    hotelFieldsError: "Complete the name, address, city, and valid dates for each hotel.",
    hotelCoverageError: "Hotel stays must cover the full trip and meet on the same boundary date.",
    hotelsAdded: "Hotel stay added",
    hotelsAddedDesc: "Your hotel stay details were added to the itinerary.",
    hotelErrorAdd: "Failed to add hotel stays",
    addHotelStays: "Add hotel stay",
  },

  // TripHeader
  tripHeader: {
    adult_one: "{{count}} adult",
    adult_other: "{{count}} adults",
    child_one: ", {{count}} child",
    child_other: ", {{count}} children",
  },

  // ActivityCard
  activityCard: {
    kidFriendly: "Kid-friendly",
    alarmSet: "Alarm set",
    setAlarm: "Set alarm",
  },

  // BookingCard — status labels
  bookingCard: {
    confirmed: "Confirmed",
    pending: "Pending",
    completed: "Completed",
  },

  // DaySection
  daySection: {
    addActivity: "Add Activity",
  },

  // FilterChips
  filterChips: {
    clear: "Clear",
  },

  // SuggestionCard
  suggestionCard: {
    addToItinerary: "Add to Itinerary",
    kidFriendly: "Kid-friendly",
  },

  // SuggestionInput
  suggestionInput: {
    searchingCities: "Searching cities…",
    useManual: 'Use "{{value}}" as {{label}}',
  },

  // DestinationInput
  destinationInput: {
    searchingCities: "Searching cities…",
    useManual: 'Use "{{value}}" as destination',
  },

  // NotificationSettings
  notificationSettings: {
    title: "Activity Notifications",
    iosPush: "iOS Push Notifications",
    pushEnabled: "Push notifications are enabled. You'll receive alerts even when the app is closed.",
    pushDisabled: "Enable push notifications to get reminders even when the app is closed.",
    enablePush: "Enable Push Notifications",
    active: "Active",
    chooseReminders: "Choose when you want to be reminded about your activities",
    reminderTimes: "Reminder Times",
    notificationTypes: "Notification Types",
    flightsTrains: "Flights & Trains",
    hotelCheckin: "Hotel Check-in/out",
    activitiesTours: "Activities & Tours",
    restaurantRes: "Restaurant Reservations",
    fitnessWellness: "Fitness & Wellness",
    save: "Save Notification Settings",
    disabled: "Notifications are disabled",
    timing15min: "15 minutes before",
    timing30min: "30 minutes before",
    timing1hour: "1 hour before",
    timing2hours: "2 hours before",
    timing1day: "1 day before",
  },
  notificationPrompt: {
    title: "Stay on top of your plans",
    description: "Enable notifications so JoyPlann can alert you about activities, flights, hotels, and other important trip updates.",
    enable: "Enable notifications",
    enabling: "Enabling...",
    later: "Not now",
    close: "Dismiss notification prompt",
  },

  // Calendar page
  calendar: {
    title: "Calendar View",
    subtitle: "All your activities synced to calendar",
    syncIOS: "Sync to iOS Calendar",
    notifications: "Notifications",
    exportIcs: "Export .ics",
    previousMonth: "Previous month",
    nextMonth: "Next month",
    sampleFlight: "Flight to Paris",
    sampleHotelCheckin: "Hotel check-in",
    sampleMorningYoga: "Morning yoga",
    eventDescription: "JoyPlann activity: {{category}}",
    weekdaySun: "Sun",
    weekdayMon: "Mon",
    weekdayTue: "Tue",
    weekdayWed: "Wed",
    weekdayThu: "Thu",
    weekdayFri: "Fri",
    weekdaySat: "Sat",
    upcomingActivities: "Upcoming Activities",
    syncInfo: "Calendar Sync",
    syncInfoDesc:
      "Export your itinerary to your favorite calendar app. All activities, flights, and reservations will be synced with reminders.",
    permissionRequired: "Permission required",
    permissionDesc: "Please grant calendar access to sync your itinerary",
    synced: "Synced to iOS Calendar",
    syncedDesc: "{{count}} activities added to your iPhone Calendar",
    syncFailed: "Sync failed",
    syncFailedDesc: "Unable to sync to iOS Calendar. Please try again.",
    exported: "Calendar exported",
    exportedDesc: "Download the .ics file to import into any calendar app",
  },

  // Discover page
  discover: {
    title: "Discover",
    subtitleAi: "Recommendations from TripAdvisor, Yelp, Google, The Fork & Michelin Guide",
    subtitleDefault: "Discover top-rated activities from trusted travel sources",
    searchPlaceholder: "Enter destination (e.g., Paris, Tokyo, NYC)...",
    searching: "Searching...",
    search: "Search",
    budget: "Budget:",
    allBudgets: "All Budgets",
    budgetFriendly: "$ Budget-friendly",
    moderate: "$$ Moderate",
    premium: "$$$ Premium",
    familyFriendly: "Family-friendly",
    adults: "Adults: {{count}}",
    children: "Children: {{count}}",
    noSuggestions: "No suggestions match your search",
    selectBudget: "Select a budget",
    selectBudgetDesc: "Choose a budget filter to get AI-powered suggestions",
    enterDestination: "Enter a destination",
    enterDestinationDesc: "Search for a city or destination to discover activities",
    aiComplete: "AI Discovery Complete",
    aiCompleteDesc: "Found {{count}} top-rated recommendations from TripAdvisor, Yelp, Michelin Guide & more",
    errorSuggestions: "Failed to generate AI suggestions. Showing default suggestions.",
    error: "Error",
    sampleVersaillesTitle: "Versailles Palace & Gardens",
    sampleVersaillesDesc: "Explore the royal palace, its gardens, and the Hall of Mirrors. A strong choice for history enthusiasts.",
    sampleDisneyDesc: "A magical theme park with rides, shows, and character encounters for the whole family.",
    sampleRunTitle: "Morning Run at Bois de Boulogne",
    sampleRunDesc: "A scenic running route through one of Paris's largest parks, with lakes, gardens, and trails.",
    sampleOperaTitle: "Palais Garnier Performance",
    sampleOperaDesc: "Attend an opera or ballet performance in this remarkable 19th-century opera house.",
    sampleJazzTitle: "Jazz at Caveau de la Huchette",
    sampleJazzDesc: "A historic jazz club in a medieval cellar with live music in the Latin Quarter.",
    sampleCookingTitle: "French Pastry Class",
    sampleCookingDesc: "Learn to make croissants and macarons with a professional French chef.",
    duration4to5Hours: "4–5 hours",
    durationFullDay: "Full day",
    duration1to2Hours: "1–2 hours",
    duration3to4Hours: "3–4 hours",
    duration2to3Hours: "2–3 hours",
    duration3Hours: "3 hours",
  },

  // MapView page
  mapView: {
    locations: "Locations ({{count}})",
    totalDistance: "Total distance: {{dist}}",
    tapForDirections: "Tap for directions",
    layers: "Map layers",
    center: "Center map",
    fullscreen: "Fullscreen",
    close: "Close",
  },

  // Share page
  share: {
    title: "Share Your Trip",
    subtitle: "Share your itinerary, map, or activities on social media",
    whatToShare: "What to share",
    fullItinerary: "Full Itinerary",
    mapView: "Map View",
    activityCard: "Activity Card",
    caption: "Caption",
    captionPlaceholder: "Write a caption...",
    shareTo: "Share to",
    shareNow: "Share Now",
    defaultCaption: "Just planned my dream European adventure! #JoyPlann #Travel",
    previewAlt: "Trip preview",
    sampleTitle: "European Adventure",
    download: "Download",
  },

  // Profile page
  profile: {
    premium: "Premium Member",
    trips: "Trips",
    countries: "Countries",
    activities: "Activities",
    myTrips: "My Trips",
    settings: "Settings",
    notifications: "Notifications",
    darkMode: "Appearance",
    themeSystem: "System",
    themeLight: "Light",
    themeDark: "Dark",
    on: "On",
    off: "Off",
    language: "Language",
    languageCurrent: "English",
    subscription: "Subscription",
    accountSettings: "Account Settings",
    logout: "Log Out",
    upcoming: "upcoming",
    past: "past",
    sampleEuropeanAdventure: "European Adventure",
    sampleSummerBali: "Summer in Bali",
  },

  // Not Found page
  // reminders.ts — browser notification strings
  reminders: {
    title: "Reminder: {{activityTitle}}",
    bodyBase: "Starting in {{timeLabel}}",
    bodyAt: " at {{location}}",
    bodyTime: " ({{time}})",
    timing15min: "15 minutes",
    timing30min: "30 minutes",
    timing1hour: "1 hour",
    timing2hours: "2 hours",
    timing1day: "1 day",
    logScheduled: "Reminder scheduled for \"{{title}}\" at {{at}} ({{label}} before)",
    logAllCancelled: "All reminders cancelled",
  },

  notFound: {
    title: "404 Page Not Found",
    desc: "Did you forget to add the page to the router?",
  },

  // Category labels (kept in sync with CategoryIcon.tsx)
  categories: {
    flight: "Flight",
    hotel: "Hotel",
    restaurant: "Restaurants",
    bar: "Bar/Cocktail bar",
    train: "Train",
    tour: "Tour",
    fitness: "Sport",
    cultural: "Experience",
    nightlife: "Nightlife",
    kids: "For kids",
    transfer: "Transfer",
    transportation: "Transport",
    general: "Other",
  },
};

const es: Translations = {
  nav: {
    myTrips: "Mis viajes",
    calendar: "Calendario",
    map: "Mapa",
    discover: "Descubrir",
    history: "Historial",
    profile: "Perfil",
  },

  myTrips: {
    eyebrow: "JOYPLANN",
    title: "Mis viajes",
    tripCount_one: "{{count}} viaje",
    tripCount_other: "{{count}} viajes",
    enRoute: "EN RUTA",
    tagline: "Plan. Travel. Enjoy.",
    sectionTitle: "Próximas experiencias",
    emptyTitle: "Tu próximo viaje empieza aquí",
    emptyDesc: "¡Empieza a planificar tu próxima aventura!",
    noUpcomingTitle: "Aún no tienes próximos viajes",
    noUpcomingDesc: "Tus aventuras pasadas se guardan de forma segura en tu historial de viajes.",
    viewHistory: "Ver historial de viajes",
    emptyAction: "Crear viaje",
    createTrip: "Crear nuevo viaje",
    createTripDesc: "Empieza a planificar tu próxima aventura",
    tripName: "Nombre del viaje",
    tripNamePlaceholder: "Vacaciones de verano",
    tripType: "Tipo de viaje",
    singleDest: "Un destino",
    multiDest: "Multidestino",
    destination: "Destino",
    destinationPlaceholder: "París, Francia",
    startDate: "Fecha de inicio",
    endDate: "Fecha de fin",
    stops: "Destinos",
    stop: "Parada {{num}}",
    addStop: "Agregar parada",
    cityPlaceholder: "Ciudad",
    adults: "Adultos",
    children: "Niños",
    creating: "Creando...",
    create: "Crear viaje",
    shareTrip: "Compartir viaje",
    deleteTrip: "Eliminar",
    viewItinerary: "Ver itinerario",
    share: "Compartir",
    tripCreated: "Viaje creado",
    tripCreatedDesc: "Tu viaje se ha añadido correctamente",
    tripDeleted: "Viaje eliminado",
    tripDeletedDesc: "Tu viaje ha sido eliminado",
    sharedSuccess: "Compartido con éxito",
    sharedSuccessDesc: "Viaje compartido con tus contactos",
    linkCopied: "Enlace copiado",
    linkCopiedDesc: "Comparte este enlace con amigos y familia",
    shareNativeText: "¡Únete a mí en mi viaje a {{destination}}!",
    errorCreate: "No se pudo crear el viaje",
    errorDelete: "No se pudo eliminar el viaje",
    error: "Error",
    nameRequired: "El nombre es obligatorio",
    destinationRequired: "Requerido",
    startDateRequired: "Requerido",
    endDateRequired: "Requerido",
    endDateAfterStart: "La fecha de fin debe ser posterior a la de inicio",
    atLeastTwoStops: "Se requieren al menos dos paradas",
    stopEndAfterStart: "La fecha de fin debe ser posterior a la de inicio",
    stopOverlap: "Una parada puede comenzar en la fecha de salida de la anterior",
    formatDate: "Formato: YYYY-MM-DD",
  },
  dateTime: {
    selectDate: "Seleccionar fecha",
    clearDate: "Borrar fecha",
    hour: "Hora",
    minute: "Minuto",
    period: "AM/PM",
    clearTime: "Borrar hora",
  },
  auth: {
    landingDescription: "Reúne cada destino, reserva y momento memorable en un itinerario organizado de forma sencilla.",
    signIn: "Iniciar sesión",
    createAccount: "Crear cuenta",
  },
  history: {
    eyebrow: "AVENTURAS PASADAS",
    title: "Historial de viajes",
    tagline: "Cada viaje merece ser recordado.",
    sectionTitle: "Viajes finalizados",
    completed: "Finalizado",
    emptyTitle: "Aún no tienes historial de viajes",
    emptyDesc: "Los viajes aparecerán aquí cuando haya pasado su fecha de fin.",
  },

  itinerary: {
    tripNotFound: "Viaje no encontrado",
    invalidId: "ID de viaje inválido",
    tripDoesNotExist: "Este viaje no existe",
    trackingTitle: "Seguimiento en pantalla bloqueada",
    trackingActive: "Activo aunque la pantalla esté bloqueada",
    trackingInactive: "Activar para seguir con pantalla bloqueada",
    trackingStart: "Activar",
    trackingStop: "Detener",
    trackingEnabled: "Seguimiento activado",
    trackingEnabledDesc: "Tu itinerario se seguirá aunque la pantalla esté bloqueada",
    trackingStopped: "Seguimiento detenido",
    trackingStoppedDesc: "El seguimiento en segundo plano se ha desactivado",
    aiSuggestions: "Sugerencias con IA",
    noActivities: "Sin actividades aún",
    noActivitiesDesc: "Añade actividades a tu itinerario para empezar",
    addActivity: "Añadir actividad",
    noActivitiesFilter: "Ninguna actividad coincide con los filtros",
    noActivitiesFilterDesc: "Prueba a ajustar los filtros o añade nuevas actividades",
    clearFilters: "Limpiar filtros",
    deleteConfirm: "¿Seguro que quieres eliminar esta actividad?",
    activityDeleted: "Actividad eliminada",
    activityDeletedDesc: "La actividad ha sido eliminada de tu itinerario",
    alarmSet: "Alarma configurada",
    alarmSetDesc: "Se te notificará antes de {{title}}",
    alarmCancelled: "Alarma cancelada",
    alarmCancelledDesc: "Alarma eliminada para {{title}}",
    errorDelete: "No se pudo eliminar la actividad",
    error: "Error",
    betweenCities: "ENTRE CIUDADES",
    howToMove: "Cómo moverse",
    updating: "Actualizando…",
    transitError: "No pudimos preparar las opciones",
    transitErrorDesc: "Vuelve a intentarlo para ver recomendaciones de transporte.",
    retry: "Reintentar",
    transferDate: "Traslado el",
    recommendation: "Recomendación:",
    recommended: "Recomendado",
    estimated: "Estimado",
    scheduledChecked: "Horario consultado",
    chosen: "Elegido",
    costFrom: "Desde {{cost}}",
    source: "Fuente",
    estimated_tag: "· estimado",
  },

  activityDialog: {
    addActivity: "Añadir actividad",
    editActivity: "Editar actividad",
    addBooking: "Añadir reserva",
    editBooking: "Editar reserva",
    addDesc: "Añade un nuevo elemento a tu itinerario",
    editDesc: "Actualiza los detalles a continuación",
    activityType: "Tipo de actividad",
    selectActivity: "Selecciona tu actividad",
    recordType: "Tipo de registro",
    activity: "Actividad",
    booking: "Reserva",
    date: "Fecha",
    dateWithAsterisk: "Fecha *",
    day: "Día",
    dayPlaceholder: "Lunes",
    flightNumber: "Número de vuelo",
    distance: "Distancia",
    distancePlaceholder: "2,5 km",
    description: "Descripción",
    budget: "Presupuesto",
    selectBudget: "Selecciona presupuesto",
    budgetLow: "Bajo",
    budgetMedium: "Medio",
    budgetHigh: "Alto",
    kidFriendly: "Apto para niños",
    hotelCheckinLabel: "Hora de check-in",
    confirmationNumber: "Número de confirmación",
    confirmationPlaceholder: "ABC123456",
    details: "Detalles",
    detailsPlaceholder: "Detalles de la reserva...",
    status: "Estado",
    selectStatus: "Selecciona estado",
    statusConfirmed: "Confirmado",
    statusPending: "Pendiente",
    reminder: "Recordatorio",
    reminderOn: "Recibe una notificación antes de esta actividad",
    reminderOff: "Recordatorio desactivado",
    saving: "Guardando...",
    updateActivity: "Actualizar actividad",
    add: "Añadir actividad",
    added: "Actividad añadida",
    addedWithReminder: "Tu actividad se ha añadido con notificaciones de recordatorio",
    addedNoReminder: "Tu actividad se ha añadido al itinerario",
    updated: "Actividad actualizada",
    updatedDesc: "Tus cambios han sido guardados",
    errorAdd: "No se pudo añadir la actividad",
    errorUpdate: "No se pudo actualizar la actividad",
    error: "Error",
    flightMissingNumber: "Falta el número de vuelo",
    flightMissingNumberDesc: "Escribe un número de vuelo antes de buscar.",
    flightMissingDate: "Indica la fecha del vuelo",
    flightMissingDateDesc: "La fecha ayuda a encontrar el horario correcto.",
    flightLoaded: "Datos del vuelo cargados",
    flightLoadedDesc: "Datos cargados correctamente para {{flightNumber}}",
    flightTitle: "{{airline}} Vuelo {{flightNumber}}",
    flightStatus: "Estado",
    flightDepartureTerminal: "Terminal de salida",
    flightDepartureGate: "Puerta de salida",
    flightArrivalTerminal: "Terminal de llegada",
    flightArrivalGate: "Puerta de llegada",
    flightArrivalTime: "Hora de llegada",
    flightLookupFailed: "Búsqueda fallida",
    flightLookupFailedDesc: "No se encontraron los datos del vuelo",
    lookingUp: "Buscando...",
    autofill: "Autocompletar",
    aiIdeas: "Ideas con IA",
    aiDesc: "Usa ciudad, categoría, {{adults}} adulto(s) y {{children}} niño(s).",
    aiSuggest: "Sugerir",
    aiThinking: "Pensando...",
    aiTapToApply: "Toca una propuesta para aplicarla. Verifica horarios y disponibilidad.",
    aiError: "No pudimos generar sugerencias",
    aiErrorDesc: "Intenta nuevamente en unos momentos.",
    selectCategoryError: "Selecciona tu actividad",
    selectCategoryForSuggestions: "Selecciona tu actividad para recibir sugerencias",
    selectDateForSuggestions: "Selecciona una fecha válida para recibir sugerencias",
    addCityForSuggestions: "Agrega una ciudad para recibir sugerencias",
    cityLabel: "Ciudad",
    cityPlaceholder: "Ciudad de la actividad",
    cityHint: "Te proponemos la parada correspondiente a la fecha; puedes elegir otra ciudad.",
    locationHint: "Puedes reutilizar un lugar de este viaje o escribir uno nuevo.",
    todayStop: "Parada de este día",
    onItinerary: "En tu itinerario",
    worldCatalog: "Catálogo mundial",
    usedInTrip: "Usado en este viaje",
    useManualCity: 'Usar "{{value}}" como ciudad',
    useManualPlace: 'Usar "{{value}}" como lugar',
    hotel: "hotel",
    hotelCountQuestion: "¿Te alojarás en un hotel durante todo el viaje o en dos hoteles?",
    oneHotel: "Un hotel",
    twoHotels: "Dos hoteles",
    hotelCoverageHint: "Las estancias deben cubrir todo el viaje. Para dos hoteles, la salida y la entrada comparten la misma fecha.",
    hotelStay: "Estancia {{number}}",
    hotelName: "Nombre del hotel",
    hotelNamePlaceholder: "Busca un hotel",
    hotelAddress: "Dirección",
    hotelAddressPlaceholder: "Dirección del hotel",
    checkIn: "Entrada",
    checkOut: "Salida",
    hotelManualFallback: "La búsqueda de hoteles no está disponible. Introduce manualmente el nombre, la dirección y la ciudad.",
    hotelValidation: "Revisa los datos del hotel",
    hotelFieldsError: "Completa el nombre, la dirección, la ciudad y las fechas válidas de cada hotel.",
    hotelCoverageError: "Las estancias deben cubrir todo el viaje y coincidir en la misma fecha de cambio.",
    hotelsAdded: "Estancia añadida",
    hotelsAddedDesc: "Los datos de tu estancia se añadieron al itinerario.",
    hotelErrorAdd: "No se pudieron añadir las estancias",
    addHotelStays: "Añadir estancia",
  },

  tripHeader: {
    adult_one: "{{count}} adulto",
    adult_other: "{{count}} adultos",
    child_one: ", {{count}} niño",
    child_other: ", {{count}} niños",
  },

  activityCard: {
    kidFriendly: "Apto para niños",
    alarmSet: "Alarma activa",
    setAlarm: "Configurar alarma",
  },

  bookingCard: {
    confirmed: "Confirmado",
    pending: "Pendiente",
    completed: "Completado",
  },

  daySection: {
    addActivity: "Añadir actividad",
  },

  filterChips: {
    clear: "Limpiar",
  },

  suggestionCard: {
    addToItinerary: "Añadir al itinerario",
    kidFriendly: "Apto para niños",
  },

  suggestionInput: {
    searchingCities: "Buscando ciudades…",
    useManual: 'Usar "{{value}}" como {{label}}',
  },

  destinationInput: {
    searchingCities: "Buscando ciudades…",
    useManual: 'Usar "{{value}}" como destino',
  },

  notificationSettings: {
    title: "Notificaciones de actividades",
    iosPush: "Notificaciones push de iOS",
    pushEnabled: "Las notificaciones push están activadas. Recibirás alertas aunque la app esté cerrada.",
    pushDisabled: "Activa las notificaciones push para recibir recordatorios aunque la app esté cerrada.",
    enablePush: "Activar notificaciones push",
    active: "Activo",
    chooseReminders: "Elige cuándo quieres que se te recuerde tus actividades",
    reminderTimes: "Horarios de recordatorio",
    notificationTypes: "Tipos de notificación",
    flightsTrains: "Vuelos y trenes",
    hotelCheckin: "Check-in/out del hotel",
    activitiesTours: "Actividades y tours",
    restaurantRes: "Reservas en restaurantes",
    fitnessWellness: "Deporte y bienestar",
    save: "Guardar ajustes de notificación",
    disabled: "Las notificaciones están desactivadas",
    timing15min: "15 minutos antes",
    timing30min: "30 minutos antes",
    timing1hour: "1 hora antes",
    timing2hours: "2 horas antes",
    timing1day: "1 día antes",
  },
  notificationPrompt: {
    title: "Mantente al tanto de tus planes",
    description: "Activa las notificaciones para que JoyPlann pueda avisarte sobre actividades, vuelos, hoteles y otras novedades importantes del viaje.",
    enable: "Activar notificaciones",
    enabling: "Activando...",
    later: "Ahora no",
    close: "Cerrar solicitud de notificaciones",
  },

  calendar: {
    title: "Vista de calendario",
    subtitle: "Todas tus actividades sincronizadas al calendario",
    syncIOS: "Sincronizar con iOS",
    notifications: "Notificaciones",
    exportIcs: "Exportar .ics",
    previousMonth: "Mes anterior",
    nextMonth: "Mes siguiente",
    sampleFlight: "Vuelo a París",
    sampleHotelCheckin: "Check-in en el hotel",
    sampleMorningYoga: "Yoga matutino",
    eventDescription: "Actividad de JoyPlann: {{category}}",
    weekdaySun: "Dom",
    weekdayMon: "Lun",
    weekdayTue: "Mar",
    weekdayWed: "Mié",
    weekdayThu: "Jue",
    weekdayFri: "Vie",
    weekdaySat: "Sáb",
    upcomingActivities: "Próximas actividades",
    syncInfo: "Sincronización de calendario",
    syncInfoDesc:
      "Exporta tu itinerario a tu app de calendario favorita. Todas las actividades, vuelos y reservas se sincronizarán con recordatorios.",
    permissionRequired: "Permiso requerido",
    permissionDesc: "Concede acceso al calendario para sincronizar tu itinerario",
    synced: "Sincronizado con iOS",
    syncedDesc: "{{count}} actividades añadidas a tu Calendario de iPhone",
    syncFailed: "Error al sincronizar",
    syncFailedDesc: "No se pudo sincronizar con iOS. Inténtalo de nuevo.",
    exported: "Calendario exportado",
    exportedDesc: "Descarga el archivo .ics para importarlo en cualquier app de calendario",
  },

  discover: {
    title: "Descubrir",
    subtitleAi: "Recomendaciones de TripAdvisor, Yelp, Google, The Fork y Guía Michelin",
    subtitleDefault: "Descubre actividades mejor valoradas de fuentes de viaje de confianza",
    searchPlaceholder: "Introduce destino (p.ej., París, Tokio, NYC)...",
    searching: "Buscando...",
    search: "Buscar",
    budget: "Presupuesto:",
    allBudgets: "Todos",
    budgetFriendly: "$ Económico",
    moderate: "$$ Moderado",
    premium: "$$$ Premium",
    familyFriendly: "Apto para familias",
    adults: "Adultos: {{count}}",
    children: "Niños: {{count}}",
    noSuggestions: "Ninguna sugerencia coincide con tu búsqueda",
    selectBudget: "Selecciona un presupuesto",
    selectBudgetDesc: "Elige un filtro de presupuesto para obtener sugerencias con IA",
    enterDestination: "Introduce un destino",
    enterDestinationDesc: "Busca una ciudad o destino para descubrir actividades",
    aiComplete: "Descubrimiento con IA completado",
    aiCompleteDesc:
      "Se encontraron {{count}} recomendaciones mejor valoradas de TripAdvisor, Yelp, Guía Michelin y más",
    errorSuggestions: "No se pudieron generar sugerencias con IA. Mostrando sugerencias por defecto.",
    error: "Error",
    sampleVersaillesTitle: "Palacio y jardines de Versalles",
    sampleVersaillesDesc: "Explora el palacio real, sus jardines y la Galería de los Espejos. Una gran opción para quienes disfrutan la historia.",
    sampleDisneyDesc: "Un parque temático mágico con atracciones, espectáculos y encuentros con personajes para toda la familia.",
    sampleRunTitle: "Carrera matutina en Bois de Boulogne",
    sampleRunDesc: "Una ruta escénica por uno de los parques más grandes de París, con lagos, jardines y senderos.",
    sampleOperaTitle: "Función en el Palacio Garnier",
    sampleOperaDesc: "Asiste a una función de ópera o ballet en este notable teatro del siglo XIX.",
    sampleJazzTitle: "Jazz en Caveau de la Huchette",
    sampleJazzDesc: "Un histórico club de jazz en un sótano medieval, con música en vivo en el Barrio Latino.",
    sampleCookingTitle: "Clase de repostería francesa",
    sampleCookingDesc: "Aprende a preparar croissants y macarons con un chef francés profesional.",
    duration4to5Hours: "4–5 horas",
    durationFullDay: "Día completo",
    duration1to2Hours: "1–2 horas",
    duration3to4Hours: "3–4 horas",
    duration2to3Hours: "2–3 horas",
    duration3Hours: "3 horas",
  },

  mapView: {
    locations: "Ubicaciones ({{count}})",
    totalDistance: "Distancia total: {{dist}}",
    tapForDirections: "Toca para ver cómo llegar",
    layers: "Capas del mapa",
    center: "Centrar mapa",
    fullscreen: "Pantalla completa",
    close: "Cerrar",
  },

  share: {
    title: "Compartir tu viaje",
    subtitle: "Comparte tu itinerario, mapa o actividades en redes sociales",
    whatToShare: "Qué compartir",
    fullItinerary: "Itinerario completo",
    mapView: "Vista de mapa",
    activityCard: "Tarjeta de actividad",
    caption: "Descripción",
    captionPlaceholder: "Escribe una descripción...",
    shareTo: "Compartir en",
    shareNow: "Compartir ahora",
    defaultCaption: "¡Acabo de planificar mi aventura europea de ensueño! #JoyPlann #Viajes",
    previewAlt: "Vista previa del viaje",
    sampleTitle: "Aventura europea",
    download: "Descargar",
  },

  profile: {
    premium: "Miembro Premium",
    trips: "Viajes",
    countries: "Países",
    activities: "Actividades",
    myTrips: "Mis viajes",
    settings: "Ajustes",
    notifications: "Notificaciones",
    darkMode: "Apariencia",
    themeSystem: "Sistema",
    themeLight: "Claro",
    themeDark: "Oscuro",
    on: "Activado",
    off: "Desactivado",
    language: "Idioma",
    languageCurrent: "Español",
    subscription: "Suscripción",
    accountSettings: "Ajustes de cuenta",
    logout: "Cerrar sesión",
    upcoming: "próximo",
    past: "pasado",
    sampleEuropeanAdventure: "Aventura europea",
    sampleSummerBali: "Verano en Bali",
  },

  reminders: {
    title: "Recordatorio: {{activityTitle}}",
    bodyBase: "Empieza en {{timeLabel}}",
    bodyAt: " en {{location}}",
    bodyTime: " ({{time}})",
    timing15min: "15 minutos",
    timing30min: "30 minutos",
    timing1hour: "1 hora",
    timing2hours: "2 horas",
    timing1day: "1 día",
    logScheduled: "Recordatorio programado para \"{{title}}\" a las {{at}} ({{label}} antes)",
    logAllCancelled: "Todos los recordatorios cancelados",
  },

  notFound: {
    title: "404 Página no encontrada",
    desc: "¿Olvidaste añadir la página al enrutador?",
  },

  categories: {
    flight: "Vuelo",
    hotel: "Hotel",
    restaurant: "Restaurantes",
    bar: "Bar/Cocktailbar",
    train: "Tren",
    tour: "Tour",
    fitness: "Deporte",
    cultural: "Experiencia",
    nightlife: "Vida nocturna",
    kids: "Para niños",
    transfer: "Traslado",
    transportation: "Transporte",
    general: "Otro",
  },
};

const dictionaries: Record<Lang, Translations> = { en, es };

const dict = dictionaries[lang];

/**
 * Simple interpolation helper.
 * Replaces {{key}} tokens in the template with values from the params object.
 */
function interpolate(template: string, params?: Record<string, string | number>): string {
  if (!params) return template;
  return template.replace(/\{\{(\w+)\}\}/g, (_, key) =>
    key in params ? String(params[key]) : `{{${key}}}`,
  );
}

/**
 * Type-safe translation getter.
 *
 * Usage:
 *   t("myTrips.title")
 *   t("myTrips.tripCount_other", { count: 3 })
 */
type PathsOf<T, Prefix extends string = ""> = T extends string
  ? Prefix
  : {
      [K in keyof T & string]: PathsOf<T[K], Prefix extends "" ? K : `${Prefix}.${K}`>;
    }[keyof T & string];

type TranslationPath = PathsOf<Translations>;

function getNestedValue(obj: Record<string, unknown>, path: string): string | undefined {
  const parts = path.split(".");
  let current: unknown = obj;
  for (const part of parts) {
    if (current == null || typeof current !== "object") return undefined;
    current = (current as Record<string, unknown>)[part];
  }
  return typeof current === "string" ? current : undefined;
}

export function t(path: TranslationPath, params?: Record<string, string | number>): string {
  const value = getNestedValue(dict as unknown as Record<string, unknown>, path);
  if (value === undefined) {
    // Fallback to English
    const fallback = getNestedValue(en as unknown as Record<string, unknown>, path);
    return interpolate(fallback ?? path, params);
  }
  return interpolate(value, params);
}

// ---------------------------------------------------------------------------
// Format helpers (use the detected locale)
// ---------------------------------------------------------------------------

/** Format a date string (YYYY-MM-DD or ISO) for display. */
export function fmtDate(
  dateStr: string,
  options: Intl.DateTimeFormatOptions = { month: "short", day: "numeric", year: "numeric" },
): string {
  const date = new Date(dateStr.length === 10 ? dateStr + "T00:00:00" : dateStr);
  return date.toLocaleDateString(locale, options);
}

/** Format a stored HH:mm time using the detected locale. */
export function fmtTime(value: string): string {
  const match = value.match(/^(\d{1,2}):(\d{2})/);
  if (!match) return value;
  const date = new Date(2000, 0, 1, Number(match[1]), Number(match[2]));
  return date.toLocaleTimeString(locale, { hour: "numeric", minute: "2-digit" });
}

/** Format a number. */
export function fmtNumber(value: number, options?: Intl.NumberFormatOptions): string {
  return value.toLocaleString(locale, options);
}

/** Format a currency amount. */
export function fmtCurrency(
  amount: number,
  currency = "EUR",
  options?: Intl.NumberFormatOptions,
): string {
  return amount.toLocaleString(locale, {
    style: "currency",
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
    ...options,
  });
}
