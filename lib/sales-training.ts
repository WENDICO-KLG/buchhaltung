// Inhalte für Einwand-Training und Spickzettel im Bereich Prospects. Texte hier anpassen, beide Seiten lesen daraus.

export type ObjectionCategory = "person" | "time" | "money" | "existing" | "need";
export type Objection = { id: string; category: ObjectionCategory; objection: string; answer: string; tip: string };
export type ObjectionRating = "mastered" | "practice";
export type TrainingProgress = Record<string, ObjectionRating>;
export type ScriptLine = { label?: string; text: string };
export type CallStep = { title: string; goal: string; lines: ScriptLine[]; tip: string };

export const objectionCategoryLabels: Record<ObjectionCategory, string> = {
  person: "Nicht die richtige Person",
  time: "Zeit",
  money: "Geld",
  existing: "Haben schon etwas",
  need: "Kein Bedarf & Misstrauen",
};
export const objectionCategories = Object.keys(objectionCategoryLabels) as ObjectionCategory[];

export const objections: Objection[] = [
  { id: "boss-away", category: "person", objection: "Die Chefin ist gerade nicht da.", answer: "Kein Problem. Wann erreiche ich sie am besten? Und wie heisst sie, damit ich nach ihr fragen kann?", tip: "Immer Name und Zeitfenster holen, nie einfach auflegen." },
  { id: "not-decider", category: "person", objection: "Ich bin nur Angestellte, das entscheide ich nicht.", answer: "Verstehe. Würden Sie ihr ausrichten, dass Wendico wegen ihrer Online-Buchungen angerufen hat? Ich melde mich morgen Vormittag nochmals.", tip: "Den Rückruf konkret ankündigen. Dann wird der nächste Anruf schon erwartet." },
  { id: "send-mail", category: "person", objection: "Schicken Sie mir einfach eine Mail.", answer: "Mache ich gern. Damit ich nichts Unpassendes schicke: Wo hapert es bei Ihnen eher, bei neuen Kunden oder bei leeren Terminen?", tip: "Die Mail-Bitte ist oft ein höfliches Nein. Mit einer Frage bleibst du im Gespräch." },
  { id: "ask-partner", category: "person", objection: "Das muss ich zuerst mit meinem Partner besprechen.", answer: "Klar, das macht Sinn. Wann könnten Sie beide kurz dabei sein? Dann hören Sie es aus erster Hand.", tip: "Einen gemeinsamen Termin vorschlagen, statt auf einen Rückruf zu warten." },
  { id: "with-client", category: "time", objection: "Ich habe gerade Kundschaft.", answer: "Dann halte ich mich kurz. Wann passt es Ihnen besser, heute Abend oder morgen früh?", tip: "Zwei konkrete Optionen anbieten statt «Wann passt es Ihnen?»." },
  { id: "no-time", category: "time", objection: "Für so etwas habe ich keine Zeit.", answer: "Genau deshalb machen wir alles. Sie brauchen etwa eine Stunde für ein Gespräch, den Rest übernehmen wir.", tip: "Den Aufwand für den Salon klein und greifbar machen." },
  { id: "call-later", category: "time", objection: "Rufen Sie in ein paar Monaten wieder an.", answer: "Mache ich gern. Was ändert sich bis dann bei Ihnen? Dann melde ich mich zum richtigen Zeitpunkt.", tip: "Den Monat gleich als nächste Aufgabe im Prospect eintragen, sonst geht er unter." },
  { id: "no-budget", category: "money", objection: "Dafür haben wir kein Budget.", answer: "Verstehe ich. Darf ich fragen, wie viele Termine Ihnen pro Woche fehlen? Schon zwei neue Stammkunden im Monat bezahlen das meist.", tip: "Über fehlende Termine reden, nicht über den Preis." },
  { id: "price", category: "money", objection: "Was kostet das?", answer: "Das hängt davon ab, was Sie schon haben. Genau das schauen wir im kurzen Gespräch an, damit Sie nicht für Dinge zahlen, die Sie nicht brauchen.", tip: "Wer nach dem Preis fragt, ist interessiert. Gutes Zeichen!" },
  { id: "too-expensive", category: "money", objection: "Das ist uns zu teuer.", answer: "Im Vergleich wozu? Was kostet Sie heute ein leerer Termin?", tip: "Gegenfrage statt Rechtfertigung." },
  { id: "small-salon", category: "money", objection: "Wir sind ein kleiner Salon, das lohnt sich für uns nicht.", answer: "Gerade in einem kleinen Salon zählt jeder Termin. Wie viele neue Stammkunden bräuchten Sie im Monat, damit es sich lohnt?", tip: "Den Salon selbst rechnen lassen. Eine eigene Zahl überzeugt mehr als jedes Argument." },
  { id: "salonkee", category: "existing", objection: "Wir haben schon Salonkee.", answer: "Perfekt, das behalten Sie auch. Wir sorgen dafür, dass mehr Leute überhaupt bis zu Ihrer Buchung finden.", tip: "Nie gegen das bestehende Tool reden. Wir ersetzen nichts." },
  { id: "website", category: "existing", objection: "Wir haben schon eine Website.", answer: "Super. Wenn ich ‹Coiffeur [Ort]› google, wo erscheinen Sie dann?", tip: "Am besten gleich zusammen nachschauen. Das wirkt fast immer." },
  { id: "nephew", category: "existing", objection: "Das macht mein Neffe.", answer: "Toll, dass Sie jemanden haben. Wir sind auf Salons spezialisiert, vielleicht lohnt sich ein zweiter Blick als Vergleich.", tip: "Den Neffen nie schlechtmachen." },
  { id: "agency", category: "existing", objection: "Wir arbeiten schon mit einer Agentur.", answer: "Sind Sie zufrieden mit den Buchungen, die darüber reinkommen?", tip: "Nach dem Ergebnis fragen, nicht die Agentur kritisieren." },
  { id: "fully-booked", category: "need", objection: "Wir sind voll ausgebucht.", answer: "Gratuliere! Wie ist es in den ruhigen Monaten oder unter der Woche am Vormittag?", tip: "Erst das Kompliment, dann die Lücken selbst finden lassen." },
  { id: "word-of-mouth", category: "need", objection: "Unsere Kunden kommen über Mundpropaganda.", answer: "Das ist das beste Zeichen für gute Arbeit. Neue Leute googeln Sie aber trotzdem, bevor sie buchen.", tip: "Auch wer eine Empfehlung bekommt, schaut zuerst online." },
  { id: "phone-only", category: "need", objection: "Bei uns ruft man einfach an.", answer: "Das ist schön persönlich. Was passiert mit den Anrufen, während Sie gerade jemanden bedienen?", tip: "Viele wollen abends buchen, wenn der Salon zu ist. Online geht das rund um die Uhr." },
  { id: "no-interest", category: "need", objection: "Kein Interesse.", answer: "Darf ich fragen, ob das Thema allgemein nicht passt oder einfach gerade der Zeitpunkt nicht stimmt?", tip: "Beim Zeitpunkt: später nochmals anrufen. Bei echtem Nein: freundlich danken und abhaken." },
  { id: "where-number", category: "need", objection: "Woher haben Sie meine Nummer?", answer: "Die steht öffentlich auf Google, und Sie haben sich kürzlich unser kurzes Video angeschaut. Deshalb rufe ich an.", tip: "Ruhig und ehrlich antworten. Das Video ist dein Türöffner." },
  { id: "which-video", category: "need", objection: "Welches Video? Ich habe nichts angeschaut.", answer: "Kein Problem. Kurz gesagt: Wir helfen Salons, online mehr Termine zu bekommen. Darf ich Ihnen dazu eine Frage stellen?", tip: "Nicht darüber diskutieren, ob das Video gesehen wurde. In einem Satz erklären, dann fragen." },
  { id: "subscription", category: "need", objection: "Ist das so ein Abo-Ding? Ich wurde schon mal abgezockt.", answer: "Verstehe ich total. Deshalb machen wir zuerst ein unverbindliches Gespräch, und Sie sehen alles schwarz auf weiss, bevor etwas passiert.", tip: "Verständnis zeigen und Sicherheit geben." },
];

