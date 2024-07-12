import React from "react";

import { notification, message } from "antd";

import { default as supRequest } from "./request/index";
import { createClientSymbol } from "./client";
import { codeMessage, getServiceMessage } from "./constants";
import { getRemoteHeader } from "./utils";
// import { login } from 'root/devtool/_kits/autoLogin';

import getConfig from "./config";

function getLocalLanguage() {
  return "zh-cn";
}
/**
 * Requests a URL, returning a promise.
 *
 * @param  {string} url       The URL we want to request
 * @param  {object} [options] The options we want to pass to "fetch"
 * @return {object}           An object containing either "data" or "err"
 */
let invervalFunc = null;
let reviceUrl = null;

/* global ISBETA */
const AUTOLOGIN = false; // 自动登录

// 设置客户端标识
supRequest.setClientId("IDE_bizDesigner");

supRequest.defaults.withCredentials = false; // 跨域时不允许携带cookie信息
supRequest.defaults.validateStatus = () => {
  // 为了保持原request的处理逻辑不变, 返回的数据全部在resolve中处理.
  return true;
};

supRequest.interceptors.request.use((config) => {
  config.headers["Accept-Language"] = getLocalLanguage();

  if (localStorage.getItem("tenant")) {
    config.headers["X-Tenant-Id"] = localStorage.getItem("tenant");
  }

  // 版本校验
  const version = window["X-Supos-Version"];
  if (version) {
    config.headers["X-Supos-Version"] = version;
  }

  return config;
});

export default function request(
  url,
  options,
  isHiddenNote,
  isPassTicket = true,
  skipCodeVerify = false,
  remoteDebug = true
) {
  const newOptions = _.merge({}, options);
  newOptions.headers = newOptions.headers || {};

  // 当文件上传时设置 fetchType="file"
  if (
    (!newOptions.fetchType || newOptions.fetchType !== "file") &&
    (newOptions.method === "POST" ||
      newOptions.method === "PUT" ||
      newOptions.method === "GET" ||
      newOptions.method === "DELETE")
  ) {
    newOptions.headers = {
      Accept: "application/json",
      "Content-Type": "application/json; charset=utf-8",
      ...newOptions.headers,
    };
    newOptions.body = JSON.stringify(newOptions.body);
  }

  if (newOptions.fetchType === "file") {
    _.set(newOptions.headers, "Content-Type", "multipart/form-data");
  }

  const ticket = localStorage.getItem("ticket");
  if (ticket && isPassTicket) {
    newOptions.headers.Authorization = `Bearer ${ticket}`;
  }

  // 新增调试前缀 todo
  const remoteHeader = getRemoteHeader();
  if (remoteDebug && !_.isEmpty(remoteHeader)) {
    newOptions.headers = {
      ...newOptions.headers,
      ...remoteHeader,
    };
  }

  reviceUrl = newOptions;

  if (!_.isNil(newOptions.body)) {
    // 处理新老request参数字段不同的问题
    newOptions.data = newOptions.body;
  }

  if (newOptions.method !== "OPTIONS") {
    const result = {}; // 最终返回的结果
    return supRequest
      .request(_.assign({ url }, newOptions))
      .then((response) => {
        // 如果HTTP400以上的返回信息中有message，优先采用返回response的message，如果没有，则采用自定义的status状态信息
        if (response.status >= 400) {
          response.message =
            response.message ||
            codeMessage[response.status] ||
            response.statusText;
        }
        return response;
      })
      .then((response) => {
        const { status, message, data, headers } = response;
        result.code = status;
        result.message = message;

        // delete的时候没有返回信息 code==204 为删除成功
        if (
          (newOptions.method === "DELETE" || newOptions.method === "POST") &&
          status === 204
        ) {
          return {
            code: status,
          };
        }

        if (status < 400) {
          result.noNext = true;
        } else {
          result.noNext = false;
        }
        const contentType = _.get(headers, "content-type");
        // 兼容接口无数据返回的场景
        if (!contentType) return null;
        return data;
      })
      .then((response) => {
        const res = _.assign({}, result, response);
        if (result.noNext || skipCodeVerify) {
          return res;
        }
        const { dispatch } = window.COMPVIEW?.APPSTORE;
        if (+res.code === 401 || +res.status === 401) {
          if (AUTOLOGIN) console.log("开发环境不会自动登录");
          window.postMessage(
            {
              type: "logout",
            },
            "*"
          );
          return res;
        }
        // 如果返回403，后台正在还原文件，不可继续操作
        if (+res.code === 425) {
          const rUrl = `${
            getConfig().domain2
          }/api/config/system/restore/status`;
          // 还原状态URL
          if (!invervalFunc) {
            dispatch({
              type: "global/topLoadingShow",
              payload: {
                loading: true,
                tip:
                  res.message || getServiceMessage("common.systemMaintenance"),
              },
            });
            invervalFunc = setInterval(() => {
              checkBackup(rUrl, newOptions);
            }, 5000);
          }
          checkBackup(rUrl, newOptions);
          return res;
        }
        // 返回499, 版本不一致， 弹窗刷新页面
        if (+res.code === 499) {
          dispatch({
            type: "global/showVersionVerifyModal",
          });
        }
        // 演示版本暂时不出现右上角的错误提示框 zhangshunjin 2018-06-24 11:00  --- 出现 401.1, 401.2 登录时的码 wzd 2018-07-19
        if (
          Number(res.code) >= 400 &&
          Number(res.code) !== 401 &&
          Number(res.code) !== 499 &&
          !isHiddenNote
        ) {
          if (res.targetService) {
            notification.open({
              message: res.targetService,
              description: (
                <div>
                  <div style={{ margin: "5px 0", wordBreak: "break-all" }}>
                    {getServiceMessage("common.errorCode")}：{res.code}
                  </div>
                  <div style={{ wordBreak: "break-all" }}>
                    {getServiceMessage("common.errorMsg")}：
                    {res.message || response.error || ""}
                  </div>
                </div>
              ),
            });
          } else {
            notification.open({
              message: res.code,
              description:
                res.message ||
                response.error ||
                getServiceMessage("common.tryAfter"),
            });
          }
        }
        return res;
      })
      .catch(() => {
        return result;
      });
  }
}

