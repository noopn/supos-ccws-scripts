import moment from "moment";
import { message } from "antd";
import _ from "lodash";
import { saveAs } from "file-saver";
import {v1 as uuidv1} from "uuid";

function isObject(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function isArray(value) {
  return Array.isArray(value);
}

const sysConfig = {
  domainMenu: "",
  domain: "",
  domain1: "",
  domain2: "",
  domain3: "",
  domain8: "",
  domain4: "",
  domain5: "",
  domain6: "",
  domain7: "",
  domain9: "",
  domain10: "",
  domain12: "/api/runtime",
  // domainDam:"/project/dam/supngin/api/dam'
  domainDam: "/inter-api/oodm-gateway",
  domainDamRuntime: "/inter-api/oodm-runtime",
  domain11: "",
  domainObject: "/api/compose/manage",
  domainNewObject: "/api/compose/manage/v3/objectselector",
  domainObjectSelect: "",
  domainWorkShop: "/projet/workshop/#/",
  domainShield: "/project/shield/#/",
  domainIndustryApplication: "/api/compose/manage",
  domainLake: "",
  collectorDomain: "",
  domainWS: "192.168.12.80:8080",
  version: "0.1",
  domainPrefix: "",
  environment: "dev",
  publicPath: "",
};

function request(
  url,
  options,
  isHiddenNote,
  isPassTicket = true,
  skipCodeVerify = false
) {
  const defaultOptions = {
    credentials: "same-origin",
    // credentials: 'same-origin'
    // omit: 默认值，忽略cookie的发送
    // same-origin: 表示cookie只能同域发送，不能跨域发送
    // include: cookie既可以同域发送，也可以跨域发送
  };
  const newOptions = _.merge({}, defaultOptions, options);
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
  newOptions.headers["Accept-Language"] =
    localStorage.getItem("language") || "zh-cn";
  if (localStorage.getItem("tenant")) {
    newOptions.headers["X-Tenant-Id"] = localStorage.getItem("tenant");
  }

  const ticket = localStorage.getItem("ticket");
  if (ticket && isPassTicket) {
    newOptions.headers.Authorization = `Bearer ${ticket}`;
  }
  // 版本校验
  const version = window["X-Supos-Version"];
  if (version) newOptions.headers["X-Supos-Version"] = version;
  // 开发调试时使用
  // if (url.indexOf('object') > 0) {
  //   newOptions.headers.Authorization = 'Bearer 9d7ca2d0a0bc5e66468b754e41f45787';
  // }
  if (newOptions.method !== "OPTIONS") {
    const result = {}; // 最终返回的结果
    return fetch(url, newOptions)
      .then((response) => {
        // 如果HTTP400以上的返回信息中有message，优先采用返回response的message，如果没有，则采用自定义的status状态信息
        if (response.status >= 400) {
          response.message = response.message || response.statusText;
        }
        return response;
      })
      .then((response) => {
        const { status, message } = response;
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
        // status为404是不可以用response.json(), 统一处理404错误
        // if (status === 404) {
        //   return {
        //     code: `${status}`,
        //     message: '资源未找到'
        //   };
        // }
        // noNext不用处理下一个then
        if (status < 400) {
          result.noNext = true;
        } else {
          result.noNext = false;
        }

        return response.json();
      })
      .then((response) => {
        const res = Object.assign({}, result, response);
        if (result.noNext || skipCodeVerify) {
          return res;
        }
        const { dispatch } = window.APPSTORE;
        if (+res.code === 401) {
          if (window !== window.top) {
            window.parent.postMessage("timeout", "*");
          } else if (
            !localStorage.getItem("ticket") &&
            !window.showLoginModal
          ) {
            // 用户清楚缓存,直接跳登录页
            logoutAction();
          } else {
            logoutAction({
              logoutModal: true,
            });
          }
          return res;
        }
        // 如果返回403，后台正在还原文件，不可继续操作
        if (+res.code === 425) {
          const rUrl = `/api/config/system/restore/status`;
          // 还原状态URL
          if (!invervalFunc) {
            dispatch({
              type: "global/topLoadingShow",
              payload: {
                loading: true,
                tip: res.message || "系统维护中，请稍候...",
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
          notification.error({
            message: res.code,
            description: res.message || response.error || "请稍候再试",
          });
        }

        return res;
      })
      .catch((err) => {
        console.log(err);
      });
  }
}

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
    if (result.code !== undefined) {
      result.code = `${res.code}`;
    }
    return {
      ...result,
    };
  });
}

// const myEvent = {
//   onLoad: true,
//   onGetWorkFlowData: true
// };
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
  const temp = href.split("?");
  const url = temp[temp.length - 1]; // 获取url中末尾"?"符后的字串
  const theRequest = {};
  if (url && url.length > 0) {
    url.split("&").forEach((str) => {
      theRequest[str.split("=")[0]] = unescape(str.split("=")[1]);
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

// const uuid = null;
/**
 * 注册reacetDom到window.dynamicImportWidget;
 * @param {*} props
 * @param {*} component
 * @param {*} itemskey 流式布局-控件ID
 * @param {*} widgetIndex 自由布局-控件ID
 */
function registerReactDom(component, props) {
  // 将运行时的画布，挂载到window，用于根据子组件id，fiber node 获取组件实例
  const { itemskey, widgetIndex } = props;
  if (!itemskey && !widgetIndex) {
    return false;
  }
  window.dynamicImportWidget = window.dynamicImportWidget || {};
  window.dynamicImportWidget[itemskey || widgetIndex] = component;
  // return window.dynamicImportWidget;
}

function logoutReactDom(props) {
  // 将运行时的画布，挂载到window，用于根据子组件id，fiber node 获取组件实例
  const { itemskey, widgetIndex } = props;
  if (
    !(
      window.dynamicImportWidget &&
      window.dynamicImportWidget[itemskey || widgetIndex]
    )
  )
    return false;
  delete window.dynamicImportWidget[itemskey || widgetIndex];
}

/**
 * 获取window.dynamicImportWidget;
 * @param {*} dynamicImportWidget
 * @param {*} componentId
 */
function getRegisterReactDom(componentId) {
  return window.dynamicImportWidget[componentId];
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

/** 各种控件的 setData 方法 by fanzheng */

// 通用方法
function setReactDomValue(ctrlId, value) {
  const editComponent = getRegisterReactDom(ctrlId);
  if (editComponent && isFunction(editComponent.setValue)) {
    return editComponent.setValue(value);
  }
}

function setReactDomValues(ctrlIds) {
  const values = [];
  if (ctrlIds && ctrlIds.length) {
    ctrlIds.forEach((ctrlId) => {
      values.push(setReactDomValue(ctrlId));
    });
  }
  return values;
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
// 拼接事件参数
function getActionHandle(appId, actions = [], instances) {
  let parent = null;
  const { intl } = instances.props;
  if (instances.props.data && instances.props.data._parent) {
    parent = instances.props.data._parent;
  }
  let eventProp = {};
  if (isArray(actions)) {
    // console.log('actions:', actions, ',instances:', instances);
    actions.forEach((item) => {
      const { action } = item;
      const errorConfig = {
        pageName: _.get(instances, "props.pageName", "pageName"),
        widgetName: _.get(instances, "props.widgetName", ""),
        widgetIndex: _.get(instances, "props.widgetIndex", ""),
        action,
      };
      eventProp[action] = (...args) => {
        let { script } = item;
        // 🌲树状选择的事件
        if (
          action === "onSelect" &&
          instances &&
          instances.onSelectTreeNode &&
          instances.props.widgetName === "TreeCtrl"
        ) {
          jsError(
            () => {
              instances.onSelectTreeNode(args[0], args[1]);
            },
            errorConfig,
            intl
          );
        }
        if (action === "onChange" && instances) {
          if (instances.handleChange) {
            jsError(
              () => {
                instances.handleChange(args[0], args[1]);
              },
              errorConfig,
              intl
            );
          } else if (instances.handleChangeTabs) {
            jsError(
              () => {
                instances.handleChangeTabs(args[0], args[1]);
              },
              errorConfig,
              intl
            );
          }
        }
        if (action === "onClick" && instances && instances.handleClick) {
          jsError(
            () => {
              instances.handleClick(args[0], args[1]);
            },
            errorConfig,
            intl
          );
        }
        if (
          [
            "onGetWorkFlowData",
            "onSubmitWorkFlowData",
            "onRejectWorkFlowData",
          ].includes(action)
        ) {
          return false;
        }
        // script = script.replace(/\n/g, '');
        if (parent && parent.getAttr("customFun")) {
          script = replaceFun(script, parent);
        }
        setTimeout(() => {
          jsError(
            () => {
              if (script.includes(".API.")) {
                script = transforAPI(script, instances);
              }
              script = appIdAutoChange(script);
              script = timeOutChange(script);
              new Function("__appId", script)(appId);
            },
            errorConfig,
            intl
          );
        }, 0);
        return false;
      };
      if (!action) {
        eventProp = {};
      }
    });
  }
  return eventProp;
}

function replaceFun(script, data) {
  const source = data.getAttr("customFunSource") || {};
  let newScript = script;
  data.getAttr("customFun").forEach((e) => {
    if (source[e.id] && source[e.id].funcName === e.funcName) {
      newScript = newScript.replace(
        `custom.${source[e.id].funcName}()`,
        source[e.id].script
      );
    }
  });
  return newScript;
}

// api函数转换
function transforAPI(script, instances) {
  const model = instances.props.data.getDataModel();
  Object.keys(model._dataMap).forEach((e) => {
    const item = model._dataMap[e];
    // eslint-disable-next-line
    if (
      item.__proto__ === window.ht.Block.prototype &&
      script.includes(`${item._displayName}.API`)
    ) {
      const customAPI = item.getAttr("customAPI");
      if (customAPI.length > 0) {
        customAPI.forEach((it) => {
          const fun = `${item._displayName}.API.${it.funcName}`;
          if (script.includes(fun)) {
            script = script.replace(fun, "API");
            let scriptStr = "";
            let params = "";
            if (script.match(/API\(([^)]+)\)/g)) {
              scriptStr = script.match(/API\(([^)]+)\)/g);
              params = scriptStr[0].replace(/API\((.+)\)/g, "$1");
            } else {
              scriptStr = script.match(/API\(\)/g);
            }
            script = script.replace(
              scriptStr,
              `${it.script};${it.funcName}(${params})`
            );
          }
        });
      }
    }
  });
  return script;
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
/**
 * 注意：
 * 1.下拉框设置下拉栏数据   setImportData(arr = [{ optionValue: value, optionText: 'text' }])
 * 2. 图表库(柱状图) 的数据设置 setValue( object = {
    //   objectSource: {
    //     'xxx.yyy': {
    //       list: [{
    //         attdanceday: 22,
    //         name: 'CCC'
    //       }]
    //     },
    //     dataSource: [{
    //       selectedInstance: {
    //         instanceName: 'xxx'
    //       },
    //       selectedProp: {
    //         propertyDesc: 'yyy'
    //       },
    //       color: '#3BB45E',
    //       chooseX: 'name',
    //       chooseY: 'attdanceday'
    //     }]
    //   }
    // })
 * 3.datePicker 传入的数据必须是格式化后的时间格式 可使用 timestampFormat 处理
 */

/** end */

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
// PreviewWrapper.js
function getFormData(formIds) {
  const wrapComponent = getRegisterReactDom("previewWrapper");
  if (formIds && wrapComponent) {
    return wrapComponent.getFormData(formIds);
  }
}

function setFormData(newFormData) {
  const wrapComponent = getRegisterReactDom("previewWrapper");
  if (wrapComponent) {
    wrapComponent.updateForm(newFormData, true);
  }
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
      window.parent.scriptUtil &&
      window.parent.scriptUtil.closeModal
    ) {
      window.parent.scriptUtil.closeModal();
    }
    window.location.href = "about:blank";
    window.close();
  } else {
    if (window.parent && window.parent.closeModal) {
      window.parent.scriptUtil.closeModal();
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

  window.open(url, method, feature);
}
// 在父窗口打开页面
function openParentPage(url, method) {
  if (window.opener) {
    window.opener.open(url, method);
  }
}
// 根据组件formItemId,labelContent，生成表头映射
function getFormatterMap(ctrlIds = []) {
  const map = {};
  if (ctrlIds && ctrlIds.length) {
    ctrlIds.forEach((ctrlId) => {
      const component = getRegisterReactDom(ctrlId);
      const { formItemId, labelContent } = component.currentConfig;
      map[formItemId] = labelContent;
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
/**
 * 自动计数器
 * 用于画布中计算子组件是否全部加载
 */
// 自动计数器
const Counter = {
  count: 0,
  sum() {
    this.count += 1;
  },
  clear() {
    this.count = 0;
  },
  getCount() {
    return this.count;
  },
};

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

// getFormatterByDataStructName 根据datastruct描述字段，进行表格字段映射
function getFormatterByDataStructName(name, cb) {
  const url = `/api/metadata/datastructs/${name}/fields`;
  const map = {};
  const param = {
    method: "GET",
  };
  requestNew(url, param).then((res) => {
    if (res && res.list) {
      const { list } = res;
      list.map((item) => {
        map[item.name] = item.description;
        return map;
      });
      cb(map);
    }
  });
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
// WorkprocessLayout.js工作流提交前，数据处理
// 解析onSubmitWorkFlowData
// task.js下个工作流启动时，数据处理
// 脚本可以通过拼接参数字符窜或者arguments获取
function parseWorkFlowConfig(appId, pageData, errorConfig, intl) {
  const { layoutsAllConfig = [], action, readOnly, isDone } = pageData;
  let { formData } = pageData;
  let configArr = [];
  let newFormData = null;
  let widgetName;
  let widgetIndex;
  let isHasAction = false;
  if (!layoutsAllConfig) {
    return formData;
  }

  // 画布工作流获取和提交事件
  if (
    [
      "onGetWorkFlowData",
      "onSubmitWorkFlowData",
      "onRejectWorkFlowData",
    ].includes(action)
  ) {
    layoutsAllConfig.forEach((item) => {
      const { context } = item;
      const config =
        typeof context === "string" ? JSON.parse(context) : context;
      const canvasActions = _.get(config, "jsonData.a.actions", []);
      configArr = _.get(config, "jsonData.d", []);
      configArr.push({
        a: { configs: { config: { actions: canvasActions } } },
      });
    });
  }

  if (configArr && isArray(configArr) && configArr.length) {
    configArr.forEach((v) => {
      const conf = _.get(v, "a.configs.config", {});
      widgetName = _.get(v, "a.widgetName", errorConfig.widgetName);
      widgetIndex = _.get(v, "p.tag", errorConfig.widgetIndex);
      const { actions = [] } = conf;
      if (isArray(actions)) {
        actions.forEach((itemAction) => {
          const {
            formItemId,
            action: componentAction,
            script: componentScript,
          } = itemAction;
          if (
            componentScript &&
            componentAction === action &&
            [
              "onGetWorkFlowData",
              "onSubmitWorkFlowData",
              "onRejectWorkFlowData",
            ].includes(componentAction)
          ) {
            if (componentAction === "onGetWorkFlowData") {
              formData = Object.assign({}, formData, { readOnly, isDone });
            }
            jsError(
              () => {
                newFormData = new Function(
                  "__formData",
                  "__formItemId",
                  "__appId",
                  componentScript
                )(formData, formItemId, appId);
                isHasAction = true;
              },
              {
                ...errorConfig,
                widgetName,
                widgetIndex,
              },
              intl
            );
          }
        });
      }
    });
  }

  return action === "onGetWorkFlowData"
    ? newFormData || formData
    : isHasAction
    ? newFormData
    : formData;
}
function excuteScript(appId, action, script, cb, formData, currentConfig) {
  script = appIdAutoChange(script);
  script = timeOutChange(script);
  const { intl } = currentConfig;
  const errorConfig = {
    pageName: _.get(currentConfig, "pageName", "pageName"),
    widgetName: _.get(currentConfig, "widgetName", ""),
    widgetIndex: _.get(currentConfig, "widgetIndex", ""),
    action,
  };
  if (
    [
      "onGetWorkFlowData",
      "onSubmitWorkFlowData",
      "onRejectWorkFlowData",
    ].includes(action)
  ) {
    return parseWorkFlowConfig(appId, currentConfig, errorConfig, intl);
  }
  if (action === "onLoad" && script) {
    jsError(
      () => {
        new Function("__appId", script)(appId);
      },
      errorConfig,
      intl
    );
  }
  if (action === "onInit" && script) {
    jsError(
      () => {
        new Function("__appId", script)(appId);
      },
      errorConfig,
      intl
    );
  }

  if (action === "onbeforeLoad" && script) {
    window.onbeforeunload = function (e) {
      return new Function("e", "__appId", script)(e, appId);
    };
  }
  if (action === "onunload" && script) {
    window.onunload = function (e) {
      return new Function("e", "__appId", script)(e, appId);
    };
  }
  if (action === "onUploadComplete" && script) {
    jsError(
      () => {
        new Function("__appId", script)(appId);
      },
      errorConfig,
      intl
    );
  }
  if (isFunction(cb)) {
    cb();
  }
  return formData;
}

// setAction等在ChartDrawing.js
// 画布事件onLoad-layoutItem.js
// 多交互的时候
function triggerEvent(currentConfig = {}, cb, option = {}) {
  const { actions = [], formData, appId, intl } = currentConfig;
  const workflowAction = currentConfig.action;
  if (isArray(actions) && actions.length) {
    actions.forEach((config) => {
      const { action, script } = config;
      const { type, date } = option;
      // 日历选中事件
      if (action === type && action === "onSelectCalendar") {
        jsError(
          () => {
            return new Function("date", "__appId", script)(date, appId);
          },
          {
            pageName: _.get(currentConfig, "pageName", ""),
            widgetName: _.get(currentConfig, "widgetName", ""),
            widgetIndex: _.get(currentConfig, "widgetIndex", ""),
            action,
          },
          intl
        );
      }
      if (action !== "onLoad" && currentConfig.action === "onLoad") {
        return;
      }
      return excuteScript(appId, action, script, cb, formData, currentConfig);
    });
  }
  if (
    [
      "onGetWorkFlowData",
      "onSubmitWorkFlowData",
      "onRejectWorkFlowData",
      "onUploadComplete",
    ].includes(workflowAction)
  ) {
    return excuteScript(
      appId,
      workflowAction,
      null,
      cb,
      formData,
      currentConfig
    );
  }
}

/*
// 单个交互的时候
function triggerEvent(currentConfig = {}, cb) {
  const { action, script, formData } = currentConfig;
  return excuteScript(action, script, cb, formData, currentConfig);
}
*/
/**
 * 时间戳反格式化处理 返回需要的时间戳
 * @param {string} timestamp 已格式化的时间戳
 * @param {number} type 1:默认方式 转毫秒数 其他待扩展
 */
function timestampAntiFormat(timestamp, type = 1) {
  const isTimestampVaild = timestamp;
  if (isTimestampVaild) {
    switch (type) {
      case 1:
        return new Date(timestamp.replace(/-/g, "/")).valueOf();
      // return moment(timestamp, format);
      default:
        return new Date(timestamp.replace(/-/g, "/")).valueOf();
    }
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
/**
 * value 校验 是否必填 是否符合格式化需求
 * @param {string} value 校验值
 * @param {string} type 格式类型 或者 正则规则
 * @param {string} isRequired 是否必填
 */
function valueCheck(value, type = "none", isRequired = "yes") {
  if (_.trim(value)) {
    return regRexGroup(type).test(String(value));
  } else {
    return isRequired !== "yes"; // 未输入有效值时 如果必填则false 反之true
  }
}

/**
 * 正则表达式列表
 * @param {string} type 类型
 */
function regRexGroup(type) {
  let reg = null;
  const isZh = localStorage.getItem("language") === "zh-cn";
  switch (type) {
    case "none":
      reg = /\S/;
      break;
    case "mobilePhone":
      if (isZh) reg = /^1(3|4|5|7|8|9)\d{9}$/;
      else reg = /^[0-9]{1,50}$/;
      break;
    case "telephone":
      if (isZh) reg = /^(\(\d{3,4}\)|\d{3,4}-|\s)?\d{7,14}$/;
      else reg = /^[0-9]{1,50}$/;
      break;
    case "zipCode":
      reg = /^[1-9][0-9]{5}$/;
      break;
    case "idCard":
      if (isZh) reg = /(^\d{15}$)|(^\d{18}$)|(^\d{17}(\d|X|x)$)/;
      else reg = /^[A-Za-z0-9]{1,100}$/;
      break;
    case "number":
      reg = /^[+-]?\d+(\.\d+)?$/;
      break;
    case "email":
      reg = /^([a-zA-Z0-9._-])+@([a-zA-Z0-9_-])+(\.[a-zA-Z0-9_-])+/;
      break;
    case "ip":
      reg =
        /^(\d{1,2}|1\d\d|2[0-4]\d|25[0-5])\.(\d{1,2}|1\d\d|2[0-4]\d|25[0-5])\.(\d{1,2}|1\d\d|2[0-4]\d|25[0-5])\.(\d{1,2}|1\d\d|2[0-4]\d|25[0-5])$/;
      break;
    default:
      reg = new RegExp(type);
  }
  return reg;
}

// 整合表单操作流程
/**
 * 对象建模持久化数据：dataTable对象/dataTabel类型对象属性
 * @param {*} tableId 表格控件id 必填
 * @param {*} ctrlIds 控件ids 非必填 格式化字段 ['InputCtrl-0', 'SelectCtrl-6'];
 * @param {*} dataStructName 表格数据集合 'MaintenanceObject.record'
 * @param {*} type 请求类型，'property.getData'
 * @param {*} dataSource dataTable对象实例, 'MaintenanceObject.record'
 * @param {*} filters 查询条件  {
      minDate: new Date('2018-07-02'), // 非dataTable必填
    }
 * @param {*} columns 显示的表格字段, ['制单日期', '维修单位', '制单人', '责任人', '维修单号', '创建时间', '开工日期', '完工日期', '停机工时', '总工时']
 */
function queryTableByObjectModel(reqParam = {}) {
  const {
    tableId,
    ctrlIds = [],
    dataStructName,
    type,
    dataSource,
    filters = {},
    method = "POST",
    columns = [],
  } = reqParam;
  const Table = getRegisterReactDom(tableId);
  const d = {
    type,
    dataSource,
    filters,
  };
  const api = "/api/compose/manage/objectdata/query";
  const param = {
    method,
    body: d,
  };
  // 提交数据
  const renderTable1 = function () {
    requestNew(api, param).then((res) => {
      if (res && res.list) {
        const fieldsMap = getFormatterMap(ctrlIds);
        const list = parseTableMap(res.list, fieldsMap);
        Table.setObjectSource({ list: arrObjectKeySort(list, columns) });
      }
    });
  };

  getFormatterByDataStructName(dataStructName, renderTable1);
}

function showModal(config = {}) {
  try {
    const previewWrapperComponent = getRegisterReactDom("previewWrapper");

    // pageId 形式的简单脚本配置方法
    if (Object.prototype.toString.call(config) === "[object Object]") {
      const {
        pageId,
        modalVisible = true,
        modalTitle = getServiceMessage("common.edit"),
        modalWidth = 1024,
        modalHeight = 768,
      } = config;
      if (modalVisible) {
        if (pageId) {
          previewWrapperComponent.setModal({
            modalVisible,
            modalWidth,
            modalHeight,
            modalTitle,
            isIframe: true,
            modalContent:
              pageId && `/#/runtime-fullscreen/runtime-fullscreen/${pageId}`,
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

    // SUP-9577 新增模太框配置项
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
      isSandbox,
    } = modelSetting;
    previewWrapperComponent.setModal({
      modalVisible: true,
      modalWidth: Number(modelSetting.width) || 1024,
      modalHeight: Number(modelSetting.height) || 768,
      modalTitle: modelSetting.modelTitle || getServiceMessage("common.noName"),
      modalIsCenter,
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
  } catch (error) {
    renderModal(config);
  }
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
      modalTitle: title || getServiceMessage("common.noName"),
      modalContent: content,
      isIframe,
    });
  }
}

function closeModal(ctrlId = "previewWrapper") {
  // 目前脚本控制的弹框都是在 previewWrapper 层
  try {
    getRegisterReactDom(ctrlId).modalClose();
  } catch (error) {
    closeRenderModal();
  }
}

function showLoading(config = {}) {
  const { ctrlId = "previewWrapper", spinIsLoading = true, spinTip } = config;
  // const self = this || window;
  // if (self.getRegisterReactDom && isFunction(self.getRegisterReactDom)) {
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

// 对象实例
function instanceApi(reqParam, cb) {
  const {
    name,
    systemProperty = false,
    visible = true,
    api = `${sysConfig.domainObject}/objectdata`,
    filters,
    rangeFilter,
    type = "template.addInstance",
    dataSource,
    description = "",
    keys,
    properties = [],
    method = "POST",
  } = reqParam;
  let d = {
    type,
    dataSource,
    filters,
  };

  if (type === "template.getInstances.getPropertyValues" && rangeFilter) {
    d.rangeFilter = rangeFilter;
  }

  if (type === "dataTable.addData" || type === "dataTable.deleteData") {
    d = Object.assign({}, d, { data: properties });
  } else if (type === "dataTable.updateData") {
    d = Object.assign({}, d, { keys, data: properties[0] });
  } else if (
    type !== "template.getInstances.getPropertyValues" &&
    type !== "dataTable.getData"
  ) {
    d = Object.assign({}, d, {
      data: {
        name,
        description,
        systemProperty,
        visible,
        properties,
      },
    });
  }
  const param = {
    method,
    body: d,
  };
  requestNew(api, param).then((res) => {
    if (res && isFunction(cb)) {
      cb(res);
    }
  });
}

function renderTable(config) {
  const { tableId, list } = config;
  const Table = getRegisterReactDom(tableId);
  Table.setObjectSource({ list });
}

function randomUrl(url) {
  if (url.includes("?")) {
    return url.replace("?", `?random=${Math.random()}&`);
  } else if (url.includes("#")) {
    return `${url.split("#")[0]}?random=${Math.random()}#${url.split("#")[1]}`;
  } else {
    return `${url}?random=${Math.random()}`;
  }
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
// queryInstanceByTemplate
function queryInstanceByTemplate(reqParam, cb) {
  const defultPages = {
    pageNo: 1,
    pageSize: 20,
  };
  const { filters: filterParam } = reqParam;
  const filters = Object.assign({}, defultPages, filterParam);
  const defaultValue = {
    api: `${sysConfig.domainObject}/objectdata/query`,
    // api: 'http://10.30.52.63:8080/api/compose/manage/objectdata/query',
    type: "template.getInstances.getPropertyValues",
  };
  instanceApi(Object.assign({}, filters, defaultValue, reqParam), cb);
}
// addInstanceByTemplate
function addInstanceByTemplate(reqParam, cb) {
  instanceApi(reqParam, cb);
}

// updateInstance
function updateInstance(reqParam, cb) {
  const defaultValue = {
    type: "instance.update",
  };
  instanceApi(Object.assign({}, defaultValue, reqParam), cb);
}

// delInstance
function delInstance(reqParam, cb) {
  const defaultValue = {
    type: "instance.delete",
  };
  instanceApi(Object.assign({}, defaultValue, reqParam), cb);
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
// dataTable-CURD操作
// queryDataTable
function queryDataTable(reqParam, cb) {
  const defaultValue = {
    api: `${sysConfig.domainObject}/objectdata/query`,
    type: "dataTable.getData",
  };
  instanceApi(Object.assign({}, defaultValue, reqParam), cb);
}
// addDataTable
function addDataTable(reqParam, cb) {
  const defaultValue = {
    type: "dataTable.addData",
  };
  instanceApi(Object.assign({}, defaultValue, reqParam), cb);
}
// updateDataTable
function updateDataTable(reqParam, cb) {
  const defaultValue = {
    type: "dataTable.updateData",
  };
  instanceApi(Object.assign({}, defaultValue, reqParam), cb);
}
// delDataTable
function delDataTable(reqParam, cb) {
  const defaultValue = {
    type: "dataTable.deleteData",
  };
  instanceApi(Object.assign({}, defaultValue, reqParam), cb);
}

function excuteScriptService(reqParam = {}, cb1) {
  executeScriptService(reqParam, cb1);
}

/**
 * 调用脚本服务
 * templateNamespace: 模板命名空间
 * templateName: 模板名称
 * instanceName 实例名称
 * serviceNamespace 服务命名控件
 * serviceName 服务名称
 */
function executeScriptService(reqParam = {}, cb1) {
  const { params, cb, ...rest } = reqParam;
  const {
    templateNamespace,
    templateName,
    instanceName,
    serviceNamespace,
    serviceName,
  } = reqParam;
  // /api/runtime/
  // 2.8 改成 /api/dam/runtime/{templateNamespace}/template/{templateName}/instance/{instanceName}/service/{serviceNamespace}/{serviceName}
  requestNew(
    `${sysConfig.domainDamRuntime}/runtime/${templateNamespace}/template/${templateName}/instance/${instanceName}/service/${serviceNamespace}/${serviceName}`,
    {
      ...rest,
      method: "POST",
      body: {
        ...params,
      },
    }
  ).then((res) => {
    if (res && isFunction(cb1)) {
      cb1(res);
    }
    if (res && isFunction(cb)) {
      cb(res);
    }
  });
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
    requestNew(`${sysConfig.domain2}/inter-api/auth/v1/currentuser`).then(
      (res) => {
        if (res && isFunction(cb)) {
          cb(res);
        }
      }
    );
  }
}
/**
 * 设置用户信息
 */
function setUserInfo(
  ctrlId,
  tip = getServiceMessage("common.userInfoTip"),
  endTip = getServiceMessage("common.useInfoEndTip")
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
 * 退出登录(已废弃， 作兼容使用)
 */
function setAuthority() {
  logout();
}

/**
 * 退出登录
 */
function logout() {
  const { dispatch } = window.APPSTORE || {};
  if (dispatch) {
    dispatch({
      type: "login/logout",
    });
  }
}

/**
 * 获取字典
 * tableObjNameStr:字典表名
 */

function getDictionary(reqParam = {}, cb) {
  const defaultOption = {
    objName: "ServiceObj",
    serviceName: "getDictMapCodeName",
  };
  reqParam = Object.assign({}, defaultOption, reqParam);
  excuteScriptService(reqParam, cb);
}

/**
 * 获取翻译后结果
 * @param [{ code: "01" }] arr 待处理的数据
 * @param {code: { tableName: "table1", showName: "boxType" }} dictMap 字典表与前端字段映射
 * @param {table1: {"01": "集装箱"}} maps 后端返回的字典表数据
 * return [{code: '01', boxType: '集装箱'}] 返回结果
 */
function getDictedRes(arr = [], dictMap = {}, maps = []) {
  const keys = Object.keys(dictMap);
  return arr.map((item) => {
    const o = {};
    keys.forEach((key) => {
      const v = item[key];
      const map =
        dictMap[key] && dictMap[key].tableName && maps[dictMap[key].tableName];
      const showName = dictMap[key] && dictMap[key].showName;
      if (v && map && showName) {
        o[dictMap[key].showName] = map[v];
      }
    });
    return Object.assign({}, item, o);
  });
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
    dom.setValue(value);
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

/**
 * @param {*} node datalink节点
 */
function registerDatalink(node) {
  if (!window.dataLinks) {
    window.dataLinks = {};
  }
  window.dataLinks[node.getTag()] = node;
}

function getDatalink(tag) {
  return window.dataLinks ? window.dataLinks[tag] : {};
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
 * 刷新工作流数据
 */
function refreshWorkflow() {
  setTimeout(() => {
    Object.values(window.dynamicImportWidget).forEach((item) => {
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

// 复制对象
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
const helper = {
  reqParamChange: (reqParam, cb) => {
    const {
      dataSource,
      properties = [{}],
      version = "V1",
      filters = "",
      keys,
    } = reqParam;
    let property = properties.length > 0 ? properties[0] : properties;
    if (keys) {
      property = {
        where: {
          ...keys,
        },
        update: {
          ...property,
        },
      };
    }
    return {
      path: dataSource,
      params: filters || property,
      version,
      cb,
    };
  },
  reqParamServiceChange: (reqParam, cb) => {
    const { objName, serviceName, params, version = "V1", ...rest } = reqParam;
    return {
      path: objName,
      service: serviceName,
      params,
      cb,
      version,
      ...rest,
    };
  },
  parameterChange: (...rest) => {
    if (rest.length > 0) {
      if (
        rest[0] &&
        rest[1] &&
        typeof rest[0] !== "object" &&
        rest[0].indexOf("App_") === 0 &&
        rest[0] === rest[1]
      ) {
        const [, ...newRest] = rest;
        return newRest;
      } else if (
        (rest[0] &&
          typeof rest[0] !== "object" &&
          rest[0].indexOf("App_") === 0 &&
          typeof rest[1] === "object") ||
        rest[0] === "App_"
      ) {
        return rest;
      } else if (typeof rest[0] === "object") {
        return ["App_", ...rest];
      }
    }
    return rest;
  },
  callFunctionChange: (...rest) => {
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
  },
};

function serviceApi(...rest) {
  const [appId, reqParam] = helper.parameterChange(...rest);
  const {
    path,
    service,
    params,
    method = "POST",
    version, // 2.8.1.2 之后默认V2, 老版本的数据默认 V1
    cb,
    removeResult, // 兼容2.7版本的 queryDataTable
  } = reqParam;
  const api = `/project/dam/supngin/api/dam/callServiceByPath`;
  const param = {
    method,
    headers: {
      "OODM-UTC-OFFSET": moment().utcOffset(),
      "OODM-DATETIME-FORMAT": "DEFAULT",
    },
    body: {
      path,
      service,
      params,
      version,
    },
  };

  if (appId && appId !== "App_") param.headers["X-APP"] = appId;
  if (service === "GetDataTableEntries" && version === "V1") {
    return requestNew({ api, param }).then((res) => {
      if (res && res.result && removeResult) {
        if (_.isFunction(cb)) {
          cb({
            ...res.result,
            code: 200,
          });
        }
        return res.result;
      }
      if (_.isFunction(cb)) cb(res);
      return res;
    });
  } else {
    return requestNew({ api, param, cb });
  }
}
const utils =  {
  Alert,
  reload,
  refreshWorkflow,
  // 自定义图元相关
  getCustomSymbolProps,
  getCustomSymbolComponent,
  registerDatalink,
  getDatalink,
  // 请求相关
  request: requestNew,
  getFormatterByDataStructName,
  excuteScriptService,
  executeScriptService,
  getUserInfo,
  getSessionUserInfo,
  submitDefaultValue,
  setUserInfo,
  setAuthority,
  logout,
  // react组件操作
  registerReactDom,
  logoutReactDom,
  getRegisterReactDom,
  setReactDomValue,
  setReactDomValues,
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
  getFormatterMap,
  parseTableMap,
  // 工具库
  moment,
  objKeySort,
  arrObjectKeySort,
  getUuid,
  setUuid,
  emptyUuid,
  isFunction,
  isEmptyObject,
  triggerEvent,
  timestampFormat,
  timestampAntiFormat,
  valueCheck,
  regRexGroup,
  getRequestUrl,
  parsePrimitiveType,
  parseObjPropVals,
  groupDataByField,
  mergeData,
  splitList,
  isVaild,
  showMessage,
  getDictionary,
  getDictedRes,
  assignObj,
  isInArray,
  getActionHandle,
  getTimeZone,
  randomUrl,
  // 表格操作
  queryTableByObjectModel,
  showModal,
  showModalContent,
  closeModal,
  showLoading,
  closeLoading,
  renderTable,
  queryInstanceByTemplate,
  addInstanceByTemplate,
  updateInstance,
  delInstance,
  getEditRow,
  getSelectText,
  addDataTable,
  updateDataTable,
  delDataTable,
  queryDataTable,
  JSONToExcelConvertor,
  copy,
  serviceApi,
};


window.scriptUtil = utils;

export default utils;