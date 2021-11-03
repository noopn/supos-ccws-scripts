

const chalk = require('chalk');

const config = require('../config')
const context =require('./context');

const request = require('../src/request');

const {
	LOGIN_API,
    LOGOUT_API,
    APPS_LIST_API,
    APP_FLOOR_API,
    APP_FILES_API
} = config;

const login = async () => {
	const options = context.get('options');

	try {
		const res = await request("POST",LOGIN_API,{
			autoLogin: false,
			clientId: "ms-content-sample",
			// password: options.password,
			// userName: options.username
            password:"Supos1304@",
            userName:'admin'
		});
        if(res==null) return;

        const loginMsg = res.body;

        if(loginMsg.adminLimit) {
            console.log(
                chalk.black.bgHex('#cb3837')('connect error'),
                chalk.hex('#cb3837')(`Maximum Number of Users ${loginMsg.adminLimit}, please check your service`)
            );
            return null;
        }
        
		return loginMsg;

	}catch(err){
        console.log(
            chalk.black.bgHex('#cb3837')('connect error'),
            chalk.hex('#cb3837')(`Please check the config file or network
${err}`)
            );
		return null;
	}
};

const logout = async () => await request("PUT",LOGOUT_API);

const fetchAppList = async () => await request("GET",APPS_LIST_API);

const fetchAppsFolder = async (searchPath,app) => await request("GET",APP_FLOOR_API`${encodeURIComponent(searchPath)}${app.appId}`);

const fetchAppsFiles = async (searchPath,app) => await request("GET",APP_FILES_API`${encodeURIComponent(searchPath)}${app.appId}`);

const requestStream = request.stream

module.exports = {
    login,
    logout,
    fetchAppList,
    fetchAppsFolder,
    fetchAppsFiles,
    requestStream
};