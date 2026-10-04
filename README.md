# ✦ Khaki AI — Studio Assistant ya Khaki Media

Msaidizi wa studio wa **Khaki Media** (Dar es Salaam): kurekodi muziki, mixing &
mastering, video, photography, podcast na livestream, graphics na booking.

Imejengwa kwa **Next.js 14 · assistant-ui · Vercel AI SDK v7 · Google Gemini**,
juu ya muundo wa **Apple Human Interface Guidelines** — obsidian black na
dhahabu ya 24K.

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

> **Tumia pnpm, si npm.** `pnpm-workspace.yaml` inaweka `nodeLinker: hoisted`, na
> hilo ni lazima: mpangilio wa kawaida wa pnpm hutengeneza node_modules kwa
> *junction* kwenye Windows, na Node haiwezi kufuata junction kupata
> `styled-jsx` inayohitajika na `next` — `next build` inashindwa na
> `MODULE_NOT_FOUND`. `.npmrc` haitoshi; pnpm 11 inasoma config kutoka
> `pnpm-workspace.yaml`.

---

## Environment variables

| Variable | Lazima? | Maelezo |
| --- | --- | --- |
| `GEMINI_API_KEY` | Ndiyo, kwa AI halisi | Key kutoka <https://aistudio.google.com/apikey>. Bila yake app inajibu kutoka knowledge base ya studio. |
| `ADMIN_TOKEN` | **Ndiyo kabla ya ku-deploy** | Inalinda `/admin`. Bila token, `/admin` inaruhusu maombi ya localhost pekee; kwenye server ya umma inakataa kila mtu. |
| `NEXT_PUBLIC_WHATSAPP_NUMBER` | Hiari | Namba ya studio, tarakimu pekee (`255744000111`). |
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
| `src/lib/system-prompt.ts` | Kila neno analoambiwa AI. Linajengwa kutoka data, si kuandikwa kwa mkono. |
| `src/data/khakiKnowledge.ts` | Huduma, packages, bei, vifaa, FAQs. **Chanzo kikuu cha ukweli.** |
| `src/data/khaki-operations.ts` | Muda wa kukamilisha kazi, facilities, sheria, mipaka. |
| `src/config/khaki.ts` | Jina, anwani, saa, mawasiliano, quick actions. |
| `src/app/api/chat/route.ts` | Streaming, tools, failover ya modeli, offline fallback. |
| `src/lib/conversations.ts` | Uhifadhi wa mazungumzo kwenye kifaa cha mteja. |
| `src/components/brand/*` | Nembo, mwendo wake, na "thinking" ya studio. |

### Historia ya mazungumzo

Mazungumzo yanahifadhiwa kwenye `localStorage` ya kivinjari — hakuna server,
hakuna akaunti, na inafanya kazi kwenye hosting ya static. Kila mazungumzo
yanapata kichwa chake kutoka swali la kwanza, na yanapangwa kwa Leo / Jana /
Wiki hii / Mapema.

Vikomo: mazungumzo 40 ya hivi karibuni, ujumbe 200 kwa kila mazungumzo.
Likifikia kikomo cha storage, nusu ya kongwe zaidi inaachwa ili mazungumzo ya
sasa yasipoteze.

**Kidokezo cha kiufundi:** runtime inapewa `messages` **mara moja tu** kama
mbegu, kupitia `useRef`. Kama tungerudisha safu ya ujumbe iliyohifadhiwa kila
render, `useChat` ingeanza upya na kufuta jibu linalotiririka mara ya kwanza
tuandike kwenye storage.

### Kubadilisha kitu

- **Bei au huduma** → `khakiKnowledge.ts`. AI na kadi za UI zinabadilika pamoja.
- **Namba ya WhatsApp au jina la studio** → `/admin`, au env var.
- **Tabia ya AI** → `/admin` (temperature, urefu, maelekezo ya ziada).

### Modeli na failover

Google huratibu quota **kwa kila modeli**, si kwa key. Route inaanza na
`gemini-3.5-flash`, na kama hakijibu inaendelea na `3.6`, `3.7`, `3.8`,
`flash-latest`, `3.1-flash-lite` — bila maombi ya ziada ya kupima. Kama wote
wanakataa, inajibu kutoka knowledge base ya studio badala ya kuonyesha kosa.

Thinking budget imewekwa `low`: kwa swali kama "bei ya kurekodi ni ngapi?",
default budget ilichukua **39s**; `low` inachukua **4.6s**.

---

## Ubunifu (Design system)

| Kipengele | Thamani |
| --- | --- |
| Background | Obsidian `#000000` na safu 5 za juu (`--k-elev-1..5`) |
| Dhahabu | `#D4AF37` (msingi), champagne `#F5D061`, brass `#c9a227`–`#fbeeae` |
| Fonti | Fonti ya kifaa chenyewe: SF Pro kwenye Apple, Roboto kwenye Android, Segoe UI kwenye Windows |
| Materials | `.material-thin` / `-regular` / `-thick` / `-gold` |
| Mwendo | `--ease-fluid` (Apple sheet), `--ease-out-expo`, `--ease-spring` |
| Signature | Nembo ya KM inakuwa kipimo cha sauti (VU meter) wakati AI inafikiri |

**Vitu viwili vya kuzingatia unapoandika CSS:**

1. Usipe majina ya `bg-*` kwa class zako za gildi. `cn()` inapitia
   tailwind-merge, ambayo huona `bg-brass` kama background utility na
   kuiondoa ikikutana na `bg-metal-anim` — kitufe kiliacha rangi na maandishi
   meusi yakawa hayasomeki. Tumia `brass-fill` / `metal-fill` / `metal-sweep`.
2. Tailwind haitoi `/N` ya rangi kama N haipo kwenye scale ya `opacity`; thamani
   kama `/22` hupotea kimya kimya na ring hurudi kwenye bluu ya default.
   `tailwind.config.ts` ina kila namba 0–100 kwa sababu hii.

---

## Ukaguzi (Checks)

```bash
pnpm typecheck                  # tsc --noEmit
pnpm lint                       # next lint
pnpm build                      # production build

node tools/audit-classes.mjs    # kila class inatoa CSS? cn() inaondoa kitu?
node tools/bench-models.mjs     # kasi ya kila modeli
```

`audit-classes.mjs` ni muhimu: Tailwind huacha kimya kimya class isiyojulikana,
na tailwind-merge huondoa class inayogongana. Zote mbili hufanya UI ionekane
vibaya bila kosa lolote kuonekana. Script hii inazikamata zote.

---

## Ku-deploy

1. Weka `GEMINI_API_KEY` na `ADMIN_TOKEN` kwenye environment variables.
2. `/admin` haitaandika mipangilio kwenye server isiyoruhusu kuandika faili
   (kama Vercel) — panel inakuambia hivyo, na unatumia env vars badala yake.
3. Onyesho la UI: `/admin` inaonyesha kama AI inafanya kazi, modeli ipi, na
   inakuwezesha kupima key kwa mbofyo mmoja.

---

## Usalama

- API keys hazitoki kwenye browser kamwe; `/api/admin/settings` inarudisha
  zilizofichwa (`AQ.Ab8••••••••Qo5g`).
- `/admin` na `/api/admin/*` zinalindwa na `ADMIN_TOKEN` (cookie ya HttpOnly,
  ulinganisho wa constant-time). Bila token, localhost pekee.
- `.env.local` na `/data/` hazipo kwenye git.
