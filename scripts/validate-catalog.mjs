import { readFile } from "node:fs/promises";

const catalogPath = new URL("../public/catalog/actions.tr.json", import.meta.url);
const supportedManagers = new Set(["apt", "dnf", "pacman", "zypper"]);
const allowedSafety = new Set(["safe", "admin", "advanced"]);

const catalog = JSON.parse(await readFile(catalogPath, "utf8"));

assert(catalog.schemaVersion === 1, "schemaVersion must be 1");
assert(Array.isArray(catalog.actions), "actions must be an array");

const ids = new Set();

for (const action of catalog.actions) {
  assertString(action.id, "action.id");
  assert(!ids.has(action.id), `duplicate action id: ${action.id}`);
  ids.add(action.id);

  for (const field of ["title", "description", "category", "impact", "estimatedDuration"]) {
    assertString(action[field], `${action.id}.${field}`);
  }

  assert(typeof action.requiresAdmin === "boolean", `${action.id}.requiresAdmin must be boolean`);
  assert(typeof action.reversible === "boolean", `${action.id}.reversible must be boolean`);
  assert(allowedSafety.has(action.safety), `${action.id}.safety is invalid`);
  assert(Array.isArray(action.tags), `${action.id}.tags must be an array`);
  assert(action.commands && typeof action.commands === "object", `${action.id}.commands must be an object`);

  const managerEntries = Object.entries(action.commands);
  assert(managerEntries.length > 0, `${action.id} must support at least one package manager`);

  for (const [manager, steps] of managerEntries) {
    assert(supportedManagers.has(manager), `${action.id} has unsupported package manager: ${manager}`);
    assert(Array.isArray(steps) && steps.length > 0, `${action.id}.${manager} must have command steps`);

    for (const step of steps) {
      assertProgram(step.program, `${action.id}.${manager}.program`);
      assert(Array.isArray(step.args), `${action.id}.${manager}.args must be an array`);
      assert(typeof step.requiresAdmin === "boolean", `${action.id}.${manager}.requiresAdmin must be boolean`);

      for (const arg of step.args) {
        assert(typeof arg === "string", `${action.id}.${manager}.args contains a non-string`);
      }
    }
  }
}

console.log(`Catalog OK: ${catalog.actions.length} actions, ${ids.size} unique ids.`);

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

function assertString(value, name) {
  assert(typeof value === "string" && value.trim().length > 0, `${name} must be a non-empty string`);
}

function assertProgram(value, name) {
  assertString(value, name);
  assert(!/[\\/\s]/.test(value), `${name} must be a safe executable name, not a path or shell fragment`);
}
