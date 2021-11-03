
const path = require('path');

const chalk = require('chalk');
const context = require('./context');
const {
    login,
    logout
} = require('./service');
// const logout = require('./logout')
const analysisPath = require('./analysisPath');


const pull = async (spinner) => {
    try {
        // spinner.start(chalk.hex('#29ABE2')('Establish connection.'));

        // const loginMsg = await login();
        // console.log(loginMsg);

        // if(!loginMsg) {
        //     throw new Error('Process Exit');
        // }
        // spinner.succeed(chalk.hex('#29ABE2')('Establish connection succeed!'));

        // context.set('loginMsg',loginMsg);

        await analysisPath();

        // await logout(spinner);

    }catch (err) {
        console.log(err);
        spinner.stop();
        // await logout();
    }

}

module.exports = pull;