import { defineConfig } from 'vite'
import { resolve } from 'path';
import vue from '@vitejs/plugin-vue'
import tailwindcss from '@tailwindcss/vite'
import { createSvgIconsPlugin } from 'vite-plugin-svg-icons'
import { VitePWA } from 'vite-plugin-pwa'

function pathResolve(dir: string) {
  return resolve(process.cwd(), '.', dir);
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    vue(),
    tailwindcss(),
    createSvgIconsPlugin({
      iconDirs: [resolve(process.cwd(), 'src/assets/icons')],
      symbolId: 'icon-[dir]-[name]',
    }),
    VitePWA({
      strategies: 'injectManifest',
      srcDir: 'src',
      filename: 'sw.ts',
      registerType: 'prompt',
      injectRegister: 'script',
      includeAssets: ['icons.svg'],
      manifest: {
        name: '元素纪元',
        short_name: '元素纪元',
        description: '基于矿物学和化学实验的放置游戏',
        theme_color: '#000000',
        icons: [
          {
            src: 'icons.svg',
            sizes: "any",
            type: 'image/svg+xml',
            purpose: 'any maskable'
          }
        ]
      },
      devOptions: {
        enabled: true,
        type: 'module'
      }
    })
  ],
  resolve: {
    alias: [
      {
        find: /@\//,
          replacement: pathResolve('src') + '/',
      }
    ]
  },
  server: {
    allowedHosts: true,
    proxy: {
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true,
        secure: false,
      },
    },
  }
})
