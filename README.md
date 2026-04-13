# opencode-plan-comments

Inline comment plugin for [opencode](https://github.com/sst/opencode). Leave feedback on agent plan output and have it
injected into the next chat turn as structured `<plan-feedback>` XML.

## Install

Clone the repo:

```
cd ~/repos
git clone https://github.com/ryanata/opencode-plan-comments.git
cd opencode-plan-comments
bun install
```

Add to `~/.config/opencode/tui.json` (or `.opencode/tui.json` in your project):

```json
{
  "plugin": ["~/repos/opencode-plan-comments"]
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

## Development

```
bun install
bun test
```

## License

MIT
