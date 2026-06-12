<script setup lang="ts">
    import { routes } from '@/router';
    import { computed } from 'vue';

    const tabs = computed(() => routes[0].children?.map(r => ({
        name: r.name, path: r.path, label: r.meta?.label, icon: r.meta?.icon
    })))
</script>

<template>
    <div class="tabs tabs-bordered tabs-lg border-b border-base-300 bg-base-200 flex-none px-4">
        <RouterLink
        v-for="tab in tabs"
        :key="tab.name"
        :to="tab.path"
        class="tab gap-2"
        active-class="tab-active"
        >
        <span>{{ tab.icon }}</span>
        {{ tab.label }}
        </RouterLink>
    </div>
</template>