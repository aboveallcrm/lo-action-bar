import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import vm from "node:vm";

const HTML = readFileSync(new URL("../index.html", import.meta.url), "utf8");
const SCRIPT_BLOCK = HTML.match(/<script>([\s\S]*?)<\/script>/)?.[1];
const INIT_SESSION_CALLS = SCRIPT_BLOCK?.match(/^\s*initSession\(\);\s*$/gm) ?? [];
assert.equal(INIT_SESSION_CALLS.length, 1, "fixture must suppress exactly one startup invocation");
const SCRIPT = SCRIPT_BLOCK?.replace(/\s*initSession\(\);\s*$/, "");

assert.ok(SCRIPT, "inline runtime script must be present");
assert.doesNotMatch(SCRIPT, /^\s*initSession\(\);\s*$/m);

const DENIED_ACTION_IDS = [
  "mark_responded",
  "mark_hot",
  "quote_needed",
  "quote_sent",
  "appointment_booked",
  "application_started",
  "in_process",
  "second_look",
  "lost_competitor",
  "dnq",
  "bad_number",
  "mark_dnc",
  "funded",
  "comp_requested",
  "paid",
  "internal_retention",
];

const MALFORMED_ACTION_IDS = [
  ["pause_ai"],
  ["human_takeover"],
  {},
  7,
  null,
  true,
  new String("pause_ai"),
  "toString",
  "constructor",
  "__proto__",
  "unknown_control",
];

class FakeElement {
  constructor(tagName = "div") {
    this.tagName = tagName.toUpperCase();
    this.children = [];
    this.listeners = {};
    this.style = {};
    this.dataset = {};
    this.className = "";
    this.disabled = false;
    this.textContent = "";
    this._innerHTML = "";
  }

  appendChild(child) {
    this.children.push(child);
    return child;
  }

  addEventListener(name, listener) {
    this.listeners[name] = listener;
  }

  set innerHTML(value) {
    this._innerHTML = value;
    if (value === "") this.children = [];
  }

  get innerHTML() {
    return this._innerHTML;
  }
}

function buttonsUnder(node) {
  return node.children.flatMap((child) => [
    ...(child.tagName === "BUTTON" ? [child] : []),
    ...buttonsUnder(child),
  ]);
}

function runtime(response = { ok: true, status: 200, body: { ok: true } }) {
  const elements = new Map([
    ["actions", new FakeElement()],
    ["toast", new FakeElement()],
    ["badge", new FakeElement()],
    ["ctx", new FakeElement()],
  ]);
  const calls = { fetch: [], confirm: 0 };
  const context = {
    console,
    URLSearchParams,
    location: { search: "" },
    document: {
      getElementById: (id) => elements.get(id),
      createElement: (tagName) => new FakeElement(tagName),
    },
    window: {
      addEventListener() {},
      removeEventListener() {},
      postMessage() {},
    },
    setTimeout() {},
    confirm() {
      calls.confirm += 1;
      return true;
    },
    async fetch(url, options) {
      calls.fetch.push({ url, options });
      if (response.throwFetch) throw new Error("raw thrown transport detail");
      return {
        ok: response.ok,
        status: response.status,
        async json() {
          if (response.throwJson) throw new Error("raw parse detail");
          return response.body;
        },
      };
    },
  };
  context.window.parent = context.window;
  context.window.window = context.window;
  vm.createContext(context);
  vm.runInContext(SCRIPT, context);
  context.contactId = "contact00000000000000";
  context.locationId = "location0000000000000";
  context.encryptedData = "synthetic-sso-context";
  return { context, elements, calls };
}

test("the sixteen unratified catalog controls and unknown actions render disabled", () => {
  const { context, elements } = runtime();
  context.actions = [
    ...DENIED_ACTION_IDS.map((action_id) => ({
      action_id,
      label: action_id,
      short_label: action_id,
      category: "active",
    })),
    { action_id: "unknown_control", label: "Unknown", category: "active" },
    { action_id: "human_takeover", label: "Human Takeover", category: "control" },
    { action_id: "pause_ai", label: "Pause AI", category: "control" },
  ];

  context.renderActions();
  const buttons = buttonsUnder(elements.get("actions"));
  assert.equal(buttons.length, 19);
  assert.deepEqual(
    buttons.filter((button) => button.disabled).map((button) => button.dataset.actionId).sort(),
    [...DENIED_ACTION_IDS, "unknown_control"].sort(),
  );
  assert.deepEqual(
    buttons.filter((button) => !button.disabled).map((button) => button.textContent),
    ["Human Takeover", "Pause AI"],
  );
});

test("programmatic execution denies the sixteen controls and unknown IDs before confirmation or fetch", async () => {
  for (const action_id of [...DENIED_ACTION_IDS, "unknown_control"]) {
    const { context, elements, calls } = runtime();
    await context.executeAction({
      action_id,
      label: "Untrusted label",
      requires_confirmation: true,
    });
    assert.equal(calls.confirm, 0, action_id);
    assert.equal(calls.fetch.length, 0, action_id);
    assert.equal(elements.get("toast").textContent, "Action unavailable. This control is not authorized.");
  }
});

