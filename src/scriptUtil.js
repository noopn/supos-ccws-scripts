import moment from 'moment';
let invervalFunc = null;
let reviceUrl = null;
function request(url, options, isHiddenNote, isPassTicket = true, skipCodeVerify = false) {

    const defaultOptions = {
        credentials: 'same-origin'
        // credentials: 'same-origin'
        // omit: 默认值，忽略cookie的发送
        // same-origin: 表示cookie只能同域发送，不能跨域发送
        // include: cookie既可以同域发送，也可以跨域发送
    };
    const newOptions = _.merge({}, defaultOptions, options);
    newOptions.headers = newOptions.headers || {};
    // 当文件上传时设置 fetchType="file"
    if ((!newOptions.fetchType || newOptions.fetchType !== 'file') && (newOptions.method === 'POST' || newOptions.method === 'PUT' || newOptions.method === 'GET' || newOptions.method === 'DELETE')) {
        newOptions.headers = {
            Accept: 'application/json',
            'Content-Type': 'application/json; charset=utf-8',
            ...newOptions.headers
        };
        newOptions.body = JSON.stringify(newOptions.body);
    }
    reviceUrl = newOptions;
    newOptions.headers['Accept-Language'] = localStorage.getItem('language') || 'zh-cn';
    if (localStorage.getItem('tenant')) {
        newOptions.headers['X-Tenant-Id'] = localStorage.getItem('tenant');
    }

    const ticket = localStorage.getItem('ticket');
    if (ticket && isPassTicket) {
        newOptions.headers.Authorization = `Bearer ${ticket}`;
    }
    // 版本校验
    const version = window['X-Supos-Version'];
    if (version) newOptions.headers['X-Supos-Version'] = version;
    // 开发调试时使用
    // if (url.indexOf('object') > 0) {
    //   newOptions.headers.Authorization = 'Bearer 9d7ca2d0a0bc5e66468b754e41f45787';
    // }
    if (newOptions.method !== 'OPTIONS') {
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
                if ((newOptions.method === 'DELETE' || newOptions.method === 'POST') && status === 204) {
                    return {
                        code: status
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
                        window.parent.postMessage('timeout', '*');
                    } else if (!localStorage.getItem('ticket') && !window.showLoginModal) {
                        // 用户清楚缓存,直接跳登录页
                        logoutAction();
                    } else {
                        logoutAction({
                            logoutModal: true
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
                            type: 'global/topLoadingShow',
                            payload: {
                                loading: true,
                                tip: res.message || '系统维护中，请稍候...'
                            }
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
                        type: 'global/showVersionVerifyModal'
                    });
                }
                // 演示版本暂时不出现右上角的错误提示框 zhangshunjin 2018-06-24 11:00  --- 出现 401.1, 401.2 登录时的码 wzd 2018-07-19
                if (Number(res.code) >= 400 && Number(res.code) !== 401 && Number(res.code) !== 499 && !isHiddenNote) {
                    notification.error({
                        message: res.code,
                        description: res.message || response.error || '请稍候再试'
                    });
                }

                return res;
            })
            .catch((err) => {
                console.log(err);
            });
    }
}

const helper = {
    reqParamChange: (reqParam, cb) => {
        const { dataSource, properties = [{}], version = 'V1', filters = '', keys } = reqParam;
        let property = properties.length > 0 ? properties[0] : properties;
        if (keys) {
            property = {
                where: {
                    ...keys
                },
                update: {
                    ...property
                }
            };
        }
        return {
            path: dataSource,
            params: filters || property,
            version,
            cb
        };
    },
    reqParamServiceChange: (reqParam, cb) => {
        const { objName, serviceName, params, version = 'V1', ...rest } = reqParam;
        return {
            path: objName,
            service: serviceName,
            params,
            cb,
            version,
            ...rest
        };
    },
    parameterChange: (...rest) => {
        if (rest.length > 0) {
            if (rest[0] && rest[1] && typeof rest[0] !== 'object' && rest[0].indexOf('App_') === 0 && rest[0] === rest[1]) {
                const [, ...newRest] = rest;
                return newRest;
            } else if (((rest[0] && typeof rest[0] !== 'object' && rest[0].indexOf('App_') === 0) && typeof rest[1] === 'object') || rest[0] === 'App_') {
                return rest;
            } else if (typeof rest[0] === 'object') {
                return ['App_', ...rest];
            }
        }
        return rest;
    },
    callFunctionChange: (...rest) => {
        if (rest.length > 0) {
            if (rest[0] && rest[1] && rest[0].indexOf('App_') === 0 && rest[0] === rest[1]) {
                if (rest[0] === rest[1]) {
                    const [, ...newRest] = rest;
                    return newRest;
                } else {
                    return rest;
                }
            }
            if (rest[0] && typeof rest[0] !== 'object' && rest[0].indexOf('App_') !== 0) {
                return ['App_', ...rest];
            }
        }
        return rest;
    }
};


function requestNew({ api, param, cb }) {
    return request(api, param).then((res) => {
        if (res && _.isFunction(cb)) {
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
        method = 'POST',
        version, // 2.8.1.2 之后默认V2, 老版本的数据默认 V1
        cb,
        removeResult // 兼容2.7版本的 queryDataTable
    } = reqParam;
    const api = `/project/dam/supngin/api/dam/callServiceByPath`;
    const param = {
        method,
        headers: {
            'OODM-UTC-OFFSET': moment().utcOffset(),
            'OODM-DATETIME-FORMAT': 'DEFAULT'
        },
        body: {
            path,
            service,
            params,
            version
        }
    };

    if (appId && appId !== 'App_') param.headers['X-APP'] = appId;
    if (service === 'GetDataTableEntries' && version === 'V1') {
        return requestNew({ api, param })
            .then((res) => {
                if (res && res.result && removeResult) {
                    if (_.isFunction(cb)) {
                        cb({
                            ...res.result,
                            code: 200
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
function executeInstanceScriptService(...rest) {
    const [appID, reqParam, cb] = helper.parameterChange(...rest);
    const newParam = helper.reqParamServiceChange(reqParam, cb);
    serviceApi(appID, newParam);
}

export const excuteScriptService = executeInstanceScriptService;