const ruleForm = document.getElementById("ruleForm");
const ruleIndexField = document.getElementById("ruleIndex");
const patternInput = document.getElementById("pattern");
const typeSelect = document.getElementById("type");
const transformationsInput = document.getElementById("transformations");
const sampleUrlInput = document.getElementById("sampleUrl");
const testButton = document.getElementById("testRule");
const testResultsList = document.getElementById("testResults");
const testStatus = document.getElementById("testStatus");
const formStatus = document.getElementById("formStatus");
const resetButton = document.getElementById("resetForm");
const rulesList = document.getElementById("rulesList");
const importBtn = document.getElementById("importBtn");
const exportBtn = document.getElementById("exportBtn");
const importFile = document.getElementById("importFile");
const importMode = document.getElementById("importMode");

let paths = [];
let statusTimer = null;

document.addEventListener("DOMContentLoaded", init);
ruleForm.addEventListener("submit", onSaveRule);
resetButton.addEventListener("click", resetForm);
testButton.addEventListener("click", onTestRule);
importBtn.addEventListener("click", () => importFile.click());
exportBtn.addEventListener("click", onExport);
importFile.addEventListener("change", onImport);

async function init() {
  await loadPaths();
  renderRules();
  resetForm();
}

async function loadPaths() {
  const stored = await storageGet({ paths: [] });
  paths = Array.isArray(stored.paths) ? stored.paths.filter(isValidRuleShape) : [];
}

async function persistPaths(message) {
  await storageSet({ paths });
  if (message) {
    showFormStatus(message);
  }
  renderRules();
}

async function onSaveRule(event) {
  event.preventDefault();
  const pattern = patternInput.value.trim();
  const type = typeSelect.value === "regex" ? "regex" : "string";
  const transformations = transformationsInput.value
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  if (!pattern) {
    showFormStatus("Pattern is required.");
    return;
  }

  if (transformations.length === 0) {
    showFormStatus("Add at least one transformation.");
    return;
  }

  const indexValue = ruleIndexField.value;
  const rule = { pattern, type, transformations };

  try {
    if (indexValue) {
      const index = Number(indexValue);
      if (Number.isInteger(index) && index >= 0 && index < paths.length) {
        paths[index] = rule;
        await persistPaths("Rule updated.");
      }
    } else {
      paths.push(rule);
      await persistPaths("Rule saved.");
    }
    resetForm();
  } catch (error) {
    console.error("Failed to save rule", error);
    showFormStatus("Unable to persist rules. Try again.");
  }
}

function resetForm() {
  ruleForm.reset();
  ruleIndexField.value = "";
  typeSelect.value = "string";
  testResultsList.innerHTML = "";
  testStatus.textContent = "";
}

function renderRules() {
  rulesList.innerHTML = "";
  if (!paths.length) {
    const empty = document.createElement("p");
    empty.className = "form__hint";
    empty.textContent = "No rules saved yet.";
    rulesList.appendChild(empty);
    return;
  }

  paths.forEach((rule, index) => {
    const card = document.createElement("article");
    card.className = "rule-card";

    const meta = document.createElement("div");
    meta.className = "rule-card__meta";

    const patternEl = document.createElement("span");
    patternEl.className = "rule-card__pattern";
    patternEl.textContent = rule.pattern;

    const typeChip = document.createElement("span");
    typeChip.className = "rule-card__type";
    typeChip.textContent = rule.type === "regex" ? "Regex" : "String";

    meta.append(patternEl, typeChip);

    const list = document.createElement("ol");
    list.className = "rule-card__list";
    rule.transformations.forEach((tpl) => {
      const item = document.createElement("li");
      item.textContent = tpl;
      list.appendChild(item);
    });

    const actions = document.createElement("div");
    actions.className = "rule-card__actions";

    const editBtn = document.createElement("button");
    editBtn.type = "button";
    editBtn.className = "secondary";
    editBtn.textContent = "Edit";
    editBtn.addEventListener("click", () => populateForm(rule, index));

    const deleteBtn = document.createElement("button");
    deleteBtn.type = "button";
    deleteBtn.textContent = "Delete";
    deleteBtn.addEventListener("click", () => deleteRule(index));

    actions.append(editBtn, deleteBtn);

    card.append(meta, list, actions);
    rulesList.appendChild(card);
  });
}

function populateForm(rule, index) {
  patternInput.value = rule.pattern;
  typeSelect.value = rule.type === "regex" ? "regex" : "string";
  transformationsInput.value = rule.transformations.join("\n");
  ruleIndexField.value = String(index);
  showFormStatus("Editing rule #" + (index + 1) + ". Save to apply changes.");
  window.scrollTo({ top: 0, behavior: "smooth" });
}

async function deleteRule(index) {
  const rule = paths[index];
  const confirmed = window.confirm(`Delete rule "${rule.pattern}"?`);
  if (!confirmed) {
    return;
  }
  paths.splice(index, 1);
  try {
    await persistPaths("Rule deleted.");
    resetForm();
  } catch (error) {
    console.error("Failed to delete rule", error);
    showFormStatus("Unable to delete rule. Try again.");
  }
}

