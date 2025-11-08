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
  const type = "regex"; // All rules are now regex-based
  const transformations = Array.isArray(rule.transformations)
    ? rule.transformations.map(toTransformation).filter(Boolean)
    : [];

  return { name, pattern, type, transformations };
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