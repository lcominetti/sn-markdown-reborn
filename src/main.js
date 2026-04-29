document.addEventListener("DOMContentLoaded", function (event) {
  let componentRelay;
  let workingNote, clientData;
  let lastValue, lastUUID;
  let editor;
  let ignoreTextChange = false;
  let initialLoad = true;
  let syntaxMarks = [];

  function loadComponentRelay() {
    const initialPermissions = [{ name: "stream-context-item" }];
    componentRelay = new ComponentRelay({
      initialPermissions,
      targetWindow: window,
      onReady: function () {
        const platform = componentRelay.platform;
        if (platform) {
          document.body.classList.add(platform);
        }
        loadEditor();
        editor.setOption("styleSelectedText", !componentRelay.isMobile);
      },
      handleRequestForContentHeight: () => {
        return undefined;
      },
    });
    componentRelay.streamContextItem((note) => {
      onReceivedNote(note);
    });
  }

  function saveNote() {
    if (workingNote) {
      let note = workingNote;
      componentRelay.saveItemWithPresave(note, () => {
        lastValue = editor.getValue();
        note.content.text = lastValue;
        note.clientData = clientData;
        note.content.preview_plain = null;
        note.content.preview_html = null;
      });
    }
  }

  function onReceivedNote(note) {
    if (note.uuid !== lastUUID) {
      lastValue = null;
      initialLoad = true;
      lastUUID = note.uuid;
    }
    workingNote = note;
    if (note.isMetadataUpdate) {
      return;
    }
    clientData = note.clientData;
    if (editor) {
      if (note.content.text !== lastValue) {
        ignoreTextChange = true;
        editor.getDoc().setValue(workingNote.content.text);
        ignoreTextChange = false;
        applyMarks();
      }
      if (initialLoad) {
        initialLoad = false;
        editor.getDoc().clearHistory();
      }
      editor.setOption("spellcheck", workingNote.content.spellcheck);
    }
  }

  function applyMarks() {
    syntaxMarks.forEach((m) => m.clear());
    syntaxMarks = [];

    // Remove HR line classes from all lines
    const doc = editor.getDoc();
    const lineCount = doc.lineCount();
    for (let i = 0; i < lineCount; i++) {
      editor.removeLineClass(i, "wrap", "cm-hr-line");
    }

    for (let i = 0; i < lineCount; i++) {
      const lineText = doc.getLine(i);

      // Headers: mark the leading "### " prefix
      const headerMatch = lineText.match(/^(#{1,6} )/);
      if (headerMatch) {
        syntaxMarks.push(
          doc.markText(
            { line: i, ch: 0 },
            { line: i, ch: headerMatch[1].length },
            { className: "cm-syntax-hidden cm-header-syntax" },
          ),
        );
        continue;
      }

      // Horizontal rule: add class to the line wrapper for CSS ::after trick
      if (/^-{3,}$/.test(lineText.trim())) {
        editor.addLineClass(i, "wrap", "cm-hr-line");
        continue;
      }

      // Links: [label](url) — replace whole thing with a clickable widget
      const linkRegex = /\[([^\]]+)\]\(([^)]+)\)/g;
      let linkMatch;
      while ((linkMatch = linkRegex.exec(lineText)) !== null) {
        const label = linkMatch[1];
        const url = linkMatch[2];
        const from = { line: i, ch: linkMatch.index };
        const to = { line: i, ch: linkMatch.index + linkMatch[0].length };

        const anchor = document.createElement("a");
        anchor.textContent = label;
        anchor.href = url;
        anchor.className = "cm-link-widget";
        anchor.setAttribute("target", "_blank");
        anchor.setAttribute("rel", "noopener noreferrer");
        anchor.addEventListener("click", (e) => {
          e.preventDefault();
          window.open(url, "_blank", "noopener,noreferrer");
        });

        syntaxMarks.push(
          doc.markText(from, to, {
            replacedWith: anchor,
            handleMouseEvents: true,
          }),
        );
      }

      // Bold: mark each ** delimiter
      markDelimiters(doc, i, lineText, /\*\*/g, 2, "cm-syntax-hidden");

      // Italic: mark single * not part of **
      markItalicDelimiters(doc, i, lineText);

      // Inline code: mark each ` backtick
      markDelimiters(doc, i, lineText, /`/g, 1, "cm-syntax-hidden");
    }
  }

  function markDelimiters(doc, line, text, regex, len, className) {
    let match;
    while ((match = regex.exec(text)) !== null) {
      syntaxMarks.push(
        doc.markText(
          { line, ch: match.index },
          { line, ch: match.index + len },
          { className },
        ),
      );
    }
  }

  function markItalicDelimiters(doc, line, text) {
    const regex = /(?<!\*)\*(?!\*)/g;
    let match;
    while ((match = regex.exec(text)) !== null) {
      syntaxMarks.push(
        doc.markText(
          { line, ch: match.index },
          { line, ch: match.index + 1 },
          { className: "cm-syntax-hidden" },
        ),
      );
    }
  }

  function updateActiveLine() {
    const doc = editor.getDoc();
    const cursor = doc.getCursor();
    const lineCount = doc.lineCount();

    for (let i = 0; i < lineCount; i++) {
      editor.removeLineClass(i, "wrap", "cm-active-line");
    }
    editor.addLineClass(cursor.line, "wrap", "cm-active-line");
  }

  function loadEditor() {
    editor = CodeMirror.fromTextArea(document.getElementById("code"), {
      mode: "gfm",
      lineWrapping: true,
      extraKeys: { "Alt-F": "findPersistent" },
      inputStyle: getInputStyleForEnvironment(),
    });
    editor.setSize(undefined, "100%");

    editor.on("change", function () {
      if (ignoreTextChange) {
        return;
      }
      applyMarks();
      saveNote();
    });

    editor.on("cursorActivity", function () {
      updateActiveLine();
    });

    updateActiveLine();
  }

  function getInputStyleForEnvironment() {
    const environment = componentRelay.environment ?? "web";
    return environment === "mobile" ? "textarea" : "contenteditable";
  }

  loadComponentRelay();
});
