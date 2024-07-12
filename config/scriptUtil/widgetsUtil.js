import { queryServiceBatchQuery } from './api';
import { getDataSource } from './queryFormat';
import { appIdAutoChange, jsError, openPageReplaceScript, getInnerPageUrl } from './utils';

// api函数转换
function transforAPI(script, instances) {
  const model = instances.data ? instances.data.getDataModel() : instances.props.data.getDataModel();
  Object.keys(model._dataMap).forEach((e) => {
    const item = model._dataMap[e];
    // eslint-disable-next-line
    if (item.__proto__ === window.ht.Block.prototype && script.includes(`${item._displayName}.API`)) {
      const customAPI = item.getAttr('customAPI');
      if (customAPI.length > 0) {
        customAPI.forEach((it) => {
          const fun = `${item._displayName}.API.${it.funcName}`;
          if (script.includes(fun)) {
            script = script.replace(fun, 'API');
            let scriptStr = '';
            let params = '';
            if (script.match(/API\(([^)]+)\)/g)) {
              scriptStr = script.match(/API\(([^)]+)\)/g);
              params = scriptStr[0].replace(/API\((.+)\)/g, '$1');
            } else {
              scriptStr = script.match(/API\(\)/g);
            }
            script = script.replace(scriptStr, `${it.script};${it.funcName}(${params})`);
          }
        });
      }
    }
  });
  return script;
}


function replaceFun(script, data) {
  const source = data.getAttr('customFunSource') || [];
  const sourceObj = {};
  _.each(source, (fun) => {
    if (fun.id) {
      sourceObj[fun.id] = fun;
    }
  });
  let newScript = script;
  data.getAttr('customFun').forEach((e) => {
    if (sourceObj[e.id] && sourceObj[e.id].funcName === e.funcName) {
      newScript = newScript.replace(`custom.${sourceObj[e.id].funcName}()`, sourceObj[e.id].script);
    }
  });
  return newScript;
}

function getParentCustom(data) {
  if (data.a && data.a('symbolId')) {
    return data;
  }
  if (data.getParent && data.getParent()) {
    return getParentCustom(data.getParent());
  } else {
    return false;
  }
}

function replaceCustomFun(script, data) {
  if ((data.a && data.a('symbolId')) || !getParentCustom(data)) {
    return script;
  }
  data = getParentCustom(data);
  const source = data.getAttr('customFunSource') || [];
  const sourceObj = {};
  _.each(source, (fun) => {
    if (fun.id) {
      sourceObj[fun.id] = fun;
    }
  });
  let newScript = script;
  data.getAttr('customFun').forEach((e) => {
    if (sourceObj[e.id] && sourceObj[e.id].funcName === e.funcName) {
      newScript = newScript.replace(`custom.${sourceObj[e.id].funcName}()`, sourceObj[e.id].script);
    }
  });
  return newScript;
}

// 执行交互
function excuteScript(appId, action, script, cb, formData, currentConfig) {
  script = appIdAutoChange(script);
  const { intl } = currentConfig;
  const errorConfig = {
    pageName: _.get(currentConfig, 'pageName', 'pageName'),
    widgetName: _.get(currentConfig, 'widgetName', ''),
    widgetIndex: _.get(currentConfig, 'widgetIndex', ''),
    action
  };
  if ((action === 'onLoad') && script) {
    jsError(() => {
      new Function('__appId', script)(appId);
    }, errorConfig, intl);
  }
  if ((action === 'onInit') && script) {
    jsError(() => {
      new Function('__appId', script)(appId);
    }, errorConfig, intl);
  }

  if ((action === 'onbeforeLoad') && script) {
    window.onbeforeunload = function (e) {
      return new Function('e', '__appId', script)(e, appId);
    };
  }
  if ((action === 'onunload') && script) {
    window.onunload = function (e) {
      return new Function('e', '__appId', script)(e, appId);
    };
  }
  if ((action === 'onUploadComplete') && script) {
    jsError(() => {
      new Function('__appId', script)(appId);
    }, errorConfig, intl);
  }
  if (_.isFunction(cb)) {
    cb();
  }
  return formData;
}


