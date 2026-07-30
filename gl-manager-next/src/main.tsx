import React, { useEffect, useMemo, useState } from "react";
import ReactDOM from "react-dom/client";
import { invoke } from "@tauri-apps/api/core";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { open } from "@tauri-apps/plugin-dialog";
import {
  AlertCircle,
  CheckCircle2,
  Copy,
  FolderOpen,
  Gamepad2,
  Globe2,
  Layers3,
  Library,
  Pencil,
  Play,
  Plus,
  RotateCcw,
  Save,
  Search,
  Settings as SettingsIcon,
  ShieldCheck,
  Sparkles,
  Trash2,
  Wand2,
  X
} from "lucide-react";
import { GooeyLoader } from "@/components/ui/loader-10";
import logoUrl from "@/assets/harman-logo.png";
import { cn } from "@/lib/utils";
import "./styles.css";

type Language = "tr" | "en" | "zh" | "ru";

type AppEntry = {
  id: string;
  name: string;
  type: string;
};

type Profile = {
  name: string;
  games: AppEntry[];
};

type Settings = {
  steam_path: string;
  greenluma_path: string;
  no_hook: boolean;
  last_profile: string;
  check_update: boolean;
  use_steamdb: boolean;
  manager_msg: boolean;
  language: Language;
  onboarding_completed: boolean;
  greenluma_download_url: string;
  app_update_manifest_url: string;
};

type UpdateInfo = {
  available: boolean;
  version: string;
  url: string;
  notes: string;
};

type NoticeKind = "info" | "success" | "error";

type Notice = {
  kind: NoticeKind;
  message: string;
};

type PrepareResult = {
  app_count: number;
  app_list_path: string;
  steam_exe: string;
  injector_exe: string;
  injector_ini: string;
  greenluma_dll: string;
};

type GreenLumaHealth = {
  ok: boolean;
  path: string;
  missing: string[];
};

type ProgressState = {
  title: string;
  step: string;
} | null;

const fallbackSettings: Settings = {
  steam_path: "",
  greenluma_path: "",
  no_hook: true,
  last_profile: "default",
  check_update: true,
  use_steamdb: false,
  manager_msg: true,
  language: detectSystemLanguage(),
  onboarding_completed: false,
  greenluma_download_url: "",
  app_update_manifest_url: ""
};

