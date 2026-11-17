import { lang } from "@/lib/i18n";

/**
 * Política de privacidad pública (sin iniciar sesión). Apple y Google exigen
 * una URL accesible; la app móvil enlaza a /privacy.
 *
 * El buzón privacy@joyplann.com debe recibir correo (registros MX del dominio).
 * Este texto es una plantilla adaptada a lo que hace el código; no es
 * asesoramiento legal.
 */
const CONTACT_EMAIL = "privacy@joyplann.com";
const LAST_UPDATED = { es: "16 de noviembre de 2026", en: "November 16, 2026" };

type Section = { title: string; body: string[] };

const content: Record<"es" | "en", { title: string; intro: string; sections: Section[] }> = {
  es: {
    title: "Política de privacidad de JoyPlann",
    intro:
      "JoyPlann te ayuda a planificar viajes. Esta política explica qué datos tratamos, para qué y cómo puedes borrarlos.",
    sections: [
      {
        title: "Datos que tratamos",
        body: [
          "Cuenta: tu correo electrónico y, si lo indicas, tu nombre. El inicio de sesión lo gestiona Clerk.",
          "Viajes: los destinos, fechas, número de viajeros, actividades, reservas, hoteles, números de confirmación y notas que añades.",
          "Recordatorios: se programan en tu propio dispositivo; solo guardamos si están activados o no.",
          "Capturas: solo las que eliges tú para rellenar una reserva; la app no accede al resto de tus fotos.",
          "Ubicación: solo si pulsas «Ver dónde estoy» en el mapa del viaje; se usa en ese momento para mostrarte en el mapa y no se guarda.",
          "Mapa: para situar tus actividades, el nombre y la dirección del lugar se envían a Google Places o al servicio de mapas del sistema (Apple Maps en iPhone), y guardamos las coordenadas resultantes con la actividad.",
          "No recogemos tus contactos ni datos de pago, y no usamos publicidad ni rastreo entre apps.",
        ],
      },
      {
        title: "Para qué los usamos",
        body: [
          "Únicamente para prestarte el servicio: guardar y sincronizar tus viajes entre la web y el móvil, y mostrarte sugerencias.",
          "No vendemos ni compartimos tus datos con fines publicitarios.",
        ],
      },
      {
        title: "Proveedores que intervienen",
        body: [
          "Clerk: inicio de sesión y gestión de la cuenta.",
          "Railway: alojamiento del servidor y de la base de datos.",
          "Apple / Google y RevenueCat: si te suscribes a JoyPlann Pro, el pago lo procesa la tienda; RevenueCat recibe tu identificador de usuario y el estado de la suscripción para activarla. No vemos los datos de tu tarjeta.",
          "OpenAI: si pides sugerencias de actividades, se envían el destino, la fecha, el número y la edad de los viajeros, el presupuesto y tus intereses, sin tu nombre ni tu correo.",
          "OpenAI: si usas «Rellenar desde una captura», se envía la imagen que eliges (reducida) para leer los datos de la reserva. No la guardamos en nuestros servidores; solo se guardan los datos que tú confirmas al guardar.",
          "Google Places y Aviationstack: si buscas hoteles o un vuelo, o pides «Contacto y reserva» de un lugar, se envía el texto de esa búsqueda (nombre del lugar y ciudad).",
          "Open-Meteo: para «Qué llevar» se envían el nombre de la ciudad, sus coordenadas y las fechas del viaje para obtener el clima; nada más.",
        ],
      },
      {
        title: "Conservación y borrado",
        body: [
          "Guardamos tus datos mientras tengas una cuenta.",
          "Puedes borrar tu cuenta en cualquier momento desde la app: Cuenta y Ajustes → Eliminar cuenta. Se borran de forma permanente tus viajes, actividades y tu usuario.",
          `También puedes solicitarlo escribiendo a ${CONTACT_EMAIL}.`,
        ],
      },
      {
        title: "Tus derechos",
        body: [
          `Puedes pedir acceso, rectificación o eliminación de tus datos escribiendo a ${CONTACT_EMAIL}.`,
        ],
      },
      {
        title: "Menores",
        body: ["JoyPlann no está dirigido a menores de 13 años y no recogemos sus datos a sabiendas."],
      },
      {
        title: "Cambios",
        body: ["Si cambiamos esta política, publicaremos la nueva versión en esta página con su fecha."],
      },
    ],
  },
  en: {
    title: "JoyPlann Privacy Policy",
    intro:
      "JoyPlann helps you plan trips. This policy explains what data we process, why, and how you can delete it.",
    sections: [
      {
        title: "Data we process",
        body: [
          "Account: your email address and, if you provide it, your name. Sign-in is handled by Clerk.",
          "Trips: the destinations, dates, number of travelers, activities, bookings, hotels, confirmation numbers and notes you add.",
          "Reminders: scheduled on your own device; we only store whether they are enabled.",
          "Screenshots: only the ones you pick to fill in a booking; the app does not access the rest of your photos.",
          "Location: only if you tap “Show my location” on the trip map; it is used at that moment to show you on the map and is not stored.",
          "Map: to place your activities, the place name and address are sent to Google Places or the system map service (Apple Maps on iPhone), and we store the resulting coordinates with the activity.",
          "We do not collect your contacts or payment details, and we do not use advertising or cross-app tracking.",
        ],
      },
      {
        title: "How we use it",
        body: [
          "Only to provide the service: storing and syncing your trips between web and mobile, and showing suggestions.",
          "We do not sell or share your data for advertising.",
        ],
      },
      {
        title: "Service providers",
        body: [
          "Clerk: sign-in and account management.",
          "Railway: server and database hosting.",
          "Apple / Google and RevenueCat: if you subscribe to JoyPlann Pro, the store processes the payment; RevenueCat receives your user identifier and subscription status to activate it. We never see your card details.",
          "OpenAI: if you ask for activity suggestions, we send the destination, date, number and ages of travelers, budget and interests, without your name or email.",
          "OpenAI: if you use “Fill in from a screenshot”, the image you choose (downscaled) is sent to read the booking details. We do not store it on our servers; only the details you confirm when saving are stored.",
          "Google Places and Aviationstack: if you search for hotels or a flight, or ask for “Contact & booking” for a place, the search text (place name and city) is sent.",
          "Open-Meteo: for “What to wear”, the city name, its coordinates and the trip dates are sent to get the weather; nothing else.",
        ],
      },
      {
        title: "Retention and deletion",
        body: [
          "We keep your data while you have an account.",
          "You can delete your account at any time in the app: Account & Settings → Delete account. Your trips, activities and user are permanently deleted.",
          `You can also request it by writing to ${CONTACT_EMAIL}.`,
        ],
      },
      {
        title: "Your rights",
        body: [`You can request access, correction or deletion of your data by writing to ${CONTACT_EMAIL}.`],
      },
      {
        title: "Children",
        body: ["JoyPlann is not directed to children under 13 and we do not knowingly collect their data."],
      },
      {
        title: "Changes",
        body: ["If we change this policy, we will publish the new version on this page with its date."],
      },
    ],
  },
};

export default function Privacy() {
  const c = content[lang];
  return (
    <main className="mx-auto max-w-2xl px-4 py-10 text-foreground">
      <h1 className="text-3xl font-bold tracking-tight">{c.title}</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        {lang === "es" ? "Última actualización: " : "Last updated: "}
        {LAST_UPDATED[lang]}
      </p>
      <p className="mt-6 leading-relaxed">{c.intro}</p>
      {c.sections.map((section) => (
        <section key={section.title} className="mt-8">
          <h2 className="text-xl font-semibold">{section.title}</h2>
          <ul className="mt-3 list-disc space-y-2 pl-5 leading-relaxed">
            {section.body.map((line) => (
              <li key={line}>{line}</li>
            ))}
          </ul>
        </section>
      ))}
    </main>
  );
}
