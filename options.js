const ruleForm = document.getElementById("ruleForm");
const ruleIndexField = document.getElementById("ruleIndex");
const ruleNameInput = document.getElementById("ruleName");
const patternInput = document.getElementById("pattern");
const typeSelect = document.getElementById("type");
const transformationsList = document.getElementById("transformationsList");
const addTransformationBtn = document.getElementById("addTransformation");
const transformRowTemplate = document.getElementById("transformRowTemplate");
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
if (addTransformationBtn) {
  addTransformationBtn.addEventListener("click", () => addTransformationRow());
}

async function init() {
  await loadPaths();
  renderRules();
  resetForm();
}

async function loadPaths() {
  const stored = await storageGet({ paths: [] });
  paths = Array.isArray(stored.paths)
    ? stored.paths.map(upgradeRule).filter(Boolean)
    : [];
}

async function persistPaths(message) {
  paths = paths.map(upgradeRule).filter(Boolean);
  await storageSet({ paths });
  if (message) {
    showFormStatus(message);
  }
  renderRules();
}

async function onSaveRule(event) {
  event.preventDefault();
  const name = ruleNameInput ? ruleNameInput.value.trim() : "";
  const pattern = patternInput.value.trim();
  const type = typeSelect.value === "regex" ? "regex" : "string";
  const transformations = collectTransformations();

  if (!pattern) {
    showFormStatus("Pattern is required.");
    return;
  }

  if (transformations.length === 0) {
    showFormStatus("Add at least one transformation.");
    return;
  }

  const indexValue = ruleIndexField.value;
  const rule = { name, pattern, type, transformations };
  const upgradedRule = upgradeRule(rule);

  if (!upgradedRule) {
    showFormStatus("Unable to save rule. Check the inputs.");
    return;
  }

  try {
    if (indexValue) {
      const index = Number(indexValue);
      if (Number.isInteger(index) && index >= 0 && index < paths.length) {
        paths[index] = upgradedRule;
        await persistPaths("Rule updated.");
      }
    } else {
      paths.push(upgradedRule);
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
  if (ruleNameInput) {
    ruleNameInput.value = "";
  }
  clearTransformations();
  addTransformationRow();
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

  const nameEl = document.createElement("span");
  nameEl.className = "rule-card__name";
  nameEl.textContent = rule.name || rule.pattern;

  const details = document.createElement("div");
  details.className = "rule-card__details";

  const patternEl = document.createElement("code");
  patternEl.className = "rule-card__pattern";
  patternEl.textContent = rule.pattern;

  const typeChip = document.createElement("span");
  typeChip.className = "rule-card__type";
  typeChip.textContent = rule.type === "regex" ? "Regex" : "String";

  details.append(patternEl, typeChip);
  meta.append(nameEl, details);

    const list = document.createElement("ol");
    list.className = "rule-card__list";
    rule.transformations.forEach((transform) => {
      const item = document.createElement("li");
      item.className = "rule-card__transform";

      const nameEl = document.createElement("span");
      nameEl.className = "rule-card__transform-name";
      nameEl.textContent = transform.name || transform.template;

      const templateEl = document.createElement("span");
      templateEl.className = "rule-card__transform-template";
      templateEl.textContent = transform.template;

      item.append(nameEl, templateEl);
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
  if (ruleNameInput) {
    ruleNameInput.value = rule.name && rule.name !== rule.pattern ? rule.name : "";
  }
  patternInput.value = rule.pattern;
  typeSelect.value = rule.type === "regex" ? "regex" : "string";
  clearTransformations();
  const list = rule.transformations && rule.transformations.length ? rule.transformations : [{ name: "", template: "" }];
  list.forEach((transform) => addTransformationRow(transform));
  ruleIndexField.value = String(index);
  showFormStatus("Editing rule #" + (index + 1) + ". Save to apply changes.");
  window.scrollTo({ top: 0, behavior: "smooth" });
}

async function deleteRule(index) {
  const rule = paths[index];
  const label = rule.name || rule.pattern;
  const confirmed = window.confirm(`Delete rule "${label}"?`);
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
    name: ruleNameInput ? ruleNameInput.value.trim() : "",
    pattern: patternInput.value.trim(),
    type: typeSelect.value === "regex" ? "regex" : "string",
    transformations: collectTransformations(),
  };

  if (!rule.pattern || rule.transformations.length === 0) {
    testStatus.textContent = "Add a pattern and at least one transformation first.";
    return;
  }

  const upgradedRule = upgradeRule(rule);
  if (!upgradedRule) {
    testStatus.textContent = "Check the rule details and try again.";
    return;
  }

  const results = resolveTransformations(upgradedRule, sampleUrl, { strict: false });
  if (!results || results.length === 0) {
    testStatus.textContent = "No match for this sample URL.";
    return;
  }

  results.forEach((item) => {
    const li = document.createElement("li");
    li.className = "test-results__item";
    const nameEl = document.createElement("div");
    const nameStrong = document.createElement("strong");
    nameStrong.textContent = item.name || item.target;
    nameEl.appendChild(nameStrong);

    const targetEl = document.createElement("div");
    targetEl.textContent = `Target: ${item.target}`;

    const templateEl = document.createElement("small");
    templateEl.textContent = `Template: ${item.template}`;

    li.append(nameEl, targetEl, templateEl);
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
  if (!rule || typeof rule.pattern !== "string") {
    return null;
  }

  const transformations = Array.isArray(rule.transformations)
    ? rule.transformations.map(toTransformation).filter(Boolean)
    : [];

  if (!transformations.length) {
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

    return transformations
      .map(({ name, template }) => {
        const target = template.replace(/\\(\d+)/g, (full, group) => {
          const groupIndex = Number(group);
          return match[groupIndex] ?? "";
        });
        const validUrl = isLikelyUrl(target);
        return {
          name: name || target,
          template,
          target,
          validUrl,
        };
      })
      .filter((item) => item.target && (!strict || item.validUrl));
  }

  if (!url.includes(rule.pattern)) {
    return null;
  }

  return transformations
    .map(({ name, template }) => {
      const target = template
        .replace(/\{\{\s*url\s*\}\}/gi, url)
        .replace(/\{\{\s*pattern\s*\}\}/gi, rule.pattern);
      const validUrl = isLikelyUrl(target);
      return {
        name: name || target,
        template,
        target,
        validUrl,
      };
    })
    .filter((item) => item.target && (!strict || item.validUrl));
}

function isLikelyUrl(value) {
  try {
    new URL(value);
    return true;
  } catch (error) {
    return false;
  }
}

function addTransformationRow(data = {}) {
  if (!transformRowTemplate || !transformationsList) {
    return;
  }

  const fragment = transformRowTemplate.content.cloneNode(true);
  const row = fragment.querySelector(".transform-row");
  const nameInput = row.querySelector("[data-transform-name]");
  const templateInput = row.querySelector("[data-transform-template]");
  const removeBtn = row.querySelector("[data-remove-transform]");

  nameInput.value = data.name ?? "";
  templateInput.value = data.template ?? "";

  removeBtn.addEventListener("click", () => {
    row.remove();
    ensureTransformRowPresence();
  });

  transformationsList.appendChild(row);

  if (!(data.name || data.template)) {
    const focusField = () => nameInput.focus();
    if (typeof queueMicrotask === "function") {
      queueMicrotask(focusField);
    } else {
      setTimeout(focusField, 0);
    }
  }
}

function clearTransformations() {
  if (!transformationsList) {
    return;
  }
  transformationsList.innerHTML = "";
}

function ensureTransformRowPresence() {
  if (!transformationsList) {
    return;
  }
  if (!transformationsList.querySelector(".transform-row")) {
    addTransformationRow();
  }
}

function collectTransformations() {
  if (!transformationsList) {
    return [];
  }
  const rows = Array.from(transformationsList.querySelectorAll(".transform-row"));
  return rows
    .map((row) => {
      const nameInput = row.querySelector("[data-transform-name]");
      const templateInput = row.querySelector("[data-transform-template]");
      return toTransformation({
        name: nameInput.value,
        template: templateInput.value,
      });
    })
    .filter(Boolean);
}

function toTransformation(input) {
  if (typeof input === "string") {
    const template = input.trim();
    if (!template) {
      return null;
    }
    return { name: template, template };
  }

  if (!input || typeof input.template !== "string") {
    return null;
  }

  const template = input.template.trim();
  if (!template) {
    return null;
  }

  const name = typeof input.name === "string" && input.name.trim().length > 0 ? input.name.trim() : template;
  return { name, template };
}

function upgradeRule(rule) {
  if (!rule || typeof rule.pattern !== "string") {
    return null;
  }

  const pattern = rule.pattern.trim();
  if (!pattern) {
    return null;
  }

  const name = typeof rule.name === "string" && rule.name.trim().length > 0 ? rule.name.trim() : pattern;
  const type = rule.type === "regex" ? "regex" : "string";
  const transformations = Array.isArray(rule.transformations)
    ? rule.transformations.map(toTransformation).filter(Boolean)
    : [];

  if (!transformations.length) {
    return null;
  }

  return { name, pattern, type, transformations };
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
    return data.map(upgradeRule).filter(Boolean);
  }
  if (data && Array.isArray(data.paths)) {
    return data.paths.map(upgradeRule).filter(Boolean);
  }
  return [];
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