const baseDictionaries = {
  tr: {
    ready: "Hazır",
    loaded: "Profiller yüklendi",
    appAdded: "eklendi",
    duplicate: "Bu AppID profilde zaten var",
    appIdDigits: "AppID sadece rakamlardan oluşmalı",
    removed: "Kayıt profilden kaldırıldı",
    searching: "Steam Store aranıyor",
    noResults: "Sonuç bulunamadı",
    resultsFound: "sonuç bulundu",
    exportTargetMissing: "AppList export hedefi seçilmedi",
    steamNetworkError: "Steam bağlantısı kurulamadı",
    updateNetworkError: "Güncelleme sunucusuna ulaşılamadı",
    greenlumaNetworkError: "GreenLuma paketi indirilemedi",
    networkGenericError: "Sunucu bağlantısı kurulamadı",
    rateLimitError: "İndirme limiti doldu. Bir süre sonra tekrar dene.",
    fileNotFoundError: "İstenen dosya sunucuda bulunamadı",
    defaultDelete: "Default profil silinemez",
    lastProfileDelete: "Son kalan profil silinemez",
    title: "Modern profil çalışma alanı",
    noProfile: "Profil yok",
    profileList: "Profil listesi",
    shown: "kayıt görüntüleniyor",
    bulkSoon: "Toplu seçim yakında",
    searchInProfile: "Profil içinde ara",
    steamSearch: "Steam arama",
    games: "oyun",
    searchGame: "Oyun adı ara",
    search: "Ara",
    directAdd: "AppID ile direkt ekle",
    scanning: "Steam Store taranıyor",
    waitingResults: "Arama sonucu bekleniyor",
    waitingBody: "Bir oyun adı yazıp arat; sonuçlar ve DLC kayıtları burada görünecek.",
    noApps: "Bu görünümde AppID yok",
    noAppsBody: "Steam aramasından ekle veya AppID ile direkt kayıt oluştur.",
    target: "Hedef",
    unselected: "seçilmedi",
    settings: "Ayarlar",
    settingsBody: "Klasörleri seç, indirme linkini düzenle ve dili değiştir.",
    steamFolder: "Steam klasörü",
    greenlumaFolder: "GreenLuma klasörü",
    downloadUrl: "GreenLuma ZIP URL",
    folderPath: "Klasör yolu",
    browse: "Seç",
    cancel: "Vazgeç",
    skip: "Atla",
    back: "Geri",
    save: "Kaydet",
    rememberUpdates: "Güncelleme kontrolünü hatırla",
    language: "Dil",
    deleteProfile: "Profili sil",
    exportAppList: "AppList export",
    prepareRun: "Hazırla ve çalıştır",
    prepareStepAppList: "AppList hazırlanıyor",
    prepareStepValidate: "GreenLuma dosyaları kontrol ediliyor, sonra Steam kapatılacak",
    prepareReady: "Akış tamamlandı.",
    prepareManual: "AppList hazırlandı ve çalışma adımları işlendi.",
    antivirusTitle: "GreenLuma otomatik kurulum",
    antivirusWarning: "Virüs koruma programınız GreenLuma dosyalarını silebilir. Kurulumdan önce gerçek zamanlı korumayı geçici olarak kapatmanız gerekebilir.",
    proceed: "Devam et",
    newProfile: "Yeni profil",
    createProfile: "Profil oluştur",
    welcomeTitle: "GreenLuma Manager Next By Harman'a hoş geldin",
    welcomeBody: "İlk kurulumda Steam ve GreenLuma konumlarını hazırlayalım. Sonra doğrudan ana ekrana geçeceksin.",
    begin: "Başla",
    steamStep: "Steam konumu",
    steamStepBody: "Steam kurulumunu otomatik bulabiliriz veya Steam.exe dosyasını sen seçebilirsin.",
    autoFind: "Auto Find",
    chooseSteamExe: "Steam.exe seç",
    chooseFolder: "Klasör seç",
    continue: "Devam",
    greenlumaStep: "GreenLuma konumu",
    greenlumaStepBody: "Var olan klasörü seç veya ayarlardaki ZIP linkinden otomatik kurulum yap.",
    autoInstall: "Otomatik kur",
    finish: "Bitir",
    foundSteam: "Steam yolu bulundu",
    steamNotFound: "Steam kurulumu bulunamadı",
    validSteam: "Steam yolu doğrulandı",
    invalidSteam: "Steam.exe bulunamadı",
    validGl: "GreenLuma klasörü doğrulandı",
    invalidGl: "Gerekli GreenLuma dosyaları bulunamadı",
    installingGl: "GreenLuma ZIP indiriliyor ve çıkarılıyor",
    installedGl: "GreenLuma kurulumu tamamlandı",
    missingUrl: "GreenLuma ZIP URL girilmedi",
    updateDownloaded: "Güncelleme indirildi",
    updateAvailable: "Güncelleme var",
    updatePill: "Update mevcut",
    downloadUpdate: "Güncellemeyi indir",
    profileDeleted: "profil silindi",
    profileRenamed: "profil yeniden adlandırıldı",
    renameProfile: "Profili yeniden adlandır",
    developer: "Geliştirici",
    developerMode: "Geliştirici modu",
    developerModeBody: "Path ayarları sadece geliştirici modunda görünür.",
    managedInstallPath: "GreenLuma uygulama klasörüne kurulacak",
    autoSetup: "Otomatik kur ve devam et",
    setupStep: "Kurulum hazırlanıyor",
    setupBody: "Steam otomatik bulunacak, GreenLuma uygulamanın kendi klasörüne kurulacak.",
    close: "Kapat",
    add: "Ekle",
    remove: "Kaldır",
    workspace: "çalışma alanı"
    ,
    glHealthTitle: "GreenLuma dosyaları eksik",
    glHealthBody: "Virüs koruma programınız bazı GreenLuma dosyalarını silmiş olabilir. Virüs koruma programını kapatmayı unutma, sonra sorunları düzelt.",
    fixIssues: "Sorunları düzelt",
    healthOk: "GreenLuma dosyaları hazır",
    resetAppData: "GLR_Manager klasörünü sil",
    resetAppDataTitle: "Tüm uygulama verileri silinsin mi?",
    resetAppDataBody: "Bu işlem %LOCALAPPDATA% içindeki GLR_Manager klasörünü tamamen siler. Profiller, ayarlar ve kurulu GreenLuma dosyaları kaldırılır."
  },
  en: {
    ready: "Ready",
    loaded: "Profiles loaded",
    appAdded: "added",
    duplicate: "This AppID is already in the profile",
    appIdDigits: "AppID must contain digits only",
    removed: "Entry removed from profile",
    searching: "Searching Steam Store",
    noResults: "No results found",
    resultsFound: "results found",
    exportTargetMissing: "AppList export target is not selected",
    steamNetworkError: "Could not connect to Steam",
    updateNetworkError: "Could not reach the update server",
    greenlumaNetworkError: "Could not download the GreenLuma package",
    networkGenericError: "Could not connect to the server",
    rateLimitError: "Download limit reached. Try again later.",
    fileNotFoundError: "The requested file was not found on the server",
    defaultDelete: "Default profile cannot be deleted",
    lastProfileDelete: "The last remaining profile cannot be deleted",
    title: "Modern profile workspace",
    noProfile: "No profile",
    profileList: "Profile list",
    shown: "entries shown",
    bulkSoon: "Bulk selection soon",
    searchInProfile: "Search in profile",
    steamSearch: "Steam search",
    games: "games",
    searchGame: "Search game name",
    search: "Search",
    directAdd: "Add directly with AppID",
    scanning: "Scanning Steam Store",
    waitingResults: "Waiting for search results",
    waitingBody: "Search for a game name; results and DLC entries will appear here.",
    noApps: "No AppID in this view",
    noAppsBody: "Add from Steam search or create an entry directly with AppID.",
    target: "Target",
    unselected: "not selected",
    settings: "Settings",
    settingsBody: "Choose folders, edit the download link, and change language.",
    steamFolder: "Steam folder",
    greenlumaFolder: "GreenLuma folder",
    downloadUrl: "GreenLuma ZIP URL",
    folderPath: "Folder path",
    browse: "Browse",
    cancel: "Cancel",
    skip: "Skip",
    back: "Back",
    save: "Save",
    rememberUpdates: "Remember update checks",
    language: "Language",
    deleteProfile: "Delete profile",
    exportAppList: "Export AppList",
    prepareRun: "Prepare & Run",
    prepareStepAppList: "Preparing AppList",
    prepareStepValidate: "Checking GreenLuma files before Steam shutdown",
    prepareReady: "Flow completed.",
    prepareManual: "AppList was prepared and runtime steps were processed.",
    antivirusTitle: "GreenLuma automatic install",
    antivirusWarning: "Your antivirus may delete GreenLuma files. You may need to temporarily disable real-time protection before installing.",
    proceed: "Proceed",
    newProfile: "New profile",
    createProfile: "Create profile",
    welcomeTitle: "Welcome to GreenLuma Manager Next By Harman",
    welcomeBody: "Let's prepare Steam and GreenLuma locations on first launch. After that, you will go straight to the app.",
    begin: "Begin",
    steamStep: "Steam location",
    steamStepBody: "We can auto-detect Steam, or you can choose Steam.exe manually.",
    autoFind: "Auto Find",
    chooseSteamExe: "Choose Steam.exe",
    chooseFolder: "Choose folder",
    continue: "Continue",
    greenlumaStep: "GreenLuma location",
    greenlumaStepBody: "Choose an existing folder or install from the ZIP link in settings.",
    autoInstall: "Auto install",
    finish: "Finish",
    foundSteam: "Steam path found",
    steamNotFound: "Steam installation was not found",
    validSteam: "Steam path validated",
    invalidSteam: "Steam.exe was not found",
    validGl: "GreenLuma folder validated",
    invalidGl: "Required GreenLuma files were not found",
    installingGl: "Downloading and extracting GreenLuma ZIP",
    installedGl: "GreenLuma installation completed",
    missingUrl: "GreenLuma ZIP URL is missing",
    updateDownloaded: "Update downloaded",
    updateAvailable: "Update available",
    updatePill: "Update available",
    downloadUpdate: "Download update",
    profileDeleted: "profile deleted",
    profileRenamed: "profile renamed",
    renameProfile: "Rename profile",
    developer: "Developer",
    developerMode: "Developer mode",
    developerModeBody: "Path settings are only visible in developer mode.",
    managedInstallPath: "GreenLuma will be installed into the app folder",
    autoSetup: "Auto setup and continue",
    setupStep: "Preparing setup",
    setupBody: "Steam will be detected automatically and GreenLuma will be installed into this app's folder.",
    close: "Close",
    add: "Add",
    remove: "Remove",
    workspace: "workspace"
    ,
    glHealthTitle: "GreenLuma files are missing",
    glHealthBody: "Your antivirus may have deleted some GreenLuma files. Do not forget to disable antivirus protection, then fix the issues.",
    fixIssues: "Fix issues",
    healthOk: "GreenLuma files are ready",
    resetAppData: "Delete GLR_Manager folder",
    resetAppDataTitle: "Delete all app data?",
    resetAppDataBody: "This removes the GLR_Manager folder under %LOCALAPPDATA%. Profiles, settings, and installed GreenLuma files will be removed."
  },
  zh: {
    ready: "就绪",
    loaded: "配置已加载",
    appAdded: "已添加",
    duplicate: "此 AppID 已在配置中",
    appIdDigits: "AppID 只能包含数字",
    removed: "已从配置中移除",
    searching: "正在搜索 Steam 商店",
    noResults: "没有找到结果",
    resultsFound: "个结果",
    exportTargetMissing: "未选择 AppList 导出目标",
    steamNetworkError: "无法连接 Steam",
    updateNetworkError: "无法连接更新服务器",
    greenlumaNetworkError: "无法下载 GreenLuma 包",
    networkGenericError: "无法连接服务器",
    rateLimitError: "已达到下载限制，请稍后再试。",
    fileNotFoundError: "服务器上未找到请求的文件",
    defaultDelete: "不能删除默认配置",
    lastProfileDelete: "不能删除最后一个配置",
    title: "现代配置工作区",
    noProfile: "没有配置",
    profileList: "配置列表",
    shown: "条记录显示",
    bulkSoon: "批量选择即将推出",
    searchInProfile: "在配置中搜索",
    steamSearch: "Steam 搜索",
    games: "游戏",
    searchGame: "搜索游戏名",
    search: "搜索",
    directAdd: "用 AppID 直接添加",
    scanning: "正在扫描 Steam 商店",
    waitingResults: "等待搜索结果",
    waitingBody: "输入游戏名搜索，结果和 DLC 会显示在这里。",
    noApps: "此视图没有 AppID",
    noAppsBody: "从 Steam 搜索添加，或用 AppID 直接创建记录。",
    target: "目标",
    unselected: "未选择",
    settings: "设置",
    settingsBody: "选择文件夹，编辑下载链接，并切换语言。",
    steamFolder: "Steam 文件夹",
    greenlumaFolder: "GreenLuma 文件夹",
    downloadUrl: "GreenLuma ZIP 链接",
    folderPath: "文件夹路径",
    browse: "选择",
    cancel: "取消",
    skip: "跳过",
    back: "返回",
    save: "保存",
    rememberUpdates: "记住更新检查",
    language: "语言",
    deleteProfile: "删除配置",
    exportAppList: "导出 AppList",
    prepareRun: "准备并运行",
    prepareStepAppList: "正在准备 AppList",
    prepareStepValidate: "正在关闭 Steam 前检查 GreenLuma 文件",
    prepareReady: "流程已完成。",
    prepareManual: "AppList 已准备完成，运行步骤已处理。",
    antivirusTitle: "GreenLuma 自动安装",
    antivirusWarning: "杀毒软件可能会删除 GreenLuma 文件。安装前可能需要暂时关闭实时保护。",
    proceed: "继续",
    newProfile: "新配置",
    createProfile: "创建配置",
    welcomeTitle: "欢迎使用 GreenLuma Manager Next By Harman",
    welcomeBody: "首次启动时先设置 Steam 和 GreenLuma 路径，之后将直接进入主界面。",
    begin: "开始",
    steamStep: "Steam 位置",
    steamStepBody: "可以自动查找 Steam，也可以手动选择 Steam.exe。",
    autoFind: "自动查找",
    chooseSteamExe: "选择 Steam.exe",
    chooseFolder: "选择文件夹",
    continue: "继续",
    greenlumaStep: "GreenLuma 位置",
    greenlumaStepBody: "选择已有文件夹，或从设置中的 ZIP 链接自动安装。",
    autoInstall: "自动安装",
    finish: "完成",
    foundSteam: "已找到 Steam 路径",
    steamNotFound: "未找到 Steam 安装",
    validSteam: "Steam 路径已验证",
    invalidSteam: "未找到 Steam.exe",
    validGl: "GreenLuma 文件夹已验证",
    invalidGl: "未找到必要的 GreenLuma 文件",
    installingGl: "正在下载并解压 GreenLuma ZIP",
    installedGl: "GreenLuma 安装完成",
    missingUrl: "缺少 GreenLuma ZIP 链接",
    updateDownloaded: "更新已下载",
    updateAvailable: "有可用更新",
    updatePill: "有更新",
    downloadUpdate: "下载更新",
    profileDeleted: "配置已删除",
    profileRenamed: "配置已重命名",
    renameProfile: "重命名配置",
    developer: "开发者",
    developerMode: "开发者模式",
    developerModeBody: "路径设置仅在开发者模式中显示。",
    managedInstallPath: "GreenLuma 将安装到应用文件夹",
    autoSetup: "自动设置并继续",
    setupStep: "正在准备设置",
    setupBody: "将自动检测 Steam，并把 GreenLuma 安装到此应用的文件夹。",
    close: "关闭",
    add: "添加",
    remove: "移除",
    workspace: "工作区"
    ,
    glHealthTitle: "GreenLuma 文件缺失",
    glHealthBody: "杀毒软件可能删除了部分 GreenLuma 文件。请不要忘记关闭杀毒实时保护，然后修复问题。",
    fixIssues: "修复问题",
    healthOk: "GreenLuma 文件已就绪",
    resetAppData: "删除 GLR_Manager 文件夹",
    resetAppDataTitle: "删除所有应用数据？",
    resetAppDataBody: "这会删除 %LOCALAPPDATA% 中的 GLR_Manager 文件夹。配置、设置和已安装的 GreenLuma 文件都会被移除。"
  }
} satisfies Record<Exclude<Language, "ru">, Record<string, string>>;

