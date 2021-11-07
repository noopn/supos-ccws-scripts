const path = require('path');

const DEV_SERVER_HOST = 'http://127.0.0.1'

const DEV_SERVER_PORT = 9348;

const PUBLIC_PATH = path.resolve(__dirname,'../public');

const CONFIG_FILE_NAME = 'ccws.config.json';

const CONFIG_TEMPLATE_PATH = path.resolve(__dirname,'./ccws.template.json');

const BASE_CACHE_PATH = path.resolve(__dirname,'../.cache');

const SERVER_ENTRY_PATH = path.join(BASE_CACHE_PATH,'index.js');

const LOCK_CACHE_PATH = path.join(BASE_CACHE_PATH,'./ccws.lock');

const INFO_CACHE_PATH = path.join(BASE_CACHE_PATH,'./ccws.info');

const LOGIN_API = '/inter-api/auth/login';

const LOGOUT_API = '/inter-api/auth/logout';

const APPS_LIST_API = '/api/app/manager?sortType=2&sortFiled=createTime';

const APP_FLOOR_API = (_,path,id) =>  `/api/app/resource/folder?path=${path}&appId=${id}`;

const APP_FILES_API = (_,path,id) => `/api/app/resource/file?path=${path}&appId=${id}&current=1&pageSize=100`;

const APP_CREATE_FOLDER_API = '/api/app/resource/folder';

const APP_CREATE_FILE_API = '/api/app/manager/uploadResource';

module.exports = {
    PUBLIC_PATH,
    LOCK_CACHE_PATH,
    INFO_CACHE_PATH,
    DEV_SERVER_HOST,
    DEV_SERVER_PORT,
    SERVER_ENTRY_PATH,
    CONFIG_FILE_NAME,
    CONFIG_TEMPLATE_PATH,
    LOGIN_API,
    LOGOUT_API,
    APPS_LIST_API,
    APP_FLOOR_API,
    APP_FILES_API,
    APP_CREATE_FOLDER_API,
    APP_CREATE_FILE_API
}

