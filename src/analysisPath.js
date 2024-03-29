const path = require("path");
const inquirer = require("inquirer");
const stream = require("stream");
const { promisify } = require("util");
const crypto = require("crypto");
const process = require("process");
const EventEmitter = require("events");
const readline = require("readline");
const fse = require("fs-extra");
const fs = require("fs/promises");
const chalk = require("chalk");
const ora = require("ora");

const spinner = ora();
const { LOCK_CACHE_PATH } = require("../config");

const {
  fetchAppList,
  fetchAppsFolder,
  fetchAppsFiles,
  requestStream,
} = require("../src/service");

const { dateFormat, convertPath } = require("./util");

const pipeline = promisify(stream.pipeline);

const cwd = convertPath(process.cwd());

EventEmitter.setMaxListeners(1000);

class FileFullStream extends stream.Transform {
  static of() {
    return new FileFullStream();
  }
  constructor() {
    super();
    this.bufferArray = [];
    this.size = 0;
  }
  _transform(chunk, enc, cb) {
    this.bufferArray.push(chunk);
    this.size += chunk.length;
    cb();
  }
  _flush(cb) {
    const buffer = Buffer.concat(this.bufferArray, this.size);
    this.push(buffer.toString());
    cb();
  }
}

class FileHashStream extends FileFullStream {
  static of(info) {
    return new FileHashStream(info);
  }
  constructor(info) {
    super();
    this.bufferArray = [];
    this.size = 0;
    this.info = info;
    this.lockStr = "";
  }
  _flush(cb) {
    const buffer = Buffer.concat(this.bufferArray, this.size);
    const hash = buffer.toString();
    this.lockStr += `<@id>${this.info.id}\n`;
    this.lockStr += `  <@hash>${hash}\n`;
    this.lockStr += `  <@path>${this.info.path}\n`;
    this.lockStr += `  <@fullPath>${this.info.fullPath}\n`;
    this.lockStr += `  <@localAppPath>${this.info.localAppPath}\n`;
    this.lockStr += `  <@localComponentPath>${this.info.localComponentPath}\n`;
    this.lockStr += `  <@localFileFolder>${this.info.localFileFolder}\n`;
    this.lockStr += `  <@localFilePath>${this.info.localFilePath}\n`;
    this.lockStr += `  <@appId>${this.info.appId}\n`;
    this.lockStr += `  <@type>${this.info.type}\n`;
    this.lockStr += `  <@endWithSlash>${this.info.endWithSlash}\n`;
    this.lockStr += `\n`;
    this.push(this.lockStr);
    cb();
  }
}

