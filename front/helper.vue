<template>
  <div v-if="!resetFlag" :class="['helper', game ? 'in-game' : '', ...helperClass]" @change="handleChange">
    <div v-for="link in filledHelperLinks" :key="link.code"
      :class="['helper-link', 'helper-avatar', link.customClass, link.used ? 'used' : '']" :style="{
        left: `${link.clientRect.left + (link.pos.left ? 0 : link.clientRect.width)}px`,
        top: `${link.clientRect.top + (link.pos.top ? 0 : link.clientRect.height)}px`,
      }" v-on:click.stop="showTutorial(link)" />

    <div v-if="!menu" :class="['helper-guru', 'helper-avatar', `scale-${state.guiScale}`]" v-on:click.stop="initMenu">
      <div :class="['toggle-alert-list-btn', alertList.length > 0 ? 'active' : '']"
        v-on:click.stop="showAlertList = !showAlertList" />
      <div :class="['alert-list', showAlertList ? 'show' : '']">
        <div v-for="(alert, index) in alertList" :key="index" class="alert" v-on:click.stop="">
          <span v-html="alert" />
          <div v-if="showHiddenAlert">
            <small v-html="hiddenAlert" />
          </div>
          <div v-if="hiddenAlert" class="show-hide" v-on:click.stop="showHiddenAlert = true" />
          <div class="close" v-on:click.stop="alertList = alertList.filter((_, i) => i !== index)" />
        </div>
      </div>
    </div>
    <div v-if="menu" :class="['helper-menu', `scale-${state.guiScale}`, menu.bigControls ? 'big-controls' : '']">
      <div class="helper-avatar" />
      <div class="content">
        <div class="text" v-html="menu.text" />
        <div v-if="menu.html" v-html="menu.html(game)"></div>
        <ul v-if="menu.showList?.length" class="list">
          <li v-for="(item, idx) in menu.showList.filter(item => item)" :key="'showList-' + idx"
            v-on:click.stop="action(item.action)">
            {{ item.title }}
          </li>
        </ul>

        <div v-if="menu.buttons" class='controls'>
          <button v-for="button in menu.buttons.filter(b => b)" :key="button.text"
            v-on:click.stop="menuAction({ action: button.action })" :class="[button.customClass]"
            :style="button.style || {}">
            {{ button.text }}
            <font-awesome-icon v-if="button.exit" :icon="['far', 'circle-xmark']" size="lg" style="color: #f4e205" />
            <font-awesome-icon v-if="button.action === 'leaveGame'" :icon="['fas', 'right-from-bracket']" size="lg"
              style="color: #f4e205" />
          </button>
        </div>
      </div>
    </div>
    <helper-dialog :game="game" :dialogClassMap="dialogClassMap" :dialogStyle="dialogStyle" :action="action"
      :inputData="inputData" />
  </div>
</template>

<script>
import helperDialog from './components/dialog.vue';

