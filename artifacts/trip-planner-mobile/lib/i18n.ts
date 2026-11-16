/**
 * Static startup i18n for English / Spanish.
 *
 * Language is detected once at module load time from
 * Intl.DateTimeFormat().resolvedOptions().locale so that no package changes
 * are required (no expo-localization). The result is frozen for the lifetime
 * of the JS bundle — consistent with Expo's "detect at startup" model.
 *
 * Tags starting with "es" → Spanish ("es").
 * Everything else        → English ("en").
 */

function detectLanguage(): 'en' | 'es' {
  try {
    const locale = new Intl.DateTimeFormat().resolvedOptions().locale ?? '';
    return locale.startsWith('es') ? 'es' : 'en';
  } catch {
    // Intl may not be fully available in some environments — default to English.
    return 'en';
  }
}

export const language: 'en' | 'es' = detectLanguage();

/** BCP-47 locale string for Intl APIs */
export const locale: string = language === 'es' ? 'es-419' : 'en-US';

// ─── Translation table ────────────────────────────────────────────────────────

const translations = {
  // ── Tab labels ───────────────────────────────────────────────────────────────
  tab_trips: { en: 'My Trips', es: 'Mis viajes' },
  tab_itinerary: { en: 'Itinerary', es: 'Itinerario' },
  tab_history: { en: 'History', es: 'Historial' },

  // ── Navigation ───────────────────────────────────────────────────────────────
  nav_back: { en: 'Back', es: 'Atrás' },

  // ── My Trips screen ──────────────────────────────────────────────────────────
  trips_eyebrow: { en: 'JOYPLANN', es: 'JOYPLANN' },
  trips_title: { en: 'My Trips', es: 'Mis viajes' },
  trips_create_a11y: { en: 'Create trip', es: 'Crear viaje' },
  home_cta_title: { en: 'Where to next?', es: '¿A dónde vas ahora?' },
  home_cta_body: { en: 'Create a trip and add flights, hotels and plans — even from a screenshot.', es: 'Crea un viaje y añade vuelos, hoteles y planes, incluso desde una captura.' },
  home_cta_button: { en: 'New trip', es: 'Nuevo viaje' },
  trip_status_ongoing: { en: 'Happening now', es: 'En curso' },
  countdown_eyebrow: { en: 'YOUR NEXT TRIP', es: 'TU PRÓXIMO VIAJE' },
  countdown_ongoing_eyebrow: { en: 'TRIP IN PROGRESS', es: 'VIAJE EN CURSO' },
  countdown_days: { en: 'days', es: 'días' },
  countdown_day: { en: 'day', es: 'día' },
  countdown_hours: { en: 'hrs', es: 'h' },
  countdown_minutes: { en: 'min', es: 'min' },
  countdown_departs: { en: 'Departure {date} · {time}', es: 'Salida {date} · {time}' },
  countdown_starts: { en: 'Starts {date}', es: 'Empieza el {date}' },
  countdown_now: { en: 'Your trip starts now. Have a great time!', es: '¡Tu viaje empieza ya! Buen viaje.' },
  countdown_day_of: { en: 'Day {current} of {total}', es: 'Día {current} de {total}' },
  countdown_a11y: { en: '{name}: {days} days, {hours} hours and {minutes} minutes left', es: '{name}: faltan {days} días, {hours} horas y {minutes} minutos' },
  trip_status_today: { en: 'Starts today', es: 'Empieza hoy' },
  trip_status_tomorrow: { en: 'Tomorrow', es: 'Mañana' },
  trip_status_in_days: { en: 'In {n} days', es: 'En {n} días' },
  trip_card_a11y: { en: '{name}, {destination}, {dates}. {status}', es: '{name}, {destination}, {dates}. {status}' },
  itinerary_empty_cta: { en: 'Add activity or booking', es: 'Añadir actividad o reserva' },
  ideas_button: { en: 'Help me with ideas', es: 'Ayúdame con ideas' },
  map_button_a11y: { en: 'Trip map', es: 'Mapa del viaje' },
  contact_button: { en: 'Contact & booking', es: 'Contacto y reserva' },
  hours_button: { en: 'Hours & contact', es: 'Horario y contacto' },
  contact_full_button: { en: 'Hours, contact & booking', es: 'Horario, contacto y reserva' },
  contact_hours: { en: 'Opening hours', es: 'Horario' },
  contact_your_day: { en: 'Your day: {line}', es: 'Tu día: {line}' },
  contact_closed_that_day: { en: 'Closed that day — consider another day', es: 'Cerrado ese día — considera otro día' },
  contact_week_hours: { en: 'See the whole week', es: 'Ver horario de la semana' },
  contact_hours_unknown: { en: 'Opening hours not available — confirm with the venue.', es: 'Horario no disponible — confírmalo con el lugar.' },
  contact_opentable: { en: 'Search on OpenTable', es: 'Buscar en OpenTable' },
  contact_title: { en: 'Contact & booking', es: 'Contacto y reserva' },
  contact_loading: { en: 'Looking up verified details…', es: 'Buscando datos verificados…' },
  contact_verified: { en: 'Verified details from Google Maps', es: 'Datos verificados de Google Maps' },
  contact_not_found: { en: 'We could not find verified details. Use the search links to find how to book.', es: 'No encontramos datos verificados. Usa la búsqueda para ver cómo reservar.' },
  contact_call: { en: 'Call', es: 'Llamar' },
  contact_website: { en: 'Website', es: 'Sitio web' },
  contact_book: { en: 'Book a table', es: 'Reservar' },
  contact_search_booking: { en: 'Search how to book', es: 'Buscar cómo reservar' },
  contact_maps: { en: 'Open in Maps', es: 'Ver en Mapas' },
  contact_reservable: { en: 'Accepts reservations', es: 'Acepta reservas' },
  contact_no_reservations: { en: 'May not take reservations', es: 'Puede que no acepte reservas' },
  contact_rating: { en: '{rating} ★ ({count} reviews)', es: '{rating} ★ ({count} reseñas)' },
  contact_mark_booked: { en: 'I already booked it', es: 'Ya lo reservé' },
  contact_disclaimer: { en: 'JoyPlann does not make bookings. Confirm with the venue.', es: 'JoyPlann no hace reservas. Confírmala con el lugar.' },
  booking_pending: { en: 'Not booked yet', es: 'Por reservar' },
  booking_pending_hint: { en: 'Tap to see contact or mark as booked', es: 'Toca para ver el contacto o marcar como reservado' },
  ideas_added_pending: { en: 'Added · not booked yet', es: 'Añadida · por reservar' },
  map_title: { en: 'Trip map', es: 'Mapa del viaje' },
  map_all_days: { en: 'Whole trip', es: 'Todo el viaje' },
  map_locating: { en: 'Locating your places…', es: 'Ubicando tus lugares…' },
  map_total: { en: 'Total {km} · {n} stops', es: 'Total {km} · {n} paradas' },
  map_walk: { en: 'walk', es: 'a pie' },
  map_car: { en: 'by car', es: 'en coche' },
  map_missing: { en: '{n} places could not be located. Add an address in the activity to see them.', es: 'No pudimos ubicar {n} lugares. Añade una dirección en la actividad para verlos.' },
  map_empty: { en: 'No places for this day yet.', es: 'Aún no hay lugares para este día.' },
  map_directions: { en: 'Directions', es: 'Cómo llegar' },
  map_locate_me: { en: 'Show my location', es: 'Ver dónde estoy' },
  map_estimate_note: { en: 'Distances are approximate. Use Directions for the real route.', es: 'Distancias aproximadas. Usa «Cómo llegar» para la ruta real.' },
  ideas_button_hint: { en: 'Tell us what you like and get personalized plans', es: 'Cuéntanos qué te gusta y te armamos propuestas' },
  auth_social_signin_failed: { en: '{provider} sign-in could not be completed. Please try again.', es: 'No se pudo completar el inicio de sesión con {provider}. Inténtalo de nuevo.' },
  auth_social_signin_extra: { en: '{provider} sign-in needs an additional verification step.', es: 'El inicio de sesión con {provider} necesita un paso de verificación adicional.' },
  auth_social_signup_failed: { en: '{provider} sign-up could not be completed. Please try again.', es: 'No se pudo completar el registro con {provider}. Inténtalo de nuevo.' },
  auth_social_signup_extra: { en: '{provider} sign-up needs an additional verification step.', es: 'El registro con {provider} necesita un paso de verificación adicional.' },
  auth_extra_step: { en: 'Your account needs an additional verification step.', es: 'Tu cuenta necesita un paso de verificación adicional.' },
  auth_welcome: { en: 'Welcome back', es: 'Hola de nuevo' },
  auth_welcome_sub: { en: 'Your next adventure is waiting.', es: 'Tu próxima aventura te espera.' },
  auth_apple: { en: 'Continue with Apple', es: 'Continuar con Apple' },
  auth_google: { en: 'Continue with Google', es: 'Continuar con Google' },
  auth_or_email: { en: 'or continue with email', es: 'o continúa con tu correo' },
  auth_email: { en: 'Email address', es: 'Correo electrónico' },
  auth_email_placeholder: { en: 'you@example.com', es: 'tu@correo.com' },
  auth_password: { en: 'Password', es: 'Contraseña' },
  auth_password_placeholder: { en: 'Your password', es: 'Tu contraseña' },
  auth_create_password: { en: 'Create a password', es: 'Crea una contraseña' },
  auth_sign_in: { en: 'Sign in', es: 'Iniciar sesión' },
  auth_new: { en: 'New to JoyPlann?', es: '¿Primera vez en JoyPlann?' },
  auth_create_link: { en: ' Create an account', es: ' Crea una cuenta' },
  auth_code_invalid: { en: 'Please check the verification code and try again.', es: 'Revisa el código de verificación e inténtalo de nuevo.' },
  auth_verify_title: { en: 'Verify your email', es: 'Verifica tu correo' },
  auth_create_title: { en: 'Create your account', es: 'Crea tu cuenta' },
  auth_verify_sub: { en: 'Enter the code we sent to your email.', es: 'Escribe el código que te enviamos por correo.' },
  auth_create_sub: { en: 'Start organising every journey in one place.', es: 'Organiza todos tus viajes en un solo lugar.' },
  auth_code_placeholder: { en: 'Verification code', es: 'Código de verificación' },
  auth_verify_button: { en: 'Verify email', es: 'Verificar correo' },
  auth_resend: { en: 'Send a new code', es: 'Enviar un código nuevo' },
  auth_create_button: { en: 'Create account', es: 'Crear cuenta' },
  auth_have_account: { en: 'Already have an account?', es: '¿Ya tienes cuenta?' },
  auth_signin_link: { en: ' Sign in', es: ' Inicia sesión' },
  outfits_button: { en: 'What to wear', es: 'Qué llevar' },
  outfits_button_hint: { en: 'Live weather and outfits for each destination', es: 'Clima en vivo y outfits para cada destino' },
  outfits_title: { en: 'What to wear', es: 'Qué llevar' },
  outfits_loading: { en: 'Checking the weather…', es: 'Consultando el clima…' },
  outfits_error: { en: 'We couldn’t get the weather. Check your connection.', es: 'No pudimos obtener el clima. Revisa tu conexión.' },
  outfits_retry: { en: 'Try again', es: 'Reintentar' },
  outfits_forecast: { en: 'Forecast', es: 'Pronóstico' },
  outfits_typical: { en: 'Typical weather', es: 'Clima típico' },
  outfits_now: { en: 'Now {temp}°C · feels like {feels}°C', es: 'Ahora {temp}°C · sensación {feels}°C' },
  outfits_range: { en: 'Between {min}° and {max}°C · rain {rainy} of {days} days', es: 'Entre {min}° y {max}°C · lluvia {rainy} de {days} días' },
  outfits_pack: { en: 'Pack', es: 'Empaca' },
  outfits_tips: { en: 'Tips', es: 'Consejos' },
  outfits_unavailable: { en: 'Weather not available for this destination.', es: 'Clima no disponible para este destino.' },
  outfits_source: { en: 'Live weather and forecast up to 16 days ahead; for later dates we use the typical weather of those days and switch to the real forecast as the trip approaches. Data: Open-Meteo.', es: 'Clima en vivo y pronóstico hasta 16 días antes; para fechas más lejanas usamos el clima típico de esos días y cambia al pronóstico real al acercarse el viaje. Datos: Open-Meteo.' },
  ideas_title: { en: 'Ideas for your trip', es: 'Ideas para tu viaje' },
  ideas_step_tastes: { en: 'What do you enjoy?', es: '¿Qué te gusta hacer?' },
  ideas_step_tastes_hint: { en: 'Pick as many as you like.', es: 'Elige todas las que quieras.' },
  ideas_budget: { en: 'Budget', es: 'Presupuesto' },
  ideas_budget_low: { en: 'Budget', es: 'Económico' },
  ideas_budget_medium: { en: 'Moderate', es: 'Moderado' },
  ideas_budget_high: { en: 'Premium', es: 'Premium' },
  ideas_day: { en: 'Which day?', es: '¿Para qué día?' },
  ideas_extra: { en: 'Anything else? (optional)', es: '¿Algo más? (opcional)' },
  ideas_extra_ph: { en: 'e.g. vegetarian, no long walks, rooftop views', es: 'p. ej. vegetariano, sin caminar mucho, vistas en azotea' },
  ideas_generate: { en: 'Show me ideas', es: 'Ver propuestas' },
  ideas_pick_one: { en: 'Pick at least one thing you enjoy.', es: 'Elige al menos una cosa que te guste.' },
  ideas_loading: { en: 'Putting together ideas for you…', es: 'Armando propuestas para ti…' },
  ideas_results: { en: 'Ideas for {day} in {city}', es: 'Ideas para el {day} en {city}' },
  ideas_add: { en: 'Add', es: 'Añadir' },
  ideas_added: { en: 'Added', es: 'Añadida' },
  ideas_more: { en: 'Other ideas', es: 'Otras ideas' },
  ideas_change: { en: 'Change my tastes', es: 'Cambiar mis gustos' },
  ideas_verify: { en: 'Check opening hours and availability before you go.', es: 'Verifica horarios y disponibilidad antes de ir.' },
  ideas_error: { en: 'We could not get ideas right now. Try again in a moment.', es: 'No pudimos generar ideas ahora. Inténtalo en un momento.' },
  ideas_unavailable: { en: 'AI ideas are not available yet.', es: 'Las ideas con IA aún no están disponibles.' },
  ideas_add_error: { en: 'We could not add this idea. Try again.', es: 'No pudimos añadir esta idea. Inténtalo de nuevo.' },
  ideas_kid_friendly: { en: 'Kid-friendly', es: 'Para niños' },
  ideas_done: { en: 'Done', es: 'Listo' },
  ideas_section_tastes: { en: 'Your interests', es: 'Tus gustos' },
  ideas_section_fit: { en: 'Fitness & training', es: 'Fit y ejercicio' },
  fit_running: { en: 'Running routes', es: 'Rutas para correr' },
  fit_hiking: { en: 'Hiking', es: 'Senderismo / hike' },
  fit_gym: { en: 'Gym', es: 'Gym' },
  fit_crossfit: { en: 'CrossFit', es: 'CrossFit' },
  fit_hyrox: { en: 'HYROX', es: 'HYROX' },
  fit_barre: { en: 'Barre', es: 'Barre' },
  fit_pilates_yoga: { en: 'Pilates & yoga', es: 'Pilates y yoga' },
  fit_cycling: { en: 'Cycling', es: 'Ciclismo' },
  taste_food: { en: 'Food', es: 'Gastronomía' },
  taste_culture: { en: 'Culture & museums', es: 'Cultura y museos' },
  taste_history: { en: 'History', es: 'Historia' },
  taste_nature: { en: 'Nature', es: 'Naturaleza' },
  taste_beach: { en: 'Beach', es: 'Playa' },
  taste_adventure: { en: 'Adventure', es: 'Aventura' },
  taste_nightlife: { en: 'Nightlife', es: 'Vida nocturna' },
  taste_shopping: { en: 'Shopping', es: 'Compras' },
  taste_relax: { en: 'Relax & spa', es: 'Relax y spa' },
  taste_art: { en: 'Art', es: 'Arte' },
  taste_sports: { en: 'Sports', es: 'Deporte' },
  taste_photo: { en: 'Photography', es: 'Fotografía' },
  taste_local: { en: 'Like a local', es: 'Como local' },
  taste_family: { en: 'Family plans', es: 'Planes en familia' },
  itinerary_empty_hint: { en: 'Tip: you can fill in a flight or hotel from a screenshot.', es: 'Consejo: puedes rellenar un vuelo u hotel desde una captura.' },
  trips_summary_eyebrow: { en: 'EN ROUTE', es: 'EN RUTA' },
  trips_summary_value_one: { en: '1 trip', es: '1 viaje' },
  trips_summary_value_other: { en: '{n} trips', es: '{n} viajes' },
  trips_summary_body: {
    en: 'Plan. Travel. Enjoy.',
    es: 'Plan. Travel. Enjoy.',
  },
  trips_section_title: { en: 'Upcoming experiences', es: 'Próximas experiencias' },
  trips_error_title: { en: "Couldn't load your trips", es: 'No pudimos cargar tus viajes' },
  trips_retry: { en: 'Retry', es: 'Reintentar' },
  trips_empty_title: { en: 'Your next trip starts here', es: 'Tu próximo viaje empieza aquí' },
  trips_empty_body: {
    en: 'Create a trip to organise every day and every booking.',
    es: 'Crea un viaje para organizar cada día y cada reserva.',
  },
  trips_empty_exact: { en: 'Start planning your next adventure!', es: '¡Empieza a planificar tu próxima aventura!' },
  trips_past_only_title: { en: 'No upcoming trips', es: 'No hay próximos viajes' },
  trips_past_only_body: { en: 'Your completed adventures are waiting in History.', es: 'Tus aventuras terminadas te esperan en Historial.' },
  trips_view_history: { en: 'View History', es: 'Ver historial' },
  trips_sign_out: { en: 'Sign out', es: 'Cerrar sesión' },
  trips_sign_out_a11y: { en: 'Sign out of your account', es: 'Cerrar sesión de tu cuenta' },
  history_title: { en: 'Trip history', es: 'Historial de viajes' },
  history_empty: { en: 'No completed trips yet.', es: 'Aún no hay viajes terminados.' },
  history_select: { en: 'Select', es: 'Seleccionar' },
  history_select_all: { en: 'Select all', es: 'Seleccionar todo' },
  history_deselect_all: { en: 'Deselect all', es: 'Quitar selección' },
  history_selected_count: { en: '{n} selected', es: '{n} seleccionados' },
  history_delete_n: { en: 'Delete ({n})', es: 'Eliminar ({n})' },
  history_delete_many_title: { en: 'Delete {n} trips?', es: '¿Eliminar {n} viajes?' },
  history_delete_partial_error: { en: 'We could not delete {n} trip(s). Try again.', es: 'No pudimos eliminar {n} viaje(s). Inténtalo de nuevo.' },
  settings_title: { en: 'Account & Settings', es: 'Cuenta y Ajustes' },
  settings_theme: { en: 'Appearance', es: 'Apariencia' },
  settings_theme_system: { en: 'System default', es: 'Sistema' },
  settings_theme_light: { en: 'Light', es: 'Claro' },
  settings_theme_dark: { en: 'Dark', es: 'Oscuro' },
  settings_close: { en: 'Close', es: 'Cerrar' },
  settings_privacy: { en: 'Privacy policy', es: 'Política de privacidad' },
  settings_terms: { en: 'Terms of use', es: 'Términos de uso' },
  settings_support: { en: 'Help & support', es: 'Ayuda y soporte' },
  settings_plan: { en: 'Your plan', es: 'Tu plan' },
  settings_plan_free: { en: 'Free', es: 'Gratis' },
  settings_plan_pro: { en: 'JoyPlann Pro', es: 'JoyPlann Pro' },
  settings_plan_usage: { en: '{scans}/{scansLimit} screenshots · {ideas}/{ideasLimit} AI ideas this month', es: '{scans}/{scansLimit} capturas · {ideas}/{ideasLimit} ideas con IA este mes' },
  settings_upgrade: { en: 'Upgrade to Pro', es: 'Mejorar a Pro' },
  settings_manage_subscription: { en: 'Manage subscription', es: 'Gestionar suscripción' },
  paywall_title: { en: 'JoyPlann Pro', es: 'JoyPlann Pro' },
  paywall_subtitle: { en: 'Plan every trip without limits.', es: 'Planea todos tus viajes sin límites.' },
  paywall_reason_trips: { en: 'The free plan includes 1 active trip.', es: 'El plan gratis incluye 1 viaje activo.' },
  paywall_reason_map: { en: 'The itinerary map is part of JoyPlann Pro.', es: 'El mapa del itinerario es parte de JoyPlann Pro.' },
  paywall_benefit_map: { en: 'Itinerary map with routes and distances', es: 'Mapa del itinerario con rutas y distancias' },
  paywall_reason_stops: { en: 'The free plan allows up to {n} destinations per trip.', es: 'El plan gratis permite hasta {n} destinos por viaje.' },
  paywall_benefit_stops: { en: 'Multi-destination trips with no limit', es: 'Viajes multidestino sin límite de destinos' },
  trip_form_stops_pro: { en: 'Pro: more than {n} destinations', es: 'Pro: más de {n} destinos' },
  paywall_reason_scans: { en: 'You used your {n} free screenshot reads this month.', es: 'Usaste tus {n} lecturas de captura gratis de este mes.' },
  paywall_reason_ideas: { en: 'You used your {n} free AI idea requests this month.', es: 'Usaste tus {n} pedidos de ideas con IA gratis de este mes.' },
  paywall_benefit_trips: { en: 'Unlimited trips', es: 'Viajes ilimitados' },
  paywall_benefit_scans: { en: 'Unlimited bookings from screenshots', es: 'Reservas desde capturas ilimitadas' },
  paywall_benefit_ideas: { en: 'Unlimited AI ideas', es: 'Ideas con IA ilimitadas' },
  paywall_benefit_support: { en: 'Support a small independent app', es: 'Apoyas a una app independiente' },
  paywall_monthly: { en: 'Monthly', es: 'Mensual' },
  paywall_yearly: { en: 'Yearly', es: 'Anual' },
  paywall_per_month: { en: '{price}/month', es: '{price}/mes' },
  paywall_per_year: { en: '{price}/year', es: '{price}/año' },
  paywall_trial: { en: '{n}-day free trial', es: '{n} días gratis' },
  paywall_best_value: { en: 'Best value', es: 'Mejor precio' },
  paywall_continue: { en: 'Continue', es: 'Continuar' },
  paywall_restore: { en: 'Restore purchases', es: 'Restaurar compras' },
  paywall_restore_none: { en: 'No previous purchases were found for this Apple ID.', es: 'No encontramos compras anteriores con este Apple ID.' },
  paywall_legal: {
    en: 'Subscription renews automatically unless cancelled at least 24 hours before the end of the period. Manage or cancel it in your App Store settings.',
    es: 'La suscripción se renueva automáticamente salvo que la canceles al menos 24 horas antes de que termine el periodo. Puedes gestionarla o cancelarla en los ajustes de tu App Store.',
  },
  paywall_unavailable: { en: 'Subscriptions are coming soon.', es: 'Las suscripciones estarán disponibles muy pronto.' },
  paywall_error: { en: 'The purchase could not be completed. You have not been charged.', es: 'No se pudo completar la compra. No se te ha cobrado.' },
  paywall_welcome: { en: 'Welcome to JoyPlann Pro!', es: '¡Bienvenido a JoyPlann Pro!' },
  paywall_not_now: { en: 'Not now', es: 'Ahora no' },
  settings_delete_account: { en: 'Delete account', es: 'Eliminar cuenta' },
  settings_delete_title: { en: 'Delete your account?', es: '¿Eliminar tu cuenta?' },
  settings_delete_body: {
    en: 'All your trips, activities and reminders will be permanently deleted. This cannot be undone.',
    es: 'Se borrarán para siempre todos tus viajes, actividades y recordatorios. No se puede deshacer.',
  },
  settings_delete_confirm: { en: 'Delete', es: 'Eliminar' },
  settings_delete_cancel: { en: 'Cancel', es: 'Cancelar' },
  settings_delete_error: {
    en: 'We could not delete your account. Check your connection and try again.',
    es: 'No pudimos eliminar tu cuenta. Revisa tu conexión e inténtalo de nuevo.',
  },

  // ── Itinerary screen ─────────────────────────────────────────────────────────
  itinerary_change_trip_a11y: { en: 'Change trip', es: 'Cambiar viaje' },
  itinerary_add_activity_a11y: { en: 'Add activity', es: 'Agregar actividad' },
  itinerary_no_trip_title: { en: 'Choose a trip', es: 'Elige un viaje' },
  itinerary_no_trip_body: {
    en: 'Select one from My Trips to view and organise its itinerary.',
    es: 'Selecciona uno desde Mis viajes para ver y organizar su itinerario.',
  },
  itinerary_go_trips: { en: 'View my trips', es: 'Ver mis viajes' },
  itinerary_between_cities_eyebrow: { en: 'BETWEEN CITIES', es: 'ENTRE CIUDADES' },
  itinerary_between_cities_title: { en: 'How to get around', es: 'Cómo moverse' },
  itinerary_refreshing: { en: 'Updating…', es: 'Actualizando…' },
  itinerary_transit_error: {
    en: "Couldn't prepare transport options.",
    es: 'No pudimos preparar las opciones de transporte.',
  },
  itinerary_transit_retry: { en: 'Retry', es: 'Reintentar' },
  itinerary_transfer_on: { en: 'Transfer on', es: 'Traslado el' },
  itinerary_recommendation_prefix: { en: 'Recommendation:', es: 'Recomendación:' },
  itinerary_estimated_badge: { en: 'ESTIMATED', es: 'ESTIMADO' },
  itinerary_schedule_badge: { en: 'SCHEDULE CHECKED', es: 'HORARIO CONSULTADO' },
  itinerary_selected_badge: { en: 'CHOSEN', es: 'ELEGIDO' },
  itinerary_transport_cost_prefix: { en: 'From {cost}', es: 'Desde {cost}' },
  itinerary_estimated_suffix: { en: '· estimated', es: '· estimado' },
  itinerary_convenience_high: { en: 'Very convenient', es: 'Muy conveniente' },
  itinerary_convenience_medium: { en: 'Medium convenience', es: 'Conveniencia media' },
  itinerary_convenience_low: { en: 'Less convenient', es: 'Menos conveniente' },
  itinerary_load_error_title: { en: "Couldn't load the itinerary", es: 'No pudimos cargar el itinerario' },
  itinerary_empty_title: { en: 'Your itinerary is empty', es: 'Tu itinerario está libre' },
  itinerary_empty_body: {
    en: 'Add flights, bookings and plans to have everything at hand.',
    es: 'Añade vuelos, reservas y planes para tener todo a mano.',
  },
  itinerary_no_time_place: { en: 'No time or place', es: 'Sin hora ni lugar' },
  itinerary_reminder_label: { en: 'Reminder', es: 'Recordatorio' },
  itinerary_edit_a11y: { en: 'Edit {title}', es: 'Editar {title}' },
  itinerary_delete_a11y: { en: 'Delete {title}', es: 'Eliminar {title}' },
  itinerary_delete_alert_title: { en: 'Delete activity', es: 'Eliminar actividad' },
  itinerary_delete_alert_body: {
    en: 'Remove "{title}" from the itinerary?',
    es: '¿Quieres quitar "{title}" del itinerario?',
  },
  itinerary_delete_cancel: { en: 'Cancel', es: 'Cancelar' },
  itinerary_delete_confirm: { en: 'Delete', es: 'Eliminar' },

  // ── Transport mode labels ─────────────────────────────────────────────────────
  transport_flight: { en: 'Flight', es: 'Vuelo' },
  transport_train: { en: 'Train', es: 'Tren' },
  transport_bus: { en: 'Bus', es: 'Autobús' },

  // ── Trip Form Modal ───────────────────────────────────────────────────────────
  trip_form_close_a11y: { en: 'Close form', es: 'Cerrar formulario' },
  trip_form_title: { en: 'New trip', es: 'Nuevo viaje' },
  trip_form_title_edit: { en: 'Edit trip', es: 'Editar viaje' },
  trip_form_save_edit: { en: 'Save changes', es: 'Guardar cambios' },
  trip_actions_title: { en: 'Trip options', es: 'Opciones del viaje' },
  trip_action_edit: { en: 'Edit', es: 'Editar' },
  trip_action_delete: { en: 'Delete', es: 'Eliminar' },
  trip_action_more_a11y: { en: 'More options for {name}', es: 'Más opciones de {name}' },
  trip_delete_title: { en: 'Delete "{name}"?', es: '¿Eliminar «{name}»?' },
  trip_delete_body: { en: 'Its itinerary, hotels and reminders will be deleted too. This cannot be undone.', es: 'También se borrarán su itinerario, hoteles y recordatorios. No se puede deshacer.' },
  trip_delete_error: { en: 'We could not delete the trip. Try again.', es: 'No pudimos eliminar el viaje. Inténtalo de nuevo.' },
  form_cancel: { en: 'Cancel', es: 'Cancelar' },
  trip_form_discard_title: { en: 'Discard this trip?', es: '¿Descartar este viaje?' },
  trip_form_discard_body: { en: 'The details you entered will be lost.', es: 'Se perderán los datos que escribiste.' },
  trip_form_discard_confirm: { en: 'Discard', es: 'Descartar' },
  trip_form_keep_editing: { en: 'Keep editing', es: 'Seguir editando' },
  trip_form_lead: {
    en: 'Save the basic details and start building your itinerary.',
    es: 'Guarda los detalles básicos y empieza a construir tu itinerario.',
  },
  trip_form_name_label: { en: 'Trip name', es: 'Nombre del viaje' },
  trip_form_name_placeholder: { en: 'Summer escape', es: 'Escapada de verano' },
  trip_form_type_label: { en: 'Trip type', es: 'Tipo de viaje' },
  trip_form_type_single: { en: 'One destination', es: 'Un destino' },
  trip_form_type_multi: { en: 'Multi-destination', es: 'Multidestino' },
  trip_form_stop_label: { en: 'Stop {n}', es: 'Parada {n}' },
  trip_form_remove_stop_a11y: { en: 'Remove stop {n}', es: 'Eliminar parada {n}' },
  trip_form_destination_label: { en: 'Destination', es: 'Destino' },
  trip_form_destination_placeholder_single: { en: 'Mexico City', es: 'Ciudad de México' },
  trip_form_destination_placeholder_multi: { en: 'City or place', es: 'Ciudad o lugar' },
  trip_form_searching_cities: { en: 'Searching cities…', es: 'Buscando ciudades…' },
  trip_form_use_as_destination: { en: 'Use "{v}" as destination', es: 'Usar "{v}" como destino' },
  trip_form_date_start_label: { en: 'Start', es: 'Inicio' },
  trip_form_date_end_label: { en: 'End', es: 'Fin' },
  trip_form_date_select_a11y: { en: 'Select {label} date', es: 'Seleccionar fecha de {label}' },
  trip_form_date_pick: { en: 'Pick a date', es: 'Elegir fecha' },
  trip_form_add_stop: { en: 'Add another stop', es: 'Agregar otra parada' },
  trip_form_adults_label: { en: 'Adults', es: 'Adultos' },
  trip_form_children_label: { en: 'Children', es: 'Menores' },
  trip_form_save: { en: 'Create trip', es: 'Crear viaje' },
  trip_form_save_error: {
    en: "Couldn't save the trip. Please try again.",
    es: 'No fue posible guardar el viaje. Intenta nuevamente.',
  },
  trip_form_err_name: { en: 'Complete the trip name.', es: 'Completa el nombre del viaje.' },
  trip_form_err_dates_single: {
    en: 'Complete the destination and dates for the trip.',
    es: 'Completa el destino y fechas del viaje.',
  },
  trip_form_err_dates_stop: {
    en: 'Complete the destination and dates for stop {n}.',
    es: 'Completa el destino y fechas para la parada {n}.',
  },
  trip_form_err_date_format: {
    en: 'Use the YYYY-MM-DD format for dates.',
    es: 'Usa el formato AAAA-MM-DD para las fechas.',
  },
  trip_form_err_date_order_single: {
    en: 'The start date cannot be after the end date.',
    es: 'La fecha de inicio no puede ser mayor a la de fin.',
  },
  trip_form_err_date_order_stop: {
    en: 'The start date cannot be after the end date for stop {n}.',
    es: 'La fecha de inicio no puede ser mayor a la de fin en la parada {n}.',
  },
  trip_form_err_stop_overlap: {
    en: 'Each stop must start on or after the checkout date of the previous one.',
    es: 'Cada parada debe iniciar en la fecha de check-out de la anterior o después.',
  },

  // Calendar
  calendar_prev_month_a11y: { en: 'Previous month', es: 'Mes anterior' },
  calendar_next_month_a11y: { en: 'Next month', es: 'Mes siguiente' },
  calendar_close_a11y: { en: 'Close calendar', es: 'Cerrar calendario' },
  calendar_select_day_a11y: { en: 'Select {date}', es: 'Seleccionar {date}' },
  calendar_weekdays: {
    en: ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'],
    es: ['Do', 'Lu', 'Ma', 'Mi', 'Ju', 'Vi', 'Sá'],
  },

  // ── Activity Form Modal ───────────────────────────────────────────────────────
  activity_form_close_a11y: { en: 'Close form', es: 'Cerrar formulario' },
  activity_form_title_new: { en: 'New activity', es: 'Nueva actividad' },
  scan_title: { en: 'Fill in from a screenshot', es: 'Rellenar desde una captura' },
  scan_subtitle: {
    en: 'Flight, hotel or reservation confirmation. AI reads it and you review before saving.',
    es: 'Confirmación de vuelo, hotel o reserva. La IA la lee y tú revisas antes de guardar.',
  },
  scan_reading: { en: 'Reading your screenshot…', es: 'Leyendo tu captura…' },
  scan_success: { en: 'Filled in from your screenshot. Please review before saving.', es: 'Datos rellenados desde tu captura. Revísalos antes de guardar.' },
  scan_date_outside: {
    en: 'The booking date ({date}) is outside this trip, so we kept the trip dates.',
    es: 'La fecha de la reserva ({date}) está fuera de este viaje; dejamos las fechas del viaje.',
  },
  scan_choose_title: { en: 'We found several bookings', es: 'Encontramos varias reservas' },
  scan_choose_body: { en: 'Which one do you want to add?', es: '¿Cuál quieres añadir?' },
  scan_no_bookings: { en: 'We could not find a booking in that image. Try a clearer screenshot.', es: 'No encontramos ninguna reserva en esa imagen. Prueba con una captura más clara.' },
  scan_not_configured: { en: 'Screenshot reading is not available yet.', es: 'La lectura de capturas aún no está disponible.' },
  scan_rate_limited: { en: 'Too many screenshots in a short time. Try again later.', es: 'Demasiadas capturas en poco tiempo. Inténtalo más tarde.' },
  scan_failed: { en: 'We could not read the screenshot. Check your connection and try again.', es: 'No pudimos leer la captura. Revisa tu conexión e inténtalo de nuevo.' },
  scan_confirmation: { en: 'Confirmation', es: 'Confirmación' },
  activity_form_title_edit: { en: 'Edit activity', es: 'Editar actividad' },
  activity_form_type_label: { en: 'Activity type', es: 'Tipo de actividad' },
  activity_form_type_placeholder: { en: 'Select your activity', es: 'Selecciona tu actividad' },
  activity_form_flight_number_label: { en: 'Flight number', es: 'Número de vuelo' },
  activity_form_flight_autocomplete: { en: 'Autocomplete', es: 'Autocompletar' },
  activity_form_flight_helper: {
    en: 'Loads airline, schedule, route, terminals and gates when available.',
    es: 'Carga aerolínea, horario, ruta, terminales y puertas cuando estén disponibles.',
  },
  activity_form_date_label: { en: 'Date', es: 'Fecha' },
  activity_form_date_placeholder: { en: '2026-08-18', es: '2026-08-18' },
  activity_form_city_label: { en: 'City', es: 'Ciudad' },
  activity_form_city_placeholder: { en: 'Activity city', es: 'Ciudad de la actividad' },
  activity_form_city_helper: {
    en: "We suggest the stop for that day; you can choose another city.",
    es: 'Te proponemos la parada de ese día; puedes elegir otra ciudad.',
  },
  activity_form_searching_cities: { en: 'Searching cities…', es: 'Buscando ciudades…' },
  activity_form_use_as_city: { en: 'Use "{v}" as city', es: 'Usar "{v}" como ciudad' },
  activity_form_use_as_place: { en: 'Use "{v}" as place', es: 'Usar "{v}" como lugar' },
  hotel_mode_question: {
    en: 'Will you stay at one hotel for the whole trip or two hotels?',
    es: '¿Te alojarás en un hotel durante todo el viaje o en dos hoteles?',
  },
  hotel_mode_one: { en: 'One hotel', es: 'Un hotel' },
  hotel_mode_two: { en: 'Two hotels', es: 'Dos hoteles' },
  hotel_stay_heading: { en: 'Hotel {n}', es: 'Hotel {n}' },
  hotel_name_label: { en: 'Hotel name', es: 'Nombre del hotel' },
  hotel_name_a11y: { en: 'Hotel {n} name', es: 'Nombre del hotel {n}' },
  hotel_name_placeholder: { en: 'Search or enter a hotel', es: 'Busca o escribe un hotel' },
  hotel_name_helper: {
    en: 'Enter a city below and at least two letters to search hotels.',
    es: 'Ingresa una ciudad abajo y al menos dos letras para buscar hoteles.',
  },
  hotel_searching: { en: 'Searching hotels…', es: 'Buscando hoteles…' },
  hotel_manual_fallback: {
    en: 'Hotel search is unavailable. You can enter the name, address and city manually.',
    es: 'La búsqueda de hoteles no está disponible. Puedes ingresar el nombre, la dirección y la ciudad manualmente.',
  },
  hotel_address_label: { en: 'Address', es: 'Dirección' },
  hotel_address_placeholder: { en: 'Hotel street address', es: 'Dirección del hotel' },
  hotel_check_in_label: { en: 'Check-in', es: 'Check-in' },
  hotel_check_out_label: { en: 'Check-out', es: 'Check-out' },
  activity_form_place_helper: {
    en: 'Reuse a place from this trip or enter a new one.',
    es: 'Reutiliza un lugar de este viaje o escribe uno nuevo.',
  },
  activity_form_details_label: { en: 'Details', es: 'Detalles' },
  activity_form_ai_title: { en: 'AI Ideas', es: 'Ideas con IA' },
  activity_form_ai_body: {
    en: 'Uses city, category, {adults} adult{sa} and {children} {childWord}.',
    es: 'Usa ciudad, categoría, {adults} adulto{sa} y {children} niño{sc}.',
  },
  activity_form_ai_thinking: { en: 'Thinking…', es: 'Pensando…' },
  activity_form_ai_suggest: { en: 'Suggest', es: 'Sugerir' },
  activity_form_ai_disclaimer: {
    en: 'Tap a proposal to apply it. Verify schedules and availability.',
    es: 'Toca una propuesta para aplicarla. Verifica horarios y disponibilidad.',
  },
  activity_form_reminder_title: { en: 'Reminder', es: 'Recordatorio' },
  activity_form_reminder_body: {
    en: "We'll ask permission only to schedule the notification.",
    es: 'Te pediremos permiso solo para programar el aviso.',
  },
  activity_form_timing_label: { en: 'Reminder lead time', es: 'Anticipación del recordatorio' },
  activity_form_web_notice: {
    en: 'In the browser you can keep organising your itinerary. Local reminders are scheduled from the iPhone and Android app.',
    es: 'En el navegador puedes seguir organizando tu itinerario. Los recordatorios locales se programan desde la app para iPhone y Android.',
  },
  activity_form_open_settings: { en: 'Open settings', es: 'Abrir ajustes' },
  activity_form_save_new: { en: 'Add to itinerary', es: 'Agregar al itinerario' },
  activity_form_save_edit: { en: 'Save changes', es: 'Guardar cambios' },
  activity_form_save_error: {
    en: "Couldn't save the activity. Please try again.",
    es: 'No se pudo guardar la actividad. Intenta nuevamente.',
  },
  activity_form_select_time_a11y: { en: 'Select time', es: 'Seleccionar hora' },
  activity_form_time_picker_title: { en: 'Select the time', es: 'Selecciona la hora' },
  activity_form_time_picker_hour: { en: 'Hour', es: 'Hora' },
  activity_form_time_picker_minute: { en: 'Minutes', es: 'Minutos' },
  activity_form_time_picker_period: { en: 'AM/PM', es: 'AM/PM' },
  activity_form_time_picker_am: { en: 'AM', es: 'AM' },
  activity_form_time_picker_pm: { en: 'PM', es: 'PM' },
  activity_form_time_picker_clear: { en: 'Clear time', es: 'Borrar hora' },
  activity_form_time_picker_cancel: { en: 'Cancel', es: 'Cancelar' },
  activity_form_time_picker_save: { en: 'Save time', es: 'Guardar hora' },
  activity_form_increase_a11y: { en: 'Increase {label}', es: 'Aumentar {label}' },
  activity_form_decrease_a11y: { en: 'Decrease {label}', es: 'Reducir {label}' },
  // Suggestion field detail
  suggestion_stop_day: { en: 'Stop for this day', es: 'Parada de este día' },
  suggestion_in_itinerary: { en: 'In your itinerary', es: 'En tu itinerario' },
  suggestion_world_catalog: { en: 'World catalog', es: 'Catálogo mundial' },
  suggestion_used_trip: { en: 'Used on this trip', es: 'Usado en este viaje' },

  // Validation errors
  activity_err_category: {
    en: 'Select your activity before saving.',
    es: 'Selecciona tu actividad antes de guardarla.',
  },
  activity_err_title_date: {
    en: 'Add a title and a date in YYYY-MM-DD format.',
    es: 'Agrega un título y una fecha con formato AAAA-MM-DD.',
  },
  activity_err_valid_category: { en: 'Select a valid activity.', es: 'Selecciona una actividad válida.' },
  activity_err_flight_number: {
    en: 'Add the flight number to autocomplete its data.',
    es: 'Agrega el número de vuelo para autocompletar sus datos.',
  },
  activity_err_no_suggestions_category: {
    en: 'Select your activity to receive suggestions.',
    es: 'Selecciona tu actividad para recibir sugerencias.',
  },
  activity_err_no_suggestions_date: {
    en: 'Select a valid date to receive suggestions.',
    es: 'Selecciona una fecha válida para recibir sugerencias.',
  },
  activity_err_no_suggestions_city: {
    en: 'Add a city to receive suggestions.',
    es: 'Agrega una ciudad para recibir sugerencias.',
  },
  activity_err_no_suggestions: {
    en: "Couldn't generate suggestions. Please try again.",
    es: 'No pudimos generar sugerencias. Intenta nuevamente.',
  },
  activity_err_time_for_reminder: {
    en: 'Add a time before activating the reminder.',
    es: 'Agrega una hora antes de activar el recordatorio.',
  },
  activity_err_flight_data: {
    en: "Couldn't load the flight data.",
    es: 'No se pudieron cargar los datos del vuelo.',
  },
  hotel_err_required: {
    en: 'Add each hotel name and valid check-in and check-out dates.',
    es: 'Agrega el nombre de cada hotel y fechas válidas de check-in y check-out.',
  },
  hotel_err_date_order: {
    en: 'A hotel check-in date cannot be after its check-out date.',
    es: 'La fecha de check-in de un hotel no puede ser posterior a su check-out.',
  },
  hotel_err_coverage: {
    en: 'Hotel stays must cover the whole trip, with the first check-out matching the second check-in.',
    es: 'Las estancias deben cubrir todo el viaje y el primer check-out debe coincidir con el segundo check-in.',
  },
  activity_saved_no_reminder: {
    en: "Activity saved. Couldn't confirm the reminder. The activity was saved without a notification.",
    es: 'Actividad guardada. No pudimos confirmar el recordatorio. La actividad quedó guardada sin aviso.',
  },
  activity_saved_title: { en: 'Activity saved', es: 'Actividad guardada' },

  // ── Category labels ───────────────────────────────────────────────────────────
  category_cultural: { en: 'Experience', es: 'Experiencia' },
  category_fitness: { en: 'Sport', es: 'Deporte' },
  category_tour: { en: 'Tour', es: 'Tour' },
  category_restaurant: { en: 'Restaurant', es: 'Restaurantes' },
  category_bar: { en: 'Bar / Cocktail bar', es: 'Bar/Cocktailbar' },
  category_flight: { en: 'Flight', es: 'Vuelo' },
  category_hotel: { en: 'Hotel', es: 'Hotel' },
  category_train: { en: 'Train', es: 'Tren' },
  category_nightlife: { en: 'Nightlife', es: 'Vida nocturna' },
  category_kids: { en: 'For kids', es: 'Para niños' },
  category_transfer: { en: 'Transfer', es: 'Traslado' },
  category_transportation: { en: 'Transport', es: 'Transporte' },
  category_general: { en: 'Other', es: 'Otro' },

  // ── Category field configs ────────────────────────────────────────────────────
  // flight
  cfc_flight_title_label: { en: 'Flight', es: 'Vuelo' },
  cfc_flight_title_ph: { en: 'Airline and flight number', es: 'Aerolínea y número de vuelo' },
  cfc_flight_time_label: { en: 'Departure time', es: 'Hora de salida' },
  cfc_flight_time_ph: { en: '10:30', es: '10:30' },
  cfc_flight_location_label: { en: 'Route / airports', es: 'Ruta / aeropuertos' },
  cfc_flight_location_ph: { en: 'Departure → arrival airport', es: 'Aeropuerto de salida → llegada' },
  cfc_flight_details_ph: {
    en: 'Status, terminal, gate and arrival time',
    es: 'Estado, terminal, puerta y hora de llegada',
  },
  // hotel
  cfc_hotel_title_label: { en: 'Accommodation', es: 'Alojamiento' },
  cfc_hotel_title_ph: { en: 'Hotel or accommodation name', es: 'Nombre del hotel o alojamiento' },
  cfc_hotel_time_label: { en: 'Check-in time', es: 'Hora de check-in' },
  cfc_hotel_time_ph: { en: '15:00', es: '15:00' },
  cfc_hotel_location_label: { en: 'Hotel / accommodation', es: 'Hotel / alojamiento' },
  cfc_hotel_location_ph: { en: 'Name and address of the accommodation', es: 'Nombre y dirección del alojamiento' },
  cfc_hotel_details_ph: { en: 'Check-in, check-out and booking notes', es: 'Check-in, check-out y notas de la reserva' },
  // restaurant
  cfc_restaurant_title_label: { en: 'Restaurant', es: 'Restaurante' },
  cfc_restaurant_title_ph: { en: 'Restaurant or café name', es: 'Nombre del restaurante o cafetería' },
  cfc_restaurant_time_label: { en: 'Booking time', es: 'Hora de la reserva' },
  cfc_restaurant_time_ph: { en: '20:00', es: '20:00' },
  cfc_restaurant_location_label: { en: 'Restaurant', es: 'Restaurante' },
  cfc_restaurant_location_ph: { en: 'Name or address of the restaurant', es: 'Nombre o dirección del restaurante' },
  cfc_restaurant_details_ph: { en: 'Booking, dishes or notes', es: 'Reserva, platillos o notas' },
  // bar
  cfc_bar_title_label: { en: 'Bar / Cocktail bar', es: 'Bar / Cocktailbar' },
  cfc_bar_title_ph: { en: 'Bar or cocktail bar name', es: 'Nombre del bar o cocktailbar' },
  cfc_bar_time_label: { en: 'Booking or arrival time', es: 'Hora de la reserva o llegada' },
  cfc_bar_time_ph: { en: '21:00', es: '21:00' },
  cfc_bar_location_label: { en: 'Bar / Cocktail bar', es: 'Bar / Cocktailbar' },
  cfc_bar_location_ph: { en: 'Name or address of the bar', es: 'Nombre o dirección del bar' },
  cfc_bar_details_ph: { en: 'Booking, drinks or notes', es: 'Reserva, bebidas o notas' },
  // general
  cfc_general_title_label: { en: 'Activity', es: 'Actividad' },
  cfc_general_title_ph: { en: 'Activity name', es: 'Nombre de la actividad' },
  cfc_general_time_label: { en: 'Time', es: 'Hora' },
  cfc_general_time_ph: { en: '10:00', es: '10:00' },
  cfc_general_location_label: { en: 'Place', es: 'Lugar' },
  cfc_general_location_ph: {
    en: 'Museum, beach, park or meeting point',
    es: 'Museo, playa, parque o punto de encuentro',
  },
  cfc_general_details_ph: { en: 'Activity details', es: 'Detalles de la actividad' },

  // ── Flight detail labels (populated by flightLookup) ─────────────────────────
  flight_status_label: { en: 'Status', es: 'Estado' },
  flight_status_unavailable: { en: 'Unavailable', es: 'No disponible' },
  flight_dep_terminal: { en: 'Departure terminal', es: 'Terminal de salida' },
  flight_dep_gate: { en: 'Departure gate', es: 'Puerta de salida' },
  flight_arr_terminal: { en: 'Arrival terminal', es: 'Terminal de llegada' },
  flight_arr_gate: { en: 'Arrival gate', es: 'Puerta de llegada' },
  flight_arr_time: { en: 'Arrival time', es: 'Hora de llegada' },
  flight_fallback_airline: { en: 'Flight', es: 'Vuelo' },

  // ── Reminders ────────────────────────────────────────────────────────────────
  notifications_first_launch_title: {
    en: 'Stay on top of your plans',
    es: 'Mantente al tanto de tus planes',
  },
  notifications_first_launch_body: {
    en: 'Enable notifications so JoyPlann can alert you about activities, flights, hotels, and other important trip updates.',
    es: 'Activa las notificaciones para que JoyPlann pueda avisarte sobre actividades, vuelos, hoteles y otras novedades importantes del viaje.',
  },
  notifications_first_launch_enable: { en: 'Enable notifications', es: 'Activar notificaciones' },
  notifications_first_launch_later: { en: 'Not now', es: 'Ahora no' },
  notifications_permission_title: { en: 'Notifications are off', es: 'Las notificaciones están desactivadas' },
  reminder_15: { en: '15 min before', es: '15 min antes' },
  reminder_30: { en: '30 min before', es: '30 min antes' },
  reminder_60: { en: '1 hour before', es: '1 hora antes' },
  reminder_120: { en: '2 hours before', es: '2 horas antes' },
  reminder_1440: { en: '1 day before', es: '1 día antes' },
  reminder_channel_name: { en: 'Activity reminders', es: 'Recordatorios de actividades' },
  reminder_channel_desc: {
    en: 'Notifications before activities in your itinerary.',
    es: 'Avisos antes de las actividades de tu itinerario.',
  },
  reminder_web_not_supported: {
    en: 'Local reminders are available in the iPhone and Android app.',
    es: 'Los recordatorios locales están disponibles en la app para iPhone y Android.',
  },
  reminder_permission_denied_can_ask: {
    en: "We didn't activate notifications. You can continue with your itinerary and try again whenever you like.",
    es: 'No activamos los avisos. Puedes continuar con tu itinerario y volver a intentarlo cuando quieras.',
  },
  reminder_permission_denied_settings: {
    en: 'Notifications are disabled for this app. Enable them in Settings to receive reminders.',
    es: 'Las notificaciones están desactivadas para esta app. Actívalas en Ajustes para recibir recordatorios.',
  },
  reminder_no_permission: { en: "Couldn't activate notifications.", es: 'No pudimos activar las notificaciones.' },
  reminder_needs_time: {
    en: 'Add a valid time to schedule the reminder.',
    es: 'Agrega una hora válida para programar el recordatorio.',
  },
  reminder_past: {
    en: 'The chosen lead time has already passed. Adjust the time or choose a closer notification.',
    es: 'La anticipación elegida ya pasó. Ajusta la hora o elige un aviso más cercano.',
  },
  reminder_unsupported: {
    en: 'Local reminders are scheduled from the iPhone and Android app.',
    es: 'Los recordatorios locales se programan desde la app para iPhone y Android.',
  },
  reminder_scheduled: { en: 'Reminder scheduled.', es: 'Recordatorio programado.' },
  reminder_soon_title: { en: 'Coming up: {title}', es: 'Próximamente: {title}' },
  reminder_body_with_location: {
    en: 'Your activity is at {time} at {location}.',
    es: 'Tu actividad es a las {time} en {location}.',
  },
  reminder_body_no_location: {
    en: 'Your activity is at {time}.',
    es: 'Tu actividad es a las {time}.',
  },
  reminder_error: {
    en: "Couldn't schedule the reminder. You can continue using your itinerary and try again.",
    es: 'No pudimos programar el recordatorio. Puedes seguir usando tu itinerario e intentarlo de nuevo.',
  },

  // ── Not-found / Error screens ─────────────────────────────────────────────────
  not_found_title: { en: "This screen doesn't exist.", es: 'Esta pantalla no existe.' },
  not_found_link: { en: 'Go to home screen!', es: '¡Ir al inicio!' },
  error_boundary_title: { en: 'Something went wrong', es: 'Algo salió mal' },
  error_boundary_message: { en: 'Please reload the app to continue.', es: 'Vuelve a cargar la app para continuar.' },
  error_boundary_retry: { en: 'Try Again', es: 'Reintentar' },
  error_boundary_details_label: { en: 'View error details', es: 'Ver detalles del error' },
  error_boundary_modal_title: { en: 'Error Details', es: 'Detalles del error' },
  error_boundary_modal_close: { en: 'Close error details', es: 'Cerrar detalles del error' },
} as const;

