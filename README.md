# ✦ Khaki AI — Msaidizi wa Khaki Media

Msaidizi wa mazungumzo kwa **Khaki Media Pro Pictures** (Kigamboni, Dar es
Salaam): picha na video za **sendoff na harusi**, **kupiga video mpaka final**,
na **kazi za audio**.

Imejengwa kwa **Next.js 15.5 · React 19 · assistant-ui · Vercel AI SDK v7 ·
Google Gemini**, juu ya muundo wa **Apple Human Interface Guidelines** —
obsidian black na dhahabu ya 24K, rangi ya brand bila kubadilika.

---

## Kuanza (Quickstart)

```bash
pnpm install
cp .env.local.example .env.local     # weka GEMINI_API_KEY na ADMIN_TOKEN
pnpm dev
```

- Chat: <http://localhost:3000>
- Mipangilio: <http://localhost:3000/admin>

Kwa production: `pnpm build && pnpm start`

Kukagua kila kitu kabla ya ku-deploy:

```bash
pnpm build && pnpm check            # typecheck, lint, tests, audits
```

> **Tumia pnpm, si npm.** `pnpm-workspace.yaml` inaweka `nodeLinker: hoisted`, na
> hilo ni lazima: mpangilio wa kawaida wa pnpm hutengeneza node_modules kwa
> *junction* kwenye Windows, na Node haiwezi kufuata junction kupata
> `styled-jsx` inayohitajika na `next`. `.npmrc` haitoshi; pnpm 11 inasoma
> config kutoka `pnpm-workspace.yaml`.

> **Usihariri faili za UTF-8 kwa PowerShell 5.1.** `Get-Content` bila BOM
> inasoma kama Windows-1252, na `WriteAllText` inaandika maandishi yaliyoharibika
> tena. Hilo liliharibu dashi na herufi za Kiswahili kwenye faili tatu, na
> uharibifu uliingia git kabla ya mtu kuona. Tumia zana inayoshughulikia UTF-8,
> au Node.

---

## Environment variables

| Variable | Lazima? | Maelezo |
| --- | --- | --- |
| `GEMINI_API_KEY` | Ndiyo, kwa AI halisi | Key kutoka <https://aistudio.google.com/apikey>. Bila yake app inajibu kutoka data ya studio iliyoandikwa kwenye code. |
| `ADMIN_TOKEN` | **Ndiyo kabla ya ku-deploy** | Inalinda `/admin`. Bila token, `/admin` inaruhusu maombi ya localhost pekee; kwenye server ya umma inakataa kila mtu. |
| `NEXT_PUBLIC_WHATSAPP_NUMBER` | Hiari | Namba ya studio, tarakimu pekee — inapita ile iliyo kwenye `src/config/khaki.ts`. |
| `NEXT_PUBLIC_SITE_URL` | Hiari | URL halisi ya tovuti. Bila hii, preview ya link inaonyesha localhost. |
| `OPENAI_API_KEY` | Hiari | Kama unataka kulinganisha majibu ya GPT. |
| `KHAKI_SETTINGS_PATH` | Hiari | Mahali pa `runtime-settings.json` (default `./data/`). |

**Muhimu kuhusu quota:** key ya bure ya Google ina kikomo cha **maombi 20 kwa siku
kwa kila model**. Hiyo haitoshi kwa mteja wa kila siku. Ukiwa unatumia kwa biashara
halisi, washa billing kwenye Google AI Studio.

---

## Jinsi inavyofanya kazi

```
Browser
  └─ AssistantChatTransport  →  POST /api/chat   (AI SDK UI message stream)
       └─ Gemini (modeli moja kati ya sita)
            ├─ tool: onyesha_bei      → kadi ya bei
            └─ tool: andaa_booking    → kadi ya booking + WhatsApp
```

**Faili kuu**

| Faili | Kazi |
| --- | --- |
| `src/config/khaki.ts` | Jina, anwani, **saa za kufungua**, mawasiliano, social, quick actions. |
| `src/data/khakiKnowledge.ts` | Huduma tatu, packages 8, bei, FAQs. **Chanzo kikuu cha bei.** |
| `src/data/khaki-operations.ts` | Mipaka, vitu vya kupeleka kwa timu, jibu la akiba. |
| `src/lib/system-prompt.ts` | Kila neno analoambiwa AI. Linajengwa kutoka data, si kuandikwa kwa mkono. |
| `src/lib/studio-hours.ts` | Saa za Kiswahili, kiashiria cha wazi/imefungwa. |
| `src/app/api/chat/route.ts` | Streaming, tools, failover ya modeli, offline fallback. |
| `src/lib/conversations.ts` | Uhifadhi wa mazungumzo kwenye kifaa cha mteja. |
| `src/components/brand/*` | Nembo, mwendo wake, na "thinking" ya studio. |

