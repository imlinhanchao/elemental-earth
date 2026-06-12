<template>
  <div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'

interface Element {
  id: number
  symbol: string
  name: string
  category: string
  badgeClass: string
}

const search = ref<string>('')

const items: Element[] = [

]

const filteredItems = computed<Element[]>(() =>
  items.filter(
    (i) =>
      i.name.includes(search.value) ||
      i.symbol.toLowerCase().includes(search.value.toLowerCase()) ||
      i.category.includes(search.value)
  )
)
</script>
