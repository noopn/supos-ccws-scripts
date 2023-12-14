const path = require("path");
const chalk = require("chalk");
const context = require("./context");
const { login, logout } = require("./service");

const analysisPath = require("./analysisPath");

const pull = async () => {
  try {
    await login();
    await analysisPath();
    await logout();
  } catch (err) {
    console.log(err);
    spinner.stop();
    await logout();
  }
};

module.exports = pull;