export const groundRule = { title: "Nicht diskutieren. Frage zurückstellen.", text: "Kurz anerkennen, dann fragen. Wer fragt, führt das Gespräch." };
export const callGoal = { title: "Ziel: ein Termin für ein kurzes Gespräch.", text: "Unverbindlich und mit fixem Datum. Ablauf und Preise klären wir dort, nicht am Telefon." };

export const callSteps: CallStep[] = [
  { title: "Einstieg", goal: "In wenigen Sekunden sagen, wer du bist und warum du anrufst.", lines: [{ text: "Grüezi, hier ist [Name] von Wendico. Sie haben sich kürzlich unser kurzes Video angeschaut. Darf ich Ihnen kurz zwei Fragen stellen?" }], tip: "Lächeln beim Sprechen, man hört es. Nach der Frage still sein und antworten lassen." },
  { title: "Fragen stellen", goal: "Herausfinden, wo es im Salon hapert.", lines: [{ text: "Wie finden neue Kundinnen und Kunden heute zu Ihnen?" }, { text: "Kann man bei Ihnen online buchen?" }, { label: "Wenn nein", text: "Was passiert, wenn jemand am Sonntagabend einen Termin möchte?" }, { text: "Gibt es Tage, an denen der Kalender leer bleibt?" }], tip: "Zuhören und mitschreiben. Die Worte aus den Antworten brauchst du gleich wieder." },
  { title: "Nutzen in einem Satz", goal: "Die Antworten mit dem verbinden, was Wendico macht.", lines: [{ text: "Genau dafür sind wir da: Wir sorgen dafür, dass mehr Leute Sie online finden und direkt bei Ihnen buchen." }, { label: "Mit ihren Worten", text: "Sie haben gesagt, dienstags ist es eher ruhig. Genau solche Lücken wollen wir füllen." }], tip: "Kurz bleiben. Ablauf und Preis gehören ins Gespräch, nicht ans Telefon." },
  { title: "Termin vereinbaren", goal: "Ein fixer Termin statt «Ich melde mich».", lines: [{ text: "Am einfachsten zeige ich Ihnen das in einem kurzen Gespräch. Passt es Ihnen eher am Dienstagvormittag oder am Donnerstagnachmittag?" }, { label: "Bei Ja", text: "Super, ich trage es ein. An welche E-Mail-Adresse darf ich die Bestätigung schicken?" }], tip: "Immer zwei konkrete Zeiten anbieten, nie «Wann passt es Ihnen?»." },
  { title: "Abschliessen", goal: "Freundlich verabschieden und den nächsten Schritt bestätigen.", lines: [{ text: "Vielen Dank für Ihre Zeit. Dann bis [Tag] um [Uhrzeit], ich freue mich!" }], tip: "Direkt nach dem Auflegen den Prospect aktualisieren, solange alles frisch ist." },
];