/**
 * 注册reacetDom到window.dynamicImportWidget;
 * @param {*} props
 * @param {*} component
 * @param {*} itemskey 流式布局-控件ID
 * @param {*} widgetIndex 自由布局-控件ID
 */
function registerReactDom(component, props) {
  // 将运行时的画布，挂载到window，用于根据子组件id，fiber node 获取组件实例
  const { itemskey, widgetIndex, webViewId } = props;
  if (!itemskey && !widgetIndex) {
    return false;
  }
  const key = (itemskey && webViewId ? `${itemskey}_${webViewId}` : itemskey) || widgetIndex;
  window.COMPVIEW.dynamicImportWidget = window.COMPVIEW.dynamicImportWidget || {};
  window.COMPVIEW.dynamicImportWidget[key] = component;
  window.dynamicImportWidget = window.COMPVIEW.dynamicImportWidget;
}

/** 注销全局配置 */
function logoutReactDom(props) {
  // 将运行时的画布，挂载到window，用于根据子组件id，fiber node 获取组件实例
  const { itemskey, widgetIndex, webViewId } = props;
  const key = (itemskey && webViewId ? `${itemskey}_${webViewId}` : itemskey) || widgetIndex;
  if (!(window.COMPVIEW.dynamicImportWidget && window.COMPVIEW.dynamicImportWidget[key])) return false;
  delete window.COMPVIEW.dynamicImportWidget[key];
}

function registerDatalink(node) {
  if (!window.COMPVIEW.dataLinks) {
    window.COMPVIEW.dataLinks = {};
  }
  window.COMPVIEW.dataLinks[node.getTag()] = node;
}

function registerCustomSymbol(node) {
  if (!window.COMPVIEW.customSymbols) {
    window.COMPVIEW.customSymbols = {};
  }
  window.COMPVIEW.customSymbols[node.getTag()] = node;
}

// /**
//  * 交互事件的集合;
//  * @param {*} appId
//  * @param {*} actions  交互列表
//  * @param {*} instances 控件实例
//  */
// function getActionHandle(appId, actions = [], instances) {
//   let parent = null;
//   const { intl } = instances.props;
//   if (instances.props.data && instances.props.data._parent) {
//     parent = instances.props.data._parent;
//   }
//   let eventProp = {};
//   if (_.isArray(actions)) {
//     actions.forEach((item) => {
//       const { action } = item;
//       const errorConfig = {
//         pageName: _.get(instances, 'props.pageName', 'pageName'),
//         widgetName: _.get(instances, 'props.widgetName', ''),
//         widgetIndex: _.get(instances, 'props.widgetIndex', ''),
//         action
//       };
//       eventProp[action] = (...args) => {
//         let { script } = item;
//         // 🌲树状选择的事件
//         if ((action === 'onSelect') && instances && instances.onSelectTreeNode && instances.props.widgetName === 'Tree') {
//           jsError(() => {
//             instances.onSelectTreeNode(args[0], args[1]);
//           }, errorConfig, intl);
//         }
//         if ((action === 'onChange') && instances) {
//           if (instances.handleChange) {
//             jsError(() => {
//               instances.handleChange(args[0], args[1]);
//             }, errorConfig, intl);
//           } else if (instances.handleChangeTabs) {
//             jsError(() => {
//               instances.handleChangeTabs(args[0], args[1]);
//             }, errorConfig, intl);
//           }
//         }
//         if ((action === 'onClick') && instances && instances.handleClick) {
//           jsError(() => {
//             instances.handleClick(args[0], args[1]);
//           }, errorConfig, intl);
//         }

//         if (parent && parent.getAttr('customFun')) {
//           script = replaceFun(script, parent);
//         }
//         setTimeout(() => {
//           jsError(() => {
//             if (script.includes('.API.')) {
//               script = transforAPI(script, instances);
//             }
//             script = appIdAutoChange(script);
//             new Function('__appId', script)(appId);
//           }, errorConfig, intl);
//         }, 0);
//         return false;
//       };
//       if (!action) {
//         eventProp = {};
//       }
//     });
//   }
//   return eventProp;
// }


/**
 * 交互事件的集合;
 * @param {*} currentConfig 控件配置
 * @param {*} cb  执行后的回调函数
 * @param {*} option 自定义匹配参数
 */
