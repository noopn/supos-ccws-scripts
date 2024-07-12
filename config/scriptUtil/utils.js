import React from "react";
import _ from "lodash";
import pako from "pako";
import { Tooltip, notification, message } from "antd";
import commonMessage from "./messages";
import { allActions, STATICBASE_DESIGN, STATICBASE_RUNTIME } from "./constants";
// import { getDataSource } from 'root/utils/queryFormat';
import FastClick from "fastclick";
import groupListJson from "./widgets.json";

function getLocalLanguage() {
  return "zh-cn";
}
// const errorStatusArr = ['40000000000000', '80000000000000', '1000000000000000'];

export const HT_STATUS_DESIGN = 0;
export const HT_STATUS_VIEW = 1;
export const HT_STATUS_ISPREVIEW = 2;

// 获取系统标题
export function getPageTitle({ intl }) {
  const title =
    localStorage.getItem("systemTitle") ||
    intl.formatMessage(commonMessage.systemTitle);
  return title;
}

/**
 * 设置接口get请求参数
 * @param {object} params 参数 {a:1,b:2,c:[1,2,3]}
 * @return {string} ie. ?a=1&b=2&c=1&c=2&c=3
 */
export function getUrlParams(params) {
  let param = "";
  for (const i in params) {
    if (
      params[i] !== null &&
      params[i] !== undefined &&
      params[i].length !== 0
    ) {
      if (Array.isArray(params[i])) {
        for (const j in params[i]) {
          if (params[i][j]) {
            param += !param ? `?${i}=${params[i][j]}` : `&${i}=${params[i][j]}`;
          }
        }
      } else {
        param += !param ? `?${i}=${params[i]}` : `&${i}=${params[i]}`;
      }
    }
  }
  return param;
}

// 菜单树转数组 tree => list
export const tree2list = (data = [], levelsChain) => {
  return data.reduce(
    (res, curr) => [
      ...res,
      {
        ...curr,
        levelsChain: (levelsChain ? `${levelsChain}/` : "") + curr.code,
      },
      ...(curr.children.length
        ? [
            ...tree2list(
              curr.children,
              (levelsChain ? `${levelsChain}/` : "") + curr.code
            ),
          ]
        : []),
    ],
    []
  );
};

