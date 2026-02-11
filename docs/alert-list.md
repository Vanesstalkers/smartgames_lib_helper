# Документация: Alert-List

## Описание

`alert-list` — это система уведомлений об ошибках и предупреждениях, интегрированная в компонент helper. Она отображает сообщения об ошибках в виде всплывающих уведомлений над элементом `helper-guru` и предоставляет возможность просмотра детальной информации (stack trace) для отладки.

## Расположение в коде

Основная реализация находится в файле:
- `/lib/helper/front/helper.vue` (строки 21-40 — шаблон, строки 168-171 — data, строки 513-538 — методы, строки 646-728 — стили)

## Архитектура

### Структура данных

Компонент использует следующие реактивные данные:

```javascript
data() {
  return {
    alertList: [],        // Массив уведомлений
    showAlertList: false, // Флаг видимости списка уведомлений
    hiddenAlert: null,    // Детальная информация (stack trace)
    showHiddenAlert: false // Флаг показа детальной информации
  };
}
```

### Структура элемента уведомления

Каждый элемент в `alertList` может быть:
- **Строка** — простое текстовое сообщение
- **Объект** — расширенное уведомление:
  ```javascript
  {
    message: string,  // Текст сообщения
    hideIcon: boolean // Флаг скрытия иконки
  }
  ```

## Рендеринг

### Шаблон (Template)

```vue
<div v-if="!menu" :class="['helper-guru', 'helper-avatar', `scale-${state.guiScale}`]">
  <!-- Кнопка переключения списка уведомлений -->
  <div
    :class="['toggle-alert-list-btn', alertList.length > 0 ? 'active' : '']"
    v-on:click.stop="showAlertList = !showAlertList"
  />
  
  <!-- Список уведомлений -->
  <div :class="['alert-list', showAlertList ? 'show' : '']">
    <div
      v-for="(alert, index) in alertList"
      :key="index"
      :class="['alert', typeof alert === 'object' && alert.hideIcon ? 'hide-icon' : '']"
      v-on:click.stop=""
    >
      <!-- Основное сообщение -->
      <span v-html="typeof alert === 'object' ? alert.message : alert" />
      
      <!-- Детальная информация (stack trace) -->
      <div v-if="showHiddenAlert">
        <small v-html="hiddenAlert" />
      </div>
      
      <!-- Кнопка показа детальной информации -->
      <div 
        v-if="hiddenAlert" 
        class="show-hide" 
        v-on:click.stop="showHiddenAlert = true" 
      />
      
      <!-- Кнопка закрытия уведомления -->
      <div 
        class="close" 
        v-on:click.stop="alertList = alertList.filter((_, i) => i !== index)" 
      />
    </div>
  </div>
</div>
```

### Элементы интерфейса

1. **Кнопка переключения** (`toggle-alert-list-btn`):
   - Видна только когда есть уведомления (`alertList.length > 0`)
   - Переключает видимость списка уведомлений
   - Расположена слева от `helper-guru` на расстоянии 50px сверху

2. **Список уведомлений** (`alert-list`):
   - Показывается только при `showAlertList === true`
   - Расположен над `helper-guru` (на 110% высоты элемента снизу)
   - Содержит массив уведомлений

3. **Элемент уведомления** (`alert`):
   - Отображает основное сообщение
   - Может содержать иконку (если не установлен `hideIcon`)
   - Имеет кнопку закрытия
   - Может показывать детальную информацию (stack trace)

## Глобальные функции

### `window.prettyAlert`

Глобальная функция для отображения уведомлений об ошибках.

**Сигнатура:**
```javascript
window.prettyAlert(
  { message, stack } = {}, 
  { hideTime = 3000, hideIcon = false } = {}
)
```

**Параметры:**
- `message` — текст сообщения об ошибке
- `stack` — детальная информация (stack trace) для отладки
- `hideTime` — время автоматического скрытия в миллисекундах (по умолчанию 3000, 0 = не скрывать)
- `hideIcon` — флаг скрытия иконки уведомления

