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
    const paths = Array.isArray(stored.paths) ? stored.paths.filter(isValidRuleShape) : [];
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

function resolveTransformations(rule, url) {
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
      .map((tpl) => ({
        template: tpl,
        target: tpl.replace(/\\(\d+)/g, (full, group) => {
          const groupIndex = Number(group);
          return match[groupIndex] ?? "";
        }),
      }))
      .filter((item) => item.target && isLikelyUrl(item.target));
  }

  if (!url.includes(rule.pattern)) {
    return null;
  }

  return rule.transformations
    .filter((tpl) => typeof tpl === "string" && tpl.length > 0)
    .map((tpl) => ({
      template: tpl,
      target: tpl
        .replace(/\{\{\s*url\s*\}\}/gi, url)
        .replace(/\{\{\s*pattern\s*\}\}/gi, rule.pattern),
    }))
    .filter((item) => item.target && isLikelyUrl(item.target));
}

function renderMatch(match) {
  const { rule, transformations } = match;
  const fragment = matchTemplate.content.cloneNode(true);
  const title = fragment.querySelector(".match__title");
  const source = fragment.querySelector(".match__source");
  const list = fragment.querySelector(".match__list");

  title.textContent = rule.pattern;
  source.textContent = rule.type === "regex" ? "Regex rule" : "String rule";

  transformations.forEach((item) => {
    const transformNode = transformTemplate.content.cloneNode(true);
    const button = transformNode.querySelector(".match__button");
    button.textContent = item.target;
    button.title = item.template;
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

function isLikelyUrl(value) {
  try {
    new URL(value);
    return true;
  } catch (error) {
    return false;
  }
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
