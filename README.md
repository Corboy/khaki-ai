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

Ku-deploy kwenye Cloudflare Workers, kupitia OpenNext:

```bash
pnpm cf:build                       # Next standalone build + Worker bundle
pnpm cf:preview                     # kuiangalia kwa Worker wa ndani
pnpm cf:deploy                      # cf:build kisha OpenNext deploy
```

Kwa Cloudflare Workers Builds, tumia `pnpm cf:build` kama **Build command** na
`pnpm exec opennextjs-cloudflare deploy` kama **Deploy command**.

> Cloudflare Workers Builds huendesha `pnpm install --frozen-lockfile` kwa
> **pnpm 10** na Node 24. Tumia Build/Deploy commands zilizo juu; migration na
> `pnpm add` hazipaswi kuendeshwa wakati wa kila deployment.

> **Tumia pnpm, si npm.** `.npmrc` inaweka `node-linker=hoisted`, na hilo ni
> lazima kwenye Windows: mpangilio wa kawaida wa pnpm hutengeneza node_modules
> kwa *junction*, na Node haiwezi kufuata junction kupata `styled-jsx`
> inayohitajika na `next`.
>
> `pnpm-workspace.yaml` ipo kwa ajili ya pnpm build-script policy; `.npmrc`
> inaweka `node-linker=hoisted`. Config za Cloudflare ziko kwenye
> `wrangler.jsonc` na `open-next.config.ts`.

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
| `src/data/khakiKnowledge.ts` | Huduma nne, packages 10, bei, masharti, FAQs. **Chanzo kikuu cha bei.** |
| `src/data/khaki-operations.ts` | Mipaka, vitu vya kupeleka kwa timu, jibu la akiba. |
| `src/lib/system-prompt.ts` | Kila neno analoambiwa AI. Linajengwa kutoka data, si kuandikwa kwa mkono. |
| `src/lib/studio-hours.ts` | Saa za Kiswahili, kiashiria cha wazi/imefungwa. |
| `src/app/api/chat/route.ts` | Streaming, tools, failover ya modeli, offline fallback. |
| `src/lib/conversations.ts` | Uhifadhi wa mazungumzo kwenye kifaa cha mteja. |
| `src/components/brand/*` | Nembo ya Khaki na status tulivu ya wakati AI inafikiria. |

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

Gemini API hutumia modeli stable zenye function calling: **`gemini-3.8-flash`**
ndiyo default; ikikataa, fallback ni `gemini-3.6-flash`,
`gemini-3.5-flash-lite`, kisha `gemini-3.1-flash-lite`. Kama zote zinakataa,
inajibu kutoka data ya studio badala ya kuonyesha kosa. Modeli za zamani zilizohifadhiwa
kwenye mipangilio zinaelekezwa kwa successor stable kabla ya kujaribu.

Thinking level imewekwa `low`. Vipimo vya **39s** dhidi ya **4.6s** vilikuwa vya
jaribio la zamani la `gemini-3.5-flash`; si benchmark ya default mpya.

Model inapofanya handoff kwa timu (booking, malalamiko au uthibitisho), AI huonyesha
vitufe vya **WhatsApp** na **Piga simu**. Mteja ndiye huchagua; WhatsApp hufungua
draft bila kuituma, na simu hufungua dialer bila kupiga yenyewe. Bila modeli,
majibu ya akiba bado hutoa links za kuwasiliana kulingana na swali.

System prompt ni **herufi ~19,000 (~5,300 token estimate)** kwa kila ujumbe. Muundo
wake unatoka kwa mmiliki — identity, mpangilio wa vipao, tabia, kisha tofauti muhimu:
facts za Khaki Media dhidi ya maarifa ya jumla ya production. Bei za package
zinazalishwa kutoka `khakiKnowledge.ts`; mifano haibebi bei zilizorudiwa kwa mkono.
Tarehe inajazwa kila request. Kila kitu kilichoongezwa hapo kinaweza kuongeza gharama
kwa kila ujumbe, kwa hiyo `measurePrompt()` inapima na `/admin` inaonyesha gharama kwa
kila sehemu. Token count ni estimate ya herufi, si billing count ya provider.

### Aina nne za ujumbe

Assistant hana jibu moja kwa kila kitu. Kuna aina nne, na kila moja ina jibu
lake — kuchanganya aina mbili ndiyo kitu kilichomfanya aonekane robotic:

| Aina | Mfano | Jibu |
| --- | --- | --- |
| Mazungumzo ya kawaida | "Bro vipi?", "Sawa", "Asante" | Jibu la furaha, sentensi moja. **Hakuna kukataa, hakuna orodha ya packages.** |
| Swali la Khaki Media | "Bei zenu zikoje?" | Jibu kamili kutoka data ya studio. |
| Swali la biashara lisilojulikana | "Amana ni kiasi gani?" | Linathibitishwa na timu; assistant hakisi. |
| Swali la nje lenye uzito | "Nifundishe Python" | Sentensi moja ya upole ya kumrudisha kwenye kazi za studio. |

