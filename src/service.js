const path = require("path");
const fs = require("fs");

const chalk = require("chalk");
const ora = require("ora");
const FormData = require("form-data");

const config = require("../config");
const context = require("./context");

const request = require("../src/request");

const spinner = ora();

const {
  LOGIN_API,
  LOGOUT_API,
  APPS_LIST_API,
  APP_FLOOR_API,
  APP_FILES_API,
  APP_CREATE_FOLDER_API,
  APP_CREATE_FILE_API,
  VERSION_API,
} = config;

const login = async () => {
  options = context.get("options");

  spinner.start("Establish connection.");

  const { body: loginMsg } = await request("POST", LOGIN_API, {
    autoLogin: false,
    clientId: "ms-content-sample",
    password: options.password,
    userName: options.username,
  });

  if (loginMsg.kickoutMsg) {
    console.log("\n");
    console.log(
      chalk.black.bgHex("#cb3837")("connect error"),
      "超出管理员用户登陆最大限制数10, 请在用户安全管理/在线用户中，清除不需要的管理员登陆信息。"
    );
    process.exit(0);
  }
  context.set("loginMsg", loginMsg);
  spinner.succeed("Establish connection succeed!");
  return loginMsg;
};

const logout = async () => await request("PUT", LOGOUT_API);

const fetchAppList = async () => await request("GET", APPS_LIST_API);

const fetchAppsFolder = async (searchPath, app) =>
  await request(
    "GET",
    APP_FLOOR_API`${encodeURIComponent(searchPath)}${app.appId}`
  );

const fetchAppsFiles = async (searchPath, app) =>
  await request(
    "GET",
    APP_FILES_API`${encodeURIComponent(searchPath)}${app.appId}`
  );

const fetchVersion = async () => {
  let version;
  if (!version) {
    ({
      body: { majorVersion: version },
    } = await request("GET", VERSION_API));
    return version;
  }

  return Promise.resolve(version);
};

const createFolder = async (folderInfo) =>
  await request("POST", APP_CREATE_FOLDER_API, {
    appId: folderInfo.appId,
    folderName: folderInfo.path.split("/").slice(-1).join(""),
    path: folderInfo.path
      .split("/")
      .slice(0, -1)
      .join("/")
      .concat(Boolean(Number(folderInfo.endWithSlash)) ? "/" : ""),
  });

const createFile = async (fileInfo) => {
  const form = new FormData();
  form.append("appId", fileInfo.appId);
  form.append(
    "path",
    fileInfo.path
      .split("/")
      .slice(0, -1)
      .join("/")
      .concat(Boolean(Number(fileInfo.endWithSlash)) ? "/" : "")
  );
  form.append(
    "file",
    fs.createReadStream(fileInfo.localFilePath),
    path.basename(fileInfo.localFilePath)
  );
  return await request("POST", APP_CREATE_FILE_API, form);
};
const requestStream = request.stream;

module.exports = {
  login,
  logout,
  fetchAppList,
  fetchAppsFolder,
  fetchAppsFiles,
  requestStream,
  createFolder,
  createFile,
  fetchVersion,
};
