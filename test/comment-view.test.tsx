/** @jsxImportSource @opentui/solid */
import { describe, test, expect, afterEach } from "bun:test";
import { testRender } from "@opentui/solid";
import { RGBA } from "@opentui/core";
import type { TuiPluginApi, TuiPromptInfo } from "@opencode-ai/plugin/tui";
import * as store from "../src/store";
import { format } from "../src/format";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const tick = () => new Promise((r) => setTimeout(r, 15));

// ---------------------------------------------------------------------------
// Minimal mock TuiPluginApi (self-contained, no opencode imports)
// ---------------------------------------------------------------------------

function color(r: number, g: number, b: number) {
  return RGBA.fromInts(r, g, b);
}

function theme(): TuiPluginApi["theme"]["current"] {
  const a = color(0, 120, 240);
  const b = color(120, 120, 120);
  const c = color(230, 230, 230);
  const d = color(120, 30, 30);
  const e = color(140, 100, 40);
  const f = color(20, 140, 80);
  const g = color(20, 80, 160);
  const h = color(40, 40, 40);
  const i = color(60, 60, 60);
  const j = color(80, 80, 80);
  return {
    primary: a,
    secondary: b,
    accent: a,
    error: d,
    warning: e,
    success: f,
    info: g,
    text: c,
    textMuted: b,
    selectedListItemText: h,
    background: h,
    backgroundPanel: h,
    backgroundElement: i,
    backgroundMenu: i,
    border: j,
    borderActive: c,
    borderSubtle: i,
    diffAdded: f,
    diffRemoved: d,
    diffContext: b,
    diffHunkHeader: b,
    diffHighlightAdded: f,
    diffHighlightRemoved: d,
    diffAddedBg: h,
    diffRemovedBg: h,
    diffContextBg: h,
    diffLineNumber: b,
    diffAddedLineNumberBg: h,
    diffRemovedLineNumberBg: h,
    markdownText: c,
    markdownHeading: c,
    markdownLink: a,
    markdownLinkText: g,
    markdownCode: f,
    markdownBlockQuote: e,
    markdownEmph: e,
    markdownStrong: c,
    markdownHorizontalRule: b,
    markdownListItem: a,
    markdownListEnumeration: g,
    markdownImage: a,
    markdownImageText: g,
    markdownCodeBlock: c,
    syntaxComment: b,
    syntaxKeyword: a,
    syntaxFunction: g,
    syntaxVariable: c,
    syntaxString: f,
    syntaxNumber: e,
    syntaxType: a,
    syntaxOperator: a,
    syntaxPunctuation: c,
    thinkingOpacity: 0.6,
  };
}

type MockOpts = {
  messages?: Array<{ id: string; role: string }>;
  parts?: Array<{ type: string; text: string }>;
  sessionID?: string;
  selection?: string;
};