**Реализация:**
```javascript
window.prettyAlert = ({ message, stack } = {}, { hideTime = 3000, hideIcon = false } = {}) => {
  // Защита от дублирования одинаковых сообщений
  if (this.alertList.includes(message)) return;
  
  // Закрываем меню helper при показе уведомления
  this.menu = null;
  
  // Специальная обработка ошибки Forbidden
  if (message === 'Forbidden') {
    message += ' (рекомендуется обновить страницу)';
  }
  
  // Добавляем уведомление в список
  this.alertList = [{ message, hideIcon }];
  this.showAlertList = true;
  
  // Сохраняем детальную информацию
  self.hiddenAlert = stack;
  if (self.hiddenAlert) {
    this.showHiddenAlert = false; // Скрываем по умолчанию
  }
  
  // Автоматическое скрытие через указанное время
  if (hideTime > 0) {
    setTimeout(() => {
      self.showAlertList = false;
      if (this.alertList.length === 0) {
        self.hiddenAlert = null;
      }
    }, hideTime);
  }
};
```

**Особенности:**
- Предотвращает дублирование одинаковых сообщений
- Автоматически закрывает меню helper при показе уведомления
- Добавляет рекомендацию для ошибки "Forbidden"
- Поддерживает автоматическое скрытие через заданное время
- Сохраняет stack trace для последующего просмотра

**Пример использования:**
```javascript
// Простое уведомление
window.prettyAlert({ message: 'Ошибка загрузки данных' });

// Уведомление с детальной информацией
window.prettyAlert(
  { message: 'Ошибка сервера', stack: 'Error: Connection timeout\n  at api.js:45' },
  { hideTime: 5000, hideIcon: false }
);

// Уведомление без автоматического скрытия
window.prettyAlert(
  { message: 'Критическая ошибка' },
  { hideTime: 0 }
);
```

### `window.prettyAlertClear`

Глобальная функция для очистки всех уведомлений.

**Сигнатура:**
```javascript
window.prettyAlertClear()
```

**Реализация:**
```javascript
window.prettyAlertClear = () => {
  this.alertList = [];
  this.hiddenAlert = null;
  this.showAlertList = false;
};
```

**Назначение:** Полная очистка всех уведомлений и скрытие списка.

**Пример использования:**
```javascript
window.prettyAlertClear(); // Очистить все уведомления
```

## Логика работы

### Показ уведомлений

1. **Инициализация:**
   - При вызове `prettyAlert` уведомление добавляется в `alertList`
   - Устанавливается `showAlertList = true`
   - Если передан `stack`, он сохраняется в `hiddenAlert`

2. **Отображение:**
   - Кнопка переключения становится видимой (`active` класс)
   - Список уведомлений показывается (класс `show`)
   - Каждое уведомление отображается с иконкой (если не `hideIcon`)

3. **Автоматическое скрытие:**
   - Если `hideTime > 0`, через указанное время список скрывается
   - Уведомления остаются в `alertList`, но список не виден
   - При очистке всех уведомлений `hiddenAlert` также очищается

### Просмотр детальной информации

1. **Кнопка "show-hide":**
   - Появляется только если есть `hiddenAlert`
   - При клике устанавливает `showHiddenAlert = true`
   - Отображает stack trace под основным сообщением

2. **Детальная информация:**
   - Отображается в теге `<small>` с HTML-разметкой
   - Показывается только при `showHiddenAlert === true`
   - Содержит полный stack trace ошибки

### Закрытие уведомлений

1. **Ручное закрытие:**
   - Кнопка "close" удаляет конкретное уведомление из `alertList`
   - Использует фильтрацию: `alertList.filter((_, i) => i !== index)`

2. **Автоматическое закрытие:**
   - Через `hideTime` скрывается только список (`showAlertList = false`)
   - Уведомления остаются в массиве до ручного закрытия

3. **Полная очистка:**
   - `prettyAlertClear()` очищает все уведомления и скрывает список

## Стилизация

### Кнопка переключения (`toggle-alert-list-btn`)

```scss
.toggle-alert-list-btn {
  position: absolute;
  left: 0px;
  top: 50px;
  width: 20px;
  height: 20px;
  background-image: url(@/assets/info.png);
  background-size: contain;
  cursor: pointer;
  background-color: black;
  border-radius: 50%;
  
  display: none; // Скрыта по умолчанию
  
  &.active {
    display: block; // Показывается при наличии уведомлений
  }
  
  &:hover {
    opacity: 0.7;
  }
}
```

