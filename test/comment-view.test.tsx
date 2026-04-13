/** @jsxImportSource @opentui/solid */
import { describe, test, expect, afterEach } from "bun:test";
import { testRender } from "@opentui/solid";
import { RGBA } from "@opentui/core";
import type { TuiPluginApi, TuiPromptInfo } from "@opencode-ai/plugin/tui";
import * as store from "../src/store";

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
};

function mock(opts: MockOpts = {}) {
  const navigated: Array<{ name: string; params?: Record<string, unknown> }> =
    [];
  const toasts: Array<{ variant?: string; message: string }> = [];
  let depth = 0;
  let size: "medium" | "large" | "xlarge" = "medium";

  const api = {
    app: { version: "0.0.0-test" },
    client: {} as any,
    event: { on: () => () => {} },
    renderer: {} as any,
    slots: { register: () => "mock" },
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
      DialogPrompt: () => null,
      DialogSelect: () => null,
      Slot: () => null,
      Prompt: () => null,
      toast: (t: any) => toasts.push(t),
      dialog: {
        replace: () => {
          depth = 1;
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

  return { api, navigated, toasts };
}

// ---------------------------------------------------------------------------
// Import plugin and extract the route render function
// ---------------------------------------------------------------------------

import plugin from "../src/tui";

async function setup(opts: MockOpts = {}) {
  const sid = opts.sessionID ?? "ses-1";
  const { api, navigated, toasts } = mock(opts);

  let render:
    | ((input: { params?: Record<string, unknown> }) => any)
    | undefined;
  (api as any).route.register = (routes: any[]) => {
    for (const r of routes) {
      if (r.name === "plan-comments") render = r.render;
    }
    return () => {};
  };

  await plugin.tui(api, undefined, {
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

  return { app, api, navigated, toasts, sid };
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
});
