# Документация: Helper-Link

## Описание

`helper-link` — это визуальные индикаторы-подсказки, которые отображаются рядом с элементами интерфейса для запуска интерактивных обучающих туториалов. Они представляют собой небольшие круглые элементы с желтой подсветкой, которые появляются рядом с целевыми элементами страницы.

## Расположение в коде

Основная реализация находится в файле:
- `/lib/helper/front/helper.vue` (строки 3-18 — шаблон, строки 206-220 — computed свойства, строки 448-491 — методы)

## Архитектура

### Источник данных

`helper-link` получают данные из глобального состояния приложения:
```javascript
state.store.user[currentUser].helperLinks
```

Структура данных для каждой ссылки:
```javascript
{
  code: string,           // Уникальный идентификатор ссылки
  selector: string,       // CSS-селектор для поиска целевого элемента в DOM
  type: 'game' | 'lobby', // Тип ссылки (для игры или лобби)
  tutorial: string,       // Имя туториала для запуска
  customClass: string,    // Дополнительный CSS-класс
  displayForced: boolean, // Флаг принудительного отображения
  used: boolean,          // Флаг использования ссылки
  pos: {                  // Позиционирование относительно элемента
    left: boolean,
    top: boolean
  }
}
```

### Вычисляемые свойства (Computed)

#### `helperLinks`
Получает все ссылки из состояния пользователя:
```javascript
helperLinks() {
  return this.state.store.user?.[this.state.currentUser]?.helperLinks || {};
}
```

#### `helperLinksEntries`
Фильтрует ссылки по типу (game/lobby) в зависимости от текущего контекста:
```javascript
helperLinksEntries() {
  return Object.entries(this.helperLinks)
    .filter(([code, link]) => link.type === (this.game ? 'game' : 'lobby'));
}
```

#### `filledHelperLinks`
Создает массив ссылок с добавленными координатами элементов (`clientRect`):
```javascript
filledHelperLinks() {
  const result = Object.entries(this.helperLinks)
    .map(([code, link]) => ({
      ...{ code, pos: {}, ...link },
      clientRect: this.helperLinksBounds[code],
    }))
    .filter(({ clientRect }) => clientRect);
  return result;
}
```

**Важно:** В массив попадают только ссылки, для которых найден видимый элемент в DOM (`clientRect` не null).

## Рендеринг

### Шаблон (Template)

Каждая ссылка рендерится как `div` с фиксированным позиционированием:

```vue
<div
  v-for="link in filledHelperLinks"
  :key="link.code"
  :class="[
    'helper-link',
    'helper-avatar',
    link.customClass,
    link.displayForced ? 'display-forced' : '',
    link.used ? 'used' : '',
  ]"
  :style="{
    left: `${link.clientRect.left + (link.pos.left ? 0 : link.clientRect.width)}px`,
    top: `${link.clientRect.top + (link.pos.top ? 0 : link.clientRect.height)}px`,
  }"
  v-on:click.stop="showTutorial(link)"
/>
```

### Позиционирование

Координаты вычисляются на основе `getBoundingClientRect()` целевого элемента:
- **left**: `clientRect.left + (если pos.left, то 0, иначе clientRect.width)`
- **top**: `clientRect.top + (если pos.top, то 0, иначе clientRect.height)`

Это позволяет размещать ссылку слева/справа и сверху/снизу от целевого элемента.

### CSS-классы

- `helper-link` — базовый класс для стилизации
- `helper-avatar` — добавляет круглую форму и фоновое изображение
- `link.customClass` — пользовательский класс из данных
- `display-forced` — принудительное отображение (для десктопа)
- `used` — ссылка была использована

## Логика отображения

### Десктоп
По умолчанию ссылки скрыты (`display: none`). Показываются только если:
- Установлен флаг `displayForced` И ссылка не использована (`!used`)

### Мобильные устройства
Ссылки всегда видны (если элемент найден), кроме использованных (`used`).

### Показ использованных ссылок
При нажатии клавиши **Alt** все ссылки (включая использованные) становятся видимыми через класс `show-used-helper-links`.