### Historia ya mazungumzo

Mazungumzo yanahifadhiwa kwenye `localStorage` ya kivinjari — hakuna server,
hakuna akaunti. Kila mazungumzo yanapata kichwa chake kutoka swali la kwanza, na
yanapangwa kwa Leo / Jana / Wiki hii / Mapema. Kadi za bei na booking
zinahifadhiwa pia, kwa hiyo zinaonekana tena baada ya reload.

Vikomo: mazungumzo 40 ya hivi karibuni, ujumbe 200 kwa kila mazungumzo. Likifikia
kikomo cha storage, nusu ya kongwe zaidi inaachwa ili mazungumzo ya sasa
yasipoteze.

**Kidokezo cha kiufundi:** runtime inapewa `messages` **mara moja tu** kama
mbegu, kupitia `useRef`. Kama tungerudisha safu ya ujumbe iliyohifadhiwa kila
render, `useChat` ingeanza upya na kufuta jibu linalotiririka.

### Kubadilisha kitu

- **Bei au package** → `khakiKnowledge.ts`. AI, kadi za UI na majibu ya akiba
  zinabadilika pamoja.
- **Saa za kufungua** → `workingHours.schedule` kwenye `khaki.ts`. Kiashiria cha
  wazi/imefungwa na maneno ya AI vyote vinatoka hapo.
- **Namba ya WhatsApp, jina, au tabia ya AI** → `/admin`.
- **Instagram / TikTok / YouTube** → `social` kwenye `khaki.ts`. Instagram na
  TikTok hutumia `khaki_media_pro`; **YouTube hutumia `khakimediapro`** — link
  yenye underscore haipo.

### Modeli na failover

Google huratibu quota **kwa kila modeli**, si kwa key. Route inaanza na
`gemini-3.5-flash`, na kama hakijibu inaendelea na `3.6`, `3.7`, `3.8`,
`flash-latest`, `3.1-flash-lite` — bila maombi ya ziada ya kupima. Kama wote
wanakataa, inajibu kutoka data ya studio badala ya kuonyesha kosa.

Thinking budget imewekwa `low`: kwa swali la kawaida, default budget ilichukua
**39s**; `low` inachukua **4.6s**.

System prompt ni **herufi ~6,550 (~1,820 tokens)** kwa kila ujumbe. Ilianzia
10,588 (~2,940) — kila kitu kilichoongezwa hapo kinagharimu pesa kwenye kila
ujumbe wa mteja, kwa hiyo `measurePrompt()` inapima, na `/admin` inaonyesha
gharama kwa kila sehemu.

---

## Ubunifu (Design system)

| Kipengele | Thamani |
| --- | --- |
| Background | Obsidian `#000000` na safu za juu (`--k-elev-*`) |
| Dhahabu | `--gold-500` `#d4af37` (msingi). Kiwango kamili: `#fffbef` `#fff4cf` `#fbe7a8` `#f2d47a` `#e5be53` `#d4af37` `#b8912a` `#8d6c17` `#5c440a` |
| Brass sweep | `--gold-metal`: `#6b4f0c` → `#b8912a` → `#f2d47a` → `#fff6da` → `#f2d47a` → `#c99f2c` → `#8d6c17` → `#d4af37` |
| Fonti | Fonti ya kifaa chenyewe: SF Pro kwenye Apple, Roboto kwenye Android, Segoe UI kwenye Windows. **Hakuna web font.** |
| Materials | `.material-thin` / `-regular` / `-gold` |
| Mwendo | `--ease-fluid` (Apple sheet), `--ease-out-expo` |
| Signature | Nembo ya KM inakuwa kipimo cha sauti (VU meter) wakati AI inafikiri |

> Rangi hizi zilikuwa zimeandikwa vibaya hapa kwa muda mrefu — `#F5D061`,
> `#c9a227` na `#fbeeae` hazipo kwenye code kabisa. Kama unabadilisha palette,
> badilisha `globals.css`; `pnpm audit:readme` inakagua jedwali hili.

