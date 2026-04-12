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

function session(api: TuiPluginApi): string | undefined {
  const route = api.route.current;
  if (route.name === "session") return route.params.sessionID;
  return undefined;
}

function Listener(props: {
  api: TuiPluginApi;
  keys: ReturnType<TuiPluginApi["keybind"]["create"]>;
}) {
  useKeyboard((evt) => {
    if (!props.keys.match("comment", evt)) return;
    evt.preventDefault();
    evt.stopPropagation();

    const sel = (props.api.renderer as any).getSelection?.();
    const text = sel?.getSelectedText?.();
    if (!text || !text.trim()) {
      props.api.ui.toast({
        variant: "warning",
        message: "Select text in the plan output first",
      });
      return;
    }

    const sid = session(props.api);
    if (!sid) {
      props.api.ui.toast({
        variant: "warning",
        message: "Open a session first",
      });
      return;
    }

    const excerpt = text;
    (props.api.renderer as any).clearSelection?.();

    props.api.ui.dialog.replace(() => (
      <props.api.ui.DialogPrompt
        title="Comment on plan"
        placeholder="Your feedback..."
        description={() => (
          <box>
            <text fg={props.api.theme.current.textMuted} wrapMode="char">
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
          store.add(sid, excerpt, value.trim());
          props.api.ui.dialog.clear();
          props.api.ui.toast({ variant: "success", message: "Comment added" });
        }}
        onCancel={() => {
          props.api.ui.dialog.clear();
        }}
      />
    ));
  });

  return null;
}

function Sidebar(props: { api: TuiPluginApi; session_id: string }) {
  const theme = () => props.api.theme.current;
  const [tick, setTick] = createSignal(0);

  const list = createMemo(() => {
    tick();
    return store.all(props.session_id);
  });

  const timer = setInterval(() => setTick((n) => n + 1), 500);
  props.api.lifecycle.onDispose(() => clearInterval(timer));

  return (
    <Show when={list().length > 0}>
      <box>
        <text fg={theme().text}>
          <b>Plan Comments</b>
        </text>
        <For each={list()}>
          {(item) => (
            <box marginTop={1}>
              <text fg={theme().textMuted} wrapMode="char">
                {"> " + truncate(item.excerpt.trim(), 60)}
              </text>
              <text
                fg={item.resolved ? theme().textMuted : theme().text}
                wrapMode="char"
              >
                {"  " + item.text}
              </text>
              <text fg={item.resolved ? theme().success : theme().warning}>
                {item.resolved ? "  [resolved]" : "  [pending]"}
              </text>
            </box>
          )}
        </For>
      </box>
    </Show>
  );
}

const tui: TuiPlugin = async (api) => {
  const keys = api.keybind.create({ comment: "ctrl+m" });

  api.slots.register({
    order: 900,
    slots: {
      app() {
        return <Listener api={api} keys={keys} />;
      },
    },
  });

  api.slots.register({
    order: 350,
    slots: {
      sidebar_content(_ctx, props) {
        return <Sidebar api={api} session_id={props.session_id} />;
      },
    },
  });

  api.command.register(() => [
    {
      title: "Clear plan comments",
      value: "plan-comments.clear",
      category: "Plan",
      description: "Remove all comments for the current session",
      onSelect() {
        const sid = session(api);
        if (!sid) {
          api.ui.toast({ variant: "warning", message: "No active session" });
          return;
        }
        store.clear(sid);
        api.ui.toast({ variant: "success", message: "Comments cleared" });
      },
    },
  ]);
};

export default {
  id: "plan-comments",
  tui,
} satisfies TuiPluginModule & { id: string };
