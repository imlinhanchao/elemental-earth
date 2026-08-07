<template>
  <div class="p-4 mx-auto space-y-4 inline-flex flex-col">
    <section ref="periodicRef">
      <header class="mb-4 flex items-center gap-3 flex-wrap">
        <h1 class="text-xl font-bold flex items-center gap-2">
          <Icon icon="tabler:atom" class="text-2xl" />
          元素周期表
        </h1>
        <span class="badge badge-outline text-xs">
          已点亮 {{ litElements.length }} / 118 个元素
        </span>
        <div class="mr-0 ml-auto inline-flex items-center gap-2 share-btn">
          <button class="btn btn-sm btn-soft" @click="shareAll">
            <Icon v-if="!isShareing" icon="mdi:share-variant" class="text-base" />
            <Icon v-else icon="mdi:loading" class="animate-spin text-base" />
            <span class="ml-2">分享所有图鉴</span>
          </button>
        </div>
      </header>

      <!-- ─── Periodic Table ──────────────────────────────────────────────────── -->
      <div class="relative" ref="tableWrapper">
        <PeriodicTable
          :litElements="litElements"
          :implementedElements="implementedElements"
          :categoryColors="categoryColors"
          @click-element="handleElementClick"
        />

      </div>
    </section>
    <div class="m-2 text-right">
      <button class="btn btn-xs btn-ghost share-btn" @click="shareSection(periodicRef, 'periodic-table')">
        <Icon v-if="!isShareing" icon="mdi:share" /> 
        <Icon v-else icon="mdi:loading" class="animate-spin" />
        分享已点亮元素
      </button>
    </div>
    <!-- ─── Selected element detail popover ─────────────────────────────────── -->
    <Transition name="popover">
      <div v-if="activeElement && showPopover" class="element-popover-root">
      <!-- Mobile Backdrop -->
      <div v-if="isMobile" class="popover-backdrop" @click="closePopover"></div>
      
      <div
        class="element-popover card bg-base-200 shadow-xl border border-base-300"
        :class="[isMobile ? 'popover-mobile' : 'popover-desktop']"
        :style="popoverStyle"
        v-click-outside="closePopover"
      >
        <div
          class="card-body p-4 overflow-y-auto max-h-[70vh] md:max-h-none"
          :style="{ borderTop: isMobile ? `4px solid ${elementColor(activeElement)}` : 'none', borderLeft: !isMobile ? `4px solid ${elementColor(activeElement)}` : 'none' }"
        >
            <div class="flex items-center justify-between mb-2 md:hidden">
              <h3 class="font-bold">元素详情</h3>
              <button class="btn btn-ghost btn-xs btn-circle" @click="closePopover">✕</button>
            </div>

            <div class="flex items-center gap-4">
              <div
                class="w-16 h-20 rounded flex flex-col items-center justify-center text-white shrink-0"
                :style="{ backgroundColor: elementColor(activeElement) }"
              >
                <span class="text-xs opacity-75">{{ activeElement.number }}</span>
                <span class="text-2xl font-bold leading-tight">{{ activeElement.symbol }}</span>
                <span class="text-sm">{{ activeElement.name }}</span>
              </div>
              <div class="overflow-hidden">
                <p class="font-bold text-lg truncate">{{ activeElement.nameEn }}</p>
                <p class="text-xs opacity-60">原子量：{{ activeElement.mass }}</p>
                <p class="text-xs opacity-60">分类：{{ CATEGORY_LABELS[activeElement.category] }}</p>
              </div>
            </div>

            <!-- 元素故事 -->
            <div v-if="activeElement.story" class="mt-4 pt-4 border-t border-base-content/10">
              <p class="text-[10px] font-bold opacity-40 uppercase tracking-widest mb-2 flex items-center gap-1">
                <Icon icon="mdi:script-text-outline" class="text-xs" />
                探索笔记
              </p>
              <div 
                class="markdown-content text-sm leading-relaxed opacity-90 font-serif italic"
                v-html="renderMarkdown(activeElement.story)"
              ></div>
            </div>
          </div>
        </div>
      </div>
    </Transition>

    <!-- ─── Drifting Bottles ────────────────────────────────────────────────── -->
    <div ref="bottleSection" class="mt-8 border-t border-base-content/10 pt-6" v-if="bottleStore.collectedBottles.length">
      <section class="rounded-2xl border border-base-300/60 bg-base-200/30 p-4 sm:p-5">
        <div class="mb-4 flex items-end justify-between gap-3">
          <div>
            <h2 class="text-lg sm:text-xl font-bold flex items-center gap-2">
              <Icon icon="game-icons:square-bottle" class="text-xl sm:text-2xl text-primary" />
              <span>漂流瓶</span>
            </h2>
            <div class="text-xs font-normal opacity-50 mt-1">海边的意外惊喜</div>
          </div>
          <div class="flex items-center gap-1.5 shrink-0">
            <span class="badge badge-xs badge-outline">{{ bottleStore.collectedBottles.length }}/{{ Bottles.length }}</span>
            <span v-if="unreadBottleCount > 0" class="badge badge-xs badge-error badge-outline">{{ unreadBottleCount }} NEW</span>
          </div>
        </div>

        <div class="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-8 gap-2.5 sm:gap-3">
          <button
            v-for="bottle in sortedCollectedBottles"
            :key="bottle.index"
            type="button"
            class="group relative text-left"
            @click="openBottle(bottle)"
          >
            <div
              class="relative rounded-lg border px-2.5 py-2 sm:px-3 sm:py-2.5 flex flex-col items-center justify-center gap-1.5 min-h-[92px] sm:min-h-[100px] transition-all duration-200 group-hover:-translate-y-0.5 group-hover:shadow-md"
              :class="bottleStore.isUnread(bottle.index)
                ? 'bg-primary/5 border-primary/35 shadow-sm'
                : 'bg-base-100/70 border-base-300/80 hover:border-primary/30 hover:bg-base-100'"
            >
              <Icon
                icon="game-icons:square-bottle"
                size="2.2em"
                class="text-primary/75 group-hover:text-primary transition-colors"
              />
              <span class="text-[11px] sm:text-xs font-medium opacity-65">#{{ bottle.index + 1 }}</span>

              <div
                v-if="bottleStore.isUnread(bottle.index)"
                class="badge badge-error badge-xs absolute -top-1.5 -right-1.5"
              >
                NEW
              </div>
            </div>
          </button>
        </div>
      </section>
    </div>
    <div class="mt-2 flex justify-end">
      <button class="btn btn-xs btn-ghost share-btn" @click="shareSection(bottleSection, 'bottles')">
        <Icon icon="mdi:share" /> 分享漂流瓶
      </button>
    </div>
    <!-- ─── Wonders Collection ──────────────────────────────────────────────── -->
    <div ref="wonderSection" class="mt-8 border-t border-base-content/10 pt-6" v-if="unlockedWonders.length">
      <h2 class="text-xl font-bold flex items-baseline gap-2 mb-1">
        <span class="flex items-center gap-2">
          <Icon icon="mdi:pillar" class="text-2xl text-amber-500" />
          <span>世界奇观</span>
        </span>
        <span v-if="wonderBonusPercent > 0" class="badge badge-outline badge-xs badge-secondary">产量加成 +{{ wonderBonusPercent }}%</span>
      </h2>
      <div class="text-xs font-normal opacity-50 mb-4">人类文明的丰碑</div>
      
      <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        <div 
          v-for="wonder in unlockedWonders" 
          :key="wonder.key"
          class="card bg-base-200/50 border border-amber-500/20 hover:border-amber-500/50 transition-all group overflow-hidden"
        >
          <div class="card-body p-4 relative">
            <!-- Background Glow -->
            <div class="absolute -right-8 -top-8 w-24 h-24 bg-amber-500/10 blur-3xl group-hover:bg-amber-500/20 transition-all rounded-full"></div>
            
            <div class="flex gap-4">
              <div class="w-16 h-16 shrink-0 rounded-xl bg-gradient-to-br from-amber-400/20 to-amber-600/20 border border-amber-500/30 flex items-center justify-center shadow-lg ring-1 ring-amber-500/20 transition-transform group-hover:scale-110 overflow-hidden">
                <img :src="getWonderImage(wonder)" class="w-full h-full object-cover p-1" />
              </div>
              
              <div class="flex-1 min-w-0">
                <h3 class="font-bold text-lg text-amber-500 group-hover:text-amber-400 transition-colors">{{ wonder.name.replace('建造', '').replace('铸造', '') }}</h3>
                <p class="text-xs opacity-70 line-clamp-2 mt-1 leading-relaxed">{{ wonder.description }}</p>
              </div>
            </div>
            
            <div class="card-actions justify-end mt-2 pt-2 border-t border-base-content/5">
              <div class="badge badge-outline badge-amber-500/50 text-[10px] uppercase tracking-tighter opacity-50">已完成</div>
            </div>
          </div>
        </div>
      </div>
    </div>
    <div class="mt-4 flex justify-end">
      <button class="btn btn-xs btn-ghost share-btn" @click="shareSection(wonderSection, 'wonders')">
        <Icon icon="mdi:share" v-if="!isShareing" /> 
        <Icon icon="mdi:loading" class="animate-spin" v-else />
        分享奇观
      </button>
    </div>
    <!-- ─── Bottle Content Modal ───────────────────────────────────────────── -->
    <dialog ref="bottleModal" class="modal modal-bottom sm:modal-middle bg-base-100/60 backdrop-blur-sm" @click.self="closeBottle">
      <div v-if="activeBottle" class="modal-box p-0 bg-transparent shadow-none overflow-visible max-w-lg w-full">
        <div class="paper-animation relative py-12 px-8 overflow-hidden">
          <!-- The Paper Background (Aged Texture) -->
          <div class="absolute inset-0 bg-base-300/90 shadow-2xl parchment-effect paper-shape"></div>
          
          <!-- Decorative Paper Folds/Creases -->
          <div class="absolute inset-0 pointer-events-none opacity-30">
            <div class="absolute top-1/3 left-0 right-0 h-6 -translate-y-1/2 bg-gradient-to-b from-transparent via-base-content/5 to-transparent blur-[1px]"></div>
            <div class="absolute top-2/3 left-0 right-0 h-6 -translate-y-1/2 bg-gradient-to-b from-transparent via-base-content/5 to-transparent blur-[1px]"></div>
          </div>

          <!-- Content Container -->
          <div class="relative z-10 text-base-content px-4">
            <div class="flex items-start gap-4 mb-6">
              <Icon icon="fa6-solid:quote-left" class="text-3xl text-primary mt-1 opacity-50 shrink-0" />
              <p class="text-xl md:text-2xl font-serif font-bold leading-relaxed italic tracking-wide">{{ activeBottle.content }}</p>
            </div>
            
            <div class="text-right text-lg font-serif mb-8 opacity-80 pr-6">
              —— {{ activeBottle.author }}
            </div>
            
            <div class="border-t border-base-content/5 pt-6 px-2">
              <p class="text-sm opacity-60 leading-relaxed indent-8 font-serif italic">{{ activeBottle.description }}</p>
            </div>
          </div>
        </div>
        
        <form method="dialog" class="absolute -top-12 right-4 sm:-right-4">
          <button class="btn btn-sm btn-circle btn-ghost text-white hover:bg-white/20" @click="closeBottle">✕</button>
          <button class="btn btn-sm btn-circle btn-ghost text-white hover:bg-white/20 ml-2" type="button" @click.prevent="shareActiveBottle">
            <Icon icon="mdi:share" />
          </button>
        </form>
      </div>
    </dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import PeriodicTable from '@/components/PeriodicTable.vue'
