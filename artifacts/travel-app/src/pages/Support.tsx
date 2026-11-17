import { lang } from "@/lib/i18n";

/** Página pública de soporte (URL de soporte de la App Store). */
const SUPPORT_EMAIL = "soporte@joyplann.com";

type Faq = { q: string; a: string };

const content: Record<"es" | "en", { title: string; intro: string; contact: string; faqTitle: string; faqs: Faq[] }> = {
  es: {
    title: "Soporte de JoyPlann",
    intro: "¿Tienes una duda o algo no funciona? Escríbenos y te respondemos lo antes posible.",
    contact: "Correo de soporte",
    faqTitle: "Preguntas frecuentes",
    faqs: [
      { q: "¿Cómo creo un viaje?", a: "En la pestaña Viajes toca «Nuevo viaje», elige uno o varios destinos, las fechas y los viajeros." },
      { q: "¿Cómo agrego una reserva desde una captura?", a: "En una actividad toca «Rellenar desde una captura» y elige la imagen de tu confirmación. Revisa los datos antes de guardar." },
      { q: "¿De dónde salen los horarios, teléfonos y webs?", a: "De Google Maps. Las ideas generadas con IA nunca incluyen teléfonos inventados. Confirma siempre con el lugar antes de ir." },
      { q: "¿Cómo funciona «Qué llevar»?", a: "Usa el clima en vivo y el pronóstico hasta 16 días antes; para fechas más lejanas usa el clima típico de esos días." },
      { q: "¿Cómo cancelo JoyPlann Pro?", a: "En tu iPhone: Ajustes → tu nombre → Suscripciones → JoyPlann → Cancelar suscripción. En Android: Google Play → Pagos y suscripciones." },
      { q: "¿Cómo restauro mi compra?", a: "En la app: Cuenta y Ajustes → Mejorar a Pro → Restaurar compras, con la misma cuenta de Apple o Google con la que pagaste." },
      { q: "¿Cómo elimino mi cuenta?", a: "En la app: Cuenta y Ajustes → Eliminar cuenta. Se borran de forma permanente tus viajes y datos. Si tienes Pro, cancela también la suscripción en la tienda." },
    ],
  },
  en: {
    title: "JoyPlann Support",
    intro: "Have a question or something isn't working? Write to us and we'll reply as soon as possible.",
    contact: "Support email",
    faqTitle: "FAQ",
    faqs: [
      { q: "How do I create a trip?", a: "In the Trips tab tap “New trip”, pick one or more destinations, dates and travelers." },
      { q: "How do I add a booking from a screenshot?", a: "In an activity tap “Fill in from a screenshot” and choose your confirmation image. Review the details before saving." },
      { q: "Where do opening hours, phones and websites come from?", a: "From Google Maps. AI ideas never include made-up phone numbers. Always confirm with the place before you go." },
      { q: "How does “What to wear” work?", a: "It uses live weather and the forecast up to 16 days ahead; for later dates it uses the typical weather for those days." },
      { q: "How do I cancel JoyPlann Pro?", a: "On iPhone: Settings → your name → Subscriptions → JoyPlann → Cancel. On Android: Google Play → Payments & subscriptions." },
      { q: "How do I restore my purchase?", a: "In the app: Account & Settings → Upgrade to Pro → Restore purchases, using the same Apple or Google account you paid with." },
      { q: "How do I delete my account?", a: "In the app: Account & Settings → Delete account. Your trips and data are permanently deleted. If you have Pro, also cancel the subscription in the store." },
    ],
  },
};

export default function Support() {
  const c = content[lang];
  return (
    <main className="mx-auto max-w-2xl px-4 py-10 text-foreground">
      <h1 className="text-3xl font-bold tracking-tight">{c.title}</h1>
      <p className="mt-4 leading-relaxed">{c.intro}</p>
      <p className="mt-4">
        <span className="font-semibold">{c.contact}: </span>
        <a className="text-primary underline" href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</a>
      </p>
      <h2 className="mt-10 text-xl font-semibold">{c.faqTitle}</h2>
      <dl className="mt-4 space-y-5">
        {c.faqs.map((faq) => (
          <div key={faq.q}>
            <dt className="font-semibold">{faq.q}</dt>
            <dd className="mt-1 leading-relaxed text-muted-foreground">{faq.a}</dd>
          </div>
        ))}
      </dl>
      <p className="mt-10 text-sm text-muted-foreground">
        <a className="underline" href="/privacy">{lang === "es" ? "Política de privacidad" : "Privacy policy"}</a>
        {" · "}
        <a className="underline" href="/terms">{lang === "es" ? "Términos de uso" : "Terms of use"}</a>
      </p>
    </main>
  );
}
