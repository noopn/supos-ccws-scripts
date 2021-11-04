#!/usr/bin/env node

const path = require('path');
const http = require('http');
const readline = require('readline');

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
const rl = rlStream => readline.createInterface({
    input: rlStream,
    crlfDelay: Infinity
});

const {
    LOCK_CACHE_PATH,
    INFO_CACHE_PATH,
    DEV_SERVER_PORT,
    DEV_SERVER_HOST,
    PUBLIC_PATH
} = require('../config');

const devServer = require('./devServer');

const hasLockFile = fse.pathExistsSync(LOCK_CACHE_PATH);
const hasInfoFile = fse.pathExistsSync(INFO_CACHE_PATH);

if (!hasLockFile && !hasInfoFile) {
    console.log(
        chalk.black.bgHex('#FFCD3A')('dev warn'),
        chalk.hex('#FFCD3A')('You haven\'t pull the project, now run example project for you!'),
    )
}

const uid = () => Math.random().toString(36).substring(2, 10);

const basePath = path.join(process.cwd(), './src');

const appPaths = glob.sync(path.join(basePath, '*'));

let componentsMap = new Map();

const projectInfo = async () => {
    const data = {
        project:"示例项目",
        isExample:true
    };
    if(!hasInfoFile)  return data;
    const infoFileStream = fse.createReadStream(INFO_CACHE_PATH);
    for await (const line of rl(infoFileStream)) {
        const [key, value] = line.split(/\s/);
        data[key] = value;

    }
    return data;
}

const analysisData = async () => {

    if (!appPaths.length) return false;
    let lock = {};
    let temp = {};
    let componentFolderMap = {};

    if (hasLockFile) {
        const lockFileStream = fse.createReadStream(LOCK_CACHE_PATH);
        // Note: we use the crlfDelay option to recognize all instances of CR LF
        // ('\r\n') in input.txt as a single line break.

        for await (const line of rl(lockFileStream)) {
            // Each line in input.txt will be successively available here as `line`.
            const match = line.match(/<@(.+)>(.+)/);
            if (!match) { temp = {}; continue; }
            if (match[1] === 'id') {
                lock[match[2]] = temp;
            } else if (match[1] === 'localComponentPath') {
                componentFolderMap[match[2]] = true;
            }
            temp[match[1]] = match[2];
        }


        const availableAppPaths = appPaths.filter(appPath => {
            if (!componentFolderMap[appPath]) {
                spinner.warn(appPath);
            }
            return true;
        });

        if (availableAppPaths.length !== Object.keys(componentFolderMap).length) {
            console.log(
                chalk.hex('#FFCD3A')(`You can't create App folder in src, please confirm these paths are right!`)
            )
            process.exit();
        }

        componentsMap = new Map();
    }


    return appPaths.map((appPath) => {
        const componentPaths = glob.sync(path.join(appPath, '*'));
        const appName = String(appPath.split('/').slice(-1));

        const componentsList = componentPaths.map(componentPath => {
            const componentName = String(componentPath.split('/').slice(-1));
            const componentEntryPath = path.join(componentPath, './source');
            const componentOutputPath = path.join(componentPath, './compiled');
            const compObj = {
                id: uid(),
                componentName,
                componentPath,
                componentEntryPath,
                componentOutputPath
            }
            componentsMap.set(compObj.id, compObj);

            return compObj;
        })
        return {
            appName,
            componentsList
        }
    });
}

const ccwsServer = () => {

    router.get('/', async (ctx) => {
        const appList = await analysisData();
        const info = await projectInfo()
        await ctx.render('index', { ...info, appList });
    })

    router.get('/:id', async (ctx) => {
        const { id } = ctx.params;
        const info = await projectInfo()
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

    server.listen(DEV_SERVER_PORT, () => {
        spinner.succeed(`CCWS development server listening on ${DEV_SERVER_PORT}`)
        open(`${DEV_SERVER_HOST}:${DEV_SERVER_PORT}`)
    });

}

appPaths.forEach(appPath => {
    fse.watch(appPath, (err => {
        io.of("/").emit("workFolderChange", { path: appPath });
    }))
})


module.exports = ccwsServer;