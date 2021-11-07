

const path = require('path');
const readline = require('readline');

const fse = require('fs-extra');
const glob = require('glob');
const ora = require('ora');
const chalk = require('chalk');

const spinner = ora();
const {
    LOCK_CACHE_PATH,
    INFO_CACHE_PATH
} = require('../config/index');

const uid = () => Math.random().toString(36).substring(2, 10);

const dateFormat = (time)=>{

    const date = Number(time)? new Date(Number(time)):new Date();
    let Y = date.getFullYear();
    let M = date.getMonth() + 1;
    let D = date.getDate(); 
    let h = date.getHours();
    let m = date.getMinutes();
    let s = date.getSeconds();

    M = M<10 ? `0${M}`: String(M);
    D = D<10 ? `0${D}`: String(D);
    h = h<10 ? `0${h}`: String(h);
    m = m<10 ? `0${m}`: String(m);
    s = s<10 ? `0${s}`: String(s);

    return `${Y}-${M}-${D} ${h}:${m}:${s}`
    
}

const compareDependencies = () => {
    const depsPath = path.resolve(__dirname,'../package.json');
    const localDepsPath = path.resolve(process.cwd(),'package.json');
    const deps = require(depsPath).dependencies;
    const localDeps = require(localDepsPath).dependencies;
    
    const filterDeps = {
        "react": "^17.0.2",
        "react-dom": "^17.0.2",
        "lodash": "^4.17.21",
        "antd": "^4.16.13",
        "moment":"^2.29.1"
    }

    const depList = Object.keys(localDeps);

    return depList.map(dep=> {
        if(filterDeps[dep]){
            return [dep,localDeps[dep],deps[dep]];
        }
        return false;
    }).filter(Boolean);
};

const rl = rlStream => readline.createInterface({
    input: rlStream,
    crlfDelay: Infinity
});


const analysisLock2DiffMap = async () => {
    const basePath = path.join(process.cwd(), './src');
    const appPaths = glob.sync(path.join(basePath, '*'));

    let lock = {};
    let temp = {};
    let componentFolderMap = {};

    const lockFileStream = fse.createReadStream(LOCK_CACHE_PATH);

    for await (const line of rl(lockFileStream)) {
        const match = line.match(/<@(.+)>(.+)/);
        if (!match) { temp = {}; continue; }
        if (match[1] === 'id') {
            lock[match[2]] = temp;
        } else if (match[1] === 'localAppPath') {
            componentFolderMap[match[2]] = true;
        }
        temp[match[1]] = match[2];
    }



    const componentPathMap = {};
    const appPathMap = {};

    for(let [path,obj] of Object.entries(lock)){
        componentPathMap[obj.localComponentPath] = obj.localComponentPath;
        appPathMap[obj.localAppPath] = obj.appId;
    }

    return {
        componentPathMap,
        appPathMap,
        fileMap:lock
    }

}

const analysisLockData = async () => {
    const lockFileAndFolderMap = {};
    const lockFileMap = {};
    const lockFolderMap = {};
    const lockAppMap = {};
    const lockComponentMap = {};
    const lockFileStream = fse.createReadStream(LOCK_CACHE_PATH);

    let temp = {};
    for await (const line of rl(lockFileStream)) {
        const match = line.match(/<@(.+)>(.+)/);
        if (!match) { temp = {}; continue; }
        if (match[1] === 'id') {
            lockFileAndFolderMap[match[2]] = temp;
        }
        if(match[1] === 'type' && match[2]==='folder') lockFolderMap[temp.id] = temp;
        if(match[1] === 'type' && match[2]==='file') lockFileMap[temp.id] = temp;
        temp[match[1]] = match[2];
    }

    Object.values(lockFileAndFolderMap).forEach(item=> {
        if(!lockAppMap[item.localAppPath])lockAppMap[item.localAppPath] = {
            path:item.localAppPath,
            appId:item.appId
        };

        if(!lockComponentMap[item.localComponentPath]) lockComponentMap[item.localComponentPath] = {
            path:item.localComponentPath
        }
    })
    
    return {
        lockFileAndFolderMap,
        lockFileMap,
        lockFolderMap,
        lockAppMap,
        lockComponentMap
    }
}

const analysisWorkFolder = async () => {
    const basePath = path.join(process.cwd(), './src');
    const appPaths = glob.sync(path.join(basePath, '*'));

    const componentsMap = new Map();

    const appList =  appPaths.map((appPath) => {
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
    return {
        appList,
        componentsMap,
    }
}

const analysisLockInfo = async () => {
    const hasInfoFile = fse.pathExistsSync(INFO_CACHE_PATH);
    const data = {
        project:"测试项目",
        isExample:true
    };
    if(!hasInfoFile)  return data;
    const infoFileStream = fse.createReadStream(INFO_CACHE_PATH);
    for await (const line of rl(infoFileStream)) {
        const [key, value] = line.split(/\s/);
        data[key] = value;
    }
    data.isExample = false;
    return data;
}

const checkAppPath = (appPathMap) => {
    const basePath = path.join(process.cwd(), './src');
    const appPaths = glob.sync(path.join(basePath, '*'));

    const availableAppPaths = appPaths.filter(appPath => {
        if (!appPathMap[appPath]) {
            spinner.warn(appPath);
            return false;
        }
        return true;
    });

    if (availableAppPaths.length !== appPaths.length) {
        console.log(
            chalk.hex('#cb3837')('error'),
            'You can\'t create App folder in src, please confirm these paths are right!'
        )
        process.exit();
    }
}

module.exports = {
    dateFormat,
    compareDependencies,
    analysisWorkFolder,
    analysisLockInfo,
    analysisLock2DiffMap,
    checkAppPath,
    analysisLockData
}