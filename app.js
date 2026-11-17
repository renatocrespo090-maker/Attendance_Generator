/* Zoom Attendance Generator — all data stays in this browser's local storage. */
(function () {
  "use strict";

  const STORAGE_KEY = "gathered-attendance-generator-v1";
  const STATUS_OPTIONS = [
    { value: "connected", icon: "✅", label: "Connected" },
    { value: "not-connected", icon: "❌", label: "Not connected" },
    { value: "no-gathering", icon: "🗓️", label: "No gathering schedule" }
  ];
  const DEFAULT_STATE = {
    serviceId: "worship",
    monitoringTime: currentTimeValue(),
    live: false,
    viewing: false,
    connectedIndividuals: "",
    remarks: "",
    settings: {
      theme: "light",
      monitoringHeading: "ZOOM MONITORING",
      zoomFieldLabel: "Zoom link",
      zoomLinkLabel: "Join Zoom Meeting",
      meetingIdLabel: "Meeting ID",
      passcodeLabel: "Passcode",
      provinceLabel: "PROVINCE",
      connectedLabel: "CONNECTED LOCALES",
      notConnectedLabel: "NOT CONNECTED",
      noGatheringLabel: "NO GATHERING SCHEDULE",
      individualsLabel: "CONNECTED INDIVIDUALS",
      remarksLabel: "REMARKS",
      zoomLink: "https://us06web.zoom.us/j/84884076363?pwd=ztz32ZQ1swwoQagHbTuzCIIXv7aNFr.1",
      meetingId: "848 8407 6363",
      passcode: "1",
      services: [
        { id: "prayer", name: "LIVE PRAYER MEETING ZOOM MONITORING" },
        { id: "worship", name: "LIVE WORSHIP SERVICE ZOOM MONITORING" },
        { id: "thanksgiving", name: "LIVE THANKSGIVING OF GOD'S PEOPLE ZOOM MONITORING" }
      ],
      provinces: [
        {
          id: "davao-del-sur",
          name: "DAVAO DEL SUR",
          locales: [
            { id: "kapatagan", name: "KAPATAGAN", status: "connected", defaultStatus: "connected" },
            { id: "sta-cruz", name: "STA. CRUZ", status: "connected", defaultStatus: "connected" },
            { id: "digos-lim", name: "DIGOS-LIM", status: "connected", defaultStatus: "connected" },
            { id: "binaton", name: "BINATON", status: "connected", defaultStatus: "connected" },
            { id: "darong", name: "DARONG", status: "connected", defaultStatus: "connected" },
            { id: "bansalan", name: "BANSALAN", status: "connected", defaultStatus: "connected" },
            { id: "digos-luna", name: "DIGOS-LUNA", status: "not-connected", defaultStatus: "not-connected" },
            { id: "matanao", name: "MATANAO", status: "not-connected", defaultStatus: "not-connected" },
            { id: "kiblawan", name: "KIBLAWAN", status: "not-connected", defaultStatus: "not-connected" },
            { id: "padada", name: "PADADA", status: "not-connected", defaultStatus: "not-connected" }
          ],
          noLocale: ""
        },
        {
          id: "davao-occidental",
          name: "DAVAO OCCIDENTAL",
          locales: [
            { id: "sta-maria", name: "STA. MARIA", status: "not-connected", defaultStatus: "not-connected" },
            { id: "malita", name: "MALITA", status: "not-connected", defaultStatus: "not-connected" }
          ],
          noLocale: ""
        }
      ]
    }
  };

  const $ = (selector) => document.querySelector(selector);
  const els = {
    serviceSelect: $("#serviceSelect"),
    currentDate: $("#currentDate"),
    monitoringHour: $("#monitoringHourInput"),
    monitoringMinute: $("#monitoringMinuteInput"),
    monitoringPeriod: $("#monitoringPeriodInput"),
    liveCheckbox: $("#liveCheckbox"),
    viewingCheckbox: $("#viewingCheckbox"),
    attendanceSummary: $("#attendanceSummary"),
    attendanceIntroSummary: $("#attendanceIntroSummary"),
    zoomLink: $("#zoomLink"),
    zoomFieldLabel: $("#zoomFieldLabel"),
    meetingId: $("#meetingId"),
    meetingIdFieldLabel: $("#meetingIdFieldLabel"),
    passcode: $("#passcode"),
    passcodeFieldLabel: $("#passcodeFieldLabel"),
    provinceGrid: $("#provinceGrid"),
    connectedIndividuals: $("#connectedIndividualsInput"),
    remarks: $("#remarksInput"),
    reportOutput: $("#reportOutput"),
    copyReport: $("#copyReportButton"),
    resetAttendance: $("#resetAttendanceButton"),
    modal: $("#settingsModal"),
    settingsForm: $("#settingsForm"),
    themeToggle: $("#themeToggleButton"),
    openSettings: $("#openSettingsButton"),
    closeSettings: $("#closeSettingsButton"),
    cancelSettings: $("#cancelSettingsButton"),
    restoreDefaults: $("#restoreDefaultsButton"),
    addService: $("#addServiceButton"),
    addProvince: $("#addProvinceButton"),
    serviceSettingsList: $("#serviceSettingsList"),
    provinceSettingsList: $("#provinceSettingsList"),
    toast: $("#toast")
  };

  let state = loadState();
  let settingsDraft = null;
  let toastTimer = null;
  const settingSectionState = {
    appearance: false,
    reportLabels: false,
    zoomDetails: false,
    serviceOptions: false,
    provincesLocales: false
  };

  function clone(value) {
    return JSON.parse(JSON.stringify(value));
  }

  function cleanText(value) {
    return String(value || "").trim();
  }

  function makeId(prefix) {
    return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
  }

  function currentTimeValue() {
    const now = new Date();
    return `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
  }

  function isValidTime(value) {
    return /^([01]\d|2[0-3]):[0-5]\d$/.test(value);
  }

  function isValidStatus(value) {
    return STATUS_OPTIONS.some((option) => option.value === value);
  }

  function normalizeState(candidate) {
    const fallback = clone(DEFAULT_STATE);
    if (!candidate || typeof candidate !== "object" || !candidate.settings) return fallback;

    const safe = clone(candidate);
    safe.serviceId = typeof safe.serviceId === "string" ? safe.serviceId : fallback.serviceId;
    safe.monitoringTime = isValidTime(safe.monitoringTime) ? safe.monitoringTime : currentTimeValue();
    safe.live = typeof safe.live === "boolean" ? safe.live : false;
    safe.viewing = typeof safe.viewing === "boolean" ? safe.viewing : false;
    if (safe.live && safe.viewing) safe.viewing = false;
    safe.connectedIndividuals = typeof safe.connectedIndividuals === "string" ? safe.connectedIndividuals : "";
    safe.remarks = typeof safe.remarks === "string" ? safe.remarks : "";
    safe.settings = { ...fallback.settings, ...safe.settings };
    safe.settings.services = Array.isArray(safe.settings.services) ? safe.settings.services : fallback.settings.services;
    safe.settings.provinces = Array.isArray(safe.settings.provinces) ? safe.settings.provinces : fallback.settings.provinces;

    safe.settings.services = safe.settings.services
      .filter((item) => item && typeof item.name === "string")
      .map((item) => ({ id: item.id || makeId("service"), name: item.name }));
    if (!safe.settings.services.length) safe.settings.services = fallback.settings.services;
    if (!safe.settings.services.some((service) => service.id === safe.serviceId)) safe.serviceId = safe.settings.services[0].id;

    safe.settings.provinces = safe.settings.provinces
      .filter((province) => province && typeof province.name === "string")
      .map((province) => ({
        id: province.id || makeId("province"),
        name: province.name,
        noLocale: "",
        locales: Array.isArray(province.locales)
          ? province.locales
            .filter((locale) => locale && typeof locale.name === "string")
            .map((locale) => {
              const savedStatus = isValidStatus(locale.status) ? locale.status : (locale.connected ? "connected" : "not-connected");
              const savedDefaultStatus = isValidStatus(locale.defaultStatus)
                ? locale.defaultStatus
                : (typeof locale.defaultConnected === "boolean" ? (locale.defaultConnected ? "connected" : "not-connected") : savedStatus);
              return { id: locale.id || makeId("locale"), name: locale.name, status: savedStatus, defaultStatus: savedDefaultStatus };
            })
          : []
      }));
    return safe;
  }

  function loadState() {
    try {
      return normalizeState(JSON.parse(localStorage.getItem(STORAGE_KEY)));
    } catch (_) {
      return clone(DEFAULT_STATE);
    }
  }

  function saveState() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }

  function getSelectedService() {
    return state.settings.services.find((service) => service.id === state.serviceId) || state.settings.services[0];
  }

  function formatCurrentDate() {
    return new Intl.DateTimeFormat(undefined, {
      weekday: "long",
      month: "short",
      day: "numeric",
      year: "numeric"
    }).format(new Date());
  }

  function formatReportTime() {
    const now = new Date();
    const [hours, minutes] = state.monitoringTime.split(":").map(Number);
    now.setHours(hours, minutes, 0, 0);
    const time = new Intl.DateTimeFormat(undefined, { hour: "numeric", minute: "2-digit", hour12: true }).format(now);
    const date = new Intl.DateTimeFormat(undefined, { month: "2-digit", day: "2-digit", year: "2-digit" }).format(now);
    return `${time}  | ${date}`;
  }

  function addTimeOption(select, value, label) {
    const option = document.createElement("option");
    option.value = value;
    option.textContent = label;
    select.append(option);
  }

  function populateTimePicker() {
    if (els.monitoringHour.children.length) return;
    for (let hour = 1; hour <= 12; hour += 1) {
      const value = String(hour).padStart(2, "0");
      addTimeOption(els.monitoringHour, value, value);
    }
    for (let minute = 0; minute < 60; minute += 1) {
      const value = String(minute).padStart(2, "0");
      addTimeOption(els.monitoringMinute, value, value);
    }
    addTimeOption(els.monitoringPeriod, "AM", "AM");
    addTimeOption(els.monitoringPeriod, "PM", "PM");
  }

  function applyTheme() {
    const theme = state.settings.theme === "dark" ? "dark" : "light";
    document.body.dataset.theme = theme;
    document.documentElement.style.colorScheme = theme;
    if (!els.themeToggle) return;
    const isDark = theme === "dark";
    els.themeToggle.innerHTML = isDark
      ? '<span aria-hidden="true">☾</span> Dark'
      : '<span aria-hidden="true">☀</span> Light';
    els.themeToggle.setAttribute("aria-pressed", String(isDark));
  }

  function renderClock() {
    els.currentDate.textContent = formatCurrentDate();
    populateTimePicker();
    const [hours, minutes] = state.monitoringTime.split(":").map(Number);
    const period = hours >= 12 ? "PM" : "AM";
    const displayHour = String(hours % 12 || 12).padStart(2, "0");
    const displayMinute = String(minutes).padStart(2, "0");
    if (els.monitoringHour.value !== displayHour) els.monitoringHour.value = displayHour;
    if (els.monitoringMinute.value !== displayMinute) els.monitoringMinute.value = displayMinute;
    if (els.monitoringPeriod.value !== period) els.monitoringPeriod.value = period;
  }

  function saveTimeFromPicker() {
    const hour12 = Number(els.monitoringHour.value);
    const minutes = Number(els.monitoringMinute.value);
    const period = els.monitoringPeriod.value;
    if (!hour12 || Number.isNaN(minutes) || !["AM", "PM"].includes(period)) return;
    const hour24 = (hour12 % 12) + (period === "PM" ? 12 : 0);
    state.monitoringTime = `${String(hour24).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;
    saveState();
    renderReport();
  }

  function renderServiceSelect() {
    els.serviceSelect.innerHTML = "";
    state.settings.services.forEach((service) => {
      const option = document.createElement("option");
      option.value = service.id;
      option.textContent = service.name;
      option.selected = service.id === state.serviceId;
      els.serviceSelect.append(option);
    });
  }

  function updateLocaleSummary() {
    const locales = state.settings.provinces.flatMap((province) => province.locales);
    const connected = locales.filter((locale) => locale.status === "connected").length;
    const noGathering = locales.filter((locale) => locale.status === "no-gathering").length;
    const summary = `${connected} of ${locales.length} locales connected${noGathering ? ` · ${noGathering} no gathering` : ""}`;
    els.attendanceIntroSummary.innerHTML = `<span class="pulse-inline" aria-hidden="true"></span><span>${summary}</span>`;
  }

  function renderMeetingDetails() {
    const settings = state.settings;
    els.zoomLink.href = settings.zoomLink || "#";
    els.zoomLink.textContent = settings.zoomLink || "No Zoom link set";
    els.zoomLink.title = settings.zoomLink || "No Zoom link set";
    els.zoomLink.toggleAttribute("aria-disabled", !settings.zoomLink);
    els.zoomFieldLabel.textContent = settings.zoomFieldLabel || "Zoom link";
    els.meetingIdFieldLabel.textContent = settings.meetingIdLabel || "Meeting ID";
    els.passcodeFieldLabel.textContent = settings.passcodeLabel || "Passcode";
    els.meetingId.textContent = settings.meetingId || "—";
    els.passcode.textContent = settings.passcode || "—";
  }

  function renderProvinces() {
    els.provinceGrid.innerHTML = "";
    if (!state.settings.provinces.length) {
      els.provinceGrid.innerHTML = '<article class="province-card empty-state">No provinces have been set up. Add one from Settings.</article>';
      return;
    }
    state.settings.provinces.forEach((province) => {
      const card = document.createElement("article");
      card.className = "province-card";
      const connectedCount = province.locales.filter((locale) => locale.status === "connected").length;
      const noGatheringCount = province.locales.filter((locale) => locale.status === "no-gathering").length;
      const title = document.createElement("div");
      title.className = "province-card-header";
      title.innerHTML = `<div><p class="eyebrow">PROVINCE</p><h3></h3></div><span class="count-badge">${connectedCount} connected${noGatheringCount ? ` · ${noGatheringCount} no gathering` : ""}</span>`;
      title.querySelector("h3").textContent = province.name || "Unnamed province";
      card.append(title);

      if (province.locales.length) {
        const list = document.createElement("div");
        list.className = "locale-list";
        province.locales.forEach((locale) => {
          const row = document.createElement("div");
          row.className = "locale-row";
          const connectedLabel = document.createElement("label");
          connectedLabel.className = "locale-connected-control";
          connectedLabel.setAttribute("title", `Mark ${locale.name} as connected`);
          const connectedCheckbox = document.createElement("input");
          connectedCheckbox.type = "checkbox";
          connectedCheckbox.className = "locale-connected-checkbox";
          connectedCheckbox.checked = locale.status === "connected";
          connectedCheckbox.disabled = locale.status === "no-gathering";
          connectedCheckbox.dataset.provinceId = province.id;
          connectedCheckbox.dataset.localeId = locale.id;
          connectedCheckbox.dataset.attendanceControl = "connected";
          connectedCheckbox.setAttribute("aria-label", `Mark ${locale.name} as connected`);
          const name = document.createElement("span");
          name.className = "locale-name";
          name.textContent = locale.name || "Unnamed locale";
          connectedLabel.append(connectedCheckbox, name);
          const noGatheringLabel = document.createElement("label");
          noGatheringLabel.className = "locale-no-gathering";
          const noGatheringCheckbox = document.createElement("input");
          noGatheringCheckbox.type = "checkbox";
          noGatheringCheckbox.checked = locale.status === "no-gathering";
          noGatheringCheckbox.dataset.provinceId = province.id;
          noGatheringCheckbox.dataset.localeId = locale.id;
          noGatheringCheckbox.dataset.attendanceControl = "no-gathering";
          noGatheringCheckbox.setAttribute("aria-label", `Mark ${locale.name} as no gathering schedule`);
          noGatheringLabel.append(noGatheringCheckbox, document.createTextNode("No gathering schedule"));
          row.append(connectedLabel, noGatheringLabel);
          list.append(row);
        });
        card.append(list);
      } else {
        const empty = document.createElement("p");
        empty.className = "empty-state";
        empty.textContent = "No locales have been added yet.";
        card.append(empty);
      }
      els.provinceGrid.append(card);
    });
  }

  function joinedList(items) {
    return items.length ? items.join("\n") : "—";
  }

  function reportText() {
    const selectedService = getSelectedService();
    const s = state.settings;
    const statusLabel = state.live ? "LIVE" : state.viewing ? "VIEWING" : null;
    const output = [];
    if (statusLabel) {
      output.push(`${statusLabel} ${selectedService.name}  ${formatReportTime()}`);
    } else {
      output.push(`${selectedService.name}  ${formatReportTime()}`);
    }
    output.push(`${s.monitoringHeading}`);
    output.push("");
    output.push(`${s.zoomFieldLabel || "Zoom link"}: ${s.zoomLinkLabel || "Join Zoom Meeting"}${s.zoomLink ? ` [${s.zoomLink}]` : ""}`);
    output.push("");
    output.push(`${s.meetingIdLabel || "Meeting ID"}: ${s.meetingId || "—"}`);
    output.push(`${s.passcodeLabel || "Passcode"}: ${s.passcode || "—"}`);
    output.push("");
    output.push(`${s.provinceLabel || "PROVINCE"}: ${s.provinces.map((province) => province.name).filter(Boolean).join(" & ") || "—"}`);
    output.push("");
    s.provinces.forEach((province) => {
      const connected = province.locales.filter((locale) => locale.status === "connected").map((locale) => `✅ ${locale.name}`);
      const disconnected = province.locales.filter((locale) => locale.status === "not-connected").map((locale) => `❌ ${locale.name}`);
      const noGathering = province.locales.filter((locale) => locale.status === "no-gathering").map((locale) => `🗓️ ${locale.name}`);
      output.push(`${province.name || "UNNAMED PROVINCE"} ${s.connectedLabel}:`);
      output.push(joinedList(connected));
      output.push("");
      output.push(`${s.notConnectedLabel}:`);
      output.push(joinedList(disconnected));
      if (noGathering.length) {
        output.push("");
        output.push(`${s.noGatheringLabel || "NO GATHERING SCHEDULE"}:`);
        output.push(joinedList(noGathering));
      }
      output.push("");
    });
    output.push(`${s.individualsLabel}:`);
    output.push(cleanText(state.connectedIndividuals) || "—");
    output.push("");
    output.push(`${s.remarksLabel}:`);
    output.push(cleanText(state.remarks) || "—");
    return output.join("\n").trim();
  }

  function renderReport() {
    els.reportOutput.textContent = reportText();
  }

  function render() {
    applyTheme();
    renderClock();
    renderServiceSelect();
    renderMeetingDetails();
    renderProvinces();
    updateLocaleSummary();
    els.liveCheckbox.checked = !!state.live;
    els.viewingCheckbox.checked = !!state.viewing;
    els.connectedIndividuals.value = state.connectedIndividuals;
    els.remarks.value = state.remarks;
    renderReport();
  }

  function showToast(message) {
    clearTimeout(toastTimer);
    els.toast.textContent = message;
    els.toast.hidden = false;
    toastTimer = setTimeout(() => { els.toast.hidden = true; }, 2800);
  }

  function cloneSettingsForDraft() {
    settingsDraft = clone(state.settings);
  }

  function setSectionEditState(sectionKey, isEditing) {
    settingSectionState[sectionKey] = isEditing;
    const section = document.querySelector(`[data-settings-section="${sectionKey}"]`);
    if (!section) return;
    const toggle = section.querySelector(".section-edit-toggle");
    if (toggle) {
      toggle.textContent = isEditing ? "Done" : "Edit";
      toggle.setAttribute("aria-pressed", String(isEditing));
      toggle.hidden = false;
    }
    section.querySelectorAll("input, select, textarea, button").forEach((control) => {
      if (control.classList.contains("section-edit-toggle")) return;
      if (control.closest(".settings-footer")) return;
      if (sectionKey === "appearance") {
        control.disabled = false;
        return;
      }
      control.disabled = !isEditing;
      if (control.id === "addServiceButton" || control.id === "addProvinceButton") {
        control.style.opacity = isEditing ? "1" : "0.65";
        control.style.filter = isEditing ? "none" : "grayscale(0.2)";
      }
    });
    section.classList.toggle("settings-section-locked", sectionKey !== "appearance" ? !isEditing : false);
  }

  function syncSettingsSectionStates() {
    Object.keys(settingSectionState).forEach((sectionKey) => setSectionEditState(sectionKey, settingSectionState[sectionKey]));
  }

  function createEditorLine(value, { placeholder, removeAction, extraClass = "" } = {}) {
    const row = document.createElement("div");
    row.className = `editor-line ${extraClass}`;
    const input = document.createElement("input");
    input.type = "text";
    input.value = value;
    input.placeholder = placeholder || "";
    input.autocomplete = "off";
    input.autocorrect = "off";
    input.autocapitalize = "off";
    input.spellcheck = false;
    row.append(input);
    if (removeAction) {
      const remove = document.createElement("button");
      remove.className = "remove-button";
      remove.type = "button";
      remove.textContent = "Remove";
      remove.addEventListener("click", removeAction);
      row.append(remove);
    }
    return { row, input };
  }

  function renderServiceSettings() {
    els.serviceSettingsList.innerHTML = "";
    settingsDraft.services.forEach((service, index) => {
      const line = createEditorLine(service.name, {
        placeholder: "Service name",
        removeAction: () => {
          if (settingsDraft.services.length === 1) return showToast("Keep at least one service option.");
          settingsDraft.services.splice(index, 1);
          renderServiceSettings();
        }
      });
      line.input.addEventListener("input", (event) => { settingsDraft.services[index].name = event.target.value; });
      els.serviceSettingsList.append(line.row);
    });
    syncSettingsSectionStates();
  }

  function renderProvinceSettings() {
    els.provinceSettingsList.innerHTML = "";
    settingsDraft.provinces.forEach((province, provinceIndex) => {
      const container = document.createElement("div");
      container.className = "province-editor";
      const header = document.createElement("div");
      header.className = "province-editor-head";
      const nameLabel = document.createElement("label");
      nameLabel.textContent = "Province name";
      const nameInput = document.createElement("input");
      nameInput.type = "text";
      nameInput.value = province.name;
      nameInput.placeholder = "Province name";
      nameInput.autocomplete = "off";
      nameInput.autocorrect = "off";
      nameInput.autocapitalize = "off";
      nameInput.spellcheck = false;
      nameInput.addEventListener("input", (event) => { settingsDraft.provinces[provinceIndex].name = event.target.value; });
      nameLabel.append(nameInput);
      const removeProvince = document.createElement("button");
      removeProvince.type = "button";
      removeProvince.className = "remove-button";
      removeProvince.textContent = "Remove province";
      removeProvince.addEventListener("click", () => {
        settingsDraft.provinces.splice(provinceIndex, 1);
        renderProvinceSettings();
      });
      header.append(nameLabel, removeProvince);
      container.append(header);

      const localeTitle = document.createElement("h4");
      localeTitle.textContent = "Locales";
      container.append(localeTitle);

      const localesWrap = document.createElement("div");
      province.locales.forEach((locale, localeIndex) => {
        const line = document.createElement("div");
        line.className = "locale-editor";
        const localeInput = document.createElement("input");
        localeInput.type = "text";
        localeInput.value = locale.name;
        localeInput.placeholder = "Locale name";
        localeInput.autocomplete = "off";
        localeInput.autocorrect = "off";
        localeInput.autocapitalize = "off";
        localeInput.spellcheck = false;
        localeInput.addEventListener("input", (event) => { settingsDraft.provinces[provinceIndex].locales[localeIndex].name = event.target.value; });
        const defaultStatus = document.createElement("select");
        defaultStatus.setAttribute("aria-label", `Default status for ${locale.name || "locale"}`);
        STATUS_OPTIONS.forEach((optionDetails) => {
          const option = document.createElement("option");
          option.value = optionDetails.value;
          option.textContent = `Default: ${optionDetails.label}`;
          option.selected = optionDetails.value === locale.defaultStatus;
          defaultStatus.append(option);
        });
        defaultStatus.addEventListener("change", (event) => { settingsDraft.provinces[provinceIndex].locales[localeIndex].defaultStatus = event.target.value; });
        const remove = document.createElement("button");
        remove.type = "button";
        remove.className = "remove-button";
        remove.textContent = "Remove";
        remove.addEventListener("click", () => {
          settingsDraft.provinces[provinceIndex].locales.splice(localeIndex, 1);
          renderProvinceSettings();
        });
        line.append(localeInput, defaultStatus, remove);
        localesWrap.append(line);
      });
      container.append(localesWrap);

      const addLocale = document.createElement("button");
      addLocale.type = "button";
      addLocale.className = "button button-small button-quiet";
      addLocale.style.marginTop = "12px";
      addLocale.textContent = "+ Add locale";
      addLocale.addEventListener("click", () => {
        settingsDraft.provinces[provinceIndex].locales.push({ id: makeId("locale"), name: "", status: "not-connected", defaultStatus: "not-connected" });
        renderProvinceSettings();
      });
      container.append(addLocale);

      els.provinceSettingsList.append(container);
    });
    if (!settingsDraft.provinces.length) {
      els.provinceSettingsList.innerHTML = '<p class="settings-help">No provinces yet. Use “Add province” to create one.</p>';
    }
    syncSettingsSectionStates();
  }

  function populateSettingsForm() {
    cloneSettingsForDraft();
    const form = els.settingsForm.elements;
    ["theme", "monitoringHeading", "zoomFieldLabel", "meetingIdLabel", "passcodeLabel", "provinceLabel", "connectedLabel", "notConnectedLabel", "noGatheringLabel", "individualsLabel", "remarksLabel", "zoomLink", "meetingId", "passcode"].forEach((field) => {
      if (!form[field]) return;
      form[field].value = field === "theme" ? (state.settings.theme || "light") : (state.settings[field] || "");
    });
    renderServiceSettings();
    renderProvinceSettings();
  }

  function openSettings() {
    Object.keys(settingSectionState).forEach((key) => { settingSectionState[key] = false; });
    populateSettingsForm();
    syncSettingsSectionStates();
    els.modal.hidden = false;
    document.body.style.overflow = "hidden";
    setTimeout(() => els.settingsForm.elements.monitoringHeading.focus(), 0);
  }

  function closeSettings() {
    els.modal.hidden = true;
    document.body.style.overflow = "";
    els.openSettings.focus();
  }

  function saveSettings(event) {
    event.preventDefault();
    const form = els.settingsForm.elements;
    const newSettings = clone(settingsDraft);
    ["theme", "monitoringHeading", "zoomFieldLabel", "meetingIdLabel", "passcodeLabel", "provinceLabel", "connectedLabel", "notConnectedLabel", "noGatheringLabel", "individualsLabel", "remarksLabel", "zoomLink", "meetingId", "passcode"].forEach((field) => {
      if (!form[field]) return;
      newSettings[field] = field === "theme" ? form[field].value : cleanText(form[field].value);
    });
    newSettings.services = newSettings.services
      .map((service) => ({ ...service, name: cleanText(service.name) }))
      .filter((service) => service.name);
    if (!newSettings.services.length) {
      showToast("Add at least one named service option.");
      return;
    }
    newSettings.provinces = newSettings.provinces
      .map((province) => ({
        ...province,
        name: cleanText(province.name),
        noLocale: "",
        locales: province.locales
          .map((locale) => ({ ...locale, name: cleanText(locale.name) }))
          .filter((locale) => locale.name)
      }))
      .filter((province) => province.name);

    state.settings = newSettings;
    if (!newSettings.services.some((service) => service.id === state.serviceId)) state.serviceId = newSettings.services[0].id;
    saveState();
    render();
    closeSettings();
    showToast("Settings saved.");
  }

  function resetAttendance() {
    const confirmed = window.confirm("Are you sure you want to reset attendance?");
    if (!confirmed) return;
    state.settings.provinces.forEach((province) => {
      province.locales.forEach((locale) => { locale.status = locale.defaultStatus; });
    });
    state.connectedIndividuals = "";
    state.remarks = "";
    saveState();
    render();
    showToast("Attendance has been reset.");
  }

  async function copyReport() {
    const text = reportText();
    try {
      await navigator.clipboard.writeText(text);
      showToast("Report copied to your clipboard.");
    } catch (_) {
      const textarea = document.createElement("textarea");
      textarea.value = text;
      textarea.style.position = "fixed";
      textarea.style.opacity = "0";
      document.body.append(textarea);
      textarea.select();
      document.execCommand("copy");
      textarea.remove();
      showToast("Report copied to your clipboard.");
    }
  }

  function bindEvents() {
    els.serviceSelect.addEventListener("change", (event) => {
      state.serviceId = event.target.value;
      saveState();
      renderReport();
    });
    els.provinceGrid.addEventListener("change", (event) => {
      const attendanceControl = event.target;
      if (!attendanceControl.matches("input[data-attendance-control]")) return;
      const province = state.settings.provinces.find((item) => item.id === attendanceControl.dataset.provinceId);
      const locale = province && province.locales.find((item) => item.id === attendanceControl.dataset.localeId);
      if (!locale) return;
      if (attendanceControl.dataset.attendanceControl === "no-gathering") {
        locale.status = attendanceControl.checked ? "no-gathering" : "not-connected";
      } else {
        locale.status = attendanceControl.checked ? "connected" : "not-connected";
      }
      saveState();
      renderProvinces();
      updateLocaleSummary();
      renderReport();
    });
    els.liveCheckbox.addEventListener("change", (event) => {
      const checked = event.target.checked;
      state.live = checked;
      if (checked) state.viewing = false;
      els.liveCheckbox.checked = state.live;
      els.viewingCheckbox.checked = state.viewing;
      saveState();
      renderReport();
    });
    els.viewingCheckbox.addEventListener("change", (event) => {
      const checked = event.target.checked;
      state.viewing = checked;
      if (checked) state.live = false;
      els.liveCheckbox.checked = state.live;
      els.viewingCheckbox.checked = state.viewing;
      saveState();
      renderReport();
    });
    els.connectedIndividuals.addEventListener("input", (event) => {
      state.connectedIndividuals = event.target.value;
      saveState();
      renderReport();
    });
    els.remarks.addEventListener("input", (event) => {
      state.remarks = event.target.value;
      saveState();
      renderReport();
    });
    [els.monitoringHour, els.monitoringMinute, els.monitoringPeriod].forEach((select) => select.addEventListener("change", saveTimeFromPicker));
    els.themeToggle.addEventListener("click", () => {
      state.settings.theme = state.settings.theme === "dark" ? "light" : "dark";
      saveState();
      applyTheme();
      if (!els.modal.hidden) populateSettingsForm();
      renderReport();
    });
    els.openSettings.addEventListener("click", openSettings);
    els.closeSettings.addEventListener("click", closeSettings);
    els.cancelSettings.addEventListener("click", closeSettings);
    document.addEventListener("keydown", (event) => { if (event.key === "Escape" && !els.modal.hidden) closeSettings(); });
    els.settingsForm.addEventListener("submit", saveSettings);
    document.addEventListener("click", (event) => {
      const toggle = event.target.closest(".section-edit-toggle");
      if (!toggle) return;
      const sectionKey = toggle.dataset.section;
      if (!sectionKey || !(sectionKey in settingSectionState)) return;
      setSectionEditState(sectionKey, !settingSectionState[sectionKey]);
    });
    els.addService.addEventListener("click", () => {
      if (!settingSectionState.serviceOptions) return;
      settingsDraft.services.push({ id: makeId("service"), name: "" });
      renderServiceSettings();
      els.serviceSettingsList.querySelector("input:last-of-type")?.focus();
    });
    els.addProvince.addEventListener("click", () => {
      if (!settingSectionState.provincesLocales) return;
      settingsDraft.provinces.push({ id: makeId("province"), name: "", locales: [], noLocale: "" });
      renderProvinceSettings();
      els.provinceSettingsList.querySelector(".province-editor:last-child input")?.focus();
    });
    els.restoreDefaults.addEventListener("click", () => {
      settingsDraft = clone(DEFAULT_STATE.settings);
      const form = els.settingsForm.elements;
      ["theme", "monitoringHeading", "zoomFieldLabel", "meetingIdLabel", "passcodeLabel", "provinceLabel", "connectedLabel", "notConnectedLabel", "noGatheringLabel", "individualsLabel", "remarksLabel", "zoomLink", "meetingId", "passcode"].forEach((field) => { if (form[field]) form[field].value = field === "theme" ? (settingsDraft.theme || "light") : (settingsDraft[field] || ""); });
      renderServiceSettings();
      renderProvinceSettings();
      showToast("Default settings are ready to save.");
    });
    els.resetAttendance.addEventListener("click", resetAttendance);
    els.copyReport.addEventListener("click", copyReport);
  }

  bindEvents();
  render();
  setInterval(() => {
    renderClock();
    renderReport();
  }, 1000);
})();