function onTestRule() {
  testResultsList.innerHTML = "";
  testStatus.textContent = "";

  const sampleUrl = sampleUrlInput.value.trim();
  if (!sampleUrl) {
    testStatus.textContent = "Enter a sample URL to run the test.";
    return;
  }

  const rule = {
    pattern: patternInput.value.trim(),
    type: typeSelect.value === "regex" ? "regex" : "string",
    transformations: transformationsInput.value
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean),
  };

  if (!rule.pattern || rule.transformations.length === 0) {
    testStatus.textContent = "Add a pattern and at least one transformation first.";
    return;
  }

  const results = resolveTransformations(rule, sampleUrl, { strict: false });
  if (!results || results.length === 0) {
    testStatus.textContent = "No match for this sample URL.";
    return;
  }

  results.forEach((item) => {
    const li = document.createElement("li");
    li.className = "test-results__item";
    li.innerHTML = `<strong>Target:</strong> ${escapeHtml(item.target)}<br><small>Template: ${escapeHtml(
      item.template
    )}</small>`;
    if (!item.validUrl) {
      const warn = document.createElement("div");
      warn.className = "form__hint";
      warn.textContent = "Note: result is not a fully qualified URL.";
      li.appendChild(warn);
    }
    testResultsList.appendChild(li);
  });

  testStatus.textContent = "Match found.";
}

function resolveTransformations(rule, url, options = {}) {
  const strict = options.strict !== false;
  if (!rule || typeof rule.pattern !== "string" || !Array.isArray(rule.transformations)) {
    return null;
  }

  if (rule.type === "regex") {
    let regex;
    try {
      regex = new RegExp(rule.pattern);
    } catch (error) {
      console.warn("Invalid regex pattern", rule.pattern, error);
      return null;
    }
    const match = url.match(regex);
    if (!match) {
      return null;
    }
    return rule.transformations
      .filter((tpl) => typeof tpl === "string" && tpl.length > 0)
      .map((tpl) => {
        const target = tpl.replace(/\\(\d+)/g, (full, group) => {
          const groupIndex = Number(group);
          return match[groupIndex] ?? "";
        });
        return {
          template: tpl,
          target,
          validUrl: isLikelyUrl(target),
        };
      })
      .filter((item) => !strict || item.validUrl);
  }

  if (!url.includes(rule.pattern)) {
    return null;
  }

  return rule.transformations
    .filter((tpl) => typeof tpl === "string" && tpl.length > 0)
    .map((tpl) => {
      const target = tpl
        .replace(/\{\{\s*url\s*\}\}/gi, url)
        .replace(/\{\{\s*pattern\s*\}\}/gi, rule.pattern);
      return {
        template: tpl,
        target,
        validUrl: isLikelyUrl(target),
      };
    })
    .filter((item) => !strict || item.validUrl);
}

function isLikelyUrl(value) {
  try {
    new URL(value);
    return true;
  } catch (error) {
    return false;
  }
}

function onExport() {
  const payload = JSON.stringify(paths, null, 2);
  const blob = new Blob([payload], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  const timestamp = new Date().toISOString().split("T")[0];
  link.download = `url-paths-${timestamp}.json`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

async function onImport(event) {
  const file = event.target.files && event.target.files[0];
  if (!file) {
    return;
  }

  try {
    const text = await file.text();
    const parsed = JSON.parse(text);
    const incoming = normaliseImportedData(parsed);
    if (!incoming.length) {
      showFormStatus("No valid rules found in import file.");
      return;
    }

    if (importMode.value === "replace") {
      paths = incoming;
    } else {
      paths = paths.concat(incoming);
    }

    await persistPaths("Rules imported.");
    resetForm();
  } catch (error) {
    console.error("Import failed", error);
    showFormStatus("Failed to import rules. Check the file format.");
  } finally {
    importFile.value = "";
  }
}

function normaliseImportedData(data) {
  if (Array.isArray(data)) {
    return data.filter(isValidRuleShape);
  }
  if (data && Array.isArray(data.paths)) {
    return data.paths.filter(isValidRuleShape);
  }
  return [];
}

function isValidRuleShape(rule) {
  return (
    rule &&
    typeof rule.pattern === "string" &&
    (rule.type === "regex" || rule.type === "string") &&
    Array.isArray(rule.transformations) &&
    rule.transformations.every((tpl) => typeof tpl === "string")
  );
}

function escapeHtml(value) {
  const input = String(value ?? "");
  return input
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function showFormStatus(message) {
  formStatus.textContent = message;
  if (statusTimer) {
    clearTimeout(statusTimer);
  }
  statusTimer = setTimeout(() => {
    formStatus.textContent = "";
  }, 3000);
}

function storageGet(keys) {
  return new Promise((resolve, reject) => {
    chrome.storage.sync.get(keys, (result) => {
      const error = chrome.runtime.lastError;
      if (error) {
        reject(error);
        return;
      }
      resolve(result);
    });
  });
}

function storageSet(items) {
  return new Promise((resolve, reject) => {
    chrome.storage.sync.set(items, () => {
      const error = chrome.runtime.lastError;
      if (error) {
        reject(error);
        return;
      }
      resolve();
    });
  });
}
