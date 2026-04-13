import { describe, test, expect, beforeEach } from "bun:test";
import * as store from "../src/store";

// store uses a module-level Map, so we clear between tests
// by using a unique session id per test
let session: string;
let n = 0;

beforeEach(() => {
  session = `test-${++n}`;
});

describe("store", () => {
  test("all returns empty array for unknown session", () => {
    expect(store.all("unknown")).toEqual([]);
  });

  test("add creates a comment with correct fields", () => {
    store.add(session, "some code", "this is wrong");
    const items = store.all(session);
    expect(items).toHaveLength(1);
    expect(items[0].excerpt).toBe("some code");
    expect(items[0].text).toBe("this is wrong");
    expect(items[0].id).toMatch(/^pc-\d+$/);
    expect(typeof items[0].timestamp).toBe("number");
  });

  test("add appends to existing comments", () => {
    store.add(session, "a", "first");
    store.add(session, "b", "second");
    const items = store.all(session);
    expect(items).toHaveLength(2);
    expect(items[0].text).toBe("first");
    expect(items[1].text).toBe("second");
  });

  test("all returns shallow copy, not same reference", () => {
    store.add(session, "x", "y");
    const a = store.all(session);
    const b = store.all(session);
    expect(a).toEqual(b);
    expect(a).not.toBe(b);
  });

  test("remove deletes by id", () => {
    store.add(session, "a", "first");
    store.add(session, "b", "second");
    const items = store.all(session);
    store.remove(session, items[0].id);
    const after = store.all(session);
    expect(after).toHaveLength(1);
    expect(after[0].text).toBe("second");
  });

  test("remove is no-op for unknown session", () => {
    store.remove("no-such-session", "pc-999");
    // should not throw
  });

  test("remove is no-op for unknown id", () => {
    store.add(session, "a", "first");
    store.remove(session, "nonexistent");
    expect(store.all(session)).toHaveLength(1);
  });

  test("edit updates text by id", () => {
    store.add(session, "code", "original");
    const id = store.all(session)[0].id;
    store.edit(session, id, "updated");
    expect(store.all(session)[0].text).toBe("updated");
  });

  test("edit preserves excerpt", () => {
    store.add(session, "the excerpt", "original");
    const id = store.all(session)[0].id;
    store.edit(session, id, "changed");
    expect(store.all(session)[0].excerpt).toBe("the excerpt");
  });

  test("edit is no-op for unknown session", () => {
    store.edit("no-session", "pc-1", "text");
    // should not throw
  });

  test("edit is no-op for unknown id", () => {
    store.add(session, "a", "original");
    store.edit(session, "bad-id", "new");
    expect(store.all(session)[0].text).toBe("original");
  });

  test("clear removes all comments for session", () => {
    store.add(session, "a", "1");
    store.add(session, "b", "2");
    store.clear(session);
    expect(store.all(session)).toEqual([]);
  });

  test("clear does not affect other sessions", () => {
    const other = session + "-other";
    store.add(session, "a", "1");
    store.add(other, "b", "2");
    store.clear(session);
    expect(store.all(session)).toEqual([]);
    expect(store.all(other)).toHaveLength(1);
  });

  test("ids are unique across adds", () => {
    store.add(session, "a", "1");
    store.add(session, "b", "2");
    store.add(session, "c", "3");
    const ids = store.all(session).map((c) => c.id);
    expect(new Set(ids).size).toBe(3);
  });
});
