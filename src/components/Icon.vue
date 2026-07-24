<template>
  <svg v-if="isLocal" class="svg-icon" :style="{ fontSize: size || '1em' }" aria-hidden="true">
    <use :xlink:href="symbolId" />
  </svg>
  <IconifyIcon class="inline-flex" v-else :icon="(symbolId as string)" :style="{ fontSize: size || '1em' }" />
</template>

<script setup lang="ts">
import { isString } from '@/utils/is';
import { computed, unref } from 'vue';
import { Icon as IconifyIcon } from '@iconify/vue';

const props = defineProps<{
  icon: string
  size?: string
}>()
  const isLocal = computed(() => isString(props.icon) && props.icon.startsWith('svg-icon:'));
  const symbolId = computed(() => {
    return isString(props.icon) && unref(isLocal)
      ? `#icon-${props.icon.split('svg-icon:')[1]}`
      : props.icon;
  });
</script>

<style scoped>
.svg-icon {
  fill: currentColor;
  display: inline-flex;
  vertical-align: middle;
  width: 1em;
  height: 1em;
}
</style>
