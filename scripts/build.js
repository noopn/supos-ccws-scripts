const path = require("path");
const crypto = require("crypto");

const chalk = require("chalk");
const inquirer = require("inquirer");

const fse = require("fs-extra");
const webpack = require("webpack");
// const { InjectManifest } = require("workbox-webpack-plugin");

const TerserPlugin = require("terser-webpack-plugin");
const { merge } = require("webpack-merge");
const { glob } = require("glob");

const WebpackDependencyPlugin = require("../utils/webpackDependencyPlugin");
const baseConfig = require("../config/webpack.config");

const ora = require("ora");

const spinner = ora();

const mode = "production";

const {
  compareDependencies,
  analysisLockData,
  checkAppPath,
  getDefinedConfig,
} = require("../utils/common");

const diffDeps = compareDependencies();

if (diffDeps.length) {
  console.log();

  spinner.fail(
    "Please don't install the following packages, because these packages is supOS dependencies, \n  This may cause unexpected errors, you need to restore these dependencies to the following specified versions, \n  and Use strictly in accordance with the specified version of the documentation"
  );
  console.log();
  diffDeps.forEach(([depName, localVer, depVer]) =>
    console.log(
      `  ${depName}@${localVer} shouldn't install, ${depName}@${depVer} have been installed by CLI.`
    )
  );
  console.log();
  process.exit(0);
}

const basePath = path.resolve(process.cwd(), "src");

const isNoTrack =
  process.argv.includes("--notrack") ||
  !fse.pathExistsSync(path.resolve(process.cwd(), "./.cache/ccws.lock"));

module.exports = build();

