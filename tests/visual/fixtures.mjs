// Obviously fictional fixtures, dated relative to today. No real customers, people or figures.
const pad = (value) => String(value).padStart(2, "0");
const dateKey = (date) => `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;

export const COMPANY = "00000000-0000-4000-8000-00000000c001";
export const SECOND_COMPANY = "00000000-0000-4000-8000-00000000c002";
export const EMPTY_COMPANY = "00000000-0000-4000-8000-00000000c003";
const uid = (n) => `00000000-0000-4000-8000-0000000000${pad(n)}`;

export const ALL_PAGES = ["dashboard", "todos", "analytics", "cvs", "customers", "prospects", "profile", "calculator", "social-media"];

// One fake account per mode; the access token carries the mode, so modes can be used side by side.
export const ACCOUNTS = {
  owner: { id: uid(1), email: "owner@demo.example", name: "Mara Muster" },
  admin: { id: uid(2), email: "admin@demo.example", name: "Beat Beispiel" },
  limited: { id: uid(3), email: "limited@demo.example", name: "Ayla Attrappe" },
  viewer: { id: uid(4), email: "viewer@demo.example", name: "Lea Leserin" },
  empty: { id: uid(5), email: "empty@demo.example", name: "Nora Neu" },
  nocompany: { id: uid(6), email: "nocompany@demo.example", name: "Otto Ohnefirma" },
};

export function createFixtures(now = new Date()) {
  const today = dateKey(now);
  const days = (offset) => dateKey(new Date(now.getFullYear(), now.getMonth(), now.getDate() + offset));
  const iso = (offset, hour = 9) => new Date(now.getFullYear(), now.getMonth(), now.getDate() + offset, hour, 15).toISOString();
  // Day in the month at `offset`; past-or-present only, so "paid" fixtures never lie in the future.
  const month = (offset, day) => {
    const last = new Date(now.getFullYear(), now.getMonth() + offset + 1, 0).getDate();
    const key = dateKey(new Date(now.getFullYear(), now.getMonth() + offset, Math.min(day, last)));
    return key > today ? today : key;
  };
  const paidAt = (key) => (key === today ? now.toISOString() : new Date(`${key}T10:00:00`).toISOString());
  const ids = Object.fromEntries(Object.entries(ACCOUNTS).map(([key, value]) => [key, value.id]));
  const own = (row) => ({ user_id: COMPANY, ...row });

  const customer = (n, company_name, contact_name, project, values) => own({
    id: `customer-${n}`, company_name, contact_name, email: `kontakt${n}@kunde.example`, phone: `+41 44 000 00 ${pad(n)}`,
    address: `Fantasieweg ${n}, 0000 Musterhausen`, project, monthly_revenue: 0, billing_interval: "monthly", monthly_start_date: null,
    monthly_end_date: null, one_time_revenue: 0, one_time_revenue_date: null, notes: "", logo_path: null, commission_enabled: false,
    created_at: month(-9, 4), updated_at: month(0, 2), ...values,
  });
  const customers = [
    customer(1, "Bergblick Hotel Muster AG", "Anna Attrappe", "Website und Buchungssystem", { monthly_revenue: 480, monthly_start_date: month(-8, 1), one_time_revenue: 8900, one_time_revenue_date: month(0, 3), commission_enabled: true, logo_path: `${COMPANY}/customer-1.png`, notes: "Wünscht monatlichen Bericht." }),
    customer(2, "Bäckerei Mustermann", "Moritz Mustermann", "Onlineshop", { monthly_revenue: 220, monthly_start_date: month(-6, 1), one_time_revenue: 4200, one_time_revenue_date: month(0, 8), commission_enabled: true, logo_path: `${COMPANY}/customer-2.png` }),
    customer(3, "Gartenbau Grünfantasie", "Gina Grün", "Website und Wartung", { monthly_revenue: 150, monthly_start_date: month(-10, 1), one_time_revenue: 3600, one_time_revenue_date: month(0, 12), commission_enabled: true }),
    customer(4, "Praxis Dr. Beispiel", "Dr. Bruno Beispiel", "Terminportal", { monthly_revenue: 1800, billing_interval: "yearly", monthly_start_date: month(-12, 15), one_time_revenue: 6400, one_time_revenue_date: month(-1, 10), commission_enabled: true }),
    customer(5, "Velowerkstatt Kettenreaktion (Demo)", "Vera Velo", "Markenauftritt", { one_time_revenue: 2950, one_time_revenue_date: month(-2, 18) }),
    customer(6, "Fiktiva Treuhand und Unternehmensberatung Ostschweiz GmbH", "Theodor-Maximilian Testperson", "Komplettbetreuung mit Suchmaschinenoptimierung und Newsletter", { monthly_revenue: 690, monthly_start_date: month(-4, 1), one_time_revenue: 11500, one_time_revenue_date: month(-3, 6) }),
    customer(7, "Café Platzhalter", "Cleo Platzhalter", "Digitale Speisekarte", { monthly_revenue: 90, monthly_start_date: month(-11, 1), monthly_end_date: month(-2, 28), one_time_revenue: 1200, one_time_revenue_date: month(-5, 20) }),
    customer(8, "Schreinerei Holzprobe", "Hanna Holz", "Konfigurator", { one_time_revenue: 5200, commission_enabled: true, notes: "Abschlussdatum noch offen." }),
  ];

  const invoice = (n, customer_name, issue_date, due_date, status, lines, values = {}) => own({
    id: `invoice-${n}`, invoice_number: `DEMO-${now.getFullYear()}-${String(n).padStart(3, "0")}`, customer_name, customer_email: `rechnung${n}@kunde.example`,
    customer_address: "Fantasieweg 1\n0000 Musterhausen", issue_date, due_date, status, currency: "CHF",
    items: lines.map(([description, quantity, unitPrice, vatRate = 0], index) => ({ id: `item-${n}-${index}`, description, quantity, unitPrice, vatRate })),
    notes: "Vielen Dank für den (erfundenen) Auftrag.", paid_at: null, covers_recurring: false, created_at: issue_date, updated_at: issue_date, ...values,
  });
  const invoices = [
    invoice(1, "Bergblick Hotel Muster AG", month(0, 4), days(20), "paid", [["Fotoproduktion", 1, 1850], ["Texte", 6, 120]], { paid_at: month(0, 9) }),
    invoice(2, "Bäckerei Mustermann", days(-12), days(18), "sent", [["Produkterfassung", 14, 95]]),
    invoice(3, "Gartenbau Grünfantasie", days(-45), days(-15), "overdue", [["SEO-Paket Herbst", 1, 1480]]),
    invoice(4, "Velowerkstatt Kettenreaktion (Demo)", days(-33), days(-3), "sent", [["Schaufensterfolie", 2, 340]]),
    invoice(5, "Praxis Dr. Beispiel", today, days(30), "draft", [["Schulung vor Ort", 4, 160]]),
    invoice(6, "Café Platzhalter", days(-70), days(-40), "cancelled", [["Plakatserie", 1, 620]]),
    invoice(7, "Praxis Dr. Beispiel", month(-1, 5), month(-1, 28), "paid", [["Erweiterung Terminportal", 12, 145]], { paid_at: month(-1, 21) }),
    invoice(8, "Bergblick Hotel Muster AG", month(-1, 1), month(-1, 25), "paid", [["Wartung (wiederkehrend)", 1, 480]], { paid_at: month(-1, 12), covers_recurring: true }),
    invoice(9, "Fiktiva Treuhand und Unternehmensberatung Ostschweiz GmbH", month(-2, 3), month(-2, 28), "paid", [["Workshop", 2, 1400]], { paid_at: month(-2, 22) }),
    invoice(10, "Schreinerei Holzprobe", month(-3, 7), month(-3, 28), "paid", [["Konzept Konfigurator", 1, 2350]], { paid_at: month(-3, 25) }),
    invoice(11, "Café Platzhalter", month(-5, 2), month(-5, 28), "paid", [["Menükarten", 3, 280]], { paid_at: month(-5, 26) }),
    invoice(12, "Demo Export Ltd.", month(0, 2), days(10), "paid", [["Beratung (EUR)", 5, 150]], { paid_at: month(0, 6), currency: "EUR" }),
  ];

  const expense = (n, vendor, description, amount, expense_date, values = {}) => own({
    id: `expense-${n}`, vendor, description, amount, currency: "CHF", expense_date, customer_id: null, is_recurring: false, recurring_interval: null,
    recurring_start_date: null, recurring_end_date: null, created_at: expense_date, updated_at: expense_date, ...values,
  });
  const monthly = (start) => ({ is_recurring: true, recurring_interval: "monthly", recurring_start_date: start });
  const expenses = [
    expense(1, "Wolkenhost Beispiel", "Hosting Produktivsysteme", 89, month(-9, 1), monthly(month(-9, 1))),
    expense(2, "Designwerkzeug Demo", "Lizenzen Gestaltung", 64.5, month(-7, 1), monthly(month(-7, 1))),
    expense(3, "Coworking Luftschloss", "Arbeitsplatz Monatsmiete", 420, month(-10, 1), monthly(month(-10, 1))),
    expense(4, "Muster-Versicherung", "Berufshaftpflicht", 780, month(-12, 10), { is_recurring: true, recurring_interval: "yearly", recurring_start_date: month(-12, 10) }),
    expense(5, "Alt-Software Demo", "Abgelöstes Werkzeug", 49, month(-11, 1), { ...monthly(month(-11, 1)), recurring_end_date: month(-3, 28) }),
    expense(6, "Fotostudio Fiktiv", "Aufnahmen Hotelzimmer", 950, month(0, 5), { customer_id: "customer-1" }),
    expense(7, "Papeterie Platzhalter", "Büromaterial", 74.35, month(0, 2)),
    expense(8, "Bahn Beispiel", "Kundenbesuch Musterhausen", 58.4, month(0, 9), { customer_id: "customer-3" }),
    expense(9, "Druckerei Testdruck", "Visitenkarten und Flyer", 310, month(-1, 14)),
    expense(10, "Geräte Demo-Shop", "Monitor", 649, month(-2, 11)),
    expense(11, "Texterin Erfunden", "Lektorat", 480, month(-3, 17), { customer_id: "customer-6" }),
    expense(12, "Restaurant Attrappe", "Kundenessen", 126.8, month(-4, 19)),
  ];

  const documents = [
    ["Quittung Büromaterial", month(0, 2), "quittung-demo.pdf", "application/pdf", 182_400],
    ["Mietvertrag Arbeitsplatz", month(-10, 1), "mietvertrag-demo.pdf", "application/pdf", 1_240_000],
    ["Police Berufshaftpflicht mit besonders langer Bezeichnung zum Testen des Umbruchs", month(-2, 10), "police-demo.pdf", "application/pdf", 640_100],
    ["Foto Beleg Kundenessen", month(-4, 19), "beleg-demo.png", "image/png", 88_300],
  ].map(([name, document_date, file_name, file_type, file_size], i) => own({ id: `document-${i + 1}`, name, document_date, file_name, file_type, file_size, storage_path: `${COMPANY}/document-${i + 1}/file.${file_name.split(".").pop()}`, created_at: document_date }));

  const prospect = (n, company_name, contact_name, status, source, estimated_value, last, nextTask, nextOffset, notes = "") => own({
    id: `prospect-${n}`, company_name, contact_name, email: `interesse${n}@prospect.example`, phone: `+41 71 000 00 ${pad(n)}`, source, status,
    last_contact_at: last == null ? null : days(last), next_task: nextTask ?? null, next_task_at: nextOffset == null ? null : days(nextOffset),
    estimated_value, notes, created_at: days(-40 - n), updated_at: days(-n),
  });
  const prospects = [
    prospect(1, "Weingut Traubentraum (Demo)", "Walter Wein", "new", "Empfehlung", 6800, null, "Erstkontakt aufnehmen", 1),
    prospect(2, "Yogastudio Atempause", "Yara Yoga", "new", "Instagram", null, null, null, null),
    prospect(3, "Malerbetrieb Farbklecks", "Max Maler", "contacted", "Telefon", 3400, -3, "Rückruf vereinbaren", -1, "Möchte zuerst Referenzen sehen."),
    prospect(4, "Tierklinik Pfotenprobe", "Tina Tier", "contacted", "Messe", 9200, -6, "Unterlagen senden", 0),
    prospect(5, "Immobilien Luftschloss AG", "Ivo Immo", "meeting", "Website", 14500, -2, "Gespräch vorbereiten", 2, "Entscheid mit Geschäftsleitung."),
    prospect(6, "Musikschule Tonleiter", "Mila Musik", "offer", "Empfehlung", 7600, -4, "Offerte nachfassen", -2),
    prospect(7, "Logistik Musterfracht Zürich-Nordost und Umgebung GmbH", "Lars-Alexander Langname", "offer", "LinkedIn", 18900, -1, "Vertrag besprechen", 5),
    prospect(8, "Bergblick Hotel Muster AG", "Anna Attrappe", "won", "Empfehlung", 8900, -14),
    prospect(9, "Schreinerei Holzprobe", "Hanna Holz", "won", "Telefon", 5200, -20),
    prospect(10, "Kiosk Nirgendwo", "Kurt Kiosk", "lost", "Kaltakquise", 1500, -25, null, null, "Kein Budget in diesem Jahr."),
  ];

  // Imported leads: many share an updated_at, so only the id makes their order stable.
  const replies = [
    "Guten Tag\n\nDanke für Ihre Nachricht. Wir haben aktuell keinen Bedarf.\n\nFreundliche Grüsse\nPetra Platzhalter",
    "Klingt interessant, rufen Sie mich bitte am Dienstag an.",
    "Text mit <b>Auszeichnung</b> & <img src=x onerror=alert(1)> muss als Text erscheinen.\n\n  - eingerückte Zeile\n  - zweite Zeile",
    `Ausführliche Antwort. ${"Wir prüfen das Angebot intern und melden uns mit Rückfragen zum Umfang. ".repeat(24)}\nEnde der Antwort.`,
    `https://beispiel.example/${"sehr-langer-pfad-".repeat(14)}`,
  ];
  const trades = ["Garage", "Praxis", "Atelier", "Gasthof", "Malerei", "Kanzlei", "Gärtnerei", "Studio"];
  for (let n = 1; n <= 1250; n += 1) {
    const replied = n % 23 === 0, contacted = n % 4 !== 0, last = n === 1250, number = String(n).padStart(4, "0");
    prospects.push(own({
      id: `instantly-00000000-0000-4000-8000-00000000${number}`, company_name: last ? "Letzte Zeile Demo AG" : `${trades[n % trades.length]} Fantasie ${number}`, contact_name: n % 5 ? `Demo Person ${number}` : null,
      email: `lead${number}@import.example`, phone: n % 3 ? `+41 79 000 ${number.slice(0, 2)} ${number.slice(2)}` : null, source: `Instantly: Demo-Kampagne ${1 + n % 3}`,
      status: n % 400 === 0 ? "meeting" : contacted ? "contacted" : "new", last_contact_at: contacted ? days(-60 - n % 30) : null, next_task: null, next_task_at: null, estimated_value: null, notes: null,
      message: replied ? replies[(n / 23) % replies.length] : null, message_at: replied ? iso(-60 - n % 30) : null, created_at: days(-120), updated_at: days(last ? -200 : -60 - n % 30),
    }));
  }

  const todo = (n, title, status, priority, due, values = {}) => own({
    id: `todo-${n}`, title, notes: "", status, priority, due_date: due == null ? null : days(due), customer_id: null, prospect_id: null, assignee_id: null,
    created_at: days(-10 - n), updated_at: days(-n % 6), ...values,
  });
  const todos = [
    todo(1, "Offerte Musikschule überarbeiten", "not_started", "high", -2, { prospect_id: "prospect-6", assignee_id: ids.owner, notes: "Variante mit Wartungsvertrag ergänzen." }),
    todo(2, "Startseite Hotel abnehmen lassen", "in_progress", "high", 0, { customer_id: "customer-1", assignee_id: ids.admin }),
    todo(3, "Produktfotos für Bäckerei zuschneiden", "in_progress", "normal", 3, { customer_id: "customer-2", assignee_id: ids.limited }),
    todo(4, "Quartalsabschluss vorbereiten", "not_started", "normal", 7, { assignee_id: ids.owner, prospect_id: "instantly-00000000-0000-4000-8000-000000000001" }),
    todo(5, "Ideen für Newsletter sammeln", "not_started", "low", null),
    todo(6, "Sehr lange Aufgabe: Alle bestehenden Kundenprojekte auf Barrierefreiheit prüfen und die Ergebnisse zusammenfassen", "not_started", "normal", 12, { assignee_id: ids.admin }),
    todo(7, "Zugangsdaten Terminportal dokumentieren", "in_progress", "low", -1, { customer_id: "customer-4" }),
    todo(8, "Domain Schreinerei verlängern", "done", "high", -5, { customer_id: "customer-8", assignee_id: ids.owner }),
    todo(9, "Rechnung Workshop versenden", "done", "normal", -9, { customer_id: "customer-6" }),
    todo(10, "Profilbild aktualisieren", "done", "low", null),
  ];
  const todo_comments = [
    ["todo-1", "Preis für Wartung ist mit dem Team abgestimmt.", -3], ["todo-1", "Bitte noch die Laufzeit ergänzen.", -1],
    ["todo-2", "Erste Rückmeldung ist positiv, nur das Menü fehlt.", -1], ["todo-3", "12 von 30 Bildern sind fertig.", 0],
  ].map(([todo_id, body, offset], i) => own({ id: `comment-${i + 1}`, todo_id, body, created_at: iso(offset, 8) }));

  const social_media_orders = [
    ["Reel Hotelrundgang", month(0, 2), 180, month(0, 5)], ["Karussell Herbstbrote", month(0, 6), 120, null], ["Story-Serie Gartentipps", month(0, 10), 95.5, month(0, 12)],
    ["Beitrag Praxisteam", month(-1, 8), 140, month(-1, 20)], ["Reel Velofrühling mit einem besonders ausführlichen Auftragstitel", month(-1, 15), 210, null], ["Beitrag Café-Jubiläum", month(-2, 9), 110, month(-2, 22)],
  ].map(([title, service_date, amount, paid], i) => own({ id: uid(50 + i), title, post_url: `https://social.example/p/demo-${i + 1}`, service_date, amount, paid_at: paid ? paidAt(paid) : null, created_at: iso(-20), updated_at: iso(-1) }));

  const goalFor = (offset, revenue_target, expense_budget, notes) => { const key = dateKey(new Date(now.getFullYear(), now.getMonth() + offset, 1)).slice(0, 7); return own({ id: `${COMPANY}-${key}`, month: key, revenue_target, recurring_revenue_target: 1500, expense_budget, notes, created_at: month(offset, 1), updated_at: month(offset, 1) }); };
  const member = (company_id, key, role, allowed_pages = ALL_PAGES) => ({ company_id, user_id: ids[key], email: ACCOUNTS[key].email, display_name: ACCOUNTS[key].name, role, allowed_pages });

  return {
    tables: {
      customers, invoices, expenses, documents, prospects, todos, todo_comments, social_media_orders,
      monthly_goals: [goalFor(0, 26000, 3000, "Zwei neue Wartungsverträge abschliessen."), goalFor(-1, 14000, 2000, "")],
      company_profiles: [own({ id: `company-${COMPANY}`, company_name: "Musterfirma Demo KLG", owner_name: "Mara Muster", email: "info@musterfirma.example", phone: "+41 44 000 00 00", address: "Fantasieweg 1", postal_code: "0000", city: "Musterhausen", country: "Schweiz", website: "https://musterfirma.example", vat_number: "CHE-000.000.000", iban: "CH00 0000 0000 0000 0000 0", default_currency: "CHF", default_vat_rate: 0 })],
      workspace_items: [], workspace_files: [], push_subscriptions: [],
    },
    companies: [{ id: COMPANY, name: "Musterfirma Demo KLG" }, { id: SECOND_COMPANY, name: "Zweitfirma Attrappe GmbH" }, { id: EMPTY_COMPANY, name: "Leere Demo-Firma" }],
    members: [
      member(COMPANY, "owner", "owner"), member(COMPANY, "admin", "admin"),
      member(COMPANY, "limited", "member", ["todos", "social-media", "calculator"]),
      member(COMPANY, "viewer", "viewer", ["dashboard", "todos", "customers", "prospects", "social-media"]),
      member(SECOND_COMPANY, "owner", "member", ["dashboard", "todos"]), member(EMPTY_COMPANY, "empty", "owner"),
    ],
    commissions: [
      { customer_id: "customer-1", company_id: COMPANY, member_id: ids.limited, rate: 10 }, { customer_id: "customer-2", company_id: COMPANY, member_id: ids.limited, rate: 10 },
      { customer_id: "customer-3", company_id: COMPANY, member_id: ids.limited, rate: 10 }, { customer_id: "customer-4", company_id: COMPANY, member_id: ids.admin, rate: 10 },
    ],
    invitations: [
      { id: uid(71), company_id: COMPANY, email: "neu@demo.example", role: "member", expires_at: iso(6) },
      { id: uid(72), company_id: COMPANY, email: "nocompany@demo.example", role: "viewer", expires_at: iso(5) },
    ],
  };
}
