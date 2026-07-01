<script setup lang="ts">
    import { routes } from '@/router';
    import { computed } from 'vue';

    const tabs = computed(() => routes[0].children?.map(r => ({
        name: r.name, path: r.path || '/', label: r.meta?.label, icon: r.meta?.icon
    })))
</script>

<template>
    <div class="tabs tabs-bordered tabs-md lg:tabs-lg border-b border-base-300 bg-base-200 flex-none px-2 lg:px-4 flex justify-around lg:justify-start">
        <RouterLink
            v-for="tab in tabs"
            :key="tab.name"
            :to="tab.path"
            class="tab gap-1 lg:gap-2 px-2 lg:px-4"
            :class="{'tab-active': $route.name === tab.name}"
        >
        <Icon :icon="tab.icon" class="text-xl lg:text-lg" v-if="tab.icon" />
        <span class="hidden sm:inline">{{ tab.label }}</span>
        </RouterLink>
    </div>
</template>