Vilevile linapotumika jibu la akiba (quota imeisha au key haipo),
`src/lib/offline-answers.ts` ina matcher wa maneno kamili — `"arusi"` haitaji
match ndani ya `"harusi"`, na `"app"` haitaji match ndani ya `"Apple"`.

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
| Signature | Khaki mark ndogo, status ya maandishi na dots tulivu hadi jibu lianze kutiririka |

> Rangi hizi zilikuwa zimeandikwa vibaya hapa kwa muda mrefu — `#F5D061`,
> `#c9a227` na `#fbeeae` hazipo kwenye code kabisa. Kama unabadilisha palette,
> badilisha `globals.css`; `pnpm audit:readme` inakagua jedwali hili.

**Mambo matatu ya kuzingatia unapoandika CSS:**

1. **Tumia accent tulivu kwenye vitufe.** `brass-fill` hutumia rangi ya dhahabu
   iliyowekwa sasa bila gradient inayotembea. `metal-fill` inabaki kwa sehemu
   za mfumo zilizopo tu; usiweke mwendo wa mapambo kwenye chat.
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
pnpm audit:all                   # kila ukaguzi, moja chini ya mstari mmoja
```

`audit:all` ni njia inayopendekezwa. Inasimamisha kinachokosekana — build ya
production, Chrome yenye CDP kwenye `:9222`, server kwenye `:3100` — kisha
inaendesha ukaguzi wote kumi na tatu na kutoa jibu moja la kila mmoja.

Kwa nini script badala ya orodha ya amri: ukaguzi sita hufeli kwa
`ECONNREFUSED` au "Hakuna CSS iliyojengwa" ukiendesha bila maandalizi, na
kosa la aina hiyo linaonekana kama suite iliyovunjika badala ya sharti
linalokosekana. Njia ya kuzima ukaguzi ni kuufanya usiweze kuendeshwa kwa
amri moja.

> **Kamwe usiendeshe `pnpm build` wakati `next dev` inaendesha.** Build
> inabadilisha `.next` chini ya dev server, na app inaonekana imepoteza
> composer kabisa. Dalili hazifanani na kosa la build hata kidogo.
>
> **Pima dhidi ya `next start`, sio `next dev`.** React 19 hutoa
> `metadata` tags kwenye dev, kwa hiyo dev inafeli SEO audit ambayo
> production inapita.

| Amri | Inakagua |
| --- | --- |
| `pnpm typecheck` | `tsc --noEmit` |
| `pnpm lint` | `next lint` |
| `pnpm test` | 271 tests: saa za Kiswahili, bei/link za booking, handoff ya WhatsApp/simu, uhifadhi wa mazungumzo, ulinzi wa `/admin`, funguo na routing ya Gemini, majibu ya akiba, prompt-injection guard, vikomo vya ombi, stream na UI contracts |
| `pnpm audit:studio` | Hakuna taarifa za kubuni zilizobaki, na hakuna sehemu ya API key |
| `pnpm audit:readme` | Kila dai la README linathibitishwa dhidi ya code |
| `pnpm audit:deps` | Kila import ina nyumbani; hakuna kifurushi kinachotumika bila kutangazwa |
| `pnpm audit:assets` | Kila picha inayotajwa ipo, na ukubwa uliotangazwa ni wa kweli |
| `pnpm audit:env` | Kila variable inayosomwa imeandikwa; hakuna inayotolewa bila kusomwa |
| `pnpm audit:dead` | Kila export inatajwa mahali; hakuna code inayosomeka kama inafanya kazi bila kufanya |
| `pnpm audit:encoding` | Kila faili ni UTF-8 safi; hakuna uharibifu wa PowerShell |
| `pnpm audit:classes` | Kila class inatoa CSS; `cn()` haiondoi kitu |
| `pnpm audit:css` | Hakuna keyframes iliyokufa au iliyofafanuliwa mara mbili |
| `pnpm audit:a11y` | axe-core: landmarks, contrast, labels — plus tabia ambazo axe haiwezi kuona |
| `pnpm audit:layout` | Jiometri ya shell: haiscrolli, kichwa kimoja, drawer nje ya skrini |
| `pnpm audit:mobile-ui` | Mobile UI source checks / ukaguzi wa source: metadata, skip link, composer, reduced motion, tap targets, na vitu vilivyorudiwa |
| `pnpm audit:answers` | AI inakataa dai za uongo? (inahitaji key) |
| `pnpm simulate:clients` | Wateja kumi wa aina tofauti, dhidi ya model |

Kila moja inatoa jibu kwa **exit code**, sio kwa neno "PASS" kwenye output.

Kwa vipimo vya utendaji:

```bash
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
