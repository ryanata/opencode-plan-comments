export type Comment = {
  id: string;
  excerpt: string;
  text: string;
  timestamp: number;
};

const data = new Map<string, Comment[]>();
let counter = 0;

export function add(session: string, excerpt: string, text: string) {
  const list = data.get(session) ?? [];
  list.push({
    id: `pc-${++counter}`,
    excerpt,
    text,
    timestamp: Date.now(),
  });
  data.set(session, list);
}

export function remove(session: string, id: string) {
  const list = data.get(session);
  if (!list) return;
  data.set(
    session,
    list.filter((c) => c.id !== id),
  );
}

export function edit(session: string, id: string, text: string) {
  const list = data.get(session);
  if (!list) return;
  const idx = list.findIndex((c) => c.id === id);
  if (idx >= 0) list[idx] = { ...list[idx], text };
}

export function all(session: string): Comment[] {
  return [...(data.get(session) ?? [])];
}

export function clear(session: string) {
  data.delete(session);
}