export const afterCallChecklist = [
  "«Aktueller Stand» setzen: Kontaktiert, Gespräch (Termin steht) oder Abgesagt (echtes Nein).",
  "«Zuletzt kontaktiert» auf heute setzen.",
  "Nächste Aufgabe mit Datum eintragen, z. B. «Gespräch Di 10 Uhr» oder «Nochmals anrufen».",
  "In den Notizen festhalten: Ansprechperson, was gesagt wurde, welche Einwände kamen.",
  "Termin vereinbart? Gleich die Bestätigungs-Mail schicken.",
];

export const voicemail = {
  text: "Grüezi, hier ist [Name] von Wendico. Sie haben sich kürzlich unser kurzes Video angeschaut, deshalb melde ich mich. Ich versuche es [morgen Vormittag] nochmals. Sie erreichen mich auch unter [Nummer]. Einen schönen Tag!",
  tip: "Unter 20 Sekunden bleiben. Nichts verkaufen, nur ankündigen. Und dann wirklich nochmals anrufen.",
};

export const confirmationMail = {
  subject: "Bestätigung: Unser Gespräch am [Datum]",
  body: "Grüezi [Frau/Herr Nachname]\n\nVielen Dank für das freundliche Telefonat. Wie besprochen schauen wir am [Datum] um [Uhrzeit] gemeinsam an, wie mehr Leute online zu Ihrem Salon finden und direkt bei Ihnen buchen.\n\nDas Gespräch ist unverbindlich. Falls etwas dazwischenkommt, antworten Sie einfach auf diese Mail.\n\nFreundliche Grüsse\n[Name]\nWendico",
};

