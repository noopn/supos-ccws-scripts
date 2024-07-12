import { message, notification } from "antd";
import { createClientSymbol } from "../client";
import { I18N_MESSAGE } from "./const";

/* eslint-disable */
var toString = Object.prototype.toString;

const language = localStorage.getItem("language");
const contextLocale = I18N_MESSAGE[language] || I18N_MESSAGE["zh-cn"];

function isArray(val) {
  return toString.call(val) === "[object Array]";
}

function isDate(val) {
  return toString.call(val) === "[object Date]";
}

function isObject(val) {
  return val !== null && typeof val === "object";
}

function forEach(obj, fn) {
  // Don't bother if no value provided
  if (obj === null || typeof obj === "undefined") {
    return;
  }

  // Force an array if not already something iterable
  if (typeof obj !== "object") {
    /*eslint no-param-reassign:0*/
    obj = [obj];
  }

  if (isArray(obj)) {
    // Iterate over array values
    for (var i = 0, l = obj.length; i < l; i++) {
      fn.call(null, obj[i], i, obj);
    }
  } else {
    // Iterate over object keys
    for (var key in obj) {
      if (Object.prototype.hasOwnProperty.call(obj, key)) {
        fn.call(null, obj[key], key, obj);
      }
    }
  }
}

function setRequestHeader(config = {}) {
  config.headers = config.headers || {};
  const ticket =
    window.sessionStorage.getItem("ticket") || localStorage.getItem("ticket");

  // 获取系统版本号，当系统版本更新时，需要提示打开的界面去刷新获取新的版本代码界面
  let version = "";

  // 考虑跨域场景
  try {
    version = window.top["X-Supos-Version"];
  } catch (err) {}

  const defaultHeaders = {
    "Accept-Language": "zh-cn",
    "Content-Type": "application/json",
    "Cache-Control": "no-cache, no-store",
    Pragma: "no-cache",
    "X-Supos-Client": createClientSymbol(),
  };

  if (ticket) {
    defaultHeaders.Authorization = `Bearer ${ticket}`;
  }

  if (version) {
    defaultHeaders["X-Supos-Version"] = version;
  }

  config.headers = { ...defaultHeaders, ...config.headers };

  return config;
}

function request_err(response) {
  const { status } = response;
  const statusTotype = { 401: "logout", 499: "version", 480: "systemUpgrade" };
  if (!statusTotype[status]) return;
  try {
    if (status === 480 && top === window) {
      // 系统维护中（状态码480）且为顶层页面时，直接跳转到对应的错误提示页面
      window.location.href = "/errorPage/upgrade/";
    } else {
      // 尝试向supfusion发送未登录信息
      window.top.postMessage({ type: statusTotype[status] }, "*");
    }
  } catch (err) {
    if (process.env.NODE_ENV !== "production") {
      console.error(err);
    }
  }
  if (status === 499 || status === 480) {
    // eslint-disable-next-line compat/compat
    return Promise.reject(response);
  }
}

function errorHandler(error) {
  // error logic
  const { response } = error;
  if (!response) {
    // 处理网络离线情况
    console.error(error);
    message.error(error.message);
  } else {
    console.error(response);
    const {
      data: { message: errMsg, msg, code, targetService },
    } = response;
    const errMessage = errMsg || msg;
    if (code && targetService && errMessage) {
      notification.open({
        message: targetService,
        description: (
          <div>
            <div style={{ margin: "5px 0" }}>
              {contextLocale["errorCode"]}：{code}
            </div>
            <div style={{ wordBreak: "break-all" }}>
              {contextLocale["errorMsg"]}：{errMessage}
            </div>
          </div>
        ),
      });
    } else if (errMessage) {
      message.error(errMessage);
    }
  }
}

function paramsSerializer(params) {
  const parts = [];
  const encode = encodeURIComponent;

  forEach(params, (val, key) => {
    if (val === null || typeof val === "undefined") {
      return;
    }

    if (isArray(val)) {
      key += "[]";
    } else {
      val = [val];
    }

    forEach(val, (v) => {
      if (isDate(v)) {
        v = v.toISOString();
      } else if (isObject(v)) {
        v = JSON.stringify(v);
      }
      parts.push(`${encode(key)}=${encode(v)}`);
    });
  });

  return parts.join("&");
}

export default {
  isArray,
  isDate,
  isObject,
  forEach,
  setRequestHeader,
  request_err,
  errorHandler,
  paramsSerializer,
};
