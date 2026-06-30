<script setup lang="ts">
import { computed } from "vue";

const props = defineProps<{
  options: any[];
  value?: string;
  closeable?: boolean;
}>();

const emit = defineEmits<{ close: [] }>();
const label = computed(() => {
  if (!props.value) return "";
  const opt = props.options.find(
    (o) => o.key === props.value || o.value === props.value,
  );
  if (!opt) return props.value;
  return opt.name ?? opt.label ?? opt.key ?? opt.value ?? String(opt);
});
</script>

<template>
  <span
    class="badge badge-ghost badge-sm gap-1 cursor-pointer"
    @click="closeable && emit('close')"
  >
    {{ label }} <span v-if="closeable">✕</span>
  </span>
</template>