function mock(opts: MockOpts = {}) {
  const navigated: Array<{ name: string; params?: Record<string, unknown> }> =
    [];
  const toasts: Array<{ variant?: string; message: string }> = [];
  let depth = 0;
  let size: "medium" | "large" | "xlarge" = "medium";
  // Capture the last DialogPrompt props for double-fire testing
  let lastPromptProps: Record<string, any> | undefined;
  let lastReplaceRender: (() => any) | undefined;
  // Capture slot registrations and Prompt component props
  let slotReg: Record<string, Function> | undefined;
  let lastUiPromptProps: Record<string, any> | undefined;

  const api = {
    app: { version: "0.0.0-test" },
    client: {} as any,
    event: { on: () => () => {} },
    renderer: {
      getSelection: () => ({
        getSelectedText: () => opts.selection ?? "",
      }),
    } as any,
    slots: {
      register: (reg: any) => {
        if (reg.slots) slotReg = reg.slots;
        return "mock";
      },
    },
    plugins: {
      list: () => [],
      activate: async () => false,
      deactivate: async () => false,
      add: async () => false,
      install: async () => ({ ok: false, message: "mock" }),
    },
    lifecycle: {
      signal: new AbortController().signal,
      onDispose: () => () => {},
    },
    command: {
      register: () => () => {},
      trigger: () => {},
      show: () => {},
    },
    route: {
      register: () => () => {},
      navigate: (name: string, params?: Record<string, unknown>) => {
        navigated.push({ name, params });
      },
      get current() {
        return {
          name: "session",
          params: { sessionID: opts.sessionID ?? "ses-1" },
        };
      },
    },
    ui: {
      Dialog: () => null,
      DialogAlert: () => null,
      DialogConfirm: () => null,
      DialogPrompt: (p: any) => {
        lastPromptProps = p;
        return null;
      },
      DialogSelect: () => null,
      Slot: () => null,
      Prompt: (p: any) => {
        lastUiPromptProps = p;
        return null;
      },
      toast: (t: any) => toasts.push(t),
      dialog: {
        replace: (fn: () => any) => {
          depth = 1;
          lastReplaceRender = fn;
          // Call the render function to instantiate the DialogPrompt
          // so its props (including onConfirm) get captured
          fn();
        },
        clear: () => {
          depth = 0;
          size = "medium";
        },
        setSize: (s: "medium" | "large" | "xlarge") => {
          size = s;
        },
        get size() {
          return size;
        },
        get depth() {
          return depth;
        },
        get open() {
          return depth > 0;
        },
      },
    },
    keybind: {
      match: () => false,
      print: (n: string) => n,
      create: () => ({
        all: {},
        get: () => "",
        match: () => false,
        print: (n: string) => n,
      }),
    },
    tuiConfig: {},
    kv: {
      get: (_n: string, fb?: unknown) => fb,
      set: () => {},
      get ready() {
        return true;
      },
    },
    state: {
      get ready() {
        return true;
      },
      get config() {
        return {} as any;
      },
      get provider() {
        return [];
      },
      get path() {
        return { home: "", state: "", config: "", worktree: "", directory: "" };
      },
      get vcs() {
        return undefined;
      },
      session: {
        count: () => 0,
        diff: () => [],
        todo: () => [],
        messages: () => opts.messages ?? [],
        status: () => undefined,
        permission: () => [],
        question: () => [],
      },
      part: () => opts.parts ?? [],
      lsp: () => [],
      mcp: () => [],
    },
    theme: {
      get current() {
        return theme();
      },
      get selected() {
        return "opencode";
      },
      has: () => false,
      set: () => false,
      install: async () => {},
      mode: () => "dark" as const,
      get ready() {
        return true;
      },
    },
  } satisfies TuiPluginApi;

  return {
    api,
    navigated,
    toasts,
    get lastPromptProps() {
      return lastPromptProps;
    },
    get slotReg() {
      return slotReg;
    },
    get lastUiPromptProps() {
      return lastUiPromptProps;
    },
  };
}

// ---------------------------------------------------------------------------
// Import plugin and extract the route render function
// ---------------------------------------------------------------------------

import plugin from "../src/tui";

