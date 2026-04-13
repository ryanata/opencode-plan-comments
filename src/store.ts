export type Comment = {
  id: string;
  excerpt: string;
  text: string;
  timestamp: number;
};

const store = new Map<string, Comment[]>();
let counter = 0;

export function add(session: string, excerpt: string, text: string) {
  const list = store.get(session) ?? [];
  list.push({
    id: `pc-${++counter}`,
    excerpt,
    text,
    timestamp: Date.now(),
  });
  store.set(session, list);
}

export function remove(session: string, id: string) {
  const list = store.get(session);
  if (!list) return;
  store.set(
    session,
    list.filter((c) => c.id !== id),
  );
}

export function edit(session: string, id: string, text: string) {
  const list = store.get(session);
  if (!list) return;
  const hit = list.find((c) => c.id === id);
  if (hit) hit.text = text;
}

export function all(session: string): Comment[] {
  return store.get(session) ?? [];
}

export function clear(session: string) {
  store.delete(session);
}