window.addEventListener("message", (e) => {
  if (e.origin !== window.location.origin) {
    // 只接收当前origin的message
    return;
  }
  const { dispatch } = window.COMPVIEW?.APPSTORE || {};
  if (e.data === "backup") {
    const rUrl = `${getConfig().domain2}/api/config/system/restore/status`;
    // 还原状态URL
    if (!invervalFunc) {
      dispatch({
        type: "global/topLoadingShow",
        payload: {
          loading: true,
          tip: getServiceMessage("common.systemMaintenance"),
        },
      });
      invervalFunc = setInterval(() => {
        checkBackup(rUrl, reviceUrl);
      }, 5000);
    }
    checkBackup(rUrl, reviceUrl);
  } else if (e.data === "timeout") {
    // logoutAction({
    //   dispatch,
    //   redirectUri: window.location.pathname !== '/login' && window.location.hash !== '#/user/login' ? encodeURIComponent(window.location.href) : ''
    // });
  }
});

function checkBackup(url, newOptions) {
  const { dispatch } = window.COMPVIEW?.APPSTORE || {};
  supRequest.request(_.assign({ url }, newOptions)).then((response) => {
    const { data } = response;
    if (data && [2, 5, 6].includes(data.status)) {
      message.info({
        message: data.message,
      });
      dispatch({
        type: "global/topLoadingShow",
        payload: { loading: false },
      });
      clearInterval(invervalFunc);
      window.location.reload();
    }
  });
}

/**
 * 生成clientId
 * https://confluence.bluetron.cn/pages/viewpage.action?pageId=108201553
 */
export function getClientId() {
  return createClientSymbol("IDE_bizDesigner");
}

/**
 * 获取uoload组件请求头信息
 */
export function getUploadHeaders(extraHeaders) {
  return _.assign(
    {
      Authorization: `Bearer ${localStorage.getItem("ticket")}`,
      "Accept-Language": getLocalLanguage(),
      "X-Supos-Client": getClientId(),
    },
    extraHeaders
  );
}
