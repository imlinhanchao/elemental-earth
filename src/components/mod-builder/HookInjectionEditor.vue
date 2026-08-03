<template>
  <div class="card bg-base-100 border border-base-300 shadow-sm">
    <div class="card-body p-4 gap-4">
      <div class="flex items-center justify-between gap-3">
        <h2 class="card-title text-base inline-flex items-center gap-2">
          <Icon icon="tabler:script" />
          运行时代脚本注入 (Hooks)
        </h2>
        <fieldset class="fieldset flex-row items-center gap-2 py-0">
          <span class="label-text">已启用</span>
          <input type="checkbox" class="toggle toggle-sm toggle-primary" v-model="draft.enabled" />
        </fieldset>
      </div>

      <template v-if="draft.enabled">
        <fieldset class="fieldset">
          <legend class="fieldset-legend">脚本标识符 (ID)</legend>
          <input v-model="draft.id" class="input input-sm w-full max-w-xs" placeholder="main" />
          <div class="fieldset-label text-xs">唯一标识符，建议保持默认。</div>
        </fieldset>

        <div class="divider my-0 opacity-50">代码编辑</div>

        <div class="tabs tabs-box tabs-sm w-full overflow-x-auto">
          <button
            v-for="eventName in hookEvents"
            :key="eventName"
            class="tab"
            :class="activeEvent === eventName ? 'tab-active' : ''"
            @click="activeEvent = eventName"
          >
            {{ eventLabels[eventName] }}
          </button>
        </div>

        <div class="flex flex-wrap gap-2">
          <span class="text-xs opacity-60 self-center mr-2">代码片段:</span>
          <button class="btn btn-xs btn-outline" @click="appendSnippet('logger')">控制台日志</button>
          <button class="btn btn-xs btn-outline" @click="appendSnippet('fetch')">网络请求</button>
          <button class="btn btn-xs btn-outline" @click="appendSnippet('taskComplete')">任务监听</button>
        </div>

        <fieldset class="fieldset">
          <legend class="fieldset-legend flex justify-between w-full">
            <span>{{ eventLabels[activeEvent] }} 函数体</span>
            <code class="text-[10px] opacity-40">mod_id:{{ activeEvent }}</code>
          </legend>
          <textarea
            v-model="eventBody"
            class="textarea textarea-sm w-full font-mono leading-relaxed"
            rows="10"
            placeholder="// 使用 context.logger.info(...) 输出调试信息"
          ></textarea>
          <div class="fieldset-label text-xs opacity-70">
            函数参数: <code class="bg-base-200 px-1 rounded">payload</code> (事件数据), 
            <code class="bg-base-200 px-1 rounded">context</code> (环境 API)。
            系统会自动将其导出为 CommonJS 模块。
          </div>
        </fieldset>

        <div v-if="compileError" class="alert alert-error alert-soft text-sm">
          <Icon icon="tabler:alert-triangle" />
          <span>语法校验失败：{{ compileError }}</span>
        </div>
      </template>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import type { BuilderHookDraft } from '@/views/mods/builder/types'
import { HOOK_EVENT_LABELS, HOOK_EVENTS } from '@/views/mods/builder/types'
import { buildHookCode } from '@/views/mods/builder/helpers'

const hookEvents = HOOK_EVENTS
const eventLabels = HOOK_EVENT_LABELS
const activeEvent = ref(hookEvents[0])

const draft = defineModel<BuilderHookDraft>('modelValue', {
  required: true,
  default: () => ({
    enabled: false,
    id: 'main',
    events: {},
  }),
})

const snippetMap: Record<string, string> = {
  logger: "context.logger.info('hook triggered')",
  fetch: "const response = await context.fetch('https://example.com/api')\ncontext.logger.info(`status=${response.status}`)",
  taskComplete: "if (payload?.key === 'mining') {\n  context.logger.info('mining complete')\n}",
}

const eventBody = computed({
  get: () => draft.value.events[activeEvent.value] || '',
  set: (value: string) => {
    draft.value.events = {
      ...draft.value.events,
      [activeEvent.value]: value,
    }
  },
})

const compileError = computed(() => {
  if (!draft.value.enabled) return ''
  try {
    const code = buildHookCode(draft.value.events)
    new Function('module', 'exports', code)
    return ''
  } catch (error) {
    return (error as Error).message
  }
})

function appendSnippet(type: keyof typeof snippetMap): void {
  const snippet = snippetMap[type]
  const current = eventBody.value
  eventBody.value = current ? `${current}\n${snippet}` : snippet
}
</script>
