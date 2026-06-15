<script setup lang="ts">
import Task from '@/components/Task.vue';
import { useAppStore } from '@/stores/modules/app'
import { useTaskStore } from '@/stores/modules/task'

const appStore = useAppStore()
const taskStore = useTaskStore()
const tasks = taskStore.getTasks;
</script>

<template>
    <aside
        class="bg-base-200 border-l border-base-300 flex-none overflow-y-auto transition-all duration-300 p-2"
        :class="appStore.rightSidebarOpen ? 'w-72' : 'w-0 overflow-hidden'"
    >
        <section>
            <Task v-for="(task, i) in tasks" :key="task.id" :task="task" :preTasks="i > 0 ? tasks.slice(0, i) : []" />
        </section>
    </aside>
</template>