import {
  ELEMENTS,
  DEFAULT_CATEGORY_COLORS,
  CATEGORY_LABELS,
  type PeriodicElement,
  type ElementCategory,
} from '@/data/elements'
import { useStateStore } from '@/stores/modules/state';
import { useBottleStore } from '@/stores/modules/bottle';
import { usePackStore } from '@/stores/modules/pack';
import ActionsData from '@/data/actions.json'
import { type IBottle, Bottles } from '@/data/bottle';
import { Items } from '@/data/items';
import { computed } from 'vue';
import { renderMarkdown } from '@/utils/function';
import { vOnClickOutside as vClickOutside } from '@vueuse/components'
import html2canvas from 'html2canvas-pro'

// Share config
const GAME_NAME = '元素纪元'
const GAME_SITE = location.host
const LOGO_URL = new URL('@/assets/images/logo.png', import.meta.url).href

// ─── Bottle Logic ─────────────────────────────────────────────────────────────
const activeBottle = ref<(IBottle & { index: number }) | null>(null)
const bottleModal = ref<HTMLDialogElement | null>(null)

function openBottle(bottle: IBottle & { index: number }) {
  activeBottle.value = bottle
  bottleStore.markAsRead(bottle.index)
  bottleModal.value?.showModal()
}

function closeBottle() {
  bottleModal.value?.close()
}

