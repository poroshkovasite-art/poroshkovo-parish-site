# Google Search Console

Владелец предоставил отдельный файл для Порошково 29.10.2026:

- URL-prefix property: `https://poroshkovo.pages.dev/`
- HTML verification: `https://poroshkovo.pages.dev/google696019cf5de45d47.html`
- Sitemap: `https://poroshkovo.pages.dev/sitemap.xml`

Исходный HTML-файл скопирован без изменений в `public/google696019cf5de45d47.html`. Содержимое: `google-site-verification: google696019cf5de45d47.html`.

Cloudflare Pages обычно нормализует адреса `.html`. Поэтому `public/_redirects` содержит точное внутреннее правило 200 для этого URL, указывающее на идентичную plain-text копию в `public/verification/`. Это не перенаправление посетителя и не изменение корневых языковых маршрутов. Корневой HTML-файл также сохранён в сборке. Проверять нужно HTTP 200 по точному выданному адресу и совпадение тела ответа.

Файл не удалять после подтверждения владения: Google может проверять его повторно. Не подменять файлами других проектов. Подтверждение владения и отправка sitemap помогают Google обнаружить страницы, но не гарантируют сроки или позиции в поисковой выдаче. Актуальный результат действий в Search Console записывается в финальном отчёте выпуска.
