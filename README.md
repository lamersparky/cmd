# Command Academy

A static, GitHub Pages-friendly Linux and Windows Command Prompt learning reference. The interface looks like a terminal, provides command-name autocomplete, option suggestions, searchable categories, syntax, option explanations, examples, related commands, compatibility notes, and safety labels.

**Starter catalog:** 182 Linux entries and 115 Windows CMD entries (297 total). This is a curated starting library, not a claim to contain every command available on every Linux distribution or Windows release. Linux commands vary by shell, distribution, optional packages, and local configuration; Windows command availability varies by edition and version. The data format is designed so the catalog can grow.

## 1. Publish on GitHub Pages

1. Create a GitHub repository, for example `command-academy`.
2. Upload the contents of this folder to the repository root. Keep the `assets/`, `data/`, `embed/`, and `tools/` folders together with `index.html` and `admin.html`.
3. In GitHub, open **Settings → Pages**.
4. Under **Build and deployment**, select **Deploy from a branch**. Choose your default branch (usually `main`) and folder **/(root)**, then save.
5. Wait for GitHub Pages to publish the site. Your site URL will look like `https://YOUR-USERNAME.github.io/command-academy/`.

No Node.js, package manager, build step, database, or server is required. The public site is static HTML, CSS, JavaScript, and JSON.

## 2. Use the site by itself

Open the GitHub Pages URL. The Linux and Windows CMD tabs share the same interface and have separate command libraries and color themes.

### Keyboard behavior

- Type a command name to see autocomplete suggestions.
- Use **Up / Down** to move through suggestions.
- Press **Tab** to complete the highlighted suggestion.
- Press **Enter** or **LOOK UP** to open the command reference.
- Type a switch prefix after a command (for example, `ls -` or `dir /`) to see matching option suggestions when the command has documented options.
- Use the directory search and category selector to browse the library.
- Select **SHOW SAMPLE OUTPUT** to display illustrative output in the terminal panel.

**Safety:** This is a documentation and learning interface, not a shell. It never executes visitor input, and sample output is clearly labeled as simulated.

## 3. Embed it in another website with one script

After GitHub Pages publishes your project, add a container and one script tag to the page where you want the explorer to appear. Replace the URL with your actual GitHub Pages address:

```html
<div id="command-academy"></div>
<script defer src="https://YOUR-USERNAME.github.io/command-academy/embed/command-academy.js" data-target="#command-academy"></script>
```

The loader automatically adds the CSS and application JavaScript, fetches both JSON command libraries, and mounts the explorer inside the container. There is no need to paste the large JavaScript bundle into your existing site.

You can choose an initial tab with `data-platform="linux"` or `data-platform="windows"`. The user can still switch between the two environments after the widget loads.

If your host page uses a strict Content Security Policy, allow the GitHub Pages host in `script-src`, `style-src`, and `connect-src` as appropriate. The widget uses `fetch()` to read its JSON files from the same GitHub Pages origin that serves the loader.

## 4. Add commands in the browser

Open `https://YOUR-USERNAME.github.io/command-academy/admin.html`.

1. Choose Linux or Windows CMD.
2. Enter the command name, category, description, and syntax.
3. Add options one per line using `FLAG | explanation`.
4. Add examples one per line using `COMMAND | DESCRIPTION | SAMPLE OUTPUT`.
5. Click **Add to library & prepare download**.
6. Replace `data/linux.json` or `data/windows.json` in your GitHub repository with the downloaded file and commit the change.

The browser editor intentionally downloads the revised JSON instead of attempting to write to GitHub. GitHub Pages is static hosting; it has no server-side write access. Do not put a GitHub personal access token in a public website.

## 5. Add commands locally with the helper script

From the repository directory:

```bash
python3 tools/add-command.py --platform linux
```

The script prompts for the command details, validates the entry, and updates `data/linux.json`. For Windows CMD:

```bash
python3 tools/add-command.py --platform windows
```

You can also supply fields directly:

```bash
python3 tools/add-command.py \
  --platform linux \
  --name journalctl \
  --category 'System & Diagnostics' \
  --summary 'Query the systemd journal.' \
  --syntax 'journalctl [OPTIONS] [MATCHES]' \
  --risk safe \
  --compatibility 'systemd-based Linux distributions' \
  --option='-b|Show messages from the current boot.' \
  --option='-u UNIT|Filter by systemd unit.' \
  --example 'journalctl -u ssh|Show SSH service logs.|sshd[123]: Server listening'
```

Options and examples can be repeated. Each option uses `FLAG|description`; each example uses `COMMAND|DESCRIPTION|SAMPLE OUTPUT`. Use `--dry-run` to print and validate the entry without changing the JSON file.

The shorter Bash wrapper is also available:

```bash
tools/add-command.sh --platform linux
```

## 6. Command record format

The two files under `data/` use the same JSON schema. A command record looks like this:

```json
{
  "name": "example",
  "category": "System & Diagnostics",
  "summary": "A one-line explanation.",
  "description": "A one-line explanation.",
  "syntax": "example [OPTIONS] TARGET",
  "options": [
    { "flag": "-v", "description": "Enable verbose output." }
  ],
  "examples": [
    {
      "command": "example -v file.txt",
      "description": "Run the example in verbose mode.",
      "output": "Illustrative output goes here."
    }
  ],
  "risk": "safe",
  "compatibility": "Document OS and package requirements here.",
  "tags": ["sample", "reference"],
  "related": ["another-command"]
}
```

`risk` must be `safe`, `caution`, or `danger`. Sample output is text only and is never evaluated.

## 7. Validate the libraries

Run:

```bash
python3 tools/validate-data.py
```

This checks JSON syntax, required fields, duplicate command names, and supported safety labels.

## File layout

```text
command-academy/
├── index.html                  # Standalone website
├── admin.html                  # Browser-based command editor
├── README.md
├── assets/
│   ├── css/command-academy.css
│   └── js/app.js
├── data/
│   ├── linux.json
│   └── windows.json
├── embed/
│   ├── command-academy.js      # One-script embed loader
│   └── example-snippet.html
└── tools/
    ├── add-command.py          # Interactive/local command updater
    ├── add-command.sh
    └── validate-data.py
```

## License

MIT. See `LICENSE`.
