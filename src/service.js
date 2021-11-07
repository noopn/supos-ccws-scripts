
const path = require('path');
const fs = require('fs');

const chalk = require('chalk');
const ora = require('ora');
const FormData = require('form-data');

const config = require('../config')
const context =require('./context');

const request = require('../src/request');

const spinner = ora(); 


const {
	LOGIN_API,
    LOGOUT_API,
    APPS_LIST_API,
    APP_FLOOR_API,
    APP_FILES_API,
    APP_CREATE_FOLDER_API,
    APP_CREATE_FILE_API
} = config;

const login = async () => {

	const options = context.get('options');

	try {
        spinner.start('Establish connection.');

		const {body:loginMsg} = await request("POST",LOGIN_API,{
			autoLogin: false,
			clientId: "ms-content-sample",
			password: options.password,
			userName: options.username
		});

        spinner.succeed('Establish connection succeed!');
		return loginMsg;

	}catch(err){
        spinner.stop();
        console.log(
            chalk.hex('#cb3837')('connect error'),err
        );
        process.exit(0)
	}
};

const logout = async () => await request("PUT",LOGOUT_API);

const fetchAppList = async () => await request("GET",APPS_LIST_API);

const fetchAppsFolder = async (searchPath,app) => await request("GET",APP_FLOOR_API`${encodeURIComponent(searchPath)}${app.appId}`);

const fetchAppsFiles = async (searchPath,app) => await request("GET",APP_FILES_API`${encodeURIComponent(searchPath)}${app.appId}`);

const createFolder = async (folderInfo) => await request("POST",APP_CREATE_FOLDER_API,{
    appId:folderInfo.appId,
    folderName: folderInfo.path.split('/').slice(-1).join(''),
    path: folderInfo.path.split('/').slice(0,-1).join('/'),
})

const createFile = async (fileInfo) => {
    const form = new FormData();
    form.append('appId', fileInfo.appId);
    form.append('path',fileInfo.path.split('/').slice(0,-1).join('/'));
    form.append('file',fs.createReadStream(fileInfo.localFilePath),path.basename(fileInfo.localFilePath));
    return await request('POST',APP_CREATE_FILE_API,form)
}
const requestStream = request.stream;

module.exports = {
    login,
    logout,
    fetchAppList,
    fetchAppsFolder,
    fetchAppsFiles,
    requestStream,
    createFolder,
    createFile
};