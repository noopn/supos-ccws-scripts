const got = require('got');
const url = require('url');
const chalk = require('chalk');
const FormData = require('form-data');

const context = require('../src/context')

const request = async (method="GET",api,body) => {
    const inquirerOptions = context.get('options');

    const loginMsg = context.get('loginMsg');
    const headers = {};
    
    if(loginMsg) {
        Object.assign(headers,{
            'Authorization':`Bearer ${loginMsg.ticket}`
        })
    }
    const requestUrl = url.resolve(inquirerOptions.origin,api);

    const options = {
        method,
        headers,
        responseType: 'json',
        retry: { limit: 2, methods: ["GET", "POST"] }
    }
    if(body instanceof FormData) {
        Object.assign(options,{body});
    }else{
        Object.assign(options,{json:body});
    }

    try{
        return await got(requestUrl,options);
    }catch(err){
        const errorBody = err.response.body;
        console.log(errorBody);
        if(errorBody.code==='600001') {
            // folder already exists
        }else{
            console.log('\n');
            console.log(
                chalk.black.bgHex('#cb3837')('connect error'),
                chalk.hex('#cb3837')(err));
            throw new Error('Request error');
        }
    }
}

request.stream = (path)=> {
    const inquirerOptions = context.get('options');
    const streamUrl = url.resolve(inquirerOptions.origin,path);
    return got.stream(streamUrl);
}

module.exports = request;