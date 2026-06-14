<script setup lang="ts">
  import { Actions } from '@/data/actions';
  import Action from '@/components/Action.vue';
</script>
<template>
  <div class="flex gap-3 flex-wrap">
    <Action v-for="action in Actions" :key="action.key" :data="action" />
  </div>
</template>
