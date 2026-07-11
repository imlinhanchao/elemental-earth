<script setup lang="ts">
import { computed, ref } from "vue";
import Item from "@/components/Item.vue";
import { useAppStore } from "@/stores/modules/app";
import { usePackStore } from "@/stores/modules/pack";
import { Items } from "@/data/items";
import { Techs } from "@/data/techs";

const appStore = useAppStore();
const packStore = usePackStore();
const items = packStore.getItems;
const techs = packStore.getTechs;

/** 分类显示顺序 */
const categoryOrder = ["材料", "矿石", "燃料", "火源", "工具", "容器", "气体", "液体"];
const searchQuery = ref("");
const enableSearch = ref(false);

/** 按分类分组的背包物品 */
const groupedItems = computed(() => {
  const groups: { category: string; items: typeof items }[] = [];
  const map = new Map<string, typeof items>();
  const filteredItems = items.filter((item) => {
    const name = packStore.getDisplayName(item.key);
    const itemData = Items.find((i) => i.key === item.key);
    const itemNote = packStore.getItemNote(item.key);

    return (
      !searchQuery.value ||
      itemData?.description.toLowerCase().includes(searchQuery.value.toLowerCase()) ||
      name.toLowerCase().includes(searchQuery.value.toLowerCase()) ||
      itemNote.toLowerCase().includes(searchQuery.value.toLowerCase())
    );
  });

  for (const item of filteredItems) {
    const itemData = Items.find((i) => i.key === item.key);
    const cat = itemData?.category || "未分类";
    if (!map.has(cat)) map.set(cat, []);
    map.get(cat)!.push(item);
  }

  for (const cat of categoryOrder) {
    if (map.has(cat)) {
      groups.push({ category: cat, items: map.get(cat)! });
      map.delete(cat);
    }
  }
  for (const [cat, catItems] of map) {
    groups.push({ category: cat, items: catItems });
  }
  return groups;
});
</script>

<template>
  <aside
    class="bg-base-100 border-r border-base-300 flex-none overflow-y-auto transition-all duration-300"
    :class="[
      appStore.leftSidebarOpen ? (appStore.isMobile ? 'w-[80vw]' : 'w-60') : 'w-0 overflow-hidden'
    ]"
  >
    <section class="p-4">
      <header class="flex items-center justify-between mb-2 gap-2">
        <h2 v-if="!enableSearch" class="text-lg font-bold whitespace-nowrap">背包</h2>
        <label class="input" v-if="enableSearch">
          <Icon icon="material-symbols:search-rounded" class="opacity-50" />
          <input
            v-model="searchQuery"
            type="search"
            placeholder="搜索物品..."
            class="grow"
            @keydown.esc="((searchQuery = ''), (enableSearch = false))"
          />
        </label>
        <button
          v-if="!enableSearch"
          class="btn btn-ghost"
          @click="enableSearch = !enableSearch"
        >
          <Icon icon="material-symbols:search-rounded" />
        </button>
      </header>
      <div class="flex flex-col gap-1">
        <details
          v-for="group in groupedItems"
          :key="group.category"
          class="collapse collapse-arrow"
          open
        >
          <summary
            class="collapse-title text-sm font-semibold min-h-0 px-2 py-1"
          >
            {{ group.category }}
            <span class="text-xs text-base-content/60 font-normal">
              （{{ group.items.length }}）
            </span>
          </summary>
          <div class="collapse-content px-0 py-0">
            <ul class="space-y-1">
              <li v-for="item in group.items" :key="item.key">
                <Item :data="item" />
              </li>
            </ul>
          </div>
        </details>
      </div>
    </section>
    <section class="p-4">
      <h2 class="text-lg font-bold mb-4">科技</h2>
      <ul>
        <li v-for="tech in techs" :key="tech">
          {{ Techs.find((t) => t.key === tech)?.name || tech }}
        </li>
      </ul>
    </section>
  </aside>
</template>