### Список уведомлений (`alert-list`)

```scss
.alert-list {
  position: absolute;
  top: auto;
  bottom: 110%; // Над helper-guru
  
  &.show {
    .alert {
      display: block; // Показываем уведомления
    }
  }
  
  .alert {
    display: none; // Скрыты по умолчанию
    position: relative;
    border: 4px solid #f4e205; // Желтая рамка
    background-image: url(@/assets/clear-black-back.png);
    color: white;
    font-size: 24px;
    padding: 10px 20px 10px 40px;
    min-width: 200px;
    text-align: center;
    cursor: default;
    margin-bottom: 10px;
    
    &:last-child {
      margin-bottom: 0;
    }
    
    // Иконка уведомления
    &::before {
      content: '';
      position: absolute;
      left: 20px;
      top: 20px;
      width: 30px;
      height: 30px;
      background-image: url(@/assets/alert.png);
      background-size: 30px;
    }
    
    // Скрытие иконки
    &.hide-icon {
      padding-left: 20px;
      
      &::before {
        display: none;
      }
    }
    
    // Кнопка закрытия
    > .close {
      position: absolute;
      right: -10px;
      top: -10px;
      width: 20px;
      height: 20px;
      background-image: url(@/assets/close.png);
      background-size: 20px;
      background-color: black;
      cursor: pointer;
      border-radius: 50%;
      
      &:hover {
        opacity: 0.7;
      }
    }
    
    // Ссылки в сообщении
    a {
      color: #f4e205 !important;
      font-weight: bold;
    }
    
    // Кнопка показа детальной информации
    > .show-hide {
      position: absolute;
      right: 15px;
      top: -10px;
      width: 20px;
      height: 20px;
      background-image: url(@/assets/info.png);
      background-size: 20px;
      background-color: black;
      border-radius: 50%;
      cursor: pointer;
    }
  }
}
```

### Адаптация для игры

В игровом режиме список уведомлений отображается снизу:

```scss
.helper.in-game .helper-guru {
  .alert-list {
    position: absolute;
    top: 120%; // Под helper-guru
    bottom: auto;
  }
}
```

### Мобильные устройства

```scss
.mobile-view .helper-guru {
  scale: 0.6;
  
  .alert {
    padding: 10px 10px 10px 50px;
    
    &::before {
      top: 10px; // Смещение иконки
    }
  }
}
```

## Жизненный цикл

### Инициализация (`mounted`)

При монтировании компонента создаются глобальные функции:

```javascript
mounted() {
  // ... другие инициализации ...
  
  const self = this;
  
  // Создание глобальной функции очистки
  window.prettyAlertClear = () => {
    this.alertList = [];
    this.hiddenAlert = null;
    this.showAlertList = false;
  };
  
  // Создание глобальной функции показа уведомлений
  window.prettyAlert = ({ message, stack } = {}, { hideTime = 3000, hideIcon = false } = {}) => {
    // ... реализация ...
  };
}
```

### Очистка

Глобальные функции остаются доступными до перезагрузки страницы или уничтожения компонента.

## Особенности

1. **Защита от дублирования:** Одинаковые сообщения не добавляются повторно
2. **Интеграция с меню:** Автоматически закрывает меню helper при показе уведомления
3. **Специальная обработка:** Добавляет рекомендацию для ошибки "Forbidden"
4. **Детальная информация:** Поддерживает отображение stack trace для отладки
5. **Автоматическое скрытие:** Может автоматически скрывать список через заданное время
6. **Глобальный доступ:** Функции доступны через `window`, что позволяет вызывать их из любого места приложения
7. **Адаптивность:** Разное позиционирование для лобби и игры

## Примеры использования

### Обработка ошибок API

```javascript
try {
  await api.action.call({ path: 'some.api.method' });
} catch (error) {
  window.prettyAlert(
    { 
      message: error.message || 'Произошла ошибка',
      stack: error.stack 
    },
    { hideTime: 5000 }
  );
}
```

### Обработка сетевых ошибок

