# ✦ Khaki AI — Project Handoff Documentation

> **Khaki AI** ni AI Studio Receptionist na Assistant rasmi wa **Khaki Media** aliyetengenezwa kwa viwango vya kimataifa vya **Apple Human Interface Guidelines (HIG)** na **Assistant-UI / ChatGPT UX**, akitumia **Vercel AI SDK** na **Google Gemini (gemini-2.5-flash)**.

---

## 📌 Muhtasari wa Mradi (Executive Summary)

Khaki AI humwezesha mteja anayetembelea studio kupata taarifa za kina, bei, vifurushi, na kufanya booking ya haraka bila kulazimika kuunda akaunti wala kuingia na password.

| Kipengele | Maelezo |
| :--- | :--- |
| **Brand Identity** | Deep Obsidian Black (`#000000`), Metallic 24K Gold (`#D4AF37`), Champagne Gold (`#F5D061`) |
| **Design Language** | Apple HIG Liquid Glassmorphism, SF Pro typography, Spring micro-interactions |
| **AI Engine** | Vercel AI SDK (`ai` v7) + Google Gemini (`gemini-2.5-flash`), ikiwa na fallback ya OpenAI au Built-in Knowledge Engine |
| **Booking Flow** | 1-Click WhatsApp pre-filled booking card (PassKit style) |
| **Admin Panel** | macOS System Settings style panel kwenye `/admin` ya kupima na kubadilisha API keys |
| **Mobile Support** | Slide-over drawer, iPhone safe area insets (`env(safe-area-*)`), 44px minimum tap targets |

---

## 🏗️ Usanifu wa Mfumo (Architecture & Tech Stack)

* **Framework:** Next.js 14.2 (App Router)
* **Lugha:** TypeScript na React 18
* **Styling:** Tailwind CSS + Custom Apple Glassmorphism Utilities
* **AI Orchestration:** Vercel AI SDK (`ai`), `@ai-sdk/google`, `@ai-sdk/openai`
* **Icons:** Lucide React
* **Markdown:** `react-markdown` + `remark-gfm`
* **Audio & Speech:** Web Speech API (Voice Dictation) + SpeechSynthesis (Text-to-Speech)

---

## 💎 Vipengele Muhimu Vilivyojengwa (Core Features)

### 1. Nembo Rasmi na "Thinking Aura" ya Dhahabu ([`KhakiLogo.tsx`](src/components/ui/KhakiLogo.tsx))
* Nembo rasmi ya Khaki Media (`/images/khaki-logo.png`) imewekwa na inasaidia ukubwa mbalimbali (`sm`, `md`, `lg`, `xl`).
* **Ambient Golden Halo:** Mwangaza wa dhahabu unaovuta pumzi (*breathing aura*) wakati AI inatayarisha jibu.
* **Audio Frequency Soundwaves:** Mistari 4 ya sauti ya Apple inayocheza kwa mtiririko wakati AI inajibu au kusoma kwa sauti.
* **Orbital Ring:** Pete inayozunguka ya chembechembe za dhahabu (*particle ring*) wakati wa kufikiria.

### 2. Mazungumzo ya ChatGPT / Assistant-UI ([`ChatGPT.tsx`](src/components/assistant-ui/ChatGPT.tsx))
* **Centered Welcome Screen:** Inamkaribisha mteja kwa jina au kumuuliza jina bila kulazimisha usajili.
* **Quick Action Pills:** Vifungo vidogo vya frosted glass kwa ajili ya huduma kuu:
  * 🎙️ *Studio Recording*
  * 🎬 *Music & Commercial Video*
  * 🎚️ *Mixing & Mastering*
  * 📸 *Studio Photography*
  * 📻 *Podcast & Livestreaming*
  * 🎨 *Graphic Design & Branding*
  * 📅 *Book Studio Sasa*
* **Liquid Glass Composer:** Textarea inayojirefusha kiotomatiki, kitufe cha Voice Dictation (Mic), na kitufe cha duara cha 24K Gold.
* **Message Controls:** Nakili (Copy), Thumbs Up/Down, Soma kwa sauti (TTS), Hamisha Markdown (.md), na Rudia kutengeneza jibu (Regenerate).

### 3. Kadi ya Booking ya Apple PassKit ([`BookingCard.tsx`](src/components/BookingCard.tsx))
* Mteja anapoeleza nia ya booking au kutaja huduma, AI inachakata kiotomatiki:
  * Jina la mteja
  * Huduma anayotaka
  * Tarehe au siku
  * Muda
  * Maelezo ya ziada
* Kadi inatoa nafasi ya kubadilisha taarifa (*Hariri*), kisha kubonyeza kitufe kikubwa cha **📲 Book kupitia WhatsApp**.
* WhatsApp inafunguka na ujumbe kamili ukiwa tayari umeandikwa bila mteja kuhitaji kuandika upya.

