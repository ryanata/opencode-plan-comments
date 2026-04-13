import { createSignal } from "solid-js";

export type Comment = {
  id: string;
  excerpt: string;
  text: string;
  timestamp: number;
};

const data = new Map<string, Comment[]>();
let counter = 0;

const [rev, setRev] = createSignal(0);

export function revision() {
  return rev();
}

export function add(session: string, excerpt: string, text: string) {
  const list = data.get(session) ?? [];
  list.push({
    id: `pc-${++counter}`,
    excerpt,
    text,
    timestamp: Date.now(),
  });
  data.set(session, list);
  setRev((n) => n + 1);
}

export function remove(session: string, id: string) {
  const list = data.get(session);
  if (!list) return;
  data.set(
    session,
    list.filter((c) => c.id !== id),
  );
  setRev((n) => n + 1);
}

export function edit(session: string, id: string, text: string) {
  const list = data.get(session);
  if (!list) return;
  const hit = list.find((c) => c.id === id);
  if (hit) hit.text = text;
  setRev((n) => n + 1);
}

export function all(session: string): Comment[] {
  return [...(data.get(session) ?? [])];
}

export function clear(session: string) {
  data.delete(session);
  setRev((n) => n + 1);
}
