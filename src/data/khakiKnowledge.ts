/**
 * Khaki Media Business Knowledge Base
 * Structured knowledge powering Khaki AI's answers and reasoning.
 */

export interface ServiceDetail {
  id: string;
  title: string;
  swahiliTitle: string;
  category: "audio" | "video" | "photo" | "design" | "broadcast";
  description: string;
  highlights: string[];
  pricing: {
    startingAt: string;
    rateType: string;
    packages: Array<{
      name: string;
      price: string;
      features: string[];
    }>;
  };
}

export const KHAKI_SERVICES: ServiceDetail[] = [
  {
    id: "recording",
    title: "Music & Audio Recording",
    swahiliTitle: "Kurekodi Muziki & Audio",
    category: "audio",
    description: "Studio ya kisasa iliyotengwa kusaidia wasanii, watangazaji, na waandaaji wa maudhui kupata sauti ya kiwango cha kimataifa kwa kutumia vipaza sauti na vifaa vya daraja la juu (Neumann, Universal Audio, Shure).",
    highlights: [
      "Vocal tracking kwenye acoustic treated booth",
      "Vipaza sauti vya kiwango cha juu (Neumann U87, Shure SM7B)",
      "Pro Tools & Logic Pro DAWs zenye DSP plugins za UAD",
      "Sound Engineer mzoefu wa kukuongoza kwenye vocal delivery",
      "Huduma za beat production na instrumentation",
    ],
    pricing: {
      startingAt: "TZS 50,000 / Saa",
      rateType: "Kwa saa au kwa wimbo kamili",
      packages: [
        {
          name: "Hourly Session",
          price: "TZS 50,000 / Saa (Kiwango cha chini ni masaa 2)",
          features: ["Sound Engineer wa studio", "Vocal recording", "Rough mix mara baada ya session"],
        },
        {
          name: "Full Single Song Production",
          price: "TZS 250,000 – TZS 350,000",
          features: [
            "Session ya kurekodi bila kubanwa (hadi masaa 4)",
            "Professional Vocal tuning & alignment",
            "Professional Mixing & Mastering",
            "WAV + MP3 master na Instrumental versions",
            "Marekebisho 2 ya bure",
          ],
        },
        {
          name: "EP / Album Package",
          price: "Inaanzia TZS 1,200,000 (Nyimbo 5+)",
          features: [
            "Punguzo maalum la kifurushi",
            "Mastering ya project nzima kuwa na sound moja yenye nguvu",
            "Support ya usambazaji (metadata na ISRC codes ushauri)",
          ],
        },
      ],
    },
  },
  {
    id: "mixing-mastering",
    title: "Mixing & Mastering",
    swahiliTitle: "Mixing & Mastering ya Nyimbo",
    category: "audio",
    description: "Kufanya nyimbo zako zisikike safi, zenye uzito, na zenye viwango vya redio, runinga, na digital streaming platforms (Spotify, Apple Music, YouTube).",
    highlights: [
      "Analog-modelled saturation & EQ",
      "Dynamic control na vocal warmth",
      "Stereo widening na low-end clarity",
      "Mastering kulingana na viwango vya streaming (-14 LUFS standard)",
      "Unakaribishwa kutuma stems hata kama ulirekodi studio nyingine",
    ],
    pricing: {
      startingAt: "TZS 100,000 kwa wimbo",
      rateType: "Kwa wimbo",
      packages: [
        {
          name: "Standard Mix & Master",
          price: "TZS 120,000",
          features: ["Hadi stems 24", "Vocal tuning", "2 revision rounds", "Streaming ready output"],
        },
        {
          name: "Premium Deluxe Mix & Master",
          price: "TZS 200,000",
          features: ["Stems zisizo na kikomo", "Vocal tuning & timing alignment", "Performance stem tracks", "3 revision rounds"],
        },
      ],
    },
  },
  {
    id: "video-production",
    title: "Music Video & Commercial Video",
    swahiliTitle: "Utengenezaji wa Video za Muziki na Matangazo",
    category: "video",
    description: "Utengenezaji wa video za viwango vya sinema (Cinema Quality) kwa kutumia Sony FX Cinema line, taa za kisasa za Aputure, na color grading ya kiwango cha juu.",
    highlights: [
      "Sony FX6 na FX3 4K Cinema cameras zenye 10-bit 4:2:2 color",
      "Uongozaji wa kitaalamu (Director + Cinematographer)",
      "Seti za studio (Green screen, luxury dark aesthetic, RGB tubes, modern backdrops)",
      "Outdoor location scouting na vibali",
      "Professional Davinci Resolve color grading",
    ],
    pricing: {
      startingAt: "TZS 1,500,000",
      rateType: "Kulingana na ukubwa wa wazo na locations",
      packages: [
        {
          name: "Studio Performance Video",
          price: "TZS 1,200,000 – TZS 1,800,000",
          features: ["Shoot ndani ya studio ya Khaki", "Multi-look lighting setup", "4K Video master", "Short teasers za Reels/TikTok"],
        },
        {
          name: "Full Concept Music Video",
          price: "TZS 2,500,000 – TZS 5,000,000+",
          features: ["Script & storyboard", "2+ Locations", "Cast/dancers coordination", "Cinema lighting rig", "Color grading & VFX"],
        },
        {
          name: "Corporate & Brand Commercial",
          price: "TZS 2,000,000 – TZS 6,000,000",
          features: ["Company profile / TV Commercial", "Professional voice-over", "Interviews na B-roll", "Social media cutdowns"],
        },
      ],
    },
  },
  {
    id: "photography",
    title: "Studio & Outdoor Photography",
    swahiliTitle: "Upigaji Picha za Studio na Nje",
    category: "photo",
    description: "Picha zenye hadhi ya juu kwa wasanii, watu binafsi, matukio, mitindo ya mavazi, na chapa za kibiashara.",
    highlights: [
      "Lighting za kisasa zenye softboxes na modifiers maalum",
      "Backdrops tofauti: Seamless white, luxury black, artistic textures, green screen",
      "High-end beauty retouching isiyoharibu asili ya ngozi",
      "Chumba cha kubadilishia nguo chenye kioo kikubwa na taa maalum",
    ],
    pricing: {
      startingAt: "TZS 150,000",
      rateType: "Kwa session",
      packages: [
        {
          name: "Personal / Portrait Session",
          price: "TZS 150,000",
          features: ["Mavazi 2 (Outfit changes)", "Picha 10 zilizohaririwa kiwango cha juu (High-end retouched)", "Soft copies zote za awali"],
        },
        {
          name: "Celebrity / Brand Lookbook",
          price: "TZS 300,000 – TZS 500,000",
          features: ["Mavazi hadi 5", "Picha 25 retouched", "Lighting styles 3 tofauti", "Short behind-the-scenes video clip"],
        },
        {
          name: "Product & Commercial Photography",
          price: "Kuanzia TZS 250,000",
          features: ["Clean white background au lifestyle staging", "High resolution kwa ajili ya billboards na e-commerce"],
        },
      ],
    },
  },
  {
    id: "podcast-livestream",
    title: "Podcast Production & Livestreaming",
    swahiliTitle: "Kurekodi Podcast na Kurusha Mubashara (Livestream)",
    category: "broadcast",
    description: "Seti kamili ya kisasa kwa ajili ya waandaaji wa podcast, maongezi, mafunzo ya mtandaoni, na matukio ya kurushwa mubashara (YouTube, Facebook, LinkedIn).",
    highlights: [
      "Hadi vipaza sauti 4 vya Shure SM7B",
      "Multi-camera 4K switcher kwa mabadiliko ya angle papo hapo",
      "Seti yenye fanicha za kisasa na taa za kupendeza",
      "Live audio mixing ili sauti itoke ikiwa imenyooka bila kelele",
      "Utoaji wa full episode pamoja na viral short clips (Reels/TikTok/Shorts)",
    ],
    pricing: {
      startingAt: "TZS 100,000 / Saa",
      rateType: "Kwa saa ya studio",
      packages: [
        {
          name: "Audio-Only Podcast",
          price: "TZS 100,000 / Saa",
          features: ["4 Shure microphones", "Raw audio stems au stereo master", "Mhudumu wa sauti studio"],
        },
        {
          name: "Full Video Podcast (Multi-Cam 4K)",
          price: "TZS 250,000 / Saa",
          features: ["Multi-cam 4K switcher recording", "Taa za kisasa na studio set", "Video editing kamili ya episode", "Clips 3 fupi za social media"],
        },
        {
          name: "Event Livestreaming Rig",
          price: "Kuanzia TZS 800,000 kwa tukio",
          features: ["Multi-camera live broadcast nje au ndani", "Redundant internet backup", "Graphics na lower-thirds branding"],
        },
      ],
    },
  },
  {
    id: "graphic-design",
    title: "Graphic Design & Brand Identity",
    swahiliTitle: "Graphics, Cover Art & Utambulisho wa Chapa",
    category: "design",
    description: "Ubunifu wa picha na nyaraka za kidijitali unaojenga mvuto wa haraka kwa watazamaji na wasikilizaji wako.",
    highlights: [
      "Music Cover Art (Spotify/Apple Music specifications)",
      "Event Posters na Social Media Flyiers",
      "Logo design na Visual Brand Guideline",
      "Motion graphics & animated cover art",
    ],
    pricing: {
      startingAt: "TZS 70,000",
      rateType: "Kwa mradi",
      packages: [
        {
          name: "Single Cover Art",
          price: "TZS 70,000 – TZS 150,000",
          features: ["Digital streaming standard resolution (3000x3000px)", "Teaser format ya Instagram/Status", "Sampuli 2 za kuchagua"],
        },
        {
          name: "Full Brand Package",
          price: "TZS 350,000 – TZS 800,000",
          features: ["Logo, typography, color palette", "Stationery & social media templates", "Vector files zote (AI, EPS, PNG, PDF)"],
        },
      ],
    },
  },
];

