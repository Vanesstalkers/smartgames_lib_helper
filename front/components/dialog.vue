<template>
  <div :class="['helper-dialog', 'scroll-off', `scale-${state.guiScale}`, ...dialogClass]" :style="dialogStyle">
    <div class="helper-avatar" />
    <div :class="['content', helperData.img && helperData.text ? 'split-img-text' : '']">
      <div v-if="helperData.img" class="img">
        <img :src="helperData.img" />
      </div>

      <div v-if="helperData.text" class="text" v-html="helperData.text.trim()" />
      <div v-if="helperData.html" v-html="helperDataHtml()"></div>
      <div v-if="helperData.input" class="input">
        <div v-for="input in helperDataInputs()">
          <input v-if="!input.type || input.type === 'input'" :key="input.name" :name="input.name" :value="input.value"
            :placeholder="input.placeholder" />
          <select v-if="input.type === 'select'" :key="input.name" :name="input.name" :value="input.value">
            <option v-for="option in input.options" :key="option.value" :value="option.value">{{ option.value }}
            </option>
          </select>
        </div>
      </div>
      <div class="video" />
      <div v-if="helperData.buttons" class="controls">
        <button v-for="button in helperData.buttons" :key="button.text" v-on:click.stop="action({ ...button })">
          <font-awesome-icon v-if="button.icon" :icon="button.icon" size="lg"
            style="color: #f4e205; padding-right: 4px" />
          <span v-html="button.text" />
          <div v-if="button.exit" class="exit-icon" />
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
      default: () => () => { },
    },
    inputData: {
      type: Object,
      default: () => ({}),
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
  },
  methods: {
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
  },
};
</script>

<style lang="scss">
.helper-dialog {
  .content {
    .img {
      img {
        width: 100%;
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
  }

  a {
    color: lightblue !important;
  }

  .text-left {
    text-align: left;
  }
}
</style>