**Mambo matatu ya kuzingatia unapoandika CSS:**

1. **Usipe majina ya `bg-*` kwa class zako za gildi.** `cn()` inapitia
   tailwind-merge, ambayo huona `bg-brass` kama background utility na kuiondoa
   ikikutana na `bg-metal-anim` — kitufe kiliacha rangi na maandishi meusi
   yakawa hayasomeki. Tumia `brass-fill` / `metal-fill` / `metal-sweep`.
2. **Tailwind haitoi `/N` ya rangi kama N haipo kwenye scale ya `opacity`.**
   Thamani kama `/22` hupotea kimya kimya na ring hurudi kwenye bluu ya default.
   `tailwind.config.ts` ina kila namba 0–100 kwa sababu hii.
3. **Usiweke animation mahali pa pili.** Keyframes za `animate-*` zinaishi
   `tailwind.config.ts`. `globals.css` ilikuwa na nakala saba zisizotumika
   (`k-breathe`, `k-halo`, `k-spin`, `k-caret`, `k-vu`, `k-shimmer`, `k-dash`)
   zenye majina na namba zile zile — kuhariri moja kulionekana kama
   kunabadilisha animation, na hakukuwa na kilichobadilika. `pnpm audit:css`
   inazuia hilo kirudi.

---

## Ukaguzi (Checks)

```bash
pnpm check                       # zote zilizo chini ya mstari mmoja
```

| Amri | Inakagua |
| --- | --- |
| `pnpm typecheck` | `tsc --noEmit` |
| `pnpm lint` | `next lint` |
| `pnpm test` | 138 tests: saa za Kiswahili, link ya booking, bei, uhifadhi wa mazungumzo, ulinzi wa `/admin`, funguo za API, majibu ya akiba, vikomo vya ombi, kurudia kwa modeli |
| `pnpm audit:studio` | Hakuna taarifa za kubuni zilizobaki, na hakuna sehemu ya API key |
| `pnpm audit:readme` | Kila dai la README linathibitishwa dhidi ya code |
| `pnpm audit:deps` | Kila import ina nyumbani; hakuna kifurushi kinachotumika bila kutangazwa |
| `pnpm audit:assets` | Kila picha inayotajwa ipo, na ukubwa uliotangazwa ni wa kweli |
| `pnpm audit:classes` | Kila class inatoa CSS; `cn()` haiondoi kitu |
| `pnpm audit:css` | Hakuna keyframes iliyokufa au iliyofafanuliwa mara mbili |

Mbili zinahitaji server inayotumika:

```bash
pnpm build && pnpm start
pnpm audit:a11y                  # axe-core: landmarks, contrast, labels
pnpm audit:answers               # AI inakataa dai za uongo? (inahitaji key)
pnpm measure:load fast3g         # muda wa kupakia kwenye 3G/4G
pnpm measure:response            # muda hadi neno la kwanza la AI
pnpm measure:thinking            # modeli ipi + thinking ipi inaanza haraka
pnpm bench:models                # kasi ya kila modeli
```

Kwa nini hizi zipo: Tailwind huacha **kimya kimya** class isiyojulikana, na
tailwind-merge huondoa class inayogongana. Zote mbili hufanya UI ionekane vibaya
bila kosa lolote kuonekana. Vivyo hivyo, keyframes iliyokufa inaonekana kama
inafanya kazi. Script hizi zinazikamata zote.

---

## Ku-deploy

1. Weka `GEMINI_API_KEY`, `ADMIN_TOKEN`, na `NEXT_PUBLIC_SITE_URL` kwenye
   environment variables.
2. `/admin` haitaandika mipangilio kwenye server isiyoruhusu kuandika faili
   (kama Vercel) — panel inakuambia hivyo, na unatumia env vars badala yake.
3. `/admin` inaonyesha kama AI inafanya kazi, modeli ipi, gharama ya system
   prompt, na inakuwezesha kupima key kwa mbofyo mmoja.

---

## Usalama

- API keys hazitoki kwenye browser kamwe; `/api/admin/settings` inarudisha
  zilizofichwa kabisa.
- `/admin` na `/api/admin/*` zinalindwa na `ADMIN_TOKEN` (cookie ya HttpOnly,
  ulinganisho wa constant-time). Bila token, localhost pekee.
- `.env.local` na `/data/` hazipo kwenye git.
- Dependencies zinakaguliwa kwa `pnpm audit`. Kwa sasa: **0 critical**.
