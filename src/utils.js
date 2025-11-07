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

/**
 * Normalizes transformation input into a consistent object representation.
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
 * Upgrades and validates a stored rule.
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

  return { name, pattern, type, transformations };
}


