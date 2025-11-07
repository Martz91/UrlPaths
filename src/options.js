
class RulesManager {
  constructor() {
    this.rules = [];
    this.currentRuleIndex = -1;
    this.isEditMode = false;

    // DOM elements - will be initializeed in init() method
    this.elements = {};


  }

  setupEventListeners() {
    this.elements.addNewRuleBtn?.addEventListener("click", () => this.createNewRule());
    this.elements.testInput?.addEventListener("input", () => this.onTestInputChange());
    this.elements.ruleForm?.addEventListener("submit", (e) => this.onSaveRule(e));
  }

  async loadRules() {
    const stored = await this.storageGet({ rules: [] });
    this.rules = Array.isArray(stored.rules)
      ? stored.rules.map(rule => this.upgradeRule(rule)).filter(Boolean)
      : [];
  }

  selectRule(index) {
    this.currentRuleIndex = index;
    this.isEditMode = false;
    this.renderRulesList(); // Update active state
    this.renderRuleDetails(this.rules[index]);
  }

  renderRulesList() {
    this.elements.rulesList.innerHTML = "";

    if (!this.rules.length) {
      const empty = document.createElement("div");
      empty.className = "empty-state";
      empty.textContent = "No rules created yet.";
      this.elements.rulesList.appendChild(empty);
      return;
    }

    this.rules.forEach((rule, index) => {
      const item = document.createElement("div");
      item.className = "rule-item";
      if (index === this.currentRuleIndex) {
        item.classList.add("active");
      }

      const name = document.createElement("div");
      name.className = "rule-item__name";
      name.textContent = rule.name || rule.pattern;

      item.appendChild(name);

      item.addEventListener("click", () => this.selectRule(index));
      this.elements.rulesList.appendChild(item);
    });


  }

  renderRuleDetails(rule) {
    if (!rule) {
      this.showEmptyState();
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
    editBtn.addEventListener("click", () => this.editRule());

    const deleteBtn = document.createElement("button");
    deleteBtn.type = "button";
    deleteBtn.className = "btn-danger";
    deleteBtn.textContent = "Delete";
    deleteBtn.addEventListener("click", () => this.deleteCurrentRule());

    actions.appendChild(editBtn);
    actions.appendChild(deleteBtn);
    header.appendChild(title);
    header.appendChild(actions);

    // Content
    const content = document.createElement("div");
    content.className = "rule-details__content";

    // Rule details
    const nameGroup = this.createDetailGroup("Rule Name", rule.name || "No name set");
    const patternGroup = this.createDetailGroup("Pattern", rule.pattern, true);
    const typeGroup = this.createDetailGroup("Match Type", rule.type === "regex" ? "Regular Expression" : "String Match");

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
      if (!this.isEditMode) {
        this.editRule();
      } else {
        this.addTransformation();
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
        const transformRow = this.createTransformationRow(transform, index, false);
        transformationsList.appendChild(transformRow);
      });
    }

    transformationsSection.appendChild(transformationsHeader);
    transformationsSection.appendChild(transformationsList);
    content.appendChild(transformationsSection);

    detailsContainer.appendChild(header);
    detailsContainer.appendChild(content);

