// var crypto = require('crypto');
// var stream = require('stream');
// var util = require('util');

// const upper = new class extends stream.Transform {
//     constructor(){
//         super();
//         this.digester = crypto.createHash('sha1');
//     }
//     _transform = function (chunk, enc, cb) {
//         // if is Buffer use it, otherwise coerce
//         console.log(chunk,chunk.toString())
//         this.digester.update(chunk); // update hash
      
//         // we are not writing anything out at this
//         // time, only at end during _flush
//         // so we don't need to call push
//         cb();
//       };
//       _flush = function (cb) {
//         this.push(this.digester.digest('hex'));
//         cb();
//       };
// }

// // try it out
// upper.pipe(process.stdout); // output to stdout
// upper.write('hello world\n'); // input line 1
// upper.write('another line');  // input line 2
// upper.end();  // finish


// const url = require('url');

// console.log(url.resolve('http://enginee-3.demo.devcloud.supos.net//', '/inter-api//auth/logout')) 

const {convertImportPath} = require('../src/util');

convertImportPath('c:\\w\\wef\\wefw')