### Скрытие при активном диалоге
Когда активен диалог обучения (`.helper.dialog-active`), все ссылки скрываются:
```css
.helper.dialog-active > .helper-link {
  display: none;
}
```

## Обновление координат

### Метод `updateLinksCoordinates()`

Выполняет поиск элементов в DOM и обновляет их координаты:

```javascript
updateLinksCoordinates() {
  const helperLinksBounds = Object.fromEntries(
    this.helperLinksEntries.map(([code, link]) => {
      const element = this.$root.$el.querySelector(link.selector);
      const isVisible = element ? this.isElementVisible(element) : false;
      return [code, isVisible ? element?.getBoundingClientRect() : null];
    })
  );
  this.$set(this, 'helperLinksBounds', helperLinksBounds);
}
```

### Проверка видимости `isElementVisible()`

Метод проверяет, виден ли элемент:
1. Элемент существует
2. Не скрыт через CSS (`display: none`, `visibility: hidden`, `opacity: 0`)
3. Имеет ненулевые размеры (`width > 0`, `height > 0`)
4. Находится в области видимости viewport

### Автоматическое обновление

Координаты обновляются в следующих случаях:

1. **При монтировании компонента** (`mounted`):
   ```javascript
   this.$nextTick(this.updateLinksCoordinates);
   ```

2. **При изменениях DOM** через `MutationObserver`:
   - Отслеживает изменения атрибутов и структуры DOM
   - Вызывает `updateLinksCoordinates()` при изменениях

3. **После завершения CSS-переходов**:
   ```javascript
   document.addEventListener('transitionend', () => {
     self.updateLinksCoordinates();
   });
   ```

## Обработка клика

### Метод `showTutorial()`

При клике на ссылку вызывается метод:

```javascript
showTutorial({ tutorial, code, simple = true }) {
  if (this.helperDialogActive) return; // Другое обучение уже активно
  if (!tutorial) return;
  
  api.action.call({
    path: 'helper.api.action',
    args: [{ tutorial, step: simple ? code : undefined, usedLink: code }],
  }).catch(prettyAlert);
}
```

**Параметры:**
- `tutorial` — имя туториала для запуска
- `code` — код ссылки (используется как шаг, если `simple === true`)
- `simple` — флаг простого режима (по умолчанию `true`)

**Защита:** Если уже активен другой диалог обучения, клик игнорируется.

## Восстановление ссылок

### API `restoreLinks`

Для восстановления использованных ссылок используется метод:
```javascript
api.action.call({
  path: 'helper.api.restoreLinks',
  args: [{ inGame }],
})
```

Этот метод:
1. Получает исходные ссылки из источника туториалов (`tutorial.getHelperLinks()`)
2. Сбрасывает флаг `used` для всех ссылок
3. Сохраняет обновленные данные в состояние пользователя
4. Перерисовывает компонент helper (через `resetFlag`)

## Бэкенд логика

### API методы

#### `helper.api.action`

Основной API-метод для обработки действий с туториалами и helper-link.

**Расположение:** `lib/helper/api/action.js`

**Реализация:**
```javascript
async (context, data) => {
  const { userId } = context.session.state;
  const user = lib.store('user').get(userId);
  
  await lib.helper.updateTutorial(user, data);
  
  return { status: 'ok' };
}
```

**Параметры `data`:**
- `tutorial` — имя туториала для запуска
- `step` — шаг туториала (опционально)
- `usedLink` — код использованной ссылки (передается при клике на helper-link)
- `action` — действие (например, 'exit', 'changeTutorial')
- `isMobile` — флаг мобильного устройства

#### `helper.api.restoreLinks`

API-метод для восстановления использованных ссылок.

**Расположение:** `lib/helper/api/restoreLinks.js`