const dictionaries = {
  ...baseDictionaries,
  ru: {
    ...baseDictionaries.en,
    ready: "Готово",
    loaded: "Профили загружены",
    appAdded: "добавлено",
    duplicate: "Этот AppID уже есть в профиле",
    appIdDigits: "AppID должен содержать только цифры",
    removed: "Запись удалена из профиля",
    searching: "Поиск в Steam Store",
    noResults: "Ничего не найдено",
    resultsFound: "результатов найдено",
    exportTargetMissing: "Цель AppList не выбрана",
    steamNetworkError: "Не удалось подключиться к Steam",
    updateNetworkError: "Не удалось подключиться к серверу обновлений",
    greenlumaNetworkError: "Не удалось скачать пакет GreenLuma",
    networkGenericError: "Не удалось подключиться к серверу",
    rateLimitError: "Лимит загрузок исчерпан. Попробуйте позже.",
    fileNotFoundError: "Запрошенный файл не найден на сервере",
    defaultDelete: "Профиль default нельзя удалить",
    lastProfileDelete: "Нельзя удалить последний профиль",
    title: "Современная рабочая область профиля",
    noProfile: "Нет профиля",
    profileList: "Список профилей",
    shown: "записей показано",
    searchInProfile: "Поиск в профиле",
    steamSearch: "Поиск Steam",
    games: "игр",
    searchGame: "Название игры",
    search: "Поиск",
    directAdd: "Добавить напрямую по AppID",
    scanning: "Сканирование Steam Store",
    waitingResults: "Ожидание результатов",
    waitingBody: "Введите название игры; результаты и DLC появятся здесь.",
    noApps: "В этом виде нет AppID",
    noAppsBody: "Добавьте из поиска Steam или напрямую по AppID.",
    target: "Цель",
    unselected: "не выбрано",
    settings: "Настройки",
    settingsBody: "Выберите язык и параметры приложения.",
    steamFolder: "Папка Steam",
    greenlumaFolder: "Папка GreenLuma",
    downloadUrl: "GreenLuma ZIP URL",
    folderPath: "Путь к папке",
    browse: "Выбрать",
    cancel: "Отмена",
    skip: "Пропустить",
    back: "Назад",
    save: "Сохранить",
    rememberUpdates: "Проверять обновления",
    language: "Язык",
    deleteProfile: "Удалить профиль",
    prepareRun: "Подготовить и запустить",
    prepareStepAppList: "Подготовка AppList",
    prepareStepValidate: "Проверка файлов GreenLuma перед закрытием Steam",
    prepareReady: "Процесс завершен.",
    prepareManual: "AppList подготовлен, рабочие шаги выполнены.",
    antivirusTitle: "Автоматическая установка GreenLuma",
    antivirusWarning: "Антивирус может удалить файлы GreenLuma. Перед установкой может потребоваться временно отключить защиту в реальном времени.",
    proceed: "Продолжить",
    newProfile: "Новый профиль",
    createProfile: "Создать профиль",
    welcomeTitle: "Добро пожаловать в GreenLuma Manager Next By Harman",
    welcomeBody: "При первом запуске Steam будет найден автоматически, а GreenLuma установится в папку приложения.",
    begin: "Начать",
    steamStep: "Расположение Steam",
    steamStepBody: "Steam можно найти автоматически или выбрать Steam.exe вручную.",
    autoFind: "Найти автоматически",
    chooseSteamExe: "Выбрать Steam.exe",
    chooseFolder: "Выбрать папку",
    continue: "Продолжить",
    greenlumaStep: "Расположение GreenLuma",
    autoInstall: "Автоустановка",
    finish: "Готово",
    foundSteam: "Путь Steam найден",
    steamNotFound: "Steam не найден",
    validSteam: "Путь Steam проверен",
    invalidSteam: "Steam.exe не найден",
    validGl: "Папка GreenLuma проверена",
    invalidGl: "Не найдены необходимые файлы GreenLuma",
    installingGl: "Загрузка и распаковка GreenLuma ZIP",
    installedGl: "GreenLuma установлена",
    missingUrl: "GreenLuma ZIP URL отсутствует",
    updateDownloaded: "Обновление загружено",
    updateAvailable: "Доступно обновление",
    updatePill: "Есть обновление",
    downloadUpdate: "Скачать обновление",
    profileDeleted: "профиль удален",
    profileRenamed: "профиль переименован",
    renameProfile: "Переименовать профиль",
    developer: "Разработчик",
    developerMode: "Режим разработчика",
    developerModeBody: "Настройки путей видны только в режиме разработчика.",
    managedInstallPath: "GreenLuma будет установлена в папку приложения",
    autoSetup: "Автонастройка и продолжить",
    setupStep: "Подготовка установки",
    setupBody: "Steam будет найден автоматически, GreenLuma установится в папку приложения.",
    close: "Закрыть",
    add: "Добавить",
    remove: "Удалить",
    workspace: "рабочая область"
    ,
    glHealthTitle: "Файлы GreenLuma отсутствуют",
    glHealthBody: "Антивирус мог удалить некоторые файлы GreenLuma. Не забудьте отключить защиту антивируса, затем исправьте проблему.",
    fixIssues: "Исправить проблемы",
    healthOk: "Файлы GreenLuma готовы",
    resetAppData: "Удалить папку GLR_Manager",
    resetAppDataTitle: "Удалить все данные приложения?",
    resetAppDataBody: "Это удалит папку GLR_Manager из %LOCALAPPDATA%. Профили, настройки и установленные файлы GreenLuma будут удалены."
  }
} satisfies Record<Language, Record<string, string>>;

