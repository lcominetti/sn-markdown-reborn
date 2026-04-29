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

    const doc = editor.getDoc();
    const lineCount = doc.lineCount();

    for (let i = 0; i < lineCount; i++) {
      editor.removeLineClass(i, "wrap", "cm-hr-line");
      editor.removeLineClass(i, "wrap", "cm-checkbox-line");
      editor.removeLineClass(i, "wrap", "cm-checkbox-checked");
    }

    for (let i = 0; i < lineCount; i++) {
      const lineText = doc.getLine(i);

      if (applyHeaderMarks(doc, i, lineText)) continue;
      if (applyHorizontalRuleMarks(i, lineText)) continue;

      applyCheckboxMarks(doc, i, lineText);
      applyLinkMarks(doc, i, lineText);
      applyBoldMarks(doc, i, lineText);
      applyItalicMarks(doc, i, lineText);
      applyInlineCodeMarks(doc, i, lineText);
    }
  }

  function applyHeaderMarks(doc, i, lineText) {
    const headerMatch = lineText.match(/^(#{1,6} )/);
    if (!headerMatch) return false;

    syntaxMarks.push(
      doc.markText(
        { line: i, ch: 0 },
        { line: i, ch: headerMatch[1].length },
        { className: "cm-syntax-hidden cm-header-syntax" },
      ),
    );
    return true;
  }

  function applyHorizontalRuleMarks(i, lineText) {
    if (!/^-{3,}$/.test(lineText.trim())) return false;

    editor.addLineClass(i, "wrap", "cm-hr-line");
    return true;
  }

  function applyCheckboxMarks(doc, i, lineText) {
    const checkboxRegex = /\[([ x])\]/gi;
    let checkboxMatch;

    while ((checkboxMatch = checkboxRegex.exec(lineText)) !== null) {
      const checked = checkboxMatch[1].toLowerCase() === "x";
      const matchIndex = checkboxMatch.index;
      const from = { line: i, ch: matchIndex };
      const to = { line: i, ch: matchIndex + 3 };
      const lineIndex = i;

      editor.addLineClass(i, "wrap", "cm-checkbox-line");
      if (checked) {
        editor.addLineClass(i, "wrap", "cm-checkbox-checked");
      }

      const checkbox = document.createElement("input");
      checkbox.type = "checkbox";
      checkbox.checked = checked;
      checkbox.className = "cm-checkbox-widget";

      checkbox.addEventListener("mousedown", (e) => {
        e.preventDefault();
        e.stopPropagation();
      });

      checkbox.addEventListener("click", (e) => {
        e.preventDefault();
        e.stopPropagation();
        const currentText = doc.getLine(lineIndex);
        const toggled =
          currentText.slice(0, matchIndex) +
          (!checked ? "[x]" : "[ ]") +
          currentText.slice(matchIndex + 3);
        doc.replaceRange(
          toggled,
          { line: lineIndex, ch: 0 },
          { line: lineIndex, ch: currentText.length },
        );
        saveNote();
      });

      syntaxMarks.push(
        doc.markText(from, to, {
          replacedWith: checkbox,
          handleMouseEvents: true,
        }),
      );
    }
  }

  function applyLinkMarks(doc, i, lineText) {
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
  }

  function applyBoldMarks(doc, i, lineText) {
    markDelimiters(doc, i, lineText, /\*\*/g, 2, "cm-syntax-hidden");
  }

  function applyItalicMarks(doc, i, lineText) {
    markItalicDelimiters(doc, i, lineText);
  }

  function applyInlineCodeMarks(doc, i, lineText) {
    markDelimiters(doc, i, lineText, /`/g, 1, "cm-syntax-hidden");
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