/* eslint no-useless-escape:0 */
const reg = /(((^https?:(?:\/\/)?)(?:[-;:&=\+\$,\w]+@)?[A-Za-z0-9.-]+|(?:www.|[-;:&=\+\$,\w]+@)[A-Za-z0-9.-]+)((?:\/[\+~%\/.\w-_]*)?\??(?:[-\+=&;%@.\w_]*)#?(?:[\w]*))?)$/g;

export function isUrl(path) {
  return reg.test(path);
}

/**
 * Trim字符串
 * @param str
 * @returns {*}
 */
export function trim(str) {
  return str.replace(/(^\s*)|(\s*$)/g, "");
}

/**
 * 获取url地址--NEW ,如果该方法获取不到会重新用上面的方法获取
 * ? 问号后的一段字符
 * @param location
 * @param param
 * @returns {string}
 */
export function queryLocationParam(location, param) {
  const paramString = location.href.substring(
    location.href.indexOf("?") + 1,
    location.href.length
  );
  const paramArray = paramString.split("&");
  let result = "";
  paramArray.forEach((value) => {
    const pairKeyValueArray = value.split("=");
    if (pairKeyValueArray[0] === param) {
      // let [arrayResult] = [];
      // [arrayResult] = [pairKeyValueArray];
      // result = [arrayResult];
      [, ...result] = pairKeyValueArray;
    }
  });
  return !result
    ? ""
    : result.length === 1
    ? result.join("")
    : result.join("=");
}
/**
 * 批量获取url参数
 * @param {string} location  url
 * @param {array} params 获取的参数key
 */
export function queryLocationParams(location, params) {
  const object = {};
  params.forEach((param) => {
    object[param] = queryLocationParam(location, param);
  });

  return object;
}

/**
 * 把数组转化成对象
 * @param array
 * @returns {{list: *}}
 */
export function convertArrayToObject(array) {
  return {
    list: array,
  };
}

/**
 * 接口返回数据 判断是否失败
 * @param {*} res
 */
export function isRequestFail(res) {
  const codeList = ["200", 200, "201", 201, "204", 204, "202", 202];
  if (!res) return true;
  if (res && codeList.indexOf(res.code) < 0) return true;
  return false;
}

/**
 * @description 绑定dom元素监听事件
 * @param {dom} target 绑定监听事件的目标dom
 * @param {string} type  监听函数类型，如click,mouseover
 * @param {function} func 监听事件
 */
export function addEventHandler(target, type, func, params = false) {
  if (target.addEventListener) {
    // 监听IE9，谷歌和火狐
    target.addEventListener(type, func, params);
  } else if (target.attachEvent) {
    target.attachEvent(`on${type}`, func);
  } else {
    target[`on${type}`] = func;
  }
}

/**
 * @description 移除Dom元素的事件
 * @param 参数同 addEventHandler
 */
export function removeEventHandler(target, type, func) {
  if (target.removeEventListener) {
    // 监听IE9，谷歌和火狐
    target.removeEventListener(type, func, false);
  } else if (target.detachEvent) {
    target.detachEvent(`on${type}`, func);
  } else {
    delete target[`on${type}`];
  }
}

/**
 * @description 比较两个数组的差异值
 * @param {array} oldArr
 * @param {array} newArr
 * @returns {object} addArr 新增数组  rmArr 删除数组
 */
export function diffArr(oldArr, newArr) {
  const rmArr = [];
  for (let i = 0; i < oldArr.length; i += 1) {
    if (newArr.indexOf(oldArr[i]) === -1) {
      rmArr.push(oldArr[i]);
    }
  }
  const addArr = [];
  for (let j = 0; j < newArr.length; j += 1) {
    if (oldArr.indexOf(newArr[j]) === -1) {
      addArr.push(newArr[j]);
    }
  }
  return { addArr, rmArr };
}

/**
 * tips 提示
 * @param {*} val 内容
 */
export function getTips(val) {
  return (
    <Tooltip
      overlayStyle={{ width: "250px", wordBreak: "break-all" }}
      placement="bottomLeft"
      title={val}
      trigger="hover"
    >
      <span style={{ cursor: "pointer" }}>{val}</span>
    </Tooltip>
  );
}

/**
 * @description 文本转图片
 * @param {type} params
 * text 需要转成图片的文字 width/height canvas宽高大小 默认100
 * fontszie 文字大小 默认20px fontcolor 默认黑色
 * @returns {type} params
 */
export function textToImg(params) {
  const {
    text = "",
    width = 100,
    height = 100,
    fontsize = 20,
    fontcolor = "rgb(0,0,0)",
  } = params;
  let canvas = document.createElement("canvas");
  canvas.wdith = width;
  canvas.height = height;
  const context = canvas.getContext("2d");
  context.clearRect(0, 0, canvas.width, canvas.height);
  context.font = `${fontsize}px Arial`;
  context.textBaseline = "middle";
  context.fillStyle = fontcolor;
  context.textBaseline = "middle";
  context.fillText(text, 0, (height - fontsize) / 2);
  const dataUrl = canvas.toDataURL("image/png");
  canvas = null;
  return dataUrl;
}

/**
 *  判断节点是否是非图元库组件
 * @param {*} data 节点
 */
export function isHtdiv(data) {
  return data && data.getImage && data.getImage() === "htDiv";
}

/**
 * 根据节点，返回节点类型
 * @param {} data 节点
 */
export function getNodeType(data) {
  if (!data) return undefined;
  let elemType;

  // 非实例化节点
  if (!data.getClassName) {
    if (_.get(data, "c") !== "ht.Block" && _.get(data, "a.widgetName")) {
      elemType = _.get(data, "a.widgetName");
    }
    if (elemType === "Polygon" && data.s.shape !== "polygon") {
      elemType = "CustomShape";
    }
    if (elemType === "Shape") elemType = undefined;
    if (!elemType && data.c === "ht.Block") {
      if (_.get(data, "a.symbolId")) {
        elemType = "customSymbol";
      } else {
        elemType = "group";
      }
    }
    if (
      !elemType &&
      data.c === "ht.Data" &&
      data.s &&
      data.s["editor.folder"] === true
    ) {
      elemType = "folder";
    }
    if (!elemType && data.c === "ht.Edge") {
      elemType = "edge";
    }
    if (!elemType && data.c === "ht.Shape") {
      if (_.get(data, "s.shape") === "pipe") {
        elemType = "Pipe";
      } else if (_.get(data, "p.points.__a", []).length > 1) {
        elemType = "unRuleShape";
      }
    }
    if (!elemType && data.s && data.s.shape) {
      elemType = data.s.shape;
      if (
        [
          "hexagon",
          "pentagon",
          "diamond",
          "rightTriangle",
          "parallelogram",
          "trapezoid",
        ].includes(elemType)
      ) {
        elemType = "CustomShape";
      }
    }
    if (!elemType && data.s && data.s.type) {
      elemType = data.s.type;
    }
    if (!elemType && data.a && data.a.shapeName) {
      elemType = data.a.shapeName;
    }

    return elemType;
  }

  if (data.getStyleMap && data.getStyleMap()) {
    if (data.getStyleMap().shape) {
      elemType = data.getStyleMap().shape;
      if (
        [
          "hexagon",
          "pentagon",
          "diamond",
          "rightTriangle",
          "parallelogram",
          "trapezoid",
        ].includes(elemType)
      ) {
        elemType = "CustomShape"; // 不规则图形统一处理
      }
    } else if (data.getStyleMap().type) {
      elemType = data.getStyleMap().type;
    }
  }
  if (!elemType && data.a("shapeName")) {
    elemType = data.a("shapeName");
  }
  if (!elemType && data.getPoints && data.getPoints().size() > 1) {
    elemType = "unRuleShape";
  }
  if (!elemType && data.getClassName() === "ht.Edge") {
    elemType = "edge";
  }
  if (!elemType && data._childMap && Object.keys(data._childMap).length) {
    if (data.s("editor.folder")) {
      elemType = "folder";
    } else if (data.a("symbolId")) {
      elemType = "customSymbol";
    } else {
      elemType = "group";
    }
  }
  if (!elemType && data.getImage && data.getImage() === "htDiv") {
    elemType = data.a("widgetName") || "htDiv";
  }
  if (!elemType && data.a && data.a("widgetName") === "image") {
    elemType = "image";
  }
  if (!elemType && data.s && data.s("editor.folder")) {
    elemType = "folder";
  }
  return elemType;
}

// 控件类型
export function getNodeTypeList() {
  const lang = getLocalLanguage();
  const langMap = {
    "zh-cn": "zh-cn",
    "en-us": "en-us",
    "de-de": "de-de",
    "zh-hk": "zh-hk",
  };
  const defaultLang = langMap[lang] || "zh-cn";
  const list = groupListJson;
  const result = [];
  list.graph.forEach((item) => {
    result.push({ name: item.displayName[defaultLang], value: item.id });
  });
  list.form.forEach((item) => {
    result.push({ name: item.displayName[defaultLang], value: item.id });
  });
  list.chart.forEach((item) => {
    result.push({ name: item.displayName[defaultLang], value: item.id });
  });
  return result;
}

// export function getNodeSourceType(intl, node, name) {
//   const list = groupListJson;
//   const ctrlType = getNodeType(node).toLocaleLowerCase();
//   const chartList = list.chart.map(e => e.id.toLocaleLowerCase());
//   const graphList = list.graph.map(e => e.id.toLocaleLowerCase());
//   const formList = list.form.map(e => e.id.toLocaleLowerCase());
//   const obj = node.getAttrObject();
//   let object = {};
//   if (chartList.includes(ctrlType)) {
//     // 图表库
//     if (name) {
//       const dataSourceArr = _.get(obj, 'configs.dataSourceInfo.dataSource', []);
//       object = _.find(dataSourceArr, ['id', name]) || {};
//     }
//   } else if (graphList.includes(ctrlType)) {
//     if (ctrlType === 'datalink') {
//       object = _.get(obj, 'DataLink.object', {});
//     }
//   } else if (formList.includes(ctrlType)) {
//     object = _.get(obj, 'configs.config.object', {});
//   }
//   let fullName;
//   let sourceType;
//   if (Array.isArray(object)) {
//     fullName = object[0] ? getDataSource(object[0]) : '';
//     sourceType = object[0] ? `${object[0].tab}.${object[0].subTab}` : '';
//   } else {
//     fullName = Object.keys(object).length > 0 ? getDataSource(object) : '';
//     sourceType = object && Object.keys(object).length > 0 ? `${object.tab}.${object.subTab}` : '';
//   }
//   return {
//     fullName,
//     object, // 数据源object
//     sourceType // 数据类型
//   };
// }

export function beginTransaction() {
  if (!window.COMPVIEW.isBeginTransaction) {
    window.COMPVIEW.isBeginTransaction = true;
    window.COMPVIEW.editor.dm.beginTransaction();
  }
}

export function endTransaction() {
  if (window.COMPVIEW.isBeginTransaction) {
    window.COMPVIEW.isBeginTransaction = false;
    window.COMPVIEW.editor.dm.endTransaction();
  }
}

/**
 * fun 中执行的ht节点数据修改不会被记录到ht的历史记录中
 */
export function escapeHtHistoryRecord(dm, fun) {
  dm.disableHistoryManager();
  fun();
  dm.enableHistoryManager();
}

/**
 * 返回相应位数质量码打状态
 * '0': 正常
 * '-1': 不存在 #
 * '1000000000000000': 没权限！
 */
export function getBitValid(s) {
  if (!s) return false;
  let result = true;
  for (let position = 63; position > 53; position -= 1) {
    result = result && validBit(s, position);
  }
  return result;
}

function validBit(s, n) {
  const s1 = s.slice(-8);
  const s2 = s.slice(0, -8);
  if (n >= 32) {
    return (parseInt(s2, 16) & (1 << (n - 32))) === 0;
  }
  return (parseInt(s1, 16) & (1 << n)) === 0;
}

/**
 * @description 根据对象属性过滤最大值 最小值类别
 * @param {array} list 对象属性信息
 * @returns {object} gt 大于  ge 大于等于   lt 小于  le 小于等于  greather 大于  less 小于
 */
export function filterGreAndLess(list) {
  let gt = [];
  let ge = [];
  let lt = [];
  let le = [];
  _.map(list, (item) => {
    const limitValue = Number(item.limitValue);
    if (!isNaN(limitValue)) {
      const { alertType, showName } = item;
      const unitObj = {
        limitValue,
        enabled: item.enabled,
        alertType,
        showName,
        name: item.name,
      };
      switch (alertType.toLowerCase()) {
        case "gt":
          if (!_.includes(gt, limitValue)) {
            unitObj.key = "gt";
            gt.push(unitObj);
          }
          break;
        case "ge":
          if (!_.includes(ge, limitValue)) {
            unitObj.key = "ge";
            ge.push(unitObj);
          }
          break;
        case "lt":
          if (!_.includes(lt, limitValue)) {
            unitObj.key = "lt";
            lt.push(unitObj);
          }
          break;
        case "le":
          if (!_.includes(le, { limitValue })) {
            unitObj.key = "le";
            le.push(unitObj);
          }
          break;
        default:
          break;
      }
    }
  });
  let greather = _.concat(gt, ge);
  let less = _.concat(lt, le);
  gt = _.sortBy(gt, (o) => o.limitValue);
  ge = _.sortBy(ge, (o) => o.limitValue);
  lt = _.sortBy(lt, (o) => o.limitValue);
  le = _.sortBy(le, (o) => o.limitValue);
  greather = _.sortBy(greather, (o) => o.limitValue);
  less = _.sortBy(less, (o) => o.limitValue);
  return { gt, ge, lt, le, greather, less };
}

/**
 * 根据datalink配置信息，返回节点文字内容
 * @param {} dataLinkModel datalink配置信息
 */
export function getDataLinkText(dataLinkModel, onlyName, isRuntime) {
  const {
    showName,
    showUnit,
    decimal,
    integer = 1,
    dataSourceType = "object",
  } = dataLinkModel;
  let { nameType, showValue } = dataLinkModel;
  if (!nameType && nameType !== 0) {
    nameType = showName ? 1 : 0;
  }
  if (showValue === undefined) {
    showValue = true;
  }
  let text = "";
  let unitText = "";
  // if (showName && name) text += name;
  if (dataSourceType === "object") {
    const {
      object: {
        selectedProp: {
          objectName,
          objectShowName,
          propertyName,
          showName: propertyShowName,
          unit,
        } = {},
        selectedInstance: {
          name: instanceName,
          showName: instanceShowName,
        } = {},
        selectedTemplate: {
          name: templateName,
          showName: templateShowName,
        } = {},
      } = {},
    } = dataLinkModel;
    let {
      object: { isCustomGraph },
    } = dataLinkModel;
    if (isRuntime) {
      isCustomGraph = false;
    }
    const brText = showValue || showUnit ? "\n" : "";
    switch (nameType) {
      case 0:
        break;
      case 1:
        text += `${
          isCustomGraph ? templateShowName : objectShowName || instanceShowName
        }\\${propertyShowName}${brText}`;
        break;
      case 2:
        text += `${
          isCustomGraph ? templateName : objectName || instanceName
        }\\${propertyName}${brText}`;
        break;
      case 3:
        text += `${propertyShowName}${brText}`;
        break;
      case 4:
        text += `${propertyName}${brText}`;
        break;
      default: {
        break;
      }
    }
    unitText = unit;
  }

  if (!onlyName) {
    if (showValue) {
      for (let i = 0; i < integer; i += 1) {
        text += "?";
      }
      if (decimal) text += ".";
      for (let i = 0; i < decimal; i += 1) {
        text += "?";
      }
    }
    if (showUnit && unitText) text += unitText;
  }
  return text;
}

/**
 * @description 判断是否属于知之浏览器
 * @returns {boolean} true false
 */
export function isZhizhiBrowser() {
  return !!navigator.userAgent.match(/Zhizhi/i);
}

export function isMobile() {
  return !!navigator.userAgent.match(
    /(phone|pad|pod|iPhone|iPod|ios|iPad|Android|Mobile|BlackBerry|IEMobile|MQQBrowser|JUC|Fennec|wOSBrowser|BrowserNG|WebOS|Symbian|Windows Phone)/i
  );
}

export function isAndroid() {
  return !!navigator.userAgent.match(/(Android)/i);
}

/**
 * @description 将页面路径存储到app-creator-interface 的sessionStorage
 * 为了刷新也买那保留当前页面
 * @param {string} url 页面切换的路径
 */
export function storedUrlToAppCreator(url) {
  if (window !== window.top) {
    window.parent.postMessage({ "app-creator-interface": url || "" }, "*");
  }
}

/**
 * @description 数字类型校验  判断是不是数字  不是的话返回一个默认值
 * @param {any} value 需要转换的值
 * @param {any} defaultValue 不满足条件默认转换的值  默认为 0
 */
export function valueToDigital(value, defaultValue = 0) {
  value -= 0;
  return isNaN(value) ? defaultValue : value;
}

const lunarInfo = [
  0x4bd8,
  0x4ae0,
  0xa570,
  0x54d5,
  0xd260,
  0xd950,
  0x5554,
  0x56af,
  0x9ad0,
  0x55d2,
  0x4ae0,
  0xa5b6,
  0xa4d0,
  0xd250,
  0xd255,
  0xb54f,
  0xd6a0,
  0xada2,
  0x95b0,
  0x4977,
  0x497f,
  0xa4b0,
  0xb4b5,
  0x6a50,
  0x6d40,
  0xab54,
  0x2b6f,
  0x9570,
  0x52f2,
  0x4970,
  0x6566,
  0xd4a0,
  0xea50,
  0x6a95,
  0x5adf,
  0x2b60,
  0x86e3,
  0x92ef,
  0xc8d7,
  0xc95f,
  0xd4a0,
  0xd8a6,
  0xb55f,
  0x56a0,
  0xa5b4,
  0x25df,
  0x92d0,
  0xd2b2,
  0xa950,
  0xb557,
  0x6ca0,
  0xb550,
  0x5355,
  0x4daf,
  0xa5b0,
  0x4573,
  0x52bf,
  0xa9a8,
  0xe950,
  0x6aa0,
  0xaea6,
  0xab50,
  0x4b60,
  0xaae4,
  0xa570,
  0x5260,
  0xf263,
  0xd950,
  0x5b57,
  0x56a0,
  0x96d0,
  0x4dd5,
  0x4ad0,
  0xa4d0,
  0xd4d4,
  0xd250,
  0xd558,
  0xb540,
  0xb6a0,
  0x95a6,
  0x95bf,
  0x49b0,
  0xa974,
  0xa4b0,
  0xb27a,
  0x6a50,
  0x6d40,
  0xaf46,
  0xab60,
  0x9570,
  0x4af5,
  0x4970,
  0x64b0,
  0x74a3,
  0xea50,
  0x6b58,
  0x5ac0,
  0xab60,
  0x96d5,
  0x92e0,
  0xc960,
  0xd954,
  0xd4a0,
  0xda50,
  0x7552,
  0x56a0,
  0xabb7,
  0x25d0,
  0x92d0,
  0xcab5,
  0xa950,
  0xb4a0,
  0xbaa4,
  0xad50,
  0x55d9,
  0x4ba0,
  0xa5b0,
  0x5176,
  0x52bf,
  0xa930,
  0x7954,
  0x6aa0,
  0xad50,
  0x5b52,
  0x4b60,
  0xa6e6,
  0xa4e0,
  0xd260,
  0xea65,
  0xd530,
  0x5aa0,
  0x76a3,
  0x96d0,
  0x4afb,
  0x4ad0,
  0xa4d0,
  0xd0b6,
  0xd25f,
  0xd520,
  0xdd45,
  0xb5a0,
  0x56d0,
  0x55b2,
  0x49b0,
  0xa577,
  0xa4b0,
  0xaa50,
  0xb255,
  0x6d2f,
  0xada0,
  0x4b63,
  0x937f,
  0x49f8,
  0x4970,
  0x64b0,
  0x68a6,
  0xea5f,
  0x6b20,
  0xa6c4,
  0xaaef,
  0x92e0,
  0xd2e3,
  0xc960,
  0xd557,
  0xd4a0,
  0xda50,
  0x5d55,
  0x56a0,
  0xa6d0,
  0x55d4,
  0x52d0,
  0xa9b8,
  0xa950,
  0xb4a0,
  0xb6a6,
  0xad50,
  0x55a0,
  0xaba4,
  0xa5b0,
  0x52b0,
  0xb273,
  0x6930,
  0x7337,
  0x6aa0,
  0xad50,
  0x4b55,
  0x4b6f,
  0xa570,
  0x54e4,
  0xd260,
  0xe968,
  0xd520,
  0xdaa0,
  0x6aa6,
  0x56df,
  0x4ae0,
  0xa9d4,
  0xa4d0,
  0xd150,
  0xf252,
  0xd520,
];
const monString = "正二三四五六七八九十冬腊";
const numString = "一二三四五六七八九十";
function leapMonth(y) {
  const lm = lunarInfo[y - 1900] & 0xf;
  return lm === 0xf ? 0 : lm;
}

function monthDays(y, m) {
  return lunarInfo[y - 1900] & (0x10000 >> m) ? 30 : 29;
}

function leapDays(y) {
  if (leapMonth(y)) {
    return (lunarInfo[y - 1899] & 0xf) === 0xf ? 30 : 29;
  } else {
    return 0;
  }
}

function lYearDays(y) {
  let i;
  let sum = 348;

  for (i = 0x8000; i > 0x8; i >>= 1) {
    sum += lunarInfo[y - 1900] & i ? 1 : 0;
  }

  return sum + leapDays(y);
}
/**
 * @description 日期转农历
 * @param {date} date 需要转换的日期
 * @return {object} 输出农历 {date:'2019-03-21',cn:'2019年-三月-廿一'}
 */
export function getLunarDay(date) {
  const objDate = new Date(date);
  let i;
  let leap = 0;
  let temp = 0;
  let year = "";
  let month = "";
  let day = "";
  let isLeap = false;
  let offset =
    (Date.UTC(objDate.getFullYear(), objDate.getMonth(), objDate.getDate()) -
      Date.UTC(1900, 0, 31)) /
    86400000;

  for (i = 1900; i < 2100 && offset > 0; i += 1) {
    temp = lYearDays(i);
    offset -= temp;
  }

  if (offset < 0) {
    offset += temp;
    i -= 1;
  }

  year = i;
  leap = leapMonth(i); // 闰哪个月
  isLeap = false;

  for (i = 1; i < 13 && offset > 0; i += 1) {
    // 闰月
    if (leap > 0 && i === leap + 1 && isLeap === false) {
      i -= 1;
      isLeap = true;
      temp = leapDays(year);
    } else {
      temp = monthDays(year, i);
    }

    // 解除闰月
    if (isLeap === true && i === leap + 1) isLeap = false;

    offset -= temp;
  }

  if (offset === 0 && leap > 0 && i === leap + 1) {
    if (isLeap) {
      isLeap = false;
    } else {
      isLeap = true;
      i -= 1;
    }
  }

  if (offset < 0) {
    offset += temp;
    i -= 1;
  }

  month = i;
  day = offset + 1;

  const cnYear = `${year}年`;
  let cnMonth = "";
  let cnDay = "";

  if (isLeap) {
    cnMonth += "(闰)";
    cnMonth += monString.charAt(-month - 1);
  } else {
    cnMonth += monString.charAt(month - 1);
  }
  cnMonth += "月";

  cnDay = day < 11 ? "初" : day < 20 ? "十" : day < 30 ? "廿" : "三十";
  if (day % 10 !== 0 || day === 10) {
    cnDay += numString.charAt((day - 1) % 10);
  }

  month = month < 10 ? `0${month}` : month;
  day = day < 10 ? `0${day}` : day;

  return {
    date: `${year}-${month}-${day}`,
    cn: `${cnYear}-${cnMonth}-${cnDay}`,
  };
}

/**
 * @description 判断节点是否在自定义图元中
 * @returns {boolean} true false
 */
export function isInCustomGraph(node) {
  return getIsInCustomGraph(node);
}
function getIsInCustomGraph(node) {
  let parent;
  if (node && node.getParent) {
    parent = node.getParent();
  }
  if (!parent) {
    return false;
  } else if (parent.a("symbolId")) {
    return true;
  } else {
    return getIsInCustomGraph(parent);
  }
}

/**
 * @description 获取嵌有 iframe 页面的最顶层 supOS 的页面
 * @param {object} win window || window.parent
 * @returns {object} win 最顶层 supOS 的窗口
 */
export function getWindowWrapper(win = window) {
  try {
    if (win.parent.sign !== "supOS" || win === win.parent) {
      return win;
    } else {
      return getWindowWrapper(win.parent);
    }
  } catch (error) {
    return win;
  }
}

/**
 * @description 获取全屏dom元素
 * @returns {boolean}
 */
export function getFullScreenElement() {
  const win = getWindowWrapper();
  const {
    fullscreenElement,
    msFullscreenElement,
    mozFullScreenElement,
    webkitFullscreenElement,
  } = win.document;
  return (
    fullscreenElement ||
    msFullscreenElement ||
    mozFullScreenElement ||
    webkitFullscreenElement ||
    false
  );
}

export function isSameDomain() {
  try {
    const topDomain = _.get(window, "top.document.domain", "localhost");
    const currentDomain = _.get(window, "document.domain", "localhost");

    // 工作流嵌套的页面返回false，目的：如果嵌套的页面缺少必需的数据（如localStorage中的basicFlatMenu），需要重新加载
    if (
      topDomain === currentDomain &&
      _.get(window, "top.location.pathname", "") === "/project/flow/"
    ) {
      return false;
    }

    return (
      topDomain === currentDomain &&
      self.frameElement &&
      self.frameElement.tagName === "IFRAME"
    );
  } catch (e) {
    return false;
  }
}

/**
 * @description json压缩
 * @param {*} json
 */
export function zip(json) {
  try {
    const str = JSON.stringify(json);
    const deflate = new pako.Deflate({ level: 6, to: "string" });
    deflate.push(str, true);
    return deflate.result;
  } catch (e) {
    return json;
  }
}

/**
 * @description json解压
 * @param {*} binaryString
 */
export function unzip(binaryString) {
  try {
    const str = pako.inflate(binaryString, { to: "string" });
    const json = JSON.parse(str);
    return json;
  } catch (e) {
    return binaryString;
  }
}

/**
 * @description json解压
 * @param {url} string
 */
export function openNewTab(url) {
  let a = document.createElement("a");
  a.href = url;
  a.target = "_blank";
  a.rel = "noopener";
  a.click();
  a = null;
}

/**
 * debug模式
 */
export function isDebug() {
  return window.location.href.indexOf("testDebug") !== -1;
}

/**
 * @description 获取同源的最顶层window
 * @param {win} Object
 */
export function getSameOriginTop(win) {
  const thisWindow = win || window;
  let result;
  let resultZhizhi = thisWindow;
  try {
    const parentHost = thisWindow.parent.location.host;
    result =
      thisWindow !== thisWindow.parent
        ? getSameOriginTop(thisWindow.parent, parentHost)
        : thisWindow;
    resultZhizhi = result.zhizhiDispatchAppEvent ? result : resultZhizhi;
  } catch (e) {
    result = thisWindow;
    resultZhizhi = result.zhizhiDispatchAppEvent ? result : resultZhizhi;
  }
  return { result, resultZhizhi };
}

export function browser() {
  if (!!window.ActiveXObject || "ActiveXObject" in window) {
    return "IE";
  }
}

/**
 *  设置cookie
 * @param {string} key 名称
 * @param {string} value 值
 * @param {number} time 过期时间 毫秒数
 */
export function setCookie(key, value, time) {
  const now = new Date();
  now.setTime(now.getTime() + time);
  const expires = `expires=${now.toGMTString()}`;

  document.cookie = `${key}=${value}${time ? `; ${expires}` : ""}`;
}

/**
 * 获取cookie
 * @param {string} key 名称
 */
export function getCookie(key) {
  const name = `${key}=`;
  const cookieAttr = document.cookie.split(";");
  let value = "";

  for (const i in cookieAttr) {
    if (cookieAttr[i].includes(name)) {
      const trimData = cookieAttr[i].trim();
      value = trimData.substring(name.length);
    }
  }

  return value;
}

/**
 * rgba转hex
 * @param {string} color 颜色
 */
export function RGBA2HEX(color) {
  const rgba = color
    .replace(/rgba?\(/, "")
    .replace(/\)/, "")
    .replace(/[\s+]/g, "")
    .split(",");
  let result = color;
  if (rgba.length > 1) {
    const r = `0${parseInt(rgba[0], 10).toString(16)}`.slice(-2);
    const g = `0${parseInt(rgba[1], 10).toString(16)}`.slice(-2);
    const b = `0${parseInt(rgba[2], 10).toString(16)}`.slice(-2);
    result = `#${r}${g}${b}`;
  }
  if (result[0] === "#" && result.length === 4) {
    result = `#${result[1]}${result[1]}${result[2]}${result[2]}${result[3]}${result[3]}`;
  }
  return result;
}

/**
 * hex转rgba
 * @param {string} color 颜色
 */
export function HEX2RGBA(color) {
  let result = color;
  if (color.indexOf("#") === 0) {
    if (color.length === 4) {
      color = `#${result[1]}${result[1]}${result[2]}${result[2]}${result[3]}${result[3]}`;
    }
    const r = parseInt(`0x${color.slice(1, 3)}`, 16);
    const g = parseInt(`0x${color.slice(3, 5)}`, 16);
    const b = parseInt(`0x${color.slice(5, 7)}`, 16);
    result = `rgba(${r}, ${g}, ${b}, 1)`;
  }
  return result;
}

/**
 * 颜色转需要的对象
 * @param {string} color 颜色
 */
export function getRgbaObj(color) {
  let temp = color;
  if (temp.indexOf("#") === 0) {
    temp = HEX2RGBA(temp);
  }
  const rgba = color
    .replace(/rgba?\(/, "")
    .replace(/\)/, "")
    .replace(/[\s+]/g, "")
    .split(",");
  return {
    r: rgba[0],
    g: rgba[1],
    b: rgba[2],
    a: rgba[3] || 1,
  };
}

/**
 * replace脚本, 默认加上appId
 * @param {script} script 脚本
 */
export function appIdAutoChange(script) {
  if (!script) {
    return script;
  }
  const funcName = [
    "scriptUtil.addDataTable",
    "scriptUtil.delDataTable",
    "scriptUtil.updateDataTable",
    "scriptUtil.queryDataTable",
    "scriptUtil.excuteScriptService",
    "scriptUtil.executeScriptService",
    "scriptUtil.request",
    "scriptUtil.fromPath",
    "scriptUtil.callFunction",
    "scriptUtil.callSqlFunction",
  ];
  funcName.forEach((name) => {
    const reg1 = new RegExp(`${name}\\(`, "g");
    script = script.replace(reg1, `${name}(__appId,`);
  });
  return script;
}

export function isJSON(str) {
  if (typeof str === "string") {
    try {
      const obj = JSON.parse(str);
      if (typeof obj === "object" && obj) {
        return true;
      } else {
        return false;
      }
    } catch (e) {
      console.log(`error：${str}!!!${e}`);
      return false;
    }
  }
  console.log("It is not a string!");
}

// 脚本报错
export function jsError(fn, errorConfig = {}, intl) {
  const {
    pageName = "",
    widgetName = "",
    widgetIndex = "",
    action = "",
    type = "free",
  } = errorConfig;

  try {
    if (fn) return fn();
  } catch (error) {
    jsErrorNotification({
      pageName,
      widgetName,
      widgetIndex,
      action,
      errorMessage: error.message,
      intl,
      type,
    });
    console.log(error);
  }
}

export function jsErrorNotification({
  pageName,
  widgetName,
  widgetIndex,
  action,
  errorMessage,
  intl,
} = {}) {
  let widgetNameDisplay;
  if (intl) {
    let widgetNameM = [];
    const widgetNameGroup = groupListJson;

    Object.keys(widgetNameGroup).forEach((key) => {
      widgetNameM = widgetNameM.concat(widgetNameGroup[key]);
    });
    widgetNameDisplay =
      widgetNameM.find((widget) => widget.id === widgetName) &&
      widgetNameM.find((widget) => widget.id === widgetName).displayName[
        localStorage.getItem("language")
      ];
  }

  let actionName;
  if (intl) {
    const actionGroups = allActions(intl);
    actionName =
      actionGroups.find((act) => act.value === action) &&
      actionGroups.find((act) => act.value === action).label;
    console.log("actionName", actionName);
  }

  setTimeout(() => {
    notification.open({
      message: intl.formatMessage(commonMessage.scriptError),
      description: (
        <React.Fragment>
          <span style={{ display: "inline-block", margin: "2.5px 0" }}>
            {intl.formatMessage(commonMessage.pageName)}:{" "}
            <span>{pageName}</span>
          </span>
          <br />
          <span style={{ display: "inline-block", margin: "2.5px 0" }}>
            {intl.formatMessage(commonMessage.errorWidget)}:{" "}
            <span>{widgetNameDisplay || widgetName}</span>
          </span>
          <br />
          {widgetIndex && (
            <span style={{ display: "inline-block", margin: "2.5px 0" }}>
              {intl.formatMessage(commonMessage.widgetID)}:{" "}
              <span>{widgetIndex}</span>
            </span>
          )}
          {widgetIndex && <br />}
          <span style={{ display: "inline-block", margin: "2.5px 0" }}>
            {intl.formatMessage(commonMessage.scriptEventName)}:{" "}
            <span>{actionName || action}</span>
          </span>
          <br />
          <span style={{ display: "inline-block", margin: "2.5px 0" }}>
            {intl.formatMessage(commonMessage.errorTip)}:{" "}
            <span>{errorMessage}</span>
          </span>
        </React.Fragment>
      ),
    });
  }, 0);
}

export function imgBeforeUpload(
  intl,
  file,
  { isCustomPic, isSize, size = 10, messageInfo } = {}
) {
  let lastName =
    file.name && file.name.lastIndexOf(".") >= 0
      ? file.name.substring(file.name.lastIndexOf("."))
      : "";
  const isLt5M = file.size / 1024 / 1024 < size;
  if (lastName) {
    lastName = lastName.toLowerCase();
  }
  const lastNameArr = isCustomPic || [
    ".jpg",
    ".jpeg",
    ".png",
    ".gif",
    ".svg",
    ".ico",
  ];
  const result = (isSize ? isLt5M : true) && lastNameArr.indexOf(lastName) >= 0;
  if (!result) {
    message.error(
      messageInfo || intl.formatMessage(commonMessage.SystemInfoRule)
    );
  }
  return result ? beforeUpload(file) : false;
}

export function beforeUpload(file, isUploadRuntime = false) {
  return new Promise((resolve) => {
    // const name = file && file.name.replace(/#/g, '_');
    const name =
      file && isUploadRuntime ? file.name : file.name.replace(/#/g, "_"); // 4.2.1.8要求上传组件上传文件去除文件名#转换为_逻辑
    const newFile = new File([file], name, { type: file.type });
    newFile.uid = file.uid;

    const reader = new FileReader();
    reader.readAsDataURL(newFile);
    resolve(newFile);
  });
}

export const upperCaseFirstLetter = (name) => {
  return name.charAt(0).toUpperCase() + name.slice(1);
};

export function getGroupListJson() {
  const lang = getLocalLanguage();
  const key = Object.keys(groupListJson);
  const langMap = {
    "zh-cn": "zh-cn",
    "en-us": "en-us",
    "de-de": "de-de",
    "zh-hk": "zh-hk",
  };
  const listJson = {};
  key.forEach((k) => {
    groupListJson[k].forEach((item) => {
      const name = item.displayName;
      const prop = {
        ...item,
        displayName: name[langMap[lang] || "zh-cn"],
      };
      if (!listJson[k]) {
        listJson[k] = [];
      }
      listJson[k].push(prop);
    });
  });
  return listJson;
}

// 复制对象
export function copy(intl, value, callback) {
  const { formatMessage } = intl;
  const copyValue = typeof value === "string" ? value : JSON.stringify(value);
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
    message.success(formatMessage(commonMessage.copySuccess1));
  } else {
    message.warning(formatMessage(commonMessage.copyError));
    if (callback) callback();
  }
  // 将 input 元素移除
  document.body.removeChild(copyDom);
}

export function randomUrl(url) {
  if (!url) return;
  if (_.includes(url, "?")) {
    return url.replace("?", `?random=${Math.random()}&`);
  }
  if (_.includes(url, "#")) {
    return `${_.split(url, "#")[0]}?random=${Math.random()}#${
      _.split(url, "#")[1]
    }`;
  }
  return `${url}?random=${Math.random()}`;
}

function getPageID(location) {
  let pageID = _.get(location, "hash", "")
    .split("/")
    .find((a) => a && a.includes("Page_"));
  if (pageID && pageID.includes("&") && pageID.includes("=")) {
    pageID = pageID && pageID.split("&").find((a) => a && a.includes("Page_"));
    pageID = pageID && pageID.split("=").find((a) => a && a.includes("Page_"));
  }
  return pageID;
}

export function setIntervalInner(fn, mins) {
  const id = window.setInterval(fn, mins);
  const pageID = getPageID(window.location);
  if (!window.COMPVIEW.SETTIMEID) {
    window.COMPVIEW.SETTIMEID = {};
  }
  if (!window.COMPVIEW.SETTIMEID[pageID]) {
    window.COMPVIEW.SETTIMEID[pageID] = [id];
  }
  if (_.isArray(window[pageID])) {
    window.COMPVIEW.SETTIMEID[pageID].push(id);
  }
}

export function clearIntervalInner(location = window.location) {
  const pageID = getPageID(location);
  if (window.COMPVIEW.SETTIMEID && window.COMPVIEW.SETTIMEID[pageID]) {
    window.COMPVIEW.SETTIMEID[pageID].forEach((id) => {
      window.clearInterval(id);
    });
    delete window.COMPVIEW.SETTIMEID[pageID];
  }
}

export function getInitLayoutConfig(pageId, layoutId, name) {
  return {
    layoutNodes: [
      {
        kind: "free",
        col: 1,
        colW: 200,
        w: 240,
        h: 40.9,
        x: 0,
        y: 0,
        i: name,
        moved: false,
        static: false,
        isResizable: false,
        minW: 1,
        minH: 1,
        type: "2",
        lw: window.document.documentElement.clientWidth,
        lh: window.document.documentElement.clientHeight,
        opacity: 0,
        id: layoutId,
      },
    ],
    pageConfig: {
      platformLayoutType: "PC",
      singleLayout: true,
      lwType: "1",
      lwValue: 0,
      lhValue: 0,
      linkage: "0",
      background: "",
      pageId,
      keepLogin: true,
    },
    version: "v1.1",
  };
}

export function getStaticPath(
  url,
  encode = true,
  isSuposRuntime = false,
  isBusiness = window.COMPVIEW.isBusiness
) {
  // 远程调式 图片资源取本地资源地址 isSuposRuntime = false
  if (window.COMPVIEW?.remoteid) {
    isSuposRuntime = false;
  }
  if (isBusiness) {
    return url;
  }
  if (url && encode) {
    const urlTemp = url.split("?");
    const urlArr = urlTemp[0].split("/") || [];
    const encodePath = encodeURIComponent(urlArr.pop());
    url = `${[...urlArr, encodePath].join("/")}?${urlTemp[1]}`;
  }
  if (/^(localapp:\/\/)/.test(url)) {
    if (isSuposRuntime) {
      let loginMsg = localStorage.getItem("loginMsg") || "{}";
      if (loginMsg !== "undefined") {
        loginMsg = JSON.parse(loginMsg);
      }
      const { tenantId = "" } = loginMsg;
      return url.replace("localapp://", `${STATICBASE_RUNTIME}${tenantId}/`);
    } else {
      return url.replace("localapp://", STATICBASE_DESIGN);
    }
  }
  return url;
}

export function getInnerPageUrl(
  pageId,
  appId,
  isSuposRuntime,
  isBusiness = window.COMPVIEW.isBusiness
) {
  let url = "";
  /* global ISDEV */
  if (isSuposRuntime) {
    // todo 远程调式 地址
    if (window.COMPVIEW?.remoteid) {
      if (ISDEV) {
        url = `/#/compview/runtime/${pageId}/${window.COMPVIEW?.remoteid}?isPreview=true&isSuposRuntime=true`;
      } else {
        url = `/compview/runtime/${pageId}/${window.COMPVIEW?.remoteid}`;
      }
    } else if (isBusiness) {
      url = `${ISDEV ? "/" : "/main/"}#/application-runtime/${pageId}`;
    } else {
      url = `${
        ISDEV ? "/" : "/main/"
      }#/lcdp-runtime/v1/apps/${appId}/menus/compview/compViews/${pageId}`;
    }
  } else {
    url = `${ISDEV ? "/#" : ""}/compview/runtime/${pageId}`;
  }
  return url;
}

export function openPageReplaceScript(script, appId, isSuposRuntime) {
  if (/\${###([\s\S]*)###}/.test(script)) {
    const [, pageId] = script.match(/\${###([\s\S]*)###}/);
    const scriptUrl = getInnerPageUrl(pageId, appId, isSuposRuntime);
    script = script.replace(/\${###([\s\S]*)###}/, scriptUrl);
  }
  return script;
}

// 新增Tag 图元库共用
export function addHtNodeTag(data, editor) {
  editor = editor || window.COMPVIEW.editor;
  if (!editor) return;
  const nodeType = getNodeType(data);
  window.COMPVIEW[`${nodeType}Index`] =
    window.COMPVIEW[`${nodeType}Index`] || 1;
  if (
    editor.dm.getDataByTag(`${nodeType}${window.COMPVIEW[`${nodeType}Index`]}`)
  ) {
    window.COMPVIEW[`${nodeType}Index`] += 1;
    addHtNodeTag(data, editor);
  } else {
    data.setTag(`${nodeType}${window.COMPVIEW[`${nodeType}Index`]}`);
    window.COMPVIEW[`${nodeType}Index`] += 1;
  }
}

export function FastClickEvent() {
  const deviceIsWindowsPhone =
    navigator.userAgent.indexOf("Windows Phone") >= 0;

  const deviceIsIOS =
    /iP(ad|hone|od)/.test(navigator.userAgent) && !deviceIsWindowsPhone;

  FastClick.prototype.focus = function(targetElement) {
    let lengthValue;

    // Issue #160: on iOS 7, some input elements (e.g. date datetime month) throw a vague TypeError on setSelectionRange. These elements don't have an integer value for the selectionStart and selectionEnd properties, but unfortunately that can't be used for detection because accessing the properties also throws a TypeError. Just check the type instead. Filed as Apple bug #15122724.
    if (
      deviceIsIOS &&
      targetElement.setSelectionRange &&
      targetElement.type.indexOf("date") !== 0 &&
      targetElement.type !== "time" &&
      targetElement.type !== "month"
    ) {
      lengthValue = targetElement.value.length;
      targetElement.setSelectionRange(lengthValue, lengthValue);
    }
    //  修复ios 11.3以上不弹出键盘，这里加上聚焦代码，让其强制聚焦弹出
    targetElement.focus();
  };
  return FastClick;
}

// 中英文数字混合排序
export function asciiSort(arr, sortKey, type = "asc") {
  const sortFun = (a, b) => {
    const aVal = _.get(a, [sortKey]);
    const bVal = _.get(b, [sortKey]);
    if (!aVal) return 1;
    if (typeof aVal === "number") {
      if (typeof bVal !== "number") {
        return -1;
      } else {
        return aVal - bVal;
      }
    }
    if (typeof aVal === "boolean") {
      if (typeof bVal !== "boolean") {
        return -1;
      } else {
        const aValNum = aVal === true ? 1 : 0;
        const bValNum = bVal === true ? 1 : 0;
        return aValNum - bValNum;
      }
    }
    if (/^[a-z]/i.test(aVal) || /^[a-z]/i.test(bVal)) {
      if (
        /^[a-z][\u4e00-\u9fa5]/i.test(aVal) &&
        /^[a-z][\u4e00-\u9fa5]/i.test(bVal)
      )
        return aVal.localeCompare(bVal, "zh-cn");
      return aVal.localeCompare(bVal, "en");
    } else {
      return aVal.localeCompare(bVal, "zh-cn");
    }
  };
  arr.sort(sortFun);
  return type === "desc" ? arr.reverse() : arr;
}

export function setNodeSelecteble(node, value, top) {
  const nodeType = getNodeType(node);
  if (nodeType === "group" || nodeType === "customSymbol") {
    node.eachChild((child) => {
      setNodeSelecteble(child, value);
    });
  }
  if (node.getAttr && node.getAttr("tempSelectable") !== undefined && top) {
    node.setAttr("tempSelectable", value);
  }
  if (node.getAttr && node.getAttr("tempSelectable") === undefined && !top) {
    node.setAttr("tempSelectable", node.getStyle("2d.selectable"));
  }
  if (top) {
    node.setStyle("2d.selectable", value);
  } else if (value) {
    node.setStyle("2d.selectable", node.getAttr("tempSelectable"));
  } else {
    node.setStyle("2d.selectable", value);
  }
}

export function getRemoteHeader() {
  if (!_.isEmpty(window.COMPVIEW?.remoteid)) {
    const { path, token, mode } = window._remote_debug_?.getEnv(
      window.COMPVIEW?.remoteid
    ) || {
      path: "10.30.44.130:8080",
      token: "Bearer RqvRYNLhFKxfZ6FYBuyT6",
      mode: "remote",
    };
    /* global ISDEV */
    if (ISDEV) {
      window._remote_debug_ = {};
      window._remote_debug_.getEnv = function() {
        return { path, token, mode };
      };
    }
    return mode === "local"
      ? {
          "X-DEBUG-MODE": mode,
        }
      : path && token
      ? {
          "X-DEBUG-MODE": mode,
          "X-DEBUG-AUTHORIZATION": token,
          "X-DEBUG-REMOTE-SERVER-ADDR": path,
        }
      : {};
  }
  return {};
}

/**
 * 十六进制color颜色/RGBA/RGB，改变透明度
 * @param {*} thisColor #555 rgba(85,85,85,0.6) rgb(85,85,85)
 * @param {*} thisOpacity 0.7
 * @returns rgba(85,85,85,0.7)
 */
export function getOpacityColor(thisColor, thisOpacity) {
  let theColor = thisColor.toLowerCase();
  // 十六进制颜色值的正则表达式
  const r = /^#([0-9a-fA-f]{3}|[0-9a-fA-f]{6})$/;
  // 如果是16进制颜色
  if (theColor && r.test(theColor)) {
    if (theColor.length === 4) {
      let sColorNew = "#";
      for (let i = 1; i < 4; i += 1) {
        sColorNew += theColor.slice(i, i + 1).concat(theColor.slice(i, i + 1));
      }
      theColor = sColorNew;
    }
    // 处理六位的颜色值
    const sColorChange = [];
    for (let j = 1; j < 7; j += 2) {
      sColorChange.push(parseInt(`0x${theColor.slice(j, j + 2)}`, 16));
    }
    return `rgba(${sColorChange.join(",")},${thisOpacity})`;
  }
  // 如果是rgba或者rgb
  if (theColor.startsWith("rgb")) {
    let numbers = theColor.match(/(\d(\.\d+)?)+/g);
    numbers = numbers.slice(0, 3).concat(thisOpacity);
    return `rgba(${numbers.join(",")})`;
  }
  return theColor;
}

/**
 * 给指定url添加查询参数
 * 参考 https://github.com/axios/axios/blob/9bd53214f6339c3064d4faee91c223b35846f2dd/lib/helpers/buildURL.js
 * @param {*} url url
 * @param {*} searchQuery 查询参数
 * @returns url
 */
export function appendURLSearch(url, searchQuery) {
  if (!searchQuery) {
    return url;
  }

  let hashmarkUrl = ""; // hash路由部分

  const hashmarkIndex = url.indexOf("#");
  if (hashmarkIndex !== -1) {
    hashmarkUrl = url.slice(hashmarkIndex);
    url = url.slice(0, hashmarkIndex);
  }

  url += (url.indexOf("?") === -1 ? "?" : "&") + searchQuery + hashmarkUrl;
  return url;
}

/**
 * 给指定url添加查询参数; 直接拼接在url最后
 * @param {*} url url
 * @param {*} searchQuery 查询参数
 * @returns url
 */
export function appendLastURLSearch(url, searchQuery) {
  if (!searchQuery) {
    return url;
  }

  const hashmarkIndex = url.indexOf("#");
  const lastQueryIndex = url.lastIndexOf("?");

  if (hashmarkIndex > -1) {
    // 存在hash
    if (lastQueryIndex > hashmarkIndex) {
      // 在hash之后存在query
      return `${url.slice(0, lastQueryIndex + 1)}${searchQuery}&${url.slice(
        lastQueryIndex + 1
      )}`;
    } else {
      return `${url}?${searchQuery}`;
    }
  }

  // 不存在hash
  if (lastQueryIndex > -1) {
    // 存在query
    return url.replace("?", `?${searchQuery}&`);
  }

  return `${url}?${searchQuery}`;
}

export function getTranslate(node, sty) {
  // 获取transform值
  const translates = document.defaultView
    .getComputedStyle(node, null)
    .transform.substring(7);
  const result = translates.match(/\(([^)]*)\)/); // 正则()内容
  const matrix = result ? result[1].split(",") : translates.split(",");
  if (sty === "x" || sty === undefined) {
    return matrix.length > 6 ? parseFloat(matrix[12]) : parseFloat(matrix[4]);
  } else if (sty === "y") {
    return matrix.length > 6 ? parseFloat(matrix[13]) : parseFloat(matrix[5]);
  } else if (sty === "z") {
    return matrix.length > 6 ? parseFloat(matrix[14]) : 0;
  } else if (sty === "rotate") {
    return matrix.length > 6
      ? getRotate([
          parseFloat(matrix[0]),
          parseFloat(matrix[1]),
          parseFloat(matrix[4]),
          parseFloat(matrix[5]),
        ])
      : getRotate(matrix);
  }
}
export function getRotate(matrix) {
  const aa = Math.round((180 * Math.asin(matrix[0])) / Math.PI);
  const bb = Math.round((180 * Math.acos(matrix[1])) / Math.PI);
  const cc = Math.round((180 * Math.asin(matrix[2])) / Math.PI);
  const dd = Math.round((180 * Math.acos(matrix[3])) / Math.PI);
  let deg = 0;
  if (aa === bb || -aa === bb) {
    deg = dd;
  } else if (bb - aa === 180) {
    deg = 180 + cc;
  } else if (aa + bb === 180) {
    deg = 360 - cc || 360 - dd;
  }
  return deg >= 360 ? 0 : deg;
}

function countToDoTest(count, toTest) {
  const waitingTimmer = setInterval(() => {
    console.log(`Testing will start at ${count} seconds`);
    if (count < 1) {
      clearInterval(waitingTimmer);
      console.clear();
      console.log("Testing...");
      doTest(toTest);
    }
    count -= 1;
  }, 1000);
}

function doTest(toTest) {
  const { COMPVIEW } = window;
  _.map(toTest, (ctrl, ctrlType) => {
    const { tag, name, test: { hasFunc = [], testFunc = [] } = {} } = ctrl;
    const hasFuncRes = [];
    const testFuncRes = [];
    const node = COMPVIEW.scriptUtil.getRegisterReactDom(tag) || {};
    console.group(`${ctrlType}-${name}`);
    _.each(hasFunc, (func) => {
      hasFuncRes.push({
        function: func,
        result: !node[func]
          ? "× 不存在"
          : !_.isFunction(node[func])
          ? "× 不是方法"
          : "√",
      });
    });
    hasFuncRes.push({
      function: "通过率",
      result: `${(
        (_.filter(hasFuncRes, (o) => o.result === "√").length /
          hasFunc.length) *
        100
      ).toFixed(2)}%`,
    });
    console.table(hasFuncRes);

    _.each(testFunc, (func) => {
      const rule = func.join(" --> ");
      try {
        eval(`node.${func[0]}`);
        testFuncRes.push({
          rule,
          result: eval(`node.${func[1]}`) === func[2] ? "√" : "×",
        });
      } catch (e) {
        testFuncRes.push({
          rule,
          result: "×",
        });
      }
    });
    testFuncRes.push({
      rule: "通过率",
      result: `${(
        (_.filter(testFuncRes, (o) => o.result === "√").length /
          testFunc.length) *
        100
      ).toFixed(2)}%`,
    });
    console.table(testFuncRes);
    console.groupEnd();
  });
}

export function doComponentTest(toTest) {
  console.clear();
  countToDoTest(5, toTest);
}

export function convertImgToBase64(url, callback) {
  // url = '/api/app/manager/images/AppIconPreview?fileName=App_93f06cb532ce6de7bc764101b0bb0582/AppIcon/workflok.JPG';
  let canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");
  const img = new Image();
  img.crossOrigin = "anonymous"; // 解决Canvas.toDataURL 图片跨域问题
  img.onload = () => {
    canvas.height = img.height;
    canvas.width = img.width;
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    const ext = img.src.substring(img.src.lastIndexOf(".") + 1).toLowerCase(); // 获取到图片的格式
    const dataURL = canvas.toDataURL(`image/${ext}`); // 得到base64 编码的 dataURl
    if (callback) {
      callback(dataURL);
    }
    // document.getElementById('imgRoot').style.background = `url(${dataURL})`;
    canvas = null;
  };
  img.src = url;
}

export function urlToBlob(url, callback) {
  const xhr = new XMLHttpRequest();
  xhr.open("get", url, true);
  xhr.responseType = "blob";
  xhr.onload = (res) => {
    const { target } = res;
    if (+target.status === 200) {
      if (callback) callback(target.response);
    }
  };
  xhr.send();
}

export function blobToBase(blob, callback) {
  const reader = new FileReader();
  reader.onload = (res) => {
    const { target } = res;
    if (callback) callback(target.result);
  };
  reader.readAsDataURL(blob);
}

export function getTextWidth(text, font, family) {
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");
  ctx.font = `${font}px ${family || "微软雅黑"}`;
  return Math.round(ctx.measureText(text).width);
}

export function getRealPopupContainer(props, dom) {
  let { isDesktop2 } = props;
  isDesktop2 = ![
    undefined,
    null,
    false,
    0,
    "0",
    "null",
    "undefined",
    "false",
  ].includes(isDesktop2);
  const popupContainer = isDesktop2
    ? document.body
    : dom || document.getElementById("runtimePage") || document.body;
  return popupContainer;
}
