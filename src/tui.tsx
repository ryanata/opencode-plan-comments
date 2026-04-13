import type {
  TuiPlugin,
  TuiPluginApi,
  TuiPluginModule,
  TuiPromptRef,
} from "@opencode-ai/plugin/tui";
import { createMemo, createSignal, For, Show } from "solid-js";
import { useKeyboard } from "@opentui/solid";
import * as store from "./store";
import { format } from "./format";

function truncate(str: string, max: number) {
  if (str.length <= max) return str;
  return str.slice(0, max - 1) + "…";
}

function output(api: TuiPluginApi, sid: string): string {
  const msgs = api.state.session.messages(sid);
  const last = [...msgs].reverse().find((m) => m.role === "assistant");
  if (!last) return "";
  const parts = api.state.part(last.id);
  return parts
    .filter(
      (p) => p.type === "text" && !(p as any).synthetic && !(p as any).ignored,
    )
    .map((p) => (p as any).text as string)
    .join("\n")
    .trim();
}

// Module-level ref captured by the prompt slot
let prompt: TuiPromptRef | undefined;

// Reactivity: local signal that store mutations bump
const [rev, bump] = createSignal(0);

function addComment(session: string, excerpt: string, text: string) {
  store.add(session, excerpt, text);
  bump((n) => n + 1);
}

function removeComment(session: string, id: string) {
  store.remove(session, id);
  bump((n) => n + 1);
}

function editComment(session: string, id: string, text: string) {
  store.edit(session, id, text);
  bump((n) => n + 1);
}

function clearComments(session: string) {
  store.clear(session);
  bump((n) => n + 1);
}

function CommentView(props: {
  api: TuiPluginApi;
  params?: Record<string, unknown>;
}) {
  const sid = () => (props.params?.sessionID as string) ?? "";
  const theme = () => props.api.theme.current;
  const text = createMemo(() => output(props.api, sid()));
  const [selected, setSelected] = createSignal(0);

  const list = createMemo(() => {
    rev();
    return store.all(sid());
  });

  function back() {
    const comments = store.all(sid());
    if (comments.length > 0 && prompt) {
      const label = `[${comments.length} inline comment${comments.length > 1 ? "s" : ""}]`;
      prompt.set({
        input: label + " ",
        parts: [
          {
            type: "text" as const,
            text: format(comments),
            source: {
              text: {
                start: 0,
                end: label.length,
                value: label,
              },
            },
          },
        ],
      });
      clearComments(sid());
    }
    props.api.route.navigate("session", { sessionID: sid() });
  }

  function capture() {
    const sel = (props.api.renderer as any).getSelection?.();
    const txt = sel?.getSelectedText?.();
    if (!txt?.trim()) return;

    const excerpt = txt;
    props.api.ui.dialog.replace(() => (
      <props.api.ui.DialogPrompt
        title="Comment on selection"
        placeholder="Your feedback..."
        description={() => (
          <box>
            <text fg={theme().textMuted} wrapMode="char">
              {truncate(excerpt.trim(), 120)}
            </text>
          </box>
        )}
        onConfirm={(value) => {
          if (!props.api.ui.dialog.open) return;
          if (!value.trim()) {
            props.api.ui.toast({
              variant: "warning",
              message: "Comment cannot be empty",
            });
            return;
          }
          props.api.ui.dialog.clear();
          addComment(sid(), excerpt, value.trim());
          props.api.ui.toast({ variant: "success", message: "Comment added" });
        }}
        onCancel={() => {
          props.api.ui.dialog.clear();
        }}
      />
    ));
  }

  function clamp(idx: number) {
    const len = list().length;
    if (len === 0) return 0;
    return Math.max(0, Math.min(idx, len - 1));
  }

  useKeyboard((evt) => {
    if (props.api.ui.dialog.open) return;

    if (evt.name === "escape") {
      evt.preventDefault();
      evt.stopPropagation();
      back();
      return;
    }

    if (evt.name === "j" || evt.name === "down") {
      evt.preventDefault();
      setSelected((n) => clamp(n + 1));
      return;
    }

    if (evt.name === "k" || evt.name === "up") {
      evt.preventDefault();
      setSelected((n) => clamp(n - 1));
      return;
    }

    if (evt.name === "d") {
      const items = list();
      const idx = selected();
      const item = items[idx];
      if (!item) return;
      evt.preventDefault();
      removeComment(sid(), item.id);
      setSelected(clamp(idx >= items.length - 1 ? idx - 1 : idx));
      return;
    }

    if (evt.name === "e") {
      const items = list();
      const item = items[selected()];
      if (!item) return;
      evt.preventDefault();
      props.api.ui.dialog.replace(() => (
        <props.api.ui.DialogPrompt
          title="Edit comment"
          placeholder="Your feedback..."
          value={item.text}
          description={() => (
            <box>
              <text fg={theme().textMuted} wrapMode="char">
                {truncate(item.excerpt.trim(), 120)}
              </text>
            </box>
          )}
          onConfirm={(value) => {
            if (!props.api.ui.dialog.open) return;
            if (!value.trim()) {
              props.api.ui.toast({
                variant: "warning",
                message: "Comment cannot be empty",
              });
              return;
            }
            props.api.ui.dialog.clear();
            editComment(sid(), item.id, value.trim());
            props.api.ui.toast({
              variant: "success",
              message: "Comment updated",
            });
          }}
          onCancel={() => {
            props.api.ui.dialog.clear();
          }}
        />
      ));
      return;
    }
  });

  return (
    <box
      flexDirection="column"
      flexGrow={1}
      onMouseUp={(evt: any) => {
        evt.stopPropagation();
        setTimeout(capture, 10);
      }}
    >
      {/* Header */}
      <box paddingLeft={2} paddingRight={2} paddingTop={1}>
        <text fg={theme().text}>
          <b>Comment on output</b>
        </text>
      </box>

      {/* Main content */}
      <box
        flexDirection="row"
        flexGrow={1}
        paddingLeft={2}
        paddingRight={1}
        paddingTop={1}
      >
        {/* Left: assistant output */}
        <box flexGrow={1} paddingRight={2}>
          <Show
            when={text()}
            fallback={
              <box flexGrow={1} justifyContent="center" alignItems="center">
                <text fg={theme().textMuted}>
                  No assistant output in this session
                </text>
              </box>
            }
          >
            <scrollbox flexGrow={1} stickyScroll={false}>
              <code
                filetype="markdown"
                content={text()}
                selectable={true}
                fg={theme().text}
              />
            </scrollbox>
          </Show>
        </box>

        {/* Right: comments panel */}
        <box
          width={36}
          border={["left"]}
          borderColor={theme().border}
          paddingLeft={1}
          paddingRight={1}
          flexDirection="column"
        >
          <text fg={theme().text}>
            <b>Comments</b>
          </text>
          <Show when={list().length === 0}>
            <box marginTop={1}>
              <text fg={theme().textMuted} wrapMode="char">
                Select text to leave a comment
              </text>
            </box>
          </Show>
          <scrollbox flexGrow={1} marginTop={1}>
            <For each={list()}>
              {(item, idx) => (
                <box
                  marginBottom={1}
                  bg={idx() === selected() ? theme().selection : undefined}
                  paddingLeft={idx() === selected() ? 1 : 0}
                >
                  <text fg={theme().textMuted} wrapMode="char">
                    {">" + truncate(item.excerpt.trim(), 50)}
                  </text>
                  <text fg={theme().text} wrapMode="char">
                    {item.text}
                  </text>
                </box>
              )}
            </For>
          </scrollbox>
        </box>
      </box>

      {/* Footer */}
      <box
        flexDirection="row"
        justifyContent="space-between"
        paddingLeft={2}
        paddingRight={2}
        paddingBottom={1}
        border={["top"]}
        borderColor={theme().border}
      >
        <text fg={theme().textMuted}>
          esc back j/k navigate d delete e edit
        </text>
        <text fg={list().length > 0 ? theme().warning : theme().textMuted}>
          {list().length > 0
            ? `${list().length} comment${list().length > 1 ? "s" : ""}`
            : "no comments"}
        </text>
      </box>
    </box>
  );
}

