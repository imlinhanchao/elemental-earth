import { defineStore } from 'pinia'
import { ref, computed, watch } from 'vue'
import { useStateStore } from './state'
import { usePackStore } from './pack'
import { useTaskStore } from './task'
import { useLabStore } from './lab'
import Storage from '@/utils/storage'

export interface ITutorialStep {
  title: string
  content: string
  target?: string // Optional: target element selector for highlighting
  condition?: () => boolean // Condition to complete this step
}

export const useTutorialStore = defineStore('tutorial', () => {
  const stateStore = useStateStore()
  const packStore = usePackStore()
  const taskStore = useTaskStore()
  const storage = new Storage()

  const isTutorialActive = ref(false)
  const currentStep = ref(0)
  const maxReachedStep = ref(storage.getItem<number>('tutorial_max_step') || 0)
  const showIntroPanel = ref(false)
  const currentPath = ref('/')

  // Persisted flag to know if tutorial was ever skipped or completed
  const tutorialStatus = ref(storage.getItem<'active' | 'completed' | 'skipped'>('tutorial_status') || 'none')

  function initTutorial() {
    if (tutorialStatus.value === 'none') {
      showIntroPanel.value = true
    } else if (tutorialStatus.value === 'active') {
      isTutorialActive.value = true
      currentStep.value = storage.getItem<number>('tutorial_step') || 1
      maxReachedStep.value = storage.getItem<number>('tutorial_max_step') || currentStep.value
      stateStore.state.allowedMapKeys = currentStep.value < 8 ? ['river_side', 'mountain', 'forest'] : null
    }
  }

  function startTutorial() {
    showIntroPanel.value = false
    isTutorialActive.value = true
    currentStep.value = 1
    maxReachedStep.value = 1
    tutorialStatus.value = 'active'
    storage.setItem('tutorial_status', 'active')
    storage.setItem('tutorial_step', 1)
    storage.setItem('tutorial_max_step', 1)
    
    // Initial tutorial setup
    stateStore.setMap('mountain')
    stateStore.state.allowedMapKeys = ['river_side', 'mountain', 'forest']
  }

  function skipTutorial() {
    showIntroPanel.value = false
    isTutorialActive.value = false
    tutorialStatus.value = 'skipped'
    storage.setItem('tutorial_status', 'skipped')
    storage.removeItem('tutorial_step')
    stateStore.state.allowedMapKeys = null
  }

  function completeTutorial() {
    isTutorialActive.value = false
    tutorialStatus.value = 'completed'
    storage.setItem('tutorial_status', 'completed')
    storage.removeItem('tutorial_step')
    stateStore.state.allowedMapKeys = null
  }

  const steps: ITutorialStep[] = [
    {
      title: '第一步：收集资源',
      content: '先在大自然中获取基础材料。请在山地使用“捡石头”和“捡树枝”行动，要求获得 30 个石头和 15 个木材。',
      target: 'home-actions-collect'
    },
    {
      title: '第二步：研究科技',
      content: '有了材料，我们需要学会如何制作工具。进入“科技”页，解锁“石器制作”。',
      target: 'tab-tech'
    },
    {
      title: '第三步：制作工具并挖掘',
      content: '在“行动”页制作一把“石稿”和一把“石斧”。然后执行“挖掘”行动，这是获取矿物的关键。',
      target: 'home-actions-craft'
    },
    {
      title: '第四步：深入森林',
      content: '点击地图图标，切换为“森林”。使用石斧进行“伐木”，收集至少 50 块木材。',
      target: 'header-map-switch'
    },
    {
      title: '第五步：木材加工',
      content: '有了足够的木材，进入“科技”页解锁“木材加工”，然后在“行动”页制作一个“木桶”。',
      target: 'tab-tech'
    },
    {
      title: '第六步：实验室探秘',
      content: '切换回“河边”并执行“打水”。然后进入“实验室”，按顺序选择容器、材料（1泥土+1水）和操作（混合），获取粘土。',
      target: 'tab-lab'
    },
    {
      title: '第七步：寻找燧石',
      content: '继续执行“挖掘”行动，直到获取 7 个燧石。燧石是开启火种的关键材料。',
      target: 'action-mining'
    },
    {
      title: '第八步：开启新时代',
      content: '在“科技”页解锁“火种制作”，然后在“行动”页制作一个“火种”。制作成功后即可跨入石器时代！',
      target: 'tab-tech'
    }
  ]

  const currentStepData = computed(() => {
    const s = currentStep.value
    const idx = typeof s === 'number' ? s - 1 : parseInt(s as any) - 1
    if (idx < 0 || isNaN(idx) || idx >= steps.length) return null
    
    const step = steps[idx]
    if (!step) return null

    const path = currentPath.value || '/'
    // 兼容多种路由模式
    const isHome = path === '/' || path === '' || path === '#/' || path === '#'
    const isTech = path.includes('/tech')
    const isLab = path.includes('/lab')

    const labStore = useLabStore()

    if (s === 1) {
      if (!isHome) return { ...step, target: 'tab-home' }
      const stoneQty = packStore.getItemQuantity('stone')
      const woodQty = packStore.getItemQuantity('wood')
      if (stoneQty < 30) return { ...step, target: 'action-pick_stone' }
      return { ...step, target: woodQty < 15 ? 'action-pick_branch' : 'home-actions-collect' }
    }

    if (s === 2) {
      return isTech ? { ...step, target: 'tech-stone_tool_crafting' } : { ...step, target: 'tab-tech' }
    }

    if (s === 3) {
      if (!isHome) return { ...step, target: 'tab-home' }
      const hasTools = packStore.hasItem('stone_pickaxe') && packStore.hasItem('stone_axe')
      return hasTools ? { ...step, target: 'action-mining' } : { ...step, target: 'home-actions-craft' }
    }

    if (s === 4) {
      if (stateStore.state.map !== 'forest') return { ...step, target: 'header-map-switch' }
      if (!isHome) return { ...step, target: 'tab-home' }
      return { ...step, target: 'action-chop_wood' }
    }

    if (s === 5) {
      const hasTech = packStore.hasTech('wood_processing')
      if (!hasTech) return isTech ? { ...step, target: 'tech-wood_processing' } : { ...step, target: 'tab-tech' }
      if (!isHome) return { ...step, target: 'tab-home' }
      return { ...step, target: 'action-craft_wooden_bucket' }
    }

    if (s === 6) {
      const waterQty = packStore.getItemQuantity('water')
      if (waterQty < 1) {
        if (!isHome) return { ...step, target: 'tab-home' }
        if (stateStore.state.map !== 'river_side') return { ...step, target: 'header-map-switch' }
        return { ...step, target: 'action-fetch_water' }
      }
      if (!isLab) return { ...step, target: 'tab-lab' }
      
      // 实验室动态引导
      if (!labStore.selectedContainerKey) return { ...step, target: 'lab-step-1' }
      if (labStore.selectedMaterials.size === 0) {
        return { ...step, content: '请点击“添加材料”，选择 1 份“泥土”和 1 份“水”。', target: 'lab-step-2' }
      }
      if (!labStore.selectedOperationKey) {
        return { ...step, content: '材料已就绪，请在“3.选择操作”中点击“搅拌”。', target: 'lab-step-3' }
      }
      // 当选择操作后，3.5 追加操作会出现，直接引导至底部的开始实验
      return { ...step, content: '“3.5追加操作”是可选项，本次实验不需要。直接点击底部的“开始实验”按钮即可！', target: 'lab-execute-btn' }
    }

    if (s === 7) {
      return isHome ? { ...step, target: 'action-mining' } : { ...step, target: 'tab-home' }
    }

    if (s === 8) {
      if (packStore.techs.includes('fire_starting')) {
        return isHome ? { ...step, target: 'action-craft_fire_seed' } : { ...step, target: 'tab-home' }
      }
      return isTech ? { ...step, target: 'tech-fire_starting' } : { ...step, target: 'tab-tech' }
    }

    return step
  })

  const isNextStepDisabled = computed(() => {
    if (!isTutorialActive.value) return true
    
    const s = currentStep.value
    // If the user has already reached a further step once, allow going forward regardless of current state
    if (s < maxReachedStep.value) return false

    const getQty = (key: string) => packStore.getItemQuantity(key)
    const hasTech = (key: string) => packStore.hasTech(key)
    const hasItem = (key: string) => packStore.hasItem(key)

    if (s === 1) {
      return !(getQty('stone') >= 30 && getQty('wood') >= 15)
    }
    if (s === 2) {
      return !hasTech('stone_tool_crafting')
    }
    if (s === 3) {
      return !(hasItem('stone_pickaxe') && hasItem('stone_axe') && getQty('mud') >= 1)
    }
    if (s === 4) {
      return !(stateStore.state.map === 'forest' && getQty('wood') >= 50)
    }
    if (s === 5) {
      return !(hasTech('wood_processing') && hasItem('wooden_bucket'))
    }
    if (s === 6) {
      // Step 6 (Lab) condition is handled manually via the "Next" button in the overlay
      // It's always enabled if we reached here
      return false
    }
    if (s === 7) {
      return !(getQty('flint') >= 7)
    }
    if (s === 8) {
      return !(hasTech('fire_starting') && hasItem('fire_seed'))
    }
    
    return false
  })

  // Persist step changes
  watch(currentStep, (val) => {
    if (isTutorialActive.value && val > 0) {
      storage.setItem('tutorial_step', val)

      // Update max reached step
      if (val > maxReachedStep.value) {
        maxReachedStep.value = val
        storage.setItem('tutorial_max_step', val)
      }

      // On step 7 or above, allow all maps
      if (val >= 7) {
        stateStore.state.allowedMapKeys = null
      } else {
        stateStore.state.allowedMapKeys = ['river_side', 'mountain', 'forest']
      }
    }
  })

  // Logic to advance steps
  watch([() => packStore.items, () => packStore.techs, () => stateStore.state.map, () => stateStore.state.currentEra, () => packStore.provenFormulas], () => {
    if (!isTutorialActive.value) return

    const getQty = (key: string) => packStore.getItemQuantity(key)
    const hasTech = (key: string) => packStore.hasTech(key)
    const hasItem = (key: string) => packStore.hasItem(key)

    if (currentStep.value === 1) {
      if (getQty('stone') >= 30 && getQty('wood') >= 15) {
        currentStep.value = 2
      }
    } else if (currentStep.value === 2) {
      if (hasTech('stone_tool_crafting')) {
        currentStep.value = 3
      }
    } else if (currentStep.value === 3) {
      // Must have tools AND have found at least 1 mud from mining
      if (hasItem('stone_pickaxe') && hasItem('stone_axe') && getQty('mud') >= 1) {
        currentStep.value = 4
      }
    } else if (currentStep.value === 4) {
      // Must in forest and have 50 wood
      if (stateStore.state.map === 'forest' && getQty('wood') >= 50) {
        currentStep.value = 5
      }
    } else if (currentStep.value === 5) {
      // Must have tech and bucket
      if (hasTech('wood_processing') && hasItem('wooden_bucket')) {
        currentStep.value = 6
      }
    } else if (currentStep.value === 6) {
      // Step 6 (Lab) is mandatory even if clay exists. 
      // User must manually click "Next".
    } else if (currentStep.value === 7) {
      if (getQty('flint') >= 7) {
        currentStep.value = 8
      }
    } else if (currentStep.value === 8) {
      // Final step: fire starting tech and fire seed item
      if (hasTech('fire_starting') && hasItem('fire_seed')) {
         completeTutorial()
         stateStore.checkMilestone('craft_fire_seed')
      }
    }
  }, { deep: true })

  return {
    isTutorialActive,
    currentStep,
    maxReachedStep,
    showIntroPanel,
    tutorialStatus,
    currentStepData,
    isNextStepDisabled,
    stepsCount: steps.length,
    currentPath,
    initTutorial,
    startTutorial,
    skipTutorial,
    completeTutorial
  }
})
