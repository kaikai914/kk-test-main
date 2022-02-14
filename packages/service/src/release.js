const chalk = require("chalk");
const figlet = require("figlet");
const execa = require("execa");
const inquirer = require("inquirer");
const { table } = require("table");
const { format } = require("date-fns");

const ReleaseEnv = {
  Prod: "master",
  Beta: "product",
  Sit: "sit",
  Dev: "develop",
};

module.exports = class NebulaCliRelease {
  constructor() {
    // 发布参数
    this.state = { source: "", target: "", version: "" };
  }

  // 发布启动
  start() {
    const releaseMsg = figlet.textSync("Release", { font: "Big" });
    const messages = [
      chalk.green(releaseMsg),
      chalk.yellow("1.需要要发布分支以版本号结尾命名，示例：feature/v10000"),
      chalk.yellow("2.需要发布的代码和本地已经都成功推送到GIT仓库"),
      chalk.yellow("3.发布中有冲突需要手动处理冲突在重新执行发布命令"),
    ];
    this.initProdName();

    console.log(messages.join("\n"));
  }

  // 初始化远程主分支名称
  initProdName() {
    const RemoteBranchs = execa.commandSync("git branch -r").stdout;
    if (RemoteBranchs.indexOf("main") > -1 && RemoteBranchs.indexOf("master") < 0) {
      ReleaseEnv.Prod = "main";
    }
  }

  // 选择需要发布的代码分支
  async selectSourceBranch() {
    const rawBranchs = execa.commandSync("git branch -l").stdout.split("\n");
    const normalizeBranchs = rawBranchs.map((branch) => branch.replace("* ", "").trim());
    const releaseBranchs = normalizeBranchs.filter((branch) => {
      return /^.+v[0-9]+.[0-9]+.[0-9]+/.test(branch);
    });

    const { source } = await inquirer.prompt([
      {
        type: "list",
        name: "source",
        message: "请选择要发布的分支：",
        choices: Array.from(releaseBranchs, (branch) => {
          return { name: branch, value: branch };
        }),
      },
    ]);
    return await this.checkSourceBranch(source);
  }
  // 选择需要发布的目标环境
  async selectTargetBranch() {
    const envs = [
      { name: "开发环境：develop", value: ReleaseEnv.Dev },
      { name: "测试环境：sit", value: ReleaseEnv.Sit },
      { name: "灰度环境：beta", value: ReleaseEnv.Beta },
      { name: "线上环境：master", value: ReleaseEnv.Prod },
    ];

    const { target } = await inquirer.prompt([
      {
        type: "list",
        name: "target",
        message: "请选择要发布的环境：",
        choices: envs,
      },
    ]);

    return await this.checkTargetBranch(target);
  }

  // 检测Source分支是否在远程仓库
  async checkSourceBranch(source) {
    const branchs = execa.commandSync("git branch -r").stdout;
    if (branchs.indexOf(source) > -1) {
      return source;
    } else {
      const { confirm } = await inquirer.prompt([
        {
          type: "list",
          name: "confirm",
          message: `${source}分支没有在远程仓库中，是否推送到远程仓库？`,
          choices: [
            { name: "是", value: true },
            { name: "否", value: false },
          ],
        },
      ]);
      if (confirm) {
        execa.commandSync(`git push origin ${source}:${source}`).stdout;
        execa.commandSync(`git push --set-upstream origin ${source}`).stdout;
        return source;
      } else {
        process.exit();
      }
    }
  }

  // 检测Target分支是否在本地
  async checkTargetBranch(target) {
    const branchs = execa.commandSync("git branch").stdout;
    const RemoteBranchs = execa.commandSync("git branch -r").stdout;
    if (RemoteBranchs.indexOf(target) < 0) {
      const { confirm } = await inquirer.prompt([
        {
          type: "list",
          name: "confirm",
          message: `${target}分支没有在远程仓库中，是否创建并推送到远程仓库？`,
          choices: [
            { name: "是", value: true },
            { name: "否", value: false },
          ],
        },
      ]);
      if (confirm) {
        execa.commandSync(`git checkout master`).stdout;
        execa.commandSync(`git pull`).stdout;
        execa.commandSync(`git checkout -b ${target}`).stdout;
        execa.commandSync(`git push origin ${target}:${target}`).stdout;
        execa.commandSync(`git push --set-upstream origin ${target}`).stdout;
        return target;
      } else {
        process.exit();
      }
    }
    if (branchs.indexOf(target) > -1) {
      return target;
    } else {
      execa.commandSync(`git fetch origin ${target}:${target}`).stdout;
      execa.commandSync(`git push --set-upstream origin ${target}`).stdout;
      return target;
    }
  }

  // 获取最新的发布标签
  getLatestTag() {
    const prefixs = {
      [ReleaseEnv.Dev]: "dev",
      [ReleaseEnv.Sit]: "sit",
      [ReleaseEnv.Beta]: "release",
      [ReleaseEnv.Prod]: "release",
    };

    const prefix = prefixs[this.state.target];
    const version = this.state.version;

    const tagLists = execa.commandSync(
      "git for-each-ref --format=%(refname)|%(creatordate); --sort=-creatordate --count=100 refs/tags",
    ).stdout;
    if (!tagLists) return "";

    const latestTag = tagLists
      .split("\n")
      .map((tag) => {
        const [name, date] = tag.split("|");
        return { name: name.replace("refs/tags/", ""), date };
      })
      .filter(({ name }) => {
        return name.startsWith(prefix) && name.includes(version);
      })
      .sort((x, y) => {
        const start = Date.parse(y.date);
        const end = Date.parse(x.date);
        if (start === end) {
          return y.name.localeCompare(x.name);
        }
        return start - end;
      })
      .shift();

    return latestTag;
  }

  // 获取需要发布分支的提交记录
  getSourceBranchCommits() {
    // 获取最新代码
    const { source, version } = this.state;
    execa.commandSync(`git checkout ${source}`).stdout;
    execa.commandSync(`git pull origin ${source}`).stdout;

    const separator = `|-${version}-|`;
    const command = `git log --grep=\\[${version}\\] --pretty=format:%s${separator}%cd`;
    const commits = execa
      .commandSync(command)
      .stdout.split("\n")
      .map((commit) => {
        const [subject, date] = commit.split(separator);
        const [type, id, ...contents] = subject.replace(/\[v.+\] ([a-z]+)(\([0-9,]+\))?:(.+)/, "$1|$2|$3").split("|");

        const tid = id ? id.replace(/\(|\)/g, "") : undefined;
        let commitContent = contents.join("");
        let lastContent = commitContent.split(" ").pop() || "";
        const link = /[a-zA-z]+:\/\/[^\s]*/.test(lastContent) ? lastContent : "";
        commit = link ? commitContent.replace(link, "") : commitContent;
        return { type, tid, version, date, commit, link, subject };
      })
      .filter((commit) => {
        return commit.commit;
      });
    return commits;
  }

  // 获取发布的提交记录信息;
  getReleaseCommits() {
    const latestTag = this.getLatestTag();
    const commits = this.getSourceBranchCommits().filter((commit) => {
      if (!latestTag) return true;
      return Date.parse(commit.date) > Date.parse(latestTag.date);
    });
    return commits;
  }

  // 确认发布记录
  async confirmSourceBranchCommits() {
    const { source, target } = this.state;

    // 获取最新标签后的提交记录
    const commits = this.getReleaseCommits();

    // 提交记录表格数据展示
    const preset = [chalk.bold("Type"), chalk.bold("Date"), chalk.bold("TapdId"), chalk.bold("Commit")];

    const dataList = Array.from(commits, (commitContent) => {
      let { type, tid, date, commit } = commitContent;
      const typeBgColors = {
        feat: chalk.bgGreen,
        fix: chalk.bgRed,
        build: chalk.bgBlue,
        docs: chalk.bgYellow,
      };
      const bgColor = typeBgColors[type] || chalk.bgCyan;

      type = bgColor.white(` ${type} `);
      date = format(new Date(date), "yyyy-MM-dd");
      tid = tid ? chalk.magenta(` ${tid} `) : "";

      return [type, date, tid, commit];
    });

    if (dataList.length > 0) {
      console.log(table([preset, ...dataList]));
    }

    // 发布信息确认
    const releaseMsg = `${chalk.yellow(source)}=>${chalk.yellow(target)}`;
    const { confirm } = await inquirer.prompt([
      {
        type: "list",
        name: "confirm",
        message: `发布信息确认（${releaseMsg}）：`,
        choices: [
          { name: "确认无误", value: true },
          { name: "内容错误", value: false },
        ],
      },
    ]);
    return confirm;
  }

  async createReleaseTag() {
    const { target, version } = this.state;
    // 测试环境和灰度环境需要简短的发布概要
    let description = "";
    if (target === ReleaseEnv.Sit) {
      const { desc } = await inquirer.prompt([
        {
          type: "input",
          name: "desc",
          message: "版本发布概要描述(数字字母下划线):",
          default: "feat",
        },
      ]);
      description = desc;
    }

    const prefixs = {
      [ReleaseEnv.Dev]: "dev",
      [ReleaseEnv.Sit]: "sit",
      [ReleaseEnv.Beta]: "release",
      [ReleaseEnv.Prod]: "release",
    };

    const prefix = prefixs[target];
    let index = "01";
    const latestTag = this.getLatestTag();
    if (latestTag) {
      const contentList = latestTag.name.split(/-|_/);
      const versionIndex = contentList.findIndex((content) => {
        return content === version;
      });
      const lastIndex = Number(contentList[versionIndex + 1]);
      index = isNaN(lastIndex) ? "01" : ("0" + (lastIndex + 1)).slice(-2);
    }
    switch (target) {
      case ReleaseEnv.Prod:
        return `${prefix}-${version}-${index}`;
      case ReleaseEnv.Sit:
        return `${prefix}-${version}-${index}_${description}`;
      case ReleaseEnv.Beta:
        return `${prefix}-${version}-${index}_beta`;
      case ReleaseEnv.Dev:
      default:
        return `${prefix}-${version}-${index}`;
    }
  }

  async createTapdId() {
    const { target } = this.state;
    const commits = this.getReleaseCommits();
    let tapdIdList = commits
      .filter((commit) => commit.tid)
      .map((commit) => commit.tid)
      .join(",");
    if (tapdIdList) return tapdIdList;

    if (target === ReleaseEnv.Dev) return;

    const { desc } = await inquirer.prompt([
      {
        type: "input",
        name: "desc",
        message: "需求ID(多个请用','号分隔):",
        default: "0000000",
      },
    ]);
    return desc;
  }

  async createTapdContents() {
    const { target } = this.state;
    const commits = this.getReleaseCommits();
    let tapdContents = commits
      .filter((commit) => commit.tid)
      .map((commit) => commit.commit)
      .join(",");
    if (tapdContents) return tapdContents;

    if (target === ReleaseEnv.Dev) return;

    const { desc } = await inquirer.prompt([
      { type: "input", name: "desc", message: "简易描述:", default: "功能优化，代码更新" },
    ]);
    return desc;
  }

  async megreReleaseCode() {
    const { source, target, version } = this.state;
    const releaseTag = await this.createReleaseTag();
    let description = releaseTag;
    if (target === ReleaseEnv.Sit) {
      description = description.replace(/.*_/, "");
    }

    const tapdIdList = await this.createTapdId();
    const tapdContents = await this.createTapdContents();

    const releaseMsgs = [`版本:${version}`, `描述:${description}`, `需求ID:${tapdIdList}`, `简易描述:${tapdContents}`];

    if (target !== ReleaseEnv.Dev) {
      console.log(chalk.bgGreen.white(`\n ${releaseTag} \n`));
      console.log(releaseMsgs.join("\n"));
    }

    const commandSync = (command) => {
      const stdout = execa.commandSync(command).stdout;
      if (!stdout) return;
      console.log(stdout);
    };

    // 合并代码分支
    console.log(`${chalk.bgGreen.white(" 代码合并 ")}\n`);
    commandSync(`git checkout ${target}`);
    commandSync(`git pull origin ${target}`);
    await execa("git", ["merge", source, "-m", `build:${releaseTag}`]);
    commandSync(`git status`);

    if (target === ReleaseEnv.Dev) {
      commandSync(`git push`);
      commandSync(`git checkout ${this.state.source}`);
      console.log(`${chalk.green("\n开发环境发布完成")}\n`);
      return;
    }

    console.log(`\n${chalk.bgGreen.white("标签新增")}\n`);
    await execa("git", ["tag", "-a", releaseTag, "-m", `${releaseMsgs.join("\n")}`]);
    commandSync(`git status`);
    console.log("\n");
    console.log(`\n标签:${releaseTag}`);

    if (target === ReleaseEnv.Prod || target === ReleaseEnv.Beta) {
      commandSync(`git push`);
      commandSync(`git push origin ${releaseTag}`);
      commandSync(`git checkout ${this.state.source}`);
      const str = target === ReleaseEnv.Prod ? "线上" : "灰度";
      console.log(`${chalk.green(`\n${str}环境发布标签:${releaseTag}，请到对应平台发布(https://optimus.737.com/)`)}\n`);
      if (target === ReleaseEnv.Prod) {
        const list = ["product", "sit", "develop"];
        list.forEach((branch) => {
          commandSync(`git checkout ${branch}`);
          commandSync(`git pull`);
          commandSync(`git merge ${this.state.source}`);
          commandSync(`git push`);
        });
        commandSync(`git checkout ${this.state.source}`);
        commandSync(`git push`);
      }
      return;
    }

    console.log(`\n${chalk.bgGreen.white("代码发布提示")}\n`);
    const sitTips = [
      "1.合并代码和新增标签完成，代码暂未推送到服务器",
      "2.如果需要请与相关人员确认后在推送代码到服务器",
    ];
    console.log(`${chalk.yellow(sitTips.join("\n"))}`);

    const { confirm } = await inquirer.prompt([
      {
        type: "list",
        name: "confirm",
        message: `确认没有问题直接推送到发布到服务器：`,
        choices: [
          { name: "确认无误直接发布", value: true },
          { name: "暂未确认停止发布", value: false },
        ],
      },
    ]);
    if (!confirm) return;
    commandSync(`git push`);
    commandSync(`git push origin ${releaseTag}`);
    commandSync(`git checkout ${this.state.source}`);
    console.log(`${chalk.green("\n代码发布完成")}\n`);
  }

  async run() {
    // 发布启动
    this.start();

    // 选择发布内容
    this.state = {
      source: await this.selectSourceBranch(),
      target: await this.selectTargetBranch(),
      get version() {
        return this.source.split("/").pop();
      },
    };

    // 开发环境直接发布
    if (this.state.target === ReleaseEnv.Dev) {
      await this.megreReleaseCode();
      process.exit();
    }

    // 发布内容确认
    const isRelease = await this.confirmSourceBranchCommits();

    // 发布内容错误停止发布
    if (!isRelease) return;

    // 合并代码进行发布
    await this.megreReleaseCode();

    //  退出程序
    process.exit();
  }
};
