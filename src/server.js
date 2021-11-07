#!/usr/bin/env node

const path = require('path');
const http = require('http');


const glob = require("glob");
const open = require('open');
const ora = require('ora');
const chalk = require('chalk');
const fse = require('fs-extra');
const Koa = require('koa');
const Router = require('koa-router');
const koaStatic = require('koa-static');
const render = require('koa-art-template');

const router = new Router();
const app = new Koa();
const server = http.Server(app.callback());
const { Server } = require("socket.io");
const io = new Server(server);


const spinner = ora();

const {
    LOCK_CACHE_PATH,
    INFO_CACHE_PATH,
    DEV_SERVER_PORT,
    DEV_SERVER_HOST,
    PUBLIC_PATH
} = require('../config');

const devServer = require('./devServer');

const {analysisWorkFolder,analysisLockInfo}  =require('./util');

const basePath = path.join(process.cwd(), './src');
const appPaths = glob.sync(path.join(basePath, '*'));

if(!appPaths.length) {
    console.log(
        chalk.hex('#FFCD3A')('warn'),
        'You don\'t have any App',
    )
    process.exit(0);
}

const hasLockFile = fse.pathExistsSync(LOCK_CACHE_PATH);
const hasInfoFile = fse.pathExistsSync(INFO_CACHE_PATH);

if (!hasLockFile && !hasInfoFile) {
    console.log(
        chalk.hex('#FFCD3A')('warn'),
        'You haven\'t pull the project, now run test project for you.',
    )
}

let componentsMap = new Map();

router.get('/', async (ctx) => {
    const {appList,componentsMap:_componentsMap} = await analysisWorkFolder();
    componentsMap = _componentsMap;
    const info = await analysisLockInfo()
    await ctx.render('index', { ...info, appList });
})

router.get('/:id', async (ctx) => {
    const { id } = ctx.params;
    const info = await analysisLockInfo()
    const appInfo = componentsMap.get(id);
    if (appInfo) {
        ctx.body = {
            stats: 200,
            result: ''
        }
        await devServer({ ...appInfo, ...info });
    }
})

render(app, {
    root: PUBLIC_PATH,
    extname: '.art',
    debug: false
});

app.use(koaStatic(PUBLIC_PATH, { index: null }));
app.use(router.routes());
app.use(router.allowedMethods());


app.on('error', function (err) {
    console.log(err.stack);
});

const ccwsServer = () => {
    
    server.listen(DEV_SERVER_PORT, () => {
        spinner.succeed(`CCWS development server listening on ${DEV_SERVER_PORT}`)
        open(`${DEV_SERVER_HOST}:${DEV_SERVER_PORT}`)
    });

    appPaths.forEach(appPath => {
        fse.watch(appPath, (err => {
            io.of("/").emit("workFolderChange", { path: appPath });
        }))
    })
}


module.exports = ccwsServer;