export const KHAKI_STUDIO_SPECS = {
  acoustics: "Studio acoustics zimejengwa kwa viwango vya kimataifa na floating floor na diffusers kuzuia noise na echo.",
  hardware: [
    "Universal Audio Apollo x8p Heritage Edition",
    "Neumann U87 Ai Large-Diaphragm Condenser Microphone",
    "Shure SM7B Dynamic Microphones (x4)",
    "AKG C414 XLS Multi-pattern Condenser",
    "Genelec 8040B Studio Monitors",
    "Yamaha HS8 Reference Monitors",
    "Beyerdynamic DT 770 Pro & DT 990 Pro Monitoring Headphones",
  ],
  camerasAndLighting: [
    "Sony FX6 Full-Frame Cinema Camera (4K 120fps)",
    "Sony FX3 Cinema Line Camera",
    "Sony A7S III Camera",
    "Sony G-Master Lenses: 24-70mm f/2.8 II, 70-200mm f/2.8, 50mm f/1.2 GM, 85mm f/1.4",
    "Aputure Light Storm 600d Pro & 300x Bi-Color",
    "Amaran T2c & T4c RGBWW Tube Lights",
    "DJI Ronin RS3 Pro Gimbal & Wireless Video Transmission",
  ],
  amenities: [
    "High-speed fiber optical Wi-Fi (100 Mbps+)",
    "Private artist green room & air-conditioned lounge",
    "Dedicated dressing room yenye full-length lighted vanity mirrors",
    "Refreshment bar (Kahawa, chai, maji baridi)",
    "Secure dedicated parking with 24/7 CCTV surveillance",
  ],
};