function App() {
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [activeName, setActiveName] = useState("default");
  const [settings, setSettings] = useState<Settings>(fallbackSettings);
  const [searchQuery, setSearchQuery] = useState("");
  const [directAppId, setDirectAppId] = useState("");
  const [profileFilter, setProfileFilter] = useState("");
  const [showDlcs, setShowDlcs] = useState(true);
  const [searchResults, setSearchResults] = useState<AppEntry[]>([]);
  const [newProfileName, setNewProfileName] = useState("");
  const [notice, setNotice] = useState<Notice>({ kind: "info", message: dictionaries[fallbackSettings.language].ready });
  const [isSearching, setSearching] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [isInstalling, setInstalling] = useState(false);
  const [progress, setProgress] = useState<ProgressState>(null);
  const [showAntivirusWarning, setShowAntivirusWarning] = useState(false);
  const [pendingUpdate, setPendingUpdate] = useState<UpdateInfo | null>(null);
  const [skippedUpdateVersionThisSession, setSkippedUpdateVersionThisSession] = useState<string | null>(null);
  const [greenLumaHealth, setGreenLumaHealth] = useState<GreenLumaHealth | null>(null);
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [isRenamingProfile, setRenamingProfile] = useState(false);
  const [renameProfileName, setRenameProfileName] = useState("");

  const t = useMemo(() => dictionaries[settings.language] ?? dictionaries.en, [settings.language]);

  const activeProfile = useMemo(
    () => profiles.find((profile) => profile.name === activeName) ?? profiles[0],
    [profiles, activeName]
  );

  const visibleProfileGames = useMemo(() => {
    const term = profileFilter.trim().toLowerCase();
    return (activeProfile?.games ?? []).filter((game) => {
      if (!showDlcs && game.type === "DLC") return false;
      if (!term) return true;
      return (
        game.name.toLowerCase().includes(term) ||
        game.id.includes(term) ||
        game.type.toLowerCase().includes(term)
      );
    });
  }, [activeProfile, profileFilter, showDlcs]);

  const resultStats = useMemo(() => {
    const games = searchResults.filter((game) => game.type === "Game").length;
    const dlcs = searchResults.filter((game) => game.type === "DLC").length;
    return { games, dlcs };
  }, [searchResults]);

  useEffect(() => {
    void bootstrap();
  }, []);

  useEffect(() => {
    const preventDrop = (event: DragEvent) => {
      event.preventDefault();
      event.stopPropagation();
    };
    window.addEventListener("dragover", preventDrop);
    window.addEventListener("drop", preventDrop);
    return () => {
      window.removeEventListener("dragover", preventDrop);
      window.removeEventListener("drop", preventDrop);
    };
  }, []);

  useEffect(() => {
    if (!settings.onboarding_completed || !settings.greenluma_path) return;
    const timer = window.setTimeout(() => {
      void checkGreenLumaHealth();
    }, 2000);
    return () => window.clearTimeout(timer);
  }, [settings.onboarding_completed, settings.greenluma_path, settings.language]);

  useEffect(() => {
    setRenamingProfile(false);
    setRenameProfileName(activeProfile?.name ?? "");
  }, [activeProfile?.name]);

  function pushNotice(message: string, kind: NoticeKind = "info") {
    setNotice({ kind, message });
  }

  async function bootstrap() {
    try {
      const [loadedSettings, loadedProfiles] = await Promise.all([
        invoke<Settings>("get_settings"),
        invoke<Profile[]>("list_profiles")
      ]);
      const normalizedSettings = {
        ...fallbackSettings,
        ...loadedSettings,
        language: loadedSettings.onboarding_completed
          ? normalizeLanguage(loadedSettings.language)
          : detectSystemLanguage()
      };
      setSettings(normalizedSettings);
      setProfiles(loadedProfiles);
      setActiveName(
        loadedProfiles.some((profile) => profile.name === normalizedSettings.last_profile)
          ? normalizedSettings.last_profile
          : loadedProfiles[0]?.name ?? "default"
      );
      pushNotice(dictionaries[normalizedSettings.language].loaded, "success");
      if (normalizedSettings.check_update) {
        void checkForUpdates(dictionaries[normalizedSettings.language]);
      }
    } catch (error) {
      pushNotice(cleanError(error, t, "app"), "error");
    }
  }

  async function checkForUpdates(labels: Record<string, string>) {
    try {
      const update = await invoke<UpdateInfo>("check_app_update");
      if (!update.available) return;
      if (skippedUpdateVersionThisSession === update.version) return;
      setPendingUpdate(update);
      pushNotice(`${labels.updateAvailable}: ${update.version}`, "info");
    } catch {
      // Hidden update manifests are optional. If no manifest is configured, stay silent.
    }
  }

  function skipPendingUpdate() {
    if (pendingUpdate) {
      setSkippedUpdateVersionThisSession(pendingUpdate.version);
    }
    setPendingUpdate(null);
  }

  async function downloadPendingUpdate() {
    try {
      const filePath = await invoke<string>("download_and_install_app_update");
      setPendingUpdate(null);
      pushNotice(`${t.updateDownloaded}: ${filePath}`, "success");
      await getCurrentWindow().close();
    } catch (error) {
      pushNotice(cleanError(error, t, "update"), "error");
    }
  }

  async function checkGreenLumaHealth(showOkNotice = false) {
    if (!settings.greenluma_path) return false;
    try {
      const health = await invoke<GreenLumaHealth>("check_greenluma_health", {
        path: settings.greenluma_path
      });
      setGreenLumaHealth(health);
      if (!health.ok) {
        pushNotice(`${t.glHealthTitle}: ${health.missing.join(", ")}`, "error");
      } else if (showOkNotice) {
        pushNotice(t.healthOk, "success");
      }
      return health.ok;
    } catch (error) {
      pushNotice(cleanError(error, t, "greenluma"), "error");
      return false;
    }
  }

  async function repairGreenLuma() {
    setProgress({ title: t.fixIssues, step: t.installingGl });
    try {
      const installed = await invoke<string>("repair_managed_greenluma");
      setSettings((current) => ({ ...current, greenluma_path: installed }));
      const health = await invoke<GreenLumaHealth>("check_greenluma_health", { path: installed });
      setGreenLumaHealth(health);
      pushNotice(health.ok ? t.healthOk : `${t.glHealthTitle}: ${health.missing.join(", ")}`, health.ok ? "success" : "error");
    } catch (error) {
      pushNotice(cleanError(error, t, "greenluma"), "error");
    } finally {
      setProgress(null);
    }
  }

  async function resetAppData() {
    try {
      await invoke("reset_app_data");
      await getCurrentWindow().close();
    } catch (error) {
      pushNotice(cleanError(error, t, "app"), "error");
    }
  }

  async function refreshProfiles(nextActive = activeName) {
    const loadedProfiles = await invoke<Profile[]>("list_profiles");
    setProfiles(loadedProfiles);
    if (loadedProfiles.some((profile) => profile.name === nextActive)) {
      setActiveName(nextActive);
    } else {
      setActiveName(loadedProfiles[0]?.name ?? "default");
    }
  }

  async function persistSettings(next: Settings) {
    const saved = await invoke<Settings>("save_settings", { settings: next });
    setSettings(saved);
    return saved;
  }

  async function selectProfile(name: string) {
    setActiveName(name);
    await persistSettings({ ...settings, last_profile: name });
  }

  async function createProfile() {
    const name = newProfileName.trim();
    if (!name) return;
    try {
      await invoke<Profile>("create_profile", { name });
      setNewProfileName("");
      await refreshProfiles(name);
      pushNotice(`${name} ${t.appAdded}`, "success");
    } catch (error) {
      pushNotice(cleanError(error, t, "app"), "error");
    }
  }

  async function deleteProfile(name: string) {
    try {
      await invoke("delete_profile", { name });
      const loadedProfiles = await invoke<Profile[]>("list_profiles");
      const nextActive =
        name === activeName
          ? loadedProfiles[0]?.name ?? "default"
          : activeName;
      setProfiles(loadedProfiles);
      setActiveName(nextActive);
      await persistSettings({ ...settings, last_profile: nextActive });
      pushNotice(`${name} ${t.profileDeleted}`, "success");
    } catch (error) {
      pushNotice(cleanError(error, t, "app"), "error");
    }
  }

  function startRenameProfile() {
    if (!activeProfile) return;
    setRenameProfileName(activeProfile.name);
    setRenamingProfile(true);
  }

  function cancelRenameProfile() {
    setRenameProfileName(activeProfile?.name ?? "");
    setRenamingProfile(false);
  }

  async function submitRenameProfile() {
    if (!activeProfile || !isRenamingProfile) return;
    const newName = renameProfileName.trim();
    if (!newName || newName === activeProfile.name) {
      cancelRenameProfile();
      return;
    }
    try {
      const updated = await invoke<Profile>("rename_profile", {
        oldName: activeProfile.name,
        newName
      });
      setProfiles((items) =>
        items.map((profile) => (profile.name === activeProfile.name ? updated : profile))
      );
      setActiveName(updated.name);
      await persistSettings({ ...settings, last_profile: updated.name });
      setRenamingProfile(false);
      pushNotice(`${updated.name} ${t.profileRenamed}`, "success");
    } catch (error) {
      pushNotice(cleanError(error, t, "app"), "error");
    }
  }

  async function persistGames(games: AppEntry[]) {
    if (!activeProfile) return;
    const updated = await invoke<Profile>("update_profile_games", {
      name: activeProfile.name,
      games
    });
    setProfiles((items) =>
      items.map((profile) => (profile.name === updated.name ? updated : profile))
    );
  }

  async function addGame(game: AppEntry) {
    if (!activeProfile) return;
    if (activeProfile.games.some((entry) => entry.id === game.id)) {
      pushNotice(t.duplicate, "info");
      return;
    }
    await persistGames([...activeProfile.games, game]);
    pushNotice(`${game.name} ${t.appAdded}`, "success");
  }

  async function addDirectAppId() {
    const id = directAppId.trim();
    if (!id) return;
    if (!/^\d+$/.test(id)) {
      pushNotice(t.appIdDigits, "error");
      return;
    }
    await addGame({ id, name: `Manual App ${id}`, type: "Game" });
    setDirectAppId("");
  }

  async function removeGame(id: string) {
    if (!activeProfile) return;
    await persistGames(activeProfile.games.filter((game) => game.id !== id));
    pushNotice(t.removed, "success");
  }

  async function searchApps() {
    if (!searchQuery.trim()) return;
    setSearching(true);
    pushNotice(t.searching, "info");
    try {
      const results = await invoke<AppEntry[]>("search_apps", { query: searchQuery });
      setSearchResults(results);
      pushNotice(
        results.length ? `${results.length} ${t.resultsFound}` : t.noResults,
        results.length ? "success" : "info"
      );
    } catch (error) {
      pushNotice(cleanError(error, t, "steam"), "error");
    } finally {
      setSearching(false);
    }
  }

  async function prepareRuntime() {
    if (!activeProfile) return;
    setProgress({ title: t.prepareRun, step: t.prepareStepAppList });
    try {
      const healthOk = await checkGreenLumaHealth();
      if (!healthOk) return;
      setProgress({ title: t.prepareRun, step: t.prepareStepValidate });
      const result = await invoke<PrepareResult>("prepare_runtime", {
        profile: activeProfile,
        steamPath: settings.steam_path || undefined,
        greenlumaPath: settings.greenluma_path || undefined
      });
      pushNotice(`${result.app_count} AppID - ${t.prepareReady} ${t.prepareManual}`, "success");
      await getCurrentWindow().close();
    } catch (error) {
      pushNotice(cleanError(error, t, "app"), "error");
    } finally {
      setProgress(null);
    }
  }

  async function saveSettings() {
    try {
      await persistSettings(settings);
      setShowSettings(false);
      pushNotice(t.save, "success");
    } catch (error) {
      pushNotice(cleanError(error, t, "app"), "error");
    }
  }

  async function chooseFolder(field: "steam_path" | "greenluma_path") {
    const selected = await open({
      directory: true,
      multiple: false,
      title: field === "steam_path" ? t.steamFolder : t.greenlumaFolder
    });
    if (typeof selected === "string") {
      setSettings((current) => ({ ...current, [field]: selected }));
    }
  }

  async function chooseSteamExe() {
    const selected = await open({
      directory: false,
      multiple: false,
      filters: [{ name: "Steam", extensions: ["exe"] }],
      title: t.chooseSteamExe
    });
    if (typeof selected === "string") {
      await validateAndSetSteam(selected);
    }
  }

  async function validateAndSetSteam(path: string) {
    try {
      const validated = await invoke<string>("validate_steam_path", { path });
      setSettings((current) => ({ ...current, steam_path: validated }));
      pushNotice(t.validSteam, "success");
      return true;
    } catch (error) {
      pushNotice(cleanError(error, t, "app"), "error");
      return false;
    }
  }

  async function validateAndSetGreenLuma(path: string) {
    try {
      const validated = await invoke<string>("validate_greenluma_path", { path });
      setSettings((current) => ({ ...current, greenluma_path: validated }));
      pushNotice(t.validGl, "success");
      return true;
    } catch (error) {
      pushNotice(cleanError(error, t, "app"), "error");
      return false;
    }
  }

  async function installGreenLuma() {
    setInstalling(true);
    pushNotice(t.installingGl, "info");
    try {
      const installed = await invoke<string>("install_managed_greenluma");
      setSettings((current) => ({ ...current, greenluma_path: installed }));
      pushNotice(t.installedGl, "success");
      return true;
    } catch (error) {
      pushNotice(cleanError(error, t, "greenluma"), "error");
      return false;
    } finally {
      setInstalling(false);
    }
  }

  function requestInstallGreenLuma() {
    setShowAntivirusWarning(true);
    return Promise.resolve(false);
  }

  async function confirmInstallGreenLuma() {
    setShowAntivirusWarning(false);
    await installGreenLuma();
  }

  async function autoSetupAndComplete() {
    setProgress({ title: t.autoSetup, step: t.setupStep });
    try {
      const steamPath = await invoke<string>("detect_steam_path");
      pushNotice(t.foundSteam, "success");
      const installed = await invoke<string>("install_managed_greenluma");
      const nextSettings = {
        ...settings,
        steam_path: steamPath,
        greenluma_path: installed,
        onboarding_completed: true
      };
      await persistSettings(nextSettings);
      const localized = await invoke<Profile>("localize_initial_profile", {
        language: nextSettings.language
      });
      await refreshProfiles(localized.name);
      pushNotice(t.installedGl, "success");
    } catch (error) {
      pushNotice(cleanError(error, t, "greenluma"), "error");
    } finally {
      setProgress(null);
    }
  }

  async function completeOnboarding(nextSettings: Settings) {
    try {
      const saved = await persistSettings({ ...nextSettings, onboarding_completed: true });
      const localized = await invoke<Profile>("localize_initial_profile", {
        language: saved.language
      });
      await refreshProfiles(localized.name);
      pushNotice(t.loaded, "success");
    } catch (error) {
      pushNotice(cleanError(error, t, "greenluma"), "error");
    }
  }

  if (!settings.onboarding_completed) {
    return (
      <>
        <Onboarding
          settings={settings}
          setSettings={setSettings}
          t={t}
          notice={notice}
          isInstalling={isInstalling}
          onAutoFindSteam={async () => {
            try {
              const path = await invoke<string>("detect_steam_path");
              setSettings((current) => ({ ...current, steam_path: path }));
              pushNotice(t.foundSteam, "success");
            } catch (error) {
              pushNotice(cleanError(error, t, "app"), "error");
            }
          }}
          onChooseSteamExe={chooseSteamExe}
          onChooseSteamFolder={() => chooseFolder("steam_path")}
          onValidateSteam={() => validateAndSetSteam(settings.steam_path)}
          onChooseGreenLumaFolder={() => chooseFolder("greenluma_path")}
          onValidateGreenLuma={() => validateAndSetGreenLuma(settings.greenluma_path)}
          onInstallGreenLuma={requestInstallGreenLuma}
          onAutoSetup={autoSetupAndComplete}
          onComplete={() => completeOnboarding(settings)}
        />
        {showAntivirusWarning && (
          <ConfirmModal
            title={t.antivirusTitle}
            body={t.antivirusWarning}
            confirmLabel={t.proceed}
            cancelLabel={t.cancel}
            onConfirm={() => void confirmInstallGreenLuma()}
            onCancel={() => setShowAntivirusWarning(false)}
          />
        )}
        {progress && <ProgressOverlay progress={progress} />}
        {pendingUpdate && (
          <ConfirmModal
            title={`${t.updateAvailable}: ${pendingUpdate.version}`}
            body={pendingUpdate.notes || pendingUpdate.url}
            confirmLabel={t.downloadUpdate}
            cancelLabel={t.skip}
            onConfirm={() => void downloadPendingUpdate()}
            onCancel={skipPendingUpdate}
          />
        )}
      </>
    );
  }

  return (
    <main className="min-h-screen overflow-hidden bg-[#080a0d] text-slate-100">
      <div className="grid h-screen grid-cols-[86px_minmax(0,1fr)]">
        <aside className="flex flex-col items-center gap-5 border-r border-white/[0.07] bg-[#0b0e12] px-3 py-5">
          <img src={logoUrl} alt="GL" className="h-12 w-12 rounded-md border border-white/10 object-cover shadow-deck" />
          <div className="flex-1" />
          <RailButton
            icon={<SettingsIcon size={20} />}
            label={t.settings}
            onClick={() => setShowSettings(true)}
          />
        </aside>

        <section className="grid min-h-0 grid-rows-[auto_minmax(0,1fr)_auto]">
          <header className="flex items-center justify-between gap-5 border-b border-white/[0.07] bg-[#0d1116] px-7 py-5">
            <div>
              <div className="mb-2 flex items-center gap-2 text-xs font-bold uppercase tracking-[0.22em] text-lime-300/75">
                <Sparkles size={15} />
                {t.title}
              </div>
              <div className="flex items-center gap-2">
                {isRenamingProfile ? (
                  <input
                    value={renameProfileName}
                    autoFocus
                    onChange={(event) => setRenameProfileName(event.target.value)}
                    onBlur={(event) => {
                      if (event.currentTarget.dataset.cancelled === "true") return;
                      void submitRenameProfile();
                    }}
                    onKeyDown={(event) => {
                      if (event.key === "Enter") void submitRenameProfile();
                      if (event.key === "Escape") {
                        event.currentTarget.dataset.cancelled = "true";
                        cancelRenameProfile();
                      }
                    }}
                    className="h-10 min-w-[240px] rounded-md border border-lime-300/30 bg-[#151a1f] px-3 text-2xl font-bold text-white outline-none ring-2 ring-lime-300/10"
                  />
                ) : (
                  <>
                    <h1 className="text-3xl font-bold tracking-normal text-white">
                      {activeProfile?.name ?? t.noProfile}
                    </h1>
                    {activeProfile && (
                      <button
                        className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-white/[0.08] bg-[#151a1f] text-slate-300 transition hover:border-lime-300/30 hover:text-lime-200"
                        onClick={startRenameProfile}
                        title={t.renameProfile}
                        aria-label={t.renameProfile}
                      >
                        <Pencil size={15} />
                      </button>
                    )}
                  </>
                )}
              </div>
            </div>
            <div className="flex items-center gap-3">
              {pendingUpdate && (
                <button
                  className="inline-flex h-10 items-center rounded-md border border-lime-300/25 bg-lime-300/10 px-3 text-xs font-bold uppercase tracking-[0.14em] text-lime-200 transition hover:bg-lime-300/15"
                  onClick={() => pushNotice(`${t.updateAvailable}: ${pendingUpdate.version}`, "info")}
                >
                  {t.updatePill}
                </button>
              )}
              <StatPill label="AppID" value={activeProfile?.games.length ?? 0} />
              <button
                className="inline-flex h-10 items-center gap-2 rounded-md border border-white/[0.09] bg-[#151a1f] px-4 text-sm font-bold text-slate-200 transition hover:border-red-300/25 hover:bg-red-400/10 hover:text-red-100"
                onClick={() => activeProfile && void deleteProfile(activeProfile.name)}
              >
                <Trash2 size={16} />
                {t.deleteProfile}
              </button>
              <button
                className="inline-flex h-10 items-center gap-2 rounded-md bg-lime-400 px-4 text-sm font-bold text-[#081006] transition hover:bg-lime-300"
                onClick={() => void prepareRuntime()}
              >
                <Play size={16} />
                {t.prepareRun}
              </button>
            </div>
          </header>

          <div className="grid min-h-0 grid-cols-[300px_minmax(0,1fr)_410px] gap-4 bg-[#080a0d] p-5">
            <ProfilePanel
              profiles={profiles}
              activeName={activeName}
              newProfileName={newProfileName}
              setNewProfileName={setNewProfileName}
              onCreate={() => void createProfile()}
              onSelect={(name) => void selectProfile(name)}
              t={t}
            />

            <section className="flex min-h-0 flex-col rounded-lg border border-white/[0.08] bg-[#101418] shadow-deck">
              <PanelHeader
                icon={<Gamepad2 size={18} />}
                title={t.profileList}
                subtitle={`${visibleProfileGames.length} ${t.shown}`}
              />
              <div className="grid grid-cols-[1fr_auto] gap-3 border-b border-white/[0.07] px-4 pb-4">
                <div className="flex h-10 items-center gap-2 rounded-md border border-white/[0.06] bg-[#151a1f] px-3">
                  <Search size={16} className="text-slate-400" />
                  <input
                    value={profileFilter}
                    onChange={(event) => setProfileFilter(event.target.value)}
                    placeholder={t.searchInProfile}
                    className="min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-slate-500"
                  />
                </div>
                <button
                  className={cn(
                    "h-10 rounded-md px-3 text-xs font-bold transition",
                    showDlcs ? "bg-lime-400 text-[#081006]" : "bg-[#151a1f] text-slate-300"
                  )}
                  onClick={() => setShowDlcs((value) => !value)}
                >
                  DLC
                </button>
              </div>
              <div className="min-h-0 flex-1 overflow-auto p-3">
                {visibleProfileGames.length ? (
                  <div className="grid gap-2">
                    {visibleProfileGames.map((game) => (
                      <AppRow
                        key={game.id}
                        game={game}
                        trailing={
                          <button
                            title={t.remove}
                            className="grid h-8 w-8 place-items-center rounded-md bg-[#151a1f] text-slate-300 transition hover:bg-red-400/15 hover:text-red-200"
                            onClick={() => void removeGame(game.id)}
                          >
                            <X size={15} />
                          </button>
                        }
                      />
                    ))}
                  </div>
                ) : (
                  <EmptyState icon={<Library size={24} />} title={t.noApps} body={t.noAppsBody} />
                )}
              </div>
            </section>

            <section className="flex min-h-0 flex-col rounded-lg border border-white/[0.08] bg-[#101418] shadow-deck">
              <PanelHeader
                icon={<Search size={18} />}
                title={t.steamSearch}
                subtitle={`${resultStats.games} ${t.games} - ${resultStats.dlcs} DLC`}
              />
              <div className="space-y-3 border-b border-white/[0.07] px-4 pb-4">
                <div className="flex h-11 items-center gap-2 rounded-md border border-white/[0.06] bg-[#151a1f] px-3">
                  <Search size={17} className="text-lime-300" />
                  <input
                    value={searchQuery}
                    onChange={(event) => setSearchQuery(event.target.value)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter") void searchApps();
                    }}
                    placeholder={t.searchGame}
                    className="min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-slate-500"
                  />
                  <button
                    className="h-8 rounded-md bg-lime-400 px-4 text-xs font-bold text-[#081006]"
                    onClick={() => void searchApps()}
                  >
                    {t.search}
                  </button>
                </div>
                <div className="flex h-10 items-center gap-2 rounded-md border border-white/[0.05] bg-[#12171c] px-3">
                  <Copy size={16} className="text-slate-400" />
                  <input
                    value={directAppId}
                    onChange={(event) => setDirectAppId(event.target.value)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter") void addDirectAppId();
                    }}
                    placeholder={t.directAdd}
                    className="min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-slate-500"
                  />
                  <button
                    className="grid h-8 w-8 place-items-center rounded-md bg-[#1a2026] text-slate-100"
                    onClick={() => void addDirectAppId()}
                    title={t.directAdd}
                  >
                    <Plus size={15} />
                  </button>
                </div>
              </div>
              <div className="min-h-0 flex-1 overflow-auto p-3">
                {isSearching ? (
                  <div className="grid h-full min-h-[260px] place-items-center">
                    <div className="text-center">
                      <GooeyLoader
                        className="mb-5"
                        primaryColor="#a3e635"
                        secondaryColor="#fcd34d"
                        borderColor="rgba(255,255,255,0.18)"
                      />
                      <p className="text-sm font-bold text-slate-300">{t.scanning}</p>
                    </div>
                  </div>
                ) : searchResults.length ? (
                  <div className="grid gap-2">
                    {searchResults.map((game) => (
                      <AppRow
                        key={`${game.type}-${game.id}`}
                        game={game}
                        trailing={
                          <button
                            title={t.add}
                            className="grid h-8 w-8 place-items-center rounded-md bg-lime-400 text-[#081006] transition hover:bg-lime-300"
                            onClick={() => void addGame(game)}
                          >
                            <Plus size={15} />
                          </button>
                        }
                      />
                    ))}
                  </div>
                ) : (
                  <EmptyState icon={<Search size={24} />} title={t.waitingResults} body={t.waitingBody} />
                )}
              </div>
            </section>
          </div>

          {greenLumaHealth && !greenLumaHealth.ok && (
            <HealthBanner health={greenLumaHealth} t={t} onRepair={() => void repairGreenLuma()} />
          )}

          <footer className="grid grid-cols-[1fr_auto] items-center gap-4 border-t border-white/[0.07] bg-[#0d1116] px-5 py-3">
            <NoticeBar notice={notice} />
            <div className="flex items-center gap-2 text-xs text-slate-400">
              <ShieldCheck size={15} className="text-lime-300" />
              {settings.greenluma_path ? t.managedInstallPath : `${t.target}: ${t.unselected}`}
            </div>
          </footer>
        </section>
      </div>

      {showSettings && (
        <SettingsModal
          settings={settings}
          setSettings={setSettings}
          t={t}
          onClose={() => setShowSettings(false)}
          onSave={() => void saveSettings()}
          onChooseFolder={(field) => void chooseFolder(field)}
          onResetAppData={() => setShowResetConfirm(true)}
        />
      )}

      {progress && <ProgressOverlay progress={progress} />}

      {showAntivirusWarning && (
        <ConfirmModal
          title={t.antivirusTitle}
          body={t.antivirusWarning}
          confirmLabel={t.proceed}
          cancelLabel={t.cancel}
          onConfirm={() => void confirmInstallGreenLuma()}
          onCancel={() => setShowAntivirusWarning(false)}
        />
      )}

      {pendingUpdate && (
        <ConfirmModal
          title={`${t.updateAvailable}: ${pendingUpdate.version}`}
          body={pendingUpdate.notes || pendingUpdate.url}
          confirmLabel={t.downloadUpdate}
          cancelLabel={t.skip}
          onConfirm={() => void downloadPendingUpdate()}
          onCancel={skipPendingUpdate}
        />
      )}

      {showResetConfirm && (
        <ConfirmModal
          title={t.resetAppDataTitle}
          body={t.resetAppDataBody}
          confirmLabel={t.resetAppData}
          cancelLabel={t.cancel}
          onConfirm={() => void resetAppData()}
          onCancel={() => setShowResetConfirm(false)}
        />
      )}
    </main>
  );
}