    this.elements.ruleDetails.innerHTML = "";
    this.elements.ruleDetails.appendChild(detailsContainer);
  }

  init() {
    // Initialize DOM elements
    this.elements = {
      rulesList: document.getElementById("rulesList"),
      ruleDetails: document.getElementById("ruleDetails"),
      addNewRuleBtn: document.getElementById("addNewRule"),
      testInput: document.getElementById("testInput"),
      testOutput: document.getElementById("testOutput"),
      ruleForm: document.getElementById("ruleForm"),
      ruleIndexField: document.getElementById("ruleIndex"),
      ruleNameInput: document.getElementById("ruleName"),
      patternInput: document.getElementById("pattern"),
      typeSelect: document.getElementById("type"),
      transformRowTemplate: document.getElementById("transformRowTemplate"),
      importFile: document.getElementById("importFile"),
      importMode: document.getElementById("importMode")
    }

    // Set up event listeners
    this.setupEventListeners();

    // Load rules and render them
    this.loadRules().then(() => {
      this.renderRulesList();
      this.showEmptyState();
    });

  }

  createDetailGroup(label, value, isCode = false) {
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

  createTransformationRow(transform, index, isEditable) {
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
      removeBtn.addEventListener("click", () => this.removeTransformation(index));
      actions.appendChild(removeBtn);
    } else {

      const deleteBtn = document.createElement("button");
      deleteBtn.type = "button";
      deleteBtn.className = "btn-danger btn-small";
      deleteBtn.textContent = "Delete";
      deleteBtn.addEventListener("click", () => {
        if (confirm("Delete this transformation?")) {
          this.deleteTransformation(index);
        }
      });

      actions.appendChild(deleteBtn);
    }

    row.appendChild(content);
    row.appendChild(actions);

    return row;
  }

  showEmptyState() {
    this.elements.ruleDetails.innerHTML = `
    <div class="rule-details__empty">
      <p>Select a rule from the list to view details, or create a new rule.</p>
    </div>
  `;
    this.currentRuleIndex = -1;
    this.renderRulesList(); // Remove active state
  }

  createNewRule() {
    const newRule = {
      name: "New Rule",
      pattern: "",
      type: "string",
      transformations: []
    };

    this.rules.push(newRule);
    this.currentRuleIndex = this.rules.length - 1;
    this.renderRulesList();
    this.editRule();
  }

  editRule() {
    if (this.currentRuleIndex < 0 || this.currentRuleIndex >= this.rules.length) return;

    this.isEditMode = true;
    const rule = this.rules[this.currentRuleIndex];

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
    saveBtn.addEventListener("click", () => this.saveRule());

    const cancelBtn = document.createElement("button");
    cancelBtn.type = "button";
    cancelBtn.className = "btn-secondary";
    cancelBtn.textContent = "Cancel";
    cancelBtn.addEventListener("click", () => this.cancelEdit());

    actions.appendChild(saveBtn);
    actions.appendChild(cancelBtn);
    header.appendChild(title);
    header.appendChild(actions);

    // Content
    const content = document.createElement("div");
    content.className = "rule-details__content";

    // Form fields
    const nameGroup = this.createFormGroup("Rule Name:", "editRuleName", "text", rule.name || "", true);
    const patternGroup = this.createFormGroup("Pattern:", "editPattern", "text", rule.pattern, true);
    const typeGroup = this.createSelectGroup("Match Type:", "editType", [
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
    addTransformBtn.addEventListener("click", () => this.addTransformation());

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
        const transformRow = this.createTransformationRow(transform, index, true);
        transformationsList.appendChild(transformRow);
      });
    }

    transformationsSection.appendChild(transformationsHeader);
    transformationsSection.appendChild(transformationsList);
    content.appendChild(transformationsSection);

    detailsContainer.appendChild(header);
    detailsContainer.appendChild(content);

    this.elements.ruleDetails.innerHTML = "";
    this.elements.ruleDetails.appendChild(detailsContainer);
  }

  createFormGroup(labelText, inputId, inputType, value, required = false) {
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

  createSelectGroup(labelText, selectId, options) {
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

  saveRule() {
    if (this.currentRuleIndex < 0) return;

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
    const transformations = this.collectEditableTransformations();

    const rule = { name: name || pattern, pattern, type, transformations };
    const upgradedRule = this.upgradeRule(rule);

    if (!upgradedRule) {
      alert("Invalid rule data");
      return;
    }

    this.rules[this.currentRuleIndex] = upgradedRule;
    this.persistRules();
    this.renderRuleDetails(upgradedRule);
    this.isEditMode = false;
  }




  cancelEdit() {
    if (this.currentRuleIndex >= 0 && this.currentRuleIndex < this.rules.length) {
      this.renderRuleDetails(this.rules[this.currentRuleIndex]);
    } else {
      this.showEmptyState();
    }
    this.isEditMode = false;
  }

  collectEditableTransformations() {
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

  addTransformation() {
    if (!this.isEditMode || this.currentRuleIndex < 0) return;

    const rule = this.rules[this.currentRuleIndex];
    rule.transformations.push({ name: "", template: "" });

    const transformationsList = document.getElementById("transformationsList");
    if (transformationsList) {
      // Clear empty state if present
      if (transformationsList.querySelector(".empty-state")) {
        transformationsList.innerHTML = "";
      }

      // Add new transformation row
      const newIndex = rule.transformations.length - 1;
      const transformRow = this.createTransformationRow(rule.transformations[newIndex], newIndex, true);
      transformationsList.appendChild(transformRow);
    }
  }

  // Delete transformation when in edit mode
  removeTransformation(index) {
    if (!this.isEditMode || this.currentRuleIndex < 0) return;

    const rule = this.rules[this.currentRuleIndex];
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
          const transformRow = this.createTransformationRow(transform, idx, true);
          transformationsList.appendChild(transformRow);
        });
      }
    }
  }

  // Delete transformation
  deleteTransformation(index) {
    if (this.currentRuleIndex < 0 || this.currentRuleIndex >= this.rules.length) return;

    const rule = this.rules[this.currentRuleIndex];
    rule.transformations.splice(index, 1);

    this.persistRules();
    this.renderRuleDetails(rule);
  }

  deleteCurrentRule() {
    if (this.currentRuleIndex < 0 || this.currentRuleIndex >= this.rules.length) return;

    const rule = this.rules[this.currentRuleIndex];
    const confirmed = confirm(`Delete rule "${rule.name || rule.pattern}"?`);

    if (confirmed) {
      this.rules.splice(this.currentRuleIndex, 1);
      this.persistRules();
      this.showEmptyState();
    }
  }


  onTestInputChange() {
    const url = this.elements.testInput.value.trim();
    if (!url) {
      this.elements.testOutput.textContent = "Enter a URL above to see the result";
      return;
    }

    // For now, just mirror the input as requested
    this.elements.testOutput.textContent = url;
  }



  async persistRules() {
    this.rules = this.rules.map(rule => this.upgradeRule(rule)).filter(Boolean);
    await this.storageSet({ rules: this.rules });
    this.renderRulesList();
  }

}

let rulesManager;
document.addEventListener("DOMContentLoaded", async () => {
  rulesManager = new RulesManager();
  await rulesManager.init();
});