const sortedCollectedBottles = computed(() => {
  const unreadIndices = bottleStore.unreadIndices
  const unreadSet = new Set(unreadIndices)
  const unreadOrder = new Map<number, number>()

  unreadIndices.forEach((index, order) => {
    unreadOrder.set(index, order)
  })

  return [...bottleStore.collectedBottles].sort((a, b) => {
    const aUnread = unreadSet.has(a.index)
    const bUnread = unreadSet.has(b.index)

    // 未读漂流瓶排在最前，并按解锁时间倒序（新的在前）
    if (aUnread !== bUnread) {
      return aUnread ? -1 : 1
    }

    if (aUnread && bUnread) {
      return (unreadOrder.get(b.index) ?? -1) - (unreadOrder.get(a.index) ?? -1)
    }

    // 已读漂流瓶按编号升序
    return a.index - b.index
  })
})

const unreadBottleCount = computed(() => bottleStore.unreadIndices.length)

// ─── Wonder Logic ─────────────────────────────────────────────────────────────
const packStore = usePackStore()
const unlockedWonders = computed(() => {
  return (ActionsData as any[]).filter(a => 
    a.category === '奇观' && 
    a.rewards && 
    a.rewards.some((r: any) => packStore.hasItem(r.key))
  )
})

// 计算已解锁的奇观总加成（来自 items.json 中每个奇观的 attrs.level）
const wonderBonusPercent = computed(() => {
  let total = 0
  for (const it of Items) {
    if (it.category !== '奇观') continue
    const lvl = it.attrs?.level || 0
    if (lvl <= 0) continue
    if (packStore.hasItem(it.key)) total += Number(lvl)
  }
  return Math.round(total)
})

