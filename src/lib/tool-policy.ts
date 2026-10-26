export interface ConversationTurn {
  role: "user" | "assistant";
  text: string;
}

export interface ToolPermissions {
  showContactOptions: boolean;
  prepareBooking: boolean;
}

const BOOKING_REQUEST =
  /\b(?:nataka|naomba|tuanze|tuanzie|weka|kuweka|nisaidie kuanza|niko tayari|i want to|i'd like to|let's|please|book me|start|begin|reserve)\b.{0,70}\b(?:booking|book|kubook|reserve|reservation)\b/i;
const BOOKING_DETAIL =
  /\b(?:sendoff|harusi|wedding|tukio|event|picha|photo(?:graphy)?|video|audio|live stream(?:ing)?|diamond|golden|basic|apple|vanilla|mango|tarehe|date|kesho|tomorrow|next week|january|february|march|april|may|june|july|august|september|october|november|december|jumatatu|jumanne|jumatano|alhamisi|ijumaa|jumamosi|jumapili)\b|\b\d{1,2}[/-]\d{1,2}(?:[/-]\d{2,4})?\b/i;
const EXPLICIT_CONTACT =
  /\b(?:(?:ku)?wasilian\w*|namba(?:\s+yenu)?|simu(?:\s+yenu)?|whatsapp|e-?mail|barua pepe|contact|reach (?:you|the team)|phone number|call (?:you|the team)|piga simu|kuongea na timu|talk to (?:someone|the team)|speak to (?:someone|the team))\b/i;
const FINANCIAL_OR_POLICY =
  /\b(?:amana|malipo|kulipa|nilipie|akaunti|account number|benki|bank|mpesa|m pesa|tigo pesa|airtel money|punguzo|punguzia|discount|ofa maalum|special offer|mkataba|contract|haki za picha|copyright|commercial use|commercial|kibiashara|matumizi ya kibiashara|refund|fidia|rudisha pesa|rudishia pesa)\b/i;
const AVAILABILITY =
  /\b(?:availability|available|mtakuwa free|bado ipo|nafasi.*(?:tarehe|jumatatu|jumanne|jumatano|alhamisi|ijumaa|jumamosi|jumapili)|tarehe.*(?:free|ipo|available|nafasi)|(?:free|available).{0,30}(?:tarehe|jumamosi|jumapili|monday|saturday|sunday))\b/i;
const COMPLAINT_OR_URGENT =
  /\b(?:malalamiko|lalamiko|ninalalamika|hamjanipeleka|hamjaleta|hamjanitumia|sijapokea|sijapata|bado sijapata|imeshindikana|refund|fidia|dharura|urgent|within (?:one|1|24) days?|ndani ya siku moja|haraka sana)\b/i;
const DELIVERY_TIME =
  /\b(?:siku ngapi|muda gani|itakamilika lini|turnaround|delivery time|when will.{0,30}(?:finish|deliver)|how long.{0,30}(?:finish|deliver))\b/i;
const FRIDAY_HANDOFF = /(?:friday\s*melody|melody\s*moment|kipindi\s+(?:cha\s+)?uimbaji)/i;
const FRIDAY_LOGISTICS =
  /\b(?:kuimba|uimb|shiriki|shirik|jiandik|usajili|registration|singer|waimbaji|orodha|venue|mahali|fuatilia|stream|kiingilio|ada|masharti|ijumaa hii|ijumaa hiyo|friday this|live link)\b/i;
const UNLISTED_SERVICE_OR_EXTRA =
  /\b(?:podcast|music recording|recording studio|kurekodi (?:muziki|wimbo|nyimbo)|studio setup|equipment rental|kukodisha vifaa|drone.*(?:ongeza|add|price|bei|mango|vanilla|apple)|(?:ongeza|add).*drone|prewedding.*(?:extra|bei|price)|album ya ziada|siku ya pili)\b/i;

/**
 * Determine which action tools may be exposed to the model on this turn.
 *
 * Tool availability is a server-side policy, not a prompt suggestion: the
 * model cannot emit contact or booking cards unless the customer's recent
 * messages satisfy these intent checks.
 */
export function getToolPermissions(turns: readonly ConversationTurn[]): ToolPermissions {
  const userTurns = turns.filter((turn) => turn.role === "user");
  const latestUserText = userTurns.at(-1)?.text.trim() ?? "";
  const previousAssistantText = previousAssistantTurn(turns, latestUserText);
  const affirmative = isAffirmative(latestUserText);

  const acceptedContactOffer = affirmative && offersContact(previousAssistantText);
  const acceptedBookingOffer = affirmative && offersBooking(previousAssistantText);
  const explicitContact = EXPLICIT_CONTACT.test(latestUserText) || acceptedContactOffer;
  const bookingRequested =
    userTurns.slice(-4).some((turn) => BOOKING_REQUEST.test(turn.text)) || acceptedBookingOffer;
  const bookingDetailProvided = userTurns.slice(-4).some((turn) => BOOKING_DETAIL.test(turn.text));
  const prepareBooking = bookingRequested && bookingDetailProvided && !explicitContact;

  const contactHandoffNeeded =
    FINANCIAL_OR_POLICY.test(latestUserText) ||
    AVAILABILITY.test(latestUserText) ||
    COMPLAINT_OR_URGENT.test(latestUserText) ||
    DELIVERY_TIME.test(latestUserText) ||
    UNLISTED_SERVICE_OR_EXTRA.test(latestUserText) ||
    (FRIDAY_HANDOFF.test(latestUserText) && FRIDAY_LOGISTICS.test(latestUserText));

  return {
    showContactOptions: !prepareBooking && (explicitContact || contactHandoffNeeded),
    prepareBooking,
  };
}

function previousAssistantTurn(turns: readonly ConversationTurn[], latestUserText: string): string {
  if (!latestUserText) return "";
  let foundLatestUser = false;
  for (let index = turns.length - 1; index >= 0; index -= 1) {
    const turn = turns[index];
    if (!foundLatestUser) {
      if (turn.role === "user" && turn.text.trim() === latestUserText) foundLatestUser = true;
      continue;
    }
    if (turn.role === "assistant") return turn.text;
  }
  return "";
}

function isAffirmative(text: string): boolean {
  return /^(?:ndio|ndiyo|yes|yeah|yep|sawa|ok|okay|poa|please|tafadhali|endelea|go ahead|sure|fine)(?:\b|[.!?,])/i.test(
    text.trim(),
  );
}

function offersContact(text: string): boolean {
  return (
    /(?:(?:ku)?wasilian|contact|whatsapp|piga simu|call|reach|kuungan|timu)/i.test(text) &&
    (/[?？]/.test(text) || /(?:unataka|ungependa|would you like|shall i|can i|should i)/i.test(text))
  );
}

function offersBooking(text: string): boolean {
  return (
    /(?:booking|book|kubook|reservation)/i.test(text) &&
    (/[?？]/.test(text) || /(?:unataka|ungependa|would you like|shall i|can i|should i)/i.test(text))
  );
}
