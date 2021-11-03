const got = require('got');
const url = require('url');
const chalk = require('chalk');

const context = require('../src/context')

const request = async (method="GET",api,json) => {
    // const inquirerOptions = context.get('options');
    const inquirerOptions = {
        "project":"测试平台",
        "origin":"http://enginee-3.demo.devcloud.supos.net/"
    }
    const loginMsg = context.get('loginMsg');
    const headers = {
        'Content-Type':'application/json; charset=utf-8',
    }
    // if(loginMsg) {
    if(!loginMsg) {
        Object.assign(headers,{
            
            // 'Authorization':`Bearer ${loginMsg.ticket}`
            'Authorization':`Bearer aa3cbcec-36bd-422e-9d15-3c6a2ef3dac0`
        })
    }
    const requestUrl = url.resolve(inquirerOptions.origin,api);

    const options = {
        method,
        headers,
        responseType: 'json'
    }
    if(json) Object.assign(options,{json});

    try{
        return await got(requestUrl,options);
    }catch(err){
        console.log('\n');
        console.log(
            chalk.black.bgHex('#cb3837')('connect error'),
            chalk.hex('#cb3837')(err));
        return null;
    }
}

request.stream = (path)=> {
    // const inquirerOptions = context.get('options');
    const inquirerOptions = {
        "project":"测试平台",
        "origin":"http://enginee-3.demo.devcloud.supos.net/"
    }
    const streamUrl = url.resolve(inquirerOptions.origin,path);
    return got.stream(streamUrl);
} 

module.exports = request;