<script setup lang="ts">
  import Icon from '@/components/Icon.vue';
  import { getItem } from '@/data/items';
  import { usePackStore } from '@/stores/modules/pack';
  import { useAppStore } from '@/stores/modules/app';
  import { useTaskStore } from '@/stores/modules/task';
  import { computed, ref } from 'vue';

  const props = defineProps<{
    description: string;
    required_items: { key: string | string[]; quantity: number, use?: number }[];
    required_techs?: string[];
    time_required?: number;
  }>();

  const packStore = usePackStore();
  const taskStore = useTaskStore();
  const appStore = useAppStore();

  const items = computed(() => {
    if (!showTooltip.value) return [];
    
    return props.required_items.map(item => {
      const keys = Array.isArray(item.key) ? item.key : [item.key]
      const known = keys.some(k => packStore.hasEverHad(k))
      
      // 尝试匹配当前有货的材料
      let targetKey = keys[0]
      const quantityCost = item.quantity || 0;
      const durabilityCost = item.use || 0;

      if (keys.length > 1) {
         const found = keys.find(k => {
           const itemDef = getItem(k);
           const isDurable = itemDef?.type.some(t => ['tool', 'container', 'battery'].includes(t)) || false;
           if (isDurable && durabilityCost > 0) {
             return (taskStore.projectedDurability.get(k) || 0) >= durabilityCost;
           }
           return (taskStore.projectedInventory.get(k) || 0) >= quantityCost;
         })
         if (found) targetKey = found
      }
      
      const itemData = getItem(targetKey);
      const isDurable = itemData?.durable ? true : false;
      const projectedQty = taskStore.projectedInventory.get(targetKey) || 0;
      const projectedDur = taskStore.projectedDurability.get(targetKey) || 0;

      return {
        key: targetKey,
        quantity: item.quantity,
        use: item.use || 0,
        name: itemData?.name || targetKey,
        known,
        isDurable,
        insufficient: known && (isDurable && item.use ? item.use > projectedDur : item.quantity > projectedQty),
      };
    });
  });

  const actualTime = computed(() => {
    if (!showTooltip.value || !props.time_required) return 0;
    const t = props.time_required * taskStore.timeMultiplier;
    return t < 1 ? t.toFixed(1) : Math.round(t);
  });

  // 移动端长按显示
  const mobileShow = ref(false);
  const isHovered = ref(false);
  const showTooltip = computed(() => mobileShow.value || (!appStore.isMobile && isHovered.value));
  let pressTimer: any = null;

  function handleMouseEnter() {
    if (appStore.isMobile) return;
    isHovered.value = true;
  }

  function handleMouseLeave() {
    if (appStore.isMobile) return;
    isHovered.value = false;
  }

  function handleTouchStart() {
    if (!appStore.isMobile) return;
    // 重置状态
    if (pressTimer) clearTimeout(pressTimer);
    
    pressTimer = setTimeout(() => {
      mobileShow.value = true;
      pressTimer = null;
      // 3秒后自动关闭，避免遮挡
      setTimeout(() => { mobileShow.value = false }, 3000);
    }, 500); // 500ms 定义为长按
  }

  function handleTouchEnd() {
    if (!appStore.isMobile) return;
    if (pressTimer) {
      clearTimeout(pressTimer);
      pressTimer = null;
    }
  }

  function handleTouchMove() {
    if (!appStore.isMobile) return;
    if (pressTimer) {
      clearTimeout(pressTimer);
      pressTimer = null;
    }
  }

</script>
<template>
  <section 
    class="inline-flex relative" 
    @touchstart="handleTouchStart"
    @touchend="handleTouchEnd"
    @touchmove="handleTouchMove"
    @mouseenter="handleMouseEnter"
    @mouseleave="handleMouseLeave"
  >
    <slot></slot>
    <section 
      v-if="showTooltip"
      class="w-full absolute content p-2 bg-base-200/80 rounded border border-base-300 z-100 shadow-xl backdrop-blur-sm animate-in fade-in zoom-in duration-200 -mt-1"
    >
      <div class="flex items-center justify-between gap-2 mb-1">
        <div class="text-xs font-bold">{{ description }}</div>
      </div>
      <div v-if="time_required" class="text-[10px] opacity-60 whitespace-nowrap flex items-center gap-0.5">
        <Icon icon="tabler:clock" />
        {{ actualTime }}s
      </div>
      <div v-if="items.length" class="divider my-1 h-px"></div>
      <div v-for="item in items" :key="item.key" class="text-[10px] leading-relaxed request-item" :class="{ 'text-error': item.insufficient, 'opacity-50': !item.known }">
        <template v-if="item.quantity > 0">{{ item.quantity }}x </template>
        <template v-else-if="item.use > 0">{{ item.use }}耐 </template>
        <span class="item-name" :class="{ 'hidden': !item.known }">{{ item.name }}</span>
        <span class="unknown" v-if="!item.known">????</span>
        <span v-if="item.known" class="opacity-40 italic ml-1">
          (持有: {{ Number((taskStore.projectedInventory.get(item.key) || 0).toFixed(2)) }}{{ item.isDurable ? ', 耐久: ' + (taskStore.projectedDurability.get(item.key) || 0).toFixed(1) : '' }})
        </span>
      </div>
    </section>
  </section>
</template>
<style scoped lang="less">
  .content {
    --size: calc(var(--size-field, 0.25rem) * 10 + 5px);
    top: var(--size);
  }
  .request-item {
    .hidden {
      display: none;
    }
    &:hover {
      .item-name {
        display: inline;
      }
      .unknown {
        display: none;
      }
    }
  }
</style>