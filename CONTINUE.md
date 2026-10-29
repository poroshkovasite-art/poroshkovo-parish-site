# Продолжение Порошково

Рабочая папка: `D:\POROSHKOVO_PARISH_WORK\site`. Владелец разрешил commit/push/main и автоматический Cloudflare deployment после тестов. ISF и NAU не изменять. Не делать force push и не удалять другие авторизации.

## Реализовано

- Новый адаптивный header UA/EN, округлые кнопки, анимированное меню, одиночные подменю, Escape/focus/scroll/resize и языковой переход с сохранением раздела и даты календаря.
- История края/села/Церкви/нового храма: четыре рассказа, 12 вех, категории и источники.
- 10 реальных фотографий, главный visual `divine-liturgy` (священник возле чаши), WebP с responsive widths, описания UA/EN; последние логотип, favicon и footer.
- Календарь: month/week, Today, дата, категории, три вкладки, выбранный день, ближайшие события, ICS, локальная выборка 2026: 34 церковных даты и 26 епархиальных событий. Приходских событий нет. Новый год показывает уведомление.
- Ресурсы: пять двуязычных карточек.
- Карта: точная булавка владельца 48.670772,22.752723, Google embed по согласию посетителя, две внешние кнопки и анонс на главной.
- 10 JSON-моделей будущих разделов; documents и first-visit доступны публично. Восемь незаполненных направлений скрыты, но имеют полноценный локальный редакторский preview `npm run build:editor` / `npm run preview:editor` (4174). Drafts не публикуются. PDF, счета, сообщения настоятеля, лагеря имеют отдельные проверки допуска.
- Полная инструкция `docs/CONTENT_WORKFLOW.md`, источники/исключения `docs/SOURCES_AND_LIMITS.md`.

## Тесты и публикация

Команды: `npm run build:production`, `npm run check`, `npm run build:editor`, `npm run test:browser`, `npm run test:portal`, `npm run test:publication`, `npm run test:media`.
Для Chrome: `PLAYWRIGHT_CHROMIUM_EXECUTABLE=C:\Program Files\Google\Chrome\Application\chrome.exe`. Lighthouse: `CHROME_PATH` такой же; установлен в devDependencies. Фактические отчёты в `D:\POROSHKOVO_PARISH_WORK\audit`.

После финальных неизменённых исходников повторить затронутые тесты, commit/push origin main. Cloudflare подключён к GitHub, проект `poroshkovo`, account ID `2b638499263de3ad68d363c65fd4a2a7`, build production, output dist. Статус деплоя можно прочитать `gh api repos/poroshkovasite-art/poroshkovo-parish-site/commits/HEAD_SHA/check-runs`; Cloudflare check содержит conclusion, deployment URL и ID. Проверить реальные HTTPS-файлы против локальных SHA через `npm run verify:deployment`, плюс PORTAL_BASE_URL / MEDIA_BASE_URL для production QA.

GitHub CLI — poroshkovasite-art (ADMIN); токены не выводить. Другие аккаунты не удалять. Wrangler авторизован в **другом** аккаунте constractoptimafide@gmail.com: не использовать его для публикации Порошкова и не менять его проекты. Нативный Git-deploy Порошкова не зависит от этого Wrangler.

## Завершить после проверки релиза

Сохранить FINAL_REPORT.md с фактическим SHA, deployment ID/URL, результатами QA/Lighthouse и исключениями. Обновить `audit/current-release.json` только после успешного Cloudflare check и реальной проверки HTTPS. Публичный сайт https://poroshkovo.pages.dev/ . GitHub https://github.com/poroshkovasite-art/poroshkovo-parish-site .

Резервная копия: `D:\POROSHKOVO_PARISH_WORK\docs\create-current-backup.ps1` требует успешные production отчёты и `docs/CURRENT_FINAL_REPORT.md` во внешней папке проекта. Создаёт свежую staging-копию, проверяет git bundle, повторную сборку и SHA каждого файла ZIP. Обновляет Desktop/POROSHKOVO_PARISH_WEBSITE_FINAL и POROSHKOVO_PARISH_WEBSITE_FINAL_BACKUP.zip. Не удалять пользовательские исходники NEF/PNG в корне существующей Desktop-папки. Старый ZIP сохранить отдельно. Включить dist-editor/source для будущего наполнения; готовая публичная сборка — READY_TO_PUBLISH. Отчёт и archive hash обновить после упаковки.

## Материалы, которые ожидаются

Приветствие/портрет/назначение настоятеля; разрешённые PDF; действующее расписание; подтверждённые программы социальной помощи, лагерей, молодёжных встреч и паломничеств; реальные истории и авторские согласия; подтверждённые счета и отчёты. Подробные поля в CONTENT_WORKFLOW. Никаких фиктивных документов, дат, программ или платежей.

Search Console: владение poroshkovasite@gmail.com подтверждено ранее. Sitemap отправлен, но последняя панель показывала ошибку обработки. Требуется повторный просмотр панели при доступном браузере; успешную индексацию не обещать. Два verification файла уже опубликованы и сохраняются.