function triggerEvent(currentConfig = {}, cb, option = {}) {
  const { actions = [], formData, appId, intl, isPreview } = currentConfig;
  if (isPreview && _.isArray(actions) && actions.length) {
    actions.forEach((config) => {
      const { action, script } = config;
      const { type, date } = option;
      // 日历选中事件
      if (action === type && action === 'onSelectCalendar') {
        jsError(() => {
          return new Function('date', '__appId', script)(date, appId);
        }, {
          pageName: _.get(currentConfig, 'pageName', ''),
          widgetName: _.get(currentConfig, 'widgetName', ''),
          widgetIndex: _.get(currentConfig, 'widg  let parent = null;etIndex', ''),
          action
        }, intl);
      }

      if (action !== 'onLoad' && currentConfig.action === 'onLoad') {
        return;
      }
      return excuteScript(appId, action, script, cb, formData, currentConfig);
    });
  }
}

/**
 * 交互事件的集合;
 * @param {*} instance 当前控件
 * @return {*} 交互事件的集合
 */
function getActionHandle(instance) {
  const { actions = [] } = instance.state.config;
  const { widgetName } = instance.props;
  const { intl } = instance.props;
  const events = {};
  _.forEach(actions, (e) => {
    const { action } = e;
    const errorConfig = {
      pageName: _.get(instance, 'props.pageName', 'pageName'),
      widgetName: _.get(instance, 'props.widgetName', ''),
      widgetIndex: _.get(instance, 'props.widgetIndex', ''),
      action
    };
    let handleName = '';
    if (action === 'onLoad') {
      return;
    }
    events[action] = (...args) => {
      let value = args;
      const [a, b] = args;

      switch (action) {
        case 'onSelect':
          handleName = 'onSelectTreeNode';
          break;
        case 'onChange':
          handleName = instance.handleChange ? 'handleChange' : (instance.handleChangeTabs && 'handleChangeTabs');
          break;
        case 'onBlur':
          handleName = 'handleBlur';
          break;
        case 'onFocus':
          handleName = 'handleFocus';
          break;
        case 'onClick':
          handleName = 'handleClick';
          break;
        default:
          handleName = '';
      }

      switch (action) {
        case 'onSelect':
          value = widgetName === 'Tree' ? {
            value: a,
            info: b
          } : {
            e: a,
            option: b
          };
          break;
        case 'onChange':
          value = widgetName === 'DatePicker' ? {
            data: a,
            dataString: b
          } : {
            e: a,
            option: b
          };
          break;
        default:
          value = {};
      }

      jsError(() => {
        if (handleName && instance[handleName]) instance[handleName].bind(this, a, b)();
      }, errorConfig, intl);

      setTimeout(() => {
        // 修复控件内容改变无法获取最新值的问题
        getHandle(action, value, instance);
      }, 0);
    };
  });
  return events;
}

/**
 * 交互事件执行
 * @param {*} name 交互名称 ‘onLoad’
 * @param {*} values  入参
 * @param {*} instance 当前控件
 */
function getHandle(name, values, instance) {
  const { appId, intl, pageName = '页面', widgetName, widgetIndex, isSuposRuntime, isPreview } = instance.props;
  if (!isPreview) {
    return;
  }
  let parent = null;
  let scripts = '';

  if (instance.props.data && instance.props.data._parent) {
    parent = instance.props.data._parent;
  }

  const actions = _.get(instance, 'state.config.actions', _.get(instance, 'currentConfig.actions', [_.get(instance, 'state.config.intervalScript', {})]));

  const handle = actions.filter(e => e.action === name || e.type === name);
  if (_.isEmpty(handle)) {
    return;
  }

  scripts = handle.length > 0 ? appIdAutoChange(handle[handle.length - 1].script) : '';

  if (parent && parent.getAttr('customFun')) {
    scripts = replaceFun(scripts, parent);
  }

  if (_.includes(scripts, '.API.')) {
    scripts = transforAPI(scripts, instance);
  }
  scripts = openPageReplaceScript(scripts, appId, isSuposRuntime);

  jsError(() => {
    if (!_.isEmpty(values) && !_.isArray(values)) {
      const key = Object.keys(values);
      const value = Object.values(values);
      new Function('instance', ...key, '__appId', 'scriptUtil', scripts)(instance, ...value, appId, window.COMPVIEW.scriptUtil);
    } else {
      new Function('instance', '__appId', 'scriptUtil', scripts)(instance, appId, window.COMPVIEW.scriptUtil);
    }
  }, {
    pageName,
    widgetName,
    widgetIndex,
    action: name
  }, intl);
}

