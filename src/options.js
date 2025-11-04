// DOM elements
const rulesList = document.getElementById("rulesList");
const ruleDetails = document.getElementById("ruleDetails");
const addNewRuleBtn = document.getElementById("addNewRule");
const testInput = document.getElementById("testInput");
const testOutput = document.getElementById("testOutput");
const ruleForm = document.getElementById("ruleForm");
const ruleIndexField = document.getElementById("ruleIndex");
const ruleNameInput = document.getElementById("ruleName");
const patternInput = document.getElementById("pattern");
const typeSelect = document.getElementById("type");
const transformRowTemplate = document.getElementById("transformRowTemplate");
const importFile = document.getElementById("importFile");
const importMode = document.getElementById("importMode");

let paths = [];
let currentRuleIndex = -1;
let isEditMode = false;

// Event listeners
document.addEventListener("DOMContentLoaded", init);
addNewRuleBtn.addEventListener("click", createNewRule);
testInput.addEventListener("input", onTestInputChange);
if (ruleForm) {
  ruleForm.addEventListener("submit", onSaveRule);
}

async function init() {
  await loadPaths();
  renderRulesList();
  showEmptyState();
}

async function loadPaths() {
  const stored = await storageGet({ paths: [] });
  paths = Array.isArray(stored.paths)
    ? stored.paths.map(upgradeRule).filter(Boolean)
    : [];
}

async function persistPaths() {
  paths = paths.map(upgradeRule).filter(Boolean);
  await storageSet({ paths });
  renderRulesList();
}

function renderRulesList() {
  rulesList.innerHTML = "";
  
  if (!paths.length) {
    const empty = document.createElement("div");
    empty.className = "empty-state";
    empty.textContent = "No rules created yet.";
    rulesList.appendChild(empty);
    return;
  }

  paths.forEach((rule, index) => {
    const item = document.createElement("div");
    item.className = "rule-item";
    if (index === currentRuleIndex) {
      item.classList.add("active");
    }
    
    const name = document.createElement("div");
    name.className = "rule-item__name";
    name.textContent = rule.name || rule.pattern;
    
    //const pattern = document.createElement("div");
    //pattern.className = "rule-item__pattern";
    //pattern.textContent = rule.pattern;
    
    item.appendChild(name);
    //item.appendChild(pattern);
    
    item.addEventListener("click", () => selectRule(index));
    rulesList.appendChild(item);
  });
}

function selectRule(index) {
  currentRuleIndex = index;
  isEditMode = false;
  renderRulesList(); // Update active state
  renderRuleDetails(paths[index]);
}

function renderRuleDetails(rule) {
  if (!rule) {
    showEmptyState();
    return;
  }

  const detailsContainer = document.createElement("div");
  
  // Header
  const header = document.createElement("div");
  header.className = "rule-details__header";
  
  const title = document.createElement("h2");
  title.className = "rule-details__title";
  title.textContent = rule.name || rule.pattern;
  
  const actions = document.createElement("div");
  actions.className = "rule-details__actions";
  
  const editBtn = document.createElement("button");
  editBtn.type = "button";
  editBtn.className = "btn-secondary";
  editBtn.textContent = "Edit";
  editBtn.addEventListener("click", editRule);
  
  const deleteBtn = document.createElement("button");
  deleteBtn.type = "button";
  deleteBtn.className = "btn-danger";
  deleteBtn.textContent = "Delete";
  deleteBtn.addEventListener("click", deleteCurrentRule);
  
  actions.appendChild(editBtn);
  actions.appendChild(deleteBtn);
  header.appendChild(title);
  header.appendChild(actions);
  
  // Content
  const content = document.createElement("div");
  content.className = "rule-details__content";
  
  // Rule details
  const nameGroup = createDetailGroup("Rule Name", rule.name || "No name set");
  const patternGroup = createDetailGroup("Pattern", rule.pattern, true);
  const typeGroup = createDetailGroup("Match Type", rule.type === "regex" ? "Regular Expression" : "String Match");
  
  content.appendChild(nameGroup);
  content.appendChild(patternGroup);
  content.appendChild(typeGroup);
  
  // Transformations section
  const transformationsSection = document.createElement("div");
  transformationsSection.className = "transformations-section";
  
  const transformationsHeader = document.createElement("div");
  transformationsHeader.className = "transformations-header";
  
  const transformationsTitle = document.createElement("h3");
  transformationsTitle.textContent = `Transformations (${rule.transformations.length})`;
  
  const addTransformBtn = document.createElement("button");
  addTransformBtn.type = "button";
  addTransformBtn.className = "btn-primary btn-small";
  addTransformBtn.textContent = "Add Transformation";
  addTransformBtn.addEventListener("click", () => {
    if (!isEditMode) {
      editRule();
    } else {
      addTransformation();
    }
  });
  
  transformationsHeader.appendChild(transformationsTitle);
  transformationsHeader.appendChild(addTransformBtn);
  
  const transformationsList = document.createElement("div");
  transformationsList.className = "transformations-list";
  transformationsList.id = "transformationsList";
  
  if (rule.transformations.length === 0) {
    const emptyState = document.createElement("div");
    emptyState.className = "empty-state";
    emptyState.textContent = "No transformations added yet.";
    transformationsList.appendChild(emptyState);
  } else {
    rule.transformations.forEach((transform, index) => {
      const transformRow = createTransformationRow(transform, index, false);
      transformationsList.appendChild(transformRow);
    });
  }
  
  transformationsSection.appendChild(transformationsHeader);
  transformationsSection.appendChild(transformationsList);
  content.appendChild(transformationsSection);
  
  detailsContainer.appendChild(header);
  detailsContainer.appendChild(content);
  
  ruleDetails.innerHTML = "";
  ruleDetails.appendChild(detailsContainer);
}

