# opencode-plan-comments

Inline comment plugin for opencode. Leave feedback on LLM output and have it
injected into the next chat turn as structured `<plan-feedback>` XML.

## Install

Clone next to your opencode checkout:

```
cd ~/repos
git clone <url> opencode-plan-comments
```

Add to `~/.config/opencode/tui.json`:

```json
{
  "plugin": ["/Users/you/repos/opencode-plan-comments"]
}
```

Restart opencode.

## Usage

1. Open a session with assistant output
2. Type `/comment` to open the comment view
3. Select text in the left panel — a dialog appears for your feedback
4. Use `j`/`k` to navigate comments, `e` to edit, `d` to delete
5. Press `Escape` to return — comments appear as a `[N inline comments]`
   badge in the prompt
6. Press `Enter` to send, or backspace the badge to discard
