/**
 * SQL Execution Plan Simulator (frontend-only engine)
 * ---------------------------------------------------
 * Responsibilities:
 * - Restore and persist user state in localStorage
 * - Fetch language-specific manifests, theory markdown, and task JSON files
 * - Render topic navigation, theory panel, practice panel, and feedback
 * - Evaluate answers and award points once per topic
 * - Handle graceful fallback when fetch/content errors happen
 */

const STORAGE_KEY = "sqlPlanTrainerState";

/**
 * Resolve runtime base path so fetches work on GitHub Pages project URLs
 * with and without trailing slash.
 * Examples:
 * - /SQL-Execution-Plan-Interactive-Trainer/ -> /SQL-Execution-Plan-Interactive-Trainer/
 * - /SQL-Execution-Plan-Interactive-Trainer/index.html -> /SQL-Execution-Plan-Interactive-Trainer/
 */
function resolveBasePath() {
  const path = window.location.pathname;
  if (path.endsWith("/")) return path;
  return `${path.substring(0, path.lastIndexOf("/") + 1)}`;
}

const APP_BASE_PATH = resolveBasePath();

/** Build asset URLs relative to the app base path. */
function assetUrl(relativePath) {
  return `${APP_BASE_PATH}${relativePath}`;
}

const uiText = {
  en: {
    appTitle: "SQL Plan Trainer",
    subtitle: "Micro-learning simulator",
    topics: "Topics",
    score: "Score",
    language: "Language",
    theory: "Theory",
    practice: "Practice",
    submit: "Submit answer",
    loadingTheory: "Loading theory...",
    loadingTask: "Loading task...",
    selectTopic: "Select a topic to load theory content.",
    noTask: "Practice task will appear here.",
    noSelection: "Please select an answer before submitting.",
    genericError: "Could not load content. Please try another topic."
  },
  ru: {
    appTitle: "Тренажёр плана SQL",
    subtitle: "Симулятор микро-обучения",
    topics: "Темы",
    score: "Баллы",
    language: "Язык",
    theory: "Теория",
    practice: "Практика",
    submit: "Отправить ответ",
    loadingTheory: "Загрузка теории...",
    loadingTask: "Загрузка задания...",
    selectTopic: "Выберите тему для загрузки теории.",
    noTask: "Здесь появится практическое задание.",
    noSelection: "Пожалуйста, выберите вариант ответа перед отправкой.",
    genericError: "Не удалось загрузить контент. Попробуйте другую тему."
  }
};

/** Shared application state persisted in localStorage. */
let state = {
  language: "en",
  score: 0,
  currentTopic: null,
  completedTopics: {}
};

/** Cached manifest for current language to avoid duplicate fetches. */
let currentManifest = { topics: [] };

// Cached DOM nodes used by rendering/event handlers.
const dom = {
  appTitle: document.getElementById("app-title"),
  subtitle: document.getElementById("app-subtitle"),
  topicsLabel: document.getElementById("topics-label"),
  topicList: document.getElementById("topic-list"),
  scoreLabel: document.getElementById("score-label"),
  scoreValue: document.getElementById("score-value"),
  languageLabel: document.getElementById("language-label"),
  languageSwitcher: document.getElementById("language-switcher"),
  theoryHeading: document.getElementById("theory-heading"),
  practiceHeading: document.getElementById("practice-heading"),
  theoryContent: document.getElementById("theory-content"),
  taskContent: document.getElementById("task-content"),
  submitButton: document.getElementById("submit-answer"),
  feedback: document.getElementById("feedback")
};

function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return;
    const parsed = JSON.parse(raw);
    state = {
      ...state,
      ...parsed,
      completedTopics: parsed.completedTopics || {}
    };
  } catch (error) {
    console.warn("Failed to parse saved state, resetting.", error);
  }
}

function saveState() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function t(key) {
  return uiText[state.language]?.[key] || uiText.en[key] || key;
}

function renderUiLabels() {
  document.documentElement.lang = state.language;
  dom.appTitle.textContent = t("appTitle");
  dom.subtitle.textContent = t("subtitle");
  dom.topicsLabel.textContent = t("topics");
  dom.scoreLabel.textContent = t("score");
  dom.languageLabel.textContent = t("language");
  dom.theoryHeading.textContent = t("theory");
  dom.practiceHeading.textContent = t("practice");
  dom.submitButton.textContent = t("submit");
  dom.languageSwitcher.value = state.language;
  renderScore();
}

function renderScore() {
  dom.scoreValue.textContent = String(state.score);
}

async function fetchJson(path) {
  const response = await fetch(assetUrl(path));
  if (!response.ok) {
    throw new Error(`Failed to fetch JSON: ${path} (${response.status})`);
  }
  return response.json();
}

async function fetchMarkdownAsHtml(path) {
  const response = await fetch(assetUrl(path));
  if (!response.ok) {
    throw new Error(`Failed to fetch Markdown: ${path} (${response.status})`);
  }
  const markdown = await response.text();
  return marked.parse(markdown);
}

