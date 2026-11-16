import { lang } from "@/lib/i18n";

/**
 * Política de privacidad pública (sin iniciar sesión). Apple y Google exigen
 * una URL accesible; la app móvil enlaza a /privacy.
 *
 * IMPORTANTE: sustituye CONTACT_EMAIL por un correo real antes de publicar.
 * Este texto es una plantilla adaptada a lo que hace el código; no es
 * asesoramiento legal.
 */
const CONTACT_EMAIL = "CORREO-DE-CONTACTO@ejemplo.com";
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
          "No recogemos tu ubicación, contactos, fotos ni datos de pago, y no usamos publicidad ni rastreo entre apps.",
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
          "OpenAI: si pides sugerencias de actividades, se envían el destino, la fecha, el número y la edad de los viajeros, el presupuesto y tus intereses, sin tu nombre ni tu correo.",
          "Google Places y Aviationstack: si buscas hoteles o un vuelo, se envía el texto de esa búsqueda.",
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
          "We do not collect your location, contacts, photos or payment details, and we do not use advertising or cross-app tracking.",
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
          "OpenAI: if you ask for activity suggestions, we send the destination, date, number and ages of travelers, budget and interests, without your name or email.",
          "Google Places and Aviationstack: if you search for hotels or a flight, the search text is sent.",
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
