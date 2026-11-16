import { lang } from "@/lib/i18n";

/**
 * Términos de uso públicos (Apple los exige en la pantalla de suscripción).
 * Plantilla adaptada a cómo funciona JoyPlann; no es asesoramiento legal.
 */
const CONTACT_EMAIL = "privacy@joyplann.com";
const LAST_UPDATED = { es: "16 de noviembre de 2026", en: "November 16, 2026" };

type Section = { title: string; body: string[] };

const content: Record<"es" | "en", { title: string; intro: string; sections: Section[] }> = {
  es: {
    title: "Términos de uso de JoyPlann",
    intro: "Al usar JoyPlann aceptas estos términos. Si no estás de acuerdo, no uses la app.",
    sections: [
      {
        title: "El servicio",
        body: [
          "JoyPlann te ayuda a organizar viajes: itinerarios, reservas, hoteles, recordatorios e ideas.",
          "Las sugerencias generadas con IA y los datos leídos de capturas pueden contener errores. Verifica siempre horarios, precios, disponibilidad y los datos de tus reservas con el proveedor correspondiente.",
        ],
      },
      {
        title: "Tu cuenta",
        body: [
          "Eres responsable de la información que guardas y de mantener segura tu cuenta.",
          "Puedes eliminar tu cuenta y tus datos en cualquier momento desde Cuenta y Ajustes → Eliminar cuenta.",
        ],
      },
      {
        title: "Plan gratuito y JoyPlann Pro",
        body: [
          "El plan gratuito incluye 1 viaje activo, hasta 2 destinos por viaje multidestino, 2 lecturas de captura y 3 pedidos de ideas con IA al mes.",
          "JoyPlann Pro elimina esos límites. Es una suscripción mensual o anual que se cobra a tu cuenta de Apple (App Store) o Google (Google Play).",
          "La suscripción se renueva automáticamente salvo que la canceles al menos 24 horas antes de que termine el periodo. Puedes gestionarla o cancelarla en los ajustes de tu cuenta de la tienda.",
          "Si se ofrece una prueba gratuita, al terminar se cobrará la suscripción salvo que la canceles antes. Los reembolsos los gestiona Apple o Google según sus políticas.",
          "Podemos cambiar los precios o las funciones de Pro; te avisaremos con antelación y los cambios de precio no afectarán al periodo ya pagado.",
        ],
      },
      {
        title: "Uso aceptable",
        body: [
          "No uses JoyPlann para actividades ilegales, para intentar acceder a datos de otras personas ni para sobrecargar o dañar el servicio.",
          "Podemos suspender cuentas que incumplan estos términos.",
        ],
      },
      {
        title: "Responsabilidad",
        body: [
          "JoyPlann se ofrece «tal cual». No somos agencia de viajes ni intermediarios de tus reservas, y no respondemos de cambios, cancelaciones o errores de aerolíneas, hoteles u otros proveedores.",
          "En la medida que permita la ley, nuestra responsabilidad se limita al importe que hayas pagado por la app en los últimos 12 meses.",
        ],
      },
      {
        title: "Privacidad",
        body: ["El tratamiento de tus datos se explica en la Política de privacidad (joyplann.com/privacy)."],
      },
      {
        title: "Cambios y contacto",
        body: [
          "Si cambiamos estos términos, publicaremos la nueva versión en esta página con su fecha.",
          `Para cualquier duda, escríbenos a ${CONTACT_EMAIL}.`,
        ],
      },
    ],
  },
  en: {
    title: "JoyPlann Terms of Use",
    intro: "By using JoyPlann you agree to these terms. If you do not agree, do not use the app.",
    sections: [
      {
        title: "The service",
        body: [
          "JoyPlann helps you organize trips: itineraries, bookings, hotels, reminders and ideas.",
          "AI-generated suggestions and details read from screenshots may contain mistakes. Always verify opening hours, prices, availability and your booking details with the relevant provider.",
        ],
      },
      {
        title: "Your account",
        body: [
          "You are responsible for the information you store and for keeping your account secure.",
          "You can delete your account and data at any time in Account & Settings → Delete account.",
        ],
      },
      {
        title: "Free plan and JoyPlann Pro",
        body: [
          "The free plan includes 1 active trip, up to 2 destinations per multi-destination trip, 2 screenshot reads and 3 AI idea requests per month.",
          "JoyPlann Pro removes those limits. It is a monthly or yearly subscription charged to your Apple (App Store) or Google (Google Play) account.",
          "The subscription renews automatically unless cancelled at least 24 hours before the end of the current period. You can manage or cancel it in your store account settings.",
          "If a free trial is offered, the subscription is charged when it ends unless you cancel before. Refunds are handled by Apple or Google under their policies.",
          "We may change Pro prices or features; we will give you notice, and price changes will not affect a period you have already paid for.",
        ],
      },
      {
        title: "Acceptable use",
        body: [
          "Do not use JoyPlann for illegal activities, to try to access other people's data, or to overload or harm the service.",
          "We may suspend accounts that break these terms.",
        ],
      },
      {
        title: "Liability",
        body: [
          "JoyPlann is provided “as is”. We are not a travel agency or an intermediary for your bookings, and we are not responsible for changes, cancellations or errors by airlines, hotels or other providers.",
          "To the extent permitted by law, our liability is limited to the amount you paid for the app in the last 12 months.",
        ],
      },
      {
        title: "Privacy",
        body: ["How we handle your data is explained in the Privacy Policy (joyplann.com/privacy)."],
      },
      {
        title: "Changes and contact",
        body: [
          "If we change these terms, we will publish the new version on this page with its date.",
          `For any question, write to ${CONTACT_EMAIL}.`,
        ],
      },
    ],
  },
};

export default function Terms() {
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