async function build() {
  let lockFileAndFolderMap = {};
  let lockFileMap = {};
  let lockFolderMap = {};
  let lockAppMap = {};
  let lockComponentMap = {};

  if (!isNoTrack) {
    ({
      lockFileAndFolderMap,
      lockFileMap,
      lockFolderMap,
      lockAppMap,
      lockComponentMap,
    } = await analysisLockData());
    const invalidPath = checkAppPath(lockAppMap);
    if (invalidPath.length) {
      console.log();

      spinner.fail(
        "You can't create App folder in src, please confirm these paths are right!"
      );

      console.log();

      invalidPath.forEach((p) => console.log(`  ${p}`));

      console.log();

      process.exit(0);
    }
  }

  const appPaths = glob.sync(path.join(basePath, "*"));

  const inquirerData = appPaths
    .map((appPath) => {
      const componentPaths = glob.sync(path.join(appPath, "./*"));

      let components = [];
      if (!isNoTrack) {
        const { appId, origin } = lockAppMap[appPath];

        components = componentPaths.map((componentPath) => {
          const componentTempData = {
            appId,
            origin,
            componentName: String(componentPath.split("/").slice(-1)),
            componentOutputPath: `${componentPath}/compiled`,
            id: componentPath,
          };
          Object.assign(componentTempData, {
            status: lockComponentMap[componentPath] ? "normal" : "new",
          });
          const fileAndFolderPaths = glob.sync(
            path.join(componentPath, "./**/**")
          );

          fileAndFolderPaths.map((fileOrFolderPath) => {
            const stat = fse.statSync(fileOrFolderPath);
            if (
              stat.isDirectory() &&
              !lockFolderMap[fileOrFolderPath] &&
              !lockFolderMap[fileOrFolderPath + "/"]
            ) {
              Object.assign(componentTempData, {
                status: componentTempData.status == "new" ? "new" : "update",
              });
            } else if (stat.isFile()) {
              const content = fse.readFileSync(fileOrFolderPath);
              const hash = crypto
                .createHash("sha256")
                .update(content)
                .setEncoding("hex")
                .digest("hex");

              if (
                !lockFileMap[fileOrFolderPath] ||
                lockFileMap[fileOrFolderPath].hash !== hash
              ) {
                Object.assign(componentTempData, {
                  status: componentTempData.status == "new" ? "new" : "update",
                });
              }

              // const regPath = `${componentPath}/source/index`.replace(
              //     /(\(|\))/gi,
              //     (m) => `\\${m}`
              //   );

              //   if (new RegExp(regPath).test(fileOrFolderPath)) {
              //     Object.assign(componentTempData, {
              //       componentEntryPath: fileOrFolderPath,
              //     });
              //   }
              // 路径中不能有特殊字符
              if (
                new RegExp(`${componentPath}/source/index`).test(
                  fileOrFolderPath
                )
              ) {
                Object.assign(componentTempData, {
                  componentEntryPath: fileOrFolderPath,
                });
              }
            }
          });
          return componentTempData;
        });
      } else {
        components = componentPaths.map((componentPath) => {
          const componentTempData = {
            appId: path.basename(appPath),
            componentName: path.basename(componentPath),
            componentEntryPath: path.resolve(componentPath, "source"),
            componentOutputPath: path.resolve(componentPath, "compiled"),
            id: componentPath,
          };

          return componentTempData;
        });
      }

      return {
        appName: String(appPath.split("/").slice(-1)),
        components: components.filter(
          (component) => component.status !== "normal"
        ),
      };
    })
    .filter((app) => app.components.length);

  if (!inquirerData.length) {
    spinner.succeed(
      chalk.hex("#29ABE2")("Work folder is clean, nothing need to push!")
    );
    process.exit(0);
  }

  const choices = await inquirer.prompt([
    {
      type: "checkbox",
      message: "Select the components you want to build.",
      name: "components",
      choices: inquirerData
        .map((app) => [
          new inquirer.Separator(`💡 ${app.appName}`),
          app.components.map((component) => [
            {
              name: `${component.componentName} ${
                component.status == "new" ? "🔥" : "🆙"
              }`,
              value: component,
            },
          ]),
        ])
        .flat(Infinity),
      validate(answer) {
        if (answer.length < 1) {
          return "You must choose at least one component.";
        }

        return true;
      },
    },
  ]);

  choices.components.forEach((component) => {
    if (component.componentEntryPath) return;
    console.log(
      chalk.hex("#cb3837")("error"),
      `Your component [${component.componentName}] don't have entry file, please check it!`
    );
    process.exit(0);
  });
  const componentNeedToSync = choices.components;

  for (let component of componentNeedToSync) {
    spinner.stop();

    const plugins = [
      new WebpackDependencyPlugin(),
      // new InjectManifest({
      //   swSrc: path.resolve(__dirname, "../config/service-worker.js"),
      //   swDest: "service-worker.js",
      //   maximumFileSizeToCacheInBytes: 10 * 1024 * 1024,
      // }),
    ];
    const defineConfig = await getDefinedConfig(component.id);

    if (defineConfig) {
      plugins.push(new webpack.DefinePlugin(defineConfig));
    }

    spinner.start(chalk.hex("#e4e4e4")(`Run build compiler.`));

    let webpackConfig = merge(baseConfig(mode), {
      entry: component.componentEntryPath,
      output: {
        filename: "index.js",
        path: component.componentOutputPath,
        libraryTarget: "commonjs",
        publicPath: `/resource/${component.appId}/extensions/${component.componentName}/compiled/`,
        clean: true,
      },
      mode,
      optimization: {
        minimize: true,
        minimizer: [
          new TerserPlugin({
            parallel: true,
            extractComments: false,
            terserOptions: {
              compress: true,
            },
          }),
        ],
        // 因为组件打包的格式为commonjs, chunks不能通过script加载
        // 只允许通过 import 动态引入实现 split chunk
        // splitChunks: {},
      },
      externals: {
        react: "commonjs2 react",
        lodash: "commonjs2 lodash",
        moment: "commonjs2 moment",
        antd: "commonjs2 antd",
        WebView: "commonjs2 WebView",
      },
      plugins,
    });

    let webpackOverwrite;
    try {
      webpackOverwrite = require(path.join(
        component.id,
        "webpack.overwrite.js"
      ));
    } catch {}

    if (webpackOverwrite && typeof webpackOverwrite === "function") {
      webpackConfig = webpackOverwrite(webpackConfig) || webpackConfig;
    }

    await new Promise((resolve, reject) => {
      const compiler = webpack(webpackConfig);
      compiler.run((err, stats) => {
        spinner.stop();

        console.log(
          stats.toString({
            chunks: false,
            colors: true,
          })
        );
        if (stats.hasErrors()) {
          spinner.stop();

          process.exit(1);
        }

        spinner.succeed(chalk.hex("#e4e4e4")("Compiler succeed!"));
        resolve();
      });
    });
  }

  return {
    componentNeedToSync,
    lockFileAndFolderMap,
    lockFileMap,
    lockFolderMap,
    lockAppMap,
    lockComponentMap,
  };
}

process.on("unhandledRejection", (err) => {
  throw err;
});
