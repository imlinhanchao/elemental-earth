<script setup lang="ts">
    import { routes } from '@/router';
    import { computed } from 'vue';
    import { useFragmentStore } from '@/stores/modules/fragment';
    import { usePackStore } from '@/stores/modules/pack';

    const packStore = usePackStore();
    const fragmentStore = useFragmentStore();
    const tabs = computed(() => routes[0].children?.filter(r => {
        if (r.name === 'Production' && !packStore.hasTech('production_tech')) return false;
        return true;
    }).map(r => ({
        name: r.name, path: r.path || '/', label: r.meta?.label, icon: r.meta?.icon
    })))
</script>

<template>
    <div class="tabs tabs-bordered tabs-md lg:tabs-lg border-b border-base-300 bg-base-200 flex-none px-2 lg:px-4 flex justify-around lg:justify-start">
        <RouterLink
            v-for="tab in tabs"
            :key="tab.name"
            :to="tab.path"
            :id="`tab-${tab.name?.toString().toLowerCase()}`"
            class="tab gap-1 lg:gap-2 px-2 lg:px-4 relative"
            :class="{'tab-active': $route.name === tab.name }"
        >
            <Icon :icon="tab.icon" class="text-xl lg:text-lg" v-if="tab.icon" />
            <span class="indicator">
                <span v-if="tab.name === 'Manuscripts' && fragmentStore.hasUnread" class="indicator-item status status-error"></span>
                <span class="hidden sm:inline">{{ tab.label }}</span>
            </span>
        </RouterLink>
    </div>
</template>