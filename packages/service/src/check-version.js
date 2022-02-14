const path = require("path");
const execa = require("execa");
const inquirer = require("inquirer");
const semver = require("semver");
const chalk = require("chalk");
const { table } = require("table");
const allList = [
  "nebula-ui",
  "@nebula/access",
  "@nebula/alioss",
  "@nebula/eslint-plugin",
  "@nebula/gray",
  "@nebula/http",
  "@nebula/icons",
  "@nebula/service",
  "@nebula/tinymce",
  "@nebula/vite",
];

/*
 *  版本检测更新规则
 *  1.本地packageVersion版本为正式版，检测远程正式版是否有最新版本，更新到远程最新正式版本。
 *  2.本地packageVersion版本为内测版，检测远程正式版和内测版是否有最新版本，如内测版本有对应正式版本，则更新到正式版本，否则更新到远程最新内测版本。
 *
 */

module.exports = class NebulaVersion {
  constructor() {
    // "nebula-ui"最新版本
    this.latestVersion = "";
    // "nebula-ui" next 最新版本
    this.nextVersion = "";
    // 需要更新到的版本
    this.updateVersion = "";
  }

  // 获取已安装的包列表
  getPkgList() {
    const pkgPath = path.resolve(process.cwd(), "package.json");
    const json = require(pkgPath);
    const dep = json.dependencies;
    const devDep = json.devDependencies;
    let list = [];
    allList.forEach((pkg) => {
      if (dep[pkg] || devDep[pkg]) {
        const version = dep[pkg] || devDep[pkg];
        const type = dep[pkg] ? "dependencies" : "devDependencies";
        const code = dep[pkg] ? "--save" : "--save-dev";
        const packageVersion = semver.clean(version.replace("^", ""));
        const moduleVersion = this.getModuleVersion(pkg);
        list.push({
          name: pkg,
          packageVersion: packageVersion,
          moduleVersion: moduleVersion,
          type: type,
          code: code,
          update: false,
        });
      }
    });
    return this.getVersion(list);
  }

  // 获取已安装的module版本号
  getModuleVersion(pkg) {
    const pkgUrl = path.resolve(`${process.cwd()}/node_modules/${pkg}/`, `package.json`);
    let pkgJson = "";
    let moduleVersion = "";
    try {
      pkgJson = require(pkgUrl);
      moduleVersion = pkgJson ? pkgJson.version : "";
    } catch (e) {
      e;
    }
    return moduleVersion;
  }

  // 获取nebula-ui各版本
  getVersion(list) {
    this.latestVersion = execa.commandSync(`npm view nebula-ui version`).stdout;
    this.nextVersion = execa.commandSync(`npm view nebula-ui@next version`).stdout;
    const result = list.filter((v) => v.packageVersion.indexOf("-") > -1);
    if (result.length && this.compareVersion(this.latestVersion, this.nextVersion) === 0) {
      this.updateVersion = this.nextVersion;
    } else {
      this.updateVersion = this.latestVersion;
    }
    const pkgList = Array.from(list, (v) => {
      if (v.moduleVersion !== this.updateVersion || v.packageVersion !== this.updateVersion) v.update = true;
      return v;
    });
    return pkgList;
  }

  // 版本比较
  compareVersion(version1, version2) {
    // 返回结果 -1对比版本不存在 2-大于 1-等于 0-小于
    const formatVer1 = formatVersion(version1);
    const formatVer2 = formatVersion(version2);
    if (!formatVer1 || !formatVer2) return -1;

    let arrVer1 = formatVer1.split(".");
    let arrVer2 = formatVer2.split(".");
    let max = arrVer1.length > arrVer2.length ? arrVer1.length : arrVer2.length;
    let newVer1 = addArr(arrVer1, max);
    let newVer2 = addArr(arrVer2, max);
    for (let j = 0; j < max; j++) {
      if (newVer1[j] > newVer2[j]) return 2;
      if (newVer1[j] < newVer2[j]) return 0;
      if (newVer1[j] == newVer2[j] && j == max - 1) return 1;
    }
    return -1;

    function formatVersion(version) {
      return version.indexOf("-") > -1
        ? version
            .split("-")[0]
            .toString()
            .replace(/[^0-9.]/g, "")
        : version.toString().replace(/[^0-9.]/g, "");
    }

    // 补全为长度一样的数组
    function addArr(arr, num) {
      let newArr = [];
      for (let i = 0; i < num; i++) {
        let val = arr[i] ? Number(arr[i]) : 0;
        newArr.push(val);
      }
      return newArr;
    }
  }

  // 确认是否更新
  async confirmUpdate() {
    const { confirm } = await inquirer.prompt([
      {
        type: "list",
        name: "confirm",
        message: "标红依赖本地版本与最新版本不一致，是否需要更新到最新版本？",
        choices: [
          { name: "是", value: true },
          { name: "否", value: false },
        ],
      },
    ]);
    return confirm;
  }

  // 输入指定版本号
  async inputVersion() {
    const { version } = await inquirer.prompt([
      {
        type: "input",
        name: "version",
        message: "请输入指定版本号",
        default: this.latestVersion,
        validate: function (val) {
          if (/^\d+\.\d+\.\d+/.test(val)) return true;
          return "请输入有效版本号";
        },
      },
    ]);
    return version;
  }

  // 选择更新的版本
  async selectVersion() {
    const envs = [
      { name: `正式版 (lastest: ${this.latestVersion})`, value: 1 },
      { name: `内测版 (next: ${this.nextVersion})`, value: 2 },
      { name: "自定义版本 (custom)", value: 3 },
    ];

    const { target } = await inquirer.prompt([
      {
        type: "list",
        name: "target",
        message: "请选择需要更新的版本：",
        choices: envs,
      },
    ]);

    if (target === 1) {
      return this.latestVersion;
    } else if (target === 2) {
      return this.nextVersion;
    } else {
      return await this.inputVersion();
    }
  }

  // 批量安装依赖
  async installAllPackage(list, version) {
    let depList = [];
    let devDepList = [];
    list.forEach((v) => {
      if (v.type === "dependencies") depList.push(v);
      if (v.type === "devDependencies") devDepList.push(v);
    });
    if (depList.length) {
      const depName = Array.from(depList, (v) => v.name);
      await this.installPackage(depName, version, "--save");
    }
    if (devDepList.length) {
      const devDepName = Array.from(devDepList, (v) => v.name);
      await this.installPackage(devDepName, version, "--save-dev");
    }
  }

  // 安装依赖
  async installPackage(name, version, code) {
    console.log("---------------------------------------");
    const list = Array.isArray(name) ? Array.from(name, (v) => `${v}@${version}`) : [`${name}@${version}`];

    console.log(chalk.yellow(`开始安装  ${list.join(" ")}`));
    await execa("npm", ["install", ...list, `${code}`], {
      stdio: "inherit",
    });
    console.log(chalk.green(`完成安装  ${list.join(" ")}`));
  }

  // 表格输出
  outPutTable(data, version) {
    const versionName = version === this.nextVersion ? "NextVersion" : "LatestVersion";
    const preset = [
      chalk.bold("Name"),
      chalk.bold("Type"),
      chalk.bold("ModuleVersion"),
      chalk.bold("PackageVersion"),
      chalk.bold(versionName),
    ];
    const dataList = Array.from(data, (item) => {
      return [
        item.update ? chalk.red(item.name) : chalk.green(item.name),
        item.type,
        item.moduleVersion,
        item.packageVersion,
        chalk.yellow(version),
      ];
    });
    console.log(table([preset, ...dataList]));
  }

  // 安装需要更新的依赖
  async updateInstallPackage() {
    const pkgList = this.getPkgList();
    const updateList = pkgList.filter((v) => v.update);
    this.outPutTable(pkgList, this.updateVersion);
    if (updateList.length) {
      const update = await this.confirmUpdate();
      if (update) await this.installAllPackage(updateList, this.updateVersion);
    }
  }

  // 判断nebula-mobile是否需要更新
  async mobileUiUpdate() {
    const pkgPath = path.resolve(process.cwd(), "package.json");
    const json = require(pkgPath);
    const dep = json.dependencies;
    const version = dep["nebula-mobile"];
    if (!version) return;
    const packageVersion = semver.clean(version.replace("^", ""));
    const moduleVersion = this.getModuleVersion("nebula-mobile");
    // 获取"nebula-mobile"远程最新版本
    const stdout = execa.commandSync(`npm view nebula-mobile version`).stdout;
    const latestVersion = semver.clean(stdout); // 远程最新版本
    // const hasNew = semver.lt(packageVersion, latestVersion); // 是否有最新版本
    const isUpdate = packageVersion !== latestVersion || moduleVersion !== latestVersion ? true : false;
    this.outPutTable(
      [
        {
          name: "nebula-mobile",
          packageVersion: packageVersion,
          moduleVersion: moduleVersion,
          type: "dependencies",
          update: isUpdate,
        },
      ],
      latestVersion,
    );
    if (isUpdate) {
      const update = await this.confirmUpdate();
      if (update) await this.installPackage("nebula-mobile", latestVersion, "--save");
    }
  }

  async run() {
    console.log(`\n${chalk.bgBlue.white(` Nebula Version Check Start `)}\n`);
    await this.updateInstallPackage();
    await this.mobileUiUpdate();
    console.log(`\n${chalk.bgBlue.white(` Nebula Version Check End `)}\n`);
  }

  async updated() {
    // 更新到指定版本
    console.log(`\n${chalk.bgBlue.white(` Nebula Version Update Start `)}\n`);
    const pkgList = this.getPkgList();
    this.outPutTable(pkgList, this.latestVersion);
    const version = await this.selectVersion();
    if (version) await this.installAllPackage(pkgList, version);
    console.log(`\n${chalk.bgBlue.white(` Nebula Version Update End `)}\n`);
  }
};