export default {
  name: 'helper',
  components: {
    helperDialog,
  },
  props: {
    game: Object,
    showProfile: Function,
    customMenu: Object,
  },
  data() {
    return {
      timeoutId: null,
      alertList: [],
      showAlertList: false,
      hiddenAlert: null,
      showHiddenAlert: false,
      mutationObserver: null,
      helperLinksBounds: {},
      menu: null,
      dialogActive: false,
      helperClassMap: {},
      dialogStyle: {},
      dialogClassMap: {},
      resetFlag: false,
      inputData: {},
      keyDownHandler: null,
      keyUpHandler: null,
    };
  },
  watch: {
    'helperData.text': function () {
      this.update();
    },
    'helperData.html': function () {
      this.update();
    },
    'helperData.menu': function (action) {
      this.menuAction({ action });
    },
  },
  computed: {
    state() {
      return this.$root.state || {};
    },
    helperData() {
      return this.state.store.user?.[this.state.currentUser]?.helper || {};
    },
    helperDialogActive() {
      return this.helperData.text || this.helperData.html || this.helperData.img ? true : false;
    },
    helperLinks() {
      return this.state.store.user?.[this.state.currentUser]?.helperLinks || {};
    },
    helperLinksEntries() {
      return Object.entries(this.helperLinks).filter(
        ([code, link]) => link.type === (this.game ? 'game' : 'lobby')
      );
    },
    filledHelperLinks() {
      const result = Object.entries(this.helperLinks)
        .map(([code, link]) => ({
          ...{ code, pos: {}, ...link },
          clientRect: this.helperLinksBounds[code],
        }))
        .filter(({ clientRect }) => clientRect);
      return result;
    },
    helperClass() {
      return Object.entries(this.helperClassMap)
        .filter(([name, enabled]) => enabled)
        .map(([name]) => name);
    },
    dialogClass() {
      return Object.entries(this.dialogClassMap)
        .filter(([name, enabled]) => enabled)
        .map(([name]) => name);
    },
    menuData() {
      return this.helperData.menu || null;
    },
  },
  methods: {
    async update() {
      let {
        text,
        html,
        img,
        active = [],
        pos,
        superPos = false,
        showMenu = false,
        fullscreen = false,
        actions,
        buttons,
        bigControls,
        hideTime,
        utils = {},
      } = this.helperData;
      if (!pos) pos = 'bottom-right'; // тут может быть null

      if (typeof pos === 'object') {
        if (this.state.isMobile) {
          pos = pos.mobile;
          if (typeof pos === 'object') {
            pos = this.state.isLandscape ? pos.landscape : pos.portrait;
          }
        } else pos = pos.desktop;
      }

      this.$set(this.helperClassMap, 'dialog-hidden', false);
      this.$set(this.helperClassMap, 'dialog-active', text || html || img ? true : false);
      this.$set(this.helperClassMap, 'fullscreen', fullscreen);
      this.$set(this.helperClassMap, 'super-pos', false);
      this.$set(this.helperClassMap, 'show-menu', false);

      this.$set(this.dialogClassMap, 'big-controls', bigControls ? true : false);

      document.body.removeAttribute('tutorial-active');

      const dialogStyle = {};
      const offset = this.state.isMobile ? '0px' : '20px';
      if (showMenu) this.$set(this.helperClassMap, 'show-menu', true);
      if (superPos) {
        document.body.setAttribute('tutorial-active', 1);
        this.$set(this.helperClassMap, 'super-pos', true);
      } else if (fullscreen) {
        if (pos.includes('top'))
          Object.assign(dialogStyle, { top: offset, left: offset, width: '100%', height: '100%' });
      } else {
        pos = pos.split('-');
        if (pos.includes('top')) Object.assign(dialogStyle, { top: offset, bottom: 'auto' });
        if (pos.includes('bottom')) Object.assign(dialogStyle, { bottom: offset, top: 'auto' });
        if (pos.includes('left')) Object.assign(dialogStyle, { left: offset, right: 'auto' });
        if (pos.includes('right')) Object.assign(dialogStyle, { right: offset, left: 'auto' });
        dialogStyle['transform-origin'] = pos.join(' ');
      }
      this.dialogStyle = dialogStyle;

      let actionsData = {};
      if (actions) {
        if (utils) { // вспомогательные функции, вызываемые внутри actions
          for (const [name, func] of Object.entries(utils)) {
            if (typeof func === 'string') {
              utils[name] = new Function('return ' + func.replace(`${name}(data)`, '(data)=>'))();
            }
          }
        }

        if (actions.before) {
          const context = { $root: this.$root.$el, state: this.state, utils };
          actionsData = await new Function('return ' + actions.before)()(context) || {};
        }
      }
      const { skipStep } = actionsData;
      if (skipStep) {
        this.$set(this.helperClassMap, 'dialog-hidden', true);
        let skipButton = typeof skipStep === 'object' ? skipStep.goto : null;
        if (!skipButton) skipButton = buttons.find((button) => button.step);
        this.action(skipButton);
        return;
      }

      document.querySelectorAll('.tutorial-active').forEach((el) => {
        el.classList.remove('tutorial-active');
      });

      if (active.length) {
        for (let { selector, onlyFirst, onclick, customClass, css } of active) {
          // если в beforeAction проводились манипуляции с dom, то селектор отработает только в nextTick
          document.querySelectorAll(selector).forEach((el, index) => {
            if (onlyFirst && index > 0) return;
            if (el) {
              el.classList.add('tutorial-active');
              if (css) {
                // Сохраняем текущие стили перед перезаписью
                if (!el._originalStyles) {
                  el._originalStyles = {};
                  const computedStyle = window.getComputedStyle(el);
                  Object.entries(css).forEach(([origKey, val]) => {
                    const key = (origKey in el.style || el.style.hasOwnProperty(origKey)) ? origKey : this.convertToFirefoxStyle(origKey);
                    el._originalStyles[key] = computedStyle.getPropertyValue(key);
                    el.style[key] = val;
                  });
                }
              }
              if (customClass) el.classList.add(customClass);
              if (onclick) el.addEventListener('click', () => this.action(onclick));
            }
          });
        }
      }

      if (this.timeoutId) {
        clearTimeout(this.timeoutId);
        this.timeoutId = null;
      }
      if (hideTime > 0) {
        const self = this;
        this.timeoutId = setTimeout(() => {
          clearTimeout(this.timeoutId);
          self.$set(this.helperClassMap, 'dialog-active', false);
        }, hideTime);
      }
    },
    async action({ action, step, tutorial, link }) {
      if (link) {
        const a = document.createElement('a');
        a.style.display = 'none';
        a.href = link;
        a.target = '_blank';
        document.body.appendChild(a);
        a.click();
      } else {
        let { actions, utils } = this.helperData;
        let actionsData = {};

        if (actions) {
          if (utils) { // вспомогательные функции, вызываемые внутри actions
            for (const [name, func] of Object.entries(utils)) {
              if (typeof func === 'string') {
                utils[name] = new Function('return ' + func.replace(`${name}(data)`, '(data)=>'))();
              }
            }
          }

          if (actions[action]) {
            const context = { inputData: this.inputData, $root: this.$root.$el, state: this.state, utils };
            if (typeof actions[action] === 'string') { // приходит с бэка
              actionsData = await new Function('return ' + actions[action])()(context);
            } else { // объявлено на фронте
              actionsData = await actions[action](context);
            }
          }
        }
        if (actionsData?.exit) action = 'exit';

        await api.action
          .call({
            path: 'helper.api.action',
            args: [{ action, step, tutorial, isMobile: this.state.isMobile }],
          })
          .catch(prettyAlert);
        if (tutorial) this.menu = null;
      }
    },
    async initMenu() {
      this.menu = this.customMenu;
    },
    async menuAction({ action }) {
      if (typeof action === 'function') return await action.call(this);

      if (action.tutorial) {
        await api.action
          .call({
            path: 'helper.api.action',
            args: [{ ...action, isMobile: this.state.isMobile }],
          })
          .catch(prettyAlert);
        this.menu = null;
        return;
      }

      switch (action) {
        case 'exit':
          this.menu = null;
          break;
        case 'init':
          this.initMenu();
          break;
        default:
          this.menu = action;
      }
    },
    showTutorial({ tutorial, code, simple = true }) {
      // не актуально, так как: .helper.dialog-active > .helper-link { display: none }
      if (this.helperDialogActive) return; // другое обучение уже активировано
      if (!tutorial) return;
      api.action
        .call({
          path: 'helper.api.action',
          args: [{ tutorial, step: simple ? code : undefined, usedLink: code }],
        })
        .catch(prettyAlert);
      return;
    },
    updateLinksCoordinates() {
      const helperLinksBounds = Object.fromEntries(
        this.helperLinksEntries.map(([code, link]) => {
          const element = this.$root.$el.querySelector(link.selector);
          const isVisible = element ? this.isElementVisible(element) : false;
          return [code, isVisible ? element?.getBoundingClientRect() : null];
        })
      );
      this.$set(this, 'helperLinksBounds', helperLinksBounds);
    },
    isElementVisible(element) {
      if (!element) return false;

      const style = window.getComputedStyle(element);
      if (style.display === 'none' || style.visibility === 'hidden' || style.opacity === '0') {
        return false;
      }

      const rect = element.getBoundingClientRect();
      if (rect.width === 0 || rect.height === 0) {
        return false;
      }

      // Проверяем, находится ли элемент в области видимости
      const isInViewport = (
        rect.top >= 0 &&
        rect.left >= 0 &&
        rect.bottom <= (window.innerHeight || document.documentElement.clientHeight) &&
        rect.right <= (window.innerWidth || document.documentElement.clientWidth)
      );

      return isInViewport;
    },
    handleChange(event) {
      const code = event.target.name;
      this.inputData[code] = event.target.value;
    },
    convertToFirefoxStyle(css) {
      return Object.entries(css).reduce((acc, [key, value]) => {
        // Конвертируем camelCase в kebab-case
        const kebabKey = key.replace(/([a-z0-9])([A-Z])/g, '$1-$2').toLowerCase();
        acc[kebabKey] = value;
        return acc;
      }, {});
    },
  },
  mounted() {
    // watch не всегда ловит обновление helperData на старте
    this.$nextTick(this.update);

    // Инициируем пересчет filledHelperLinks
    this.$nextTick(this.updateLinksCoordinates);

    const self = this;
    window.prettyAlertClear = () => {
      this.alertList = [];
      this.hiddenAlert = null;
      this.showAlertList = false;
    };
    window.prettyAlert = ({ message, stack } = {}, { hideTime = 3000 } = {}) => {
      if (this.alertList.includes(message)) return;

      this.menu = null;

      if (message === 'Forbidden') message += ' (попробуйте обновить страницу)';
      this.alertList = [message];
      this.showAlertList = true;
      self.hiddenAlert = stack;
      if (self.hiddenAlert) this.showHiddenAlert = false;

      if (hideTime > 0) {
        setTimeout(() => {
          self.showAlertList = false;
          // this.alertList = this.alertList.filter(alert => alert !== message);
          if (this.alertList.length === 0) {
            self.hiddenAlert = null;
          }
        }, hideTime);
      }
    };

    // Слушатель нажатия клавиши Ctrl
    const handleKeyDown = (event) => {
      if (event.key === 'Control') {
        document.body.classList.add('show-used-helper-links');
      }
    };

    const handleKeyUp = (event) => {
      if (event.key === 'Control') {
        document.body.classList.remove('show-used-helper-links');
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener('keyup', handleKeyUp);

    this.mutationObserver = new MutationObserver(function (mutationsList, observer) {
      mutationsList.forEach(mutation => {
        if (mutation.type === 'attributes' && mutation.attributeName === 'class') {
          const el = mutation.target;
          const oldClasses = mutation.oldValue || '';
          const newClasses = el.className;

          // Если класс tutorial-active был удален
          if (oldClasses.includes('tutorial-active') && !newClasses.includes('tutorial-active')) {
            // Восстанавливаем сохраненные стили
            if (el._originalStyles) {
              Object.keys(el._originalStyles).forEach(key => {
                el.style[key] = el._originalStyles[key];
              });
              delete el._originalStyles;
            }
          }
        }
      });
      self.updateLinksCoordinates();
    });
    this.mutationObserver.observe(document.querySelector('body'), {
      attributes: true,
      // attributeFilter: [/* 'markup-code',  */ 'markup-onload'],
      childList: true,
      subtree: true,
      attributeOldValue: true,
    });
    document.addEventListener('transitionend', () => {
      self.updateLinksCoordinates();
    });

    // Сохраняем ссылки на обработчики для удаления в beforeDestroy
    this.keyDownHandler = handleKeyDown;
    this.keyUpHandler = handleKeyUp;
  },
  async beforeDestroy() {
    this.mutationObserver.disconnect();

    // Удаляем слушатели событий клавиатуры
    if (this.keyDownHandler) {
      document.removeEventListener('keydown', this.keyDownHandler);
    }
    if (this.keyUpHandler) {
      document.removeEventListener('keyup', this.keyUpHandler);
    }
  },
};
</script>

<style lang="scss">
.helper-avatar {
  border-radius: 50%;
  background-image: url(./assets/helper.png);
  background-size: contain;
  border: 4px solid #f4e205;
}

.helper-guru {
  position: fixed !important;
  z-index: 10000 !important;
  bottom: 20px;
  left: 20px;
  width: 64px;
  height: 64px;
  cursor: pointer;
  font-size: 14px;
  transform-origin: left bottom;

  .alert-list {
    position: absolute;
    top: auto;
    bottom: 110%;

    &.show {
      .alert {
        display: block;
      }
    }

    .alert {
      display: none;
      position: relative;
      border: 4px solid #f4e205;
      background-image: url(@/assets/clear-black-back.png);
      color: white;
      font-size: 24px;
      padding: 20px 60px 20px 80px;
      min-width: 300px;
      text-align: center;
      cursor: default;
      margin-bottom: 10px;

      &:last-child {
        margin-bottom: 0;
      }

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

      >.close {
        position: absolute;
        right: -10px;
        top: -10px;
        width: 20px;
        height: 20px;
        background-image: url(@/assets/close.png);
        background-size: 20px;
        background-color: black;
        cursor: pointer;

        &:hover {
          opacity: 0.7;
        }

      }

      a {
        color: #f4e205 !important;
        font-weight: bold;
      }

      >.show-hide {
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

    display: none;

    &.active {
      display: block;
    }

    &:hover {
      opacity: 0.7;
    }
  }


  &.scale-1 {
    scale: 0.8;
  }

  &.scale-2 {
    scale: 1;
  }

  &.scale-3 {
    scale: 1.5;
  }

  &.scale-4 {
    scale: 2;
  }

  &.scale-5 {
    scale: 2.5;
  }
}

.mobile-view .helper-guru {
  scale: 0.6;

  .alert {
    padding: 10px 10px 10px 50px;

    &::before {
      top: 10px;
    }
  }
}

.helper.in-game .helper-guru {
  top: 20px;
  bottom: auto;
  transform-origin: left top;

  .alert-list {
    position: absolute;
    top: 110%;
    bottom: auto;
  }
}

.helper.dialog-active>.helper-guru,
.helper.dialog-active>.helper-link {
  display: none;
}

.helper.dialog-hidden {
  display: none;
}

.helper-menu {
  position: fixed;
  display: flex;
  z-index: 10000 !important;
  width: 600px;
  left: 20px;
  bottom: 20px;
  max-width: 50%;
}

.mobile-view .helper-menu {
  bottom: 70px;
}

.mobile-view.portrait-view .helper-menu {
  max-width: 100%;
}

#lobby .helper-menu {
  transform-origin: left bottom;
}

#game .helper-menu {
  transform-origin: left top;
  top: 20px;
  bottom: auto;
}

.helper-menu.scale-1 {
  scale: 0.8;

  &.big-controls {
    bottom: 120px;
  }
}

.helper-menu.scale-2 {
  scale: 1;

  &.big-controls {
    bottom: 140px;
  }
}

.helper-menu.scale-3 {
  scale: 1.5;

  &.big-controls {
    bottom: 200px;
  }
}

.helper-menu.scale-4 {
  scale: 2;

  &.big-controls {
    bottom: 260px;
  }
}

.helper-menu.scale-5 {
  scale: 2.5;

  &.big-controls {
    bottom: 380px;
  }
}

.mobile-view .helper-menu {
  scale: 1;
  left: 0px;
}

.helper.in-game .helper-menu {
  left: 0px;
  right: auto;
}

.helper-menu>.content {
  display: flex;

  .text {
    width: 100%;
    text-align: left;
  }

  .list {
    margin-bottom: 20px;

    >* {
      cursor: pointer;
      padding: 0px 20px;
      text-align: left;
      padding-bottom: 6px;

      &:hover {
        opacity: 0.7;
      }
    }
  }
}

.helper.super-pos::after {
  content: '';
  background-image: url(@/assets/clear-black-back.png);
  position: fixed;
  left: 0px;
  top: 0px;
  width: 100%;
  height: 100%;
  z-index: 10000;
}

.helper-dialog {
  display: none;
  position: fixed;
  z-index: 10001 !important;
  width: 600px;
  max-width: 100%;
  max-height: 95%;

  &.scale-1 {
    scale: 0.8;
  }

  &.scale-2 {
    scale: 1;
  }

  &.scale-3 {
    scale: 1.2;
  }

  &.scale-4 {
    scale: 2;
  }

  &.scale-5 {
    scale: 2.5;
  }
}

.helper.super-pos .helper-dialog {
  position: fixed;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);

  &.scale-1 {
    transform: translate(-60%, -60%);
  }

  &.scale-2 {
    transform: translate(-50%, -50%);
  }

  &.scale-3 {
    transform: translate(-40%, -40%);
  }

  &.scale-4 {
    transform: translate(-25%, -25%);
  }

  &.scale-5 {
    transform: translate(-20%, -20%);
  }

  .content {
    padding-right: 40px;
    align-items: center;
    overflow: hidden;

    .img {
      width: 100%;

      img {
        max-width: 100%;
        height: 100%;
      }
    }

    &.nowrap {
      flex-wrap: wrap;
    }

    &.split-img-text {
      .img {
        width: 100%;
        max-width: none;
      }

      .text {
        width: 100%;
        padding-left: 0px;
      }
    }
  }

}

.mobile-view .helper-dialog {
  scale: 1;
}

.mobile-view .helper.super-pos .helper-dialog {
  transform: translate(-50%, -50%);
}

.helper.dialog-active>.helper-dialog {
  display: flex;
}

.helper-dialog>.content,
.helper-menu>.content {
  width: 100%;
  margin: 30px;
  border: 2px solid #f4e205;
  background-image: url(@/assets/clear-black-back.png);
  padding: 20px 60px 30px 40px;
  white-space: pre-wrap;
  color: #f4e205;
  overflow: auto;
  display: flex;
  flex-wrap: wrap;
  line-height: 22px;

  .input {
    display: flex;
    justify-content: center;
    width: 100%;
    align-items: start;

    input {
      color: #f4e205;
      border-color: #f4e205;
      text-align: center;
      background: black;
      border-radius: 4px;
      font-size: 16px;
      padding: 4px;
      margin: 20px 0px 10px 0px;
    }

    select {
      color: #f4e205;
      border-color: #f4e205;
      text-align: center;
      background: black;
      border-radius: 4px;
      font-size: 16px;
      padding: 4px;
      margin: 20px 0px 10px 20px;

      >option {
        font-size: 10px;
      }
    }
  }
}

.mobile-view .helper-dialog>.content,
.mobile-view .helper-menu>.content {
  font-size: 10px;
  padding: 10px 24px 20px 10px;
  min-height: 40px;
  background: black;
}

.helper-dialog>.content.nowrap,
.helper-menu>.content.nowrap {
  flex-wrap: nowrap;
}

.helper-menu>.content {
  min-height: 50px;
}

.mobile-view.landscape-view .helper-dialog {
  max-width: 50%;
}

.helper-dialog>.content>.text {
  width: 100%;

  a {
    color: #f4e205;
    font-weight: bold;
  }
}

.helper-dialog>.content>.controls,
.helper-menu>.content>.controls {
  position: absolute;
  bottom: 6px;
  left: 0px;
  width: 100%;
  display: flex;
  justify-content: center;

  button {
    border-color: #f4e205;
    color: #f4e205;
    background-image: url(@/assets/clear-black-back.png);
    padding: 10px 20px;
    display: flex;
    justify-content: center;
    cursor: pointer;

    &:hover {
      color: white !important;

      a {
        color: white !important;
      }
    }

  }
}

.helper-dialog.big-controls>.content>.controls,
.helper-menu.big-controls>.content>.controls {
  top: 100%;
  flex-wrap: wrap;
  margin-top: -40px;

  button {
    width: 60%;

    svg {
      margin-left: 4px;
    }
  }
}

.mobile-view .helper-dialog>.content>.controls>button,
.mobile-view .helper-menu>.content>.controls>button {
  padding: 4px 10px;
  font-size: 10px;
}

.helper-dialog>.helper-avatar,
.helper-menu>.helper-avatar {
  position: absolute;
  z-index: 10001 !important;
  border-radius: 50%;
  border: 3px solid #f4e205;
  right: 10px;
  top: 10px;
  width: 48px;
  height: 48px;
}

.mobile-view .helper-dialog>.helper-avatar,
.mobile-view .helper-menu>.helper-avatar {
  width: 40px;
  height: 40px;
}

body[tutorial-active] #app:after {
  content: '';
  position: fixed !important;
  z-index: 9999;
  width: 100%;
  height: 100%;
  top: 0px;
  left: 0px;
  background-image: url(@/assets/clear-grey-back.png);
}

