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
    this.elements.exportBtn?.addEventListener("click", () => this.exportRules());
    this.elements.importBtn?.addEventListener("click", () => this.importRules());

    // Import dialog listeners
    this.elements.importFileInput?.addEventListener("change", (e) => this.onImportFileSelected(e));
    this.elements.importDialogConfirm?.addEventListener("click", () => this.confirmImport());
    this.elements.importDialogCancel?.addEventListener("click", () => this.cancelImport());

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
      exportBtn: document.getElementById("exportRules"),
      importBtn: document.getElementById("importRules"),
      importFile: document.getElementById("importFile"),

      // Dialog elements
      importDialog: document.getElementById("importDialog"),
      importFileInput: document.getElementById("importFileInput"),
      importModeSelect: document.getElementById("importModeSelect"),
      importFileDetails: document.getElementById("importFileDetails"),
      importFileName: document.getElementById("importFileName"),
      importRuleCount: document.getElementById("importRuleCount"),
      importDialogConfirm: document.getElementById("importDialogConfirm"),
      importDialogCancel: document.getElementById("importDialogCancel")
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
      this.elements.testOutput.innerHTML = "Enter a URL above to see the result";
      return;
    }

    if (this.currentRuleIndex < 0 || this.currentRuleIndex >= this.rules.length) {
      this.elements.testOutput.innerHTML = "Select a rule to test";
      return;
    }

    const rule = this.rules[this.currentRuleIndex];
    this.testRule(rule, url);
  }

  testRule(rule, testString) {
    try {
      let matches = [];
      let regexMatches = [];

      if (rule.type === "regex") {
        try {
          const regex = new RegExp(rule.pattern, 'g');
          let match;
          let matchCount = 0;

          while ((match = regex.exec(testString)) !== null && matchCount < 100) {
            matchCount++;
            
            const matchData = {
              fullMatch: match[0],
              groups: [],
              index: match.index
            };

            // Process capturing groups
            for (let i = 1; i < match.length; i++) {
              if (match[i] !== undefined) {
                matchData.groups.push({
                  number: i,
                  value: match[i]
                });
              }
            }

            regexMatches.push(matchData);

            // Prevent infinite loops for zero-width matches
            if (match[0].length === 0) {
              regex.lastIndex++;
            }
          }

          matches = regexMatches;
        } catch (error) {
          this.displayTestError(`Invalid regex pattern: ${error.message}`);
          return;
        }
      } else {
        // String matching
        if (testString.includes(rule.pattern)) {
          matches = [{
            fullMatch: rule.pattern,
            groups: [],
            index: testString.indexOf(rule.pattern)
          }];
        }
      }

      this.displayTestResult(rule, testString, matches);

    } catch (error) {
      console.error('Test failed:', error);
      this.displayTestError(`Test failed: ${error.message}`);
    }
  }

  displayTestResult(rule, testString, matches) {
    let html = '<div class="test-result">';

    if (matches.length === 0) {
      html += '<div class="test-status test-no-match">No match found</div>';
    } else {
      html += `<div class="test-status test-match">✓ Rule matched (${matches.length} match${matches.length > 1 ? 'es' : ''})</div>`;

      // Create sections container for horizontal layout
      html += '<div class="test-sections">';
      
      // Left section: Highlighted text and capturing groups
      html += '<div class="test-section-group">';
      
      // Show highlighted text
      if (rule.type === "regex") {
        const highlightedText = this.createHighlightedText(rule.pattern, testString);
        html += '<div class="test-section">';
        html += '<h4>Highlighted Match:</h4>';
        html += `<div class="highlighted-output">${highlightedText}</div>`;
        html += '</div>';
      }

      // Show capturing groups for regex
      if (rule.type === "regex" && matches.some(m => m.groups.length > 0)) {
        html += '<div class="test-section">';
        html += '<h4>Capturing Groups:</h4>';
        html += this.createGroupsDisplay(matches);
        html += '</div>';
      }
      
      html += '</div>'; // End left section
      
      // Right section: Transformation results
      if (rule.transformations.length > 0) {
        html += '<div class="test-section-group">';
        const transformationResults = resolveTransformations(rule, testString);
        html += '<div class="test-section">';
        html += '<h4>Transformation Results:</h4>';
        html += this.createTransformationResultsDisplay(transformationResults);
        html += '</div>';
        html += '</div>'; // End right section
      }
      
      html += '</div>'; // End sections container
    }

    html += '</div>';
    this.elements.testOutput.innerHTML = html;
  }

  displayTestError(message) {
    this.elements.testOutput.innerHTML = `
      <div class="test-result">
        <div class="test-status test-error">⚠ ${this.sanitizeHtml(message)}</div>
      </div>
    `;
  }

  createHighlightedText(pattern, testString) {
    try {
      const elementsToHighlight = this.getElementsToHighlight(pattern, testString);
      return elementsToHighlight.map(({type, value}) =>
        type === "group" ? `<span class="highlight">${this.sanitizeHtml(value)}</span>` : this.sanitizeHtml(value)
      ).join('');
    } catch (error) {
      return this.sanitizeHtml(testString);
    }
  }

  getElementsToHighlight(pattern, str) {
    const regex = new RegExp(pattern, 'g');
    let match;
    let matchCount = 0;
    let cursor = 0;
    let spans = [];

    while ((match = regex.exec(str)) != null && matchCount < 100) {
      matchCount++;
      
      // Add text before match
      if (cursor < match.index) {
        spans.push({
          type: "text",
          value: str.slice(cursor, match.index)
        });
      }

      // Process each capturing group
      for (let i = 1; i < match.length; i++) {
        if (match[i] !== undefined) {
          const groupStart = match.index + match[0].indexOf(match[i]);
          const groupEnd = groupStart + match[i].length;

          // Add text before group (if any)
          if (cursor < groupStart) {
            spans.push({
              type: "text",
              value: str.slice(cursor, groupStart)
            });
          }

          // Add the group
          spans.push({
            type: "group",
            group: i,
            value: str.slice(groupStart, groupEnd)
          });
          cursor = groupEnd;
        }
      }

      // Prevent infinite loop for zero-width matches
      if (match[0].length === 0) {
        regex.lastIndex++;
      }
    }

    // Add remaining text
    if (cursor < str.length) {
      spans.push({
        type: "text",
        value: str.slice(cursor)
      });
    }

    return spans;
  }

  createGroupsDisplay(matches) {
    let html = '<div class="groups-display">';

    matches.forEach((match, matchIndex) => {
      if (matches.length > 1) {
        html += `<h5>Match ${matchIndex + 1}:</h5>`;
      }

      if (match.groups.length > 0) {
        html += '<ul class="group-list">';
        match.groups.forEach(group => {
          html += `
            <li class="group-item">
              <span class="group-number">$${group.number}:</span>
              <span class="group-value">${this.sanitizeHtml(group.value)}</span>
            </li>
          `;
        });
        html += '</ul>';
      } else {
        html += '<p class="no-groups">No capturing groups</p>';
      }
    });

    html += '</div>';
    return html;
  }

  generateTransformationResultsDELETE(rule, matches) {
    const transformationResults = [];

    rule.transformations.forEach(transform => {
      const results = [];

      matches.forEach((match, matchIndex) => {
        let result = transform.template;

        // Replace $0 with full match
        result = result.replace(/\$0/g, match.fullMatch);

        // Replace $1, $2, etc. with capturing groups
        match.groups.forEach(group => {
          const placeholder = new RegExp(`\\$${group.number}`, 'g');
          result = result.replace(placeholder, group.value);
        });

        results.push({
          matchIndex,
          result,
          template: transform.template
        });
      });

      transformationResults.push({
        name: transform.name,
        template: transform.template,
        results
      });
    });

    return transformationResults;
  }

  createTransformationResultsDisplay(transformationResults) {
    let html = '<div class="transformation-results">';

    transformationResults.forEach(transform => {
      html += '<div class="transform-result">';
      html += `<h5>${this.sanitizeHtml(transform.name)}</h5>`;
      html += `<div class="transform-template">Template: <code>${this.sanitizeHtml(transform.template)}</code></div>`;
      
      if (transform.target.length > 0) {
        html += '<div class="transform-outputs">';
        html += `<div class="transform-output">`;
        html += `<span class="result-url">${this.sanitizeHtml(transform.target)}</span>`;
        html += `</div>`;
        html += '</div>';
      }
      
      html += '</div>';
    });

    html += '</div>';
    return html;
  }

  sanitizeHtml(text) {
    if (typeof text !== 'string') return '';
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  exportRules() {
    try {
      const exportData = {
        version: "1.0.0",
        exportDate: new Date().toISOString(),
        rules: this.rules
      };

      const dataStr = JSON.stringify(exportData, null, 2);
      const dataBlob = new Blob([dataStr], { type: 'application/json' });

      const link = document.createElement('a');
      link.href = URL.createObjectURL(dataBlob);
      link.download = `urlpaths-rules-${new Date().toISOString().split('T')[0]}.json`;

      // Trigger download
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      // Cleanup
      URL.revokeObjectURL(link.href);

      alert(`Successfully exported ${this.rules.length} rules.`);
    } catch (error) {
      console.error('Export failed:', error);
      alert('Failed to export rules. Please try again.');
    }
  }

  importRules() {
    // Just show the dialog - no need to trigger file input
    this.showImportDialog();
  }

  showImportDialog() {
    // Reset dialog state
    this.elements.importFileInput.value = '';
    this.elements.importModeSelect.value = 'merge';
    this.elements.importFileDetails.style.display = 'none';
    this.elements.importDialogConfirm.disabled = true;

    this.elements.importDialog.showModal();
  }


  async onImportFileSelected(event) {
    const file = event.target.files[0];
    if (!file) {
      this.elements.importFileDetails.style.display = 'none';
      this.elements.importDialogConfirm.disabled = true;
      return;
    }

    try {
      const text = await this.readFileAsText(file);
      const importData = JSON.parse(text);

      if (!this.validateImportData(importData)) {
        alert('Invalid file format. Please select a valid UrlPaths export file.');
        this.elements.importFileInput.value = '';
        return;
      }

      const validRules = (importData.rules || [])
        .map(rule => this.upgradeRule(rule))
        .filter(Boolean);

      // Update UI with file details
      this.elements.importFileName.textContent = file.name;
      this.elements.importRuleCount.textContent = validRules.length;
      this.elements.importFileDetails.style.display = 'block';
      this.elements.importDialogConfirm.disabled = validRules.length === 0;

      if (validRules.length === 0) {
        alert('No valid rules found in the selected file.');
      }

    } catch (error) {
      console.error('File validation failed:', error);
      if (error instanceof SyntaxError) {
        alert('Invalid JSON file. Please select a valid UrlPaths export file.');
      } else {
        alert('Failed to read the file. Please try again.');
      }
      this.elements.importFileInput.value = '';
      this.elements.importFileDetails.style.display = 'none';
      this.elements.importDialogConfirm.disabled = true;
    }
  }

  async confirmImport() {
    const file = this.elements.importFileInput.files[0];
    if (!file) return;

    try {
      const text = await this.readFileAsText(file);
      const importData = JSON.parse(text);
      const importMode = this.elements.importModeSelect.value;
      const importedRules = importData.rules || [];

      const validRules = importedRules
        .map(rule => this.upgradeRule(rule))
        .filter(Boolean);

      if (importMode === "replace") {
        this.rules = validRules;
      } else {
        // Merge rules - avoid duplicates
        const existingKeys = new Set(this.rules.map(r => `${r.pattern}:${r.type}`));
        const newRules = validRules.filter(rule =>
          !existingKeys.has(`${rule.pattern}:${rule.type}`)
        );
        this.rules = [...this.rules, ...newRules];
      }

      await this.persistRules();
      this.renderRulesList();

      if (this.rules.length > 0 && this.currentRuleIndex < 0) {
        this.selectRule(0);
      }

      const message = importMode === "replace"
        ? `Successfully replaced all rules with ${validRules.length} imported rules.`
        : `Successfully imported ${validRules.length} rules (${this.rules.length} total rules).`;

      this.elements.importDialog.close();
      alert(message);

    } catch (error) {
      console.error('Import failed:', error);
      alert('Failed to import rules. Please try again.');
    }
  }

  cancelImport() {
    this.elements.importDialog.close();
  }

  readFileAsText(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = () => reject(reader.error);
      reader.readAsText(file);
    });
  }

  validateImportData(data) {
    if (!data || typeof data !== 'object') return false;
    if (!Array.isArray(data.rules)) return false;

    // Basic validation - each rule should have pattern property
    return data.rules.every(rule =>
      rule && typeof rule === 'object' && typeof rule.pattern === 'string'
    );
  }

  // Wrap storage methods in the class
  storageGet(keys) {
    return storageGet(keys);
  }

  storageSet(items) {
    return storageSet(items);
  }

  upgradeRule(rule) {
    return upgradeRule(rule);
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