### 4. macOS System Settings Admin Panel ([`/admin`](src/app/admin/page.tsx))
* Inapatikana moja kwa moja kwenye `/admin`.
* Inamruhusu mmiliki kubadilisha:
  * **AI Provider:** Otomatiki, Google Gemini, OpenAI, au Built-in Engine.
  * **API Keys:** Uwekaji salama na uwezo wa kuficha/kuonyesha password.
  * **Pima Key:** Kitufe cha kupima uhalali wa API key papo hapo kabla ya kuhifadhi.
  * **WhatsApp Number:** Nambari ya simu ya studio inayopokea booking.

---

## ⚙️ Mipangilio ya Mazingira (Environment Variables)

Unda faili la `.env.local` kwenye folda kuu (tumia `.env.local.example` kama mfano):

```env
# Nambari ya WhatsApp ya Khaki Media (muundo wa kimataifa bila alama ya + au nafasi)
NEXT_PUBLIC_WHATSAPP_NUMBER=255744000111

# Google Gemini API Key (Inapendekezwa)
GEMINI_API_KEY=your_gemini_api_key_here

# OpenAI API Key (Hiari)
# OPENAI_API_KEY=sk-proj-...
```

> **MUHIMU:** Model ya Google Gemini inayotumika na kufanya kazi kikamilifu ni `gemini-2.5-flash`.

---

## 🚀 Kuanzisha na Kuendesha Mradi (Local Run & Production)

### 1. Kufunga Dependencies
```bash
npm install
```

### 2. Kuanzisha Development Server
```bash
npm run dev
```
Fungua kivinjari chako kwenye: `http://localhost:3000`

### 3. Kujenga Production Build
```bash
npm run build
```

### 4. Kuanzisha Production Server
```bash
npm start -- -p 3000
```

---

## 📂 Muundo wa Mafaili (Directory Structure)

```
KHAKI AI/
├── public/
│   └── images/
│       └── khaki-logo.png          # Nembo rasmi ya Khaki Media
├── src/
│   ├── app/
│   │   ├── admin/
│   │   │   └── page.tsx            # macOS-style Admin Settings Page
│   │   ├── api/
│   │   │   ├── admin/
│   │   │   │   ├── settings/route.ts  # API ya kusoma & kuhifadhi mipangilio
│   │   │   │   └── test/route.ts      # API ya kupima API keys
│   │   │   └── chat/route.ts       # Streaming endpoint inayotumia Vercel AI SDK
│   │   ├── globals.css             # Apple Liquid Glass tokens & animations
│   │   ├── layout.tsx              # Root Layout na Apple viewport settings
│   │   └── page.tsx                # Home Page (ChatGPT Assistant-UI)
│   ├── components/
│   │   ├── assistant-ui/
│   │   │   ├── ChatGPT.tsx         # Kiini cha Assistant-UI ChatGPT canvas
│   │   │   └── elements/           # Reusable tooltip icon buttons & markdown
│   │   ├── ui/
│   │   │   └── KhakiLogo.tsx       # Nembo yenye thinking aura & soundwaves
│   │   └── BookingCard.tsx         # PassKit style 1-click WhatsApp booking card
│   ├── config/
│   │   ├── khaki.ts                # Mipangilio mikuu ya studio & WhatsApp builder
│   │   └── runtime-settings.example.json # Template salama ya settings
│   ├── data/
│   │   └── khakiKnowledge.ts       # Maarifa kamili ya huduma, bei & studio
│   ├── lib/
│   │   ├── khakiEngine.ts          # Injini ya utambuzi wa majina & nia
│   │   ├── settings.ts             # Usomaji wa settings na mask ya API keys
│   │   └── utils.ts                # Tailwind utility helpers (cn)
│   └── types/
│       └── chat.ts                 # TypeScript types za ujumbe & booking
├── HANDOFF.md                      # Nyaraka hii ya makabidhiano
├── README.md                       # Maelezo ya GitHub Repository
└── tailwind.config.ts              # Apple HIG color palette & soundwave keyframes
```

---

## 🌐 Maelekezo ya Ku-Deploy (Deployment Guide)

### Ku-Deploy Vercel (Inapendekezwa)
1. Ingia kwenye [vercel.com](https://vercel.com)
2. Chagua **Add New...** -> **Project** kisha chagua repository ya `khaki-ai`.
3. Kwenye sehemu ya **Environment Variables**, weka:
   * `GEMINI_API_KEY`: `your_gemini_api_key_here`
   * `NEXT_PUBLIC_WHATSAPP_NUMBER`: `255744000111`
4. Bonyeza **Deploy**.

---

## 📞 Mawasiliano & Usaidizi
* **Studio:** Khaki Media
* **Simu / WhatsApp:** `+255 744 000 111`
* **Mahali:** Dar es Salaam, Tanzania

*Hati hii imeandaliwa kama muongozo rasmi wa makabidhiano ya mradi wa Khaki AI.*
