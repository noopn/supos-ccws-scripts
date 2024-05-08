const path = require("path");
const stream = require("stream");
const { promisify } = require("util");
const fse = require("fs-extra");
const chalk = require("chalk");
const validator = require("validator");
const inquirer = require("inquirer");
const crypto = require("crypto");
const ora = require("ora");
const moment = require("moment");
const spawn = require("cross-spawn");

const pipeline = promisify(stream.pipeline);
const spinner = ora();

const {
  initService,
  fetchAppList,
  fetchFolders,
  fetchFiles,
  requestStream,
  logout,
} = require("../utils/service");

const { path2UnixPath } = require("../utils/common");

const hasYarnCommand = spawn.sync("yarn", ["--version"]).stdout.toString();

const isNoTrack = process.argv.includes("--notrack");

const isInstallDependencies = !process.argv.includes("--ignore-dependencies");

const isUseYarn =
  fse.pathExistsSync(path.resolve(process.cwd(), "yarn.lock")) &&
  hasYarnCommand;

const configPath = path.resolve(process.cwd(), "ccws.config.json");
const configTemplatePath = path.resolve(
  __dirname,
  "../config/ccws.template.json"
);

if (!fse.pathExistsSync(configPath)) {
  const template = fse.readFileSync(configTemplatePath, "utf8");

  fse.writeFileSync(configPath, template, "utf8");

  console.log(
    chalk.hex(
      "#FFCD3A"
    )(`Config file doesn't exist, has been automatically created at project root.
Please check and configure`),
    chalk.black.bgHex("#FFCD3A")("ccws.config.json first,"),
    chalk.hex("#FFCD3A")("after that execute this command again")
  );

  process.exit(0);
}

let configs = fse.readFileSync(configPath, "utf8");

if (validator.isEmpty(configs, { ignore_whitespace: true })) {
  console.log(chalk.red("ccw.config.json is empty"));
  process.exit(1);
}

try {
  configs = JSON.parse(configs);

  if (!Array.isArray(configs)) throw new Error("expected format is array");
  configs.forEach((config) => {
    if (!config.origin || !config.project) {
      throw new Error("must have project name and origin path");
    }

    if (!config.username || !config.password) {
      throw new Error("must have username and password");
    }
    if (
      validator.trim(config.origin) !== config.origin ||
      validator.trim(config.project) !== config.project
    )
      throw new Error("some space in your config value, please check it!");

    if (!validator.isURL(config.origin)) throw new Error("origin is not a URL");
  });
} catch (err) {
  console.log();
  console.log(chalk.red("parser ccws.config.json error"));

  console.log(err.message);
  console.log();

  process.exit(1);
}

const choices = configs.map((config) => ({
  name: config.project,
  value: config,
}));

inquirer
  .prompt([
    {
      type: "list",
      name: "project",
      message: "What project do you want to sync ?",
      choices,
    },
    // {
    //   type: "input",
    //   message: "Enter username",
    //   name: "username",
    //   validate: async (password) => {
    //     if (!password) return "Username cannot be empty";
    //     return true;
    //   },
    // },
    // {
    //   type: "password",
    //   message: "Enter Password",
    //   name: "password",
    //   validate: async (password) => {
    //     if (!password) return "Password cannot be empty";
    //     return true;
    //   },
    // },
  ])
  .then((options) => {
    pull(options.project);
  });

const dependencies = {};

