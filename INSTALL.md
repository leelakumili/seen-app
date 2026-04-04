<p align="center">
  <img src="src/assets/logo.svg" alt="Seen" width="56">
</p>

# Installing Seen

Platform install steps, AI setup, and troubleshooting. For everything else, see [README.md](README.md).

## Download

Go to the [Releases page](https://github.com/leelakumili/seen/releases) and download the installer for your platform:

| Platform | File |
|---|---|
| macOS (Apple Silicon) | `Seen-x.x.x-arm64.dmg` |
| macOS (Intel) | `Seen-x.x.x-x64.dmg` |
| Windows | `Seen-Setup-x.x.x.exe` |
| Linux (Debian/Ubuntu) | `Seen_x.x.x_amd64.deb` |

---

## macOS

1. Open the `.dmg` file
2. Drag **Seen** into your Applications folder
3. Launch Seen from Applications or Spotlight

### "Seen can't be opened" warning

Seen is not yet notarized with Apple. macOS will block the first launch.

**Option A — System Settings (recommended):**
1. Try to open Seen — you'll see the warning
2. Open **System Settings → Privacy & Security**
3. Scroll to the blocked app notice and click **Open Anyway**
4. Confirm in the dialog that appears

**Option B — Terminal (one-time):**
```bash
xattr -dr com.apple.quarantine /Applications/Seen.app
```

You only need to do this once.

---

## Windows

1. Run the `.exe` installer
2. If Windows SmartScreen appears, click **More info → Run anyway**
3. Follow the installer steps — Seen is added to your Start Menu

SmartScreen warns on unsigned apps from new publishers. This is expected until the app builds reputation with Microsoft's systems.

---

## Linux

```bash
sudo dpkg -i Seen_x.x.x_amd64.deb
```

Launch from your application menu or run `seen` in a terminal.

If you see dependency errors, run `sudo apt --fix-broken install` and try again.

---

## AI setup

### Ollama (default)

Seen uses Ollama by default. Your career data stays on your machine — nothing is sent to a cloud provider.

1. Install Ollama from [ollama.com](https://ollama.com)
2. Pull a model:
   ```bash
   ollama pull mistral
   ```
   Mistral is recommended — it handles the writing tasks (brag docs, narratives) well and runs efficiently on most machines.
3. Start Ollama before opening Seen:
   ```bash
   ollama serve
   ```

You can change the host and model in **Settings → AI provider**.

### Anthropic API

For higher-quality outputs, switch to Claude. Anthropic requires an API key and is billed per use.

1. Get an API key from [console.anthropic.com](https://console.anthropic.com)
2. Open **Settings → AI provider**, select **Anthropic**, enter your API key and model name

The key is stored locally in your SQLite database — it never leaves your machine.

Recommended models:
- `claude-haiku-4-5` — fast, lower cost
- `claude-sonnet-4-6` — best output quality

---

## First launch

Open **Settings** and fill in:

- **Your name and role** — used to personalise AI-generated outputs (brag docs use your role in their framing)
- **Manager's name** — optional, included in review narratives
- **Target role / date** — optional, helps the AI frame outputs at the right level
- **AI provider** — Ollama (default) or Anthropic API

---

## Uninstalling

| Platform | Steps |
|---|---|
| macOS | Drag Seen from Applications to Trash. Data: `~/Library/Application Support/seen/` |
| Windows | Add/Remove Programs → Seen. Data: `%APPDATA%\seen\` |
| Linux | `sudo dpkg -r seen`. Data: `~/.config/seen/` |

To delete your data as well, remove the folder above after uninstalling.

---

## Troubleshooting

**No AI responses**
Make sure Ollama is running (`ollama serve`). If using Anthropic, check that your API key is entered correctly in Settings → AI provider. Keys must start with `sk-ant-`.

**Ollama stops responding after the machine sleeps**
Run `ollama serve` again to restart it. To avoid this, set Ollama to start on login via your system's startup settings.

**Blank white screen on launch**
Quit and reopen. If it persists, delete the app and reinstall from the latest release.

**"Developer cannot be verified" persists after allowing in Settings**
Run the Terminal command in the macOS section above.

**App won't launch on Windows after install**
Try running as administrator the first time. If that doesn't help, check that your antivirus isn't quarantining the executable.

**Linux: app launches but is blank or crashes**
Run `seen` from a terminal to see the error output. Missing system libraries (`libgconf`, `libnss3`) are a common cause — install them with `sudo apt install libgconf-2-4 libnss3`.
