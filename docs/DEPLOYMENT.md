# Независимая публикация Порошково

29.10.2026 владелец разрешил публикацию в существующем репозитории `poroshkovasite-art/poroshkovo-parish-site` и отдельном Cloudflare Pages-проекте строго `poroshkovo` под `poroshkovasite@gmail.com`. Целевой URL — `https://poroshkovo.pages.dev/`; успешное назначение и публикация подтверждаются только после проверки Cloudflare и реального адреса. Подробный результат записывается в отдельный отчёт выпуска.

Настройки Git-интеграции Cloudflare Pages: production branch `main`, framework preset `None`, build command `npm run build:production`, output directory `dist`, root directory — корень репозитория. Версия Node — 22 (также задана в `.node-version`). Автоматическое обновление должно быть включено для новых коммитов ветки `main`.

Первоначальный README-коммит GitHub сохраняется посредством merge без force push; исходное описание репозитория включено в README. Другие GitHub-авторизации не удаляются.

Первый production-деплой подтверждён Cloudflare 29.10.2026: `582177ff-5557-4a8a-bedb-01a3f14d6faf`, исходный merge-коммит `0af5969bac835b1f7d99a401982e84f01fa51f7e`. Публичный адрес — [poroshkovo.pages.dev](https://poroshkovo.pages.dev/). В настройках проверены `Automatic deployments: Enabled` и production branch `main`.

Для независимой проверки опубликованной версии: `npm ci`, `npm run build:production`, `npm run check`, `npm run verify:deployment`. Последняя команда требует Chromium для Playwright (или `PLAYWRIGHT_CHROMIUM_EXECUTABLE`) и сравнивает содержимое публичных страниц и ресурсов с текущей локальной production-сборкой. Также проверяются языки, canonical, индексация, 404, мобильная сетка, меню, карусель, фильтры и доступность. Результат сохраняется вне репозитория в `../audit/production-verification.json`.

1. Использовать только существующий репозиторий `poroshkovasite-art/poroshkovo-parish-site` и отдельный Cloudflare Pages-проект `poroshkovo`. Для доступа к Cloudflare владелец указал `poroshkovasite@gmail.com`.
2. Проверить материалы, тексты, актуальное расписание и контакты с парафией. Подтвердить право официальной публикации и использование фотографий.
3. Сохранить первоначальный README-коммит существующего репозитория через merge; загрузить только исходники `site` без `node_modules`, `dist`, `.env`, исходных фотоматериалов, служебных аудитов и секретов. Force push запрещён. Remote — `https://github.com/poroshkovasite-art/poroshkovo-parish-site.git`.
4. В отдельном Cloudflare Pages-проекте подключить этот новый репозиторий. Сайт статический: build `node scripts/build.mjs --production`, output `dist`, Node 20+. Build не требует серверных функций или секретов. Для локального управления нужны только инструменты Node/npm.
5. В `content/site.json` записать реально назначенный независимый HTTPS-адрес в `production_url` и разрешение владельца `publication_approved: true`. Production-сборка откажется работать без этих параметров или при адресе референсного проекта.
6. Сборка → проверки → коммит → push → успешный deploy. Открыть `/uk/`, `/en/`, основные страницы, 404, robots и sitemap через опубликованный адрес. Проверить canonical/hreflang, OG-картинку и язык текущего маршрута.
7. Если подключается собственный домен, пересобрать со значением этого домена, настроить его только в новом проекте. Google Search Console — новый ресурс для нового домена; брать только новый выданный файл/тег. Sitemap отправлять после успешного запуска.
8. Сохранить новую резервную копию на рабочем столе по структуре текущего архива; записать реальные URL и SHA коммита в отчёт.

В локальной сборке `noindex` и запрет индексации намеренны. Для публикации использовать `npm run build:production`. Успех подтверждать открытием реального публичного адреса, сверкой содержимого и языковых версий; наличие конфигурации ещё не подтверждает деплой.