async function pull(options) {
  spinner.start(chalk.hex("#29ABE2")("Establish connection."));

  await initService({
    origin: options.origin,
    username: options.username,
    password: options.password,
    forceLogin: options.forceLogin === true ? true : false,
    spinner,
  });

  spinner.succeed("Establish connection succeed!");

  spinner.start(chalk.hex("#29ABE2")("Request app information."));

  const { list: appList } = await fetchAppList();

  if (!appList || !appList.length) {
    spinner.info("Don't have any Apps, nothing need to sync.");
    return;
  }

  spinner.succeed("Request app list succeed!");

  const appsMap = appList.reduce((map, app) => {
    map[app.appId] = app;
    return map;
  }, {});

  const selectedApps = await inquirer
    .prompt([
      {
        type: "checkbox",
        name: "syncList",
        message: "Choose apps you want to sync ?",
        choices: appList.map((app) => ({
          name: app.name,
          value: app.appId,
        })),
        validate: (selectedApps) => {
          if (!selectedApps.length) return "select at least one app";

          return true;
        },
      },
    ])
    .then(({ syncList }) => {
      return syncList.map((appId) => appsMap[appId]);
    });

  const workDir = path.resolve(process.cwd(), "./src");

  await promisify(fse.stat)(workDir)
    .then(async (res) => {
      return await inquirer
        .prompt([
          {
            type: "confirm",
            name: "initFolder",
            message:
              "The 'src' folder already exists, continuing will delete the folder. Do you want to continue?",
          },
        ])
        .then((answer) => {
          if (answer.initFolder) {
            fse.removeSync(workDir);
          } else {
            process.exit(0);
          }
        });
    })
    .catch(() => {})
    .finally(() => {
      fse.ensureDirSync(workDir);
    });

  const lockFilePath = path.resolve(__dirname, "../.cache/ccws.lock");
  if (fse.pathExistsSync(lockFilePath)) fse.removeSync(lockFilePath);
  fse.ensureFileSync(lockFilePath);

  const loopAnalysisComponent = async (app, folderList) => {
    if (!folderList || !folderList.length) return;

    return Promise.all(
      folderList.map(async (folder) => {
        const { folderName, fullPath, hasSub, path: folderPath } = folder;

        const localAppPath = path.resolve(process.cwd(), "src", app.name);
        const baseLocalFolderPath = folderPath.split("/extensions/")[1];

        const localFolderPath = path.join(localAppPath, baseLocalFolderPath);

        fse.ensureDirSync(localFolderPath);

        const localComponentPath = path.join(
          localAppPath,
          baseLocalFolderPath.split("/")[0]
        );

        if (!isNoTrack) {
          let folderLockData = "";
          folderLockData += `<@id>${path2UnixPath(localFolderPath)}\n`;
          folderLockData += `  <@folderName>${folderName}\n`;
          folderLockData += `  <@hasSub>${hasSub}\n`;
          folderLockData += `  <@path>${folderPath}\n`;
          folderLockData += `  <@fullPath>${fullPath}\n`;
          folderLockData += `  <@parentPath>${path2UnixPath(
            path.dirname(folderPath)
          )}\n`;
          folderLockData += `  <@localFolderPath>${path2UnixPath(
            localFolderPath
          )}\n`;
          folderLockData += `  <@localFolderParentPath>${path2UnixPath(
            localFolderPath.split(path.sep).slice(0, -1).join(path.sep)
          )}\n`;
          folderLockData += `  <@localAppPath>${path2UnixPath(localAppPath)}\n`;
          folderLockData += `  <@localComponentPath>${path2UnixPath(
            localComponentPath
          )}\n`;
          folderLockData += `  <@appId>${app.appId}\n`;
          folderLockData += `  <@type>folder\n`;
          // folderLockData += `  <@endWithSlash>${Number(endWithSlash)}\n`;
          folderLockData += `  <@origin>${options.origin}\n`;
          folderLockData += `\n`;

          fse.writeFileSync(lockFilePath, folderLockData, {
            flag: "a",
          });
        }

        const { fileInfoList } = await fetchFiles(folder.path, app);

        if (fileInfoList && fileInfoList.length) {
          await Promise.all(
            fileInfoList.map(async (file) => {
              spinner.start(
                chalk.hex("#e4e4e4")(
                  `File: ${file.path} ${chalk.hex("#FFCD3A")(file.size)}`
                )
              );
              const parsedPath = path.parse(file.path);

              const localFilePath = path.join(localFolderPath, parsedPath.base);

              const fileStream = requestStream(file.fullPath);

              await pipeline(fileStream, fse.createWriteStream(localFilePath));

              if (
                isInstallDependencies &&
                /compiled[\/\\]dependencies.json/.test(localFilePath)
              ) {
                collectDependencies(localFilePath);
              }

              if (!isNoTrack) {
                await pipeline(
                  fse.createReadStream(localFilePath),
                  crypto.createHash("sha256").setEncoding("hex"),
                  new stream.Transform({
                    construct(callback) {
                      this.buffer = [];
                      this.size = 0;
                      callback();
                    },
                    transform(chunk, enc, cb) {
                      this.buffer.push(chunk);
                      this.size = chunk.length;
                      cb();
                    },
                    flush(cb) {
                      const buffer = Buffer.concat(this.buffer, this.size);
                      const hash = buffer.toString();
                      let lockStr = "";
                      lockStr += `<@id>${path2UnixPath(localFilePath)}\n`;
                      lockStr += `  <@hash>${hash}\n`;
                      lockStr += `  <@path>${file.path}\n`;
                      lockStr += `  <@parentPath>${path.dirname(file.path)}\n`;
                      lockStr += `  <@fullPath>${file.fullPath}\n`;
                      lockStr += `  <@localAppPath>${path2UnixPath(
                        localAppPath
                      )}\n`;
                      lockStr += `  <@localComponentPath>${path2UnixPath(
                        localComponentPath
                      )}\n`;
                      lockStr += `  <@localFileFolder>${path2UnixPath(
                        localFolderPath
                      )}\n`;
                      lockStr += `  <@localFilePath>${path2UnixPath(
                        localFilePath
                      )}\n`;
                      lockStr += `  <@appId>${app.appId}\n`;
                      lockStr += `  <@type>file\n`;
                      // lockStr += `  <@endWithSlash>${fileOptions.endWithSlash}\n`;
                      lockStr += `  <@origin>${options.origin}\n`;
                      lockStr += `\n`;
                      this.push(lockStr);
                      cb();
                    },
                  }),
                  fse.createWriteStream(lockFilePath, { flags: "a" })
                );
              }

              spinner.succeed(
                chalk.hex("#e4e4e4")(
                  `${
                    file.path +
                    new Array(
                      70 - file.path.length < 0 ? 0 : 70 - file.path.length
                    ).join(" ")
                  }      ${chalk.hex("#eac154")(
                    file.size + new Array(8 - file.size.length).join(" ")
                  )}      ${chalk.hex("#00aca7")(
                    moment(+file.lastModifiedDate).format("YYYY-MM-DD HH:mm:ss")
                  )}`
                )
              );
            })
          );
        }

        const { folderInfoList } = await fetchFolders(folder.path, app);

        await loopAnalysisComponent(app, folderInfoList);
      })
    );
  };

  await Promise.all(
    selectedApps.map(async (app) => {
      const { folderInfoList } = await fetchFolders("/extensions", app);
      await loopAnalysisComponent(app, folderInfoList);
    })
  );
  isInstallDependencies && installDependencies();
  await logout();
}

function collectDependencies(localFilePath) {
  const content = fse.readFileSync(localFilePath);
  const json = JSON.parse(content);
  try {
    for (let [name, version] of Object.entries(json)) {
      if (dependencies[name] && dependencies[name] !== version) {
        spinner.warn(
          `same package [${name}] in dependencies have different version [${dependencies[name]},version], will replace with the last find.`
        );
      }
      if (!dependencies[name]) {
        dependencies[name] = version;
      }
    }
  } catch {
    spinner.warn(`analyze the file error at the path [${localFilePath}]`);
  }
}

function installDependencies() {
  if (!Object.keys(dependencies).length) return;

  let nodeArgs = [isUseYarn ? "add" : "install"];

  for (let [name, version] of Object.entries(dependencies)) {
    nodeArgs = nodeArgs.concat(`${name}@${version}`);
  }
  nodeArgs = nodeArgs.concat(["--save", "--loglevel", "warn"]);

  console.log();

  spawn.sync(isUseYarn ? "yarn" : "npm", nodeArgs, {
    stdio: "inherit",
  });
}

process.on("unhandledRejection", (err) => {
  throw err;
});