**Реализация:**
```javascript
async (context, { inGame = false }) => {
  const { userId } = context.session.state;
  const user = lib.store('user').get(userId);
  
  // Определяем источник туториалов (игра или лобби)
  const tutorialSource = inGame ? domain.game || lib.game : domain.lobby || lib.lobby;
  const helperLinks = tutorialSource.tutorial?.getHelperLinks() || {};
  
  // Сбрасываем флаг used для всех ссылок
  const updatedHelperLinks = {};
  for (const key of Object.keys(helperLinks)) {
    updatedHelperLinks[key] = { ...helperLinks[key], used: null };
  }
  
  // Сохраняем обновленные ссылки
  user.set({ helperLinks: updatedHelperLinks }, { removeEmptyObject: true });
  await user.saveChanges();
  
  return { status: 'ok' };
}
```

**Особенности:**
- Восстанавливает ссылки из исходного источника (`getHelperLinks()`)
- Сохраняет существующие пользовательские данные, объединяя их с исходными
- Использует `removeEmptyObject: true` для очистки пустых объектов при сохранении

### Обработка использованных ссылок

#### Метод `updateTutorial`

Основная логика обработки туториалов и отслеживания использованных ссылок.

**Расположение:** `lib/helper/updateTutorial.js`

**Обработка `usedLink`:**

```javascript
async (user, { action, step, tutorial: tutorialName, usedLink }) => {
  const globalTutorialData = { finishedTutorials: {}, helperLinks: {} };
  const { _id: userId, gameId, currentTutorial = {}, finishedTutorials = {}, helperLinks = {} } = user;
  
  if (tutorialName) {
    // ... инициализация туториала ...
    
    // Отслеживание использования ссылки в мультиплеерных играх
    if (gameId && usedLink && (helperLinks[usedLink]?.used || 0) < 2) {
      lib.store.broadcaster.publishAction.call(
        user, 
        `game-${gameId}`, 
        'playerUseTutorial', 
        { userId, usedLink }
      );
    }
    
    // Увеличение счетчика использования ссылки
    if (usedLink) {
      const used = (helperLinks[usedLink]?.used || 0) + 1;
      globalTutorialData.helperLinks[usedLink] = { used };
    }
  }
  
  // Сохранение изменений
  await user.saveChanges();
  if (Object.keys(globalTutorialData.helperLinks).length) {
    user.set({ ...globalTutorialData }, { removeEmptyObject: true });
    await user.saveChanges();
  }
}
```

**Ключевые моменты:**

1. **Счетчик использования**: Поле `used` хранит количество использований ссылки (число, не boolean)
2. **Broadcast событие**: При первом использовании ссылки в игре отправляется событие другим игрокам
3. **Условие `< 2`**: Broadcast отправляется только если ссылка использована менее 2 раз (первое использование)
4. **Глобальное сохранение**: Изменения `helperLinks` сохраняются отдельно от локальных изменений пользователя

### Инициализация helperLinks

#### При входе в лобби

**Расположение:** `lib/lobby/User.js` → метод `enterLobby()`

```javascript
async enterLobby({ sessionId, lobbyId }) {
  // ... другие действия ...
  
  let { helperLinks = {} } = this;
  
  if (!this.gameId) {
    // Объединяем ссылки из разных источников
    helperLinks = {
      ...lib.lobby.tutorial.getHelperLinks(),
      ...(domain.lobby.tutorial?.getHelperLinks?.() || {}),
      ...helperLinks, // Сохраняем существующие пользовательские данные
    };
  }
  
  this.set({ helperLinks }, { removeEmptyObject: true });
  await this.saveChanges();
}
```

**Особенности:**
- Объединяет ссылки из библиотеки (`lib.lobby.tutorial`) и домена (`domain.lobby.tutorial`)
- Сохраняет существующие пользовательские данные (например, флаги `used`)
- Инициализируется только если пользователь не в игре (`!this.gameId`)

#### При входе в игру

**Расположение:** `lib/game/userClass.js` → метод `joinGame()`

```javascript
async joinGame({ checkTutorials = true, gameStartTutorialName = 'game-tutorial-start' }) {
  let { helperLinks = {} } = this;
  
  if (checkTutorials) {
    // ... обработка туториалов ...
    
    // Объединяем ссылки игры с существующими
    helperLinks = {
      ...domain.game.tutorial.getHelperLinks(),
      ...helperLinks, // Сохраняем существующие данные
    };
    
    this.set({ helperLinks });
    await this.saveChanges();
  }
}
```