function getWonderImage(wonder: any) {
  const rewardKey = wonder.rewards?.[0]?.key
  if (!rewardKey) return ''
  return new URL(`../assets/images/${rewardKey}.png`, import.meta.url).href
}

// ─────────────────────────────────────────────────────────────────────────────
//  Configuration variable — modify this array to control which elements are lit.
//  Values are atomic numbers (1–118).
// ─────────────────────────────────────────────────────────────────────────────
const stateStore = useStateStore();
const bottleStore = useBottleStore();
const litElements = ref<number[]>(stateStore.state.elements || []);

// Find atomic numbers of elements that are implemented as items
const implementedElements = computed(() => {
  const itemKeys = new Set(Items.map(i => i.elemental).filter(Boolean));
  return ELEMENTS
    .filter(el => el.number > 0 && itemKeys.has(el.number))
    .map(el => el.number);
});

// ─────────────────────────────────────────────────────────────────────────────
//  Optional: override category colours.
//  Keys are ElementCategory strings; values are any valid CSS color.
// ─────────────────────────────────────────────────────────────────────────────
const categoryColors = ref<Partial<Record<ElementCategory, string>>>({
  // Uncomment and edit to override defaults:
  // 'transition-metal': '#60a5fa',
})

// ─── Interactivity ────────────────────────────────────────────────────────────

const activeElement = ref<PeriodicElement | null>(null)
const showPopover = ref(false)
const periodicRef = ref<HTMLElement | null>(null)
const bottleSection = ref<HTMLElement | null>(null)
const wonderSection = ref<HTMLElement | null>(null)
const popoverCoord = ref({ top: 0, left: 0, placement: 'bottom' })
const isMobile = ref(false)

function updateIsMobile() {
  isMobile.value = window.innerWidth < 768
}

onMounted(() => {
  updateIsMobile()
  window.addEventListener('resize', updateIsMobile)
})

onUnmounted(() => {
  window.removeEventListener('resize', updateIsMobile)
})

function elementColor(el: PeriodicElement): string {
  return { ...DEFAULT_CATEGORY_COLORS, ...categoryColors.value }[el.category] ?? '#6b7280'
}