async function setup(opts: MockOpts = {}) {
  const sid = opts.sessionID ?? "ses-1";
  const m = mock(opts);

  let render:
    | ((input: { params?: Record<string, unknown> }) => any)
    | undefined;
  (m.api as any).route.register = (routes: any[]) => {
    for (const r of routes) {
      if (r.name === "plan-comments") render = r.render;
    }
    return () => {};
  };

  await plugin.tui(m.api, undefined, {
    id: "plan-comments",
    source: "file",
    spec: ".",
    target: ".",
    first_time: 0,
    last_time: 0,
    time_changed: 0,
    load_count: 1,
    fingerprint: "test",
    state: "first",
  });

  if (!render) throw new Error("route not registered");

  store.clear(sid);

  const route = render;
  const app = await testRender(() => route({ params: { sessionID: sid } }), {
    width: 120,
    height: 40,
  });

  return {
    app,
    api: m.api,
    navigated: m.navigated,
    toasts: m.toasts,
    sid,
    get lastPromptProps() {
      return m.lastPromptProps;
    },
    get slotReg() {
      return m.slotReg;
    },
    get lastUiPromptProps() {
      return m.lastUiPromptProps;
    },
  };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("CommentView", () => {
  let cleanup: (() => void) | undefined;

  afterEach(() => {
    cleanup?.();
    cleanup = undefined;
  });

  test("renders empty state with 'No assistant output' message", async () => {
    const { app } = await setup();
    cleanup = () => app.renderer.destroy();

    await app.renderOnce();
    const frame = app.captureCharFrame();
    expect(frame).toContain("No assistant output");
  });

  test("renders 'Comments' panel header", async () => {
    const { app } = await setup();
    cleanup = () => app.renderer.destroy();

    await app.renderOnce();
    const frame = app.captureCharFrame();
    expect(frame).toContain("Comments");
  });

  test("renders footer with keybind hints", async () => {
    const { app } = await setup();
    cleanup = () => app.renderer.destroy();

    await app.renderOnce();
    const frame = app.captureCharFrame();
    expect(frame).toContain("esc back");
    expect(frame).toContain("j/k navigate");
    expect(frame).toContain("d delete");
    expect(frame).toContain("e edit");
  });

  test("shows 'no comments' when store is empty", async () => {
    const { app } = await setup();
    cleanup = () => app.renderer.destroy();

    await app.renderOnce();
    const frame = app.captureCharFrame();
    expect(frame).toContain("no comments");
  });

  test("escape navigates back to session", async () => {
    const { app, navigated, sid } = await setup();
    cleanup = () => app.renderer.destroy();

    await app.renderOnce();
    app.mockInput.pressEscape();
    await tick();
    await app.renderOnce();
    await tick();

    expect(navigated.length).toBeGreaterThanOrEqual(1);
    const last = navigated[navigated.length - 1];
    expect(last.name).toBe("session");
    expect(last.params?.sessionID).toBe(sid);
  });

  test("escape is blocked when dialog is open", async () => {
    const { app, api, navigated } = await setup();
    cleanup = () => app.renderer.destroy();

    api.ui.dialog.replace(() => null as any);
    expect(api.ui.dialog.open).toBe(true);

    await app.renderOnce();
    app.mockInput.pressEscape();
    await tick();
    await app.renderOnce();
    await tick();

    expect(navigated).toHaveLength(0);
  });

  test("d key is no-op when no comments exist", async () => {
    const { app, sid } = await setup();
    cleanup = () => app.renderer.destroy();

    await app.renderOnce();
    app.mockInput.pressKey("d");
    await tick();

    expect(store.all(sid)).toHaveLength(0);
  });

  test("e key is no-op when no comments exist", async () => {
    const { app, api } = await setup();
    cleanup = () => app.renderer.destroy();

    await app.renderOnce();
    app.mockInput.pressKey("e");
    await tick();

    expect(api.ui.dialog.open).toBe(false);
  });

  test("renders assistant output when messages exist", async () => {
    const { app } = await setup({
      messages: [{ id: "msg-1", role: "assistant" }],
      parts: [{ type: "text", text: "Hello from the assistant" }],
    });
    cleanup = () => app.renderer.destroy();

    await app.renderOnce();
    const frame = app.captureCharFrame();
    expect(frame).toContain("Comment on output");
    expect(frame).not.toContain("No assistant output");
  });

  test("renders 'Select text to leave a comment' hint", async () => {
    const { app } = await setup();
    cleanup = () => app.renderer.destroy();

    await app.renderOnce();
    const frame = app.captureCharFrame();
    expect(frame).toContain("Select text");
  });

  test("onConfirm double-fire guard: dialog.clear before mutation prevents second add", () => {
    // Unit test for the guard pattern used in both add and edit dialogs.
    // DialogPrompt fires onConfirm twice per Enter (useKeyboard + textarea onSubmit).
    // The plugin guards with: if (!dialog.open) return; dialog.clear(); mutate();
    // This test proves the pattern works.
    const sid = "double-fire-add";
    store.clear(sid);

    let depth = 0;
    const dialog = {
      replace: () => {
        depth = 1;
      },
      clear: () => {
        depth = 0;
      },
      get open() {
        return depth > 0;
      },
    };

    // Simulate opening dialog
    dialog.replace();
    expect(dialog.open).toBe(true);

    // The onConfirm handler pattern from our plugin:
    const onConfirm = (value: string) => {
      if (!dialog.open) return;
      dialog.clear();
      store.add(sid, "excerpt", value);
    };

    // Double-fire: called twice in rapid succession
    onConfirm("feedback");
    onConfirm("feedback");

    // Only ONE comment should exist
    expect(store.all(sid)).toHaveLength(1);
    expect(store.all(sid)[0].text).toBe("feedback");
  });

  test("onConfirm double-fire guard: dialog.clear before mutation prevents second edit", () => {
    const sid = "double-fire-edit";
    store.clear(sid);
    store.add(sid, "code", "original");
    const id = store.all(sid)[0].id;

    let depth = 0;
    const dialog = {
      replace: () => {
        depth = 1;
      },
      clear: () => {
        depth = 0;
      },
      get open() {
        return depth > 0;
      },
    };

    dialog.replace();

    // The onConfirm handler pattern from our plugin:
    const onConfirm = (value: string) => {
      if (!dialog.open) return;
      dialog.clear();
      store.edit(sid, id, value);
    };

    // Double-fire
    onConfirm("first edit");
    onConfirm("second edit");

    // Text should be "first edit", not "second edit"
    expect(store.all(sid)[0].text).toBe("first edit");
  });

  test("edit dialog opens via e key and double-fire is guarded", async () => {
    const { app, api, sid, lastPromptProps } = await setup();
    cleanup = () => app.renderer.destroy();

    // Add a comment via store + bump signal by pressing a key that triggers
    // a re-render. We need the list() memo to see the comment.
    // Since the signal is module-level in tui.tsx, we can't bump it directly.
    // Instead, we test by verifying that pressing 'e' with no comments
    // doesn't open dialog (already tested), and test the guard pattern
    // separately (above). Here we verify the integrated e-key flow
    // when we CAN get the dialog to open.

    // Use a fresh setup where we pre-seed the store BEFORE the component mounts
    // so the initial list() memo picks it up.
    app.renderer.destroy();

    // Re-setup with pre-seeded store
    const sid2 = "edit-guard-" + Date.now();
    store.add(sid2, "some code", "original");

    const m = mock({ sessionID: sid2 });
    let render2:
      | ((input: { params?: Record<string, unknown> }) => any)
      | undefined;
    (m.api as any).route.register = (routes: any[]) => {
      for (const r of routes) {
        if (r.name === "plan-comments") render2 = r.render;
      }
      return () => {};
    };
    await plugin.tui(m.api, undefined, {
      id: "plan-comments",
      source: "file",
      spec: ".",
      target: ".",
      first_time: 0,
      last_time: 0,
      time_changed: 0,
      load_count: 1,
      fingerprint: "test",
      state: "first",
    });
    const route2 = render2!;
    const app2 = await testRender(
      () => route2({ params: { sessionID: sid2 } }),
      { width: 120, height: 40 },
    );
    cleanup = () => app2.renderer.destroy();

    await app2.renderOnce();

    // Press 'e' to open edit dialog
    app2.mockInput.pressKey("e");
    await tick();

    expect(m.api.ui.dialog.open).toBe(true);
    expect(m.lastPromptProps).toBeTruthy();
    expect(m.lastPromptProps!.onConfirm).toBeInstanceOf(Function);

    // Simulate double-fire
    m.lastPromptProps!.onConfirm("edited");
    m.lastPromptProps!.onConfirm("edited again");

    // Should have first edit only
    const comments = store.all(sid2);
    expect(comments).toHaveLength(1);
    expect(comments[0].text).toBe("edited");
  });
});

// ---------------------------------------------------------------------------
// Deferred injection tests
// ---------------------------------------------------------------------------

describe("Deferred injection", () => {
  let cleanup: (() => void) | undefined;

  afterEach(() => {
    cleanup?.();
    cleanup = undefined;
  });

  test("session_prompt slot is registered with render function", async () => {
    const m = mock();
    let render:
      | ((input: { params?: Record<string, unknown> }) => any)
      | undefined;
    (m.api as any).route.register = (routes: any[]) => {
      for (const r of routes) {
        if (r.name === "plan-comments") render = r.render;
      }
      return () => {};
    };

    await plugin.tui(m.api, undefined, {
      id: "plan-comments",
      source: "file",
      spec: ".",
      target: ".",
      first_time: 0,
      last_time: 0,
      time_changed: 0,
      load_count: 1,
      fingerprint: "test",
      state: "first",
    });

    expect(m.slotReg).toBeDefined();
    expect(m.slotReg!.session_prompt).toBeInstanceOf(Function);
  });

  test("escape with comments stores pending and clears store", async () => {
    const sid = "defer-" + Date.now();
    store.add(sid, "some code", "fix this");
    store.add(sid, "other code", "refactor");

    const m = mock({ sessionID: sid });
    let render:
      | ((input: { params?: Record<string, unknown> }) => any)
      | undefined;
    (m.api as any).route.register = (routes: any[]) => {
      for (const r of routes) {
        if (r.name === "plan-comments") render = r.render;
      }
      return () => {};
    };

    await plugin.tui(m.api, undefined, {
      id: "plan-comments",
      source: "file",
      spec: ".",
      target: ".",
      first_time: 0,
      last_time: 0,
      time_changed: 0,
      load_count: 1,
      fingerprint: "test",
      state: "first",
    });

    const app = await testRender(
      () => render!({ params: { sessionID: sid } }),
      { width: 120, height: 40 },
    );
    cleanup = () => app.renderer.destroy();

    await app.renderOnce();

    // Press escape to trigger back()
    app.mockInput.pressEscape();
    await tick();
    await app.renderOnce();
    await tick();

    // Store should be cleared
    expect(store.all(sid)).toHaveLength(0);

    // Should have navigated back
    expect(m.navigated.length).toBeGreaterThanOrEqual(1);
    const nav = m.navigated[m.navigated.length - 1];
    expect(nav.name).toBe("session");
    expect(nav.params?.sessionID).toBe(sid);

    // Now simulate session re-mount: invoke the slot's ref callback
    // with a spy TuiPromptRef. The slot render function was captured by
    // our enhanced mock.
    expect(m.slotReg).toBeDefined();
    expect(m.slotReg!.session_prompt).toBeInstanceOf(Function);

    const calls: TuiPromptInfo[] = [];
    const spy: any = {
      focused: false,
      current: { input: "", parts: [] },
      set(p: TuiPromptInfo) {
        calls.push(p);
      },
      reset() {},
      blur() {},
      focus() {},
      submit() {},
    };

    // Invoke the slot render — this creates <api.ui.Prompt> which captures
    // its ref prop in lastUiPromptProps
    const ctx = {};
    const slotProps = {
      session_id: sid,
      visible: true,
      disabled: false,
      ref: undefined as any,
      on_submit: () => {},
    };
    m.slotReg!.session_prompt(ctx, slotProps);

    // The mock Prompt component should have been invoked with a ref callback
    expect(m.lastUiPromptProps).toBeDefined();
    expect(m.lastUiPromptProps!.ref).toBeInstanceOf(Function);

    // Simulate mount: call the ref with our spy
    m.lastUiPromptProps!.ref(spy);

    // pending should have been applied
    expect(calls).toHaveLength(1);
    expect(calls[0].input).toBe("[2 inline comments] ");
    expect(calls[0].parts).toHaveLength(1);
    expect(calls[0].parts![0].type).toBe("text");
    expect(calls[0].parts![0].text).toContain("<plan-feedback>");
    expect(calls[0].parts![0].text).toContain("fix this");
    expect(calls[0].parts![0].text).toContain("refactor");
  });

  test("escape with no comments does not set pending", async () => {
    const sid = "defer-empty-" + Date.now();
    store.clear(sid);

    const m = mock({ sessionID: sid });
    let render:
      | ((input: { params?: Record<string, unknown> }) => any)
      | undefined;
    (m.api as any).route.register = (routes: any[]) => {
      for (const r of routes) {
        if (r.name === "plan-comments") render = r.render;
      }
      return () => {};
    };

    await plugin.tui(m.api, undefined, {
      id: "plan-comments",
      source: "file",
      spec: ".",
      target: ".",
      first_time: 0,
      last_time: 0,
      time_changed: 0,
      load_count: 1,
      fingerprint: "test",
      state: "first",
    });

    const app = await testRender(
      () => render!({ params: { sessionID: sid } }),
      { width: 120, height: 40 },
    );
    cleanup = () => app.renderer.destroy();

    await app.renderOnce();

    // Press escape
    app.mockInput.pressEscape();
    await tick();
    await app.renderOnce();
    await tick();

    // Navigated back
    expect(m.navigated.length).toBeGreaterThanOrEqual(1);

    // Invoke slot ref callback — set() should NOT be called
    const calls: TuiPromptInfo[] = [];
    const spy: any = {
      focused: false,
      current: { input: "", parts: [] },
      set(p: TuiPromptInfo) {
        calls.push(p);
      },
      reset() {},
      blur() {},
      focus() {},
      submit() {},
    };

    const slotProps = {
      session_id: sid,
      visible: true,
      disabled: false,
      ref: undefined as any,
      on_submit: () => {},
    };
    m.slotReg!.session_prompt({}, slotProps);
    m.lastUiPromptProps!.ref(spy);

    expect(calls).toHaveLength(0);
  });

  test("pending is consumed after first ref callback (not re-applied)", async () => {
    const sid = "defer-once-" + Date.now();
    store.add(sid, "code", "feedback");

    const m = mock({ sessionID: sid });
    let render:
      | ((input: { params?: Record<string, unknown> }) => any)
      | undefined;
    (m.api as any).route.register = (routes: any[]) => {
      for (const r of routes) {
        if (r.name === "plan-comments") render = r.render;
      }
      return () => {};
    };

    await plugin.tui(m.api, undefined, {
      id: "plan-comments",
      source: "file",
      spec: ".",
      target: ".",
      first_time: 0,
      last_time: 0,
      time_changed: 0,
      load_count: 1,
      fingerprint: "test",
      state: "first",
    });

    const app = await testRender(
      () => render!({ params: { sessionID: sid } }),
      { width: 120, height: 40 },
    );
    cleanup = () => app.renderer.destroy();

    await app.renderOnce();
    app.mockInput.pressEscape();
    await tick();
    await app.renderOnce();
    await tick();

    const calls: TuiPromptInfo[] = [];
    const spy: any = {
      focused: false,
      current: { input: "", parts: [] },
      set(p: TuiPromptInfo) {
        calls.push(p);
      },
      reset() {},
      blur() {},
      focus() {},
      submit() {},
    };

    // First ref callback — should apply pending
    const slotProps = {
      session_id: sid,
      visible: true,
      disabled: false,
      ref: undefined as any,
      on_submit: () => {},
    };
    m.slotReg!.session_prompt({}, slotProps);
    m.lastUiPromptProps!.ref(spy);
    expect(calls).toHaveLength(1);

    // Second ref callback — pending should be consumed, not re-applied
    m.slotReg!.session_prompt({}, slotProps);
    m.lastUiPromptProps!.ref(spy);
    expect(calls).toHaveLength(1);
  });

  test("ref(undefined) does not trigger pending application", async () => {
    const sid = "defer-undef-" + Date.now();
    store.add(sid, "code", "feedback");

    const m = mock({ sessionID: sid });
    let render:
      | ((input: { params?: Record<string, unknown> }) => any)
      | undefined;
    (m.api as any).route.register = (routes: any[]) => {
      for (const r of routes) {
        if (r.name === "plan-comments") render = r.render;
      }
      return () => {};
    };

    await plugin.tui(m.api, undefined, {
      id: "plan-comments",
      source: "file",
      spec: ".",
      target: ".",
      first_time: 0,
      last_time: 0,
      time_changed: 0,
      load_count: 1,
      fingerprint: "test",
      state: "first",
    });

    const app = await testRender(
      () => render!({ params: { sessionID: sid } }),
      { width: 120, height: 40 },
    );
    cleanup = () => app.renderer.destroy();

    await app.renderOnce();
    app.mockInput.pressEscape();
    await tick();
    await app.renderOnce();
    await tick();

    // Call ref with undefined (simulating unmount) — should NOT crash or consume pending
    const slotProps = {
      session_id: sid,
      visible: true,
      disabled: false,
      ref: undefined as any,
      on_submit: () => {},
    };
    m.slotReg!.session_prompt({}, slotProps);
    m.lastUiPromptProps!.ref(undefined);

    // Now call with real ref — pending should still be there
    const calls: TuiPromptInfo[] = [];
    const spy: any = {
      focused: false,
      current: { input: "", parts: [] },
      set(p: TuiPromptInfo) {
        calls.push(p);
      },
      reset() {},
      blur() {},
      focus() {},
      submit() {},
    };

    m.slotReg!.session_prompt({}, slotProps);
    m.lastUiPromptProps!.ref(spy);
    expect(calls).toHaveLength(1);
    expect(calls[0].input).toBe("[1 inline comment] ");
  });

  test("pending payload has correct extmark source.text structure", async () => {
    const sid = "defer-extmark-" + Date.now();
    store.add(sid, "selected code", "needs refactoring");

    const m = mock({ sessionID: sid });
    let render:
      | ((input: { params?: Record<string, unknown> }) => any)
      | undefined;
    (m.api as any).route.register = (routes: any[]) => {
      for (const r of routes) {
        if (r.name === "plan-comments") render = r.render;
      }
      return () => {};
    };

    await plugin.tui(m.api, undefined, {
      id: "plan-comments",
      source: "file",
      spec: ".",
      target: ".",
      first_time: 0,
      last_time: 0,
      time_changed: 0,
      load_count: 1,
      fingerprint: "test",
      state: "first",
    });

    const app = await testRender(
      () => render!({ params: { sessionID: sid } }),
      { width: 120, height: 40 },
    );
    cleanup = () => app.renderer.destroy();

    await app.renderOnce();
    app.mockInput.pressEscape();
    await tick();
    await app.renderOnce();
    await tick();

    const calls: TuiPromptInfo[] = [];
    const spy: any = {
      focused: false,
      current: { input: "", parts: [] },
      set(p: TuiPromptInfo) {
        calls.push(p);
      },
      reset() {},
      blur() {},
      focus() {},
      submit() {},
    };

    const slotProps = {
      session_id: sid,
      visible: true,
      disabled: false,
      ref: undefined as any,
      on_submit: () => {},
    };
    m.slotReg!.session_prompt({}, slotProps);
    m.lastUiPromptProps!.ref(spy);

    expect(calls).toHaveLength(1);
    const payload = calls[0];
    const label = "[1 inline comment]";

    // input should be label + trailing space
    expect(payload.input).toBe(label + " ");

    // parts should have one TextPart with source.text extmark info
    expect(payload.parts).toHaveLength(1);
    const part = payload.parts![0] as any;
    expect(part.type).toBe("text");
    expect(part.source.text.start).toBe(0);
    expect(part.source.text.end).toBe(label.length);
    expect(part.source.text.value).toBe(label);

    // Full text should match format() output
    const expected = format([
      {
        id: "any",
        excerpt: "selected code",
        text: "needs refactoring",
        timestamp: 0,
      },
    ]);
    expect(part.text).toContain("<plan-feedback>");
    expect(part.text).toContain("needs refactoring");
    expect(part.text).toContain("selected code");
  });

  test("slot forwards ref callback to parent props.ref", async () => {
    const m = mock();
    (m.api as any).route.register = () => () => {};

    await plugin.tui(m.api, undefined, {
      id: "plan-comments",
      source: "file",
      spec: ".",
      target: ".",
      first_time: 0,
      last_time: 0,
      time_changed: 0,
      load_count: 1,
      fingerprint: "test",
      state: "first",
    });

    expect(m.slotReg).toBeDefined();

    // The slot should forward the ref to the parent's ref callback
    const refs: any[] = [];
    const slotProps = {
      session_id: "ses-1",
      visible: true,
      disabled: false,
      ref: (r: any) => refs.push(r),
      on_submit: () => {},
    };

    m.slotReg!.session_prompt({}, slotProps);
    const spy = {
      set() {},
      reset() {},
      blur() {},
      focus() {},
      submit() {},
      focused: false,
      current: { input: "", parts: [] },
    };
    m.lastUiPromptProps!.ref(spy);

    // Parent ref should have received the same ref
    expect(refs).toHaveLength(1);
    expect(refs[0]).toBe(spy);
  });
});