export const KHAKI_FAQS = [
  {
    question: "Je, ninaweza kuja na beat yangu mwenyewe?",
    answer: "Ndio kabisa! Unaweza kuja na beat yako kwenye flash drive au kuituma kabla ya session kupitia WhatsApp au email. Beat inaweza kuwa WAV, MP3 au track stems (kama unataka tuifanyie mixing bora zaidi).",
  },
  {
    question: "Je, mnafanya mixing & mastering ya nyimbo zilizorekodiwa studio nyingine?",
    answer: "Ndio. Wasanii wengi hurekodi mikoani au studio nyingine na kututumia track stems (audio tracks) kwa njia ya Google Drive au WeTransfer. Tunazifanyia professional mix & master na kukurudishia zikiwa tayari kwa redio na streaming.",
  },
  {
    question: "Utaratibu wa kufanya booking ukoje?",
    answer: "Ili kulinda nafasi yako (slot), tunapokea amana (deposit) ya 50% ya gharama ya session. Salio linalolipwa session ikikamilika au kabla ya kuchukua kazi ya mwisho. Unaweza kubonyeza kitufe cha 'Book kupitia WhatsApp' hapa kwenye chat.",
  },
  {
    question: "Video ya muziki au tangazo huchukua muda gani kukamilika baada ya shooting?",
    answer: "Kwa video za kawaida za studio au matangazo mafupi, first cut (toleo la kwanza) huwa tayari ndani ya siku 4 hadi 7 za kazi. Kwa video kubwa zenye VFX na locations nyingi, huchukua siku 10 hadi 14 za kazi.",
  },
  {
    question: "Studio ipo wapi na mnafungua saa ngapi?",
    answer: "Studio yetu ipo Kinondoni / Victoria, Dar es Salaam (Plot 42, 1st Floor). Tunafungua Jumatatu hadi Ijumaa (08:30 Asubuhi – 09:00 Usiku), Jumamosi (09:00 Asubuhi – 08:00 Usiku), na Jumapili kwa appointment. Pia kuna session za usiku mnene (Overnight) kuanzia 10:00 Usiku hadi 06:00 Alfajiri.",
  },
  {
    question: "Je, naweza kuahirisha session yangu niliyoweka booking?",
    answer: "Ndio, unaruhusiwa kuahirisha (reschedule) session yako bure bila kupoteza amana yako ikiwa utatupa taarifa angalau masaa 24 kabla ya muda uliopangwa.",
  },
];
