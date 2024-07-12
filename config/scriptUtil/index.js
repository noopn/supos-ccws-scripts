import request from "./request";
import moment from "moment";
import { message } from "antd";
import _ from "lodash";
import { saveAs } from "file-saver/FileSaver";
import { getServiceMessage } from "./constants";
import {
  isZhizhiBrowser,
  isMobile,
  randomUrl,
  setIntervalInner,
  clearIntervalInner,
  getInnerPageUrl,
  getNodeType,
} from "./utils";
import widgetsUtil from "./widgetsUtil";

import os from "./oodmClientScriptUtil";
import getConfig from "./config";
import serviceApi from "./serviceApi";
import * as htmlUtil from "./htmlUtil";
import { v1 as uuidv1 } from "uuid";

function isObject(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function isArray(value) {
  return Array.isArray(value);
}

// 图表列表(目前可操作的组件)
const chartGroup = [
  "LineChart",
  "SplineChart",
  "Column",
  "Area",
  "Dashboard",
  "Gauge",
  "Bubble",
  "Scatter",
  "Pie",
  "Funnel",
  "SpiderChart",
  "AnnularChart",
  "SpcChart",
  "BarChart",
  "ProgressBar",
  "Xrange",
];

const {
  registerReactDom,
  logoutReactDom,
  registerDatalink,
  registerCustomSymbol,
} = widgetsUtil;

function requestParameterChange(...rest) {
  if (rest.length > 0) {
    if (
      rest[0] &&
      rest[1] &&
      rest[0].indexOf("App_") === 0 &&
      rest[0] === rest[1]
    ) {
      if (rest[0] === rest[1]) {
        const [, ...newRest] = rest;
        return newRest;
      } else {
        return rest;
      }
    }
    if (
      rest[0] &&
      typeof rest[0] !== "object" &&
      rest[0].indexOf("App_") !== 0
    ) {
      return ["App_", ...rest];
    }
  }
  return rest;
}

function requestNew(...params) {
  const [appId, ...rest] = requestParameterChange(...params);
  const [, options = {}] = rest;
  if (appId && appId !== "App_") {
    if (options.headers) options.headers["X-APP"] = appId;
    else {
      options.headers = {
        "X-APP": appId,
      };
    }
  }
  rest[1] = options;
  return request.apply(this, rest).then((res) => {
    const result = { ...res };
    if (res.code !== undefined) {
      result.code = `${res.code}`;
    }
    return {
      ...result,
    };
  });
}

function isFunction(func) {
  return func && typeof func === "function";
}

function isEmptyObject(obj) {
  return Object.keys(obj).length === 0;
}

/**
 * 获取 url 参数
 */
function getRequestUrl() {
  const { href } = window.location;
  const url = href.split("?")[1]; // 获取url中"?"符后的字串
  const theRequest = {};
  if (url && url.length > 0) {
    url.split("&").forEach((str) => {
      theRequest[str.split("=")[0]] = decodeURIComponent(str.split("=")[1]);
    });
  }
  return theRequest;
}

/**
 * 拆分列表
 * @param {*} splitKey
 * @param {*} receiveKey
 * @param {*} list
 */
function splitList(splitKey, receiveKey, list = [], remainRes = {}) {
  const arr = [];

  list.forEach((item) => {
    item = { ...item, ...remainRes };
    if (item[splitKey] === 0 || item[splitKey] === "0") {
      item[receiveKey] = 0;
      arr.push(item);
    } else if (item[splitKey] && item[splitKey] <= 1) {
      item[receiveKey] = 1;
      arr.push(item);
    } else {
      for (let i = 0, l = item[splitKey]; i < l; i += 1) {
        item[receiveKey] = 1;
        arr.push(item);
      }
    }
  });
  return arr;
}

/**
 * 获取window.dynamicImportWidget;
 * @param {*} dynamicImportWidget
 * @param {*} componentId
 */
function getRegisterReactDom(componentId) {
  return window.COMPVIEW.dynamicImportWidget[componentId];
}

// 根据组件id, 获取reactDom组件值
function getReactDomValue(ctrlId) {
  const editComponent = getRegisterReactDom(ctrlId);
  if (editComponent && isFunction(editComponent.getValue)) {
    const o = {};
    const key = editComponent.getFormItemId();
    const value = editComponent.getValue();
    o[key] = value;
    return o;
  }
}

// 通用方法
// toQuery 是否触发联动 默认true,用于兼容3.x
function setReactDomValue(ctrlId, value, toQuery = true) {
  const editComponent = getRegisterReactDom(ctrlId);
  if (editComponent && isFunction(editComponent.setValue)) {
    // 按照3.x的逻辑, setReactDomValue默认会触发联动
    return editComponent.setValue(value, toQuery);
  }
}

/**
 * 组件 setDate 各种操作
 * @param {string} ctrlId 组件ID
 * @param {*} value 传入的值 针对实际操作传入对应的值 后续可能加入根据 操作类型（函数名？） 控制传入值的类型控制 同时控制调用范围
 * @param {string} funcName 具体操作的函数名
 */
function handleReactDom(ctrlId, value, funcName = "setValue") {
  const editComponent = getRegisterReactDom(ctrlId);
  if (editComponent && isFunction(editComponent[funcName])) {
    return editComponent[funcName](value);
  }
}
/**
 * 信息提示
 * @param {success/error/warning} type 错误类型
 * @param {*} msg 提示信息
 */
function showMessage(
  msg = getServiceMessage("common.operateSuccess"),
  type = "success"
) {
  const method = message[type];
  if (method && isFunction(method)) {
    method(msg);
  }
}
/**
 *  脚本 ES6 assign 补丁
 * @param {obj} target
 * @param  {...obj} sources
 */
function assignObj(target = {}, ...sources) {
  return Object.assign(target, ...sources);
}

/**
 * 使用循环的方式判断一个元素是否存在于一个数组中
 * @param {Object} arr 数组
 * @param {Object} value 元素值
 */
function isInArray(arr, value) {
  let inArray = false;
  if (isArray(arr)) {
    arr.forEach((v) => {
      if (value === v) {
        inArray = true;
      }
    });
  }
  return inArray;
}

// 获取时区
function getTimeZone() {
  return new Date().getTimezoneOffset() / 60;
}

/**
 * 批量校验 获取最后校验结果
 * @param {Array} ctrlIds 组件ID数组
 */
function isVaild(ctrlIds = []) {
  const validResArr = ctrlIds.map((item) => {
    return item &&
      getRegisterReactDom(item) &&
      getRegisterReactDom(item).getValid
      ? getRegisterReactDom(item).getValid()
      : true;
  });
  let flag = true;
  validResArr.forEach((item) => {
    if (!item) {
      flag = false;
    }
  });
  return flag;
}

// 根据组件id, 获取reactDom组件值
function getReactDomValues(ctrlIds) {
  const values = {};
  if (ctrlIds && ctrlIds.length) {
    [...ctrlIds].forEach((ctrlId) => {
      const value = getReactDomValue(ctrlId);
      if (value && value !== "undefined") {
        const key = Object.keys(value);
        key.forEach((k) => {
          values[k] = value[k];
        });
      }
    });
  }
  return values;
}

// formIds控件名称
function getFormData(formIds, webViewId = "") {
  const wrapComponent = getRegisterReactDom(
    webViewId ? `previewWrapper_${webViewId}` : "previewWrapper"
  );
  if (wrapComponent) {
    return wrapComponent.getFormData(formIds);
  }
}

function setFormData(newFormData, webViewId = "") {
  const wrapComponent = getRegisterReactDom(
    webViewId ? `previewWrapper_${webViewId}` : "previewWrapper"
  );
  if (wrapComponent) {
    wrapComponent.updateForm(newFormData, true);
  }
}

// getEditRow
function getEditRow(tableId) {
  const tableConponent = getRegisterReactDom(tableId);
  return tableConponent && tableConponent.getCurRow
    ? tableConponent.getCurRow()
    : {};
}

//
function getSelectText(selectId) {
  const tableConponent = getRegisterReactDom(selectId);
  const option =
    tableConponent && tableConponent.getChooseOption
      ? tableConponent.getChooseOption()
      : {};
  return (option && option.props && option.props.children) || "";
}

/**
 * 获取具体参数值
 * @param {object} params 来源数据
 * @param {string} formId 控件名称
 * @param {string} prop 需获取的参数
 */
function getProp(params, formId, prop) {
  prop = prop || "url";
  const param = params[formId] || "";
  const data = [];
  if (Array.isArray(param)) {
    param.forEach((item) => {
      data.push(item[prop]);
    });
  } else {
    data.push(param[prop]);
  }

  params[formId] = data;
  return params;
}

// 关闭当前页面
function closeCurrentPage() {
  const { userAgent } = navigator;
  if (
    userAgent.indexOf("Firefox") !== -1 ||
    userAgent.indexOf("Chrome") !== -1
  ) {
    if (
      window.parent &&
      window.parent.COMPVIEW &&
      window.parent.COMPVIEW.scriptUtil &&
      window.parent.COMPVIEW.scriptUtil.closeModal
    ) {
      window.parent.COMPVIEW.scriptUtil.closeModal();
    }
    window.location.href = "about:blank";
    window.close();
  } else {
    if (window.parent && window.parent.COMPVIEW && window.parent.closeModal) {
      window.parent.COMPVIEW.scriptUtil.closeModal();
    }
    window.opener = null;
    window.open("", "_self");
    window.close();
  }
}
// 打开页面
function openPage(url, method = "_blank", feature = null, openConfig) {
  const baseFeature =
    "toolbar=yes, location=yes, directories=no, status=no, menubar=yes, scrollbars=yes, resizable=yes, copyhistory=yes";
  const isIE11 = !!window.MSInputMethodContext && !!document.documentMode;
  if (feature) {
    if (openConfig) {
      const obj = JSON.parse(openConfig);
      feature = `${baseFeature},
      top=${
        obj.isCenter
          ? (document.documentElement.clientHeight - (obj.height || 400)) / 2
          : obj.offsetTop || 0
      },
      left=${
        obj.isCenter
          ? (document.documentElement.clientWidth - (obj.width || 400)) / 2
          : obj.offsetLeft || 0
      },
      width=${obj.width || 400},
      height=${obj.height || 400}`;
    } else {
      feature = `${baseFeature}, width=400, height=400`;
    }
  }

  // url = url && (url.indexOf('http://') > -1 || url.indexOf('https://') > -1) ?
  //   url : (window.location.origin + url);

  if (method === "_blank" && isIE11) {
    feature = `channelmode=yes, ${baseFeature}`;
  }

  // 兼容工作流老数据
  url = url && url.startsWith("project/flow") ? `/${url}` : url;

  const pageId = url.match(/Page_[0-9a-z]+/)?.[0];
  if (pageId && method === "_self") {
    // 当前窗口打开的时supos页面
    let temp = window.location.href.replace(/Page_[0-9a-z]+/, pageId);
    if (window.location.href === temp) {
      if (temp.indexOf("supmenuhash=") > -1) {
        temp = temp.replace(
          /supmenuhash=[0-9]+/,
          `supmenuhash=${new Date().getTime()}`
        );
      }
    }
    window.location.href = temp;
  } else {
    window.open(url, method, feature);
  }
}
// 在父窗口打开页面
function openParentPage(url, method) {
  if (window.opener) {
    window.opener.open(url, method);
  } else if (window.parent) {
    if (window.parent === window) {
      // 不存在父窗口
      return;
    }
    window.parent.open(url, method);
  }
}

// 根据组件formItemId,labelContent，生成表头映射
function getFormatterMap(ctrlIds = []) {
  const map = {};
  if (ctrlIds && ctrlIds.length) {
    ctrlIds.forEach((ctrlId) => {
      const component = getRegisterReactDom(ctrlId);
      const widgetName = _.get(component, "props.widgetName");
      if (_.includes(chartGroup, widgetName)) {
        map[ctrlId] = _.get(component, "hchartsMockApi.title.text", "");
      } else {
        const { formItemId, labelContent } = _.get(
          component,
          "state.config",
          {}
        );
        map[formItemId] = labelContent;
      }
    });
  }
  return map;
}
// 解析表格数据
function parseTableMap(data, map, index = "序号") {
  let arr = {};
  if (data && data.length && map) {
    const { hasOwnProperty } = Object.prototype;
    arr = data.map((item, i) => {
      const o = {};
      for (const key in item) {
        if (item && hasOwnProperty.call(item, key)) {
          o[index] = i + 1;
          if (map[key]) {
            o[map[key]] = item[key];
          } else {
            o[key] = item[key];
          }
        }
      }
      return o;
    });
  } else {
    return data;
  }
  return arr;
}

// 字段排序
function objKeySort(arys, sort) {
  // 先用Object内置类的keys方法获取要排序对象的属性名，再利用Array原型上的sort方法对获取的属性名进行排序，newkey是一个数组
  const newkey = sort || Object.keys(arys).sort();
  // 创建一个新的对象，用于存放排好序的键值对
  const newObj = {};
  for (let i = 0; i < newkey.length; i += 1) {
    // 遍历newkey数组
    newObj[newkey[i]] = arys[newkey[i]];
    // 向新创建的对象中按照排好的顺序依次增加键值对
  }
  // 返回排好序的新对象
  return newObj;
}
// 获取指定字段，并按指定字段顺序排序
function arrObjectKeySort(aryObjs, sort) {
  if (aryObjs && aryObjs.length && sort && sort.length) {
    const newAryObjs = aryObjs.map((item) => {
      return objKeySort(item, sort);
    });
    return newAryObjs;
  }
  return aryObjs;
}

// 获取localstorage中的uuid
function getUuid() {
  return window.localStorage.getItem("uuid");
}
// 设置localstorage中的uuid
function setUuid() {
  if (!window.localStorage.getItem("uuid")) {
    window.localStorage.setItem("uuid", uuidv1());
  }
}
// 清空localstorage中的uuid
function emptyUuid() {
  window.localStorage.removeItem("uuid");
}

/**
 * 时间戳反格式化处理 返回需要的时间戳
 * @param {string} timestamp 已格式化的时间戳
 * @param {number} type 1:默认方式 转毫秒数 其他待扩展
 */
function timestampAntiFormat(timestamp) {
  if (timestamp) {
    return new Date(timestamp.replace(/-/g, "/")).valueOf();
  } else {
    return null;
  }
}

/**
 * 时间戳格式化处理 返回需要的时间戳格式
 * @param {number} time 时间戳
 * @param {string} format 时间戳格式 参照 moment.js 灵活配置
 *
 */
function timestampFormat(time, format = "YYYY-MM-DD HH:mm:ss") {
  const isTimeVaild = time;
  if (isTimeVaild) {
    // 如果传入time是字符串格式的时间戳，则需转成数字型的时间戳
    let newTime = time;
    if (typeof time === "string" && time.indexOf("-") === -1) {
      newTime = time - 0;
    }
    return moment(newTime).format(format);
  } else {
    return null;
  }
}

function showModal(config = {}) {
  const previewWrapperComponent = getRegisterReactDom("previewWrapper");

  // pageId 形式的简单脚本配置方法
  if (Object.prototype.toString.call(config) === "[object Object]") {
    const {
      pageId,
      modalVisible = true,
      modalTitle = getServiceMessage("common.edit"),
      modalWidth = 1024,
      modalHeight = 768,
      modalContent,
    } = config;
    const { props: { appId, isSuposRuntime } = {} } = previewWrapperComponent;
    if (modalVisible) {
      if (pageId) {
        previewWrapperComponent.setModal({
          modalVisible,
          modalWidth,
          modalHeight,
          modalTitle,
          isIframe: true,
          modalContent:
            modalContent ||
            (pageId && getInnerPageUrl(pageId, appId, isSuposRuntime)),
        });
      }
    } else {
      previewWrapperComponent.modalClose();
    }
    return;
  }

  const modelSetting =
    _.isObject(config) &&
    Object.prototype.toString.call(config) === "[object Object]"
      ? config
      : JSON.parse(config);

  // mobile 宽高适配
  if (isMobile()) {
    const { width = 1024, height = 768, padding = {} } = modelSetting;
    const { paddingBottom = 24, paddingTop = 24 } = padding;
    const cWidth = document.documentElement.clientWidth - 30;
    modelSetting.width = Math.min(cWidth, width);

    const preHeight = parseInt((modelSetting.width * height) / width, 10);
    const clientHeight =
      document.documentElement.clientHeight -
      60 -
      30 -
      paddingBottom -
      paddingTop;
    modelSetting.height = Math.min(preHeight, clientHeight);
  } else {
    const clientWidth = document.documentElement.clientWidth - 10;
    if (modelSetting.width > clientWidth) {
      modelSetting.width = clientWidth;
    }
  }

  const {
    needTitle,
    fontSize,
    fontColor,
    titleBgColor,
    positionCenter = true,
    positionLeft,
    positionTop,
    contentBgColor,
    modalIsCenter,
    modalMarginLeft,
    modalMarginTop,
    sandbox,
    resizable,
    isSandbox,
  } = modelSetting;
  previewWrapperComponent.setModal({
    modalVisible: true,
    modalWidth: Number(modelSetting.width) || 1024,
    modalHeight: Number(modelSetting.height) || 768,
    modalTitle:
      modelSetting.modelTitle || getServiceMessage("common.undefined"),
    modalIsCenter,
    resizable,
    modalMarginLeft,
    modalMarginTop,
    modalContent: modelSetting.url,
    bodyStyle: Object.assign(
      {
        paddingBottom: 24,
        paddingTop: 24,
        paddingLeft: 24,
        paddingRight: 24,
      },
      modelSetting.padding,
      { background: modelSetting.contentBgColor || "#ffffff" }
    ),
    style: positionCenter
      ? null
      : {
          left: positionLeft,
          top: positionTop,
        },
    needTitle,
    fontSize,
    fontColor,
    titleBgColor,
    contentBgColor,
    isIframe: true,
    sandbox,
    isSandbox,
  });
}

// 设置
function showModalContent(config = {}) {
  const previewWrapperComponent = getRegisterReactDom("previewWrapper");
  const { width, height, title, content, visible, isIframe = true } = config;
  if (previewWrapperComponent) {
    previewWrapperComponent.setModal({
      modalVisible: visible,
      modalWidth: Number(width) || 1024,
      modalHeight: Number(height) || 768,
      modalTitle: title || getServiceMessage("common.undefined"),
      modalContent: content,
      isIframe,
    });
  }
}

function closeModal(ctrlId = "previewWrapper") {
  // 目前脚本控制的弹框都是在 previewWrapper 层
  getRegisterReactDom(ctrlId).modalClose();
}

function showLoading(config = {}) {
  const { ctrlId = "previewWrapper", spinIsLoading = true, spinTip } = config;
  const previewWrapperComponent = getRegisterReactDom(ctrlId);
  previewWrapperComponent.setSpinLoading({
    spinIsLoading,
    spinTip,
  });
}
function closeLoading(ctrlId = "previewWrapper") {
  // 目前脚本控制的弹框都是在 previewWrapper 层
  getRegisterReactDom(ctrlId).closeSpinLoading();
}

// 对象实例新增-生成primitiveType
function parsePrimitiveType(d, primitiveTypeMap) {
  const results = [];
  if (isObject(primitiveTypeMap) && isObject(d)) {
    const props = Object.keys(d);
    props.forEach((v) => {
      if (d[v] && primitiveTypeMap[v]) {
        const result = {};
        result.name = v;
        result.defaultValue = d[v];
        result.primitiveType = primitiveTypeMap[v];
        results.push(result);
      }
    });
  }
  return results;
}
// parseObjPropVals
function parseObjPropVals(res) {
  if (res && res.message && res.message.list) {
    const { list } = res.message;
    const props = [];
    if (isArray(list)) {
      list.forEach((item) => {
        if (item && item.properties) {
          props.push(Object.assign({}, item.properties, { name: item.name }));
        }
      });
    }
    return props;
  }
}

// 合并数据
function groupDataByField(arr, groupBy, countBy, otherData) {
  if (!isArray(arr)) {
    return [];
  }
  // 排序
  arr.sort((a, b) => {
    return a[groupBy] - b[groupBy];
  });
  // 分组
  const map = {};
  const dest = [];
  arr.forEach((item) => {
    if (!map[item[groupBy]]) {
      const newItem = Object.assign({}, item, {
        data: [item],
      });
      dest.push(newItem);
      map[item[groupBy]] = item;
    } else {
      dest.forEach((v) => {
        if (v[groupBy] === item[groupBy]) {
          v.data.push(item);
          return false;
        }
      });
    }
  });
  if (countBy) {
    const newArr = [];
    dest.forEach((m) => {
      const d = m.data;
      let count = 0;
      d.forEach((item) => {
        count += item[countBy] ? Number(item[countBy]) : 0;
      });
      m[countBy] = count;
      delete m.data;
      if (otherData) {
        Object.assign({}, m, otherData);
      }
      newArr.push(m);
    });
    return newArr;
  }
  return dest;
}

// 填充数据
function mergeData(arr, newData, parseItemFn) {
  if (isArray(arr) && isObject(newData)) {
    return arr.map((item) => {
      let parseItem = {};
      if (isFunction(parseItemFn)) {
        parseItem = parseItemFn(item);
      }
      return Object.assign({}, item, newData, parseItem);
    });
  }
}

/**
 * 获取用户信息
 */
function getSessionUserInfo() {
  let userSessionInfo = sessionStorage.getItem("userInfo");
  if (
    userSessionInfo &&
    userSessionInfo !== "undefined" &&
    typeof userSessionInfo === "string"
  ) {
    userSessionInfo = _.get(
      JSON.parse(userSessionInfo),
      "userSessionInfo",
      null
    );
  } else {
    userSessionInfo = null;
  }
  return userSessionInfo;
}
/**
 * 获取用户信息
 */
function getUserInfo(cb) {
  const userSessionInfo = getSessionUserInfo();
  if (userSessionInfo && typeof userSessionInfo === "object") {
    requestNew(`${getConfig().domainAuth}/currentuser`).then((res) => {
      if (res && isFunction(cb)) {
        cb(res);
      }
    });
  }
}
/**
 * 设置用户信息
 */
function setUserInfo(
  ctrlId,
  tip = getServiceMessage("common.userInfoTip"),
  endTip = getServiceMessage("common.quit")
) {
  const userSessionInfo = getSessionUserInfo();
  if (userSessionInfo && typeof userSessionInfo === "object") {
    const userName = userSessionInfo.username || userSessionInfo.realName || "";
    if (ctrlId && userName) {
      const loginOutComponent = getRegisterReactDom(ctrlId);
      loginOutComponent.setButtonName(`${tip}${userName}${endTip}`);
    }
  }
}

/**
 * JSON 转 excel or csv
 */
function JSONToExcelConvertor({
  data = [],
  fileName,
  dataTitle = [],
  dataKey = [],
  filter,
  extension,
  workSheet = "Sheet1",
}) {
  if (!data) {
    return;
  }
  // 转化json为object
  let arrData = [];
  try {
    arrData = typeof data !== "object" ? JSON.parse(data) : data;
  } catch (error) {
    console.error(error);
    return false;
  }
  let uri = "";
  let contentType = "";
  if (extension === "csv") {
    let str = "";
    dataTitle.forEach((title) => {
      str += `${title},`;
    });
    str += "\n";

    const getStr = (key, val) => {
      if (filter) {
        if (filter.indexOf(key) === -1) {
          return [undefined, null].includes(val) ? "," : `${val},`;
        }
      } else {
        return [undefined, null].includes(val) ? "," : `${val},`;
      }
    };

    arrData.forEach((item) => {
      if (dataKey.length > 0) {
        for (const index in dataKey) {
          if (dataKey[index])
            str += getStr(dataKey[index], item[dataKey[index]]);
        }
      } else {
        for (const index in item) {
          if (index) str += getStr(index, item[index]);
        }
      }
      str += "\n";
    });
    // data:text/csv;charset=utf-8,
    uri = `\uFEFF${str}`;
    contentType = "text/csv";
  } else {
    let excel = "<table>";
    // 设置表头
    let thRow = "<tr>";
    if (dataTitle) {
      // 使用标题项
      _.forEach(dataTitle, (t) => {
        thRow += `<th align='center'>${t}</th>`;
      });
    } else {
      _.forEach(arrData[0], (t) => {
        thRow += `<th align='center'>${t}</th>`;
      });
    }

    excel += `${thRow}</tr>`;

    const getRow = (key, val) => {
      if (filter) {
        if (filter.indexOf(key) === -1) {
          const value = [undefined, null].includes(val) ? "" : val;
          return `<td>${value}</td>`;
        }
      } else {
        const value = [undefined, null].includes(val) ? "" : val;
        return `<td align='center'>${value}</td>`;
      }
    };

    // 设置数据
    for (let i = 0; i < arrData.length; i += 1) {
      let row = "<tr>";
      if (dataKey.length > 0) {
        for (const index in dataKey) {
          if (dataKey[index])
            row += getRow(dataKey[index], arrData[i][dataKey[index]]);
        }
      } else {
        for (const index in arrData[i]) {
          if (index) row += getRow(index, arrData[i][index]);
        }
      }

      excel += `${row}</tr>`;
    }

    excel += "</table>";

    let excelFile =
      "<html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:x='urn:schemas-microsoft-com:office:excel' xmlns='http://www.w3.org/TR/REC-html40'>";
    excelFile +=
      '<meta http-equiv="content-type" content="application/vnd.ms-excel; charset=UTF-8">';
    excelFile +=
      '<meta http-equiv="content-type" content="application/vnd.ms-excel';
    excelFile += '; charset=UTF-8">';
    excelFile += "<head>";
    excelFile += "<!--[if gte mso 9]>";
    excelFile += "<xml>";
    excelFile += "<x:ExcelWorkbook>";
    excelFile += "<x:ExcelWorksheets>";
    excelFile += "<x:ExcelWorksheet>";
    excelFile += "<x:Name>";
    excelFile += `${workSheet}`;
    excelFile += "</x:Name>";
    excelFile += "<x:WorksheetOptions>";
    excelFile += "<x:DisplayGridlines/>";
    excelFile += "</x:WorksheetOptions>";
    excelFile += "</x:ExcelWorksheet>";
    excelFile += "</x:ExcelWorksheets>";
    excelFile += "</x:ExcelWorkbook>";
    excelFile += "</xml>";
    excelFile += "<![endif]-->";
    excelFile += "</head>";
    excelFile += "<body>";
    excelFile += excel;
    excelFile += "</body>";
    excelFile += "</html>";
    // data:application/vnd.ms-excel;charset=utf-8,
    uri = `${excelFile}`;
    contentType =
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet;charset=utf-8"; // 'application/vnd.ms-excel';
  }

  const fileNames = `${fileName}.${extension || "xls"}`;
  saveAs(new Blob([uri], { type: contentType }), fileNames);
}

/**
 *
 * @param {*} dom ctrl组件对象
 * @param {*} value 默认提交初始值
 * @param {*} tag 是否默认提交查询，不填写按照当前方式，提交0为自动
 */
function submitDefaultValue(dom, value, tag) {
  setTimeout(() => {
    const newFormData = {};
    newFormData[dom.state.config.formItemId] = value;
    newFormData.ctrlIndex = dom.props.widgetIndex;
    newFormData.ctrlType = tag || dom.props.pageConfig.linkage;
    // 默认传递false, 上面的操作已经能触发联动了
    dom.setValue(value, false);
    dom.props.updateForm(newFormData);
  }, 0);
}

/**
 *
 * @param {*} node 自定义图元HT节点
 */
function getCustomSymbolProps(node) {
  const customProp = node.getAttr("customProp") || [];
  const customSetedProp = node.getAttr("customSetedProp") || {};
  const result = {};
  _.each(customProp, (group) => {
    if (group.props && Object.keys(group.props).length) {
      _.map(group.props, (prop, id) => {
        result[`${group.label}.${prop.name}`] =
          customSetedProp[id] !== undefined ? customSetedProp[id] : prop.value;
      });
    }
  });
  return result;
}

/**
 *
 * @param {*} node 自定义图元HT节点
 * @param {*} tag 组件tag
 */
function getCustomSymbolComponent(node, tag) {
  let result;
  node.getChildren().each((d) => {
    const t = d.getTag();
    if (t === tag) {
      result = d;
    }
  });
  return result;
}

function getDatalink(tag) {
  return window.COMPVIEW.dataLinks ? window.COMPVIEW.dataLinks[tag] : {};
}

function Alert(Message, callback) {
  const wrapComponent = getRegisterReactDom("previewWrapper");
  wrapComponent.showWarning(Message, callback);
}

/**
 * 刷新页面
 * @param {int} time 延时时间
 */
function reload(time = 50) {
  setTimeout(() => {
    window.location.reload();
  }, time);
}

/**
 * 切换自定义图元数据源
 * @param {string} id 自定义图元ID
 * @param {object} dataSourceMapping 数据源映射
 */
function changeCustomSymbolDataSource(id, dataSourceMapping) {
  if (!(id && window.COMPVIEW.customSymbols[id])) {
    return false;
  }
  const customSymbol = window.COMPVIEW.customSymbols[id];
  if (customSymbol.changeDataSourceMapping) {
    customSymbol.changeDataSourceMapping(dataSourceMapping);
  }
}

/**
 * 刷新工作流数据
 * fix: 54334，方法补全
 */
function refreshWorkflow() {
  setTimeout(() => {
    _.values(window.dynamicImportWidget).forEach((item) => {
      const { props: { widgetName, widgetIndex } = {} } = item;
      if (
        widgetName === "TodoCtrl" &&
        getRegisterReactDom(widgetIndex) &&
        getRegisterReactDom(widgetIndex).handleGetTodoData
      ) {
        getRegisterReactDom(widgetIndex).handleGetTodoData();
      }
    });
  }, 50);
}

/**
 * 复制对象
 * fix: 54334，方法补全
 */
function copy(value) {
  const copyValue = JSON.stringify(value);
  const copyDom = document.createElement("input");
  // 获得需要复制的内容
  copyDom.setAttribute("value", copyValue);
  // 不要让他displaynone,否则复制不出来
  copyDom.style.position = "absolute";
  copyDom.style.x = 999999;
  copyDom.style.y = 999999;
  // 添加到 DOM 元素中
  document.body.appendChild(copyDom);
  // 执行选中
  // 注意: 只有 input 和 textarea 可以执行 select() 方法.
  copyDom.select();
  // 获得选中的内容
  window.getSelection().toString();
  // 执行复制命令
  const successful = document.execCommand("copy");
  if (successful) {
    message.success(getServiceMessage("common.copySuccess1"));
  } else {
    message.warning(getServiceMessage("common.copyError"));
  }
  // 将 input 元素移除
  document.body.removeChild(copyDom);
}

/**
 * 退出登录(已废弃， 作兼容使用)
 * fix: 54334，方法补全
 */
function setAuthority() {
  const { dispatch } = window.APPSTORE || {};
  if (dispatch) {
    dispatch({
      type: "login/logout",
    });
  }
}

export default {
  Alert,
  reload,
  domain: "",
  fromPath: os.fromPath,
  // 自定义图元相关
  registerDatalink,
  registerCustomSymbol,
  getCustomSymbolProps,
  getCustomSymbolComponent,
  getDatalink,
  // 请求相关
  request: requestNew,
  getUserInfo,
  getSessionUserInfo,
  submitDefaultValue,
  setUserInfo,
  // react组件操作
  registerReactDom,
  logoutReactDom,
  getRegisterReactDom,
  setReactDomValue,
  handleReactDom,
  getReactDomValue,
  getReactDomValues,
  getFormData,
  setFormData,
  getProp,
  // 窗口操作
  closeCurrentPage,
  openPage,
  openParentPage,
  // 工具库
  moment,
  isFunction,
  isEmptyObject,
  timestampFormat,
  timestampAntiFormat,
  // valueCheck,
  // regRexGroup,
  getRequestUrl,
  splitList,
  isVaild,
  showMessage,
  assignObj,
  isInArray,
  getTimeZone,
  randomUrl,
  getEditRow,
  // 表格操作
  JSONToExcelConvertor,
  isZhizhiBrowser,
  ...htmlUtil,
  ...serviceApi,
  setInterval: setIntervalInner,
  setIntervalInner,
  clearInterval: clearIntervalInner,
  clearIntervalInner,
  getNodeType,
  getFormatterMap,
  parseTableMap,
  objKeySort,
  arrObjectKeySort,
  getUuid,
  setUuid,
  emptyUuid,
  parsePrimitiveType,
  parseObjPropVals,
  groupDataByField,
  mergeData,
  getSelectText,
  ...widgetsUtil,
  showModal,
  showModalContent,
  closeModal,
  showLoading,
  closeLoading,
  changeCustomSymbolDataSource,
  copy,
  setAuthority,
  refreshWorkflow,
};