export type TranslationKey = keyof typeof translations;

/**
 * t(key, vars?) — returns the translation for the current language.
 * Supports simple `{var}` interpolation, e.g. t('trip_form_stop_label', { n: 2 }).
 */
export function t(key: TranslationKey, vars?: Record<string, string | number>): string {
  const entry = translations[key];
  let str: string;

  if (Array.isArray((entry as unknown as Record<string, unknown>)[language])) {
    // Array values (like calendar_weekdays) must be accessed via tArray.
    str = String((entry as unknown as Record<string, unknown>)[language]);
  } else {
    str = (entry as Record<string, string>)[language] ?? (entry as Record<string, string>).en;
  }

  if (!vars) return str;

  return Object.entries(vars).reduce<string>(
    (acc, [k, v]) => acc.replace(new RegExp(`\\{${k}\\}`, 'g'), String(v)),
    str,
  );
}

/**
 * tArray(key) — returns the translation array for the current language.
 * Only meaningful for array-valued keys like `calendar_weekdays`.
 */
export function tArray(key: 'calendar_weekdays'): readonly string[] {
  const entry = translations[key];
  return (entry as Record<string, readonly string[]>)[language] ?? entry.en;
}

// ─── Format helpers ───────────────────────────────────────────────────────────

/**
 * Format a date string (YYYY-MM-DD) or Date object for display.
 * @param value ISO date string or Date
 * @param options Intl.DateTimeFormatOptions
 */
