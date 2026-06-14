<script setup lang="ts">
import Item from '@/components/Item.vue';
import { useAppStore } from '@/stores/modules/app'
import { usePackStore } from '@/stores/modules/pack'
import { Techs } from '@/data/techs';

const appStore = useAppStore()
const packStore = usePackStore()
const items = packStore.getItems;
const techs = packStore.getTechs;
</script>

<template>
    <aside
        class="bg-base-200 border-r border-base-300 flex-none overflow-y-auto transition-all duration-300"
        :class="appStore.leftSidebarOpen ? 'w-60' : 'w-0 overflow-hidden'"
    >
        <section class="p-4">
            <h2 class="text-lg font-bold mb-4">背包</h2>
            <ul class="space-y-1">
                <li v-for="item in items" :key="item.key">
                    <Item :data="item" />
                </li>
            </ul>
        </section>
        <section class="p-4">
            <h2 class="text-lg font-bold mb-4">科技</h2>
            <ul>
                <li v-for="tech in techs" :key="tech">
                    {{ Techs.find(t => t.key === tech)?.name || tech }}
                </li>
            </ul>
        </section>
    </aside>
</template>