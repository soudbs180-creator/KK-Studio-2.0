# 研究意图：AI 短剧 / 视频创作工作台品类

- 日期：2026-10-26
- 触发：用户提供微信公众号文章《AI短剧工作台都能自己搭了，GitHub上这些神器真可以试试》（虾蛄AI，2026-10-24），推荐 7 个 GitHub 项目；要求研究其功能实现方式，并为 KK-Studio 重新制定"围绕项目发展学习功能与优点、不断增进"的方针。
- 外部对象：文章推荐的 7 个仓库，以及检索中发现的同生态仓库（二开、Skills、同类画布），清单见 [`research.md`](research.md)。
- 研究模式：`read_only_static_research`。仅通过 GitHub API 只读检索仓库元数据、README、目录结构与 package.json；未 clone、未运行、未安装、未调用任何竞品服务或计费接口。
- 边界：
  - `runtime_verified=false`：所有功能描述来自仓库自述与公开结构，不构成竞品运行行为证明。
  - star 数与创建时间为 2026-10-26 检索值，会变化。
  - 不复制任何竞品源码、CSS、提示词或服务端假设进 KK。
  - 竞品许可各异（MIT / Source Available / 商业授权捆绑），引入前必须单独评估。
- 预期产出：
  1. `research.md`：研究发现（本文档的孪生证据）。
  2. `docs/reference/competitor/INDEX.md` 注册条目。
  3. `docs/reference/competitor/COMPETITOR_CONCLUSIONS.md` 结论追加。
  4. `docs/engineering/COMPETITIVE-LEARNING-POLICY.md`：持续学习方针（用户核心诉求）。
- 产品文件未修改；本包是研究证据，不是产品变更。
