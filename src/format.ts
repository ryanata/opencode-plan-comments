import type { Comment } from "./store";

function truncate(str: string, max: number) {
  if (str.length <= max) return str;
  return str.slice(0, max - 1) + "…";
}

export function format(comments: Comment[]): string {
  const items = comments
    .map(
      (c, i) =>
        `${i + 1}. Regarding: "${truncate(c.excerpt.trim(), 200)}"\n   Feedback: ${c.text}`,
    )
    .join("\n\n");

  return `<plan-feedback>
The user has provided inline feedback on specific parts of your plan output. Address each comment in your revised response:

${items}
</plan-feedback>`;
}
