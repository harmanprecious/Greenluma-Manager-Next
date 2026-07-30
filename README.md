# Greenluma Manager Next By Harman

[English](#english) - [Türkçe](#turkce) - [中文](#中文) - [Русский](#русский)

## English

Modern Tauri + React desktop manager with profile-based AppID list management, Steam Store search, onboarding, multilingual UI, managed update checks, and a private download worker flow.

### Latest Release

**Version:** `1.0.1`

**Download:** [Greenluma Manager Next By Harman latest setup](https://worker.glnbyharman.workers.dev/manager/download)

### What's New In 1.0.1

- Improved startup and network error messages.
- Separated Steam, update server, GreenLuma package, rate limit, and missing file errors.
- GreenLuma download now reports HTTP errors clearly before ZIP extraction.
- Manager downloads now use a stable `latest.exe` object behind the private worker.

### Features

- Profile create, delete, select, and rename.
- Steam Store search with AppID result loading.
- Direct AppID add.
- AppList preparation flow.
- GreenLuma health checks with repair prompts.
- Onboarding wizard with Steam auto-detect.
- Turkish, English, Chinese, and Russian UI language support.
- Carbon Lime desktop theme.
- Update prompt with skip/download flow.

### Public Repository Scope

This repository contains the public app source code.

Included:

- Tauri/React app source
- Rust backend source
- Build configuration
- Public documentation

Not included:

- Private Cloudflare Worker source
- Rate limit implementation details
- Environment files or secrets
- Built installers
- `node_modules`, `dist`, or Rust `target` output

### Development

```powershell
cd gl-manager-next
npm install
npm run tauri dev
```

For production builds:

```powershell
cd gl-manager-next
npm run tauri build
```

## Türkçe

Profil tabanlı AppID liste yönetimi, Steam Store araması, ilk kurulum sihirbazı, çok dilli arayüz, yönetilen güncelleme kontrolü ve özel indirme worker akışı olan modern Tauri + React masaüstü yöneticisi.

### Son Sürüm

**Sürüm:** `1.0.1`

**İndir:** [Greenluma Manager Next By Harman son kurulum dosyası](https://worker.glnbyharman.workers.dev/manager/download)

### 1.0.1 Yenilikleri

- Açılış ve ağ hata mesajları iyileştirildi.
- Steam, güncelleme sunucusu, GreenLuma paketi, indirme limiti ve eksik dosya hataları ayrıştırıldı.
- GreenLuma indirme akışı ZIP çıkarma işleminden önce HTTP hatalarını daha net raporlar.
- Manager indirmeleri özel worker arkasında sabit `latest.exe` objesini kullanır.

### Özellikler

- Profil oluşturma, silme, seçme ve yeniden adlandırma.
- AppID sonucu yükleyen Steam Store araması.
- AppID ile doğrudan ekleme.
- AppList hazırlama akışı.
- Onarım uyarılarıyla GreenLuma dosya kontrolü.
- Steam otomatik bulma destekli ilk kurulum sihirbazı.
- Türkçe, İngilizce, Çince ve Rusça arayüz desteği.
- Carbon Lime masaüstü teması.
- Atla/indir akışına sahip güncelleme uyarısı.

### Public Repo Kapsamı

Bu repo yalnızca public uygulama kaynak kodunu içerir.

Dahil olanlar:

- Tauri/React uygulama kaynak kodu
- Rust backend kaynak kodu
- Build yapılandırması
- Public dokümantasyon

Dahil olmayanlar:

- Özel Cloudflare Worker kaynak kodu
- Rate limit uygulama detayları
- Ortam dosyaları veya secret değerleri
- Derlenmiş installer dosyaları
- `node_modules`, `dist` veya Rust `target` çıktıları

### Geliştirme

```powershell
cd gl-manager-next
npm install
npm run tauri dev
```

Production build:

```powershell
cd gl-manager-next
npm run tauri build
```

## 中文

这是一个现代化的 Tauri + React 桌面管理器，支持基于配置文件的 AppID 列表管理、Steam Store 搜索、首次启动向导、多语言界面、托管更新检查，以及私有下载 Worker 流程。

### 最新版本

**版本：** `1.0.1`

**下载：** [Greenluma Manager Next By Harman 最新安装包](https://worker.glnbyharman.workers.dev/manager/download)

### 1.0.1 更新内容

- 改进启动和网络错误提示。
- 区分 Steam、更新服务器、GreenLuma 包、下载限制和缺失文件错误。
- GreenLuma 下载流程会在解压 ZIP 前清晰报告 HTTP 错误。
- Manager 下载现在通过私有 Worker 后面的稳定 `latest.exe` 对象提供。

### 功能

- 创建、删除、选择和重命名配置文件。
- 通过 Steam Store 搜索并加载 AppID 结果。
- 通过 AppID 直接添加。
- AppList 准备流程。
- GreenLuma 文件健康检查和修复提示。
- 支持自动检测 Steam 的首次启动向导。
- 支持土耳其语、英语、中文和俄语界面。
- Carbon Lime 桌面主题。
- 支持跳过/下载流程的更新提示。

### 公共仓库范围

本仓库只包含公开的应用源代码。

包含：

- Tauri/React 应用源代码
- Rust 后端源代码
- 构建配置
- 公开文档

不包含：

- 私有 Cloudflare Worker 源代码
- Rate limit 实现细节
- 环境文件或密钥
- 已构建的安装包
- `node_modules`、`dist` 或 Rust `target` 输出

### 开发

```powershell
cd gl-manager-next
npm install
npm run tauri dev
```

生产构建：

```powershell
cd gl-manager-next
npm run tauri build
```

## Русский

Современный настольный менеджер на Tauri + React с управлением списками AppID по профилям, поиском в Steam Store, мастером первого запуска, многоязычным интерфейсом, проверкой обновлений и приватным потоком загрузки через Worker.

### Последний релиз

**Версия:** `1.0.1`

**Скачать:** [последний установщик Greenluma Manager Next By Harman](https://worker.glnbyharman.workers.dev/manager/download)

### Что нового в 1.0.1

- Улучшены сообщения об ошибках запуска и сети.
- Разделены ошибки Steam, сервера обновлений, пакета GreenLuma, лимита загрузки и отсутствующих файлов.
- Загрузка GreenLuma теперь понятнее сообщает HTTP-ошибки до распаковки ZIP.
- Загрузки Manager используют стабильный объект `latest.exe` за приватным Worker.

### Возможности

- Создание, удаление, выбор и переименование профилей.
- Поиск в Steam Store с загрузкой результатов AppID.
- Прямое добавление по AppID.
- Подготовка AppList.
- Проверка файлов GreenLuma с подсказками восстановления.
- Мастер первого запуска с автоматическим поиском Steam.
- Поддержка турецкого, английского, китайского и русского интерфейса.
- Настольная тема Carbon Lime.
- Окно обновления с действиями пропустить/скачать.

### Область публичного репозитория

Этот репозиторий содержит только публичный исходный код приложения.

Включено:

- Исходный код Tauri/React приложения
- Исходный код Rust backend
- Конфигурация сборки
- Публичная документация

Не включено:

- Исходный код приватного Cloudflare Worker
- Детали реализации rate limit
- Файлы окружения или секреты
- Собранные установщики
- `node_modules`, `dist` или Rust `target`

### Разработка

```powershell
cd gl-manager-next
npm install
npm run tauri dev
```

Production build:

```powershell
cd gl-manager-next
npm run tauri build
```