```javascript
fetch('/api/data')
  .then(response => {
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
    return response.json();
  })
  .catch(error => {
    window.prettyAlert(
      { message: 'Ошибка загрузки данных', stack: error.stack },
      { hideTime: 0 } // Не скрывать автоматически
    );
  });
```

### Очистка уведомлений

```javascript
// После успешного действия
await saveData();
window.prettyAlertClear(); // Очистить все предыдущие ошибки
```

### Уведомление без иконки

```javascript
window.prettyAlert(
  { message: 'Информационное сообщение' },
  { hideIcon: true, hideTime: 3000 }
);
```

## Бэкенд логика

### Обработка ошибок в API

#### Метод `api.action.call`

При возникновении ошибки в любом API-методе бэкенд автоматически отправляет событие `alert` на фронтенд.

**Расположение:** `api/action.1/call.js`

**Реализация:**
```javascript
({
  method: async ({ path, args = [] }) => {
    try {
      // Поиск метода в domain или lib
      const splittedPath = new Set(path.split('.'));
      if (!splittedPath.has('api')) throw new Error(`Method (path="${path}") not found`);
      
      let method = lib.utils.getDeep(domain, [...splittedPath]);
      if (!method) method = lib.utils.getDeep(lib, [...splittedPath]);
      
      if (typeof method !== 'function') throw new Error(`Method (path="${path}") not found`);
      if (!Array.isArray(args)) args = [args || {}];
      
      const result = await method(context, ...args);
      result.serverTime = Date.now();
      return result;
    } catch (err) {
      console.error(err);
      
      // Отправка события alert на фронтенд
      try {
        context.client.emit('action/emit', {
          eventName: 'alert',
          data: { message: err.message, stack: err.stack },
        });
      } catch (transportError) {
        // Fallback для HTTP транспорта
        if (transportError.message.includes('http transport')) {
          try {
            context.client.send({
              eventName: 'alert',
              data: { message: err.message || err, stack: err.stack },
            });
          } catch (transportError) {
            console.error(transportError);
            throw transportError;
          }
        } else {
          console.error(transportError);
          throw transportError;
        }
      }
    }
  },
});
```

**Особенности:**
- Автоматически перехватывает все ошибки при выполнении API-методов
- Отправляет событие `alert` через WebSocket (`emit`) или HTTP (`send`)
- Включает полный stack trace для отладки
- Логирует ошибку в консоль сервера

#### Метод `api.action.public`

Аналогичная обработка для публичных API-методов.

**Расположение:** `api/action.1/public.js`

**Отличия:**
- Проверяет наличие флага `access: 'public'`
- Может возвращать ошибку как результат (в некоторых реализациях)

### Транспорт событий

#### WebSocket (основной)

Для WebSocket соединений используется `context.client.emit()`:

```javascript
context.client.emit('action/emit', {
  eventName: 'alert',
  data: { message: err.message, stack: err.stack },
});
```

#### HTTP (fallback)

Если WebSocket недоступен, используется HTTP транспорт:

```javascript
context.client.send({
  eventName: 'alert',
  data: { message: err.message || err, stack: err.stack },
});
```

### Обработка событий на фронтенде

#### Регистрация обработчика

В `main.js` регистрируется обработчик событий от бэкенда:

```javascript
const state = {
  // ... другие свойства ...
  emit: {
    updateStore(data) {
      mergeDeep({ target: state.store, source: data });
    },
    alert(data, config) {
      window.prettyAlert(data, config);
    },
    logout() {
      // ... логика выхода ...
    },
  },
};

// Обработка событий от бэкенда
api.action.on('emit', ({ eventName, data, config }) => {
  const event = state.emit[eventName];
  if (!event) return console.error(`event "${eventName}" not found`);
  event(data, config);
});
```

**Поток данных:**
1. Бэкенд отправляет событие `{ eventName: 'alert', data: { message, stack } }`
2. Обработчик `api.action.on('emit', ...)` перехватывает событие
3. Вызывается `state.emit.alert(data, config)`
4. Который вызывает `window.prettyAlert(data, config)`
5. Уведомление отображается в `alert-list`

### Обработка ошибок в catch-блоках

