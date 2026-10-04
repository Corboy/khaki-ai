# ✦ Khaki AI — AI Studio Assistant for Khaki Media

[![Next.js 14](https://img.shields.io/badge/Next.js-14.2-black?style=flat&logo=next.js)](https://nextjs.org/)
[![Vercel AI SDK](https://img.shields.io/badge/Vercel%20AI%20SDK-v7-black?style=flat&logo=vercel)](https://ai-sdk.dev/)
[![Google Gemini](https://img.shields.io/badge/Google%20Gemini-2.5--flash-D4AF37?style=flat&logo=google)](https://aistudio.google.com/)
[![Apple HIG](https://img.shields.io/badge/Design-Apple%20HIG%20Liquid%20Glass-black)](https://developer.apple.com/design/resources/)

**Khaki AI** ni web application ya daraja la juu ya AI studio receptionist/assistant iliyotengenezwa kwa ajili ya biashara ya **Khaki Media** (Recording, Mixing & Mastering, 4K Video Production, Studio Photography, Podcast & Livestreaming, na Graphic Design).

Mradi huu unachanganya uzuri wa muundo wa **Apple Human Interface Guidelines (HIG)** (Obsidian Black `#000000` + Metallic 24K Gold `#D4AF37` + Liquid Glassmorphism) na urahisi wa mazungumzo ya **ChatGPT** kupitia **Assistant-UI** na **Vercel AI SDK**.

---

## 🌟 Sifa Kuu za Khaki AI (Key Highlights)

* 🎨 **Utambulisho wa Khaki Media (Apple HIG 100x Upgrade):**
  * Rangi ya msingi ya obsidian black safi (`#000000`).
  * Mguso murua wa dhahabu (`#D4AF37` na `#F5D061`) kwenye accents, logo, na vidhibiti.
  * Liquid glassmorphism (`backdrop-blur-2xl`, specular borders, na dynamic shadows).
* ✦ **Nembo Rasmi yenye Thinking Aura & Soundwaves:**
  * Nembo rasmi ya duara ya Khaki Media yenye *ambient golden breathing halo* wakati AI inafikiria.
  * Mistari 4 ya sauti ya Apple (*audio frequency visualizer*) inayocheza kwa uhai wakati jibu linatiririka.
* 💬 **Uzoefu wa ChatGPT / Assistant-UI:**
  * Skrini ya kwanza safi na ya kisasa ya makaribisho yenye *Quick Action Pills*.
  * Ujumbe wa mteja katika kadi za *Apple Dark Glass* (`#1c1c1e`).
  * Ujumbe wa AI wenye typography safi ya Markdown, kadi za bei, na vidhibiti vya Nakili, Soma kwa sauti (TTS), na Hamisha kama Markdown.
* 📲 **1-Click WhatsApp Booking Flow:**
  * Utambuzi wa kiotomatiki wa Jina la mteja, Huduma, Tarehe, Muda, na Maelezo.
  * Kadi ya kifahari ya Apple PassKit yenye kitufe cha **`📲 Book kupitia WhatsApp`** kinachofungua WhatsApp ikiwa na ujumbe uliotayarishwa tayari.
* 📱 **Uzoefu Mahiri wa Simu (Mobile-First Ergonomics):**
  * Slide-over drawer yenye backdrop blur inayofunguka bila kuathiri muonekano.
  * Ulinzi wa notch na home indicator ya iPhone (`env(safe-area-inset-*)`).
  * Vitufe vyenye ukubwa wa `44px+` kulingana na miongozo ya Apple.
* 🛠️ **macOS System Settings Admin Panel (`/admin`):**
  * Usimamizi na upimaji wa moja kwa moja wa API Keys (Google Gemini `gemini-2.5-flash`, OpenAI `gpt-4o-mini`).
  * Mabadiliko ya papo hapo ya nambari ya simu ya studio ya WhatsApp.

---

## 🚀 Kuanza Haraka (Quickstart)

```bash
# 1. Sakinisha dependencies
npm install

# 2. Weka mazingira (nakili template)
cp .env.local.example .env.local

# 3. Anzisha development server
npm run dev

# 4. Kujenga toleo la uzalishaji (production)
npm run build && npm start
```

Fungua kwenye kivinjari:
👉 **[http://localhost:3000](http://localhost:3000)**  
👉 **[http://localhost:3000/admin](http://localhost:3000/admin)** (Admin Settings)

---

## 📑 Nyaraka Kamili ya Makabidhiano (Handoff)

Soma faili la [`HANDOFF.md`](./HANDOFF.md) kwa maelezo ya kina ya usanifu, muundo wa mafaili, mipangilio ya API keys, na jinsi ya ku-deploy Vercel.