const tui: TuiPlugin = async (api) => {
  // Capture PromptRef via session_prompt slot
  api.slots.register({
    order: 100,
    slots: {
      session_prompt(_ctx, props) {
        return (
          <api.ui.Prompt
            visible={props.visible}
            disabled={props.disabled}
            ref={(r) => {
              prompt = r;
              props.ref?.(r);
            }}
            onSubmit={props.on_submit}
            sessionID={props.session_id}
          />
        );
      },
    },
  });

  api.route.register([
    {
      name: "plan-comments",
      render: (input) => <CommentView api={api} params={input.params} />,
    },
  ]);

  api.command.register(() => [
    {
      title: "Comment on output",
      value: "plan-comments.open",
      slash: { name: "comment" },
      category: "Plan",
      description: "Open comment view for the latest assistant output",
      onSelect() {
        const route = api.route.current;
        if (route.name !== "session") {
          api.ui.toast({ variant: "warning", message: "Open a session first" });
          return;
        }
        api.route.navigate("plan-comments", {
          sessionID: route.params.sessionID,
        });
      },
    },
    {
      title: "Clear plan comments",
      value: "plan-comments.clear",
      category: "Plan",
      description: "Remove all comments for the current session",
      onSelect() {
        const route = api.route.current;
        if (route.name === "session") {
          clearComments(route.params.sessionID);
          api.ui.toast({ variant: "success", message: "Comments cleared" });
          return;
        }
        api.ui.toast({ variant: "warning", message: "No active session" });
      },
    },
  ]);
};

export default {
  id: "plan-comments",
  tui,
} satisfies TuiPluginModule & { id: string };
