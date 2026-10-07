import { buildTelUrl, buildWhatsAppBookingUrl, KHAKI_CONFIG } from "@/config/khaki";
import { KHAKI_MAKER_LINE, KHAKI_OFFICE_LINE } from "@/data/khaki-operations";
import { findService, KHAKI_FAQS } from "@/data/khakiKnowledge";
import { describeOpeningHours } from "@/lib/studio-hours";

/**
 * Offline answers — what Khaki AI says when no model key is configured, or when
 * every model has refused the turn.
 *
 * This is deliberately small and honest: it matches the customer's question
 * against a fixed set of intents and replies with facts pulled from the price
 * list. It never pretends to be the model, and every answer ends by pointing at
 * the studio's WhatsApp line.
 *
 * ## Four kinds of message, and four different replies
 *
 * The matcher used to collapse two of these into the same answer, which is what
 * made the assistant sound robotic:
 *
 *   A. **Casual conversation** — "Habari", "Bro vipi", "Sawa", "Asante". This
 *      is not a question about the studio and must never be refused. See the
 *      `greeting`, `acknowledge`, `positive` and `shukrani` intents below.
 *   B. **The Khaki Media domain** — services, prices, packages, booking,
 *      location, hours, deliverables. Answered from the data files.
 *   C. **A business question whose answer nobody published** — deposit,
 *      refund, availability, delivery time. Handed to the team, never guessed.
 *      See the `escalation` intent.
 *   D. **A serious question from another field** — code, calculus, politics,
 *      religion. A one-line polite redirect back to the studio, never a
 *      fabricated answer. See the `offtopic` intent.
 *
 * C and D are not the same thing and are not answered the same way: C says
 * "this is a conversation with the team", D says "this is not what I do".
 */

interface Intent {
  id: string;
  /** Whole words or phrases, matched on word boundaries. See `hasKeyword`. */
  keywords: string[];
  /**
   * Unambiguous word-stems for Swahili inflection, matched as substrings.
   *
   * Swahili glues prefixes onto a verb -- "rudisha", "rudishia", "nirudishie"
   * and "mnanirudishia" are one word to the customer. Strict word matching
   * cannot see the shared stem, and a bare substring rule is what produced the
   * false positives this file is fixing ("arusi" inside "harusi"). A stem is
   * therefore declared on purpose, and only where it cannot mean anything else.
   */
  stems?: string[];
  build: () => string;
}

/*
 * Contacts are links, not strings of digits.
 *
 * The phone number used to be printed as bold text. On a phone — where this is
 * entirely used — that is a number to memorise or copy, in an answer whose
 * whole purpose is to get the customer to a conversation. These are the same
 * helpers the booking card uses, so the greeting the studio receives is
 * identical however the customer arrives.
 */
const WHATSAPP_LINK = buildWhatsAppBookingUrl({});
const TEL_LINK = buildTelUrl();
const EMAIL = KHAKI_CONFIG.contact.email;

const CONTACT_FOOTER = `\n\nKwa mazungumzo zaidi na booking, [wasiliana nasi WhatsApp ${KHAKI_CONFIG.contact.displayPhone}](${WHATSAPP_LINK}).`;

/**
 * The polite scope redirect, in one sentence.
 *
 * This is what D gets: a serious question from another field is not answered,
 * it is declined and the customer is pointed back at what the studio does. It
 * says nothing about packages and quotes no price -- the catalogue belongs in a
 * price answer, not in a refusal.
 *
 * The same sentence opens the reply for a message the matcher cannot place at
 * all, where the office line is added so an unpublished *business* question
 * still reaches the team. See the fallback at the bottom of this file.
 */
const SCOPE_REDIRECT =
  "Samahani, nimejikita kwenye huduma za **Khaki Media**. Naweza kukusaidia kuhusu picha, video, audio, bei au booking.";

/**
 * Does this answer already carry the WhatsApp link?
 *
 * The footer is appended to every answer, which is right for a price list and
 * wrong for the contact intent: that one lists the WhatsApp link, the phone
 * link and the email, so it ended with the same sentence twice, one after the
 * other. Both now appear once.
 *
 * The test is the link, not the word. Every escalation answer says
 * "nitakuunganisha nao kupitia WhatsApp" without a link, and hiding the footer
 * there would remove the only way to act on it.
 */
