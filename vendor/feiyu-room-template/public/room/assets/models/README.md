# 3D 模型（作者提供）

This adapted package retains both author-provided models for the existing
standard/high-quality selector:

```text
da-feiyu.opt.glb    7,021,424 bytes; default standard model
da-feiyu.glb       58,885,308 bytes; optional high-quality model
```

The default 2D view loads neither GLB. Entering 3D initially requests the standard
model; selecting high quality requests the larger source model. Both are runtime
assets, rather than an unused engineering backup. These are file sizes, not
measured memory, GPU or power budgets.

## 模型约定

- 单位：米；Y 轴向上；原点在脚底；正面朝 +Z；
- 运行时高度约 1.42 m；
- 没有骨骼/动画；站立、坐、躺用根节点变换，移动用顶点着色器摆动下半身；
- To replace a model, retain feet at `y=0` and a front facing `+Z`, then replace
  the corresponding GLB selected by `app.js`'s `MODEL_URLS`. If resource paths
  change, update those `app.js` entries: Room passes the chosen URL explicitly
  to `ModelActor`. Keep `model-actor.js`'s `MODEL_URLS` and default aligned for
  callers that construct the actor without an explicit URL.

## 模型授权

- 模型由本项目作者提供，**不是** dsh-pet 的 2D 素材；
- 仅随本模板用于个人、非商业的房间展示；
- 不要单独提取、转售、批量再分发，或用于商业项目；
- 商用或二次创作前，请先取得作者书面许可；
- 如果你不是模型作者，请先确认你有权把它放进公开仓库。

## 没有模型时

2D presentation does not depend on either model. The general 3D entry can fall
back to the procedural Chibi actor when a GLB cannot load. A failed quality
switch retains the loaded model, or tries the standard model if none is ready.
