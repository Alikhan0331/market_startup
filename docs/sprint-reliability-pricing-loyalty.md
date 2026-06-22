# Sprint: Reliability · Pricing · Loyalty
> Охватывает всё от обсуждения эскроу до прозрачности цен

---

## 0. Эскроу — обсуждение (не реализовано)

**Рассмотренные варианты:**
- **Stripe** — надёжный, простой интеграция, но требует статус платёжного агента и регистрацию в юрисдикции
- **WooPay** — казахстанский провайдер, нет документации на эскроу, риски
- **Виртуальный эскроу** — деньги формально не удерживаются, только обязательства в системе — юридически серая зона

**Решение:** отложено до MVP 2. Требует юридической экспертизы по казахстанскому финансовому праву.

---

## 1. Модуль Reliability (логирование и репутация)

### 1.1 Концепция

Каждая сделка оставляет след в репутации инфлюенсера. Система собирает события, считает взвешенный score с временным затуханием, позволяет оспаривать несправедливые события через модератора.

### 1.2 Типы событий и веса

| Событие | Вес | Триггер |
|---|---|---|
| `COMPLETED_EARLY` | +1.5 | Бренд закрыл сделку, до дедлайна >2 дня |
| `COMPLETED_ON_TIME` | +1.0 | Бренд закрыл сделку вовремя |
| `CANCELLED_BY_BRAND` | 0 | Бренд отменил ACTIVE/ACCEPTED сделку — нейтрально |
| `NO_RESPONSE` | −0.5 | Бренд подал жалобу на молчание (см. 1.4) |
| `LATE` | −1.0 | Дедлайн прошёл, сделка ещё не закрыта (cron) |
| `CANCELLED_BY_INFLUENCER` | −1.5 | Инфлюенсер отменил ACTIVE/ACCEPTED сделку |

### 1.3 Алгоритм расчёта score

```
Для каждого ACTIVE/UPHELD события:
  daysSince = дней с момента события
  decayFactor = max(0.1, 1 − daysSince / 730)   ← линейное затухание за 2 года
  decayed = |weight| × decayFactor

score = positiveWeight / (positiveWeight + negativeWeight) × 100
```

**Порог уверенности:** score рассчитывается только после **5+ событий**. До этого — `null` (показывается как "New"). Это защищает от ситуации, когда новый инфлюенсер с 0 сделок показывает 100%.

**Реализация:** `apps/api/src/reliability/reliability.service.ts` → `recalculateScore()`

### 1.4 Флоу "No Response" (24-часовое предупреждение)

Проблема: бренд может нажать кнопку случайно или из раздражения.

```
Бренд нажимает "Report no response":
  ├── Если deal.noResponseWarnedAt = null:
  │     Устанавливаем noResponseWarnedAt = now()
  │     Возвращаем { warned: true }
  │     → Фронт: "Warning sent. Click again in 24h to record."
  │
  ├── Если < 24 часов прошло:
  │     Бросаем 400: "Influencer has X hours left to respond"
  │
  └── Если >= 24 часа прошло:
        Записываем NO_RESPONSE событие
        Пересчитываем score
```

Инфлюенсер видит amber-баннер на странице сделки с призывом ответить.

**Условия для бренда:** сделка PENDING + возраст ≥ 3 дней + нет дублирующего события.

### 1.5 Флоу оспаривания (Dispute)

```
Инфлюенсер → открывает dispute:
  event.status → DISPUTED
  Создаётся Dispute(status=PENDING, reason)

Модератор видит все PENDING споры:
  Контекст: событие, дата сделки, дедлайн, нота
  Решение: UPHELD или DISMISSED

  UPHELD  → event.status = UPHELD  (остаётся в счёте)
  DISMISSED → event.status = DISMISSED (убирается из счёта)
  Пересчёт score
```

### 1.6 Автоматическое обнаружение просрочки (cron)

Ежедневно в полночь:

```
Найти все ACCEPTED/ACTIVE сделки, где deadline < today
Для каждой — проверить нет ли уже события LATE
Если нет — записать LATE с пометкой "Auto-flagged by system"
```

**Файл:** `apps/api/src/scheduler/scheduler.service.ts` → `handleLateDeals()`

### 1.7 API эндпоинты

| Метод | Путь | Роль | Описание |
|---|---|---|---|
| `GET` | `/reliability/events/:influencerId` | Все | Список событий |
| `POST` | `/reliability/no-response/:dealId` | BRAND | Жалоба на молчание (с 24h warning) |
| `POST` | `/reliability/events/:eventId/dispute` | INFLUENCER | Открыть спор |
| `GET` | `/reliability/disputes` | MODERATOR/ADMIN | Все споры |
| `PATCH` | `/reliability/disputes/:id/resolve` | MODERATOR/ADMIN | Решить спор |

