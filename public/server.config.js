
const path = require('path');
let port = 10250;
const serverConfig = ()=>{
    return {
        compress: true,
        hot: true,
        open:true,
        port: (port+=1)
    }
}

module.exports = serverConfig;

