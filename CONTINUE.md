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


## Фото и порядок главной — 29.10.2026, последнее поручение

В прежнем выпуске hero был church-exterior (впоследствии заменён на divine-liturgy), следом история с картой 1921 года, затем divine-liturgy и остальные блоки. Все 10 фото прошли обработку; 93 архивных WebP (в актуальном dist только 49 улучшенных; 44 с плашкой исключены). Два одобренных sky-edit храм/дзвіниця используют image_gen; остальные обычную коррекцию. Оригиналы и контрольные суммы сохранены. Карта отдельно: content/historical-map.json, assets/history; оригинал и sky-мастера в рабочем photos/editorial_sources. Зимний полный кадр сохраняет старую встроенную подпись: новый кроп только локальная проба, не публиковать с обрезанной обувью. Текущие подробности — docs/UNIFIED_PHOTO_STYLE.md. Последние фактические SHA, deployment, отчёты и backup — D:\POROSHKOVO_PARISH_WORK\FINAL_REPORT.md и audit/current-release.json после финальной проверки.


## Подтверждённое расписание — 29.10.2026

Источник: непосредственное интервью с настоятелем о. Анатолієм Горзовим, переданное владельцем (задание 313b18f8-ad81-468a-8889-d5d778253c37). content/schedule.json теперь confirmed: пн–сб Споведь 08:30 и Литургия 09:00, сб Вечірня 18:00, вс Матері в молитві 10:00 и Литургия 11:00; воскресная Споведь до Литургии без часа. Europe/Kyiv, часы не переводятся посетителю.

scripts/worship.mjs связывает компактный верхний блок главной, три карточки расписания, Великий пост и пять молитвенных практик. Открыт Social Ministry только с подтверждённой молитвой за защитников и пострадавших; неподтверждённые проекты остаются черновиками. Публичных маршрутов теперь 32 (16 UA + 16 EN), редакторских 46. Настоятель подтверждён интервью; портрет не назначен автоматически.

Календарь: regularServices/annualParishEvents, регулярное расписание отдельным блоком и в выбранном дне без повторяющихся карточек в ленте; действующий план применяется с 29.10.2026 до обновления. 1 ноября — ежегодная местная традиция без времени/координат кладбища; ICS целого дня с RRULE. Неизвестные дни Великого поста и день еженедельной молитвы за воинов не назначены; церковная/епархиальная выборка 2026 не переносится на другие годы.

Документ: docs/CONFIRMED_WORSHIP.md. Проверки: npm run test:schedule (12 контекстов, два часовых пояса), test:browser (288), test:portal, test:publication (180), test:media. Production выполняется через main/Cloudflare poroshkovo после локальных PASS; окончательные SHA/URL и состояние копии — D:\POROSHKOVO_PARISH_WORK\FINAL_REPORT.md и audit/current-release.json. Архив рабочего стола обновлять только после успешной проверки живого адреса. ISF/NAU не изменять.


## Актуальный hero — последнее поручение владельца

Восстановлено `content/site.json: hero_photo_id = divine-liturgy`: священник у чаши, UA и EN. Предыдущие заметки о church-exterior как hero больше не описывают текущий вариант. Все 93 файла фото, content/photos.json и остальные фото-разделы не менялись. Статическая проверка и media-qa закрепляют divine-liturgy. Отдельная проверка обеих главных на девяти ширинах: audit/hero-restored-*-verification.json.

## Последнее задание: локализация визуального оформления — 30.10.2026

Один assets/brand/poroshkovo-parish-symbol.svg без видимых слов и растровых вставок. Header: символ + name_lines.uk/en из brand.json; Footer и favicon также без встроенного текста. Свои тексты сайта используют Методій/Методія. Не менять цитаты, документы и исходные имена файлов. Два локализованных OG PNG.

Компоненты используют только enhanced; caption_overlay.uk/en — отдельная HTML/CSS-полоса, без дублированного заголовка снизу. Все 49 базовых WebP побайтово сохранены, 44 captioned остаются в исходном архиве, но не копируются в dist. Hero остаётся divine-liturgy. Зимний чистый оригинал не найден: UA полный кадр без второй накладки; EN исключён из всех блоков/галереи/lightbox. Не обрезать людей/не дорисовывать; ждать чистого исходника.

Новый npm run test:localization: точные подписи, отсутствие captioned в HTML/dist, чистый SVG, ссылки/реальные загрузки/хеши, 32 маршрута, 9 ширин главной/галереи, геометрия шапки/полос, lightbox, proof.html и попарные PNG. Визуальный просмотр actual-photo-assets обязателен отдельно. Остальные тесты: build:production/check, test:browser/media/portal/schedule/publication (последнему нужен build:editor и preview:editor на 4174). Публикация main через native Cloudflare poroshkovo после локальных PASS. Финальные SHA/deployment/живой QA/ZIP записываются в D:\POROSHKOVO_PARISH_WORK\FINAL_REPORT.md и audit/current-release.json после фактической проверки.