function handleElementClick(el: PeriodicElement, event: MouseEvent) {
  // 仅允许点击已解锁的元素
  if (!litElements.value.includes(el.number)) return

  activeElement.value = el
  showPopover.value = true

  if (isMobile.value) return

  const target = event.currentTarget as HTMLElement
  const rect = target.getBoundingClientRect()
  const wrapper = periodicRef.value
  if (!wrapper) return

  const wrapperRect = wrapper.getBoundingClientRect()
  
  // Calculate relative to tableWrapper
  let top = rect.bottom - wrapperRect.top + 8
  let left = rect.left - wrapperRect.left
  let placement = 'bottom'
  
  // Horizontal flip
  if (el.col > 12) {
    left = rect.left - wrapperRect.left - 320 + rect.width
    placement = 'left'
  } else if (el.col > 9) {
    left = rect.left - wrapperRect.left - 160 + rect.width / 2
  }

  // Vertical flip
  if (el.row > 5) {
    top = rect.top - wrapperRect.top - 8
    placement = 'top'
  }

  popoverCoord.value = { top, left, placement }
}

function closePopover() {
  showPopover.value = false
}

const popoverStyle = computed(() => {
  if (isMobile.value) return {}
  
  const { top, left, placement } = popoverCoord.value
  return {
    top: `${top}px`,
    left: `${left}px`,
    ...(placement === 'top' ? { transform: 'translateY(-100%)' } : {})
  }
})

// ---------------- Share helpers ----------------
const baseBgColor = getComputedStyle(document.documentElement).getPropertyValue('--color-base-100') || '#f0f0f0';
const baseContentColor = getComputedStyle(document.documentElement).getPropertyValue('--color-base-content') || '#333';
const isShareing = ref(false);
async function addWatermarkToCanvas(canvas: HTMLCanvasElement) {
  const ctx = canvas.getContext('2d')!
  const padding = 15 // user-requested margin will be applied outside earlier; keep local padding if needed
  const logoHeight = 12 // requested logo/text height
  const text = `${GAME_NAME} · ${GAME_SITE}`

  // draw logo + text at right-bottom with 12px height, no background
  const img = await loadImage(LOGO_URL)
  // compute scaled logo dimensions keeping aspect ratio, target height = logoHeight
  const aspect = img.width / img.height || 1
  const logoW = Math.round((logoHeight + 6) * aspect)
  const logoH = Math.round((logoHeight + 6))

  ctx.save()
  ctx.fillStyle = baseContentColor || '#000'
  ctx.font = `${logoHeight}px sans-serif`
  ctx.textBaseline = 'alphabetic'

  const gap = 8
  const rightPadding = 12
  const bottomPadding = 12

  // measure text width
  const textWidth = ctx.measureText(text).width
  const totalWidth = logoW + gap + textWidth

  const xText = canvas.width - rightPadding - textWidth
  const xLogo = xText - gap - logoW
  const y = canvas.height - bottomPadding

  // draw text
  ctx.fillText(text, xText, y)
  // draw logo scaled to logoH, aligning baseline to text: draw with bottom at y
  ctx.drawImage(img, xLogo, y - logoH + 3, logoW, logoH)
  ctx.restore()
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.onload = () => resolve(img)
    img.onerror = reject
    img.src = src
  })
}

async function shareCanvas(canvas: HTMLCanvasElement, fileName = 'share.png') {
  // add 15px margin by creating a new padded canvas
  const padded = createPaddedCanvas(canvas, 25, baseBgColor || null)
  await addWatermarkToCanvas(padded)
  // create blob
  return new Promise<void>((resolve) => {
    padded.toBlob(async (blob) => {
      if (!blob) return resolve()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = fileName
      document.body.appendChild(a)
      a.click()
      a.remove()
      URL.revokeObjectURL(url)
      resolve()
    }, 'image/png')
  })
}

function createPaddedCanvas(src: HTMLCanvasElement, padding = 15, bgColor: string | null = null) {
  const w = src.width + padding * 2
  const h = src.height + padding * 2
  const canvas = document.createElement('canvas')
  canvas.width = w
  canvas.height = h
  const ctx = canvas.getContext('2d')!
  if (bgColor) {
    ctx.fillStyle = bgColor
    ctx.fillRect(0, 0, w, h)
  }
  ctx.drawImage(src, padding, padding)
  return canvas
}

