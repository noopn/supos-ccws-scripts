const jest = require("jest");

const config = require("../config/jest.config")
let argv = process.argv.slice(2);

argv.push("--config",JSON.stringify(config))
jest.run(argv);

process.on('unhandledRejection', err => {
  throw err;
});