import { defineStore } from 'pinia';
import { ref, computed, reactive } from 'vue';
import { store } from '@/stores/';
import { once } from '@/utils/function';

export const useFragmentStore = defineStore('fragment', () => {
    // 已解锁的手稿（配方 key）
    const fragments = ref<string[]>([]);
    // 未查看的手稿（配方 key）
    const unreadFragments = ref<string[]>([]);

    const getFragments = computed(() => fragments.value);
    const hasUnread = computed(() => unreadFragments.value.length > 0);

    function unlockFragment(formulaKey: string) {
        if (!fragments.value.includes(formulaKey)) {
            fragments.value.push(formulaKey);
            unreadFragments.value.push(formulaKey);
            return true;
        }
        return false;
    }

    function markAsRead(formulaKey: string) {
        const index = unreadFragments.value.indexOf(formulaKey);
        if (index !== -1) {
            unreadFragments.value.splice(index, 1);
        }
    }

    function markAllAsRead() {
        unreadFragments.value = [];
    }

    function isUnread(formulaKey: string) {
        return unreadFragments.value.includes(formulaKey);
    }

    function hasFragment(formulaKey: string) {
        return fragments.value.includes(formulaKey);
    }

    return {
        fragments,
        unreadFragments,
        getFragments,
        hasUnread,
        unlockFragment,
        markAsRead,
        markAllAsRead,
        isUnread,
        hasFragment
    };
});

export const useFragmentStoreWithOut = once(() => useFragmentStore(store));