function createDetailGroup(label, value, isCode = false) {
  const group = document.createElement("div");
  group.className = "detail-group";
  
  const labelEl = document.createElement("div");
  labelEl.className = "detail-label";
  labelEl.textContent = label;
  
  const valueEl = document.createElement("div");
  valueEl.className = isCode ? "detail-value code" : "detail-value";
  valueEl.textContent = value;
  
  group.appendChild(labelEl);
  group.appendChild(valueEl);
  
  return group;
}

function createTransformationRow(transform, index, isEditable) {
  const row = document.createElement("div");
  row.className = "transform-row";
  
  const content = document.createElement("div");
  content.className = "transform-row__content";
  
  if (isEditable) {
    const nameInput = document.createElement("input");
    nameInput.type = "text";
    nameInput.className = "transform-name-input";
    nameInput.value = transform.name || "";
    nameInput.placeholder = "Transformation name";
    nameInput.dataset.index = index;
    
    const templateInput = document.createElement("input");
    templateInput.type = "text";
    templateInput.className = "transform-template-input";
    templateInput.value = transform.template || "";
    templateInput.placeholder = "Template";
    templateInput.dataset.index = index;
    
    content.appendChild(nameInput);
    content.appendChild(templateInput);
  } else {
    const name = document.createElement("span");
    name.className = "transform-name";
    name.textContent = transform.name;
    
    const template = document.createElement("span");
    template.className = "transform-template";
    template.textContent = transform.template;
    
    content.appendChild(name);
    content.appendChild(template);
  }
  
  const actions = document.createElement("div");
  actions.className = "transform-row__actions";
  
  if (isEditable) {
    const removeBtn = document.createElement("button");
    removeBtn.type = "button";
    removeBtn.className = "btn-danger btn-small";
    removeBtn.textContent = "Remove";
    removeBtn.addEventListener("click", () => removeTransformation(index));
    actions.appendChild(removeBtn);
  } else {
    //const editBtn = document.createElement("button");
    //editBtn.type = "button";
    //editBtn.className = "btn-secondary btn-small";
    //editBtn.textContent = "Edit";
    //editBtn.addEventListener("click", () => editRule());
    
    const deleteBtn = document.createElement("button");
    deleteBtn.type = "button";
    deleteBtn.className = "btn-danger btn-small";
    deleteBtn.textContent = "Delete";
    deleteBtn.addEventListener("click", () => {
      if (confirm("Delete this transformation?")) {
        deleteTransformation(index);
      }
    });
    
    //actions.appendChild(editBtn);
    actions.appendChild(deleteBtn);
  }
  
  row.appendChild(content);
  row.appendChild(actions);
  
  return row;
}

function showEmptyState() {
  ruleDetails.innerHTML = `
    <div class="rule-details__empty">
      <p>Select a rule from the list to view details, or create a new rule.</p>
    </div>
  `;
  currentRuleIndex = -1;
  renderRulesList(); // Remove active state
}

function createNewRule() {
  const newRule = {
    name: "New Rule",
    pattern: "",
    type: "string",
    transformations: []
  };
  
  paths.push(newRule);
  currentRuleIndex = paths.length - 1;
  renderRulesList();
  editRule();
}

