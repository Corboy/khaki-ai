import { measurePrompt } from "@/lib/system-prompt";

const m = measurePrompt();
console.log(`Jumla: ${m.characters} chars  ~${m.tokens} tokens\n`);
const sorted = [...m.sections].sort((a, b) => b.characters - a.characters);
for (const s of sorted) {
  const pct = Math.round((s.characters / m.characters) * 100);
  console.log(`  ${String(s.characters).padStart(5)}  ${String(pct).padStart(3)}%  ${s.title}`);
}
