<script setup lang="ts">
  import { Techs } from '@/data/techs';
  import Tech from '@/components/Tech.vue';
</script>
<template>
  <div class="flex gap-3 flex-wrap">
    <Tech v-for="tech in Techs" :key="tech.key" :data="tech" />
  </div>
</template>