function alreadyOffersWhatsApp(answer: string): boolean {
  return answer.includes(WHATSAPP_LINK);
}


const PACKAGES = findService("sendoff-wedding")!.pricing.packages;

/**
 * The six package names, in the form a customer types them.
 *
 * `packageFor` matches against the stored names, which are longer; this is the
 * list for deciding whether a question named one at all.
 */
const PACKAGE_NAMES = ["diamond", "golden", "basic", "apple", "vanilla", "mango"] as const;
const VIDEO = findService("video-production")!;
const AUDIO = findService("audio")!;

function priceOverview(): string {
  const rows = PACKAGES.map((entry) => `- **${entry.name}** — ${entry.price}`).join("\n");
  return `**Sendoff & Harusi** (packages zinaanzia ${findService("sendoff-wedding")!.pricing.startingAt}):\n\n${rows}\n\nPia tunapiga **video mpaka final — ${VIDEO.pricing.startingAt}** na **kazi za audio — ${AUDIO.pricing.startingAt}**.`;
}

function packageFor(keyword: string): string | null {
  const entry = PACKAGES.find((item) => item.name.toLowerCase().includes(keyword));
  if (!entry) return null;
  return `**${entry.name}** — ${entry.price}\n\n${entry.features
    .map((feature) => `- ${feature}`)
    .join("\n")}`;
}

