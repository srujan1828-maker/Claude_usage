# Claude Usage Tracker

A small Manifest V3 Chrome extension that provides a polished local dashboard for a Claude usage window. It helps you record messages used, see the remaining allowance, and count down to the reset you configure.

## Install in Chrome

1. Open `chrome://extensions`.
2. Enable **Developer mode**.
3. Select **Load unpacked** and choose this repository folder.
4. Pin **Claude Usage Tracker** and open it from the toolbar.

## Using the tracker

- Set your plan's message limit, window duration, and the actual reset date/time with the cog button.
- Select **Log a message** after sending a Claude message. The remaining allowance and progress ring update immediately.
- Select **Undo** to correct the most recent entry.
- The tracker starts a fresh window automatically at the configured reset time; **Start fresh** resets it immediately.

All tracker data is stored in `chrome.storage.local` in the current browser profile. The extension does not collect, send, or inspect conversation data. Claude usage limits can vary by plan and load, so configure the dashboard using the usage information shown in your Claude account.

## In-Claude widget

When you visit `claude.ai`, the extension also displays a compact tracker alongside the prompt area. It mirrors the popup's remaining messages and reset countdown in real time. Minimize it with the `−` control and select the pill to expand it again. The widget also estimates input tokens as you type, automatically adds the input-token estimate and one message when it detects a sent prompt, and shows a live session timer. Token tracking is an estimate based on local prompt text (roughly 4 characters per token); Claude does not expose authoritative response or hidden-context token counts to browser extensions. Use the **+ Log message** and **Undo** controls directly in the widget to correct tracking, or use the toolbar popup to change the tracking configuration.
