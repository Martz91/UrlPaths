const matchesContainer = document.getElementById("matches");
const statusEl = document.getElementById("status");
const matchTemplate = document.getElementById("matchTemplate");
const transformTemplate = document.getElementById("transformTemplate");
const manageBtn = document.getElementById("manageRules");

let currentTab = null;

document.addEventListener("DOMContentLoaded", initPopup);
manageBtn.addEventListener("click", () => {
  chrome.runtime.openOptionsPage();
});

/**
 * Initializes the popup by loading stored rules, resolving matches, and rendering the UI.
 */
async function initPopup() {
  statusEl.textContent = "Loading rules...";
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab || !tab.url) {
      statusEl.textContent = "Unable to read the active tab URL.";
      return;
    }
    currentTab = tab;

    const stored = await storageGet({ paths: [] });
    const paths = Array.isArray(stored.paths)
      ? stored.paths.map(upgradeRule).filter(Boolean)
      : [];
    if (paths.length === 0) {
      statusEl.textContent = "No rules configured yet.";
      return;
    }

    const matches = collectMatches(paths, tab.url);
    matchesContainer.innerHTML = "";

    if (matches.length === 0) {
      statusEl.textContent = "No matching rules for this URL.";
      return;
    }

    matches.forEach((match) => renderMatch(match));
    statusEl.textContent = "";
  } catch (error) {
    console.error("Popup init failed", error);
    statusEl.textContent = "Failed to load rules.";
  }
}

/**
 * Collects rule matches for the given URL and returns transformation metadata.
 * @param {Array<Object>} paths - The stored rule definitions.
 * @param {string} url - The current tab URL to evaluate.
 * @returns {Array<Object>} Matched rules with their applicable transformations.
 */
function collectMatches(paths, url) {
  return paths
    .map((rule, index) => {
      const transformations = resolveTransformations(rule, url);
      if (!transformations || transformations.length === 0) {
        return null;
      }
      return { rule, transformations, index };
    })
    .filter(Boolean);
}

/**
 * Resolves transformations for a rule against a URL and returns valid targets.
 * @param {Object} rule - The rule definition.
 * @param {string} url - The URL to test against the rule pattern.
 * @returns {Array<Object>|null} Transformation targets or null when none match.
 */
function resolveTransformations(rule, url) {
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
        const target = template.replace(/{{(\d+)}}/g, (full, group) => {
          const groupIndex = Number(group);
          return match[groupIndex] ?? "";
        });
        return {
          name: name || target,
          template,
          target,
        };
      })
      .filter((item) => item.target && isLikelyUrl(item.target));
  }

  if (!url.includes(rule.pattern)) {
    return null;
  }

  return transformations
    .map(({ name, template }) => {
      const target = template
        .replace(/\{\{\s*url\s*\}\}/gi, url)
        .replace(/\{\{\s*pattern\s*\}\}/gi, rule.pattern);
      return {
        name: name || target,
        template,
        target,
      };
    })
    .filter((item) => item.target && isLikelyUrl(item.target));
}

/**
 * Renders a matched rule and its transformations into the popup UI.
 * @param {Object} match - The rule match data containing the rule and transformations.
 */
function renderMatch(match) {
  const { rule, transformations } = match;
  const fragment = matchTemplate.content.cloneNode(true);
  const title = fragment.querySelector(".match__title");
  const list = fragment.querySelector(".match__list");

  title.textContent = rule.name || rule.pattern;
  const ruleKind = rule.type === "regex" ? "Regex" : "String";

  transformations.forEach((item) => {
    const transformNode = transformTemplate.content.cloneNode(true);
    const button = transformNode.querySelector(".match__button");
    const nameSpan = document.createElement("span");
    nameSpan.className = "match__button-name";
    nameSpan.textContent = item.name || item.target;

    const urlSpan = document.createElement("span");
    urlSpan.className = "match__button-url";
    urlSpan.textContent = item.target;

    button.replaceChildren(nameSpan, urlSpan);
    button.title = item.template === item.target ? item.target : `${item.target}\nTemplate: ${item.template}`;
    button.dataset.targetUrl = item.target;

    button.addEventListener("click", (event) => {
      event.preventDefault();
      openUrl(item.target, event.shiftKey, event.shiftKey);
    });

    button.addEventListener("auxclick", (event) => {
      if (event.button === 1) {
        event.preventDefault();
        openUrl(item.target, true, false);
      }
    });

    list.appendChild(transformNode);
  });

  matchesContainer.appendChild(fragment);
}

/**
 * Opens the target URL either in the current tab or a new tab.
 * @param {string} targetUrl - The URL to open.
 * @param {boolean} openInNewTab - Whether to open the URL in a new tab.
 * @param {boolean} [makeActive=true] - Whether the new tab should become active.
 */
function openUrl(targetUrl, openInNewTab, makeActive = true) {
  if (!currentTab) {
    return;
  }

  if (openInNewTab) {
    chrome.tabs.create({ url: targetUrl, active: makeActive });
    window.close();
    return;
  }

  chrome.tabs.update(currentTab.id, { url: targetUrl });
  window.close();
}

/**
 * Determines if a value can be parsed as a valid URL.
 * @param {string} value - The string to validate.
 * @returns {boolean} True when the value is a valid URL.
 */
function isLikelyUrl(value) {
  try {
    new URL(value);
    return true;
  } catch (error) {
    return false;
  }
}

/**
 * Normalizes transformation input into a consistent object representation.
 * @param {string|Object} input - The transformation configuration.
 * @returns {{name: string, template: string}|null} A normalized transformation or null.
 */
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

/**
 * Upgrades and validates a stored rule, ensuring required properties are present.
 * @param {Object} rule - The persisted rule data.
 * @returns {{name: string, pattern: string, type: string, transformations: Array<Object>}|null}
 */
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

/**
 * Promisified helper around chrome.storage.sync.get.
 * @param {Object} keys - The keys or defaults to retrieve from storage.
 * @returns {Promise<Object>} Resolved storage values.
 */
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