export const rescueLines = [
  { situation: "Eine Frage, die du nicht beantworten kannst", line: "Gute Frage. Das kläre ich ab und melde mich bis morgen bei Ihnen.", tip: "Nie raten und nichts versprechen, was du nicht sicher weisst." },
  { situation: "Du hast den Faden verloren", line: "Darf ich kurz zusammenfassen, was ich verstanden habe?", tip: "Zusammenfassen gibt dir Zeit und zeigt, dass du zuhörst." },
  { situation: "Das Gespräch wird unfreundlich", line: "Ich merke, es passt gerade nicht. Danke für Ihre Zeit und einen schönen Tag!", tip: "Freundlich bleiben, abhaken, nächster Anruf. Nimm es nicht persönlich." },
];

export const callDos = ["Lächeln beim Sprechen, man hört es.", "Langsam sprechen und Pausen aushalten.", "Die Person mit Namen ansprechen.", "Jedes Gespräch mit einem nächsten Schritt beenden."];
export const callDonts = ["Am Telefon über den Preis verhandeln.", "Bestehende Tools, Agenturen oder den Neffen schlechtmachen.", "Etwas versprechen, was du nicht sicher weisst.", "Darüber diskutieren, wer recht hat."];

export const trainingProgressKey = "wendico.sales-training";
const objectionIds = new Set(objections.map((item) => item.id));

export const isObjectionCategory = (value: string | null): value is ObjectionCategory => objectionCategories.includes(value as ObjectionCategory);

export function shuffle<Item>(items: readonly Item[], random: () => number = Math.random) {
  const result = [...items];
  for (let index = result.length - 1; index > 0; index -= 1) {
    const swap = Math.floor(random() * (index + 1));
    [result[index], result[swap]] = [result[swap], result[index]];
  }
  return result;
}

export function trainingPool(items: readonly Objection[], categories: readonly ObjectionCategory[], progress: TrainingProgress, onlyOpen: boolean) {
  return items.filter((item) => (!categories.length || categories.includes(item.category)) && (!onlyOpen || progress[item.id] !== "mastered"));
}

// The card that was just on screen never opens the next round.
export function trainingDeck(items: readonly Objection[], previousId?: string, random: () => number = Math.random) {
  const deck = shuffle(items.map((item) => item.id), random);
  if (deck.length > 1 && deck[0] === previousId) deck.push(...deck.splice(0, 1));
  return deck;
}

// Selecting every category is the same as "Alle".
export function toggleCategory(selection: readonly ObjectionCategory[], category: ObjectionCategory) {
  const next = selection.includes(category) ? selection.filter((entry) => entry !== category) : [...selection, category];
  return next.length === objectionCategories.length ? [] : next;
}

export function parseTrainingProgress(raw: string | null): TrainingProgress {
  try {
    const value: unknown = JSON.parse(raw ?? "{}");
    if (!value || typeof value !== "object" || Array.isArray(value)) return {};
    return Object.fromEntries(Object.entries(value).filter(([id, rating]) => objectionIds.has(id) && (rating === "mastered" || rating === "practice")));
  } catch { return {}; }
}

const searchable = (text: string) => text.normalize("NFD").replace(/[̀-ͯ]/g, "").toLocaleLowerCase("de-CH");

export function searchObjections(items: readonly Objection[], query: string) {
  const terms = searchable(query).split(/\s+/).filter(Boolean);
  return items.filter((item) => {
    const text = searchable(`${item.objection} ${item.answer} ${item.tip} ${objectionCategoryLabels[item.category]}`);
    return terms.every((term) => text.includes(term));
  });
}