### 1.8 Роль MODERATOR

Добавлена 4-я роль (`UserRole.MODERATOR`) с доступом к:
- Панели споров `/moderator/disputes`
- Эндпоинтам разрешения споров

---

## 2. Модуль Pricing (трёхзонное ценообразование)

### 2.1 Концепция

Система вычисляет три ценовые зоны для каждого инфлюенсера:
- **Floor** — минимальная цена (ниже = отказ от оффера)
- **Recommended** — оптимальная для принятия
- **High** — премиум, для высококачественных инфлюенсеров

### 2.2 Формула расчёта

```
base = (topFollowers / 1000) × $15

erFactor = min(instagramER / 0.03, 3.0)   ← нормализация к среднему ER 3%, кап 3×
           = 1.0 если ER не задан

nicheCoef = см. таблицу ниш

surgeMultiplier = 1.2 если demandSurge else 1.0

recommended = base × erFactor × nicheCoef × surgeMultiplier

performanceMultiplier:
  null (new) → 1.0×
  score ≥ 90 → 1.4×
  score ≥ 70 → 1.2×
  score ≥ 50 → 1.0×
  score < 50 → 0.85×

high  = recommended × performanceMultiplier
floor = max(recommended × 0.6, priceFrom)
```

### 2.3 Коэффициенты ниш

| Ниша | Коэф. | Ниша | Коэф. |
|---|---|---|---|
| Luxury | 1.5 | Food | 1.1 |
| Fashion | 1.4 | Technology | 1.1 |
| Beauty | 1.3 | Business | 1.1 |
| Lifestyle | 1.2 | Entertainment | 1.0 |
| Travel | 1.2 | Gaming | 0.9 |
| Fitness | 1.15 | Education | 0.85 |
| Health | 1.15 | — | — |

### 2.4 Demand Surge

Surge активируется при **2+ принятых/активных сделках** за последние 14 дней.

Важно: считаются только `ACCEPTED`, `ACTIVE`, `COMPLETED` статусы — **не raw офферы**. Это защита от накрутки через спам-офферы.

### 2.5 Применение Floor в сделках

При создании сделки (`POST /deals`): если `budget < pricing.floor` — `400 Bad Request`.

Бренд видит живое определение зоны в форме создания сделки (ниже floor = блокировано, low = budget offer, good = good offer, premium).

### 2.6 API эндпоинты

| Метод | Путь | Роль | Описание |
|---|---|---|---|
| `GET` | `/pricing/:influencerId` | **BRAND only** | Зоны floor/recommended/high |
| `GET` | `/pricing/:influencerId/breakdown` | Все авторизованные | Факторы ценообразования |

Эндпоинт `/pricing/:influencerId` закрыт для брендов — защита от парсинга ценовой модели конкурентами.

### 2.7 Breakdown — прозрачность цены

`GET /pricing/:influencerId/breakdown` возвращает:

```typescript
{
  position: 'above_market' | 'at_market' | 'below_market' | 'no_data',
  marketDiffPct: number | null,   // e.g. +22 = на 22% выше средней по нише
  boosters: string[],             // факторы повышения (текстом)
  dampers: string[],              // факторы понижения (текстом)
  tip: string | null              // actionable подсказка
}
```

**Market position алгоритм:**
```
peers = все инфлюенсеры с ≥1 совпадающей категорией (≥3 для валидности)
peerPrice = base × erFactor × nicheCoef   ← без surge и performance
avg = среднее peerPrices
ratio = thisPrice / avg

ratio ≥ 1.15 → above_market
ratio ≤ 0.85 → below_market
иначе       → at_market
```

Точные веса, пороги и коэффициенты **не раскрываются** — только качественные сигналы.

---

## 3. Модуль Loyalty / Partnership Score

### 3.1 Концепция

Если бренд и инфлюенсер успешно завершили несколько сделок — это ценность для обоих. Система формализует это через тир партнёрства.

### 3.2 Тиры и пороги

| Тир | Порог | Бонус к matching | Скидка |
|---|---|---|---|
| NONE | < 2 сделок | 0 | — |
| RETURNING | ≥ 2 | +4 pts | 5% |
| TRUSTED | ≥ 3 | +7 pts | 10% |
| EXCLUSIVE | ≥ 5 | +10 pts | 15% |

### 3.3 Жизненный цикл

```
completeDeal() → partnershipService.onDealCompleted(brandId, influencerId)
  ├── Если нет записи → создать с count=1
  ├── Если есть → count++
  └── Пересчитать тир через calculateTier(count)

Monthly cron (1-е число, 01:00):
  Найти partnerships с lastCompletedAt < 12 мес назад
  Понизить тир на 1 ступень (EXCLUSIVE→TRUSTED→RETURNING→NONE)
```

### 3.4 Влияние на Matching

