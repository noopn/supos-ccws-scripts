import request from './request';
import { getServiceMessage } from './constants';
import getConfig from './config';

function requestNew(appId, ...rest) {
  const [, options = {}] = rest;
  if (appId) {
    if (options.headers) options.headers['X-APP'] = appId;
    else {
      options.headers = {
        'X-APP': appId
      };
    }
  }
  rest[1] = options;
  // eslint-disable-next-line
  return request.apply(this, rest).then(res => {
    const result = { ...res };
    if (res.code !== undefined) {
      result.code = `${res.code}`;
    }

    if (res.code !== 200) {
      throw new Error(JSON.stringify(res));
    }

    return res.data;
  });
}


// 获取对象基础信息
function fromPath({ appId, path }) {
  // parentPath先统一用'/'
  const parentPath = '/';
  const url = `${getConfig().domainDam}/fromPath?parentPath=${parentPath}&path=${path}`;
  const param = {
    method: 'GET'
  };

  return requestNew(appId, url, param);
}


class OodmClient {
  // 通过路径获取对象详情
  fromPath(...argParams) {
    let params;
    if (argParams.length === 2) {
      const [appId, path] = argParams;
      params = {
        appId,
        path
      };
    } else {
      const [path] = argParams;
      params = {
        path
      };
    }

    const res = fromPath({ ...params });
    const temp = new OodmObject();

    const proxyTemp = new Proxy(temp, {
      get(target, name) {
        return function (...args) {
          if (name === 'then' && args[0]) {
            return;
          }
          return Reflect.apply(temp.call, temp, [
            { name, params: args, client: res, appId: params.appId }
          ]);
        };
      },
      set() {
        throw new Error(getServiceMessage('common.noAction'));
      }
    });
    return proxyTemp;
  }
}

class OodmObject {
  async call({ name, params, client, appId }) {
    return client.then((data) => {
      if (data) {
        const url = '/inter-api/supos/oodm/v2/callFunction';
        const param = {
          method: 'POST',
          body: {
            objectUuid: data || {},
            functionName: name,
            params
          }
        };
        return requestNew(appId, url, param);
      }
    });
  }
}

export default new OodmClient();
