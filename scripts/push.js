const path = require("node:path");
const crypto = require("node:crypto");
const stream = require("node:stream");
const { promisify } = require("node:util");

const { glob } = require("glob");
const ora = require("ora");
const fse = require("fs-extra");
const chalk = require("chalk");

const spinner = ora();
const pipeline = promisify(stream.pipeline);

const {
  initService,
  fetchVersion,
  logout,
  createFolder,
  createFile,
} = require("../utils/service");

const { path2UnixPath } = require("../utils/common");

const lockFilePath = path.resolve(process.cwd(), "./.cache/ccws.lock");

const hasLockFile = fse.pathExistsSync(lockFilePath);

if (!hasLockFile) {
  console.log();
  spinner.fail("No lock file detected, please run 'npm run sup:pull' first");
  console.log();
  process.exit(0);
}

push();

async function push() {
  const {
    componentNeedToSync,
    lockFileAndFolderMap,
    lockFileMap,
    lockFolderMap,
  } = await require("./build");

  const basePath = path2UnixPath(path.resolve(process.cwd(), "src"));

  const configPath = path.resolve(process.cwd(), "ccws.config.json");

  if (!fse.pathExistsSync(configPath)) {
    spinner.fail(
      "run push fail, can't find ccws.config.json in you project root"
    );
    process.exit(1);
  }

  const configs = require(configPath);

  const options = configs.find(
    (config) => config.origin === componentNeedToSync[0].origin
  );

  if (!options) {
    spinner.fail(
      "can't match project config in ccws.config.json in you project root"
    );
    process.exit(1);
  }

  spinner.start(chalk.hex("#29ABE2")("Establish connection."));

  await initService({
    origin: options.origin,
    username: options.username,
    password: options.password,
    forceLogin: options.forceLogin === true ? true : false,
    spinner,
  });
  spinner.succeed("Establish connection succeed!");

  const version = await fetchVersion();

  const versionMatch = version.match(/^[vV]*(\d+)/);

  const endWithSlash = versionMatch ? (versionMatch[1] >= 4 ? 1 : 0) : 1;

  const syncList = [];

  componentNeedToSync.map((component) => {
    const syncFilePath = glob.sync(path.join(component.id, "/**/**"));

    syncFilePath.map((fileOrFolderPath) => {
      const stat = fse.statSync(fileOrFolderPath);

      const relativeAppPath = fileOrFolderPath.split(basePath)[1];

      const [_, appName, ...restPath] = relativeAppPath.split("/");

      if (
        stat.isDirectory() &&
        !lockFolderMap[fileOrFolderPath] &&
        !lockFolderMap[fileOrFolderPath + "/"]
      ) {
        const folderInfo = {
          id: fileOrFolderPath,
          folderName: path.basename(fileOrFolderPath),
          hasSub: !!glob.sync(path.join(fileOrFolderPath, "*")).length,
          path: path2UnixPath(
            path.join(
              ...["/extensions"]
                .concat(restPath)
                .concat(endWithSlash ? "/" : "")
            )
          ),
          fullPath: path2UnixPath(
            path.join(
              ...["/resource", component.appId, "extensions"]
                .concat(restPath)
                .concat(endWithSlash ? "/" : "")
            )
          ),
          parentPath: path2UnixPath(
            path.join(
              ...["/extensions"]
                .concat(restPath.slice(0, -1))
                .concat(endWithSlash ? "/" : "")
            )
          ),
          localFolderPath: fileOrFolderPath,
          localFolderParentPath: path2UnixPath(
            path.join(...[basePath, appName].concat(restPath.slice(0, -1)))
          ),
          localAppPath: path2UnixPath(path.join(basePath, appName)),
          localComponentPath: path2UnixPath(
            path.join(basePath, appName, component.componentName)
          ),
          endWithSlash,
          appId: component.appId,
          type: "folder",
          origin: options.origin,
        };

        if (lockFolderMap[folderInfo.localFolderParentPath])
          lockFileAndFolderMap[folderInfo.localFolderParentPath].hasSub = true;

        lockFileAndFolderMap[fileOrFolderPath] = folderInfo;

        syncList.push({
          ...folderInfo,
          endWithSlash,
          status: "new",
        });
      } else if (stat.isFile()) {
        const hash = crypto
          .createHash("sha256")
          .update(fse.readFileSync(fileOrFolderPath))
          .setEncoding("hex")
          .digest("hex");

        if (!lockFileMap[fileOrFolderPath]) {
          const fileInfo = {
            id: fileOrFolderPath,
            hash,
            path: path2UnixPath(path.join(...["/extensions"].concat(restPath))),
            parentPath: path2UnixPath(
              path.join(...["/extensions"].concat(restPath.slice(0, -1)))
            ),
            fullPath: path2UnixPath(
              path.join(
                ...["/resource", component.appId, "extensions"].concat(restPath)
              )
            ),
            localAppPath: path2UnixPath(path.join(basePath, appName)),
            localComponentPath: path2UnixPath(
              path.join(basePath, appName, component.componentName)
            ),
            localFileFolder: path2UnixPath(
              path.join(...[basePath, appName].concat(restPath.slice(0, -1)))
            ),
            localFilePath: fileOrFolderPath,
            appId: component.appId,
            type: "file",
            origin: options.origin,
          };

          lockFileAndFolderMap[fileOrFolderPath] = fileInfo;

          syncList.push({
            ...fileInfo,
            endWithSlash: 0,
            status: "new",
          });
        } else if (hash !== lockFileAndFolderMap[fileOrFolderPath].hash) {
          lockFileAndFolderMap[fileOrFolderPath].hash = hash;
          syncList.push({
            ...lockFileAndFolderMap[fileOrFolderPath],
            status: "update",
          });
        }
      }
    });
  });

  for (let item of syncList) {
    if (item.type === "folder") {
      spinner.start(chalk.hex("#e4e4e4")(`Folder: ${item.path}`));
      await createFolder(item);
    } else if (item.type === "file") {
      spinner.start(chalk.hex("#e4e4e4")(`File: ${item.path}`));
      await createFile(item);
    }
    spinner.succeed(chalk.hex("#e4e4e4")(`${item.path}`));
  }

  const folderLockStream = new stream.Readable();

  Object.entries(lockFileAndFolderMap).forEach(([id, values]) => {
    let folderLockData = "";
    folderLockData += `<@id>${id}\n`;
    Object.entries(values).forEach(([key, value]) => {
      if (key === "id") return;
      folderLockData += `  <@${key}>${value}\n`;
    });
    folderLockData += `\n`;

    folderLockStream.push(folderLockData);
  });
  folderLockStream.push(null);

  await fse.remove(lockFilePath);

  await pipeline(
    folderLockStream,
    fse.createWriteStream(lockFilePath, { flags: "a" })
  );

  spinner.succeed(chalk.hex("#29ABE2")("Sync all files succeed!"));

  await logout();
}

process.on("unhandledRejection", (err) => {
  throw err;
});