export function formatDate(
  value: string | Date,
  options: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'short' },
): string {
  const date = typeof value === 'string' ? new Date(`${value}T12:00:00`) : value;
  return date.toLocaleDateString(locale, options);
}

/**
 * Format a date for the trip-card display (e.g. "Jan 5" / "5 ene").
 */
export function formatTripDate(value: string): string {
  return formatDate(value, { month: 'short', day: 'numeric' });
}

/**
 * Format a date for the detailed modal display (e.g. "January 5, 2026").
 */
export function formatDateForDisplay(value: string): string {
  const date = new Date(value.split('-').map(Number).reduce<Date>((_, __, i, parts) => {
    // Reconstruct safely to avoid timezone shifts
    return new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
  }, new Date()));
  return date.toLocaleDateString(locale, { day: 'numeric', month: 'short', year: 'numeric' });
}

/**
 * Format a calendar month label (e.g. "January 2026" / "enero de 2026").
 */
export function formatMonthLabel(date: Date): string {
  const label = date.toLocaleDateString(locale, { month: 'long', year: 'numeric' });
  return label.charAt(0).toUpperCase() + label.slice(1);
}

/**
 * Weekday label (uppercase) for itinerary day headers.
 */
export function formatWeekdayLong(value: string): string {
  return new Date(`${value}T12:00:00`).toLocaleDateString(locale, { weekday: 'long' }).toUpperCase();
}

/**
 * Format a number as currency (EUR by default).
 */
export function formatCurrency(amount: number, currency = 'EUR'): string {
  return new Intl.NumberFormat(locale, { style: 'currency', currency, maximumFractionDigits: 0 }).format(amount);
}

/**
 * Format an ISO date-time string using the device's regional clock.
 */
export function formatTime(isoDateTime: string): string {
  return new Intl.DateTimeFormat(locale, { hour: 'numeric', minute: '2-digit' }).format(
    new Date(isoDateTime),
  );
}

/** Format a stored HH:mm time using the device's regional clock. */
export function formatStoredTime(value: string): string {
  const match = value.match(/^(\d{1,2}):(\d{2})/);
  if (!match) return value;
  return new Intl.DateTimeFormat(locale, { hour: 'numeric', minute: '2-digit' }).format(
    new Date(2000, 0, 1, Number(match[1]), Number(match[2])),
  );
}