test("malformed and inherited-key action IDs render disabled without string coercion", () => {
  const { context, elements } = runtime();
  context.actions = MALFORMED_ACTION_IDS.map((action_id, index) => ({
    action_id,
    label: `Malformed ${index}`,
    category: "control",
  }));

  context.renderActions();
  const buttons = buttonsUnder(elements.get("actions"));
  assert.equal(buttons.length, MALFORMED_ACTION_IDS.length);
  assert.ok(buttons.every((button) => button.disabled));
  buttons.forEach((button, index) => {
    const rawId = MALFORMED_ACTION_IDS[index];
    assert.equal(button.dataset.actionId, typeof rawId === "string" ? rawId : "");
  });
});

test("malformed and inherited-key action IDs deny before confirmation or fetch", async () => {
  for (const action_id of MALFORMED_ACTION_IDS) {
    const { context, elements, calls } = runtime();
    await context.executeAction({
      action_id,
      label: "Untrusted label",
      requires_confirmation: true,
    });
    assert.equal(calls.confirm, 0);
    assert.equal(calls.fetch.length, 0);
    assert.equal(elements.get("toast").textContent, "Action unavailable. This control is not authorized.");
  }
});

test("an inherited G1 action_id cannot enable rendering or programmatic execution", async () => {
  const inheritedAction = Object.create({ action_id: "pause_ai" });
  inheritedAction.label = "Inherited Pause";
  inheritedAction.category = "control";
  inheritedAction.requires_confirmation = true;
  const { context, elements, calls } = runtime();
  context.actions = [inheritedAction];

  context.renderActions();
  const buttons = buttonsUnder(elements.get("actions"));
  assert.equal(buttons.length, 1);
  assert.equal(buttons[0].disabled, true);

  await context.executeAction(inheritedAction);
  assert.equal(calls.confirm, 0);
  assert.equal(calls.fetch.length, 0);
  assert.equal(elements.get("toast").textContent, "Action unavailable. This control is not authorized.");
});

test("catalog label markup renders as literal text", () => {
  const { context, elements } = runtime();
  const markup = '<img src=x onerror="throw new Error(1)">Pause';
  context.actions = [{ action_id: "pause_ai", label: markup, category: "control" }];
  context.renderActions();
  const buttons = buttonsUnder(elements.get("actions"));
  assert.equal(buttons.length, 1);
  assert.equal(buttons[0].textContent, markup);
  assert.equal(buttons[0].innerHTML, "");
});

test("action loading failures use one fixed message without response or exception reflection", async () => {
  const scenarios = [
    { ok: false, status: 403, body: { ok: false, reason: "raw authorization detail" } },
    { ok: true, status: 200, throwJson: true, body: null },
    { ok: false, status: 0, throwFetch: true, body: null },
  ];
  for (const response of scenarios) {
    const { context, elements } = runtime(response);
    await context.loadActions();
    assert.equal(elements.get("toast").textContent, "Actions unavailable. Refresh or reopen inside GHL.");
    assert.doesNotMatch(elements.get("toast").textContent, /authorization|parse|transport|raw/i);
  }
});

test("G1 controls remain distinct but generic success cannot render completion", async () => {
  for (const [action_id, label] of [["human_takeover", "Human Takeover"], ["pause_ai", "Pause AI"]]) {
    const { context, elements, calls } = runtime({
      ok: true,
      status: 200,
      body: { ok: true },
    });
    await context.executeAction({ action_id, label, requires_confirmation: false });
    assert.equal(calls.fetch.length, 1);
    assert.equal(JSON.parse(calls.fetch[0].options.body).actionId, action_id);
    assert.equal(calls.fetch[0].options.headers.Authorization, undefined);
    assert.equal(
      elements.get("toast").textContent,
      "Action result unavailable. No verified canonical receipt was returned.",
    );
    assert.notEqual(elements.get("toast").style.borderLeftColor, "#16a34a");
  }
});

test("backend and parse details are never reflected into visible action errors", async () => {
  const scenarios = [
    { ok: false, status: 503, body: { ok: false, reason: "raw database/provider detail" } },
    { ok: true, status: 200, throwJson: true, body: null },
    { ok: false, status: 0, throwFetch: true, body: null },
  ];
  for (const response of scenarios) {
    const { context, elements } = runtime(response);
    await context.executeAction({
      action_id: "pause_ai",
      label: "Pause AI",
      requires_confirmation: false,
    });
    assert.equal(
      elements.get("toast").textContent,
      "Could not verify this action. No completed hold is confirmed.",
    );
    assert.doesNotMatch(elements.get("toast").textContent, /database|provider|parse|transport|raw/i);
  }
});
