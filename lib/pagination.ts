type Page<T> = { rows: T[]; total?: number | null };

/**
 * Reads every row although the API caps a single answer (Supabase: 1000 rows).
 * Only the first request asks for the total. If rows moved between pages while reading, the read is repeated once.
 */
export async function loadAllPages<T extends { id: string }>(load: (from: number, to: number, withTotal: boolean) => Promise<Page<T>>, size = 1000): Promise<T[]> {
  for (let attempt = 1; ; attempt += 1) {
    const first = await load(0, size - 1, true);
    const total = first.total ?? first.rows.length;
    // The server may cap below `size`; the length of the first answer is the real step.
    const step = first.rows.length;
    const starts = step ? Array.from({ length: Math.ceil(total / step) - 1 }, (_, index) => (index + 1) * step) : [];
    const rest = await Promise.all(starts.map((from) => load(from, from + step - 1, false)));
    const rows = new Map([first, ...rest].flatMap((page) => page.rows).map((row) => [row.id, row]));
    if (rows.size === total || attempt === 2) return [...rows.values()];
  }
}
