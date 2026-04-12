export type Comment = {
  id: string;
  excerpt: string;
  text: string;
  timestamp: number;
  resolved: boolean;
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
    resolved: false,
  });
  store.set(session, list);
}

export function pending(session: string): Comment[] {
  return (store.get(session) ?? []).filter((c) => !c.resolved);
}

export function resolve(session: string) {
  for (const c of store.get(session) ?? []) {
    c.resolved = true;
  }
}

export function all(session: string): Comment[] {
  return store.get(session) ?? [];
}

export function clear(session: string) {
  store.delete(session);
}
