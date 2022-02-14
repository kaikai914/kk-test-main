# Service 命令服务

星云 3.0 项目的命令行可视化服务。

## 安装依赖

```bash
npm i @nebula/service
```

## 提交验证

通过 Git 钩子函数进行提交验证。

```json
{
  "gitHooks": {
    "commit-msg": "nebula-cli-service verify"
  }
}
```

## 验证规则

Git 提交信息需要按照规范格式进行提交。

```text
1. 新增功能或者需求
格式: feat(<Tapd单子Id>):<Tapd单子描述>
示例: feat(1017075):SDK调试页面
格式: feat: <新功能描述>
示例: feat: 所有页面支持自适应
2. 修复BUG
格式: fix(<Tapd单子Id>):<Tapd单子描述>
示例: fix(1026053):查询不到数据
格式: fix:<修复内容描述>
示例: fix:修复小屏幕自适应排版错位问题
3. 文档更新
格式: docs:<文档更新调整>
示例: docs:新增 README.md 项目说明文件
4. 构建调整
格式: build:<构建内容调整>
示例: build:域名调整
5. 代码优化
格式: refactor:<代码重构或者优化描述>
示例: refactor:优化视图无数据加载代码
6. 其他
格式: other:<提交内容描述>
```

## 代码发布

发布命令配置。

```json
{
  "scripts": {
    "release": "nebula-cli-service release"
  }
}
```

运行命令根据界面提示进行操作。

```bash
npm run release
```

:::tip
发布代码分支必须是`feature/v{version}`格式，否则不会出现在发布可选项。

运维`GIT`自动部署，发布到`sit`需要描述字段`需求ID`、`简易描述`字段，提交记录至少一条包含以下信息。

格式 1: `feat(<Tapd 单子 Id>):<Tapd 单子描述>`

格式 2: `fix(<Tapd 单子 Id>):<Tapd 单子描述>`

没有包含符合要求的记录，会通过命令界面提示输入
:::

## 版本校验

校验各扩展插件，本地版本是否一致，是否需要更新到最新版本。

```json
{
  "scripts": {
    "release": "nebula-cli-service check"
  }
}
```

运行命令根据界面提示进行操作。

```bash
npm run check
```

## Service Command

| 命令    | 说明                                 | 参数 |
| ------- | ------------------------------------ | ---- |
| verify  | Git 提交信息规范验证                 | —    |
| release | 代码发布到 dev、sit、beta、prod 环境 | —    |
| check   | 校验扩展插件版本                     | —    |