.tutorial-active {
  z-index: 10000 !important;
  position: relative;
  box-shadow: 0 0 100px 10px #f4e205;
}

.tutorial-active.rounded {
  box-shadow: 0 0 20px 20px #f4e205;
  border-radius: 50%;
}

.helper.fullscreen {
  width: 100%;
  display: flex;
  justify-content: center;
}

.helper.fullscreen .helper-dialog {
  width: auto !important;
}

.helper-link {
  position: fixed;
  width: 30px;
  height: 30px;
  margin-left: -25px;
  margin-top: -25px;
  z-index: 99;
  cursor: pointer;
  box-shadow: 0 0 10px 10px #f4e205;
  border: 1px solid #f4e205;

  &:hover {
    opacity: 0.7;
  }

  &.used {
    display: none;
  }
}

.show-used-helper-links .helper-link.used {
  display: block;
}

.mobile-view .helper-link {
  width: 30px;
  height: 30px;
}

.helper.dialog-active.show-menu>.helper-guru {
  z-index: 100000 !important;
  display: block;
}

.helper.dialog-active.show-menu>.helper-menu {
  z-index: 100000 !important;
}

.tutorial-show,
.tutorial-show-flex {
  display: none !important;
}

.tutorial-active {

  &.tutorial-show {
    display: block !important;
  }

  &.tutorial-show-flex {
    display: flex !important;
  }
}
</style>