function Onboarding({
  settings,
  setSettings,
  t,
  notice,
  isInstalling,
  onAutoFindSteam,
  onChooseSteamExe,
  onChooseSteamFolder,
  onValidateSteam,
  onChooseGreenLumaFolder,
  onValidateGreenLuma,
  onInstallGreenLuma,
  onAutoSetup,
  onComplete
}: {
  settings: Settings;
  setSettings: React.Dispatch<React.SetStateAction<Settings>>;
  t: Record<string, string>;
  notice: Notice;
  isInstalling: boolean;
  onAutoFindSteam: () => void;
  onChooseSteamExe: () => void;
  onChooseSteamFolder: () => void;
  onValidateSteam: () => Promise<boolean>;
  onChooseGreenLumaFolder: () => void;
  onValidateGreenLuma: () => Promise<boolean>;
  onInstallGreenLuma: () => Promise<boolean>;
  onAutoSetup: () => Promise<void>;
  onComplete: () => void;
}) {
  const [step, setStep] = useState(0);

  return (
    <main className="grid min-h-screen place-items-center bg-[#080a0d] p-8 text-slate-100">
      <section className="grid w-full max-w-5xl grid-cols-[320px_minmax(0,1fr)] overflow-hidden rounded-lg border border-white/[0.08] bg-[#101418] shadow-deck">
        <div className="grid place-items-center border-r border-white/[0.07] bg-[#0b0e12] p-8">
          <img src={logoUrl} alt="Harman" className="w-full max-w-[220px] rounded-lg border border-white/10 object-cover shadow-deck" />
        </div>
        <div className="p-8">
          <div className="mb-6 flex items-center gap-2 text-xs font-bold uppercase tracking-[0.22em] text-lime-300/80">
            <Sparkles size={15} />
            GreenLuma Manager Next
          </div>

          {step === 0 && (
            <div className="space-y-6">
              <div>
                <h1 className="text-4xl font-bold text-white">{t.welcomeTitle}</h1>
                <p className="mt-4 max-w-2xl text-base leading-7 text-slate-300">{t.welcomeBody}</p>
              </div>
              <LanguageSelect
                value={settings.language}
                onChange={(language) => setSettings((current) => ({ ...current, language }))}
                t={t}
              />
              <button
                className="inline-flex h-11 items-center gap-2 rounded-md bg-lime-400 px-5 text-sm font-bold text-[#081006]"
                onClick={() => void onAutoSetup()}
              >
                <Wand2 size={17} />
                {t.autoSetup}
              </button>
              <button
                className="ml-3 inline-flex h-11 items-center gap-2 rounded-md border border-white/[0.08] bg-[#151a1f] px-5 text-sm font-bold text-slate-200"
                onClick={() => setStep(1)}
              >
                {t.developer}
              </button>
            </div>
          )}

          {step === 1 && (
            <WizardStep
              title={t.steamStep}
              body={t.steamStepBody}
              value={settings.steam_path}
              placeholder={t.steamFolder}
              onChange={(value) => setSettings((current) => ({ ...current, steam_path: value }))}
              primaryLabel={t.autoFind}
              onPrimary={onAutoFindSteam}
              secondaryLabel={t.chooseSteamExe}
              onSecondary={onChooseSteamExe}
              tertiaryLabel={t.chooseFolder}
              onTertiary={onChooseSteamFolder}
              nextLabel={t.continue}
              backLabel={t.back}
              onBack={() => setStep(0)}
              onNext={async () => {
                if (await onValidateSteam()) setStep(2);
              }}
            />
          )}

          {step === 2 && (
            <WizardStep
              title={t.greenlumaStep}
              body={t.managedInstallPath}
              value={settings.greenluma_path}
              placeholder={t.greenlumaFolder}
              onChange={(value) => setSettings((current) => ({ ...current, greenluma_path: value }))}
              primaryLabel={isInstalling ? "..." : t.autoInstall}
              onPrimary={onInstallGreenLuma}
              secondaryLabel={t.chooseFolder}
              onSecondary={onChooseGreenLumaFolder}
              nextLabel={t.finish}
              backLabel={t.back}
              onBack={() => setStep(1)}
              onNext={async () => {
                if (await onValidateGreenLuma()) onComplete();
              }}
            />
          )}

          <div className="mt-8">
            <NoticeBar notice={notice} />
          </div>
        </div>
      </section>
    </main>
  );
}

