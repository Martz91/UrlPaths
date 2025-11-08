# RulesManager Refactoring TODO

## Goal
Reduce the RulesManager class from ~700 lines to ~200-300 lines by extracting specialized functionality into separate modules.

## 1. Extract DOM Rendering Logic

### Create RuleDetailsRenderer class
- [ ] Create `src/renderers/RuleDetailsRenderer.js`
- [ ] Move `renderRuleDetails()` method
- [ ] Move `editRule()` method 
- [ ] Move `createDetailGroup()` helper method
- [ ] Move `createFormGroup()` helper method
- [ ] Move `createSelectGroup()` helper method
- [ ] Update RulesManager to use RuleDetailsRenderer instance

### Create TransformationRenderer class
- [ ] Create `src/renderers/TransformationRenderer.js`
- [ ] Move `createTransformationRow()` method
- [ ] Move transformation list rendering logic from `renderRuleDetails()`
- [ ] Move transformation list rendering logic from `editRule()`
- [ ] Move `addTransformation()` method
- [ ] Move `removeTransformation()` method
- [ ] Update RulesManager to use TransformationRenderer instance

## 2. Extract Test Logic

### Create RuleTester class
- [ ] Create `src/testing/RuleTester.js`
- [ ] Move `testRule()` method
- [ ] Move `displayTestResult()` method
- [ ] Move `displayTestError()` method
- [ ] Move `createHighlightedText()` method
- [ ] Move `getElementsToHighlight()` method
- [ ] Move `createGroupsDisplay()` method
- [ ] Move `createTransformationResultsDisplay()` method
- [ ] Move `sanitizeHtml()` utility method
- [ ] Update `onTestInputChange()` to use RuleTester instance

## 3. Extract Import/Export Logic

### Create DataManager class
- [ ] Create `src/data/DataManager.js`
- [ ] Move `exportRules()` method
- [ ] Move `importRules()` method
- [ ] Move `showImportDialog()` method
- [ ] Move `onImportFileSelected()` method
- [ ] Move `confirmImport()` method
- [ ] Move `cancelImport()` method
- [ ] Move `readFileAsText()` method
- [ ] Move `validateImportData()` method
- [ ] Update RulesManager to use DataManager instance

## 4. Extract Form Helpers

### Create FormHelpers utility module
- [ ] Create `src/utils/FormHelpers.js`
- [ ] Move `createFormGroup()` as exported function
- [ ] Move `createSelectGroup()` as exported function
- [ ] Move `createDetailGroup()` as exported function
- [ ] Update all classes to import and use FormHelpers

## 5. Extract Status Message System

### Create StatusMessage utility
- [ ] Create `src/utils/StatusMessage.js`
- [ ] Move `showStatusMessage()` method
- [ ] Make it a standalone utility function
- [ ] Update all classes to import and use StatusMessage

## 6. Update Main RulesManager Class

### Refactor RulesManager
- [ ] Remove all extracted methods from RulesManager
- [ ] Add imports for new renderer classes
- [ ] Initialize renderer instances in constructor
- [ ] Update method calls to delegate to specialized classes
- [ ] Keep only core business logic methods:
  - `init()`
  - `loadRules()`
  - `selectRule()`
  - `renderRulesList()`
  - `showEmptyState()`
  - `createNewRule()`
  - `saveRule()`
  - `cancelEdit()`
  - `collectEditableTransformations()`
  - `deleteTransformation()`
  - `deleteCurrentRule()`
  - `persistRules()`

## 7. Update HTML imports

### Update options.html
- [ ] Add script tags for new modules:
  - `<script src="renderers/RuleDetailsRenderer.js"></script>`
  - `<script src="renderers/TransformationRenderer.js"></script>`
  - `<script src="testing/RuleTester.js"></script>`
  - `<script src="data/DataManager.js"></script>`
  - `<script src="utils/FormHelpers.js"></script>`
  - `<script src="utils/StatusMessage.js"></script>`

## 8. Testing & Validation

- [ ] Test rule creation functionality
- [ ] Test rule editing functionality
- [ ] Test rule deletion functionality
- [ ] Test transformation management
- [ ] Test rule testing/preview functionality
- [ ] Test import/export functionality
- [ ] Test status messages
- [ ] Verify no functionality is broken after refactoring

## Expected Outcome

- **Before**: RulesManager ~700 lines
- **After**: 
  - RulesManager ~200-300 lines (core logic only)
  - RuleDetailsRenderer ~150-200 lines
  - TransformationRenderer ~100-150 lines
  - RuleTester ~200-250 lines
  - DataManager ~150-200 lines
  - FormHelpers ~50-75 lines
  - StatusMessage ~25-50 lines

**Total**: Similar line count but much better organized, maintainable, and testable code with clear separation of concerns.