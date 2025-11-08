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

    const stored = await storageGet({ rules: [] });
    const rules = Array.isArray(stored.rules)
      ? stored.rules.map(upgradeRule).filter(Boolean)
      : [];
    if (rules.length === 0) {
      statusEl.textContent = "No rules configured yet.";
      return;
    }

    const matches = collectMatches(rules, tab.url);
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
 * @param {Array<Object>} rules - The stored rule definitions.
 * @param {string} url - The current tab URL to evaluate.
 * @returns {Array<Object>} Matched rules with their applicable transformations.
 */
function collectMatches(rules, url) {
  return rules
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
 * Renders a matched rule and its transformations into the popup UI.
 * @param {Object} match - The rule match data containing the rule and transformations.
 */
function renderMatch(match) {
  const { rule, transformations } = match;
  const fragment = matchTemplate.content.cloneNode(true);
  const title = fragment.querySelector(".match__title");
  const list = fragment.querySelector(".match__list");

  title.textContent = rule.name || rule.pattern;
  // All rules are now regex-based

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
