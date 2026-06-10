# elemental-earth

基于 PixiJS 的地质群系平面地图生成示例，逻辑世界尺寸为 `100000 x 100000`。

## 功能

- 随机生成 6 类群系：河滩平原、石灰岩山地、氧化山地、火山地热、干旱盆地、深层结晶带
- 满足规则：
  - 河滩平原沿河道生成
  - 干旱盆地远离水源
  - 火山地热偏向地图边缘
  - 其余群系按海拔梯度分布
- 使用颜色深浅表达海拔变化

## 运行方式

这是纯前端静态页面，直接用浏览器打开以下文件即可：

`/home/runner/work/elemental-earth/elemental-earth/imlinhanchao/elemental-earth/index.html`

页面中点击“重新生成”可刷新随机种子并得到新地图。