function WizardStep({
  title,
  body,
  value,
  placeholder,
  onChange,
  primaryLabel,
  onPrimary,
  secondaryLabel,
  onSecondary,
  tertiaryLabel,
  onTertiary,
  nextLabel,
  backLabel,
  onBack,
  onNext
}: {
  title: string;
  body: string;
  value: string;
  placeholder: string;
  onChange: (value: string) => void;
  primaryLabel: string;
  onPrimary: () => void;
  secondaryLabel: string;
  onSecondary: () => void;
  tertiaryLabel?: string;
  onTertiary?: () => void;
  nextLabel: string;
  backLabel?: string;
  onBack?: () => void;
  onNext: () => void;
}) {
  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-3xl font-bold text-white">{title}</h1>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-300">{body}</p>
      </div>
      <div className="flex h-11 items-center gap-2 rounded-md border border-white/[0.06] bg-[#151a1f] px-3">
        <FolderOpen size={17} className="text-slate-400" />
        <input
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder={placeholder}
          className="min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-slate-500"
        />
      </div>
      <div className="flex flex-wrap gap-3">
        <button className="h-10 rounded-md bg-lime-400 px-4 text-sm font-bold text-[#081006]" onClick={onPrimary}>
          {primaryLabel}
        </button>
        <button className="h-10 rounded-md border border-white/[0.08] bg-[#151a1f] px-4 text-sm font-bold text-slate-200" onClick={onSecondary}>
          {secondaryLabel}
        </button>
        {tertiaryLabel && onTertiary && (
          <button className="h-10 rounded-md border border-white/[0.08] bg-[#151a1f] px-4 text-sm font-bold text-slate-200" onClick={onTertiary}>
            {tertiaryLabel}
          </button>
        )}
        {backLabel && onBack && (
          <button className="h-10 rounded-md border border-white/[0.08] bg-[#151a1f] px-4 text-sm font-bold text-slate-200" onClick={onBack}>
            {backLabel}
          </button>
        )}
        <button className="ml-auto h-10 rounded-md bg-lime-400 px-5 text-sm font-bold text-[#081006]" onClick={onNext}>
          {nextLabel}
        </button>
      </div>
    </div>
  );
}