const loopAnalysisCustomComponent = async (app, folderList) => {
  if (!folderList || !folderList.length) return;

  await Promise.all(
    folderList.map(async (folder) => {
      let endWithSlash = false;
      if (folder.fullPath.endsWith("/")) {
        folder.fullPath = folder.fullPath.slice(0, -1);
        endWithSlash = true;
      }
      if (folder.path.endsWith("/")) {
        folder.path = folder.path.slice(0, -1);
        endWithSlash = true;
      }

      const {
        body: { fileInfoList },
      } = await fetchAppsFiles(folder.path, app);
      const localAppPath = `${cwd}/src/${app.name}`;

      await Promise.all(
        (fileInfoList || []).map(async (file) => {
          let endWithSlash = false;
          if (file.fullPath.endsWith("/")) {
            file.fullPath = file.fullPath.slice(0, -1);
            endWithSlash = true;
          }
          if (file.path.endsWith("/")) {
            file.path = file.path.slice(0, -1);
            endWithSlash = true;
          }
          const pathOptions = path.parse(file.path);
          const exDir = pathOptions.dir.split("/extensions/")[1];

          const componentName = file.path.split("/")[2];
          const localComponentPath = `${localAppPath}/${componentName}`;
          const localFileFolder = `${localAppPath}/${exDir}`;

          fse.ensureDirSync(localFileFolder);

          spinner.start(
            chalk.hex("#e4e4e4")(
              `File: ${file.path} ${chalk.hex("#FFCD3A")(file.size)}`
            )
          );

          const localFilePath = `${localFileFolder}/${pathOptions.base}`;

          await pipeline(
            requestStream(file.fullPath),
            fse.createWriteStream(localFilePath, { flags: "a" })
          );

          const fileOptions = {
            fileName: file.fileName,
            fileType: file.fileType,
            fullPath: file.fullPath,
            lastModifiedDate: file.lastModifiedDate,
            path: file.path,
            localAppPath,
            localComponentPath,
            localFileFolder,
            localFilePath,
            id: localFilePath,
            appId: app.appId,
            type: "file",
            endWithSlash: Number(endWithSlash),
          };
          await pipeline(
            requestStream(file.fullPath),
            crypto.createHash("sha256").setEncoding("hex"),
            FileHashStream.of(fileOptions),
            fse.createWriteStream(LOCK_CACHE_PATH, { flags: "a" })
          );
          spinner.succeed(
            chalk.hex("#e4e4e4")(
              `${
                file.path +
                new Array(
                  70 - file.path.length < 0 ? 0 : 70 - file.path.length
                ).join(" ")
              }      ${chalk.hex("#eac154")(
                file.size + new Array(5 - file.size.length).join(" ")
              )}      ${chalk.hex("#00aca7")(
                dateFormat(file.lastModifiedDate)
              )}`
            )
          );
        })
      );

      const { folderName, fullPath, hasSub, path: folderPath } = folder;
      const baseLocalFolderPath = folderPath.split("/extensions/")[1];
      const localFolderPath = `${localAppPath}/${baseLocalFolderPath}`;
      const localComponentPath = `${localAppPath}/${baseLocalFolderPath
        .split("/")
        .slice(0, 2)
        .join("/")}`;
      let folderLockData = "";
      folderLockData += `<@id>${localFolderPath}\n`;
      folderLockData += `  <@folderName>${folderName}\n`;
      folderLockData += `  <@hasSub>${hasSub}\n`;
      folderLockData += `  <@path>${folderPath}\n`;
      folderLockData += `  <@fullPath>${fullPath}\n`;
      folderLockData += `  <@parentPath>${fullPath
        .split("/")
        .slice(0, -1)
        .join("/")}\n`;
      folderLockData += `  <@localFolderPath>${localFolderPath}\n`;
      folderLockData += `  <@localFolderParentPath>${localFolderPath
        .split("/")
        .slice(0, -1)
        .join("/")}\n`;
      folderLockData += `  <@localAppPath>${localAppPath}\n`;
      folderLockData += `  <@localComponentPath>${localComponentPath}\n`;
      folderLockData += `  <@appId>${app.appId}\n`;
      folderLockData += `  <@type>folder\n`;
      folderLockData += `  <@endWithSlash>${Number(endWithSlash)}\n`;
      folderLockData += `\n`;

      const folderLockStream = new stream.Readable();
      folderLockStream.push(folderLockData);
      folderLockStream.push(null);

      await pipeline(
        folderLockStream,
        fse.createWriteStream(LOCK_CACHE_PATH, { flags: "a" })
      );

      const {
        body: { folderInfoList },
      } = await fetchAppsFolder(folder.path, app);

      await loopAnalysisCustomComponent(app, folderInfoList);
    })
  );
};

const analysisPath = async () => {
  spinner.start(chalk.hex("#29ABE2")("Request app information."));

  let {
    body: { list },
  } = await fetchAppList();

  spinner.succeed(chalk.hex("#29ABE2")("Request app succeed!"));

  if (!list || !list.length) {
    spinner.info("Folder is clean, nothing need to sync.");
    process.exit(0);
  }

  const listIdMap = list.reduce((map, app) => {
    map[app.appId] = app;
    return map;
  }, {});

  list = await inquirer
    .prompt([
      {
        type: "checkbox",
        name: "syncList",
        message: "Choose apps you want to sync ?",
        choices: list.map((app) => ({
          name: app.name,
          value: app.appId,
        })),
      },
    ])
    .then(({ syncList }) => {
      return syncList.map((appId) => listIdMap[appId]);
    });

  if (!list || !list.length) {
    spinner.succeed(chalk.hex("#29ABE2")("Sync succeed!"));

    return false;
  }

  if (true) {
    // workFolder
    const srcPath = path.resolve(process.cwd(), "./src");
    await fse.remove(srcPath);
    await fse.ensureDir(srcPath);
  }

  await fse.remove(LOCK_CACHE_PATH);

  await Promise.all(
    list.map(async (app) => {
      const {
        body: { folderInfoList },
      } = await fetchAppsFolder("/extensions", app);
      await loopAnalysisCustomComponent(app, folderInfoList);
    })
  );

  spinner.succeed(chalk.hex("#29ABE2")("Sync all files succeed!"));
};

module.exports = analysisPath;
