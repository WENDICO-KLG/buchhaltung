export async function readAgentBody(request: Request): Promise<{ message: string; companyId?: string }> {
  if (!request.headers.get("content-type")?.toLowerCase().startsWith("application/json")) throw new Error("invalid_body");
  const reader = request.body?.getReader();
  if (!reader) throw new Error("invalid_body");
  const chunks: Uint8Array[] = [];
  let size = 0;
  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    size += value.byteLength;
    if (size > 20000) { await reader.cancel(); throw new Error("body_too_large"); }
    chunks.push(value);
  }
  const bytes = new Uint8Array(size);
  let offset = 0;
  for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.byteLength; }
  const body: unknown = JSON.parse(new TextDecoder().decode(bytes));
  if (!body || typeof body !== "object" || Array.isArray(body)) throw new Error("invalid_body");
  const input = body as Record<string, unknown>;
  if (typeof input.message !== "string" || !input.message.trim() || input.message.length > 4000) throw new Error("invalid_body");
  if (input.companyId !== undefined && (typeof input.companyId !== "string" || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(input.companyId))) throw new Error("invalid_body");
  return { message: input.message.trim(), companyId: input.companyId as string | undefined };
}