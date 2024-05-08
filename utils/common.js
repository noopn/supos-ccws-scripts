const path = require("node:path");
const fse = require("fs-extra");
const readline = require("readline");
const glob = require("glob");
const webpack = require("webpack");

const configPath = path.resolve(process.cwd(), "ccws.config.json");
const basePath = path.join(process.cwd(), "./src");

const uid = () =>
  Math.random()
    .toString(36)
    .substring(2, 10);

const path2UnixPath = (p) => {
  return p.split(path.sep).join("/");
};

const compareDependencies = () => {
  const depsPath = path.resolve(__dirname, "../package.json");
  const localDepsPath = path.resolve(process.cwd(), "package.json");
  const deps = require(depsPath).dependencies;
  const localDeps = require(localDepsPath).dependencies;

  const depsPackages = ["react", "react-dom", "lodash", "antd", "moment"];

  const depList = Object.keys(localDeps);

  return depList
    .map((dep) => {
      if (depsPackages.includes(dep)) {
        return [dep, localDeps[dep], deps[dep]];
      }
      return false;
    })
    .filter(Boolean);
};

const rl = (rlStream) =>
  readline.createInterface({
    input: rlStream,
    crlfDelay: Infinity,
  });

const analysisLockData = async () => {
  const lockFileAndFolderMap = {};
  const lockFileMap = {};
  const lockFolderMap = {};
  const lockAppMap = {};
  const lockComponentMap = {};
  const lockFileStream = fse.createReadStream(
    path.resolve(__dirname, "../.cache/ccws.lock")
  );

  let temp = {};
  for await (const line of rl(lockFileStream)) {
    const match = line.match(/<@(.+)>(.+)/);
    if (!match) {
      temp = {};
      continue;
    }
    if (match[1] === "id") {
      lockFileAndFolderMap[match[2]] = temp;
    }
    if (match[1] === "type" && match[2] === "folder")
      lockFolderMap[temp.id] = temp;
    if (match[1] === "type" && match[2] === "file") lockFileMap[temp.id] = temp;
    temp[match[1]] = match[2];
  }

  Object.values(lockFileAndFolderMap).forEach((item) => {
    if (!lockAppMap[item.localAppPath])
      lockAppMap[item.localAppPath] = {
        path: item.localAppPath,
        appId: item.appId,
        origin: item.origin,
      };

    if (!lockComponentMap[item.localComponentPath])
      lockComponentMap[item.localComponentPath] = {
        path: item.localComponentPath,
      };
  });

  return {
    lockFileAndFolderMap,
    lockFileMap,
    lockFolderMap,
    lockAppMap,
    lockComponentMap,
  };
};

const checkAppPath = (appPathMap) => {
  const appPaths = glob.sync(path.join(basePath, "*"));

  const arr = [];

  appPaths.forEach((appPath) => {
    if (!appPathMap[appPath]) {
      arr.push(appPath);
    }
  });

  return arr;
};

const analysisWorkFolder = async (isGuest) => {
  const appPaths = glob.sync(path.join(basePath, "*"));

  let lockFolderMap = {};
  if (!isGuest) {
    ({ lockFolderMap } = await analysisLockData());
  }

  const componentsMap = new Map();

  const appList = appPaths.map((appPath) => {
    const componentPaths = glob.sync(path.join(appPath, "*"));
    const appName = path.basename(appPath);

    const componentsList = componentPaths.map((componentPath) => {
      const componentName = path.basename(componentPath);
      const componentEntryPath = path2UnixPath(
        path.join(componentPath, "./source")
      );
      const componentOutputPath = path2UnixPath(
        path.join(componentPath, "./compiled")
      );

      let options = {};
      if (!isGuest) {
        const configs = require(configPath);

        const component = lockFolderMap[componentPath];

        if (
          !component ||
          !(options = configs.find(
            (config) => config.origin === component.origin
          ))
        ) {
          console.log();
          console.log(
            "can't match project config in ccws.config.json in you project root"
          );
          process.exit(1);
        }
      }

      const compObj = {
        id: uid(),
        componentName,
        componentPath,
        componentEntryPath,
        componentOutputPath,
        ...options,
      };

      componentsMap.set(compObj.id, compObj);

      return compObj;
    });
    return {
      appName,
      componentsList,
    };
  });
  return {
    appList,
    componentsMap,
  };
};

const getDefinedConfig = async (componentPath) => {
  const definePath = path.join(componentPath, "define.js");
  if (!fse.pathExistsSync(definePath)) return;

  let defineConfig = require(definePath);
  if (typeof defineConfig === "function") {
    defineConfig = await defineConfig();
    return defineConfig;
  }
};

module.exports = {
  path2UnixPath,
  compareDependencies,
  analysisLockData,
  checkAppPath,
  analysisWorkFolder,
  getDefinedConfig,
};
