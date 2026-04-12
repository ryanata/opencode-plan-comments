import type { Plugin, PluginModule } from "@opencode-ai/plugin";
import * as store from "./store";
import { format } from "./format";

const server: Plugin = async () => ({
  "experimental.chat.messages.transform": async (_input, output) => {
    const msgs = output.messages;
    let last: (typeof msgs)[number] | undefined;
    for (let i = msgs.length - 1; i >= 0; i--) {
      if ((msgs[i] as any).info.role === "user") {
        last = msgs[i];
        break;
      }
    }
    if (!last) return;

    const session = (last.info as any).sessionID as string;
    if (!session) return;

    const comments = store.pending(session);
    if (!comments.length) return;

    const idx = last.parts.findIndex((p: any) => p.type === "text");
    const part = {
      id: `plan-comment-${Date.now()}`,
      messageID: last.info.id,
      sessionID: session,
      type: "text" as const,
      text: format(comments),
      synthetic: true,
    };

    if (idx >= 0) last.parts.splice(idx, 0, part as any);
    else last.parts.push(part as any);

    store.resolve(session);
  },
});

export default {
  id: "plan-comments",
  server,
} satisfies PluginModule & { id: string };