function editRule() {
  if (currentRuleIndex < 0 || currentRuleIndex >= paths.length) return;
  
  isEditMode = true;
  const rule = paths[currentRuleIndex];
  
  const detailsContainer = document.createElement("div");
  
  // Header
  const header = document.createElement("div");
  header.className = "rule-details__header";
  
  const title = document.createElement("h2");
  title.className = "rule-details__title";
  title.textContent = "Edit Rule";
  
  const actions = document.createElement("div");
  actions.className = "rule-details__actions";
  
  const saveBtn = document.createElement("button");
  saveBtn.type = "button";
  saveBtn.className = "btn-primary";
  saveBtn.textContent = "Save";
  saveBtn.addEventListener("click", saveRule);
  
  const cancelBtn = document.createElement("button");
  cancelBtn.type = "button";
  cancelBtn.className = "btn-secondary";
  cancelBtn.textContent = "Cancel";
  cancelBtn.addEventListener("click", cancelEdit);
  
  actions.appendChild(saveBtn);
  actions.appendChild(cancelBtn);
  header.appendChild(title);
  header.appendChild(actions);
  
  // Content
  const content = document.createElement("div");
  content.className = "rule-details__content";
  
  // Form fields
  const nameGroup = createFormGroup("Rule Name:", "editRuleName", "text", rule.name || "", true);
  const patternGroup = createFormGroup("Pattern:", "editPattern", "text", rule.pattern, true);
  const typeGroup = createSelectGroup("Match Type:", "editType", [
    { value: "string", label: "String", selected: rule.type === "string" },
    { value: "regex", label: "Regex", selected: rule.type === "regex" }
  ]);
  
  content.appendChild(nameGroup);
  content.appendChild(patternGroup);
  content.appendChild(typeGroup);
  
  // Transformations section
  const transformationsSection = document.createElement("div");
  transformationsSection.className = "transformations-section";
  
  const transformationsHeader = document.createElement("div");
  transformationsHeader.className = "transformations-header";
  
  const transformationsTitle = document.createElement("h3");
  transformationsTitle.textContent = "Transformations";
  
  const addTransformBtn = document.createElement("button");
  addTransformBtn.type = "button";
  addTransformBtn.className = "btn-primary btn-small";
  addTransformBtn.textContent = "Add Transformation";
  addTransformBtn.addEventListener("click", addTransformation);
  
  transformationsHeader.appendChild(transformationsTitle);
  transformationsHeader.appendChild(addTransformBtn);
  
  const transformationsList = document.createElement("div");
  transformationsList.className = "transformations-list";
  transformationsList.id = "transformationsList";
  
  if (rule.transformations.length === 0) {
    const emptyState = document.createElement("div");
    emptyState.className = "empty-state";
    emptyState.textContent = "No transformations added yet.";
    transformationsList.appendChild(emptyState);
  } else {
    rule.transformations.forEach((transform, index) => {
      const transformRow = createTransformationRow(transform, index, true);
      transformationsList.appendChild(transformRow);
    });
  }
  
  transformationsSection.appendChild(transformationsHeader);
  transformationsSection.appendChild(transformationsList);
  content.appendChild(transformationsSection);
  
  detailsContainer.appendChild(header);
  detailsContainer.appendChild(content);
  
  ruleDetails.innerHTML = "";
  ruleDetails.appendChild(detailsContainer);
}

function createFormGroup(labelText, inputId, inputType, value, required = false) {
  const group = document.createElement("div");
  group.className = "form-group";
  
  const label = document.createElement("label");
  label.setAttribute("for", inputId);
  label.textContent = labelText;
  
  const input = document.createElement("input");
  input.type = inputType;
  input.id = inputId;
  input.value = value;
  if (required) input.required = true;
  
  group.appendChild(label);
  group.appendChild(input);
  
  return group;
}

function createSelectGroup(labelText, selectId, options) {
  const group = document.createElement("div");
  group.className = "form-group";
  
  const label = document.createElement("label");
  label.setAttribute("for", selectId);
  label.textContent = labelText;
  
  const select = document.createElement("select");
  select.id = selectId;
  
  options.forEach(option => {
    const optionEl = document.createElement("option");
    optionEl.value = option.value;
    optionEl.textContent = option.label;
    if (option.selected) optionEl.selected = true;
    select.appendChild(optionEl);
  });
  
  group.appendChild(label);
  group.appendChild(select);
  
  return group;
}

