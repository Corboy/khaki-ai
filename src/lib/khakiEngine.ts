import { KHAKI_CONFIG, buildWhatsAppBookingUrl } from "@/config/khaki";
import { KHAKI_SERVICES, KHAKI_STUDIO_SPECS, KHAKI_FAQS } from "@/data/khakiKnowledge";
import { BookingDetails, ChatMessage } from "@/types/chat";

/**
 * Extracts the user's name from casual greetings or direct responses.
 * Examples: "Naitwa Faustine", "Mimi ni Alex", "Faustine", "John Doe", "My name is Amina"
 */
export function extractNameFromInput(input: string): string | null {
  const clean = input.trim();
  if (!clean) return null;

  // Patterns for Swahili & English introductions
  const patterns = [
    /^(?:habari\s+)?(?:naitwa|ninaitwa|jina\s+langu\s+ni|mimi\s+ni)\s+([a-zA-Z\s'-]{2,30})/i,
    /^(?:hello\s+)?(?:i\s+am|my\s+name\s+is|call\s+me)\s+([a-zA-Z\s'-]{2,30})/i,
  ];

  for (const pattern of patterns) {
    const match = clean.match(pattern);
    if (match && match[1]) {
      const candidate = match[1].split(/\s+(?:na|and|hapa|kutoka)\b/i)[0].trim();
      if (candidate.length >= 2 && candidate.length <= 25) {
        return candidate.charAt(0).toUpperCase() + candidate.slice(1);
      }
    }
  }

  // If input is short and looks like just a single or double name (1-3 words)
  const words = clean.split(/\s+/);
  if (words.length >= 1 && words.length <= 3) {
    const isGreetingOnly = /^(mambo|niaje|vipi|salama|habari|hello|hi|hey|yo|yes|ndio)$/i.test(clean);
    if (!isGreetingOnly && /^[a-zA-Z\s'-]+$/.test(clean) && clean.length >= 2) {
      return words.map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(" ");
    }
  }

  return null;
}

/**
 * Parses user messages to detect booking intentions and extract structured booking parameters.
 */
export function extractBookingInfo(
  messages: Array<{ role: string; content: string }>,
  currentBooking: BookingDetails = {}
): BookingDetails {
  const allUserText = messages
    .filter(m => m.role === "user")
    .map(m => m.content)
    .join(" \n ");

  const details: BookingDetails = { ...currentBooking };

  // Detect Service
  if (!details.service) {
    if (/(?:record|ku(?:re)?kodi|vocal|studio\s+session|track|wimbo|ngoma)/i.test(allUserText)) {
      details.service = "Studio Recording";
    } else if (/(?:video|shoot|muziki\s+video|music\s+video|tangazo|commercial)/i.test(allUserText)) {
      details.service = "Video Production";
    } else if (/(?:podcast|livestream|mubashara|live\s+stream)/i.test(allUserText)) {
      details.service = "Podcast & Livestreaming";
    } else if (/(?:picha|photo|photoshoot|picha\s+za\s+studio)/i.test(allUserText)) {
      details.service = "Studio Photography";
    } else if (/(?:mix|master|mixing|mastering)/i.test(allUserText)) {
      details.service = "Mixing & Mastering";
    } else if (/(?:logo|graphics|design|poster|cover\s*art|flier)/i.test(allUserText)) {
      details.service = "Graphics & Branding";
    }
  }

  // Detect Day / Date
  if (!details.date) {
    const dateMatch = allUserText.match(
      /\b(jumatatu|jumanne|jumatano|alhamisi|ijumaa|jumamosi|jumapili|leo|kesho|keshokutwa|tarehe\s+\d{1,2}(?:\s+[a-zA-Z]+)?|monday|tuesday|wednesday|thursday|friday|saturday|sunday|tomorrow|today|\d{1,2}[\/-]\d{1,2}(?:[\/-]\d{2,4})?)\b/i
    );
    if (dateMatch) {
      details.date = dateMatch[0].charAt(0).toUpperCase() + dateMatch[0].slice(1);
    }
  }

  // Detect Time
  if (!details.time) {
    const timeMatch = allUserText.match(
      /\b(?:saa\s+\d{1,2}(?::\d{2})?(?:\s*(?:asubuhi|mchana|jioni|usiku|am|pm))?|\d{1,2}(?::\d{2})?\s*(?:asubuhi|mchana|jioni|usiku|am|pm)|\d{1,2}:\d{2})\b/i
    );
    if (timeMatch && !timeMatch[0].toLowerCase().includes("tarehe")) {
      details.time = timeMatch[0];
    }
  }

  // Detect Notes / Description if user mentioned specifics
  if (!details.notes) {
    const songCountMatch = allUserText.match(/\b(?:nyimbo\s+\d+|\d+\s+songs?|wimbo\s+mmoja|album|ep)\b/i);
    if (songCountMatch) {
      details.notes = `Recording ya ${songCountMatch[0]}`;
    } else {
      const notesMatch = allUserText.match(
        /(?:kazi|maelezo|project|kuhusu|details)\s*[:\-]?\s*([^.,\n]{5,50})/i
      );
      if (notesMatch) {
        details.notes = notesMatch[1].trim();
      }
    }
  }

  // Is ready for booking? (True if user mentions booking keywords or has indicated service/date)
  const hasBookingIntent = /(?:book|booking|weka\s+nafasi|nataka\s+kuja|kufanya\s+booking|nafasi|appointment)/i.test(allUserText);
  if (hasBookingIntent || details.service || (details.date && details.time)) {
    details.isReadyForBooking = true;
  }

  return details;
}

/**
 * Generates the master system prompt containing all grounded Khaki Media business knowledge.
 */
export function buildKhakiSystemPrompt(userName?: string): string {
  const servicesSummary = KHAKI_SERVICES.map(s => `
- **${s.title}** (${s.swahiliTitle})
  - Description: ${s.description}
  - Starting Price: ${s.pricing.startingAt}
  - Packages: ${s.pricing.packages.map(p => `${p.name}: ${p.price}`).join("; ")}
  - Highlights: ${s.highlights.join(", ")}
`).join("\n");

  const faqsSummary = KHAKI_FAQS.map(f => `Q: ${f.question}\nA: ${f.answer}`).join("\n\n");

  return `Wewe ni "${KHAKI_CONFIG.assistantName}", AI Studio Assistant wa studio maarufu ya "${KHAKI_CONFIG.brandName}".
Wewe ni mwerevu, mchangamfu, mwenye heshima, na mtaalamu wa hali ya juu (premium, modern, welcoming).

Lengo lako ni kumpa mteja taarifa sahihi kuhusu Khaki Media:
1. Services (Studio recording, music videos, commercial video, podcast & livestreaming, photography, mixing & mastering, graphic design).
2. Pricing & Packages (eleza wazi bei na vifurushi kulingana na data rasmi).
3. Studio specs & Equipment (Neumann, Shure SM7B, Universal Audio Apollo, Sony FX Cinema 4K, Aputure lighting, treated acoustics).
4. Location & Directions (${KHAKI_CONFIG.location.address}, ${KHAKI_CONFIG.location.city}).
5. Working Hours & Overnight Sessions.
6. FAQs & Policies (50% advance deposit to lock slot, 2 free revisions, 24h reschedule notice).
7. Booking process via WhatsApp.

TAARIFA ZA MTEJA WA SASA:
${userName ? `- Jina la mteja: ${userName}` : "- Jina la mteja halijathibitishwa bado."}

MIONGOZO YA MAWASILIANO:
- Jibu kwa Kiswahili fasaha chenye ladha ya kisasa ya Kitanzania/Kiafrika Mashariki, au Kiingereza kama mteja ameuliza kwa Kiingereza.
- Tumia formatting safi ya Markdown: tumia bullet points, bolding kwenye maneno muhimu, na aya fupi ili majibu yasomeke kiurahisi kama ChatGPT/Claude.
- Usibuni (never hallucinate) huduma au bei ambazo hazipo kwenye orodha rasmi.
- Mteja akionyesha nia ya kufanya booking au akiuliza utaratibu wa booking:
  1. Thibitisha huduma anayotaka, tarehe au muda anaopendelea.
  2. Mhimize kugusa kitufe cha "Book kupitia WhatsApp" kitakachojitokeza chini au kumwambia unamtengenezea taarifa rasmi kwa WhatsApp moja kwa moja.
- Khaki Media inathamini ubora wa hali ya juu, hadhi (class), na kasi ya huduma.

ORODHA RASMI YA HUDUMA NA BEI:
${servicesSummary}

STUDIO SPECS & EQUIPMENT:
- Hardware: ${KHAKI_STUDIO_SPECS.hardware.join(", ")}
- Cameras & Lighting: ${KHAKI_STUDIO_SPECS.camerasAndLighting.join(", ")}
- Amenities: ${KHAKI_STUDIO_SPECS.amenities.join(", ")}
- Acoustics: ${KHAKI_STUDIO_SPECS.acoustics}

LOCATION NA MAWASILIANO:
- Mahali: ${KHAKI_CONFIG.location.address}, ${KHAKI_CONFIG.location.city}
- Landmarks: ${KHAKI_CONFIG.location.landmarks}
- Saa za Kazi: ${KHAKI_CONFIG.workingHours.weekdays}; ${KHAKI_CONFIG.workingHours.saturdays}; ${KHAKI_CONFIG.workingHours.overnight}
- WhatsApp Booking: ${KHAKI_CONFIG.contact.displayPhone}

MASWALI YANAYOULIZWA MARA KWA MARA (FAQS):
${faqsSummary}
`;
}

/**
 * Intelligent standalone response generator for Khaki AI.
 * Ensures the app works 100% reliably out of the box with realistic streaming,
 * full knowledge retrieval, name recognition, and WhatsApp booking integration.
 */
export function generateKhakiLocalResponse(
  userQuery: string,
  history: Array<{ role: string; content: string }>,
  userName?: string
): { responseText: string; booking: BookingDetails } {
  const query = userQuery.toLowerCase().trim();
  const currentBooking = extractBookingInfo([...history, { role: "user", content: userQuery }]);

  if (userName && !currentBooking.name) {
    currentBooking.name = userName;
  }

  const greetingName = userName ? ` **${userName}**` : "";

  // 1. Booking queries
  if (
    query.includes("book") ||
    query.includes("booking") ||
    query.includes("weka nafasi") ||
    query.includes("appointment") ||
    query.includes("ratiba") ||
    query.includes("slot")
  ) {
    currentBooking.isReadyForBooking = true;
    const missing = [];
    if (!currentBooking.service) missing.push("huduma unayotaka (mfano: Studio Recording, Video, au Photography)");
    if (!currentBooking.date) missing.push("siku au tarehe unayopanga kufika");
    if (!currentBooking.time) missing.push("muda unaoupendelea (asubuhi, mchana au jioni)");

    let text = `Karibu sana${greetingName}! Utaratibu wa booking wa Khaki Media ni wa haraka na rahisi sana kupitia WhatsApp.\n\n`;
    text += `### Utaratibu Wetu:\n`;
    text += `1. **Kuchagua Huduma & Slot**: Unachagua siku na muda unaofaa.\n`;
    text += `2. **Amana (Deposit 50%)**: Ili kulinda (lock) slot yako kwenye kalenda ya studio.\n`;
    text += `3. **Marekebisho ya Bure**: Unaruhusiwa kubadili ratiba (reschedule) bure hadi masaa 24 kabla ya session.\n\n`;

    if (missing.length > 0) {
      text += `Ili kukuandalia ujumbe uliokamilika, niambie: **${missing.join(" na ")}**.\n\n`;
    }

    text += `Unaweza pia kubonyeza kitufe cha **"Book kupitia WhatsApp"** hapa chini kufungua mazungumzo na studio manager moja kwa moja!`;

    return { responseText: text, booking: currentBooking };
  }

  // 2. Studio Recording & Audio
  if (
    query.includes("record") ||
    query.includes("kurekodi") ||
    query.includes("vocal") ||
    query.includes("kuimba") ||
    query.includes("audio") ||
    query.includes("sound") ||
    query.includes("beat") ||
    query.includes("nyimbo")
  ) {
    const s = KHAKI_SERVICES.find(srv => srv.id === "recording");
    let text = `Habari${greetingName}! Kwenye upande wa **${s?.title}** (${s?.swahiliTitle}), studio yetu imejengwa kwa viwango vya kimataifa vya acoustic kutoa sauti ya kipekee na ya kioo.\n\n`;
    text += `### Vifurushi & Bei Zetu:\n`;
    s?.pricing.packages.forEach(pkg => {
      text += `- **${pkg.name}** — \`${pkg.price}\`\n  ${pkg.features.join(" • ")}\n`;
    });
    text += `\n### Vifaa Tunavyotumia:\n`;
    text += `- **Vipaza Sauti**: Neumann U87 Ai, Shure SM7B, AKG C414 XLS\n`;
    text += `- **Interface & Processing**: Universal Audio Apollo x8p Heritage Edition zenye DSP analog plugins\n`;
    text += `- **Monitors**: Genelec 8040B & Yamaha HS8\n\n`;
    text += `Je, ungependa kupanga session ya saa ngapi au kufanya wimbo kamili? Bonyeza kitufe hapa chini tuweke booking yako!`;

    currentBooking.service = "Studio Recording";
    return { responseText: text, booking: currentBooking };
  }

  // 3. Mixing & Mastering
  if (query.includes("mix") || query.includes("master") || query.includes("mastering") || query.includes("stem")) {
    const s = KHAKI_SERVICES.find(srv => srv.id === "mixing-mastering");
    let text = `Habari${greetingName}! Huduma yetu ya **Mixing & Mastering** inalenga kufanya nyimbo zako zisikike kwa nguvu, uwiano, na viwango vya ushindani kwenye redio na streaming platforms zote (Spotify, Apple Music, YouTube n.k).\n\n`;
    text += `### Vifurushi:\n`;
    s?.pricing.packages.forEach(pkg => {
      text += `- **${pkg.name}** — \`${pkg.price}\`\n  ${pkg.features.join(" • ")}\n`;
    });
    text += `\n> **Ushauri:** Kama ulisharekodi nyimbo studio nyingine au mikoani, unakaribishwa kututumia track stems zako kwa Google Drive/WeTransfer na tutazifanyia kazi mara moja.\n\n`;
    text += `Ungependa kutuma kazi yako leo?`;
    currentBooking.service = "Mixing & Mastering";
    return { responseText: text, booking: currentBooking };
  }

  // 4. Video Production
  if (
    query.includes("video") ||
    query.includes("shoot") ||
    query.includes("filming") ||
    query.includes("director") ||
    query.includes("camera") ||
    query.includes("tangazo") ||
    query.includes("commercial")
  ) {
    const s = KHAKI_SERVICES.find(srv => srv.id === "video-production");
    let text = `Habari${greetingName}! Kwenye **${s?.title}**, Khaki Media inatengeneza video za sinema (Cinema Grade) kwa kutumia kamera za kisasa za **Sony Cinema Line (FX6 na FX3 4K)** pamoja na taa zenye hadhi ya juu za **Aputure Light Storm**.\n\n`;
    text += `### Vifurushi vya Video:\n`;
    s?.pricing.packages.forEach(pkg => {
      text += `- **${pkg.name}** — \`${pkg.price}\`\n  ${pkg.features.join(" • ")}\n`;
    });
    text += `\n### Huduma Zinazojumuishwa:\n`;
    text += `- Uongozaji wa Director na Cinematographer mzoefu\n`;
    text += `- Set za ndani ya studio (Aesthetic lighting, luxury background, green screen)\n`;
    text += `- Color grading ya kitaalamu (Davinci Resolve 10-bit)\n`;
    text += `- Matoleo ya 4K Master na promosheni za TikTok/Reels\n\n`;
    text += `Una project gani unayotaka tuifanyie kazi? Tuambie wazo lako au weka booking kupitia WhatsApp hapa chini.`;

    currentBooking.service = "Video Production";
    return { responseText: text, booking: currentBooking };
  }

  // 5. Photography
  if (query.includes("picha") || query.includes("photo") || query.includes("photoshoot") || query.includes("portrait")) {
    const s = KHAKI_SERVICES.find(srv => srv.id === "photography");
    let text = `Karibu sana${greetingName}! Huduma zetu za **${s?.title}** zinajumuisha upigaji picha za studio na outdoor kwa wasanii, models, matukio, harusi, na bidhaa za kibiashara.\n\n`;
    text += `### Vifurushi vya Picha:\n`;
    s?.pricing.packages.forEach(pkg => {
      text += `- **${pkg.name}** — \`${pkg.price}\`\n  ${pkg.features.join(" • ")}\n`;
    });
    text += `\n### Faida za Studio Yetu:\n`;
    text += `- Chumba cha mavazi (Dressing room) chenye kioo kikubwa cha vanity lighting\n`;
    text += `- Backdrops za rangi mbalimbali (White, Luxury Obsidian Black, Textures, Chroma Green)\n`;
    text += `- High-end retouched digital soft copies\n\n`;
    text += `Je, ungependa kupanga photoshoot ya tarehe gani?`;

    currentBooking.service = "Studio Photography";
    return { responseText: text, booking: currentBooking };
  }

  // 6. Podcast & Livestream
  if (query.includes("podcast") || query.includes("live") || query.includes("mubashara") || query.includes("stream")) {
    const s = KHAKI_SERVICES.find(srv => srv.id === "podcast-livestream");
    let text = `Habari${greetingName}! Kwenye **${s?.title}**, tumeweka miundombinu kamili inayokuwezesha kuanza au kuendesha kipindi chako kwa urahisi kabisa:\n\n`;
    text += `### Vifurushi:\n`;
    s?.pricing.packages.forEach(pkg => {
      text += `- **${pkg.name}** — \`${pkg.price}\`\n  ${pkg.features.join(" • ")}\n`;
    });
    text += `\n### Miundombinu Yaliyopo:\n`;
    text += `- Vipaza sauti hadi 4 vya **Shure SM7B** vyenye sauti ya broadcast\n`;
    text += `- Kamera 3 za 4K zenye video switcher ya kubadili pembe za video live\n`;
    text += `- Internet ya fiber ya kasi ya juu kwa livestream bila kukatika\n`;
    text += `- Kupata full episode pamoja na vipande vifupi vya Reels/TikTok/Shorts\n\n`;
    text += `Niambie siku unayotaka kurekodi kipindi chako ili nikuandalie booking!`;

    currentBooking.service = "Podcast & Livestreaming";
    return { responseText: text, booking: currentBooking };
  }

  // 7. Graphic Design & Branding
  if (query.includes("design") || query.includes("graphic") || query.includes("cover art") || query.includes("logo") || query.includes("poster") || query.includes("flier")) {
    const s = KHAKI_SERVICES.find(srv => srv.id === "graphic-design");
    let text = `Habari${greetingName}! Timu yetu ya graphics inahusika na kutengeneza utambulisho wa chapa yako na miundo ya kuvutia:\n\n`;
    text += `### Vifurushi:\n`;
    s?.pricing.packages.forEach(pkg => {
      text += `- **${pkg.name}** — \`${pkg.price}\`\n  ${pkg.features.join(" • ")}\n`;
    });
    text += `\nUnapata miundo ya ubora wa juu tayari kwa ajili ya mitandao ya kijamii, machapisho, na digital streaming platforms (3000x3000px standard).`;

    currentBooking.service = "Graphics & Branding";
    return { responseText: text, booking: currentBooking };
  }

  // 8. Location & Directions
  if (query.includes("wapi") || query.includes("location") || query.includes("mahali") || query.includes("directions") || query.includes("fika")) {
    let text = `Studio yetu ya **Khaki Media** inapatikana katika eneo tulivu na salama:\n\n`;
    text += `📍 **Anwani**: ${KHAKI_CONFIG.location.address}\n`;
    text += `🏙️ **Mji**: ${KHAKI_CONFIG.location.city}\n`;
    text += `🏢 **Ghorofa/Sehemu**: ${KHAKI_CONFIG.location.studioFloor}\n`;
    text += `🚗 **Maelekezo & Maegesho**: ${KHAKI_CONFIG.location.landmarks}\n\n`;
    text += `Kuna ulinzi wa masaa 24 na maegesho salama ya magari ya wateja wetu. Unakaribishwa sana!`;
    return { responseText: text, booking: currentBooking };
  }

  // 9. Working Hours
  if (query.includes("saa") || query.includes("muda") || query.includes("kazi") || query.includes("masaa") || query.includes("fungua") || query.includes("funga") || query.includes("hours")) {
    let text = `Hizi hapa ni ratiba zetu za kazi za **Khaki Media**:\n\n`;
    text += `🕒 **${KHAKI_CONFIG.workingHours.weekdays}**\n`;
    text += `🕒 **${KHAKI_CONFIG.workingHours.saturdays}**\n`;
    text += `🕒 **${KHAKI_CONFIG.workingHours.sundays}**\n`;
    text += `🌙 **${KHAKI_CONFIG.workingHours.overnight}**\n\n`;
    text += `Kama unahitaji session ya usiku mnene (Overnight) au siku ya Jumapili, tafadhali thibitisha booking yako mapema kwa kugusa kitufe cha WhatsApp hapa chini.`;
    return { responseText: text, booking: currentBooking };
  }

  // 10. General / FAQs / Default Greeting
  let defaultResponse = `Habari${greetingName}! Karibu sana **Khaki Media**. Mimi ni Khaki AI, msaidizi wako rasmi wa studio.\n\n`;
  defaultResponse += `Ninaweza kukusaidia papo hapo kuhusu:\n`;
  defaultResponse += `- 🎙️ **Studio Recording & Production** (Kurekodi nyimbo, beats na sauti)\n`;
  defaultResponse += `- 🎚️ **Mixing & Mastering** (Kiwango cha kimataifa cha streaming & radio)\n`;
  defaultResponse += `- 🎬 **Video Production** (Muziki 4K Cinema, matangazo & documentary)\n`;
  defaultResponse += `- 📸 **Studio Photography** (Portraits, fashion lookbook & bidhaa)\n`;
  defaultResponse += `- 📻 **Podcast & Livestreaming** (Seti ya kisasa ya kamera 3 na mic 4)\n`;
  defaultResponse += `- 📅 **Booking & Ratiba za Studio**\n\n`;
  defaultResponse += `Niambie, ungependa kupata taarifa zaidi kuhusu huduma gani au ungependa kuweka booking ya studio?`;

  return { responseText: defaultResponse, booking: currentBooking };
}
