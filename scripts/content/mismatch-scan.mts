/** Finds copy pasted from one product into another: place words that don't belong to a journey's route. */
import { db } from "./db.mts";
import { docToPlainText } from "../../src/lib/richtext/text";
const SIGNALS: [RegExp, RegExp][] = [
  [/\bdesert|sand dunes?|camel\b/i, /jaisalmer|bikaner|jodhpur|pushkar|khichan|rajasthan/i],
  [/\bsnow|shikara|houseboat|dal lake\b/i, /kashmir|srinagar|gulmarg|pahalgam|sonamarg|manali|leh|ladakh|himachal|jispa|sarchu|nubra|pangong|yusmarg|doodhpathri/i],
  [/\bbeach|beachfront\b/i, /goa/i],
  [/\btiger|jungle safari\b/i, /ranthambore|sariska|jawai|bharatpur/i],
  [/\bganga aarti|ghats\b/i, /varanasi|rishikesh|haridwar|pushkar|udaipur/i],
];
async function main() {
  const js = await db.journey.findMany({
    where: { status: "PUBLISHED" },
    select: { name: true, slug: true, bestTime: true, overview: true, practicalInfo: true, whyChoose: true, highlights: true, inclusions: true, stops: { select: { destination: { select: { name: true, region: { select: { name: true } } } } } } },
  });
  let n = 0;
  for (const j of js) {
    const route = `${j.name} ${j.slug} ${j.stops.map((s) => `${s.destination.name} ${s.destination.region?.name ?? ""}`).join(" ")}`;
    const fields: [string, string][] = [["bestTime", j.bestTime ?? ""], ["overview", docToPlainText(j.overview)], ["practicalInfo", docToPlainText(j.practicalInfo)], ["whyChoose", j.whyChoose.join(" | ")], ["highlights", j.highlights.join(" | ")], ["inclusions", j.inclusions.join(" | ")]];
    for (const [field, text] of fields) {
      for (const sentence of text.split(/(?<=[.!?|])\s+|\n+/)) {
        for (const [word, home] of SIGNALS) {
          if (word.test(sentence) && !home.test(route) && !home.test(sentence)) {
            n++;
            console.log(`${j.name} [${field}]\n    "${sentence.trim().slice(0, 200)}"`);
          }
        }
      }
    }
  }
  console.log(`\n${n} suspect sentences`);
  await db.$disconnect();
}
main();