`GET /matching/recommended` теперь учитывает партнёрство:

- Загружается Map<influencerId, tier> для текущего бренда одним запросом
- В `scoreMatch()` добавляется `partnershipBonus` (0/4/7/10)
- На странице `/recommended` отображается badge тира и chip "+X partner"

### 3.5 API эндпоинты

| Метод | Путь | Описание |
|---|---|---|
| `GET` | `/partnerships/pair/:influencerId` | Тир текущего бренда с этим инфлюенсером |
| `GET` | `/partnerships/brand` | Все партнёрства текущего бренда |
| `GET` | `/partnerships/influencer` | Все партнёрства текущего инфлюенсера |

---

## 4. Matching Algorithm — итоговая версия

Алгоритм `scoreMatch()` теперь включает 7 компонентов:

| # | Компонент | Макс. баллы | Источник |
|---|---|---|---|
| 1 | Category alignment | 30 | brand.industry → affinity map → influencer.categories |
| 2 | Country match | 20 | Точное совпадение страны |
| 3 | Quality score | 25 | influencer.overallScore (AI scoring) |
| 4 | Budget compatibility | 15 | Наличие priceFrom/priceTo |
| 5 | Verification bonus | 10 | VERIFIED/UNVERIFIED/WARNING |
| 6 | Partnership bonus | 10 | PartnershipTier (0/4/7/10) |
| 7 | Reliability bonus | 8 (−5) | reliabilityScore (null=0, ≥80=+8, <40=−5) |

Новые инфлюенсеры (null score) получают 0 по reliability — ни бонуса, ни штрафа.

---

## 5. Логирование завершения сделки (MVP 2 data)

При завершении сделки бренд может опционально указать:

| Поле | Тип | Описание |
|---|---|---|
| `brandRating` | 1–5 | Субъективная оценка качества |
| `revisionCount` | integer | Количество правок в процессе |

Данные сохраняются на `Deal`. Не используются в алгоритмах сейчас — накопление для будущей персонализации matching.

---

## 6. Scheduler (Cron jobs)

**Файл:** `apps/api/src/scheduler/scheduler.service.ts`

| Расписание | Задача |
|---|---|
| Ежедневно в 00:00 | Проверить просроченные ACCEPTED/ACTIVE сделки → записать LATE |
| 1-е число каждого месяца в 01:00 | Понизить тиры неактивных партнёрств (>12 мес) |

---

## 7. Изменения базы данных

### Новые таблицы

```
reliability_events
  id, influencerId, dealId, eventType, status, note, createdAt

disputes
  id, eventId, influencerId, reason, status, moderatorNote, createdAt

partnership_scores
  id, brandId, influencerId, completedDealsCount, tier, lastCompletedAt
  UNIQUE(brandId, influencerId)
```

### Изменения существующих таблиц

```
influencer_profiles
  + reliabilityScore  DECIMAL(5,2) NULL  (было DEFAULT 100, стало NULL)

deals
  + brandRating        INT NULL
  + revisionCount      INT NULL
  + noResponseWarnedAt TIMESTAMP NULL
```

---

## 8. Frontend — новые страницы и компоненты

| Страница / компонент | Роль | Описание |
|---|---|---|
| `/moderator/disputes` | MODERATOR | Панель всех споров, фильтр, решение |
| `/how-it-works` | Все | Объяснение факторов ценообразования без формул |
| `/recommended` | BRAND | Карточки с match score, tier badge, reliability/partner chips |
| `/influencers/[id]` | Все | Score зоны, tier badge, reliability events, breakdown modal |
| `/deals/[id]` | Все | Warning banner, dispute form, optional rating при complete |
| `/deals/new` | BRAND | Live pricing widget с 3 зонами и zone indicator |
| Sidebar | — | Добавлены: Recommended, How it works |

---

## 9. Что намеренно НЕ раскрывается пользователям

| Параметр | Причина |
|---|---|
| Точные веса событий (−1.5, +1.0...) | Защита от манипуляции поведением |
| Нишевые коэффициенты (1.5, 0.85...) | Защита от перепозиционирования аккаунтов |
| Порог demand surge (≥2 сделки за 14 дней) | Защита от накрутки |
| Формула затухания (730 дней, min 0.1) | Защита от манипуляции таймингом событий |
| Порог тиров партнёрства (2/3/5) | Менее критично, но не публикуем |
| Порог минимума событий для score (5) | Показываем только результат: "New" |

---

## 10. Отложено (следующий спринт)

| Задача | Причина отложить |
|---|---|
| Эскроу | Требует юридической экспертизы |
| Dispute: бренд видит переписку/дедлайн в модерации | Нужен доступ к истории чата |
| Confidence badge в InfluencerCard (список) | Нет компонента карточки, только профиль |
| Уведомления (push/email) на no-response warning | Нет notification service |