async function shareSection(rootRef: any, id = 'section') {
  isShareing.value = true
  try {
    const el = rootRef?.value ?? rootRef
    if (!el) {
      // fallback: capture whole body
      const bodyCanvas = await html2canvas(document.body as HTMLElement, { 
        useCORS: true, 
        onclone: sanitizeClone, 
        backgroundColor: baseBgColor,
        ignoreElements: (node: Element) => node instanceof HTMLElement && node.classList.contains('share-btn')
      })
      await shareCanvas(bodyCanvas, `${id}.png`)
      return
    }
    const canvas = await html2canvas(el as HTMLElement, { 
      useCORS: true, 
      onclone: sanitizeClone, 
      backgroundColor: baseBgColor,
      ignoreElements: (node: Element) => node instanceof HTMLElement && node.classList.contains('share-btn')
    })
    await shareCanvas(canvas, `${id}.png`)
  } catch (e) {
    console.error('shareSection error', e)
  } finally {
    isShareing.value = false
  }
}

async function shareAll() {
  isShareing.value = true
  try {
    // capture the main container
    const container = document.querySelector('.p-4.mx-auto') as HTMLElement
    if (!container) return
    const canvas = await html2canvas(container, { useCORS: true, backgroundColor: baseBgColor, scale: 2, onclone: sanitizeClone, ignoreElements: (node: Element) => node instanceof HTMLElement && node.classList.contains('share-btn') })
    await shareCanvas(canvas, `catalogs-all.png`)
  } catch (e) {
    console.error('shareSection error', e)
  } finally {
    isShareing.value = false
  }
}

async function shareActiveBottle() {
  if (!activeBottle.value) return
  const modalEl = bottleModal.value as HTMLDialogElement | null
  if (!modalEl) return
  const canvas = await html2canvas(modalEl as HTMLElement, { useCORS: true, backgroundColor: null, onclone: sanitizeClone, ignoreElements: (node: Element) => node instanceof HTMLElement && node.classList.contains('share-btn') })
  await shareCanvas(canvas, `bottle-${activeBottle.value.index + 1}.png`)
}

// Replace unsupported oklch() occurrences in cloned document by converting to hex
function sanitizeClone(clonedDoc: Document) {
  try {
    const originalRoot = document.querySelector('.p-4.mx-auto') || document.body
    const cloneRoot = clonedDoc.querySelector('.p-4.mx-auto') || clonedDoc.body
    // Inject overrides for CSS variables defined on :root that contain oklch()
    try {
      const computedRoot = getComputedStyle(document.documentElement)
      let overrides = ''
      for (let i = 0; i < computedRoot.length; i++) {
        const name = computedRoot.item(i)
        if (!name || !name.startsWith('--')) continue
        const val = computedRoot.getPropertyValue(name).trim()
        if (val && val.includes('oklch(')) {
          // replace all oklch(...) occurrences inside the variable value
          const replaced = val.replace(/oklch\([^\)]+\)/g, (m) => oklchToHex(m) || m)
          overrides += `${name}: ${replaced};\n`
        }
      }
      if (overrides) {
        const style = clonedDoc.createElement('style')
        style.textContent = `:root {\n${overrides}}`
        clonedDoc.head.appendChild(style)
      }
    } catch (e) {
      // ignore variable extraction errors (CSP/CORS)
    }
    if (!originalRoot || !cloneRoot) return

    const originals = Array.from(originalRoot.querySelectorAll('*'))
    const clones = Array.from(cloneRoot.querySelectorAll('*'))

    const len = Math.min(originals.length, clones.length)
    for (let i = 0; i < len; i++) {
      const orig = originals[i] as HTMLElement
      const cl = clones[i] as HTMLElement
      if (!orig || !cl) continue
      const cs = getComputedStyle(orig)
      // properties to check
      const props = ['color', 'background-color', 'border-color', 'border-top-color', 'border-right-color', 'border-bottom-color', 'border-left-color', 'box-shadow']
      for (const p of props) {
        const val = cs.getPropertyValue(p)
        if (!val) continue
        if (val.includes('oklch(')) {
          // if it's box-shadow, replace each oklch() substring
          if (p === 'box-shadow') {
            const newVal = val.replace(/oklch\([^\)]+\)/g, (m) => {
              const hex = oklchToHex(m)
              return hex || m
            })
            cl.style.setProperty('box-shadow', newVal, 'important')
          } else {
            const hex = oklchToHex(val)
            if (hex) cl.style.setProperty(p, hex, 'important')
          }
        }
      }
    }
  } catch (e) {
    // ignore
    console.warn('sanitizeClone error', e)
  }
}

