const path = require('path');
const inquirer = require('inquirer');
const stream = require('stream');
const {promisify} = require('util');
const crypto = require('crypto');
const process = require('process');
const EventEmitter = require('events');
const readline = require('readline');
const fse = require('fs-extra');
const chalk = require('chalk');
const ora = require('ora');

const spinner = ora(); 
const {
    LOCK_CACHE_PATH,
} = require('../config');

const {
    fetchAppList,
    fetchAppsFolder,
    fetchAppsFiles,
    requestStream
} = require('../src/service');

const {
    dateFormat,
} = require('./util');

const pipeline = promisify(stream.pipeline);

EventEmitter.setMaxListeners(1000)

class FileFullStream extends stream.Transform {
    static of(){return new FileFullStream()}
    constructor(){
        super();
        this.bufferArray = [];
        this.size = 0;
    }
    _transform(chunk, enc, cb) {
        this.bufferArray.push(chunk);
        this.size+=chunk.length;
        cb();
    }
    _flush(cb) {
        const buffer = Buffer.concat(this.bufferArray,this.size);
        this.push(buffer.toString());
        cb();
    };
}

class FileHashStream extends FileFullStream {
    static of(info){return new FileHashStream(info)}
    constructor(info){
        super();
        this.bufferArray = [];
        this.size = 0;
        this.info = info;
        this.lockStr = '';
    }
    _flush(cb) {
        const buffer = Buffer.concat(this.bufferArray,this.size);
        const hash = buffer.toString();
        this.lockStr+=`<@id>${this.info.id}\n`;
        this.lockStr+=`  <@hash>${hash}\n`;
        this.lockStr+=`  <@path>${this.info.path}\n`;
        this.lockStr+=`  <@fullPath>${this.info.fullPath}\n`;
        this.lockStr+=`  <@localComponentPath>${this.info.localComponentPath}\n`;
        this.lockStr+=`\n`;
        this.push(this.lockStr);
        cb();
    };
}


const loopAnalysisCustomComponent = async (app,floorList) => {

    if(!floorList || !floorList.length) return;

    return Promise.all(
        [floorList[0]].map(async floor => {

            const {body:{fileInfoList}} = await fetchAppsFiles(floor.path,app);

            if(!fileInfoList.length) return false;

            await Promise.all(
                fileInfoList.map(async file=>{

                    const exDir = path.parse(file.path).dir.split('/extensions')[1];
                    
                    const localComponentPath = path.join(process.cwd(),'src',app.name);
                    const localDirPath = path.join(localComponentPath,exDir);
                    await fse.ensureDir(localDirPath);

                    spinner.start(chalk.hex('#e4e4e4')(`File: ${file.path} ${chalk.hex('#FFCD3A')(file.size)}`));

                    const localFilePath = path.join(localDirPath,path.basename(file.path));
                    await pipeline(
                        requestStream(file.fullPath),
                        fse.createWriteStream(localFilePath)
                    );
                    const fileOptions = {
                        fileName:file.fileName,
                        fileType: file.fileType,
                        fullPath: file.fullPath,
                        lastModifiedDate: file.lastModifiedDate,
                        path: file.path,
                        localComponentPath,
                        localDirPath,
                        localFilePath,
                        id: crypto.createHash('sha1').update(localFilePath, 'utf8').digest('hex')
                    }
                    await pipeline(
                        requestStream(file.fullPath),
                        FileFullStream.of(file),
                        crypto.createHash('sha256').setEncoding('hex'),
                        FileHashStream.of(fileOptions),
                        fse.createWriteStream(LOCK_CACHE_PATH,{flags:'a'})
                    )

                    spinner.succeed(chalk.hex('#e4e4e4')(`${file.path + new Array(60-file.path.length).join(' ')}      ${chalk.hex('#eac154')(file.size + new Array(5-file.size.length).join(' '))}      ${chalk.hex('#00aca7')(dateFormat(file.lastModifiedDate))}`));
                })
            )

            const {body:{folderInfoList}} = await fetchAppsFolder(floor.path,app);

            await loopAnalysisCustomComponent(app,folderInfoList);

        })
    );
}


const analysisPath = async ()=>{

    spinner.start(chalk.hex('#29ABE2')('Request app information.'));

    let {body:{list}} = await fetchAppList();

    spinner.succeed(chalk.hex('#29ABE2')('Request app succeed!'));

    if(!list || !list.length) {

        spinner.succeed(chalk.hex('#29ABE2')('Sync succeed!'));

        return false;
    }

    const listIdMap = list.reduce((map,app)=>{map[app.appId] = app;return map} ,{});

    const {syncAll} = await inquirer.prompt([
        {
            type: 'list',
            name: 'syncAll',
            message: 'Do you want to sync all apps (will pull all files in your floor) ?',
            choices:[{
                name:'Yes',
                value:true
            },{
                name:'No',
                value:false
            }],
        },
    ])

    if(!syncAll) {
        list = await inquirer.prompt([
            {
                type: 'checkbox',
                name: 'syncList',
                message: 'Choose apps you want to sync ?',
                choices: list.map(app=>({
                    name:app.name,
                    value:app.appId
                }))
            },
        ]).then(({syncList})=>{
            return syncList.map(appId=> listIdMap[appId])
        })
    }
    
    const {forceSync} = await inquirer.prompt([
        {
            type: 'list',
            name: 'forceSync',
            message: 'Use force sync (will clear your workspace before sync) ?',
            choices:[
                {name:'Yes',value:true,checked:true},
                {name:'No',value:false},
            ]
        },
    ])

    if(!list || !list.length) {

        spinner.succeed(chalk.hex('#29ABE2')('Sync succeed!'));

        return false;
    } 

    if (forceSync){
        // workFolder
        const srcPath = path.resolve(process.cwd(),'./src');
        await fse.remove(srcPath);
        await fse.ensureDir(srcPath)
    }

    await fse.remove(LOCK_CACHE_PATH);

    await Promise.all(
        list.map(async app=>{
            const {body:{folderInfoList}} = await fetchAppsFolder('/extensions',app);
            await loopAnalysisCustomComponent(app,folderInfoList);
        })
    )

    spinner.succeed(chalk.hex('#29ABE2')('Sync all files succeed!'));

}



module.exports = analysisPath;