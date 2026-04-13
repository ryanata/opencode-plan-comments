import { describe, test, expect } from "bun:test";
import { format } from "../src/format";
import type { Comment } from "../src/store";

function comment(excerpt: string, text: string): Comment {
  return { id: "pc-1", excerpt, text, timestamp: Date.now() };
}

describe("format", () => {
  test("single comment generates valid XML", () => {
    const out = format([comment("const x = 1", "why not use let?")]);
    expect(out).toContain("<plan-feedback>");
    expect(out).toContain("</plan-feedback>");
    expect(out).toContain('1. Regarding: "const x = 1"');
    expect(out).toContain("Feedback: why not use let?");
  });

  test("multiple comments are numbered", () => {
    const out = format([
      comment("line one", "feedback one"),
      comment("line two", "feedback two"),
      comment("line three", "feedback three"),
    ]);
    expect(out).toContain('1. Regarding: "line one"');
    expect(out).toContain('2. Regarding: "line two"');
    expect(out).toContain('3. Regarding: "line three"');
  });

  test("long excerpts are truncated with ellipsis", () => {
    const long = "x".repeat(300);
    const out = format([comment(long, "too long")]);
    // truncate at 200 chars: 199 chars + "…"
    expect(out).not.toContain(long);
    expect(out).toContain("…");
    const match = out.match(/Regarding: "([^"]*)"/);
    expect(match).toBeTruthy();
    expect(match![1].length).toBe(200);
  });

  test("excerpt whitespace is trimmed", () => {
    const out = format([comment("  spaced  ", "note")]);
    expect(out).toContain('Regarding: "spaced"');
  });

  test("contains instruction text", () => {
    const out = format([comment("x", "y")]);
    expect(out).toContain(
      "The user has provided inline feedback on specific parts of your plan output",
    );
  });

  test("comments are separated by blank lines", () => {
    const out = format([comment("a", "first"), comment("b", "second")]);
    // two items separated by \n\n
    const items = out.split("\n\n").filter((s) => s.match(/^\d+\. Regarding/));
    expect(items).toHaveLength(2);
  });
});