function ProfilePanel({
  profiles,
  activeName,
  newProfileName,
  setNewProfileName,
  onCreate,
  onSelect,
  t
}: {
  profiles: Profile[];
  activeName: string;
  newProfileName: string;
  setNewProfileName: (value: string) => void;
  onCreate: () => void;
  onSelect: (name: string) => void;
  t: Record<string, string>;
}) {
  return (
    <section className="flex min-h-0 flex-col rounded-lg border border-white/[0.08] bg-[#101418] shadow-deck">
      <PanelHeader
        icon={<Layers3 size={18} />}
        title={t.profileList}
        subtitle={`${profiles.length} ${t.workspace}`}
      />
      <div className="min-h-0 flex-1 overflow-auto px-3 pb-3">
        <div className="grid gap-2">
          {profiles.map((profile) => (
            <button
              key={profile.name}
              className={cn(
                "flex items-center justify-between rounded-md px-3 py-3 text-left transition",
                profile.name === activeName
                  ? "bg-lime-400 text-[#081006]"
                  : "bg-[#151a1f] text-slate-200 hover:bg-[#1a2026]"
              )}
              onClick={() => onSelect(profile.name)}
            >
              <span className="truncate text-sm font-bold">{profile.name}</span>
              <span className="rounded bg-black/20 px-2 py-1 text-xs font-bold">
                {profile.games.length}
              </span>
            </button>
          ))}
        </div>
      </div>
      <div className="border-t border-white/[0.07] p-3">
        <div className="flex h-10 items-center gap-2 rounded-md border border-white/[0.06] bg-[#151a1f] px-3">
          <input
            value={newProfileName}
            onChange={(event) => setNewProfileName(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") onCreate();
            }}
            placeholder={t.newProfile}
            className="min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-slate-500"
          />
          <button
            className="grid h-8 w-8 place-items-center rounded-md bg-lime-400 text-[#081006]"
            title={t.createProfile}
            onClick={onCreate}
          >
            <Plus size={15} />
          </button>
        </div>
      </div>
    </section>
  );
}

function PanelHeader({
  icon,
  title,
  subtitle,
  action
}: {
  icon: React.ReactNode;
  title: string;
  subtitle: string;
  action?: React.ReactNode;
}) {
  return (
    <header className="flex items-center justify-between gap-3 px-4 py-4">
      <div className="flex min-w-0 items-center gap-3">
        <div className="grid h-9 w-9 place-items-center rounded-md bg-[#151a1f] text-lime-300">
          {icon}
        </div>
        <div className="min-w-0">
          <h2 className="truncate text-base font-bold text-white">{title}</h2>
          <p className="mt-0.5 truncate text-xs font-medium text-slate-400">{subtitle}</p>
        </div>
      </div>
      {action}
    </header>
  );
}

function AppRow({ game, trailing }: { game: AppEntry; trailing: React.ReactNode }) {
  return (
    <article className="grid grid-cols-[1fr_auto] items-center gap-3 rounded-md border border-white/[0.06] bg-[#12171c] px-3 py-2.5 transition hover:border-white/[0.1] hover:bg-[#171d23]">
      <div className="min-w-0">
        <div className="truncate text-sm font-bold text-slate-100">{game.name}</div>
        <div className="mt-1 flex items-center gap-2 text-xs text-slate-400">
          <span className="rounded bg-[#1d242b] px-2 py-0.5 font-bold text-slate-300">{game.type}</span>
          <span>{game.id}</span>
        </div>
      </div>
      {trailing}
    </article>
  );
}

function EmptyState({ icon, title, body }: { icon: React.ReactNode; title: string; body: string }) {
  return (
    <div className="grid h-full min-h-[240px] place-items-center rounded-lg border border-dashed border-white/[0.1] bg-[#0d1116] p-6 text-center">
      <div>
        <div className="mx-auto mb-4 grid h-12 w-12 place-items-center rounded-md bg-[#151a1f] text-lime-300">
          {icon}
        </div>
        <h3 className="text-sm font-bold text-white">{title}</h3>
        <p className="mx-auto mt-2 max-w-[260px] text-sm leading-6 text-slate-400">{body}</p>
      </div>
    </div>
  );
}

function HealthBanner({
  health,
  t,
  onRepair
}: {
  health: GreenLumaHealth;
  t: Record<string, string>;
  onRepair: () => void;
}) {
  return (
    <div className="border-t border-amber-300/15 bg-amber-300/[0.08] px-5 py-3">
      <div className="flex items-center justify-between gap-4 rounded-md border border-amber-300/20 bg-[#151a1f] px-4 py-3">
        <div className="flex min-w-0 items-start gap-3">
          <AlertCircle size={20} className="mt-0.5 shrink-0 text-amber-200" />
          <div className="min-w-0">
            <div className="text-sm font-bold text-amber-100">{t.glHealthTitle}</div>
            <p className="mt-1 text-sm leading-5 text-slate-300">{t.glHealthBody}</p>
            <p className="mt-1 truncate text-xs font-bold text-amber-100/80">
              {health.missing.join(", ")}
            </p>
          </div>
        </div>
        <button
          className="h-10 shrink-0 rounded-md bg-amber-300 px-4 text-sm font-bold text-slate-950"
          onClick={onRepair}
        >
          {t.fixIssues}
        </button>
      </div>
    </div>
  );
}

function NoticeBar({ notice }: { notice: Notice }) {
  const Icon =
    notice.kind === "success" ? CheckCircle2 : notice.kind === "error" ? AlertCircle : RotateCcw;
  return (
    <div
      className={cn(
        "flex min-w-0 items-center gap-2 rounded-md border px-3 py-2 text-sm font-bold",
        notice.kind === "success" && "border-lime-300/15 bg-lime-300/10 text-lime-100",
        notice.kind === "error" && "bg-red-400/12 text-red-100",
        notice.kind === "info" && "border-white/[0.06] bg-[#151a1f] text-slate-200"
      )}
    >
      <Icon size={16} />
      <span className="truncate">{notice.message}</span>
    </div>
  );
}

function ProgressOverlay({ progress }: { progress: NonNullable<ProgressState> }) {
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/75 p-6 backdrop-blur">
      <section className="grid w-full max-w-sm place-items-center rounded-lg border border-white/[0.08] bg-[#101418] p-6 text-center shadow-deck">
        <GooeyLoader
          className="mb-5"
          primaryColor="#a3e635"
          secondaryColor="#fcd34d"
          borderColor="rgba(255,255,255,0.18)"
        />
        <h2 className="text-lg font-bold text-white">{progress.title}</h2>
        <p className="mt-2 text-sm font-bold text-slate-300">{progress.step}</p>
      </section>
    </div>
  );
}

