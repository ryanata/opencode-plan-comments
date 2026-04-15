# opencode-plan-comments

Inline comment plugin for [opencode](https://github.com/sst/opencode). Leave feedback on agent plan output and have it
injected into the next chat turn as structured `<plan-feedback>` XML.

## Requirements

- **opencode >= v1.4.0** (requires `session_prompt` slot, `TuiPromptRef`, and `@opentui/core` 0.1.97+)

The plugin uses the `session_prompt` slot (introduced in v1.3.14) and
`@opentui/core` 0.1.97 (shipped with v1.4.0). Older versions are missing
these APIs. A runtime guard will show an error toast if the required APIs
are not available.

| Feature used                                               | Minimum opencode version |
| ---------------------------------------------------------- | ------------------------ |
| TUI plugin system                                          | v1.3.13                  |
| `session_prompt` slot / `TuiPromptRef` / `PromptRef.set()` | v1.3.14                  |
| `@opentui/core` 0.1.97                                     | v1.4.0                   |

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

## License

MIT
