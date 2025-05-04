<template>
  <div :class="['helper-dialog', 'scroll-off', `scale-${state.guiScale}`, ...dialogClass]" :style="dialogStyle">
    <div class="helper-avatar" />
    <div :class="['content', helperData.img && helperData.text ? 'nowrap' : '']">
      <div v-if="helperData.img" class="img">
        <img :src="helperData.img" />
      </div>

      <div v-if="helperData.text" class="text">{{ helperData.text }}</div>
      <div v-if="helperData.html" v-html="helperDataHtml()"></div>
      <div v-if="helperData.input" class="input">
        <input :value="helperData.input.value" :placeholder="helperData.input.placeholder" :name="helperData.input.name" />
      </div>
      <div class="video" />
      <div v-if="helperData.buttons" class="controls">
        <button v-for="button in helperData.buttons" :key="button.text" v-on:click.stop="action({ ...button })">
          <font-awesome-icon v-if="button.icon" :icon="button.icon" size="lg"
            style="color: #f4e205; padding-right: 4px" />
          {{ button.text }}
          <div v-if="button.exit" class="exit-icon" />
        </button>
      </div>
    </div>
  </div>
</template>

<script>
import { inject } from 'vue';

export default {
  name: 'helper',
  components: {},
  props: {
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
  setup() {
    return inject('gameGlobals');
  },
  computed: {
    state() {
      return this.$root.state || {};
    },
    game() {
      return this.getGame();
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
  },
};
</script>

<style lang="scss">
.helper-dialog {
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
    }
  }
}
</style>