const INTENTS: Intent[] = [
  {
    /*
     * A greeting is not a request for a price list.
     *
     * "Bro vipi?" used to end in "Samahani, mimi ni msaidizi wa Khaki Media --
     * hilo liko nje ya kazi zetu" on the model path, and in the generic reply
     * plus the whole catalogue here. Both read as a door closing on someone who
     * only said hello. A greeting is conversation, not an off-topic question,
     * and this intent is where that distinction lives.
     *
     * Deliberately not in here: "habari za dunia" (news), which is a D and is
     * matched by the `offtopic` intent. "habari" on its own is a greeting.
     */
    id: "greeting",
    keywords: [
      "habari",
      "mambo",
      "shikamoo",
      "hello",
      "hi",
      "hey",
      "hujambo",
      "salama",
      // "salam" and "salamu" are what people actually type; "salama" is not a
      // prefix of either, so it never matched them.
      "salam",
      "salamu",
      "vipi",
      "niaje",
      "uko aje",
      "unaendeleaje",
      "mambo vipi",
      "vipi bro",
      "bro vipi",
      "good morning",
      "good afternoon",
      "good evening",
      "morning",
      "habari ya asubuhi",
      "habari ya jioni",
      "usiku mwema",
      "lala salama",
    ],
    build: () =>
      `Nipo fresh bro 😄 Wewe vipi? Unahitaji msaada gani wa **${KHAKI_CONFIG.brandName}**?`,
  },
  {
    /*
     * Fillers and acknowledgements — "aaaah", "eeh", "ok", "sawa", "poa".
     *
     * Someone typing "aaaah" is not asking an off-topic question; they are
     * reacting. Answering with a scope refusal made the assistant read as a
     * machine that had misheard, which is exactly what it was doing.
     */
    id: "filler",
    keywords: [
      "aaaah",
      "aaah",
      "aaa",
      "aaahh",
      "eeh",
      "eehh",
      "ooh",
      "ohh",
      "hmm",
      "hmmm",
      "ok",
      "okay",
      "sawa",
      "poa",
      "freshi",
      "safi",
      "nice",
    ],
    build: () => "Sawa kabisa bro 👍 Nikusaidie nini kuhusu **Khaki Media**?",
  },
  {
    /* Thanks and goodbyes get an answer of their own; "Karibu sana" is not a
     * generic acknowledgement and reading it as one sounds like a form letter. */
    id: "courtesy",
    keywords: [
      "asante",
      "nashukuru",
      "ahsante",
      "thanks",
      "thank you",
      "karibu",
      "bye",
      "kwaheri",
      "baadaye",
      "tutaonana",
    ],
    build: () => "Karibu sana bro! 🙏 Uko wakati wowote ukiwa tayari — booking au swali lingine.",
  },
  {
    /*
     * "Mnafanya kazi gani?" — the first thing half of them ask.
     *
     * It had no intent, so it fell through to the catch-all, and the catch-all
     * says "Samahani, nimejikita kwenye huduma za Khaki Media". A studio saying
     * sorry for being asked what it does is the single worst reply in the file.
     */
    id: "huduma",
    keywords: [
      "kazi gani",
      "huduma gani",
      "huduma zipi",
      "mnafanya nini",
      "unafanya nini",
      "mnatoa huduma gani",
      "what do you do",
      "what services",
      "which services",
      "mnafanya kazi gani",
      "huduma zenu",
      "kazi zenu",
      "mnashughulika na nini",
    ],
    build: () => {
      const faq = KHAKI_FAQS[0];
      return faq ? `${faq.answer}\n\nUngependa kujua kuhusu ipi?` : "";
    },
  },
  {
    /*
     * The short acknowledgements: "Sawa", "Ok", "Aha", "Kumbe".
     *
     * A customer closing a thought with "Sawa bro" is not asking anything, and
     * the old matcher had no intent for it -- so it fell through to the generic
     * refusal and the price list. There is nothing to answer except the
     * acknowledgement, and answering it with a catalogue is worse than saying
     * one warm line back.
     */
    id: "acknowledge",
    keywords: ["sawa", "ok", "okay", "aha", "kumbe", "sawa sawa", "sawa kabisa", "sawa bro"],
    build: () => `Sawa kabisa bro 👍 Nikusaidie nini kuhusu **${KHAKI_CONFIG.brandName}**?`,
  },
  {
    /*
     * "Poa", "Fresh", and being asked how one is. Small talk, allowed.
     *
     * The words are kept narrow on purpose. "nzuri" and "safi" read just as
     * naturally in a question about a photo as in small talk ("Mna picha
     * nzuri?"), and a casual intent that eats business questions is the failure
     * mode this matcher is being fixed for.
     */
    id: "positive",
    keywords: ["poa", "poa kabisa", "fresh", "freshi", "nipo poa", "uko poa"],
    build: () =>
      `Nipo poa kabisa 😄 Tupo tayari kukusaidia upande wa **${KHAKI_CONFIG.brandName}** pia.`,
  },
  {
    /*
     * Thanks and goodbyes.
     *
     * "Asante sana" fell through to the generic reply, so a customer being
     * polite was told "Sijaelewa vizuri swali lako" and handed the whole price
     * list. There is nothing to answer there except the courtesy, and answering
     * it with a catalogue is worse than saying nothing.
     */
    id: "shukrani",
    /*
     * "karibu" is here because "Karibu" on its own is courtesy, not a location
     * question. The location intent carries the phrase "karibu na" ("mpo
     * karibu na wapi?"), which is longer and therefore wins whenever the word
     * is being used to ask where the studio is.
     */
    keywords: [
      "asante",
      "ahsante",
      "thank",
      "thanks",
      "nashukuru",
      "tunashukuru",
      "shukrani",
      "karibu",
      "kwaheri",
      "baadaye",
      "bye",
    ],
    build: () => `Karibu sana! Tuko hapa wakati wowote ukiwa tayari — kwa booking au swali lingine.`,
  },
  {
    /*
     * Anywhere that is not Dar es Salaam.
     *
     * The model's prompt has a rule for this -- never promise to travel -- but
     * the offline path had none, so "Mnafanya kazi Mwanza?" was answered with
     * "Sijaelewa vizuri" and the package list. Someone asking whether the studio
     * will come to them deserves the real answer, which is that it is a
     * conversation with the team.
     *
     * The regions are listed because there is no other way to recognise a place
     * name. A village outside the list still falls through, which is honest.
     */
    id: "eneo",
    keywords: [
      "mkoa",
      "mkoani",
      "tanzania nzima",
      "kazi popote",
      "nje ya dar",
      "mwanza",
      "arusha",
      "dodoma",
      "mbeya",
      "tanga",
      "morogoro",
      "zanzibar",
      "kigoma",
      "songea",
      "iringa",
      "singida",
      "tabora",
      "shinyanga",
      "moshi",
      "bukoba",
      "musoma",
      "lindi",
      "mtwara",
      "pwani",
      "kilimanjaro",
      "rukwa",
      "kagera",
      "mara",
      "njombe",
      "simiyu",
      "geita",
      "katavi",
      "ruvuma",
      "manyara",
    ],
    build: () =>
      `Tunafanya kazi kutoka **${KHAKI_CONFIG.location.city}**. Kwa tukio lililo mkoa mwingine, hilo linahitaji mazungumzo na timu — upatikanaji na gharama zake zinathibitishwa nao.`,
  },
  {
    id: "price",
    keywords: [
      "bei",
      "gharama",
      "price",
      // "What are your prices?" was in the test list and never matched: the
      // keyword was singular and the matcher is now a word test, not a prefix.
      "prices",
      "cost",
      "costs",
      "packages",
      "shilingi",
      "ngapi",
      "tsh",
    ],
    build: priceOverview,
  },
  {
    id: "diamond",
    keywords: ["diamond"],
    build: () => packageFor("diamond") ?? priceOverview(),
  },
  {
    id: "golden",
    keywords: ["golden"],
    build: () => packageFor("golden") ?? priceOverview(),
  },
  {
    id: "basic",
    keywords: ["basic"],
    build: () => packageFor("basic") ?? priceOverview(),
  },
  {
    id: "apple",
    keywords: ["apple"],
    build: () => packageFor("apple") ?? priceOverview(),
  },
  {
    id: "vanilla",
    keywords: ["vanilla"],
    build: () => packageFor("vanilla") ?? priceOverview(),
  },
  {
    id: "mango",
    keywords: ["mango"],
    build: () => packageFor("mango") ?? priceOverview(),
  },
  {
    /*
     * Live streaming, from the studio's own two posters.
     *
     * The prices and the three conditions are quoted exactly as printed: the
     * standard and basic packages, five hours of work, the doubling for the
     * customer's own channel, transport on the customer, and overtime.
     */
    id: "streaming",
    keywords: [
      "live streaming",
      "livestream",
      "live stream",
      "streaming",
      "kusambaza moja kwa moja",
      "moja kwa moja mtandaoni",
      "live kwenye",
      "kupiga live",
      "mnapiga live",
      "stream",
      "live",
    ],
    build: () => {
      const service = findService("live-streaming");
      if (!service) return "";
      const packages = service.pricing.packages
        .map((entry) => `- **${entry.name}** — ${entry.price} (${entry.features.join(", ")})`)
        .join("\n");
      const notes = (service.notes ?? []).map((note) => `- ${note}`).join("\n");
      return `${packages}\n\n**Masharti:**\n${notes}`;
    },
  },
  {
    id: "wedding",
    keywords: ["harusi", "sendoff", "send off", "wedding", "arusi", "sherehe"],
    build: () =>
      `Tunafunika **sendoff na harusi** kwa picha na video.\n\n${priceOverview()}\n\nNi sendoff au harusi? Na ni tarehe gani?`,
  },
  {
    id: "video",
    keywords: ["video", "coverage", "highlight", "full hd", "flashdisk", "flash disk", "shoot", "kupiga"],
    build: () =>
      `**Kupiga video mpaka final ni ${VIDEO.pricing.startingAt}** kwa kazi — tunapiga, tunaedit, na unakabidhiwa video iliyokamilika.\n\nKwenye packages za sendoff na harusi, video coverage inapatikana kwenye Diamond, Golden, Basic, Apple na Vanilla.`,
  },
  {
    id: "audio",
    /*
     * The recording-studio vocabulary is deliberately absent.
     *
     * These keywords used to include "kurekodi", "rekodi", "muziki", "beat",
     * "wimbo" and "mic" -- none of which the studio has ever claimed -- and the
     * answer is the audio price. So "Mna studio ya kurekodi nyimbo?" was
     * answered with "Kazi za audio ni TSH 200,000 kwa kazi", which reads as a
     * yes. A customer would conclude the studio records songs for that price.
     *
     * The same words now route to the hand-off, and what is left here matches
     * the service by its own name and nothing more. The answer says where the
     * detail comes from, because the scope genuinely is not published.
     */
    keywords: [
      "audio",
      "sauti",
      "sound",
      // The service by the name the price list gives it. These also beat the
      // generic price intent, which ties on "audio" + "ngapi".
      "kazi za audio",
      "huduma ya audio",
    ],
    build: () =>
      `**Kazi za audio ni ${AUDIO.pricing.startingAt}** kwa kazi. Kinachojumuishwa ndani yake kinathibitishwa na timu yetu.`,
  },
  {
    id: "drone",
    keywords: ["drone", "angani", "juu"],
    build: () =>
      `Ndio, tunafanya **drone shots**. Zinapatikana kwenye **Diamond** (TSH 2,000,000/=) na **Golden** (TSH 1,500,000/=). Kwenye packages nyingine zinaweza kuombwa kama nyongeza — bei inathibitishwa na timu.`,
  },
  {
    id: "prewedding",
    keywords: ["prewedding", "pre wedding", "pre-wedding", "kabla ya harusi"],
    build: () =>
      `**Prewedding photoshoot ni bure** kwenye Diamond, Golden na Basic packages. Kwenye Apple, Vanilla na Mango haipo — unaweza kuiomba kama nyongeza.`,
  },
  {
    id: "booking",
    keywords: ["booking", "book", "nafasi", "slot", "reserve", "kuweka", "miadi"],
    build: () =>
      `Kuweka booking ni hatua nne:\n\n1. Unatuchagulia aina ya tukio (sendoff au harusi).\n2. Unatupa tarehe na mahali.\n3. Unachagua package.\n4. Timu inathibitisha nafasi na kutupa maelezo ya malipo.\n\nSheria za amana zinathibitishwa na timu moja kwa moja.`,
  },
  {
    id: "deliverables",
    keywords: [
      "photobook",
      "album",
      "frame",
      "softcopy",
      "soft copy",
      "hardcopy",
      "napata nini",
      // English, which the matcher otherwise has almost none of.
      "what do i get",
      "what do we get",
      "what is included",
      "what's included",
      "included",
      "deliverables",
    ],
    build: () =>
      `Unapata:\n\n- Picha zenye **wooden frame** (idadi inategemea package)\n- **Photobook** au **album**\n- **Softcopies** — Diamond 400+, Golden 300+, Basic 200+, Apple/Vanilla 40, Mango 20\n- **Full HD video** kwenye FlashDisk (kulingana na package)`,
  },
  {
    id: "location",
    keywords: [
      "wapi",
      "location",
      "mnapo",
      "address",
      "kufika",
      "direction",
      "mahali",
      /*
       * English. "Where are you located?" fell through to "Sijaelewa vizuri"
       * because the only English keyword here was "location" and the customer
       * wrote "located". "where" is broad, but nothing else in the catalogue
       * asks it.
       */
      "where",
      "located",
      "locate",
      "directions",
      "office",
      "studio yenu",
      // Beats the courtesy intent's "karibu" when the word asks where we are.
      "karibu na",
    ],
    build: () =>
      `Tupo **${KHAKI_CONFIG.location.address}**, ${KHAKI_CONFIG.location.city}.`,
  },
  {
    id: "hours",
    keywords: [
      "saa",
      "muda wa kufungua",
      "open",
      "hours",
      "mnafungua",
      "usiku",
      "what time",
      "business hours",
      "opening hours",
    ],
    build: () =>
      `**Saa zetu:**\n\n${describeOpeningHours()
        .lines.map((line) => `- ${line}`)
        .join("\n")}`,
  },
  {
    /*
     * Money, policy, and anything else the studio has not published.
     *
     * KHAKI_ESCALATION has listed these for rounds as things to hand to the
     * team, but the offline matcher had no intent for them -- so a customer
     * asking about a deposit, a refund or the delivery time on a spent quota
     * got "Sijaelewa vizuri swali lako" and the package list. A wrong answer to
     * a question the business does have a position on, even if the position is
     * "ask us".
     *
     * Long keywords on purpose: the matcher scores by total matched length, and
     * several of these questions also contain a price word ("bei ya amana ni
     * ngapi"). The hand-off is the right answer to them, not the price list.
     */
    id: "escalation",
    keywords: [
      "amana",
      // Long enough to beat "bei" + "ngapi" in "bei ya amana ni ngapi?".
      "ya amana",
      "malipo",
      "kulipa",
      "nilipie",
      "akaunti",
      "benki",
      "mpesa",
      "m pesa",
      "tigo pesa",
      "airtel money",
      "punguzo",
      "discount",
      "ofa maalum",
      "mkataba",
      "haki za picha",
      "copyright",
      // A customer says "kuposti picha zetu", not "haki za picha".
      "kuposti",
      "kupost",
      "picha zetu",
      "kufuta",
      "kufuta booking",
      "cancel",
      "fidia",
      "refund",
      // "rudishia", not "rudisha" — the customer types "mnanirudishia", and the
      // exact forms are listed here as well as the stem below.
      "rudisha pesa",
      "rudishia pesa",
      "nirudishie",
      "siku ngapi",
      "muda gani",
      "itakamilika lini",
      "watu wangapi",
      "timu ya watu",
      /*
       * The recording-studio vocabulary, moved here from the audio intent.
       *
       * Matching it there produced a price list for a service the studio has
       * never offered. Here it produces the hand-off, which is the honest
       * answer to "can you record my song" when nobody has said.
       *
       * The bare stems are deliberately absent: "kurekodi" alone also appears
       * in "kurekodi video ya harusi", which is an ordinary video question and
       * belongs to the video intent. Only the music-specific phrasings are
       * listed, plus the nouns that cannot mean anything else.
       */
      "kurekodi muziki",
      "kurekodi nyimbo",
      "kurekodi wimbo",
      "kurekodi album",
      "muziki",
      "beat",
      "wimbo",
      "nyimbo",
      "microphone",
      "studio",
      /*
       * Live broadcasting, which is not one of the three services either.
       */
      "live streaming",
      "live stream",
      "youtube",
      "facebook live",
      "instagram live",
      /*
       * English, for the same reason as the rest: a customer writing in English
       * is not an edge case in Tanzania, and the model is not there to cover it
       * when the quota is gone.
       */
      "pay",
      "payment",
      "deposit",
      "how long",
      "how many",
      "when will",
      "available dates",
    ],
    /*
     * Swahili inflection, declared rather than inferred.
     *
     * "Nikifuta booking mnanirudishia pesa?" contains neither "kufuta" nor
     * "rudishia" as a whole word -- the verb carries its own prefixes -- so the
     * two stems carry it. Both are long enough and specific enough that they
     * cannot collide with ordinary studio vocabulary.
     */
    stems: ["rudish", "futa"],
    build: () =>
      `${KHAKI_OFFICE_LINE}\n\nSheria za amana, malipo na muda wa kukamilisha hazipo hadharani — timu inakupa jibu sahihi.`,
  },
  {
    /*
     * Who built it. Asked often enough to be worth a straight answer.
     */
    id: "maker",
    keywords: [
      "nani alikutengeneza",
      "nani kakufanya",
      "nani amekutengeneza",
      "umetengenezwa na nani",
      "who made you",
      "who built you",
      "who created you",
      "developer wako",
      "mlanguzi",
    ],
    build: () => `**${KHAKI_MAKER_LINE}**`,
  },
  {
    /*
     * "Mna app ya Android?"
     *
     * The only question left that the matcher could not place. There is no app
     * in a store -- but there is an installable web app, which Chrome itself
     * reports as installable with no errors, so the honest answer is the
     * install steps rather than "I did not understand".
     *
     * "app" alone is not a keyword: it matches inside "Apple Package", which is
     * one of the six packages and must keep reaching the package intent.
     */
    id: "app",
    keywords: [
      "android",
      "play store",
      "app store",
      "download",
      "install",
      "kwenye simu yangu",
      "kwenye simu yako",
    ],
    build: () =>
      `Hakuna app kwenye Play Store — lakini **Khaki AI inafanya kazi kwenye kivinjari chochote, na unaweza kuiweka kwenye skrini ya simu yako**:\n\n- **Android (Chrome):** menyu ya nukta tatu → *Add to Home screen*\n- **iPhone (Safari):** kitufe cha Share → *Add to Home Screen*`,
  },
  {
    id: "contact",
    keywords: [
      "namba",
      "simu",
      "whatsapp",
      "email",
      "barua pepe",
      "wasiliana",
      "contact",
      // "What is your phone number?" reached none of the above.
      "phone",
      "number",
      "call",
      "reach you",
      "get in touch",
    ],
    build: () =>
      `**Wasiliana nasi:**\n\n- WhatsApp: [${KHAKI_CONFIG.contact.displayPhone}](${WHATSAPP_LINK})\n- Simu: [piga hapa](${TEL_LINK})\n- Barua pepe: [${EMAIL}](mailto:${EMAIL})\n- Instagram & TikTok: **${KHAKI_CONFIG.social.handle}**\n- Mahali: ${KHAKI_CONFIG.location.address}, ${KHAKI_CONFIG.location.city}`,
  },
  {
    /*
     * D: a serious question from another field.
     *
     * "Nifundishe Python", "Nipe calculus solution", "Rais wa Marekani ni
     * nani?" -- these are not business questions and must not be answered. The
     * reply is one polite sentence that declines and redirects, with no price
     * list attached: the old generic reply answered an unrelated question with
     * the whole catalogue, which is neither an answer nor a refusal.
     *
     * This intent is declared LAST on purpose. Ties are broken by declaration
     * order (see `bestIntent`), so a question that is partly about the studio
     * keeps the studio intent: "harusi kanisani" stays a wedding question even
     * though "kanisa" is listed here.
     *
     * The list is deliberately narrow. It holds words from fields that are
     * unmistakably not this studio's -- not "habari" (a greeting, and news is
     * "habari za dunia"), not "serikali" (a studio can be asked whether it has
     * worked with the government, and that is a claim about the studio, not an
     * unrelated question).
     */
    id: "offtopic",
    keywords: [
      // Programming and code.
      "python",
      "javascript",
      "typescript",
      "java",
      "html",
      "css",
      "sql",
      "react",
      "coding",
      "code",
      "programming",
      "programu",
      "script",
      "algorithm",
      "algorithms",
      // School subjects.
      "calculus",
      "algebra",
      "geometry",
      "hesabu",
      "equation",
      "equations",
      "physics",
      "chemistry",
      "biology",
      "statistics",
      "formula",
      "solve",
      "derivative",
      "integral",
      "nifundishe",
      "nifundishie",
      "nifunze",
      "fundisha",
      "teach me",
      // Politics and current affairs.
      "rais",
      "president",
      "siasa",
      "politics",
      "uchaguzi",
      "election",
      "news",
      "habari za dunia",
      // Belief and health.
      "dini",
      "religion",
      "mungu",
      "god",
      "biblia",
      "quran",
      "kurani",
      "kanisa",
      "msikiti",
      "dawa",
      "ugonjwa",
      "hospitali",
      "daktari",
      "doctor",
      "afya",
      // Money that is not the studio's.
      "bitcoin",
      "crypto",
      "forex",
      "betting",
      "gambling",
      "stock",
      "hisa",
      "historia",
      "history",
      "jiografia",
      "geography",
    ],
    build: () => SCOPE_REDIRECT,
  },
];

