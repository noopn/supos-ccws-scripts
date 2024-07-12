import request from "./request";
import { getSqlExce } from "./objectApi";
import moment from "moment";
import { isFunction } from "lodash";
import getConfig from "./config";

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

function requestNew({ api, param, cb }) {
  return request(api, param).then((res) => {
    if (res && isFunction(cb)) {
      cb(res);
    }
    return res;
  });
}

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
  const api = `${getConfig().domainDamRuntime}/callServiceByPath`;
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
        if (isFunction(cb)) {
          cb({
            ...res.result,
            code: 200,
          });
        }
        return res.result;
      }
      if (isFunction(cb)) cb(res);
      return res;
    });
  } else {
    return requestNew({ api, param, cb });
  }
}

// 调用模板的服务
function AddDataTableEntry(...rest) {
  const [appID, reqParam, cb] = helper.parameterChange(...rest);
  const defaultValue = {
    service: "AddDataTableEntry",
  };
  const newParam = helper.reqParamChange(reqParam, cb);
  serviceApi(appID, Object.assign({}, defaultValue, newParam));
}

function DeleteDataTableEntries(...rest) {
  const [appID, reqParam, cb] = helper.parameterChange(...rest);
  const defaultValue = {
    service: "DeleteDataTableEntries",
  };
  const newParam = helper.reqParamChange(reqParam, cb);
  serviceApi(appID, Object.assign({}, defaultValue, newParam));
}

function UpdateDataTableEntry(...rest) {
  const [appID, reqParam, cb] = helper.parameterChange(...rest);
  const defaultValue = {
    service: "UpdateDataTableEntry",
  };
  const newParam = helper.reqParamChange(reqParam, cb);
  serviceApi(appID, Object.assign({}, defaultValue, newParam));
}

function GetDataTableEntries(...rest) {
  const [appID, reqParam, cb] = helper.parameterChange(...rest);
  const defaultValue = {
    service: "GetDataTableEntries",
    removeResult: true,
  };
  const newParam = helper.reqParamChange(reqParam, cb);
  serviceApi(appID, Object.assign({}, defaultValue, newParam));
}

function executeInstanceScriptService(...rest) {
  const [appID, reqParam, cb] = helper.parameterChange(...rest);
  const newParam = helper.reqParamServiceChange(reqParam, cb);
  serviceApi(appID, newParam);
}

function callFunction(...rest) {
  const [appID, path, service, params] = helper.callFunctionChange(...rest);
  return serviceApi(appID, {
    path,
    service,
    params,
  });
}
function callSqlFunction(...rest) {
  const [appID, dataSource] = helper.callFunctionChange(...rest);
  return getSqlExce({ appId: appID, ...dataSource }).then((res) => {
    if (res && res.code === 200) {
      return res.data;
    }
    return res;
  });
}

export default {
  addDataTable: AddDataTableEntry,
  delDataTable: DeleteDataTableEntries,
  updateDataTable: UpdateDataTableEntry,
  queryDataTable: GetDataTableEntries,
  excuteScriptService: executeInstanceScriptService,
  executeScriptService: executeInstanceScriptService,
  callFunction,
  callSqlFunction,
};