// todo 工作流
// WorkprocessLayout.js工作流提交前，数据处理
// 解析onSubmitWorkFlowData
// task.js下个工作流启动时，数据处理
// 脚本可以通过拼接参数字符窜或者arguments获取
function parseWorkFlowConfig(param) {
  const { appId, layoutsAllConfig = [], action, readOnly, isDone, intl } = param;
  let { formData, widgetName, widgetIndex } = param;
  // let { formData } = pageData;
  let configArr = [];
  let newFormData = null;
  let isHasAction = false;
  if (!layoutsAllConfig) {
    return formData;
  }

  // 画布工作流获取和提交事件
  if (['onGetWorkFlowData', 'onSubmitWorkFlowData', 'onRejectWorkFlowData'].includes(action)) {
    _.keys(layoutsAllConfig).forEach((key) => {
      const item = layoutsAllConfig[key];
      const { context } = item;
      const config = typeof context === 'string' ? JSON.parse(context) : context;
      const canvasActions = _.get(config, 'jsonData.a.actions', []);
      configArr = _.cloneDeep(_.get(config, 'jsonData.d', []));
      configArr.push({ a: { configs: { config: { actions: canvasActions } } } });
    });
  }

  if (configArr && _.isArray(configArr) && configArr.length) {
    configArr.forEach((v) => {
      const conf = _.get(v, 'a.configs.config', {});
      widgetName = _.get(v, 'a.widgetName', widgetName);
      widgetIndex = _.get(v, 'p.tag', widgetIndex);
      const { actions = [] } = conf;
      if (_.isArray(actions)) {
        actions.forEach((itemAction) => {
          const { formItemId, action: componentAction, script: componentScript } = itemAction;
          if (componentScript
            && componentAction === action
            && (['onGetWorkFlowData', 'onSubmitWorkFlowData', 'onRejectWorkFlowData'].includes(componentAction))) {
            if (componentAction === 'onGetWorkFlowData') {
              formData = Object.assign({}, formData, { readOnly, isDone });
            }
            jsError(() => {
              newFormData = new Function('__formData', '__formItemId', '__appId', componentScript)(formData, formItemId, appId);
              isHasAction = true;
            }, {
              widgetName,
              widgetIndex
            }, intl);
          }
        });
      }
    });
  }

  return action === 'onGetWorkFlowData'
    ? newFormData || formData
    : (isHasAction
      ? newFormData || formData
      : formData);
}

/**
 * 校验
 * @param {*} name 校验名称，存在就校验当前checkTime的情况， 不存在就校验结果，不区分checkTime
 */
function getValid(name) {
  const { customReg, isRequired, validType, checkTime } = _.get(this, 'state.config.validityCheck', {});
  if (name && name !== checkTime) {
    return;
  }
  const flag = validType === 'custom'
    ? valueCheck(this.checkValue, customReg, isRequired)
    : valueCheck(this.checkValue, validType, isRequired);

  this.setState({ isValid: flag });
  return flag;
}

/**
 * value 校验 是否必填 是否符合格式化需求
 * @param {string} value 校验值
 * @param {string} type 格式类型 或者 正则规则
 * @param {string} isRequired 是否必填
 */
function valueCheck(value, type = 'none', isRequired = 'yes') {
  if (type === 'none' && isRequired === 'yes') {
    if (_.isObject(value)) {
      return !_.isEmpty(value);
    } else {
      return !!value;
    }
  }

  if (!_.isEmpty(value)) {
    return regRexGroup(type).test(String(value));
  } else {
    return isRequired !== 'yes'; // 未输入有效值时 如果必填则false 反之true
  }
}

/**
 * 正则表达式列表
 * @param {string} type 类型
 */
