import axios from 'axios';
import utils from './utils';
import { createClientSymbol } from '../client';

const instance = axios.create({
  timeout: 1000 * 60,
  // 自定义替换axios参数转义方法
  // 考虑兼容性, 以下方法直接采用axios,
  // 仅修改encode部分
  paramsSerializer: utils.paramsSerializer
});

instance.interceptors.request.use((config) => {
  if (config.method === 'get') {
    config.data = true;
  }
  return utils.setRequestHeader(config);
});

instance.interceptors.response.use(
  // eslint-disable-next-line
  (res) => Promise.resolve(res),
  (error) => {
    const { response } = error;
    if (response) {
      const { status } = response;
      if (status === 401) {
        const loginType = localStorage.getItem('loginType');
        const isPrint = sessionStorage.getItem('isPrint');
        if (window.top === window.self && (loginType === 'adp' || isPrint)) {
          console.log("开发环境忽略重新登录")
          return;
        }
      }
      utils.request_err(response);
    }
    // 自定义错误忽略程序（不展示错误消息，如：401接口弹出登录框，不需要通过message.error展现错误信息）
    if (
      instance.ignoredErrorHandler
      && instance.ignoredErrorHandler(response)
    ) {
      return Promise.reject(response);
    }

    if (instance._errorHandler) {
      instance._errorHandler(response, error);
    } else {
      utils.errorHandler(error);
    }
    // eslint-disable-next-line compat/compat
    return Promise.reject(response);
  }
);

instance.setClientId = (clientID = 'supOS') => {
  instance.interceptors.request.use((config) => {
    config.headers['X-Supos-Client'] = createClientSymbol(clientID);
    return config;
  });
};

instance.setErrorHandler = (fn) => {
  instance._errorHandler = fn;
};

export default instance;
