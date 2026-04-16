# opencode-plan-comments

Inline comment plugin for [opencode](https://github.com/sst/opencode). Leave feedback on agent plan output and have it injected into the next chat turn as structured `<plan-feedback>` XML.

![demo](assets/demo.gif)

## Requirements

- **opencode >= v1.4.0**

## Install

```
opencode plugin opencode-plan-comments --global
```

Drop `--global` to install for the current project only.

## Usage

1. Open a session with assistant output
2. Type `/comment` to open the comment view
3. Select text in the left panel — a dialog appears for your feedback
4. <kbd>j</kbd> / <kbd>k</kbd> to navigate comments, <kbd>e</kbd> to edit, <kbd>d</kbd> to delete
5. <kbd>Escape</kbd> to return — comments appear as a `[N inline comments]` badge in the prompt
6. <kbd>Enter</kbd> to send, or <kbd>Backspace</kbd> the badge to discard

## License

MIT
