(function (global) {
  'use strict';

  const esc = (value) => String(value ?? '').replace(/[&<>"']/g, (ch) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  })[ch]);

  const riskLabel = (risk) => ({ safe: 'Low risk', caution: 'Use care', danger: 'Destructive' }[risk] || 'Review first');
  const riskIcon = (risk) => ({ safe: '●', caution: '▲', danger: '!' }[risk] || 'i');

  async function getData(base, platform) {
    const url = new URL(`data/${platform}.json`, base);
    const response = await fetch(url.href, { cache: 'no-cache' });
    if (!response.ok) throw new Error(`Could not load ${platform} command data (${response.status}).`);
    const data = await response.json();
    if (!Array.isArray(data.commands)) throw new Error(`The ${platform} command data file is missing its commands array.`);
    return data;
  }

  function mount(root, base, options) {
    if (!root) throw new Error('Command Academy needs a container element.');
    const settings = options || {};
    const baseUrl = base instanceof URL ? base : new URL(base || './', document.baseURI);
    root.classList.add('ca-app');
    root.innerHTML = '<div class="ca-loading">Loading command libraries…</div>';

    const state = {
      platform: settings.platform === 'windows' ? 'windows' : 'linux',
      datasets: { linux: null, windows: null },
      selected: null,
      filtered: [],
      activeSuggestion: 0,
      suggestions: [],
      output: 'Choose a command, browse the library, or start typing above. The explorer explains commands; it does not execute shell input.',
      outputLabel: 'READY',
      query: '',
      category: 'All categories'
    };

    const renderApp = () => {
      const active = state.datasets[state.platform];
      root.classList.toggle('ca-windows', state.platform === 'windows');
      root.innerHTML = `
        <div class="ca-shell">
          <header class="ca-topbar">
            <div class="ca-brand">
              <div class="ca-brandmark" aria-hidden="true">&gt;_</div>
              <div><h1>COMMAND ACADEMY</h1><p>FIELD MANUAL // INTERACTIVE REFERENCE</p></div>
            </div>
            <div class="ca-top-meta"><span class="ca-live-dot"></span><span>LOCAL LIBRARY</span><span>·</span><span>NO SHELL ACCESS</span></div>
          </header>

          <section class="ca-hero">
            <div>
              <p class="ca-eyebrow">Learn the command line // one command at a time</p>
              <h2>KNOW YOUR <span>COMMANDS.</span></h2>
              <p class="ca-hero-copy">Explore command syntax, flags, examples, and safety notes. Type a command to find it instantly, or browse the full library below.</p>
            </div>
            <div class="ca-counts" aria-label="Library sizes">
              <div class="ca-count"><strong data-linux-count>—</strong><span>Linux entries</span></div>
              <div class="ca-count"><strong data-windows-count>—</strong><span>CMD entries</span></div>
            </div>
          </section>

          <nav class="ca-platform-tabs" aria-label="Choose command environment">
            <button class="ca-platform-tab" type="button" data-platform="linux" aria-selected="${state.platform === 'linux'}"><span class="ca-platform-icon">$_</span> LINUX TERMINAL</button>
            <button class="ca-platform-tab" type="button" data-platform="windows" aria-selected="${state.platform === 'windows'}"><span class="ca-platform-icon">C:\\</span> WINDOWS CMD</button>
          </nav>

          <section class="ca-workspace">
            <section class="ca-window ca-terminal" aria-label="Command explorer">
              <div class="ca-window-bar">
                <div class="ca-window-title"><span class="ca-window-dots" aria-hidden="true"><i></i><i></i><i></i></span><strong data-terminal-title></strong></div>
                <div class="ca-window-tools"><span data-terminal-mode></span><span>● READY</span></div>
              </div>
              <div class="ca-terminal-body">
                <div class="ca-terminal-intro" data-terminal-intro></div>
                <form class="ca-command-form" autocomplete="off">
                  <label class="ca-terminal-line">
                    <span class="ca-prompt" data-prompt></span>
                    <input class="ca-command-input" type="text" spellcheck="false" autocapitalize="off" autocomplete="off" aria-label="Type a command to search the reference" placeholder="Type a command… try ls or dir">
                    <button class="ca-run-btn" type="submit">LOOK UP ↵</button>
                  </label>
                  <div class="ca-suggestions" data-suggestions hidden></div>
                  <div class="ca-terminal-hint"><span><kbd>↑</kbd> <kbd>↓</kbd> Navigate</span><span><kbd>Tab</kbd> Complete</span><span><kbd>Enter</kbd> Look up</span><span><kbd>Esc</kbd> Close</span></div>
                </form>
                <div class="ca-terminal-output" aria-live="polite"><span class="ca-output-label" data-output-label>READY</span><pre class="ca-output-text" data-output></pre></div>
                <p class="ca-terminal-note">This is a learning reference, not a live shell. Commands are never executed on your device or the website server.</p>
              </div>
            </section>

            <section class="ca-window ca-reference" aria-label="Command documentation">
              <div class="ca-window-bar"><div class="ca-window-title"><strong>COMMAND REFERENCE</strong><span>/</span><span data-ref-category>SELECT A COMMAND</span></div><div class="ca-window-tools">DOCS // 01</div></div>
              <div class="ca-reference-inner" data-reference></div>
            </section>
          </section>

          <section class="ca-catalog" aria-label="Command library">
            <div class="ca-catalog-head">
              <div><h3>Command directory</h3><p><span data-result-count>0</span> commands indexed · Select any entry to inspect it</p></div>
              <div class="ca-filters">
                <input class="ca-search" type="search" placeholder="Search name, purpose, or keyword…" aria-label="Search commands" data-search>
                <select class="ca-category" aria-label="Filter by category" data-category></select>
              </div>
            </div>
            <div class="ca-command-grid" data-command-grid></div>
          </section>

          <footer class="ca-footer">
            <span>COMMAND ACADEMY <span aria-hidden="true">//</span> LEARN. EXPLORE. UNDERSTAND.</span>
            <span class="ca-disclaimer">Command availability varies by distribution, installed packages, shell, and Windows version. Verify before use.</span>
          </footer>
        </div>`;

      root.querySelector('[data-linux-count]').textContent = state.datasets.linux.commands.length;
      root.querySelector('[data-windows-count]').textContent = state.datasets.windows.commands.length;
      root.querySelector('.ca-command-input').addEventListener('input', onCommandInput);
      root.querySelector('.ca-command-input').addEventListener('keydown', onCommandKeydown);
      root.querySelector('.ca-command-form').addEventListener('submit', onCommandSubmit);
      root.querySelector('[data-search]').addEventListener('input', (event) => {
        state.query = event.target.value.trim().toLowerCase();
        renderCatalog();
      });
      root.querySelector('[data-category]').addEventListener('change', (event) => {
        state.category = event.target.value;
        renderCatalog();
      });
      root.addEventListener('click', onRootClick);
      configurePlatform();
      populateCategories();
      renderCatalog();
      renderReference(state.selected || active.commands[0]);
      setOutput(state.outputLabel, state.output);
    };

    const configurePlatform = () => {
      const windows = state.platform === 'windows';
      root.querySelectorAll('[data-platform]').forEach((button) => button.setAttribute('aria-selected', String(button.dataset.platform === state.platform)));
      root.querySelector('[data-terminal-title]').textContent = windows ? 'Command Prompt — cmd.exe' : 'Terminal — Bash / GNU utilities';
      root.querySelector('[data-terminal-mode]').textContent = windows ? 'WINDOWS' : 'BASH';
      root.querySelector('[data-prompt]').textContent = windows ? 'C:\\Users\\Lamer>' : 'lamer@academy:~$';
      root.querySelector('[data-terminal-intro]').innerHTML = windows
        ? '<b>Microsoft Windows [Command Prompt]</b><br>Type a CMD command below. Suggestions include built-ins and common Windows utilities.'
        : '<b>Linux command explorer [Bash / GNU]</b><br>Type a command below. Suggestions include shell built-ins and common Linux utilities.';
      const input = root.querySelector('.ca-command-input');
      input.placeholder = windows ? 'Type a command… try dir or ipconfig' : 'Type a command… try ls or systemctl';
      input.value = '';
      state.selected = state.datasets[state.platform].commands[0] || null;
      state.query = '';
      state.category = 'All categories';
      root.querySelector('[data-search]').value = '';
      state.output = windows ? 'Ready. Try `dir`, `ipconfig`, or `tasklist`.' : 'Ready. Try `ls`, `pwd`, or `systemctl`.';
      state.outputLabel = 'READY';
      root.querySelector('[data-ref-category]').textContent = 'SELECT A COMMAND';
      root.querySelector('[data-suggestions]').hidden = true;
      populateCategories();
      renderCatalog();
      renderReference(state.selected);
      setOutput(state.outputLabel, state.output);
    };

    const populateCategories = () => {
      const select = root.querySelector('[data-category]');
      const categories = [...new Set(state.datasets[state.platform].commands.map((command) => command.category))].sort((a,b) => a.localeCompare(b));
      select.innerHTML = '<option>All categories</option>' + categories.map((category) => `<option>${esc(category)}</option>`).join('');
      select.value = state.category;
    };

    const renderCatalog = () => {
      const data = state.datasets[state.platform].commands;
      const filtered = data.filter((command) => {
        const matchesCategory = state.category === 'All categories' || command.category === state.category;
        const haystack = [command.name, command.category, command.summary, ...(command.tags || [])].join(' ').toLowerCase();
        return matchesCategory && (!state.query || haystack.includes(state.query));
      });
      state.filtered = filtered;
      root.querySelector('[data-result-count]').textContent = filtered.length;
      const grid = root.querySelector('[data-command-grid]');
      if (!filtered.length) {
        grid.innerHTML = '<div class="ca-no-results">No commands match that search. Try another keyword or category.</div>';
        return;
      }
      grid.innerHTML = filtered.map((command) => `<button class="ca-command-card" type="button" data-command="${esc(command.name)}" aria-pressed="${state.selected && state.selected.name === command.name}"><strong>${esc(command.name)}</strong><span>${esc(command.summary)}</span></button>`).join('');
    };

    const renderReference = (command) => {
      const panel = root.querySelector('[data-reference]');
      const category = root.querySelector('[data-ref-category]');
      if (!command) {
        panel.innerHTML = '<p class="ca-terminal-note">Select a command to view its documentation.</p>';
        category.textContent = 'NO COMMAND SELECTED';
        return;
      }
      state.selected = command;
      category.textContent = command.category.toUpperCase();
      const optionsHtml = (command.options || []).length ? `
        <section class="ca-ref-section"><h4 class="ca-section-label">Options & switches</h4><div class="ca-option-list">
          ${command.options.map((option) => `<div class="ca-option"><code>${esc(option.flag)}</code><span>${esc(option.description)}</span></div>`).join('')}
        </div></section>` : '';
      const examplesHtml = (command.examples || []).length ? `
        <section class="ca-ref-section"><h4 class="ca-section-label">Examples</h4>
          ${(command.examples || []).map((example, index) => `<article class="ca-example"><div class="ca-example-bar"><span>EXAMPLE ${index + 1}</span><button class="ca-small-btn" type="button" data-example="${index}" data-example-command="${esc(command.name)}">SHOW SAMPLE OUTPUT</button></div><code class="ca-example-command">${esc(example.command)}</code><div class="ca-example-desc">${esc(example.description || '')}</div></article>`).join('')}
        </section>` : '';
      const relatedHtml = (command.related || []).length ? `<div class="ca-meta-line"><strong>Related:</strong> ${command.related.map((name) => `<button type="button" class="ca-small-btn" data-related="${esc(name)}">${esc(name)}</button>`).join(' ')}</div>` : '';
      panel.innerHTML = `
        <div class="ca-ref-top"><div><h3 class="ca-ref-name">${esc(command.name)}</h3><p class="ca-ref-summary">${esc(command.summary)}</p></div><span class="ca-risk ${esc(command.risk || 'safe')}">${riskIcon(command.risk)} ${riskLabel(command.risk)}</span></div>
        <section class="ca-ref-section"><h4 class="ca-section-label">Syntax</h4><code class="ca-syntax">${esc(command.syntax)}</code></section>
        ${optionsHtml}
        ${examplesHtml}
        <p class="ca-meta-line"><strong>Compatibility:</strong> ${esc(command.compatibility || 'Check your operating system and installed utilities.')}</p>
        ${relatedHtml}`;
      renderCatalogSelection();
    };

    const renderCatalogSelection = () => {
      root.querySelectorAll('.ca-command-card').forEach((card) => card.setAttribute('aria-pressed', String(state.selected && card.dataset.command === state.selected.name)));
    };

    const setOutput = (label, message) => {
      const labelEl = root.querySelector('[data-output-label]');
      const outputEl = root.querySelector('[data-output]');
      if (labelEl) labelEl.textContent = label;
      if (outputEl) outputEl.textContent = message;
      state.outputLabel = label;
      state.output = message;
    };

    const exactCommand = (input) => {
      const commands = state.datasets[state.platform].commands;
      let normalized = input.trim().replace(/\s+/g, ' ').toLowerCase();
      if (!normalized) return null;
      if (normalized.startsWith('man ')) normalized = normalized.slice(4).trim();
      else if (normalized.startsWith('help ')) normalized = normalized.slice(5).trim();
      const tokens = normalized.split(' ');
      // Match the longest known command prefix (for multiword entries such as `net user`).
      for (let length = tokens.length; length > 0; length -= 1) {
        const candidate = tokens.slice(0, length).join(' ');
        const match = commands.find((item) => item.name.toLowerCase() === candidate);
        if (match) return match;
      }
      return null;
    };

    const optionSuggestions = (value) => {
      const commands = state.datasets[state.platform].commands;
      const tokens = value.trim().split(/\s+/);
      if (tokens.length < 2 || !/^[\-/]/.test(tokens[tokens.length - 1])) return null;
      const prefix = tokens.slice(0, -1).join(' ').toLowerCase();
      const command = commands.find((item) => item.name.toLowerCase() === prefix);
      if (!command) return null;
      const needle = tokens[tokens.length - 1].toLowerCase();
      const options = (command.options || []).filter((option) => option.flag.toLowerCase().split(/[, ]+/).some((flag) => flag.startsWith(needle)));
      return options.map((option) => ({ name: option.flag.split(',')[0].trim(), summary: option.description, kind: 'option', parent: command.name }));
    };

    const getSuggestions = (value) => {
      const trimmed = value.trim();
      if (!trimmed) return state.datasets[state.platform].commands.slice(0, 6).map((command) => ({ name: command.name, summary: command.summary, kind: 'command' }));
      const options = optionSuggestions(trimmed);
      if (options) return options.slice(0, 8);
      const lower = trimmed.toLowerCase();
      return state.datasets[state.platform].commands
        .filter((command) => command.name.toLowerCase().startsWith(lower) || command.name.toLowerCase().includes(lower))
        .slice(0, 8)
        .map((command) => ({ name: command.name, summary: command.summary, kind: 'command' }));
    };

    const renderSuggestions = () => {
      const box = root.querySelector('[data-suggestions]');
      if (!state.suggestions.length) { box.hidden = true; box.innerHTML = ''; return; }
      box.hidden = false;
      const title = state.suggestions[0].kind === 'option' ? 'OPTION COMPLETIONS' : 'COMMAND COMPLETIONS';
      box.innerHTML = `<div class="ca-suggestion-head">${title}</div>` + state.suggestions.map((item, index) => `<button type="button" class="ca-suggestion ${index === state.activeSuggestion ? 'is-active' : ''}" data-suggestion-index="${index}"><span class="ca-suggestion-name">${esc(item.name)}</span><span class="ca-suggestion-desc">${esc(item.summary)}</span></button>`).join('');
    };

    function onCommandInput(event) {
      state.suggestions = getSuggestions(event.target.value);
      state.activeSuggestion = 0;
      renderSuggestions();
    }

    function applySuggestion(index) {
      const item = state.suggestions[index];
      if (!item) return;
      const input = root.querySelector('.ca-command-input');
      if (item.kind === 'option') {
        const tokens = input.value.trim().split(/\s+/);
        tokens[tokens.length - 1] = item.name;
        input.value = tokens.join(' ') + ' ';
      } else {
        input.value = item.name;
        const command = state.datasets[state.platform].commands.find((entry) => entry.name === item.name);
        if (command) renderReference(command);
      }
      input.focus();
      state.suggestions = getSuggestions(input.value);
      state.activeSuggestion = 0;
      renderSuggestions();
    }

    function onCommandKeydown(event) {
      if (event.key === 'ArrowDown' && state.suggestions.length) {
        event.preventDefault(); state.activeSuggestion = (state.activeSuggestion + 1) % state.suggestions.length; renderSuggestions();
      } else if (event.key === 'ArrowUp' && state.suggestions.length) {
        event.preventDefault(); state.activeSuggestion = (state.activeSuggestion - 1 + state.suggestions.length) % state.suggestions.length; renderSuggestions();
      } else if (event.key === 'Tab' && state.suggestions.length) {
        event.preventDefault(); applySuggestion(state.activeSuggestion);
      } else if (event.key === 'Escape') {
        root.querySelector('[data-suggestions]').hidden = true;
      }
    }

    function onCommandSubmit(event) {
      event.preventDefault();
      const input = root.querySelector('.ca-command-input');
      const raw = input.value.trim();
      const lower = raw.toLowerCase();
      if (!raw) return;
      root.querySelector('[data-suggestions]').hidden = true;
      if (lower === 'clear' || lower === 'cls') {
        setOutput('SCREEN CLEARED', '');
        return;
      }
      if (lower === 'help' || lower === 'help commands') {
        setOutput('HELP', state.platform === 'linux'
          ? 'Type a command name to open its reference. Try: ls, cd, grep, find, chmod, ps, systemctl, ip, apt, ssh.'
          : 'Type a command name to open its reference. Try: dir, cd, copy, ipconfig, ping, tasklist, chkdsk, sfc, robocopy.');
        return;
      }
      const command = exactCommand(raw);
      if (command) {
        renderReference(command);
        setOutput('REFERENCE LOADED', `${command.name}\n${command.summary}\n\nNo command was executed. Select SHOW SAMPLE OUTPUT in the documentation to inspect an illustrative example.`);
      } else {
        setOutput('NOT IN THIS LIBRARY', `No matching command was found for: ${raw}\nTry a shorter command name, browse the directory, or add the command using the included command editor.`);
      }
    }

    function onRootClick(event) {
      const platformButton = event.target.closest('[data-platform]');
      if (platformButton) {
        const next = platformButton.dataset.platform;
        if (next !== state.platform) { state.platform = next; configurePlatform(); }
        return;
      }
      const suggestion = event.target.closest('[data-suggestion-index]');
      if (suggestion) { applySuggestion(Number(suggestion.dataset.suggestionIndex)); return; }
      const card = event.target.closest('[data-command]');
      if (card) {
        const command = state.datasets[state.platform].commands.find((item) => item.name === card.dataset.command);
        if (command) { renderReference(command); setOutput('REFERENCE LOADED', `${command.name}\n${command.summary}\n\nNo command was executed.`); }
        return;
      }
      const sample = event.target.closest('[data-example]');
      if (sample) {
        const command = state.datasets[state.platform].commands.find((item) => item.name === sample.dataset.exampleCommand);
        const example = command && command.examples[Number(sample.dataset.example)];
        if (example) {
          root.querySelector('.ca-command-input').value = example.command;
          setOutput('SIMULATED SAMPLE OUTPUT', `${example.command}\n\n${example.output || 'Illustrative output depends on the system and supplied arguments.'}\n\n[Example only — nothing was executed.]`);
        }
        return;
      }
      const related = event.target.closest('[data-related]');
      if (related) {
        const term = related.dataset.related.toLowerCase();
        const command = state.datasets[state.platform].commands.find((item) => item.name.toLowerCase() === term);
        if (command) { renderReference(command); setOutput('REFERENCE LOADED', `${command.name}\n${command.summary}\n\nNo command was executed.`); }
      }
    }

    Promise.all([getData(baseUrl, 'linux'), getData(baseUrl, 'windows')]).then(([linux, windows]) => {
      state.datasets.linux = linux;
      state.datasets.windows = windows;
      renderApp();
    }).catch((error) => {
      root.innerHTML = `<div class="ca-loading"><strong>Command Academy could not load.</strong><p>${esc(error.message)}</p><p>Check that <code>data/linux.json</code> and <code>data/windows.json</code> are published alongside the site.</p></div>`;
    });

    return { version: '1.0.0' };
  }

  global.CommandAcademy = { mount, version: '1.0.0' };
})(window);
