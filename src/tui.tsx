import type {
  TuiPlugin,
  TuiPluginApi,
  TuiPluginModule,
} from "@opencode-ai/plugin/tui";
import { createMemo, createSignal, For, Show } from "solid-js";
import { useKeyboard } from "@opentui/solid";
import * as store from "./store";

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

function CommentView(props: {
  api: TuiPluginApi;
  params?: Record<string, unknown>;
}) {
  const sid = () => (props.params?.sessionID as string) ?? "";
  const theme = () => props.api.theme.current;
  const text = createMemo(() => output(props.api, sid()));
  const [tick, setTick] = createSignal(0);

  const list = createMemo(() => {
    tick();
    return store.all(sid());
  });

  const pending = createMemo(() => list().filter((c) => !c.resolved).length);

  const timer = setInterval(() => setTick((n) => n + 1), 500);
  props.api.lifecycle.onDispose(() => clearInterval(timer));

  function back() {
    props.api.route.navigate("session", { sessionID: sid() });
  }

  function capture() {
    const sel = (props.api.renderer as any).getSelection?.();
    const selected = sel?.getSelectedText?.();
    if (!selected?.trim()) return;

    const excerpt = selected;
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
          if (!value.trim()) {
            props.api.ui.toast({
              variant: "warning",
              message: "Comment cannot be empty",
            });
            return;
          }
          store.add(sid(), excerpt, value.trim());
          props.api.ui.dialog.clear();
          props.api.ui.toast({ variant: "success", message: "Comment added" });
          setTick((n) => n + 1);
        }}
        onCancel={() => {
          props.api.ui.dialog.clear();
        }}
      />
    ));
  }

  useKeyboard((evt) => {
    if (evt.name === "escape") {
      if (props.api.ui.dialog.open) return;
      evt.preventDefault();
      evt.stopPropagation();
      back();
    }
  });

  return (
    <box
      flexDirection="column"
      flexGrow={1}
      onMouseUp={(evt: any) => {
        evt.stopPropagation();
        // Small delay so the selection is finalized before we read it
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
        {/* Left: plan text */}
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
        >
          <text fg={theme().text}>
            <b>Comments</b>
          </text>
          <Show when={list().length === 0}>
            <box marginTop={1}>
              <text fg={theme().textMuted} wrapMode="char">
                Select text on the left to leave a comment
              </text>
            </box>
          </Show>
          <scrollbox flexGrow={1} marginTop={1}>
            <For each={list()}>
              {(item) => (
                <box marginBottom={1}>
                  <text fg={theme().textMuted} wrapMode="char">
                    {">" + truncate(item.excerpt.trim(), 50)}
                  </text>
                  <text
                    fg={item.resolved ? theme().textMuted : theme().text}
                    wrapMode="char"
                  >
                    {item.text}
                  </text>
                  <text fg={item.resolved ? theme().success : theme().warning}>
                    {item.resolved ? "[resolved]" : "[pending]"}
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
        <text fg={theme().textMuted}>esc back to session</text>
        <text fg={pending() > 0 ? theme().warning : theme().textMuted}>
          {pending() > 0 ? `${pending()} pending` : "no comments"}
        </text>
      </box>
    </box>
  );
}

const tui: TuiPlugin = async (api) => {
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
          store.clear(route.params.sessionID);
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
