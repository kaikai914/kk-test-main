const fs = require("fs");
const chalk = require("chalk");
const execa = require("execa");

module.exports = () => {
  // 获取提交信息
  const params = process.env.GIT_PARAMS;
  const commitMessage = fs.readFileSync(params, "utf-8").trim();

  // 提交信息验证规则
  const megreRegex = /^Merge branch.+/;
  const commitRegex = /^(feat|fix|docs|build|refactor|other):.+/;
  const complexCommitRegex = /^(feat|fix|docs|build|refactor|other)(\([0-9]+\))+:.+/;

  const rulesMessage = `
  1. 新增功能或者需求
  格式: ${chalk.green(`feat(<Tapd单子Id>):<Tapd单子描述>`)}
  示例: ${chalk.green(`feat(1017075):SDK调试页面`)}
  格式: ${chalk.green(`feat: <新功能描述> `)}
  示例: ${chalk.green(`feat: 所有页面支持自适应`)}
  2. 修复BUG
  格式: ${chalk.green(`fix(<Tapd单子Id>):<Tapd单子描述>`)}
  示例: ${chalk.green(`fix(1026053):查询不到数据`)}
  格式: ${chalk.green(`fix:<修复内容描述>`)}
  示例: ${chalk.green(`fix:修复小屏幕自适应排版错位问题`)}
  3. 文档更新
  格式: ${chalk.green(`docs:<文档更新调整>`)}
  示例: ${chalk.green(`docs:新增 README.md 项目说明文件`)}
  4. 构建调整
  格式: ${chalk.green(`build:<构建内容调整>`)}
  示例: ${chalk.green(`build:域名调整`)}
  5. 代码优化
  格式: ${chalk.green(`refactor:<代码重构或者优化描述>`)}
  示例: ${chalk.green(`refactor:优化视图无数据加载代码`)}
  6. 其他
  格式: ${chalk.green(`other:<提交内容描述>`)}
  示例: ${chalk.green(`other:格式化代码，新增代码注释`)}`;

  // 验证失败信息提示退出程序
  if (!megreRegex.test(commitMessage) && !commitRegex.test(commitMessage) && !complexCommitRegex.test(commitMessage)) {
    const vertifyMsgs = [];
    vertifyMsgs.push(`${chalk.bgRed.white(" ERROR ")} 提交代码格式不规范`);
    vertifyMsgs.push(`${chalk.bgGreen.white(" FORMAT ")} 提交示例格式`);
    vertifyMsgs.push(rulesMessage);
    vertifyMsgs.push(`${chalk.bgRed.white(" MESSAGE ")} 修改提交信息后重新提交`);
    console.error(vertifyMsgs.join("\n\n"));
    process.exit(1);
  }

  // 验证成功统格式化提交信息
  const version = execa.commandSync("git rev-parse --abbrev-ref HEAD").stdout.replace("\n", "").split("/").pop();
  fs.writeFileSync(params, `[${version}] ${commitMessage}`);
};
