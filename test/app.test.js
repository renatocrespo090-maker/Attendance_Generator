const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

class FakeElement {
  constructor(tagOrId = 'div') {
    this.tagName = typeof tagOrId === 'string' && tagOrId.toLowerCase() === 'option' ? 'OPTION' : 'DIV';
    this.id = tagOrId;
    this.value = '';
    this.textContent = '';
    this.hidden = false;
    this.checked = false;
    this.disabled = false;
    this.href = '#';
    this.style = {};
    this.dataset = {};
    this.attributes = {};
    this.children = [];
    this.className = '';
    this.innerHTML = '';
    this.type = '';
    this.name = '';
    this.rel = '';
    this.target = '';
    this.elements = {};
  }

  append(...nodes) {
    this.children.push(...nodes);
    return this;
  }

  addEventListener() {}
  setAttribute(name, value) {
    this.attributes[name] = value;
  }
  toggleAttribute(name, force) {
    this.attributes[name] = force;
    return force;
  }
  querySelector(selector) {
    if (selector === 'h3') {
      if (!this._h3) this._h3 = new FakeElement('h3');
      return this._h3;
    }
    if (selector === 'input:last-of-type') {
      const inputs = this.children.filter((child) => child && child.tagName === 'INPUT');
      return inputs[inputs.length - 1] || null;
    }
    return null;
  }
  focus() {}
  select() {}
  remove() {}
}

const selectorMap = {
  serviceSelect: new FakeElement('select'),
  currentDate: new FakeElement('strong'),
  monitoringHourInput: new FakeElement('select'),
  monitoringMinuteInput: new FakeElement('select'),
  monitoringPeriodInput: new FakeElement('select'),
  attendanceSummary: new FakeElement('span'),
  attendanceIntroSummary: new FakeElement('div'),
  zoomLink: new FakeElement('a'),
  zoomFieldLabel: new FakeElement('dt'),
  meetingId: new FakeElement('dd'),
  meetingIdFieldLabel: new FakeElement('dt'),
  passcode: new FakeElement('dd'),
  passcodeFieldLabel: new FakeElement('dt'),
  provinceGrid: new FakeElement('section'),
  connectedIndividualsInput: new FakeElement('textarea'),
  remarksInput: new FakeElement('textarea'),
  reportOutput: new FakeElement('pre'),
  copyReportButton: new FakeElement('button'),
  resetAttendanceButton: new FakeElement('button'),
  settingsModal: new FakeElement('div'),
  settingsForm: new FakeElement('form'),
  themeToggleButton: new FakeElement('button'),
  openSettingsButton: new FakeElement('button'),
  closeSettingsButton: new FakeElement('button'),
  cancelSettingsButton: new FakeElement('button'),
  restoreDefaultsButton: new FakeElement('button'),
  addServiceButton: new FakeElement('button'),
  addProvinceButton: new FakeElement('button'),
  serviceSettingsList: new FakeElement('div'),
  provinceSettingsList: new FakeElement('div'),
  toast: new FakeElement('div'),
  liveCheckbox: new FakeElement('input'),
  viewingCheckbox: new FakeElement('input'),
  themeToggle: new FakeElement('button')
};
selectorMap.settingsForm.elements = {};

const document = {
  querySelector(selector) {
    if (selector.startsWith('#')) {
      return selectorMap[selector.slice(1)] || null;
    }
    if (selector === 'body') {
      return document.body;
    }
    return null;
  },
  body: { style: {}, dataset: {} },
  documentElement: { style: {} },
  createElement(tag) {
    return new FakeElement(tag);
  },
  createTextNode(text) {
    return { textContent: String(text), nodeType: 3 };
  },
  addEventListener() {},
};

const localStorage = {
  data: {},
  getItem(key) {
    return Object.prototype.hasOwnProperty.call(this.data, key) ? this.data[key] : null;
  },
  setItem(key, value) {
    this.data[key] = String(value);
  }
};

const context = {
  console,
  document,
  localStorage,
  navigator: { clipboard: { writeText: async () => {} } },
  Intl,
  setInterval: () => 0,
  clearTimeout: () => {},
  window: { addEventListener() {} },
};

vm.createContext(context);
vm.runInContext(fs.readFileSync('app.js', 'utf8'), context);

assert.match(selectorMap.reportOutput.textContent, /LIVE\s+WORSHIP SERVICE ZOOM MONITORING/i, 'Expected the report output to include the LIVE service status.');
assert.match(selectorMap.reportOutput.textContent, /Zoom link: Join Zoom Meeting \[https:\/\/us06web\.zoom\.us\/j\/84884076363\?pwd=ztz32ZQ1swwoQagHbTuzCIIXv7aNFr\.1\]\n\nMeeting ID: 848 8407 6363/s, 'Expected the report output to separate the Zoom link and Meeting ID with a blank line.');

console.log('app test passed');
