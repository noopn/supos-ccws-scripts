import axios from 'axios';
import { createClientSymbol } from '../client';
import utils from './utils';

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
      utils.request_err(response);
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