function saveRule() {
  if (currentRuleIndex < 0) return;
  
  const nameInput = document.getElementById("editRuleName");
  const patternInput = document.getElementById("editPattern");
  const typeSelect = document.getElementById("editType");
  
  if (!nameInput || !patternInput || !typeSelect) return;
  
  const name = nameInput.value.trim();
  const pattern = patternInput.value.trim();
  const type = typeSelect.value;
  
  if (!pattern) {
    alert("Pattern is required");
    return;
  }
  
  // Collect transformations
  const transformations = collectEditableTransformations();
  
  const rule = { name: name || pattern, pattern, type, transformations };
  const upgradedRule = upgradeRule(rule);
  
  if (!upgradedRule) {
    alert("Invalid rule data");
    return;
  }
  
  paths[currentRuleIndex] = upgradedRule;
  persistPaths();
  renderRuleDetails(upgradedRule);
  isEditMode = false;
}

function cancelEdit() {
  if (currentRuleIndex >= 0 && currentRuleIndex < paths.length) {
    renderRuleDetails(paths[currentRuleIndex]);
  } else {
    showEmptyState();
  }
  isEditMode = false;
}

function collectEditableTransformations() {
  const nameInputs = document.querySelectorAll(".transform-name-input");
  const templateInputs = document.querySelectorAll(".transform-template-input");
  
  const transformations = [];
  for (let i = 0; i < Math.min(nameInputs.length, templateInputs.length); i++) {
    const name = nameInputs[i].value.trim();
    const template = templateInputs[i].value.trim();
    if (template) {
      transformations.push({ name: name || template, template });
    }
  }
  return transformations;
}

function addTransformation() {
  if (!isEditMode || currentRuleIndex < 0) return;
  
  const rule = paths[currentRuleIndex];
  rule.transformations.push({ name: "", template: "" });
  
  const transformationsList = document.getElementById("transformationsList");
  if (transformationsList) {
    // Clear empty state if present
    if (transformationsList.querySelector(".empty-state")) {
      transformationsList.innerHTML = "";
    }
    
    // Add new transformation row
    const newIndex = rule.transformations.length - 1;
    const transformRow = createTransformationRow(rule.transformations[newIndex], newIndex, true);
    transformationsList.appendChild(transformRow);
  }
}

function removeTransformation(index) {
  if (!isEditMode || currentRuleIndex < 0) return;
  
  const rule = paths[currentRuleIndex];
  rule.transformations.splice(index, 1);
  
  const transformationsList = document.getElementById("transformationsList");
  if (transformationsList) {
    transformationsList.innerHTML = "";
    
    if (rule.transformations.length === 0) {
      const emptyState = document.createElement("div");
      emptyState.className = "empty-state";
      emptyState.textContent = "No transformations added yet.";
      transformationsList.appendChild(emptyState);
    } else {
      rule.transformations.forEach((transform, idx) => {
        const transformRow = createTransformationRow(transform, idx, true);
        transformationsList.appendChild(transformRow);
      });
    }
  }
}

function deleteTransformation(index) {
  if (currentRuleIndex < 0 || currentRuleIndex >= paths.length) return;
  
  const rule = paths[currentRuleIndex];
  rule.transformations.splice(index, 1);
  
  persistPaths();
  renderRuleDetails(rule);
}

function deleteCurrentRule() {
  if (currentRuleIndex < 0 || currentRuleIndex >= paths.length) return;
  
  const rule = paths[currentRuleIndex];
  const confirmed = confirm(`Delete rule "${rule.name || rule.pattern}"?`);
  
  if (confirmed) {
    paths.splice(currentRuleIndex, 1);
    persistPaths();
    showEmptyState();
  }
}

async function onSaveRule(event) {
  event.preventDefault();
  // This function exists for form submission compatibility but isn't used in the new UI
}

function onTestInputChange() {
  const url = testInput.value.trim();
  if (!url) {
    testOutput.textContent = "Enter a URL above to see the result";
    return;
  }
  
  // For now, just mirror the input as requested
  testOutput.textContent = url;
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
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

  return { name, pattern, type, transformations };
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

// Make functions global for onclick handlers
window.editRule = editRule;
window.deleteCurrentRule = deleteCurrentRule;
window.saveRule = saveRule;
window.cancelEdit = cancelEdit;
window.addTransformation = addTransformation;
window.removeTransformation = removeTransformation;