function oklchToHex(str: string): string | null {
  const m = /oklch\(([^)]+)\)/.exec(str)
  if (!m) return null
  const parts = m[1].trim().split(/\s+/)
  if (parts.length < 3) return null
  // parse L
  let L = parts[0]
  let C = parts[1]
  let H = parts[2]
  const parseNum = (s: string) => {
    if (s.endsWith('%')) return parseFloat(s) / 100
    return parseFloat(s)
  }
  const l = parseNum(L)
  const c = parseNum(C)
  const h = parseFloat(H)

  // convert to OKLab
  const hr = (h * Math.PI) / 180
  const a = c * Math.cos(hr)
  const b = c * Math.sin(hr)
  const Lval = l

  // OKLab to linear sRGB conversion
  const l_ = Lval + 0.3963377774 * a + 0.2158037573 * b
  const m_ = Lval - 0.1055613458 * a - 0.0638541728 * b
  const s_ = Lval - 0.0894841775 * a - 1.2914855480 * b

  const lLin = Math.pow(l_, 3)
  const mLin = Math.pow(m_, 3)
  const sLin = Math.pow(s_, 3)

  let r = +4.0767416621 * lLin - 3.3077115913 * mLin + 0.2309699292 * sLin
  let g = -1.2684380046 * lLin + 2.6097574011 * mLin - 0.3413193965 * sLin
  let b_ = -0.0041960863 * lLin - 0.7034186147 * mLin + 1.7076147010 * sLin

  const linearToSrgb = (v: number) => {
    // clamp
    v = Math.max(0, Math.min(1, v))
    if (v <= 0.0031308) return v * 12.92
    return 1.055 * Math.pow(v, 1 / 2.4) - 0.055
  }

  r = linearToSrgb(r)
  g = linearToSrgb(g)
  b_ = linearToSrgb(b_)

  const toHex = (v: number) => {
    const n = Math.round(v * 255)
    return ('0' + n.toString(16)).slice(-2)
  }

  return `#${toHex(r)}${toHex(g)}${toHex(b_)}`
}
</script>

<style scoped>
.explore-view {
  padding-bottom: 2rem;
}

.element-popover-root {
  z-index: 100;
}

.popover-backdrop {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.4);
  backdrop-filter: blur(2px);
  z-index: 1000;
}

.element-popover {
  z-index: 1001;
  width: 320px;
}

.popover-desktop {
  position: absolute;
}

.popover-mobile {
  position: fixed;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  width: 90vw;
  max-width: 400px;
}

.markdown-content :deep(p) {
  margin-bottom: 0.5em;
}

.markdown-content :deep(strong) {
  color: var(--color-primary);
}

.popover-enter-active,
.popover-leave-active {
  transition: opacity 0.2s, transform 0.2s;
}

.popover-enter-from,
.popover-leave-to {
  opacity: 0;
  transform: scale(0.95);
}

.popover-mobile.popover-enter-from,
.popover-mobile.popover-leave-to {
  transform: translate(-50%, -40%) scale(0.95);
}

.paper-animation {
  animation: paper-float-in 0.6s cubic-bezier(0.23, 1, 0.32, 1) forwards;
}

@keyframes paper-float-in {
  0% {
    transform: translateY(30px) rotate(-3deg) scale(0.9);
    opacity: 0;
  }
  100% {
    transform: translateY(0) rotate(0.5deg) scale(1);
    opacity: 1;
  }
}

.paper-shape {
  clip-path: polygon(
    2% 1%, 98% 2%, 99% 98%, 1% 99%, 
    1% 50%, 0.5% 48%, 1% 45%, 
    1% 10%
  );
  border-radius: 2px;
}

.parchment-effect {
  background-image: 
    radial-gradient(circle at 50% 50%, transparent 80%, rgba(0,0,0,0.02) 100%),
    repeating-linear-gradient(45deg, rgba(0,0,0,0.005) 0px, rgba(0,0,0,0.005) 1px, transparent 1px, transparent 10px);
}

.font-serif {
  font-family: "Noto Serif SC", "Source Han Serif CN", "Songti SC", serif;
}
</style>