**Особенности:**
- Получает ссылки из домена игры (`domain.game.tutorial.getHelperLinks()`)
- Сохраняет существующие пользовательские данные
- Может быть пропущено при `checkTutorials = false`

### Источники helperLinks

#### Метод `getHelperLinks()` в туториалах

Каждый туториал (игра или лобби) может определить свои helper-link через метод `getHelperLinks()`.

**Пример для лобби:**
```javascript
// domain/lobby/tutorial/getHelperLinks.js
() => ({
  menuTop: {
    selector: '.menu-item.top > label',
    tutorial: 'lobby-tutorial-menuTop',
    simple: false,
    type: 'lobby',
  },
  menuChat: {
    selector: '.menu-item.chat > label',
    tutorial: 'lobby-tutorial-menuChat',
    simple: false,
    type: 'lobby',
  },
  // ... другие ссылки
})
```

**Пример для игры:**
```javascript
// domain/game/tutorial/getHelperLinks.js
() => ({
  ...lib.game.tutorial.getHelperLinks(), // Базовые ссылки
  players: {
    selector: '.players .workers',
    tutorial: 'game-tutorial-links',
    type: 'game',
    pos: { top: true, right: true },
  },
  handPlanes: {
    selector: '.session-player .player.iam.active .hand-planes .plane:last-child',
    tutorial: 'game-tutorial-handPlanes',
    simple: false,
    type: 'game',
    pos: { top: true, left: true },
  },
  // ... другие ссылки
})
```

**Структура ссылки:**
- `selector` — CSS-селектор для поиска элемента в DOM
- `tutorial` — имя туториала для запуска при клике
- `type` — тип ссылки: `'game'` или `'lobby'`
- `simple` — флаг простого режима (если `true`, код ссылки используется как шаг)
- `pos` — позиционирование относительно элемента (`{ left: boolean, top: boolean }`)

### Хранение данных

#### Структура в базе данных

Данные `helperLinks` хранятся в объекте пользователя:

```javascript
{
  _id: ObjectId,
  helperLinks: {
    'menuTop': {
      selector: '.menu-item.top > label',
      tutorial: 'lobby-tutorial-menuTop',
      type: 'lobby',
      used: 1  // Количество использований
    },
    'players': {
      selector: '.players .workers',
      tutorial: 'game-tutorial-links',
      type: 'game',
      used: 2
    }
    // ... другие ссылки
  }
}
```

#### Сохранение изменений

Изменения сохраняются через методы `user.set()` и `user.saveChanges()`:

```javascript
user.set({ helperLinks: updatedHelperLinks }, { removeEmptyObject: true });
await user.saveChanges();
```

**Опции сохранения:**
- `removeEmptyObject: true` — удаляет пустые объекты перед сохранением

### Broadcast события

#### Событие `playerUseTutorial`

При использовании ссылки в мультиплеерной игре отправляется событие другим игрокам:

```javascript
if (gameId && usedLink && (helperLinks[usedLink]?.used || 0) < 2) {
  lib.store.broadcaster.publishAction.call(
    user,
    `game-${gameId}`,
    'playerUseTutorial',
    { userId, usedLink }
  );
}
```

**Условия отправки:**
- Пользователь находится в игре (`gameId` существует)
- Передан код использованной ссылки (`usedLink`)
- Ссылка использована менее 2 раз (первое использование)

**Назначение:** Позволяет другим игрокам видеть, какие подсказки использовал игрок (для аналитики или отображения прогресса).

### Получение туториалов

#### Метод `getTutorial`

Получение данных туториала по имени.

**Расположение:** `lib/helper/getTutorial.js`

```javascript
(formattedPath) => {
  const path = formattedPath.split('-');
  
  // Поиск в domain или lib
  const obj = lib.utils.getDeep(this, ['domain', ...path]) 
           || lib.utils.getDeep(this, ['lib', ...path]);
  
  const tutorial = typeof obj === 'function' ? obj() : obj;
  if (!tutorial?.steps) throw new Error(`Tutorial "${formattedPath}" not found`);
  
  return tutorial;
}
```

