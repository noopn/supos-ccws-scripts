
const path = require('path');
const chalk = require('chalk');
const context = require('./context');
const {
    login,
    logout
} = require('./service');

const analysisPath = require('./analysisPath');


const pull = async () => {
    try {
        const loginMsg = await login();
        if(loginMsg.adminLimit) {
            console.log(
                chalk.black.bgHex('#cb3837')('connect error'),
                chalk.hex('#cb3837')(`Maximum Number of Users ${loginMsg.adminLimit}, please check your service`)
            );
            process.exit(0)
        }

        context.set('loginMsg',loginMsg);
        await analysisPath();
        await logout();

    }catch (err) {
        console.log(err);
        spinner.stop();
        await logout();
    }

}

module.exports = pull;