const path = require("node:path");
const fs = require("node:fs");

const got = require("got");
const chalk = require("chalk");
const FormData = require("form-data");

let instance = got;

let options;

let spinner;

const initService = async (serviceOptions) => {
  const defaultGotOptions = {
    prefixUrl: serviceOptions.origin.endsWith("/")
      ? serviceOptions.origin
      : serviceOptions.origin + "/",
    responseType: "json",
    retry: { limit: 2, methods: ["GET", "POST", "PUT"] },
    https: {
      rejectUnauthorized: false,
    },
  };
  instance = got.extend(defaultGotOptions);

  const loginRes = await login(serviceOptions);

  options = {
    ...serviceOptions,
    ...loginRes,
  };

  instance = got.extend({
    ...defaultGotOptions,
    headers: {
      Authorization: `Bearer ${options.ticket}`,
    },
  });

  return loginRes;
};

const login = async ({ password, username, forceLogin }) => {
  const loginMsg = await instance
    .post("inter-api/auth/login", {
      json: {
        autoLogin: false,
        clientId: "ms-content-sample",
        password,
        userName: username,
        forceLogin,
      },
    })
    .json()
    .catch((err) => {
      const { body } = err.response;

      spinner.fail("Establish connection fail!");
      console.log(body);
      console.log();

      process.exit(0);
    });

  if (loginMsg.kickoutMsg) {
    spinner.fail("Establish connection fail!");

    console.log(
      "超出管理员用户登陆最大限制数10, 请在用户安全管理/在线用户中，清除不需要的管理员登陆信息, 或将 ccws.config.json 中 forceLogin 配置为true。"
    );
    console.log();
    process.exit(0);
  }

  return loginMsg;
};

const fetchPersonInfo = () => {
  return instance.get("inter-api/auth/v1/currentuser").json();
};

const logout = async () =>
  await instance.put("inter-api/auth/logout").catch((err) => {
    console.log(err.response);
  });

const fetchAppList = async () =>
  await instance.get("api/app/manager?sortType=2&sortFiled=createTime").json();

const fetchFolders = async (searchPath, app) =>
  await instance
    .get(
      `api/app/resource/folder?path=${encodeURIComponent(searchPath)}&appId=${
        app.appId
      }`
    )
    .json();

const fetchFiles = async (searchPath, app) =>
  await instance
    .get(
      `api/app/resource/file?path=${encodeURIComponent(searchPath)}&appId=${
        app.appId
      }&current=1&pageSize=1000`
    )
    .json();

const fetchVersion = async () => {
  const { majorVersion: version } = await instance
    .get("api/config/version")
    .json();
  return version;
};

const createFolder = async (folderInfo) => {
  return await instance
    .post("api/app/resource/folder", {
      json: {
        appId: folderInfo.appId,
        folderName: folderInfo.folderName,
        path: folderInfo.parentPath,
      },
    })
    .json()
    .catch((err) => {
      const { body } = err.response;

      if (body.code !== "600001") {
        spinner.fail(`文件夹创建错误 [${folderInfo.path}]`);

        console.log(`  ${JSON.stringify(body)}`);
      }
      process.exit(1);
    });
};

const createFile = async (fileInfo) => {
  const form = new FormData();
  form.append("appId", fileInfo.appId);
  form.append("path", fileInfo.parentPath);
  form.append(
    "file",
    fs.createReadStream(fileInfo.localFilePath),
    path.basename(fileInfo.localFilePath)
  );
  return await instance.post("api/app/manager/uploadResource", { body: form });
};
const requestStream = (url) =>
  instance.stream(url.startsWith("/") ? url.substring(1) : url);

module.exports = {
  login,
  logout,
  fetchAppList,
  fetchFolders,
  fetchFiles,
  requestStream,
  createFolder,
  createFile,
  fetchVersion,
  initService,
  fetchPersonInfo,
};
