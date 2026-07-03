<template>
  <div class="fixed inset-0 flex flex-col items-center justify-center z-[9999] bg-base-100 transition-opacity duration-500">
    <div class="atom-container text-primary">
      <div class="nucleus bg-primary shadow-[0_0_15px_var(--base-primary)]"></div>
      <div class="orbit border-primary/20"><div class="electron bg-primary"></div></div>
      <div class="orbit border-primary/20"><div class="electron bg-primary"></div></div>
      <div class="orbit border-primary/20"><div class="electron bg-primary"></div></div>
    </div>
    <div class="loading-text text-lg font-medium tracking-widest text-base-content/70 animate-pulse">
      元素重构中...
    </div>
  </div>
</template>

<script setup lang="ts">
// Loading overlay using CSS from index.html
</script>

<style scoped>
.atom-container {
  position: relative;
  width: 100px;
  height: 100px;
}

.nucleus {
  position: absolute;
  top: 35%;
  left: 35%;
  width: 30%;
  height: 30%;
  border-radius: 50%;
  animation: pulse 1.5s infinite ease-in-out;
}

.orbit {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  border-width: 2px;
  border-radius: 50%;
}

.orbit:nth-child(2) { transform: rotateX(70deg) rotateY(20deg); }
.orbit:nth-child(3) { transform: rotateX(70deg) rotateY(-20deg); }
.orbit:nth-child(4) { transform: rotateY(70deg) rotateX(20deg); }

.electron {
  position: absolute;
  width: 8px;
  height: 8px;
  border-radius: 50%;
  animation: orbit-move 2s infinite linear;
  /* Use fixed distance since offset-path varies */
  left: 50%;
  top: 0;
  margin-left: -4px;
}

.orbit:nth-child(2) .electron { animation-delay: -0.5s; }
.orbit:nth-child(3) .electron { animation-delay: -1s; }
.orbit:nth-child(4) .electron { animation-delay: -1.5s; }

@keyframes orbit-move {
  0% { transform: rotate(0deg) translateX(50px) rotate(0deg); }
  100% { transform: rotate(360deg) translateX(50px) rotate(-360deg); }
}

@keyframes pulse {
  0%, 100% { transform: scale(1); opacity: 0.8; }
  50% { transform: scale(1.1); opacity: 1; }
}

@keyframes fade {
  0%, 100% { opacity: 0.5; }
  50% { opacity: 1; }
}
</style>