function ConfirmModal({
  title,
  body,
  confirmLabel,
  cancelLabel,
  onConfirm,
  onCancel
}: {
  title: string;
  body: string;
  confirmLabel: string;
  cancelLabel: string;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  return (
    <div className="fixed inset-0 z-[60] grid place-items-center bg-black/75 p-6 backdrop-blur">
      <section className="w-full max-w-lg rounded-lg border border-amber-300/20 bg-[#101418] p-5 shadow-deck">
        <div className="flex items-start gap-3">
          <div className="grid h-10 w-10 shrink-0 place-items-center rounded-md bg-amber-300/15 text-amber-200">
            <AlertCircle size={20} />
          </div>
          <div className="min-w-0">
            <h2 className="text-lg font-bold text-white">{title}</h2>
            <p className="mt-2 text-sm leading-6 text-slate-300">{body}</p>
          </div>
        </div>
        <footer className="mt-5 flex justify-end gap-3">
          <button
            className="h-10 rounded-md border border-white/[0.08] bg-[#151a1f] px-4 text-sm font-bold text-slate-200"
            onClick={onCancel}
          >
            {cancelLabel}
          </button>
          <button
            className="h-10 rounded-md bg-amber-300 px-4 text-sm font-bold text-slate-950"
            onClick={onConfirm}
          >
            {confirmLabel}
          </button>
        </footer>
      </section>
    </div>
  );
}

function SettingsModal({
  settings,
  setSettings,
  t,
  onClose,
  onSave,
  onChooseFolder,
  onResetAppData
}: {
  settings: Settings;
  setSettings: React.Dispatch<React.SetStateAction<Settings>>;
  t: Record<string, string>;
  onClose: () => void;
  onSave: () => void;
  onChooseFolder: (field: "steam_path" | "greenluma_path") => void;
  onResetAppData: () => void;
}) {
  const [developerMode, setDeveloperMode] = useState(false);

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/75 p-6 backdrop-blur">
      <section className="w-full max-w-2xl rounded-lg border border-white/[0.08] bg-[#101418] p-5 shadow-deck">
        <header className="mb-5 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-white">{t.settings}</h2>
            <p className="mt-1 text-sm text-slate-400">{t.settingsBody}</p>
          </div>
          <button
            title={t.close}
            className="grid h-9 w-9 place-items-center rounded-md bg-[#151a1f] text-slate-200"
            onClick={onClose}
          >
            <X size={17} />
          </button>
        </header>

        <div className="grid gap-4">
          <LanguageSelect
            value={settings.language}
            onChange={(language) => setSettings((current) => ({ ...current, language }))}
            t={t}
          />
          <div className="rounded-md border border-white/[0.07] bg-[#12171c] p-3">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h3 className="text-sm font-bold text-white">{t.developerMode}</h3>
                <p className="mt-1 text-xs leading-5 text-slate-400">{t.developerModeBody}</p>
              </div>
              <button
                type="button"
                className={cn(
                  "h-9 rounded-md px-3 text-xs font-bold transition",
                  developerMode ? "bg-amber-300 text-slate-950" : "bg-[#1a2026] text-slate-100"
                )}
                onClick={() => setDeveloperMode((value) => !value)}
              >
                {t.developer}
              </button>
            </div>
          </div>
          {developerMode && (
            <>
              <PathField
                label={t.steamFolder}
                value={settings.steam_path}
                onChange={(value) => setSettings((current) => ({ ...current, steam_path: value }))}
                onBrowse={() => onChooseFolder("steam_path")}
                t={t}
              />
              <PathField
                label={t.greenlumaFolder}
                value={settings.greenluma_path}
                onChange={(value) =>
                  setSettings((current) => ({ ...current, greenluma_path: value }))
                }
                onBrowse={() => onChooseFolder("greenluma_path")}
                t={t}
              />
              <button
                type="button"
                className="h-10 rounded-md border border-red-300/20 bg-red-400/10 px-4 text-sm font-bold text-red-100 transition hover:bg-red-400/15"
                onClick={onResetAppData}
              >
                {t.resetAppData}
              </button>
            </>
          )}
          <label className="flex items-center gap-3 rounded-md border border-white/[0.06] bg-[#12171c] px-3 py-3 text-sm font-bold text-slate-200">
            <input
              type="checkbox"
              checked={settings.check_update}
              onChange={(event) =>
                setSettings((current) => ({ ...current, check_update: event.target.checked }))
              }
            />
            {t.rememberUpdates}
          </label>
        </div>

        <footer className="mt-5 flex justify-end gap-3">
          <button
            className="h-10 rounded-md border border-white/[0.08] bg-[#151a1f] px-4 text-sm font-bold text-slate-200"
            onClick={onClose}
          >
            {t.cancel}
          </button>
          <button
            className="inline-flex h-10 items-center gap-2 rounded-md bg-lime-400 px-4 text-sm font-bold text-[#081006]"
            onClick={onSave}
          >
            <Save size={16} />
            {t.save}
          </button>
        </footer>
      </section>
    </div>
  );
}

function PathField({
  label,
  value,
  onChange,
  onBrowse,
  t
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  onBrowse: () => void;
  t: Record<string, string>;
}) {
  return (
    <label className="grid gap-2 text-sm font-bold text-slate-200">
      {label}
      <div className="flex h-11 items-center gap-2 rounded-md border border-white/[0.06] bg-[#151a1f] px-3">
        <FolderOpen size={17} className="text-slate-400" />
        <input
          value={value}
          onChange={(event) => onChange(event.target.value)}
          className="min-w-0 flex-1 bg-transparent text-sm font-medium outline-none placeholder:text-slate-500"
          placeholder={t.folderPath}
        />
        <button
          type="button"
          className="h-8 rounded-md bg-[#1a2026] px-3 text-xs font-bold text-slate-100"
          onClick={onBrowse}
        >
          {t.browse}
        </button>
      </div>
    </label>
  );
}

function LanguageSelect({
  value,
  onChange,
  t
}: {
  value: Language;
  onChange: (value: Language) => void;
  t: Record<string, string>;
}) {
  return (
    <label className="grid gap-2 text-sm font-bold text-slate-200">
      {t.language}
      <div className="flex h-11 items-center gap-2 rounded-md border border-white/[0.06] bg-[#151a1f] px-3">
        <Globe2 size={17} className="text-slate-400" />
        <select
          value={value}
          onChange={(event) => onChange(normalizeLanguage(event.target.value))}
          className="carbon-select min-w-0 flex-1 bg-transparent text-sm font-bold text-slate-100 outline-none"
        >
          <option value="tr">Türkçe</option>
          <option value="en">English</option>
          <option value="zh">中文</option>
          <option value="ru">Русский</option>
        </select>
      </div>
    </label>
  );
}

function RailButton({
  icon,
  label,
  onClick
}: {
  icon: React.ReactNode;
  label: string;
  onClick?: () => void;
}) {
  return (
    <button
      title={label}
      className="grid h-12 w-12 place-items-center rounded-md border border-white/[0.08] bg-[#151a1f] text-slate-300 transition hover:border-lime-300/25 hover:bg-[#1a2026] hover:text-lime-200"
      onClick={onClick}
    >
      {icon}
    </button>
  );
}

function StatPill({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-md border border-white/[0.08] bg-[#151a1f] px-3 py-2 text-right">
      <div className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-400">{label}</div>
      <div className="text-base font-bold text-white">{value}</div>
    </div>
  );
}

type ErrorContext = "app" | "steam" | "update" | "greenluma";

function cleanError(error: unknown, t: Record<string, string>, context: ErrorContext = "app") {
  const message = String(error);
  const lowerMessage = message.toLowerCase();
  if (message.includes("Target path is not configured")) return t.exportTargetMissing;
  if (
    message.includes("429") ||
    lowerMessage.includes("too many downloads") ||
    lowerMessage.includes("too many requests")
  ) {
    return t.rateLimitError;
  }
  if (
    message.includes("404") ||
    lowerMessage.includes("file not found") ||
    lowerMessage.includes("not found")
  ) {
    return t.fileNotFoundError;
  }
  if (message.includes("Network request failed")) {
    if (context === "steam") return t.steamNetworkError;
    if (context === "update") return t.updateNetworkError;
    if (context === "greenluma") return t.greenlumaNetworkError;
    return t.networkGenericError;
  }
  if (message.includes("invalid Zip archive") || message.includes("ZIP extraction failed")) {
    return t.greenlumaNetworkError;
  }
  if (message.includes("last remaining profile cannot be deleted")) return t.lastProfileDelete;
  if (message.includes("default profile cannot be deleted")) return t.defaultDelete;
  if (message.includes("Steam installation could not be detected")) return t.steamNotFound;
  if (message.includes("Steam.exe")) return t.invalidSteam;
  if (message.includes("DLLInjector.ini")) return "DLLInjector.ini bulunamadı";
  if (message.includes("Required GreenLuma files are missing")) return t.glHealthTitle;
  if (message.includes("x64 DLL")) return "GreenLuma x64 DLL bulunamadı";
  if (message.includes("GreenLuma")) return t.invalidGl;
  if (message.includes("download URL")) return t.missingUrl;
  return message;
}

function detectSystemLanguage(): Language {
  const language = navigator.language.toLowerCase();
  if (language.startsWith("tr")) return "tr";
  if (language.startsWith("zh")) return "zh";
  if (language.startsWith("ru")) return "ru";
  return "en";
}

function normalizeLanguage(value: string): Language {
  if (value === "tr" || value === "zh" || value === "en" || value === "ru") return value;
  return detectSystemLanguage();
}

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
