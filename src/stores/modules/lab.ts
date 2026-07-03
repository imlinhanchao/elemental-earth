import { defineStore } from 'pinia'
import { ref } from 'vue'

export const useLabStore = defineStore('lab', () => {
  const selectedContainerKey = ref<string | null>(null)
  const selectedMaterials = ref<Map<string, number>>(new Map())
  const selectedOperationKey = ref<string | null>(null)

  function reset() {
    selectedContainerKey.value = null
    selectedMaterials.value = new Map()
    selectedOperationKey.value = null
  }

  return {
    selectedContainerKey,
    selectedMaterials,
    selectedOperationKey,
    reset
  }
})