#### Прямой вызов prettyAlert

Во многих местах кода ошибки обрабатываются напрямую через `.catch()`:

```javascript
// Пример из helper.vue
api.action.call({
  path: 'helper.api.action',
  args: [{ tutorial, step, usedLink: code }],
}).catch(prettyAlert);

// Пример из main.js
const result = await api.action.call({ path, args })
  .catch((err) => window.prettyAlert(err));
```

**Особенности:**
- Ошибка передается напрямую в `prettyAlert`
- Если ошибка — объект, используется `err.message` и `err.stack`
- Если ошибка — строка, она используется как сообщение

### Типы ошибок

#### Ошибки валидации

```javascript
// Пример: метод не найден
throw new Error(`Method (path="${path}") not found`);

// Пример: неправильные параметры
throw new Error('Invalid parameters');
```

#### Ошибки бизнес-логики

```javascript
// Пример из updateTutorial.js
if (currentTutorial.active) {
  throw new Error('Другое обучение уже активно в настоящий момент');
}

if (!helper) {
  throw new Error('Tutorial initial step not found');
}
```

#### Системные ошибки

- Ошибки базы данных
- Ошибки сети
- Ошибки доступа (Forbidden)

### Специальная обработка ошибок

#### Ошибка "Forbidden"

На фронтенде есть специальная обработка для ошибки "Forbidden":

```javascript
if (message === 'Forbidden') {
  message += ' (рекомендуется обновить страницу)';
}
```

Это добавляет рекомендацию пользователю обновить страницу при ошибке доступа.

### Логирование ошибок

#### На бэкенде

Все ошибки логируются в консоль сервера:

```javascript
catch (err) {
  console.error(err);
  // ... отправка на фронтенд ...
}
```

#### На фронтенде

Ошибки также могут логироваться в консоль браузера перед показом уведомления.

### Примеры потока обработки ошибок

#### Пример 1: Ошибка в API-методе

1. **Бэкенд:** Выполняется `helper.api.action`
2. **Ошибка:** Метод выбрасывает `Error('Tutorial not found')`
3. **Перехват:** `api.action.call` перехватывает ошибку в `catch`
4. **Отправка:** Отправляется событие `{ eventName: 'alert', data: { message: 'Tutorial not found', stack: '...' } }`
5. **Фронтенд:** `api.action.on('emit', ...)` получает событие
6. **Вызов:** `state.emit.alert({ message: 'Tutorial not found', stack: '...' })`
7. **Отображение:** `window.prettyAlert({ message: 'Tutorial not found', stack: '...' })`
8. **UI:** Уведомление появляется в `alert-list`

#### Пример 2: Ошибка в catch-блоке

1. **Фронтенд:** Выполняется `api.action.call({ path: 'some.api.method' })`
2. **Ошибка:** Метод возвращает ошибку
3. **Перехват:** `.catch(prettyAlert)` перехватывает ошибку
4. **Вызов:** `prettyAlert(err)` вызывается напрямую
5. **Отображение:** Уведомление появляется в `alert-list`

### Интеграция с другими системами

#### Обработка ошибок в iframe

При работе в iframe ошибки могут передаваться через `postMessage`:

```javascript
window.addEventListener('message', async (e) => {
  const { path, args } = e.data;
  if (path && args) {
    const result = await api.action.call({ path, args })
      .catch((err) => window.prettyAlert(err));
    return result;
  }
});
```

#### Обработка ошибок в компонентах

Компоненты могут использовать `prettyAlert` напрямую:

```javascript
// В компоненте Vue
methods: {
  async saveData() {
    try {
      await api.action.call({ path: 'data.api.save', args: [this.data] });
    } catch (error) {
      prettyAlert({ message: 'Ошибка сохранения', stack: error.stack });
    }
  }
}
```

## Связанные компоненты

- `helper-guru` — главный элемент helper-системы, на котором отображается alert-list
- `helper-menu` — меню helper, которое закрывается при показе уведомлений
- `api.action.call` — основной метод вызова API, который обрабатывает ошибки
- `api.action.public` — публичный метод API с аналогичной обработкой ошибок
- `main.js` — точка входа приложения, где регистрируется обработчик событий `alert`