**Примеры путей:**
- `'lobby-tutorial-start'` → `domain.lobby.tutorial.start` или `lib.lobby.tutorial.start`
- `'game-tutorial-links'` → `domain.game.tutorial.links` или `lib.game.tutorial.links`

**Возвращает:**
```javascript
{
  steps: {
    'step1': { /* данные шага */ },
    'step2': { /* данные шага */ }
  },
  utils: { /* вспомогательные функции */ }
}
```

### Обработка ошибок

#### Защита от конфликтов

При попытке запустить новый туториал, если уже активен другой:

```javascript
if (currentTutorial.active && action !== 'changeTutorial') {
  throw new Error('Другое обучение уже активно в настоящий момент');
}
```

#### Валидация данных

Проверка наличия шага туториала:

```javascript
const helper = step
  ? Object.entries(tutorial).find(([key]) => key === step)[1]
  : Object.values(tutorial).find(({ initialStep }) => initialStep) 
    || Object.values(tutorial)[0];

if (!helper) throw new Error('Tutorial initial step not found');
```

## Стилизация

### Базовые стили

```scss
.helper-link {
  position: fixed;
  width: 30px;
  height: 30px;
  margin-left: -25px;
  margin-top: -25px;
  z-index: 99;
  cursor: pointer;
  box-shadow: 0 0 10px 10px #f4e205; // Желтая подсветка
  border: 1px solid #f4e205;
  
  &:hover {
    opacity: 0.7;
  }
  
  display: none; // По умолчанию скрыты на десктопе
  
  &.display-forced {
    display: block;
    &.used {
      display: none; // Скрываем использованные
    }
  }
}
```

### Мобильные устройства

```scss
.mobile-view .helper-link {
  display: block; // Всегда показываем на мобильных
  &.used {
    display: none; // Скрываем только использованные
  }
}
```

### Показ всех ссылок

```scss
.show-used-helper-links .helper-link {
  display: block !important; // Принудительно показываем все
}
```

## Жизненный цикл

1. **Инициализация** (`mounted`):
   - Загрузка данных из состояния
   - Первичное вычисление координат
   - Настройка MutationObserver
   - Подключение обработчиков клавиатуры

2. **Реактивное обновление**:
   - При изменении `helperLinks` в состоянии автоматически пересчитываются `filledHelperLinks`
   - MutationObserver отслеживает изменения DOM и обновляет координаты

3. **Очистка** (`beforeDestroy`):
   - Отключение MutationObserver
   - Удаление обработчиков событий клавиатуры

## Пример использования

### Создание ссылки в туториале

```javascript
// В методе getHelperLinks() туториала
getHelperLinks() {
  return {
    'button-start': {
      selector: '.start-game-button',
      type: 'lobby',
      tutorial: 'game-tutorial-intro',
      displayForced: true,
      pos: { left: false, top: false } // Справа и снизу от элемента
    }
  };
}
```

### Восстановление ссылок через меню

Пользователь может восстановить использованные ссылки через меню helper:
1. Клик на helper-guru
2. Выбор "Активировать подсказки"
3. Вызов `restoreLinks` API
4. Автоматическая перерисовка компонента

## Особенности

1. **Динамическое позиционирование**: Координаты пересчитываются при каждом изменении DOM
2. **Умное скрытие**: Ссылки скрываются, если целевой элемент не найден или невидим
3. **Защита от конфликтов**: Нельзя запустить новый туториал, если уже активен другой
4. **Адаптивность**: Разное поведение для десктопа и мобильных устройств
5. **Производительность**: Используется `MutationObserver` для эффективного отслеживания изменений

## Связанные компоненты

- `helper-guru` — главный элемент helper-системы
- `helper-menu` — меню с опциями
- `helper-dialog` — диалоговое окно с обучением
- `restoreLinks.js` — API для восстановления ссылок