async function loadManifest() {
  currentManifest = await fetchJson(`content/${state.language}/manifest.json`);
  if (!Array.isArray(currentManifest.topics) || currentManifest.topics.length === 0) {
    throw new Error("Manifest does not include topics array.");
  }

  const exists = currentManifest.topics.some((topic) => topic.id === state.currentTopic);
  if (!exists) {
    state.currentTopic = currentManifest.topics[0].id;
  }
  saveState();
}

function renderTopicNavigation() {
  dom.topicList.innerHTML = "";

  currentManifest.topics.forEach((topic) => {
    const li = document.createElement("li");
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = `topic-btn ${topic.id === state.currentTopic ? "active" : ""}`;
    btn.textContent = topic.title;
    btn.dataset.topicId = topic.id;
    btn.addEventListener("click", () => {
      state.currentTopic = topic.id;
      saveState();
      renderTopicNavigation();
      loadCurrentTopicContent();
    });

    li.appendChild(btn);
    dom.topicList.appendChild(li);
  });
}

/**
 * Render a multiple-choice task from task JSON.
 * Supports optional `diagramTitle` + `diagram` to show ASCII visual helpers.
 */
function renderTask(taskData) {
  dom.taskContent.innerHTML = "";

  if (taskData.diagram) {
    const diagramWrap = document.createElement("div");
    diagramWrap.className = "ascii-diagram";

    if (taskData.diagramTitle) {
      const diagramTitle = document.createElement("p");
      diagramTitle.className = "ascii-title";
      diagramTitle.textContent = taskData.diagramTitle;
      diagramWrap.appendChild(diagramTitle);
    }

    const pre = document.createElement("pre");
    pre.className = "ascii-pre";
    pre.textContent = taskData.diagram;
    diagramWrap.appendChild(pre);
    dom.taskContent.appendChild(diagramWrap);
  }

  const prompt = document.createElement("p");
  prompt.textContent = taskData.prompt;
  dom.taskContent.appendChild(prompt);

  taskData.options.forEach((option, index) => {
    const label = document.createElement("label");
    label.className = "option-label";

    const input = document.createElement("input");
    input.type = "radio";
    input.name = "task-option";
    input.value = String(index);

    const text = document.createElement("span");
    text.textContent = option;

    label.append(input, text);
    dom.taskContent.appendChild(label);
  });

  dom.submitButton.onclick = () => handleTaskSubmit(taskData);
}

function handleTaskSubmit(taskData) {
  const selected = document.querySelector('input[name="task-option"]:checked');
  if (!selected) {
    showFeedback("error", t("noSelection"));
    return;
  }

  const selectedIndex = Number(selected.value);
  const isCorrect = selectedIndex === taskData.correctIndex;

  if (isCorrect) {
    const alreadyCompleted = state.completedTopics[state.currentTopic] === true;
    if (!alreadyCompleted) {
      state.score += Number(taskData.points || 0);
      state.completedTopics[state.currentTopic] = true;
      saveState();
      renderScore();
    }

    showFeedback("success", taskData.feedback.correct);
  } else {
    showFeedback("error", taskData.feedback.incorrect);
  }
}

function showFeedback(type, message) {
  dom.feedback.className = `feedback ${type}`;
  dom.feedback.textContent = message;
}

async function loadCurrentTopicContent() {
  const topic = currentManifest.topics.find((item) => item.id === state.currentTopic);
  if (!topic) return;

  dom.theoryContent.innerHTML = `<p class="placeholder">${t("loadingTheory")}</p>`;
  dom.taskContent.innerHTML = `<p class="placeholder">${t("loadingTask")}</p>`;
  dom.feedback.className = "feedback";
  dom.feedback.textContent = "";

  try {
    const [theoryHtml, taskData] = await Promise.all([
      fetchMarkdownAsHtml(`content/${state.language}/theory/${topic.theoryFile}`),
      fetchJson(`content/${state.language}/tasks/${topic.taskFile}`)
    ]);

    dom.theoryContent.innerHTML = theoryHtml;
    renderTask(taskData);
  } catch (error) {
    console.error(error);
    dom.theoryContent.innerHTML = `<p class="placeholder">${t("genericError")}</p>`;
    dom.taskContent.innerHTML = `<p class="placeholder">${t("noTask")}</p>`;
    showFeedback("error", t("genericError"));
  }
}

async function initializeApp() {
  loadState();
  renderUiLabels();

  try {
    await loadManifest();
    renderTopicNavigation();
    await loadCurrentTopicContent();
  } catch (error) {
    console.error("Initialization failed", error);
    dom.theoryContent.innerHTML = `<p class="placeholder">${t("genericError")}</p>`;
    dom.taskContent.innerHTML = `<p class="placeholder">${t("noTask")}</p>`;
  }
}

dom.languageSwitcher.addEventListener("change", async (event) => {
  state.language = event.target.value;
  saveState();
  renderUiLabels();

  try {
    await loadManifest();
    renderTopicNavigation();
    await loadCurrentTopicContent();
  } catch (error) {
    console.error("Language switch failed", error);
    showFeedback("error", t("genericError"));
  }
});

initializeApp();