/**
 * Lower-case, split on anything that is not a letter or a digit, pad with one
 * space at each end.
 *
 * Padding is what makes a whole-word test cheap: every word and every phrase
 * begins and ends with a space, so `" bei "` cannot match inside "beiye" and
 * `" app "` cannot match inside "apple".
 */
function normalise(input: string): string {
  return ` ${input.toLowerCase().split(/[^\p{L}\p{N}]+/u).filter(Boolean).join(" ")} `;
}

/** Keywords are compared in the same shape as the haystack. */
function normaliseKeyword(keyword: string): string {
  return keyword.toLowerCase().split(/[^\p{L}\p{N}]+/u).filter(Boolean).join(" ");
}

/**
 * Whole words and phrases only.
 *
 * The previous matcher was `haystack.includes(keyword)` over a padded string,
 * which matched anywhere inside a word. That produced the false positives this
 * change exists to remove: the region intent's "arusi" matched inside "harusi"
 * (so every wedding question scored the wedding intent twice), and a short
 * keyword like "app" would have matched "Apple Package". A keyword now has to
 * be bounded by spaces, which after normalisation is a word boundary.
 *
 * Phrases work the same way: "kazi za audio", "opening hours", "how many" are
 * tested as word sequences, not as fragments.
 */
function hasKeyword(haystack: string, keyword: string): boolean {
  return haystack.includes(` ${keyword} `);
}

