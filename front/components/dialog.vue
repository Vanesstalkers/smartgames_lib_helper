<template>
  <div :class="['helper-dialog', 'scroll-off', `scale-${state.guiScale}`, ...dialogClass]" :style="dialogStyle">
    <div class="helper-avatar">
      <div v-if="!controlsDisabled" class="dialog-controls">
        <div class="dialog-control-button plus" @click="changeScale(0.1)" />
        <div class="dialog-control-button minus" @click="changeScale(-0.1)" />
      </div>
    </div>
    <div :class="['content', helperData.img && helperData.text ? 'split-img-text' : '']">
      <div v-if="helperData.img" class="img">
        <img :src="helperData.img" />
      </div>

      <div v-if="helperData.text" class="text" v-html="helperData.text.trim()" />
      <div v-if="helperData.html" v-html="helperDataHtml()"></div>

      <ul v-if="helperData.showList?.length" class="list">
        <li
          v-for="(item, idx) in helperData.showList.filter((item) => item)"
          :key="'showList-' + idx"
          v-on:click.stop="action(item.action)"
          v-html="item.title"
        />
      </ul>

      <div v-if="helperData.input" class="input">
        <div v-for="input in helperDataInputs()">
          <label v-if="input.label">{{ input.label }}</label>
          <input
            v-if="!input.type || input.type === 'input'"
            :key="input.name"
            :name="input.name"
            :value="input.value"
            :placeholder="input.placeholder"
          />
          <select v-if="input.type === 'select'" :key="input.name" :name="input.name" :value="input.value">
            <option v-for="option in input.options" :key="option.value" :value="option.value">
              {{ option.label != null ? option.label : option.value }}
            </option>
          </select>
        </div>
      </div>
      <div v-if="dialogError" class="error" v-html="dialogError" />
      <div class="video" />
      <div v-if="helperDataButtons.length" class="controls">
        <button v-for="button in helperDataButtons" :key="button.text" v-on:click.stop="action({ ...button })">
          <font-awesome-icon
            v-if="button.icon"
            :icon="button.icon"
            size="lg"
            style="color: #f4e205; margin: -1px 6px 0px 0px"
          />
          <span v-html="button.text" />
          <div v-if="button.exit" style="color: white">{{ ' [Esc]' }}</div>
          <div v-if="button.default" style="color: white">{{ ' [Space]' }}</div>
        </button>
      </div>
    </div>
  </div>
</template>

<script>
export default {
  name: 'helper',
  components: {},
  props: {
    game: Object,
    customData: Object,
    dialogClassMap: {
      type: Object,
      default: () => ({}),
    },
    dialogStyle: Object,
    action: {
      type: Function,
      default: () => () => {},
    },
    inputData: {
      type: Object,
      default: () => ({}),
    },
    dialogError: {
      type: String,
      default: '',
    },
    controlsDisabled: {
      type: Boolean,
      default: false,
    },
  },
  data() {
    return {};
  },
  watch: {},
  computed: {
    state() {
      return this.$root.state || {};
    },
    helperData() {
      return this.customData || this.state.store.user?.[this.state.currentUser]?.helper || {};
    },
    dialogClass() {
      return Object.entries(this.dialogClassMap)
        .filter(([name, enabled]) => enabled)
        .map(([name]) => name);
    },
    helperDataButtons() {
      return this.helperData.buttons?.filter(Boolean) || [];
    },
  },
  methods: {
    handleKeyDown(event) {
      if (event.key === 'Escape' || event.keyCode === 27) {
        const exitButton = this.helperDataButtons?.find((button) => button.exit);
        if (exitButton) {
          this.action({ ...exitButton });
        }
      } else if (event.key === ' ' || event.keyCode === 32) {
        // Предотвращаем прокрутку страницы при нажатии Space
        event.preventDefault();
        const defaultButton = this.helperDataButtons?.find((button) => button.default);
        if (defaultButton) {
          this.action({ ...defaultButton });
        }
      }
    },
    helperDataHtml() {
      let html;
      if (typeof this.helperData.html === 'string') {
        html = new Function(`return ${this.helperData.html}`)()(this.game);
      } else {
        html = this.helperData.html(this.game);
      }
      return html;
    },
    helperDataInputs() {
      let input = this.helperData.input;
      if (typeof input === 'string') input = new Function(`return ${this.helperData.input}`)()({ ...this.game });
      if (!Array.isArray(input)) input = [input];

      if (Object.keys(this.inputData).length < input.length) {
        for (const { name, value } of input) {
          if (!this.inputData[name]) this.inputData[name] = value;
        }
      }

      return input;
    },
    changeScale(delta) {
      api.action.call({ path: 'user.api.update', args: [{ changeHelperScale: delta }] }).catch(prettyAlert);
    },
  },
  async mounted() {
    document.addEventListener('keydown', this.handleKeyDown);
  },
  async beforeDestroy() {
    document.removeEventListener('keydown', this.handleKeyDown);
  },
};
</script>

<style lang="scss">
.helper-dialog {
  .content {
    .error {
      width: 100%;
      color: red;
    }
    .input {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: 10px;
    }

    .img {
      img {
        width: auto;
        max-height: 400px;
      }
    }

    &.split-img-text {
      justify-content: space-around;
      align-items: center;

      .img {
        width: auto;
        max-width: calc(50% - 20px);
      }

      .text {
        width: 50%;
        padding-left: 20px;
      }
    }

    .list {
      margin-bottom: 20px;

      > * {
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

  a {
    color: lightblue !important;
  }

  .text-left {
    text-align: left;
  }

  .helper-avatar {
    &:hover .dialog-controls {
      display: flex;
    }
    .dialog-controls {
      display: none;
      position: absolute;
      font-size: 36px;
      gap: 4px;
      right: 20px;
      top: 20px;
      width: 50px;
      height: 50px;

      .dialog-control-button {
        cursor: pointer;
        width: 20px;
        height: 20px;
        background-size: 20px;
        background-repeat: no-repeat;
        background-position: center;

        position: absolute;
        &.plus {
          top: 2px;
          left: -2px;
          background-image: url(../assets/zoom_plus.png);
        }
        &.minus {
          background-image: url(../assets/zoom_minus.png);
          top: 33px;
          right: 2px;
        }

        &:hover {
          border: 2px solid transparent;
          margin-top: -1px;
          margin-left: -1px;
        }
        &:active {
          filter: brightness(0.8);
        }
      }
    }
  }
}
</style>