function regRexGroup(type) {
  let reg = null;
  switch (type) {
    case 'none':
      reg = /\S/;
      break;
    case 'mobilePhone':
      reg = /^1(3|4|5|7|8|9)\d{9}$/;
      break;
    case 'telephone':
      reg = /^(\(\d{3,4}\)|\d{3,4}-|\s)?\d{7,14}$/;
      break;
    case 'zipCode':
      reg = /^[1-9][0-9]{5}$/;
      break;
    case 'idCard':
      reg = /(^\d{15}$)|(^\d{18}$)|(^\d{17}(\d|X|x)$)/;
      break;
    case 'number':
      reg = /^[+-]?\d+(\.\d+)?$/;
      break;
    case 'email':
      reg = /^([a-zA-Z0-9._-])+@([a-zA-Z0-9_-])+(\.[a-zA-Z0-9_-])+/;
      break;
    case 'ip':
      reg = /^(\d{1,2}|1\d\d|2[0-4]\d|25[0-5])\.(\d{1,2}|1\d\d|2[0-4]\d|25[0-5])\.(\d{1,2}|1\d\d|2[0-4]\d|25[0-5])\.(\d{1,2}|1\d\d|2[0-4]\d|25[0-5])$/;
      break;
    default:
      reg = new RegExp(type);
  }
  return reg;
}


function showModal(config = {}) {
  if (Object.prototype.toString.call(config) === '[object Object]') {
    const { ctrlId = 'previewWrapper', pageId, modalVisible = true, modalTitle = '编辑', modalWidth = 1024, modalHeight = 768 } = config;

    const previewWrapperComponent = window.COMPVIEW.dynamicImportWidget[ctrlId];
    if (modalVisible) {
      const { props: { appId, isSuposRuntime } = {} } = previewWrapperComponent;
      previewWrapperComponent.setModal({
        modalVisible,
        modalWidth,
        modalHeight,
        modalTitle,
        isIframe: true,
        modalContent: pageId && getInnerPageUrl(pageId, appId, isSuposRuntime)
      });
    } else {
      previewWrapperComponent.modalClose();
    }
  }
}

export function isPromise(obj) {
  return !!obj && (typeof obj === 'object' || typeof obj === 'function') && typeof obj.then === 'function';
}

export function serviceBatchQuery(list) {
  return queryServiceBatchQuery({ list }).then((res) => {
    if (res.code !== 200) return false;
    return res;
  });
}
/**
 * updateService 批量更新服务
 * @param {object || array} serviceObject 服务
 */
export function updateService(serviceObject) {
  let list;
  if (_.isArray(serviceObject)) {
    list = _.map(serviceObject, (obj) => {
      return getDataSource(obj);
    });
  } else if (_.isObject(serviceObject)) { // 单个情况
    list = [getDataSource(serviceObject)];
  }
  return serviceBatchQuery(list)
    .then((res) => {
      if (list.length === 1) {
        const { inputs, showName, output } = res[list[0]];
        return {
          ...serviceObject,
          selectedProp: {
            ...serviceObject.selectedProp,
            inputs,
            showName,
            output
          }
        };
      } else {
        return res;
      }
    });
}

// return new Promise((resolve, reject) => {
//   if (false) reject();
//   resolve({
//     ...serviceObject,
//     selectedProp: {
//       ...serviceObject.selectedProp,
//       showName: 'radio',
//       output: {
//         name: 'result',
//         jsonDesc: '{"list":[{"optionValue":"1","optionText":"男"},{"optionValue":"2","optionText":"女"}]}',
//         description: '',
//         primitiveType: 'JSON',
//         required: false
//       },
//       inputs: [
//         {
//           name: 'input1',
//           description: '',
//           primitiveType: 'INTEGER',
//           required: false
//         },
//         {
//           name: 'input2',
//           description: '',
//           primitiveType: 'STRING',
//           required: false
//         }
//       ]
//     },
//     subTab: 'service'
//   });
// });


export default {
  registerReactDom,
  logoutReactDom,
  registerDatalink,
  registerCustomSymbol,
  getActionHandle,
  parseWorkFlowConfig,
  triggerEvent,
  transforAPI,
  getHandle,
  valueCheck,
  regRexGroup,
  showModal,
  getValid,
  replaceFun,
  replaceCustomFun,
  isPromise,
  updateService,
  serviceBatchQuery
};
