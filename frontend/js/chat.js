(function () {
  const $ = (id) => document.getElementById(id);

  const chatBox = $("chatBox");
  const input = $("userInput");
  const sendBtn = $("sendBtn");
  const skipBtn = $("skipBtn");
  const backBtn = $("backBtn");
  const restartBtn = $("restartBtn");
  const composerHint = $("composerHint");
  const inputMeta = $("inputMeta");
  const contextExamples = $("contextExamples");
  const statusPill = $("statusPill");
  const summaryDevice = $("summaryDevice");
  const summaryBrand = $("summaryBrand");
  const summaryModel = $("summaryModel");
  const summaryIssue = $("summaryIssue");
  const progressFill = $("progressFill");
  const progressCopy = $("progressCopy");

  let userScrolledUp = false;
  let searchTimerInterval = null;

  const STORAGE_KEY = "sys-chat-state";
  const FALLBACK_CATEGORY_ID = "troubleshooting";
  const MAX_CONTEXT_ENTRIES = 4;
  const CHAT_PATH = window.location.pathname.endsWith("/chat.html") ? "/chat.html" : "/";

  const DEVICE_ALIASES = {
    laptop: ["laptop", "notebook", "ultrabook", "macbook"],
    phone: ["phone", "mobile", "smartphone", "iphone", "android phone"],
    tablet: ["tablet", "ipad", "tab"],
    console: ["console", "gaming console", "playstation", "xbox", "switch", "steam deck", "rog ally", "legion go"],
    desktop: ["desktop", "desktop pc", "tower", "pc", "computer", "imac"],
    monitor: ["monitor", "display", "screen"],
    printer: ["printer", "all in one printer"],
    smartwatch: ["smartwatch", "watch", "wearable", "apple watch", "pixel watch", "galaxy watch"],
    camera: ["camera", "dslr", "mirrorless", "action camera", "webcam"],
    router: ["router", "wifi router", "modem router", "access point", "mesh router"],
    ereader: ["ereader", "e reader", "ebook", "ebook reader", "kindle", "kobo"],
  };

  const CATEGORY_ALIASES = {
    troubleshooting: ["problem", "issue", "broken", "not working", "troubleshoot", "troubleshooting", "fix", "repair", "help"],
    ram: ["ram", "memory", "upgrade memory"],
    ssd: ["ssd", "hdd", "hard drive", "storage drive", "disk replacement"],
    network: ["wifi", "wi fi", "network", "internet", "adapter"],
    battery: ["battery", "battery life", "drain", "swollen battery"],
    drivers: ["driver", "drivers", "download", "support driver"],
    display: ["display", "screen", "flicker", "black screen", "lines"],
    keyboard: ["keyboard", "touchpad", "trackpad", "keys"],
    screen: ["screen", "display", "glass", "touch", "digitizer"],
    charging: ["charging", "charger", "charge", "usb c", "lightning", "charging port", "port"],
    camera: ["camera", "lens", "photo", "video camera"],
    audio: ["audio", "speaker", "sound", "microphone"],
    water: ["water", "liquid", "spill", "wet"],
    os: ["software", "os", "update", "boot loop", "firmware", "system"],
    overheating: ["overheat", "overheating", "hot", "thermal", "fan loud"],
    hdmi: ["hdmi", "no display", "tv", "video output"],
    controller: ["controller", "gamepad", "drift", "pairing"],
    storage: ["storage", "ssd", "hdd", "drive", "space", "capacity"],
    power: ["power", "boot", "no boot", "won't turn on", "wont turn on", "dead", "startup"],
    gpu: ["gpu", "graphics", "video card", "artifact"],
    cooling: ["cooling", "fan", "fans", "heat", "dust"],
    ports: ["port", "ports", "displayport", "usb", "connectivity"],
    calibration: ["color", "calibration", "brightness", "contrast"],
    paper: ["paper jam", "paper", "jam", "roller"],
    ink: ["ink", "toner", "cartridge"],
    connectivity: ["connectivity", "wifi", "usb", "network", "pairing", "sync"],
    quality: ["quality", "streak", "smudge", "print quality"],
    driver: ["driver", "software", "install"],
    software: ["software", "update", "freeze", "crash", "firmware"],
    lens: ["lens", "focus", "zoom", "glass"],
    memory: ["memory", "sd card", "card error", "storage"],
    sensor: ["sensor", "image quality", "spots", "dust"],
    wifi: ["wifi", "wi fi", "signal", "drop", "range"],
    firmware: ["firmware", "update", "flash"],
    configuration: ["configuration", "setup", "admin panel", "port forwarding", "vpn"],
    strap: ["strap", "band", "bracelet", "watch band"],
  };

  const COMMANDS = {
    back: new Set(["back", "go back", "previous", "prev"]),
    restart: new Set(["restart", "reset", "new search", "start over"]),
    skip: new Set(["skip", "pass", "not sure", "unknown"]),
  };

  const fallbackDevices = [
    { id: "laptop", name: "PC Laptop", brands: [{ id: "acer", name: "Acer" }, { id: "asus", name: "Asus" }, { id: "hp", name: "HP" }], categories: [{ id: "troubleshooting", label: "Troubleshooting & Fixes", questions: ["When did the issue start?", "Does it happen every time?", "What have you tried already?"] }] },
    { id: "phone", name: "Phone", brands: [{ id: "apple", name: "Apple iPhone" }, { id: "samsung", name: "Samsung Galaxy" }, { id: "google", name: "Google Pixel" }], categories: [{ id: "troubleshooting", label: "Troubleshooting & Fixes", questions: ["When did the issue start?", "Does it happen every time?", "Have you restarted it?"] }] },
    { id: "tablet", name: "Tablet", brands: [], categories: [{ id: "troubleshooting", label: "Troubleshooting & Fixes", questions: ["What is going wrong?", "When did it start?", "What have you tried so far?"] }] },
    { id: "console", name: "Game Console", brands: [], categories: [{ id: "troubleshooting", label: "Troubleshooting & Fixes", questions: ["What is going wrong?", "When did it start?", "What have you tried so far?"] }] },
    { id: "desktop", name: "Desktop PC", brands: [], categories: [{ id: "troubleshooting", label: "Troubleshooting & Fixes", questions: ["What is going wrong?", "When did it start?", "What have you tried so far?"] }] },
    { id: "monitor", name: "Monitor", brands: [], categories: [{ id: "troubleshooting", label: "Troubleshooting & Fixes", questions: ["What is going wrong?", "When did it start?", "What have you tried so far?"] }] },
    { id: "printer", name: "Printer", brands: [], categories: [{ id: "troubleshooting", label: "Troubleshooting & Fixes", questions: ["What is going wrong?", "When did it start?", "What have you tried so far?"] }] },
    { id: "smartwatch", name: "Smartwatch", brands: [], categories: [{ id: "troubleshooting", label: "Troubleshooting & Fixes", questions: ["What is going wrong?", "When did it start?", "What have you tried so far?"] }] },
    { id: "camera", name: "Camera", brands: [], categories: [{ id: "troubleshooting", label: "Troubleshooting & Fixes", questions: ["What is going wrong?", "When did it start?", "What have you tried so far?"] }] },
    { id: "router", name: "Router", brands: [], categories: [{ id: "troubleshooting", label: "Troubleshooting & Fixes", questions: ["What is going wrong?", "When did it start?", "What have you tried so far?"] }] },
    { id: "ereader", name: "E-Reader", brands: [], categories: [{ id: "troubleshooting", label: "Troubleshooting & Fixes", questions: ["What is going wrong?", "When did it start?", "What have you tried so far?"] }] },
  ];

  const state = {
    devices: [],
    affiliateTag: "shootyourself-20",
    step: "boot",
    busy: false,
    promptKey: "",
    indexes: {
      uniqueBrandAliases: {},
    },
    selection: {
      device: null,
      brand: null,
      model: null,
      category: null,
      problemDescription: "",
    },
    freeformNotes: [],
    diagnosticAnswers: [],
    diagnosticIndex: 0,
    currentQuestions: [],
    lastSearchContext: "",
    sessionId: null,
  };

  function showToast(message, type) {
    type = type || "info";
    var container = document.getElementById("toastContainer");
    if (!container) {
      container = document.createElement("div");
      container.className = "toast-container";
      container.id = "toastContainer";
      document.body.appendChild(container);
    }
    var icons = { success: "check_circle", error: "error", info: "info" };
    var toast = document.createElement("div");
    toast.className = "toast toast-" + type;
    toast.innerHTML =
      '<span class="material-symbols-outlined toast-icon">' + (icons[type] || "info") + '</span>' +
      '<span class="toast-msg">' + escapeHtml(message) + '</span>' +
      '<button class="toast-close" aria-label="Dismiss">&times;</button>';
    container.appendChild(toast);
    var closeBtn = toast.querySelector(".toast-close");
    closeBtn.addEventListener("click", function () { dismissToast(toast); });
    setTimeout(function () { dismissToast(toast); }, 4000);
  }

  function dismissToast(toast) {
    if (toast.classList.contains("removing")) return;
    toast.classList.add("removing");
    setTimeout(function () { if (toast.parentNode) toast.parentNode.removeChild(toast); }, 260);
  }

  function showSearchSkeletons() {
    var grid = document.getElementById("resultsGrid");
    if (!grid) return;
    if (document.getElementById("searchSkeletons")) return;
    var wrapper = document.createElement("div");
    wrapper.id = "searchSkeletons";
    wrapper.className = "stack";
    for (var i = 0; i < 4; i++) {
      var card = document.createElement("div");
      card.className = "card";
      card.style.padding = "20px";
      card.innerHTML = '<div class="skeleton skeleton--text short" style="width:40%;height:12px;margin-bottom:12px"></div>' +
        '<div class="skeleton skeleton--text" style="height:14px;margin-bottom:8px"></div>' +
        '<div class="skeleton skeleton--text" style="height:14px;margin-bottom:8px;width:85%"></div>' +
        '<div class="skeleton skeleton--text tiny" style="width:30%;height:10px;margin-top:10px"></div>';
      wrapper.appendChild(card);
    }
    grid.innerHTML = "";
    grid.appendChild(wrapper);
    var panel = document.getElementById("resultsPanel");
    if (panel) panel.style.opacity = "1";
  }

  function hideSearchSkeletons() {
    var skeletons = document.getElementById("searchSkeletons");
    if (skeletons) skeletons.remove();
  }

  function init() {
    bindEvents();
    chatBox.addEventListener("scroll", onChatScroll);
    input.addEventListener("input", autoResizeInput);

    // Remove skeleton loading
    var loadingEl = document.getElementById("chatLoading");
    if (loadingEl) loadingEl.remove();

    var scrollBtn = document.createElement("button");
    scrollBtn.id = "scrollBottomBtn";
    scrollBtn.type = "button";
    scrollBtn.className = "scroll-bottom-btn";
    scrollBtn.hidden = true;
    scrollBtn.innerHTML = "&darr;";
    scrollBtn.setAttribute("aria-label", "Scroll to bottom");
    scrollBtn.addEventListener("click", scrollToBottom);
    chatBox.parentNode.appendChild(scrollBtn);

    startConversation();
    loadConfigAndDevices();
  }

  function bindEvents() {
    document.getElementById("composer").addEventListener("submit", function (event) {
      event.preventDefault();
      handleSubmit();
    });

    backBtn.addEventListener("click", goBack);
    skipBtn.addEventListener("click", function () {
      if (state.busy) return;
      if (state.step === "model") {
        chooseModel("");
        return;
      }
    });
    restartBtn.addEventListener("click", function () {
      if (state.busy) return;
      resetConversation();
    });

    chatBox.addEventListener("click", handleChatClick);

    const resultsPanel = document.getElementById("resultsPanel");
    if (resultsPanel) {
      resultsPanel.addEventListener("click", function (event) {
        const voteButton = event.target.closest("[data-upvote-link]");
        if (voteButton && !voteButton.disabled && !voteButton.classList.contains("is-voted")) {
          handleUpvote(voteButton);
        }
      });
    }

    chatBox.addEventListener("keydown", function (event) {
      if (event.key === "Enter" || event.key === " ") {
        const choiceButton = event.target.closest("[data-choice-kind]");
        if (choiceButton && !choiceButton.disabled && !state.busy) {
          event.preventDefault();
          handleChoice(choiceButton.dataset.choiceKind, choiceButton.dataset.choiceValue);
        }
      }
    });

    contextExamples.addEventListener("click", function (event) {
      const chip = event.target.closest("[data-prompt-value]");
      if (!chip || chip.disabled || state.busy) return;
      const value = chip.dataset.promptValue || "";
      if (chip.dataset.promptMode === "submit") {
        handleSubmit(value);
        return;
      }
      input.value = value;
      autoResizeInput();
      input.focus();
    });

    input.addEventListener("keydown", function (event) {
      if (event.key === "Enter" && !event.shiftKey) {
        event.preventDefault();
        document.getElementById("composer").requestSubmit();
      }
    });
  }

  async function loadConfigAndDevices() {
    setBusy(true);
    setComposer({
      disabled: true,
      placeholder: "Loading the repair flow...",
      hint: "Pulling the latest device map from the backend.",
      meta: "One moment while the chat prepares the guided flow.",
      sendLabel: "Loading",
      showSkip: false,
      showBack: false,
      quickPrompts: [],
    });

    try {
      const responses = await Promise.all([
        API.config.get(),
        API.devices.get(),
      ]);

      state.affiliateTag = responses[0].affiliateTag || state.affiliateTag;

      state.devices = (responses[1].devices || []).map(normalizeDevice);
    } catch (error) {
      state.devices = fallbackDevices.map(normalizeDevice);
      addSystem("The live device map did not load, so the chat is using a local fallback.");
    }

    state.indexes.uniqueBrandAliases = buildUniqueBrandAliasIndex(state.devices);
    hydrateSelectionFromUrl();
    setBusy(false);

    if (tryRestoreState()) return;
    routeNextStep(true);
  }

  function normalizeDevice(device) {
    const normalizedDevice = {
      id: device.id,
      name: device.name,
      aliases: buildDeviceAliases(device),
      brands: [],
      categories: [],
    };

    normalizedDevice.brands = (device.brands || []).map(function (brand) {
      return {
        id: brand.id,
        name: brand.name,
        aliases: buildBrandAliases(device.id, brand),
      };
    });

    normalizedDevice.categories = (device.categories || []).map(function (category) {
      return {
        id: category.id,
        label: category.label,
        questions: Array.isArray(category.questions) ? category.questions : [],
        aliases: buildCategoryAliases(category),
      };
    });

    return normalizedDevice;
  }

  function buildDeviceAliases(device) {
    return createAliases([device.name, device.id].concat(DEVICE_ALIASES[device.id] || []));
  }

  function buildBrandAliases(deviceId, brand) {
    const aliases = [brand.name, brand.id];
    const normalizedName = normalizeText(brand.name);
    const pieces = normalizedName.split(" ").filter(Boolean);
    if (pieces.length > 1) {
      aliases.push(pieces.slice(-1).join(" "));
      aliases.push(pieces.slice(0, 2).join(" "));
    }
    if (deviceId === "phone" && normalizedName.indexOf("iphone") !== -1) aliases.push("iphone");
    if (deviceId === "tablet" && normalizedName.indexOf("ipad") !== -1) aliases.push("ipad");
    if (deviceId === "console" && normalizedName.indexOf("playstation") !== -1) aliases.push("playstation", "ps5", "ps4");
    if (deviceId === "console" && normalizedName.indexOf("xbox") !== -1) aliases.push("xbox");
    if (deviceId === "console" && normalizedName.indexOf("switch") !== -1) aliases.push("switch");
    if (deviceId === "smartwatch" && normalizedName.indexOf("apple watch") !== -1) aliases.push("apple watch");
    if (deviceId === "router" && normalizedName.indexOf("nest wifi") !== -1) aliases.push("nest wifi");
    return createAliases(aliases);
  }

  function buildCategoryAliases(category) {
    return createAliases([category.label, category.id].concat(CATEGORY_ALIASES[category.id] || []));
  }

  function createAliases(values) {
    const seen = {};
    return (values || [])
      .map(normalizeText)
      .filter(function (value) {
        if (!value || seen[value]) return false;
        seen[value] = true;
        return true;
      });
  }

  function buildUniqueBrandAliasIndex(devices) {
    const index = {};
    const collisions = {};
    devices.forEach(function (device) {
      (device.brands || []).forEach(function (brand) {
        (brand.aliases || []).forEach(function (alias) {
          if (!alias || alias.length < 3) return;
          if (!index[alias] && !collisions[alias]) {
            index[alias] = { deviceId: device.id, brandId: brand.id };
            return;
          }
          if (index[alias] && (index[alias].deviceId !== device.id || index[alias].brandId !== brand.id)) {
            delete index[alias];
            collisions[alias] = true;
          }
        });
      });
    });
    return index;
  }

  function hydrateSelectionFromUrl() {
    const params = new URLSearchParams(window.location.search);
    const device = getDeviceById(params.get("device"));
    if (!device) return;

    state.selection.device = device;
    const brandId = params.get("brand");
    if (!brandId) return;

    const brand = getBrandById(device, brandId);
    if (brand) {
      state.selection.brand = brand;
    }
  }

  function startConversation() {
    chatBox.innerHTML = "";
    addAssistant(
      "<p><strong>Tell me what device you are working with.</strong></p><p>Pick a device type from the choices, or type a full sentence like <strong>Dell XPS 13 battery not charging after an update</strong>.</p><p>The chat will narrow down the results by model and problem description.</p>",
      true
    );
    syncSummary();
  }

  function resetConversation() {
    localStorage.removeItem(STORAGE_KEY);
    deactivateChoiceGroups();
    clearSearchTimer();
    hideResultsPanel();
    state.step = "boot";
    state.promptKey = "";
    state.busy = false;
    state.selection = { device: null, brand: null, model: null, category: null, problemDescription: "" };
    state.freeformNotes = [];
    state.currentQuestions = [];
    state.lastSearchContext = "";
    state.sessionId = null;
    history.replaceState({}, "", CHAT_PATH);
    startConversation();
    routeNextStep(true);
  }

  function routeNextStep(skipIntroPrompt) {
    syncSummary();
    syncUrl();

    if (state.busy) return;

    if (!state.selection.device) {
      promptDevices(skipIntroPrompt);
      saveState();
      return;
    }

    if (state.selection.model === null) {
      promptModel();
      saveState();
      return;
    }

    if (!state.selection.problemDescription) {
      promptProblem();
      saveState();
      return;
    }

    saveState();
    runSearch();
  }

  function promptDevices(skipIntroPrompt) {
    const key = "device";
    if (state.promptKey === key) return;
    state.step = "device";
    state.promptKey = key;
    deactivateChoiceGroups();

    if (!skipIntroPrompt) {
      addAssistant("<p>Pick the device type first, or type a natural sentence and the chat will try to infer it for you.</p>", true);
    }

    addAssistant(buildChoicePrompt(state.devices, "device", {
      title: "What are you trying to fix?",
      description: "You can click a device card or type something like \"iPhone screen cracked\" or \"Dell laptop battery issue\".",
      subtitleKey: "name",
    }), true);

    setComposer({
      disabled: false,
      placeholder: "Type a device or a full issue sentence",
      hint: "Examples: phone, laptop, PS5 overheating, Kindle frozen.",
      meta: "Enter sends. Shift+Enter adds a new line. Commands: back, skip, restart.",
      sendLabel: "Continue",
      showSkip: false,
      showBack: false,
      quickPrompts: buildPromptChoices([
        "Phone not charging",
        "Dell laptop battery issue",
        "PS5 overheating",
        "Printer paper jam",
      ], "submit"),
    });
    updateStatus("Choosing device");
    focusFirstChoice();
  }

  function promptModel() {
    const key = "model";
    if (state.promptKey === key) return;
    state.step = "model";
    state.promptKey = key;
    deactivateChoiceGroups();

    const device = state.selection.device;
    let examples = "Aspire 5 A515-56, XPS 13 9310, MacBook Pro 14";
    if (device) {
      if (device.id === "phone") examples = "iPhone 14 Pro, Galaxy S24, Pixel 8";
      else if (device.id === "tablet") examples = "iPad Air M2, Galaxy Tab S9, Fire HD 10";
      else if (device.id === "console") examples = "PS5, Xbox Series X, Switch OLED";
      else if (device.id === "printer") examples = "HP Envy 6055e, Canon PIXMA TS9520, Epson EcoTank ET-2850";
      else if (device.id === "monitor") examples = "Dell S2722QC, LG 27GP850, ASUS VG27AQ";
      else if (device.id === "camera") examples = "Canon EOS R5, Sony A7 IV, Nikon Z6 III";
      else if (device.id === "router") examples = "TP-Link Archer AX73, Netgear Nighthawk RAX50";
      else if (device.id === "smartwatch") examples = "Apple Watch Series 9, Galaxy Watch 6, Garmin Fenix 7";
    }

    addAssistant(
      "<p><strong>What is the model number or product name?</strong></p><p>If you know the exact model, enter it now. You can also <strong>skip</strong> this step and describe the problem instead. A model number helps narrow results, but a good problem description works too.</p><p>Examples: <strong>" + escapeHtml(examples) + "</strong>.</p>",
      true
    );

    setComposer({
      disabled: false,
      placeholder: "Enter model number or skip",
      hint: "Model is optional. Skip to describe the problem directly.",
      meta: "Skip if you don't know the model. You can describe the problem next.",
      sendLabel: "Continue",
      showSkip: true,
      showBack: true,
      quickPrompts: buildPromptChoices(examples.split(", ").slice(0, 3), "fill"),
    });
    updateStatus("Waiting for model");
  }

  function promptProblem() {
    const key = "problem";
    if (state.promptKey === key) return;
    state.step = "problem";
    state.promptKey = key;
    deactivateChoiceGroups();

    const device = state.selection.device;
    const deviceName = device ? device.name.toLowerCase() : "device";

    addAssistant(
      "<p><strong>Describe the problem in your own words.</strong></p><p>Tell the chat what is going wrong with your " + escapeHtml(deviceName) + ". Include symptoms, what you have tried, and anything relevant. The more detail you give, the better the search results will be.</p><p>Example: <strong>\"The battery drains really fast and it gets hot on the left side. I already tried calibrating the battery.\"</strong></p>",
      true
    );

    setComposer({
      disabled: false,
      placeholder: "Describe what is happening with your " + escapeHtml(deviceName) + "...",
      hint: "Be specific about symptoms and what you have already tried.",
      meta: "This description powers the search. Include model, brand, or issue if you did not enter them earlier.",
      sendLabel: "Search",
      showSkip: false,
      showBack: true,
      quickPrompts: buildPromptChoices([
        "Not turning on at all",
        "Battery drains quickly",
        "Screen flickers or has lines",
        "Buttons are unresponsive",
        "Overheating during normal use",
      ], "submit"),
    });
    updateStatus("Describing the problem");
  }

  async function runSearch() {
    if (state.busy || state.step === "searching") return;
    state.step = "searching";
    state.promptKey = "searching";
    deactivateChoiceGroups();
    setBusy(true);

    // Infer brand and category from the problem description if not already set
    if (state.selection.problemDescription) {
      const normalized = normalizeText(state.selection.problemDescription);
      if (!state.selection.brand) {
        const inferredBrand = inferBrandFromText(normalized, state.selection.device);
        if (inferredBrand) state.selection.brand = inferredBrand;
      }
      if (!state.selection.category) {
        const inferredCategory = inferCategoryFromText(state.selection.problemDescription, state.selection.device);
        if (inferredCategory) state.selection.category = inferredCategory;
      }
    }

    // Fallback to troubleshooting if no category could be inferred
    if (!state.selection.category) {
      const device = state.selection.device;
      if (device && device.categories && device.categories.length) {
        const fallback = device.categories.find(function (cat) { return cat.id === FALLBACK_CATEGORY_ID; }) || device.categories[0];
        state.selection.category = fallback;
      }
    }

    const searchContext = buildSearchContext();
    state.lastSearchContext = searchContext;

    updateStatus("Searching repair links");
    setComposer({
      disabled: true,
      placeholder: "Searching for repair links...",
      hint: "The chat is collecting results from the backend now.",
      meta: searchContext ? "Using your device and problem description to find relevant results." : "Searching with the device details you provided.",
      sendLabel: "Searching",
      showSkip: false,
      showBack: false,
      quickPrompts: [],
    });

    showSearchSkeletons();
    const typingNode = addTyping();
    const searchStart = Date.now();
    let searchElapsed = 0;
    updateStatus("Searching... 0s");
    clearSearchTimer();
    searchTimerInterval = setInterval(function () {
      searchElapsed = Math.round((Date.now() - searchStart) / 1000);
      updateStatus("Searching... " + searchElapsed + "s");
    }, 1000);

    try {
      const brandQuery = state.selection.brand && state.selection.brand.id !== "generic"
        ? state.selection.brand.name
        : "";
      const [payload, findingsData] = await Promise.all([
        API.search.run(
          state.selection.device.id,
          brandQuery,
          state.selection.model || "",
          state.selection.category ? state.selection.category.id : FALLBACK_CATEGORY_ID,
          searchContext
        ),
        API.diagnostic.correlate(
          state.selection.device.id,
          brandQuery,
          state.selection.model || "",
          [state.selection.problemDescription || "", state.selection.category ? state.selection.category.label : ""].filter(Boolean)
        ).catch(function () { return null; }),
      ]);
      typingNode.remove();
      hideSearchSkeletons();

      if (payload.note) {
        addSystem(payload.note);
      }

      if (payload.ms) {
        searchElapsed = Math.round(payload.ms / 1000);
      }

      renderResults(payload.results || [], searchElapsed, searchContext, findingsData);

      if (state.sessionId) {
        API.sessions.addStep(state.sessionId, 'search', { results: (payload.results || []).length, elapsed: searchElapsed }).catch(function () {});
      }
    } catch (error) {
      typingNode.remove();
      hideSearchSkeletons();
      addSystem("Search failed after " + searchElapsed + "s. " + (error.message || "The backend is temporarily unavailable."));
      // Add retry button and fallback link
      var retryArticle = document.createElement("article");
      retryArticle.className = "chat-message assistant";
      retryArticle.innerHTML = '<div class="flex gap-4 items-start">' +
        '<div class="assistant-avatar"><span class="material-symbols-outlined text-[18px]">memory</span></div>' +
        '<div class="glass-surface border-l-4 border-forest-deep p-4 rounded-r-lg msg-bubble">' +
        '<p><strong>Try again or use direct search:</strong></p>' +
        '<div style="display:flex;gap:8px;margin-top:8px;flex-wrap:wrap;">' +
        '<button type="button" class="prompt-chip" id="retrySearchBtn">Retry Search</button>' +
        '<a class="prompt-chip" target="_blank" rel="noopener" href="https://www.google.com/search?q=' + encodeURIComponent(state.selection.problemDescription || state.selection.device.name) + '">Search Google</a>' +
        '<a class="prompt-chip" target="_blank" rel="noopener" href="https://www.youtube.com/results?search_query=' + encodeURIComponent((state.selection.brand ? state.selection.brand.name + ' ' : '') + (state.selection.model || '') + ' ' + (state.selection.category ? state.selection.category.label : '') + ' repair') + '">Search YouTube</a>' +
        '<a class="prompt-chip" target="_blank" rel="noopener" href="https://www.reddit.com/search/?q=' + encodeURIComponent(state.selection.problemDescription || state.selection.device.name) + '">Search Reddit</a>' +
        '</div></div></div>';
      chatBox.appendChild(retryArticle);
      scrollTranscript();
      document.getElementById("retrySearchBtn").addEventListener("click", function () {
        retryArticle.remove();
        runSearch();
      });
      state.step = "results";
      setComposer({
        disabled: true,
        placeholder: "Use New search to start again",
        hint: "The backend search failed on this attempt.",
        meta: "The conversation state is still here if you want to retry.",
        sendLabel: "Done",
        showSkip: false,
        showBack: false,
        quickPrompts: [],
      });
    } finally {
      clearSearchTimer();
      setBusy(false);
      syncSummary();
      saveState();
    }
  }

  function renderResults(results, elapsed, searchContext, findingsData) {
    state.step = "results";
    state.promptKey = "results";
    elapsed = elapsed || 0;

    renderFindings(findingsData || null);

    const searchLabel = buildSearchLabel();
    const displayLabel = searchLabel || (state.selection.problemDescription ? state.selection.problemDescription.slice(0, 80) + "..." : "your search");

    // Populate results panel
    const resultsPanel = document.getElementById("resultsPanel");
    const resultsGrid = document.getElementById("resultsGrid");
    const resultsSources = document.getElementById("resultsSources");
    const resultsAffiliate = document.getElementById("resultsAffiliate");
    const resultsTitle = document.getElementById("resultsTitle");
    const resultCountEl = document.getElementById("resultCount");
    const extractedSection = document.getElementById("extractedSolutions");

    if (resultsPanel && resultsGrid) {
      resultsPanel.hidden = false;
      resultsTitle.textContent = "Results for " + displayLabel;

      if (!results.length) {
        resultsGrid.innerHTML = "<div class=\"results-empty\"><p>No results found. Try describing the problem differently or starting a new search with broader terms.</p></div>";
        resultsSources.innerHTML = "";
        resultsAffiliate.innerHTML = "";
        resultCountEl.textContent = "0 results";
        if (extractedSection) extractedSection.innerHTML = "";
      } else {
        const solutionResults = results.filter(function (result) {
          return !result.isSearchShortcut;
        });
        const sourceLinks = results.filter(function (result) {
          return !!result.isSearchShortcut;
        });
        const displayResults = (solutionResults.length ? solutionResults : results).slice(0, 12);

        resultsGrid.innerHTML = "";

        var grouped = { video: [], guide: [], download: [], affiliate: [], link: [] };
        displayResults.forEach(function (r) {
          var t = r.type || "link";
          if (grouped[t]) grouped[t].push(r);
          else grouped.link.push(r);
        });

        var groupOrder = ["guide", "video", "download", "affiliate", "link"];
        var groupLabels = { guide: "Repair Guides", video: "Video Tutorials", download: "Downloads & Drivers", affiliate: "Parts & Tools", link: "Other References" };
        var groupIcons = { guide: "menu_book", video: "play_circle", download: "download", affiliate: "shopping_cart", link: "link" };

        groupOrder.forEach(function (g) {
          var items = grouped[g];
          if (!items || !items.length) return;
          var header = document.createElement("div");
          header.className = "result-group-header";
          header.innerHTML = '<div class="flex items-center gap-2 py-2 mt-1" style="border-bottom:1px solid var(--color-border)">' +
            '<span class="material-symbols-outlined" style="font-size:16px;color:var(--color-text-secondary);opacity:0.6">' + groupIcons[g] + '</span>' +
            '<span class="mono-label" style="font-size:10px;text-transform:uppercase;letter-spacing:0.08em;color:var(--color-text-secondary);opacity:0.6">' + groupLabels[g] + ' (' + items.length + ')</span>' +
            '</div>';
          resultsGrid.appendChild(header);
          items.forEach(function (result) {
            var temp = document.createElement("div");
            temp.innerHTML = buildResultCard(result);
            resultsGrid.appendChild(temp.firstElementChild);
          });
        });

        resultsSources.innerHTML = "";
        if (sourceLinks.length) {
          const wrapper = document.createElement("div");
          wrapper.className = "source-links";
          sourceLinks.slice(0, 5).forEach(function (result) {
            const link = document.createElement("a");
            link.className = "link-chip";
            link.target = "_blank";
            link.rel = "noopener";
            link.href = result.link;
            link.textContent = "Search " + result.source;
            wrapper.appendChild(link);
          });
          resultsSources.appendChild(wrapper);
        }

        resultsAffiliate.innerHTML = "";
        const affiliateResults = displayResults.filter(function (result) { return result.type === "affiliate"; });
        if (!affiliateResults.length) {
          const amazonLink = document.createElement("a");
          amazonLink.className = "link-chip";
          amazonLink.target = "_blank";
          amazonLink.rel = "sponsored noopener";
          amazonLink.href = "https://www.amazon.com/s?k=" + encodeURIComponent(displayLabel + " replacement parts") + "&tag=" + encodeURIComponent(state.affiliateTag);
          amazonLink.textContent = "Replacement parts on Amazon";
          resultsAffiliate.appendChild(amazonLink);
        }

        resultCountEl.textContent = displayResults.length + " solutions shown in " + elapsed + "s";

        // Extract and render solutions from top results
        const topForExtraction = solutionResults.filter(function (r) { return r.type !== "affiliate"; }).slice(0, 3);
        renderExtractedSolutions(topForExtraction, extractedSection);
      }
    }

    // Also add a summary message to the chat
    if (!results.length) {
      addAssistant(
        "<p>No results for <strong>" + escapeHtml(displayLabel) + "</strong>.</p><p>Try describing the problem differently or starting a new search with broader terms.</p>",
        true
      );
    } else {
      addAssistant(
        "<p><strong>" + results.length + " results for " + escapeHtml(displayLabel) + "</strong></p><p>Scroll down to see the full results with thumbnails and details.</p>",
        true
      );
    }

    setComposer({
      disabled: true,
      placeholder: "Use New search to troubleshoot another device",
      hint: "Results are ready in the panel below. Helpful votes still work on each result.",
      meta: "Search finished in " + elapsed + "s.",
      sendLabel: "Done",
      showSkip: false,
      showBack: false,
      quickPrompts: [],
    });
    updateStatus(results.length + " results in " + elapsed + "s");
  }

  async function renderExtractedSolutions(results, container) {
    if (!container || !results.length) return;

    const loadingHtml = "<div class=\"extracted-loading\"><span></span><span></span><span></span> Extracting solutions from top sources...</div>";
    container.innerHTML = "<div class=\"extracted-section\">" +
      "<div class=\"extracted-head\"><span class=\"extracted-label\">Extracted Solutions</span></div>" +
      loadingHtml +
      "</div>";

    const extracted = [];
    for (const result of results) {
      try {
        const data = await API.search.extractContent(result.link);
        if (data && data.text && data.text.length > 50) {
          extracted.push({ ...result, extractedText: data.text, extractedTitle: data.title || result.title });
        }
      } catch (e) {
        // skip failed extractions
      }
    }

    if (!extracted.length) {
      container.innerHTML = "";
      return;
    }

    let html = "<div class=\"extracted-section\">" +
      "<div class=\"extracted-head\"><span class=\"extracted-label\">Extracted Solutions</span></div>" +
      "<p class=\"extracted-sub\">Fix content pulled from the top results</p>";

    extracted.forEach(function (item) {
      const maxText = 800;
      let displayText = item.extractedText.slice(0, maxText);
      if (item.extractedText.length > maxText) displayText += "...";
      const paragraphs = displayText.split(/\n+/).filter(Boolean).map(function (p) {
        return "<p>" + escapeHtml(p.trim()) + "</p>";
      }).join("");

      html += "<div class=\"extracted-card\" data-kind=\"" + escapeAttr(item.type || "link") + "\">" +
        "<div class=\"extracted-card-head\">" +
        "<span class=\"extracted-badge\">" + escapeHtml(item.type || "Solution") + "</span>" +
        "<span class=\"extracted-source\">" + escapeHtml(item.source || "web") + "</span>" +
        "</div>" +
        "<h4 class=\"extracted-title\">" + escapeHtml(item.extractedTitle) + "</h4>" +
        "<div class=\"extracted-text\">" + paragraphs + "</div>" +
        "<div class=\"extracted-actions\">" +
        "<a class=\"link-chip\" target=\"_blank\" rel=\"noopener\" href=\"" + escapeAttr(item.link) + "\">View original source \u2197</a>" +
        "<button type=\"button\" class=\"vote-btn\" data-upvote-link=\"" + escapeAttr(item.link) + "\">Helpful</button>" +
        "</div>" +
        "</div>";
    });

    html += "</div>";
    container.innerHTML = html;

    appendExtractedChatMessage(extracted);
  }

  function appendExtractedChatMessage(extracted) {
    if (!extracted || !extracted.length) return;

    var node = document.createElement("article");
    node.className = "chat-message assistant";
    var html = '<div class="flex gap-4 items-start">' +
      '<div class="assistant-avatar"><span class="material-symbols-outlined text-[18px]">memory</span></div>' +
      '<div class="glass-surface border-l-4 border-forest-deep p-4 rounded-r-lg msg-bubble" style="max-width:100%">' +
      '<p><strong>Extracted Solutions</strong></p>';

    extracted.slice(0, 3).forEach(function (item) {
      var summary = item.extractedText.slice(0, 200);
      if (item.extractedText.length > 200) summary += "...";
      html += '<div class="extracted-chat-card">' +
        '<div class="extracted-card-head">' +
        '<span class="extracted-badge">' + escapeHtml(item.type || "Solution") + '</span>' +
        '<span class="extracted-source">' + escapeHtml(item.source || "web") + '</span>' +
        '</div>' +
        '<h4 class="extracted-title">' + escapeHtml(item.extractedTitle) + '</h4>' +
        '<div class="extracted-text">' + escapeHtml(summary) + '</div>' +
        '<div class="extracted-actions">' +
        '<a class="link-chip" target="_blank" rel="noopener" href="' + escapeAttr(item.link) + '">View full source \u2197</a>' +
        '<button type="button" class="vote-btn" data-upvote-link="' + escapeAttr(item.link) + '">Helpful</button>' +
        '</div>' +
        '</div>';
    });

    html += '<span class="message-time">' + getTimestamp() + '</span></div></div>';
    node.innerHTML = html;
    chatBox.appendChild(node);
    scrollTranscript();
  }

  function renderFindings(findingsData) {
    var panel = document.getElementById("findingsPanel");
    if (!panel) return;

    if (!findingsData || !findingsData.findings || !findingsData.findings.length) {
      if (panel) panel.style.display = "none";
      return;
    }

    panel.style.display = "block";
    var f = findingsData;

    var confPct = Math.round((f.overallConfidence || 0) * 100);
    document.getElementById("findingsConfidence").textContent = confPct + "% confidence";
    document.getElementById("findingsSummary").textContent = f.summary ? f.summary.text : "";

    var list = document.getElementById("findingsList");
    list.innerHTML = "";
    f.findings.slice(0, 8).forEach(function (finding) {
      var borderColors = { critical: "#dc2626", warning: "#ea580c", medium: "#ca8a04", info: "#3b82f6" };
      var borderColor = borderColors[finding.severity] || "var(--color-border)";
      var icons = { critical: "dangerous", warning: "warning", medium: "info", info: "info" };
      var icon = icons[finding.severity] || "info";
      var barColor = finding.confidence >= 0.7 ? "var(--color-success)" : finding.confidence >= 0.4 ? "var(--color-accent)" : "var(--color-text-secondary)";
      var pct = Math.round(finding.confidence * 100);

      var card = document.createElement("div");
      card.style.cssText = "display:flex;gap:8px;padding:8px;border-radius:8px;border-left:2px solid " + borderColor + ";background:var(--color-bg-subtle)";
      card.innerHTML =
        '<span class="material-symbols-outlined" style="font-size:18px;margin-top:2px;flex-shrink:0;color:var(--color-text-secondary)">' + icon + '</span>' +
        '<div style="flex-grow;min-width:0">' +
        '<div style="display:flex;align-items:center;gap:8px">' +
        '<span class="mono-label" style="font-size:9px;text-transform:uppercase;letter-spacing:0.05em;color:var(--color-text-secondary);opacity:0.6">' + escapeHtml(finding.source || "") + '</span>' +
        (finding.correlated ? '<span class="mono-label" style="font-size:8px;color:#ea580c;text-transform:uppercase">cross-referenced</span>' : "") +
        (finding.escalated ? '<span class="mono-label" style="font-size:8px;color:#dc2626;text-transform:uppercase">escalated</span>' : "") +
        '</div>' +
        '<p style="font-size:13px;font-weight:500;color:var(--color-text);margin:2px 0">' + escapeHtml(finding.message) + '</p>' +
        '<div style="display:flex;align-items:center;gap:6px;margin-top:4px">' +
        '<div style="flex-grow;max-width:100px;height:6px;border-radius:3px;background:var(--color-border)"><div style="height:100%;border-radius:3px;background:' + barColor + ';width:' + pct + '%"></div></div>' +
        '<span class="mono-label" style="font-size:9px;color:var(--color-text-secondary)">' + pct + '%</span>' +
        '</div>' +
        '</div>';
      list.appendChild(card);
    });

    var actions = document.getElementById("findingsActions");
    actions.innerHTML = "";
    if (f.recommendedActions && f.recommendedActions.length) {
      var title = document.createElement("p");
      title.className = "mono-label";
      title.style.cssText = "font-size:10px;text-transform:uppercase;letter-spacing:0.08em;color:var(--color-text-secondary);margin-bottom:6px";
      title.textContent = "Recommended Actions";
      actions.appendChild(title);

      var actionList = document.createElement("div");
      actionList.style.cssText = "display:flex;flex-direction:column;gap:4px";
      f.recommendedActions.forEach(function (a) {
        var catColors = {
          critical: "#dc2626",
          fix: "#16a34a",
          maintenance: "#2563eb",
          preventive: "#ea580c",
          diagnostic: "#7c3aed",
          recommendation: "#0d9488",
        };
        var catColor = catColors[a.category] || "var(--color-text-secondary)";
        var chip = document.createElement("div");
        chip.className = "mono-label";
        chip.style.cssText = "font-size:11px;padding:6px 8px;border-radius:6px;border:1px solid;background:rgba(255,255,255,0.5);color:" + catColor + ";border-color:" + catColor + "20";
        chip.textContent = a.action;
        actionList.appendChild(chip);
      });
      actions.appendChild(actionList);
    }
  }

  function handleSubmit(rawValue) {
    if (state.busy) return;
    const value = String(typeof rawValue === "string" ? rawValue : input.value).trim();

    if (!value && state.step !== "model" && state.step !== "problem") {
      addSystem("Type a reply or choose one of the suggestions below the input.");
      return;
    }

    if (handleTypedCommand(value)) return;

    if (state.step === "device") {
      if (trySmartCapture(value)) return;
      handleChoiceText({
        rawValue: value,
        items: state.devices,
        fields: ["name", "id"],
        kind: "device",
        onChoose: function (match) { chooseDevice(match.id); },
        promptTitle: "Closest device matches",
        emptyMessage: "Could not match that to a device. Try a type like phone, laptop, printer, router, or describe the issue in a fuller sentence.",
      });
      return;
    }

    if (state.step === "model") {
      if (value && trySmartCapture(value)) return;
      const cleanedModel = value ? cleanModelInput(value) : "";
      chooseModel(cleanedModel);
      return;
    }

    if (state.step === "problem") {
      if (!value) {
        addSystem("Please describe the problem so the chat can find relevant repair results.");
        return;
      }
      chooseProblem(value);
      return;
    }
  }

  function handleChoiceText(options) {
    const match = findBestChoice(options.items, options.rawValue, options.fields);
    if (match.item) {
      options.onChoose(match.item);
      return;
    }

    if (match.matches.length > 1) {
      deactivateChoiceGroups();
      addSystem("I found a few close matches. Pick the best one.");
      addAssistant(buildChoicePrompt(match.matches.slice(0, 6), options.kind, {
        title: options.promptTitle,
        description: "These are the closest matches to what you typed.",
        subtitleKey: options.kind === "category" ? "label" : "name",
        compact: options.kind === "brand",
      }), true);
      return;
    }

    addSystem(options.emptyMessage);
  }

  function handleTypedCommand(value) {
    const normalized = normalizeText(value);
    if (!normalized) return false;
    if (COMMANDS.restart.has(normalized)) {
      resetConversation();
      return true;
    }
    if (COMMANDS.back.has(normalized)) {
      goBack();
      return true;
    }
    if (state.step === "model" && COMMANDS.skip.has(normalized)) {
      chooseModel("");
      return true;
    }
    return false;
  }

  function trySmartCapture(rawValue) {
    if (state.step === "diagnostic" || state.step === "results" || state.step === "searching") return false;
    if (!rawValue || rawValue.length < 6) return false;

    const inference = inferSelectionsFromMessage(rawValue);
    if (!inference || inference.captureCount < 2) return false;

    const applied = [];
    const modelBefore = state.selection.model;
    const deviceBefore = state.selection.device;

    deactivateChoiceGroups();
    addUser(rawValue);

    if (!state.selection.device && inference.device) {
      state.selection.device = inference.device;
      applied.push("device: " + inference.device.name);
    }

    if (!state.selection.brand && inference.brand) {
      state.selection.brand = inference.brand;
      applied.push("brand: " + inference.brand.name);
    }

    if (!state.selection.model && inference.model) {
      state.selection.model = inference.model;
      applied.push("model: " + inference.model);
    }

    if (!state.selection.category && inference.category) {
      state.selection.category = inference.category;
      state.currentQuestions = Array.isArray(inference.category.questions) && inference.category.questions.length
        ? inference.category.questions
        : ["Can you describe the issue in detail?", "When did it start?", "What have you already tried?"];
      applied.push("issue: " + inference.category.label);
    }

    if (inference.note) {
      state.freeformNotes.push(inference.note);
      if (modelBefore !== state.selection.model || deviceBefore !== state.selection.device) {
        applied.push("extra symptoms saved for search");
      }
    }

    if (!applied.length) {
      chatBox.lastElementChild.remove();
      return false;
    }

    state.promptKey = "";
    if (state.selection.category && !state.currentQuestions.length) {
      state.currentQuestions = state.selection.category.questions || [];
    }
    addSystem("Parsed that as " + applied.join(", ") + ".");
    routeNextStep();
    return true;
  }

  function inferSelectionsFromMessage(rawValue) {
    const normalized = normalizeText(rawValue);
    if (!normalized) return null;

    const currentDevice = state.selection.device;
    const device = currentDevice || inferDeviceFromText(normalized);
    const brand = state.selection.brand || inferBrandFromText(normalized, device);
    const category = state.selection.category || inferCategoryFromText(rawValue, device);
    const model = !state.selection.model ? extractModelCandidate(rawValue, {
      device: device,
      brand: brand,
      category: category,
    }) : "";
    const note = extractContextNote(rawValue, {
      device: device,
      brand: brand,
      category: category,
      model: model,
    });
    const captureCount = [device, brand, category, model].filter(Boolean).length;

    return {
      device: device,
      brand: brand,
      category: category,
      model: model,
      note: note,
      captureCount: captureCount,
    };
  }

  function inferDeviceFromText(normalized) {
    let best = null;
    let secondScore = 0;
    state.devices.forEach(function (device) {
      const directScore = scoreAliases(normalized, device.aliases) * 2;
      const brandScore = Math.max.apply(null, (device.brands || []).map(function (brand) {
        return scoreAliases(normalized, brand.aliases);
      }).concat([0]));
      const categoryScore = Math.max.apply(null, (device.categories || []).map(function (category) {
        return scoreAliases(normalized, category.aliases);
      }).concat([0]));
      const score = directScore + brandScore + categoryScore;
      if (!best || score > best.score) {
        secondScore = best ? best.score : 0;
        best = { device: device, score: score };
      } else if (score > secondScore) {
        secondScore = score;
      }
    });

    if (best && best.score >= 3 && best.score > secondScore) {
      return best.device;
    }

    const uniqueBrandHit = inferUniqueDeviceFromBrandAlias(normalized);
    return uniqueBrandHit ? getDeviceById(uniqueBrandHit.deviceId) : null;
  }

  function inferUniqueDeviceFromBrandAlias(normalized) {
    const aliases = Object.keys(state.indexes.uniqueBrandAliases || {});
    let match = null;
    aliases.forEach(function (alias) {
      if (!containsPhrase(normalized, alias)) return;
      if (!match || alias.length > match.alias.length) {
        match = { alias: alias, value: state.indexes.uniqueBrandAliases[alias] };
      }
    });
    return match ? match.value : null;
  }

  function inferBrandFromText(normalized, device) {
    if (!device) {
      const uniqueHit = inferUniqueDeviceFromBrandAlias(normalized);
      if (uniqueHit) {
        const hitDevice = getDeviceById(uniqueHit.deviceId);
        return hitDevice ? getBrandById(hitDevice, uniqueHit.brandId) : null;
      }
      return null;
    }

    const match = findBestChoice(device.brands || [], normalized, ["name", "id"], true);
    return match.item || null;
  }

  function inferCategoryFromText(rawValue, device) {
    if (!device) return null;
    const match = findBestChoice(device.categories || [], rawValue, ["label", "id"], true);
    return match.item || null;
  }

  function extractModelCandidate(rawValue, context) {
    const explicitModel = extractExplicitModelCandidate(rawValue);
    if (explicitModel) {
      return explicitModel;
    }

    let cleaned = String(rawValue || "");
    const phrasesToStrip = [];
    if (context.device) {
      phrasesToStrip.push(context.device.name, context.device.id);
      (context.device.aliases || []).forEach(function (alias) { phrasesToStrip.push(alias); });
    }
    if (context.brand) {
      phrasesToStrip.push(context.brand.name, context.brand.id);
      (context.brand.aliases || []).forEach(function (alias) { phrasesToStrip.push(alias); });
    }
    if (context.category) {
      phrasesToStrip.push(context.category.label, context.category.id);
      (context.category.aliases || []).forEach(function (alias) { phrasesToStrip.push(alias); });
    }
    phrasesToStrip.push("my", "issue", "problem", "broken", "not working", "wont turn on", "won't turn on", "with", "after", "because", "the", "a", "an", "is", "model", "model number", "serial number");
    phrasesToStrip.push("not charging", "charging", "charger", "battery", "screen", "display", "keyboard", "trackpad", "touchpad", "water damage", "overheating", "hot", "update", "updated", "firmware", "boot loop", "restart");

    phrasesToStrip.forEach(function (phrase) {
      if (!phrase) return;
      const pattern = new RegExp("\\b" + escapeRegExp(String(phrase)) + "\\b", "ig");
      cleaned = cleaned.replace(pattern, " ");
    });

    cleaned = cleaned
      .replace(/[()]/g, " ")
      .replace(/[,/]+/g, " ")
      .replace(/\b(and|plus|also)\b/ig, " ")
      .replace(/\s+/g, " ")
      .trim();

    const compact = cleaned.split(" ").filter(Boolean);
    if (!compact.length || compact.length > 6) return "";
    if (!/[a-z]/i.test(cleaned) && !/\d/.test(cleaned)) return "";
    if (cleaned.length < 3) return "";
    return cleaned;
  }

  function extractExplicitModelCandidate(rawValue) {
    const original = String(rawValue || "").trim();
    if (!original) return "";

    const regexes = [
      /\b([A-Za-z]{1,5}\d{1,4}[A-Za-z0-9-]*)(?:\s+[A-Za-z0-9-]{1,10}){0,2}\b/g,
      /\b(PS5|PS4|Xbox Series X|Xbox Series S|Switch OLED|Switch Lite|MacBook Pro \d{1,2}|MacBook Air \d{1,2}|iPhone \d{1,2}(?: Pro| Plus| Pro Max)?|Galaxy S\d{1,2}|Pixel \d{1,2})\b/gi,
    ];

    for (const regex of regexes) {
      const matches = original.match(regex);
      if (!matches) continue;
      for (const match of matches) {
        const candidate = String(match).trim().replace(/\s+/g, " ");
        const normalized = normalizeText(candidate);
        if (!normalized) continue;
        if (!/[a-z]/i.test(candidate) || !/\d/.test(candidate)) continue;
        if (/\b(minutes?|hours?|days?|years?)\b/i.test(candidate)) continue;
        return candidate;
      }
    }

    return "";
  }

  function extractContextNote(rawValue, context) {
    const original = String(rawValue || "").trim();
    if (!original) return "";
    const strippedModel = context.model || "";
    let cleaned = original;

    [context.device && context.device.name, context.brand && context.brand.name, context.category && context.category.label, strippedModel].forEach(function (phrase) {
      if (!phrase) return;
      const pattern = new RegExp("\\b" + escapeRegExp(String(phrase)) + "\\b", "ig");
      cleaned = cleaned.replace(pattern, " ");
    });

    cleaned = cleaned.replace(/\s+/g, " ").trim();
    if (cleaned.length < 12) return "";
    return cleaned;
  }

  function cleanModelInput(value) {
    return String(value || "")
      .replace(/^\s*(my|it is|it's|model is|model number is|the model is)\s+/i, "")
      .replace(/\s+/g, " ")
      .trim();
  }

  function findBestChoice(items, rawValue, fields, preferAliasOnly) {
    const ranked = scoreChoices(items, rawValue, fields, preferAliasOnly).slice(0, 6);
    const matches = ranked.map(function (entry) { return entry.item; });
    if (!ranked.length) return { item: null, matches: [] };
    if (ranked[0].score >= 100) return { item: ranked[0].item, matches: matches };
    if (ranked.length === 1 && ranked[0].score >= 60) return { item: ranked[0].item, matches: matches };
    if (ranked.length > 1 && ranked[0].score >= 70 && ranked[0].score - ranked[1].score >= 18) {
      return { item: ranked[0].item, matches: matches };
    }
    return { item: null, matches: matches };
  }

  function scoreChoices(items, rawValue, fields, preferAliasOnly) {
    const normalizedValue = normalizeText(rawValue);
    if (!normalizedValue) return [];

    return (items || [])
      .map(function (item) {
        const values = (fields || []).map(function (field) { return item[field]; }).concat(item.aliases || []);
        const aliases = createAliases(values);
        const score = scoreAliasMatch(normalizedValue, aliases, !!preferAliasOnly);
        return { item: item, score: score };
      })
      .filter(function (entry) { return entry.score > 0; })
      .sort(function (a, b) { return b.score - a.score; });
  }

  function scoreAliasMatch(value, aliases, preferAliasOnly) {
    let best = 0;
    (aliases || []).forEach(function (alias) {
      if (!alias) return;
      if (alias === value) {
        best = Math.max(best, 100);
        return;
      }
      if (containsPhrase(value, alias) || containsPhrase(alias, value)) {
        best = Math.max(best, Math.min(92, Math.max(alias.length, value.length) * 4));
      }

      const score = overlapScore(value, alias);
      best = Math.max(best, preferAliasOnly ? score : score + (/\d/.test(alias) && /\d/.test(value) ? 8 : 0));
    });
    return best;
  }

  function scoreAliases(normalized, aliases) {
    let total = 0;
    (aliases || []).forEach(function (alias) {
      if (!alias) return;
      if (containsPhrase(normalized, alias)) {
        total += Math.max(1, alias.split(" ").length + Math.min(alias.length, 12) / 4);
      }
    });
    return total;
  }

  function overlapScore(value, alias) {
    const valueWords = value.split(" ").filter(Boolean);
    const aliasWords = alias.split(" ").filter(Boolean);
    if (!valueWords.length || !aliasWords.length) return 0;

    let matches = 0;
    valueWords.forEach(function (word) {
      if (word.length < 3) return;
      if (aliasWords.some(function (aliasWord) {
        return aliasWord.length >= 3 && (aliasWord.indexOf(word) === 0 || word.indexOf(aliasWord) === 0);
      })) {
        matches += 1;
      }
    });
    return Math.round((matches / Math.max(valueWords.length, aliasWords.length)) * 80);
  }

  function containsPhrase(source, phrase) {
    return (" " + source + " ").indexOf(" " + phrase + " ") !== -1;
  }

  function getDeviceById(deviceId) {
    return state.devices.find(function (device) {
      return device.id === deviceId;
    }) || null;
  }

  function getBrandById(device, brandId) {
    return (device.brands || []).find(function (brand) {
      return brand.id === brandId;
    }) || null;
  }

  function buildChoicePrompt(items, kind, options) {
    const compactClass = options.compact ? " choice-grid-compact" : "";
    let html = "<p><strong>" + options.title + "</strong></p>";
    if (options.description) {
      html += "<p>" + options.description + "</p>";
    }
    html += "<div class=\"choice-group is-live\" role=\"listbox\" aria-label=\"" + escapeAttr(options.title) + "\"><div class=\"choice-grid" + compactClass + "\">";
    (items || []).forEach(function (item) {
      const title = kind === "category" ? item.label : item.name;
      const subtitle = options.subtitleKey && item[options.subtitleKey] !== title ? item[options.subtitleKey] : "";
      html += "<button type=\"button\" class=\"choice-card\" role=\"option\" data-choice-kind=\"" + escapeAttr(kind) + "\" data-choice-value=\"" + escapeAttr(item.id) + "\">";
      html += "<span class=\"choice-card-title\">" + escapeHtml(title) + "</span>";
      if (subtitle) {
        html += "<span class=\"choice-card-subtitle\">" + escapeHtml(subtitle) + "</span>";
      }
      html += "</button>";
    });
    html += "</div></div>";
    return html;
  }

  function buildResultCard(result) {
    const typeLabel = result.type ? result.type.charAt(0).toUpperCase() + result.type.slice(1) : "Link";

    const snippet = result.snippet
      ? "<p class=\"result-snippet\">" + escapeHtml(result.snippet) + "</p>"
      : "";

    const affiliateNote = result.type === "affiliate"
      ? "<p class=\"result-snippet\">This is an affiliate link and may earn a commission.</p>"
      : "";

    const thumbnailHtml = result.thumbnail
      ? "<div class=\"result-thumb\"><img src=\"" + escapeAttr(result.thumbnail) + "\" alt=\"\" loading=\"lazy\"></div>"
      : "";

    const typeClass = (result.type === "video" || result.type === "vital") ? "precision-border-orange" : "precision-border-green";

    const score = result.score || 0;
    const trustBarClass = score >= 70 ? "high" : score >= 40 ? "medium" : "low";

    const difficulty = result.difficulty
      ? result.difficulty.charAt(0).toUpperCase() + result.difficulty.slice(1)
      : result.type === "guide" ? "Beginner"
        : result.type === "video" ? "Beginner"
          : score >= 60 ? "Intermediate" : "Advanced";

    const estTime = result.estimatedTime
      ? result.estimatedTime
      : result.type === "guide" ? "20-40 min"
        : result.type === "video" ? "10-30 min"
          : score >= 70 ? "15-30 min" : score >= 40 ? "30-60 min" : "1-3 hours";

    const riskLevel = result.riskLevel
      ? result.riskLevel.charAt(0).toUpperCase() + result.riskLevel.slice(1)
      : score >= 70 ? "Low"
        : score >= 40 ? "Medium" : "High";

    const trustHtml = "<div class=\"result-trust\">" +
      "<div class=\"result-trust-item\"><span class=\"result-trust-label\">Confidence</span><div class=\"trust-meter\"><div class=\"trust-bar\"><div class=\"trust-bar-fill " + trustBarClass + "\" style=\"width:" + score + "%\"></div></div><span>" + score + "%</span></div></div>" +
      "<div class=\"result-trust-item\"><span class=\"result-trust-label\">Risk</span><span class=\"result-trust-value\">" + riskLevel + "</span></div>" +
      "<div class=\"result-trust-item\"><span class=\"result-trust-label\">Difficulty</span><span class=\"result-trust-value\">" + difficulty + "</span></div>" +
      "<div class=\"result-trust-item\"><span class=\"result-trust-label\">Est. Time</span><span class=\"result-trust-value\">" + estTime + "</span></div>" +
      "</div>";

    var groupBadges = "";
    if (result.type === "guide") groupBadges += "<span class=\"badge badge--sm badge--guide\">guide</span>";
    if (result.type === "video") groupBadges += "<span class=\"badge badge--sm badge--video\">video</span>";
    if (score >= 75) groupBadges += "<span class=\"badge badge--sm badge--trust\">high trust</span>";
    if (result.source && ["ifixit.com", "support.microsoft.com", "support.apple.com"].indexOf(result.source) !== -1) {
      groupBadges += "<span class=\"badge badge--sm badge--official\">official</span>";
    }

    return "<article class=\"result-card " + typeClass + "\" data-kind=\"" + escapeAttr(result.type || "link") + "\" aria-label=\"" + escapeAttr(typeLabel + ": " + (result.title || result.link)) + "\">" +
      thumbnailHtml +
      "<div class=\"result-body\">" +
      "<div class=\"result-meta\">" +
      "<span class=\"result-badge\">" + escapeHtml(typeLabel) + "</span>" +
      "<span class=\"result-source\">" + escapeHtml(result.source || "web") + "</span>" +
      groupBadges +
      "</div>" +
      "<a class=\"result-title\" target=\"_blank\" rel=\"noopener\" href=\"" + escapeAttr(result.link) + "\">" + escapeHtml(result.title || result.link) + "</a>" +
      snippet +
      affiliateNote +
      trustHtml +
      "<div class=\"message-actions\"><button type=\"button\" class=\"vote-btn\" data-upvote-link=\"" + escapeAttr(result.link) + "\">Helpful</button></div>" +
      "</div>" +
      "</article>";
  }

  function hideResultsPanel() {
    const panel = document.getElementById("resultsPanel");
    if (panel) panel.hidden = true;
  }

  async function handleUpvote(button) {
    const link = button.dataset.upvoteLink;
    if (!link) return;

    button.disabled = true;
    try {
      await API.search.upvote(link);
      button.classList.add("is-voted");
      button.textContent = "Marked helpful";
    } catch (error) {
      button.disabled = false;
      addSystem("That helpful vote did not save, but the result link still works.");
    }
  }

  function deactivateChoiceGroups() {
    chatBox.querySelectorAll(".choice-group.is-live").forEach(function (group) {
      group.classList.remove("is-live");
      group.classList.add("is-closed");
      group.querySelectorAll("button").forEach(function (button) {
        button.disabled = true;
      });
    });
  }

  function addAssistant(html, allowHtml) {
    const node = document.createElement("article");
    node.className = "chat-message assistant";
    node.innerHTML = '<div class="flex gap-4 items-start">' +
      '<div class="assistant-avatar"><span class="material-symbols-outlined text-[18px]">memory</span></div>' +
      '<div class="glass-surface border-l-4 border-forest-deep p-4 rounded-r-lg msg-bubble">' +
      (allowHtml === false ? "<p>" + escapeHtml(html) + "</p>" : html) +
      '<span class="message-time">' + getTimestamp() + '</span></div></div>';
    chatBox.appendChild(node);
    scrollTranscript();
    return node;
  }

  function addUser(text) {
    const node = document.createElement("article");
    node.className = "chat-message user";
    node.innerHTML = '<div class="flex gap-4 items-start justify-end">' +
      '<div class="bg-forest-deep text-white p-4 rounded-lg rounded-tr-none msg-bubble">' +
      '<p>' + escapeHtml(text) + '</p>' +
      '<span class="message-time">' + getTimestamp() + '</span></div>' +
      '<div class="user-avatar"><span class="material-symbols-outlined text-[18px]">person</span></div></div>';
    chatBox.appendChild(node);
    scrollTranscript();
    input.value = "";
    autoResizeInput();
  }

  function addSystem(text) {
    const node = document.createElement("article");
    node.className = "chat-message system";
    node.innerHTML = "<p>" + escapeHtml(text) + "</p>";
    chatBox.appendChild(node);
    scrollTranscript();
    return node;
  }

  function addTyping() {
    const node = document.createElement("article");
    node.className = "chat-message assistant";
    node.innerHTML = '<div class="flex gap-4 items-start">' +
      '<div class="assistant-avatar"><span class="material-symbols-outlined text-[18px]">memory</span></div>' +
      '<div class="glass-surface border-l-4 border-forest-deep p-4 rounded-r-lg msg-bubble">' +
      '<div class="typing-row"><span></span><span></span><span></span></div></div></div>';
    chatBox.appendChild(node);
    scrollTranscript();
    return node;
  }

  function scrollTranscript() {
    if (!userScrolledUp) {
      chatBox.scrollTop = chatBox.scrollHeight;
    }
  }

  function syncSummary() {
    setSummary(summaryDevice, state.selection.device ? state.selection.device.name : null, "Not chosen");
    setSummary(summaryBrand, state.selection.brand ? state.selection.brand.name : null, "-");
    setSummary(summaryModel, state.selection.model || null, "Not entered");
    const issueText = state.selection.problemDescription || (state.selection.category ? state.selection.category.label : null);
    setSummary(summaryIssue, issueText, "Not described");
    syncProgress();
  }

  function syncProgress() {
    const progress = getProgressState();
    if (progressFill) {
      progressFill.style.width = progress.percent + "%";
    }
    if (progressCopy) {
      progressCopy.textContent = progress.copy;
    }
  }

  function getProgressState() {
    const totalCoreSteps = 3;
    let completed = 0;
    if (state.selection.device) completed += 1;
    if (state.selection.model) completed += 0.5;
    if (state.selection.problemDescription) completed += 1;

    const basePercent = Math.round((completed / totalCoreSteps) * 100);
    const percent = state.step === "results" ? 100 : Math.min(96, basePercent);

    let copy = "Choose the device to begin.";
    if (state.step === "device") copy = "Step 1 of 3: identify the device.";
    else if (state.step === "model") copy = "Step 2 of 3: enter the model (optional).";
    else if (state.step === "problem") copy = "Step 3 of 3: describe the problem.";
    else if (state.step === "searching") copy = "Searching with your problem description.";
    else if (state.step === "results") copy = "Results ready for review.";

    return { percent: percent, copy: copy };
  }

  function setSummary(el, value, fallback) {
    const parent = el.closest("div");
    if (value) {
      el.textContent = value;
      if (parent) parent.classList.add("is-set");
    } else {
      el.textContent = fallback;
      if (parent) parent.classList.remove("is-set");
    }
  }

  function syncUrl() {
    const params = new URLSearchParams();
    if (state.selection.device) params.set("device", state.selection.device.id);
    if (state.selection.brand && state.selection.brand.id !== "generic" && state.selection.brand.id.indexOf("custom-") !== 0) {
      params.set("brand", state.selection.brand.id);
    }
    const query = params.toString();
    const nextUrl = query ? CHAT_PATH + "?" + query : CHAT_PATH;
    history.replaceState({}, "", nextUrl);
  }

  function setComposer(options) {
    input.disabled = !!options.disabled;
    sendBtn.disabled = !!options.disabled;
    input.placeholder = options.placeholder || "";
    composerHint.textContent = options.hint || "";
    inputMeta.textContent = options.meta || "Enter sends. Shift+Enter adds a new line.";
    const iconMap = { loading: 'hourglass_empty', continue: 'arrow_forward', search: 'search', searching: 'search', done: 'check', send: 'send' };
    const label = (options.sendLabel || 'Send').toLowerCase();
    const icon = iconMap[label] || 'send';
    sendBtn.innerHTML = '<span class="material-symbols-outlined text-[20px]">' + icon + '</span>';
    skipBtn.hidden = !options.showSkip;
    skipBtn.disabled = !!options.disabled;
    backBtn.hidden = !options.showBack;
    backBtn.disabled = !!options.disabled;
    renderContextExamples();

    if (!options.disabled) {
      window.setTimeout(function () { input.focus(); }, 20);
    }
  }

  function getContextExamplePool() {
    if (state.step === "device" || !state.selection.device) {
      return [
        { label: "Phone not charging", value: "Phone not charging", mode: "submit" },
        { label: "Dell laptop battery issue", value: "Dell laptop battery issue", mode: "submit" },
        { label: "PS5 overheating", value: "PS5 overheating", mode: "submit" },
        { label: "Printer paper jam", value: "Printer paper jam", mode: "submit" },
      ];
    }
    if (state.step === "model") {
      const device = state.selection.device;
      var modelEx = "Aspire 5, XPS 13, MacBook Pro 14";
      if (device.id === "phone") modelEx = "iPhone 14 Pro, Galaxy S24, Pixel 8";
      else if (device.id === "tablet") modelEx = "iPad Air, Galaxy Tab S9, Fire HD 10";
      else if (device.id === "console") modelEx = "PS5, Xbox Series X, Switch OLED";
      else if (device.id === "printer") modelEx = "HP Envy 6055e, Canon PIXMA TS9520";
      else if (device.id === "camera") modelEx = "Canon EOS R5, Sony A7 IV, Nikon Z6";
      else if (device.id === "router") modelEx = "TP-Link Archer AX73, Netgear RAX50";
      else if (device.id === "smartwatch") modelEx = "Watch Series 9, Galaxy Watch 6, Fenix 7";
      return modelEx.split(", ").map(function (m) {
        return { label: m, value: m, mode: "fill" };
      });
    }
    if (state.step === "problem") {
      return [
        { label: "Not turning on at all", value: "Not turning on at all", mode: "submit" },
        { label: "Battery drains quickly", value: "Battery drains quickly", mode: "submit" },
        { label: "Screen flickers or has lines", value: "Screen flickers or has lines", mode: "submit" },
        { label: "Overheating during use", value: "Overheating during use", mode: "submit" },
      ];
    }
    return [];
  }

  function renderContextExamples() {
    var pool = getContextExamplePool();
    if (!pool.length || state.step === "searching" || state.step === "results") {
      contextExamples.innerHTML = "";
      return;
    }
    contextExamples.innerHTML = '<span class="context-carousel__label">Try:</span> <span class="context-carousel__track" id="contextTrack"></span>';
    var track = document.getElementById("contextTrack");
    pool.forEach(function (item) {
      var btn = document.createElement("button");
      btn.type = "button";
      btn.className = "context-chip";
      btn.dataset.promptValue = item.value;
      btn.dataset.promptMode = item.mode || "fill";
      btn.textContent = item.label;
      track.appendChild(btn);
    });
  }

  function buildPromptChoices(values, mode) {
    return (values || []).filter(Boolean).map(function (value) {
      return { value: value, label: value, mode: mode };
    });
  }

  function updateStatus(text) {
    statusPill.textContent = text;
    syncProgress();
  }

  function setBusy(isBusy) {
    state.busy = isBusy;
    chatBox.setAttribute("aria-busy", isBusy ? "true" : "false");
  }

  function buildSearchLabel() {
    return [
      state.selection.brand && state.selection.brand.id !== "generic" ? state.selection.brand.name : "",
      state.selection.model,
      state.selection.category ? state.selection.category.label : "",
    ].filter(Boolean).join(" ");
  }

  function buildSearchContext() {
    const pieces = [];
    if (state.selection.problemDescription) pieces.push(state.selection.problemDescription);
    if (state.freeformNotes.length) {
      state.freeformNotes.slice(-MAX_CONTEXT_ENTRIES).forEach(function (note) {
        if (note && note !== "(Skipped)") pieces.push(note);
      });
    }
    return pieces.join(". ").slice(0, 420);
  }

  function normalizeText(value) {
    return String(value || "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, " ")
      .trim();
  }

  function escapeHtml(value) {
    const div = document.createElement("div");
    div.textContent = String(value || "");
    return div.innerHTML;
  }

  function escapeAttr(value) {
    return escapeHtml(value).replace(/"/g, "&quot;");
  }

  function escapeRegExp(value) {
    return String(value || "").replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  }

  function getTimestamp() {
    const now = new Date();
    const h = now.getHours().toString().padStart(2, "0");
    const m = now.getMinutes().toString().padStart(2, "0");
    return h + ":" + m;
  }

  function handleChatClick(event) {
    const choiceButton = event.target.closest("[data-choice-kind]");
    if (choiceButton) {
      if (choiceButton.disabled || state.busy) return;
      handleChoice(choiceButton.dataset.choiceKind, choiceButton.dataset.choiceValue);
      return;
    }

    const voteButton = event.target.closest("[data-upvote-link]");
    if (voteButton) {
      if (voteButton.disabled || voteButton.classList.contains("is-voted")) return;
      handleUpvote(voteButton);
    }
  }

  function focusFirstChoice() {
    requestAnimationFrame(function () {
      const first = chatBox.querySelector(".choice-card:not(:disabled)");
      if (first) first.focus();
    });
  }

  function handleChoice(kind, value) {
    if (kind === "device") chooseDevice(value);
  }

  function chooseDevice(deviceId) {
    const device = getDeviceById(deviceId);
    if (!device) return;
    deactivateChoiceGroups();
    addUser(device.name);
    state.promptKey = "";
    state.selection.device = device;
    state.selection.brand = null;
    state.selection.model = null;
    state.selection.category = null;
    state.selection.problemDescription = "";
    state.freeformNotes = [];
    state.currentQuestions = [];
    // Start a session for analytics
    if (state.sessionId === null) {
      API.sessions.create(device.id).then(function (resp) {
        if (resp && resp.session && resp.session.id) {
          state.sessionId = resp.session.id;
        }
      }).catch(function () { /* session creation is best-effort */ });
    }
    routeNextStep();
  }

  function chooseModel(model) {
    deactivateChoiceGroups();
    if (model) {
      addUser(model);
      state.selection.model = model;
    } else {
      addUser("(Skipped model)");
      state.selection.model = "";
    }
    state.promptKey = "";
    if (state.sessionId) {
      API.sessions.addStep(state.sessionId, 'question', { stepType: 'model', value: model });
    }
    routeNextStep();
  }

  function chooseProblem(value) {
    deactivateChoiceGroups();
    addUser(value);
    state.promptKey = "";
    state.selection.problemDescription = value;

    // Try to infer brand and category from the problem description
    const normalized = normalizeText(value);
    if (!state.selection.brand) {
      const inferredBrand = inferBrandFromText(normalized, state.selection.device);
      if (inferredBrand) state.selection.brand = inferredBrand;
    }
    if (!state.selection.category) {
      const inferredCategory = inferCategoryFromText(value, state.selection.device);
      if (inferredCategory) state.selection.category = inferredCategory;
    }

    if (state.sessionId) {
      API.sessions.addStep(state.sessionId, 'question', { stepType: 'problem', description: value });
    }
    routeNextStep();
  }

  function goBack() {
    if (state.busy) return;
    if (state.step === "model") {
      state.selection.device = null;
      state.selection.brand = null;
      state.selection.model = null;
      state.selection.category = null;
      state.selection.problemDescription = "";
      state.freeformNotes = [];
      state.currentQuestions = [];
      state.sessionId = null;
      state.promptKey = "";
      addSystem("Going back to choose a device.");
      routeNextStep();
      return;
    }
    if (state.step === "problem") {
      state.selection.model = null;
      state.selection.brand = null;
      state.selection.category = null;
      state.selection.problemDescription = "";
      state.promptKey = "";
      addSystem("Going back to enter the model.");
      routeNextStep();
      return;
    }
    if (state.step === "searching" || state.step === "results") {
      state.selection.problemDescription = "";
      state.selection.brand = null;
      state.selection.category = null;
      state.promptKey = "";
      addSystem("Going back to describe the problem.");
      routeNextStep();
    }
  }

  function onChatScroll() {
    const threshold = 60;
    userScrolledUp = chatBox.scrollHeight - chatBox.scrollTop - chatBox.clientHeight > threshold;
    const btn = document.getElementById("scrollBottomBtn");
    if (btn) {
      btn.hidden = !userScrolledUp;
    }
  }

  function scrollToBottom() {
    chatBox.scrollTop = chatBox.scrollHeight;
    userScrolledUp = false;
    const btn = document.getElementById("scrollBottomBtn");
    if (btn) btn.hidden = true;
  }

  function autoResizeInput() {
    input.style.height = "auto";
    input.style.height = Math.min(input.scrollHeight, 140) + "px";
  }

  function clearSearchTimer() {
    if (searchTimerInterval) {
      clearInterval(searchTimerInterval);
      searchTimerInterval = null;
    }
  }

  function saveState() {
    try {
      const data = {
        version: 4,
        timestamp: Date.now(),
        deviceId: state.selection.device ? state.selection.device.id : null,
        brandId: state.selection.brand && state.selection.brand.id !== "generic" ? state.selection.brand.id : null,
        model: state.selection.model || "",
        categoryId: state.selection.category ? state.selection.category.id : null,
        problemDescription: state.selection.problemDescription || "",
        step: state.step,
        freeformNotes: state.freeformNotes,
        currentQuestions: state.currentQuestions,
        lastSearchContext: state.lastSearchContext,
        sessionId: state.sessionId,
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    } catch (error) {}
  }

  function tryRestoreState() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return false;
      const data = JSON.parse(raw);
      if (data.version < 2 || data.version > 4) return false;
      if (Date.now() - data.timestamp > 3600000) {
        localStorage.removeItem(STORAGE_KEY);
        return false;
      }
      return applyRestoredState(data);
    } catch (error) {
      return false;
    }
  }

  function applyRestoredState(data) {
    if (!data.deviceId) return false;
    const device = getDeviceById(data.deviceId);
    if (!device) return false;
    state.selection.device = device;

    if (data.brandId) {
      const brand = getBrandById(device, data.brandId);
      if (brand) state.selection.brand = brand;
    }

    if (data.model !== undefined) {
      state.selection.model = data.model;
    }

    if (data.problemDescription) {
      state.selection.problemDescription = data.problemDescription;
    }

    if (data.categoryId) {
      const category = (device.categories || []).find(function (item) {
        return item.id === data.categoryId;
      });
      if (category) {
        state.selection.category = category;
        state.currentQuestions = data.currentQuestions && data.currentQuestions.length ? data.currentQuestions : (category.questions || []);
        state.freeformNotes = Array.isArray(data.freeformNotes) ? data.freeformNotes : [];
      }
    }

    state.sessionId = data.sessionId || null;
    state.lastSearchContext = data.lastSearchContext || "";
    addSystem("Resumed your previous session.");

    if (data.step === "results" || data.step === "searching") {
      hideResultsPanel();
      syncSummary();
      updateStatus("Refreshing results");
      addSystem("Refreshing the previous search so the results panel shows live data.");
      runSearch();
      return true;
    }

    routeNextStep();
    return true;
  }

  init();
})();