/**
 * Score = total length of everything that matched.
 *
 * Longer keywords win because they are more specific, which is the existing
 * behaviour and is what lets "kazi za audio" beat "bei" + "ngapi". Ties are
 * resolved by declaration order in `bestIntent`, which is deliberate: the
 * casual intents are declared first, the business intents after them, and the
 * off-topic intent last, so a tie never hands a studio question to a redirect.
 */
function scoreIntent(intent: Intent, haystack: string): number {
  let score = 0;

  for (const keyword of intent.keywords) {
    if (hasKeyword(haystack, normaliseKeyword(keyword))) score += keyword.length;
  }
  for (const stem of intent.stems ?? []) {
    if (haystack.includes(normaliseKeyword(stem))) score += stem.length;
  }

  return score;
}

/** Highest score wins; on a tie the earliest-declared intent wins. */
function bestIntent(haystack: string): Intent | null {
  let best: Intent | null = null;
  let bestScore = 0;

  for (const intent of INTENTS) {
    const score = scoreIntent(intent, haystack);
    if (score > bestScore) {
      best = intent;
      bestScore = score;
    }
  }

  return best;
}

export function answerOffline(question: string): string {
  const text = normalise(question);

  /*
   * A question that names a package is about that package.
   *
   * "Bei za Mango ni ngapi?" contains "bei", which the catalogue intent also
   * matches, and the two score the same — so the tie went to whichever was
   * declared first and the customer got all six packages with their price list
   * under a question about one of them. Naming a package is the strongest
   * signal in the sentence, so it is checked before the scoring runs.
   */
  /*
   * Contact details go on the replies that need them, and no others.
   *
   * They used to be appended to every single answer, which turned the assistant
   * into an SMS: ask the price of one package and the reply ended with a phone
   * number, an address and a WhatsApp link, every time. The number is already on
   * a button beside the chat, so repeating it everywhere made the assistant read
   * as a machine reciting its card rather than a person answering.
   *
   * The footer is added when the customer's own words are heading towards
   * booking or reaching the studio, and when the answer has not already given a
   * way to make contact.
   */
  /*
   * Stems, not whole words. "Nikuwasiliane vipi?" is the ordinary way to ask,
   * and the earlier pattern had `wasiliana`, which that sentence does not
   * contain — so the question went to the greeting intent and the customer was
   * told "Nipo fresh bro" when they had asked how to reach the studio.
   */
  const wantsContact =
    /booking|book\b|kuweka|kubook|wasilian|whatsapp|namba|simu|piga|barua pepe|email|mahali|mnaishi|mko wapi|mnapatikana wapi|location|address|ofisi/i.test(
      text,
    );
  const withContact = (answer: string) =>
    wantsContact && !alreadyOffersWhatsApp(answer) ? answer + CONTACT_FOOTER : answer;

  const named = PACKAGE_NAMES.find((name) => text.includes(name));
  if (named) {
    const answer = packageFor(named);
    if (answer) return withContact(answer);
  }

  const best = bestIntent(text);

  /*
   * "Nikuwasiliane vipi?" is a contact question that the greeting intent wins,
   * because it contains "vipi". The customer asked how to reach the studio and
   * got "Nipo fresh bro" back. When the words are plainly about reaching the
   * studio, a greeting or a filler is never the right answer.
   */
  const CONTACTISH = new Set(["greeting", "filler"]);
  const contact = INTENTS.find((intent) => intent.id === "contact");

  if (wantsContact && best && CONTACTISH.has(best.id) && contact) {
    const answer = contact.build();
    if (answer) return answer + (alreadyOffersWhatsApp(answer) ? "" : CONTACT_FOOTER);
  }

  if (best) {
    const answer = best.build();
    if (answer) return withContact(answer);
  }

  /*
   * Nothing matched: the message is either an unpublished *business* question
   * (C) or a question from outside the studio's world that the keyword list did
   * not recognise (D). A deterministic matcher cannot tell those two apart, so
   * the reply is honest about both -- one short sentence that says what this
   * assistant does, and the office line for anything that really is a studio
   * matter.
   *
   * What it is not: the old answer, which opened with "hilo liko nje ya kazi
   * zetu" and then pasted the entire package list. Neither half belonged on the
   * end of a question the assistant simply did not place.
   */
  const answer = `${SCOPE_REDIRECT}\n\n${KHAKI_OFFICE_LINE}`;
  /*
   * The catch-all always carries the way to reach the studio, whether or not the
   * words asked for it: the reply's whole content is "talk to us about this".
   */
  return alreadyOffersWhatsApp(answer) ? answer : answer + CONTACT_FOOTER;
}
