var fs = require("fs");
var async = require("async");
var archiver = require('archiver');

var names = [];
names.push.apply(names, fs.readdirSync("plugins").map(function(v){return "plugins/"+v;}));
names.push.apply(names, fs.readdirSync("behaviors").map(function(v){return "behaviors/"+v;}));

async.map(names, function(fullPath, cb)
{
    console.log(fullPath);
    //fs.readdirSync(fullPath).forEach(function(v){console.log("+"+v)});
    
    var shortName = fullPath.split("/")[1];
    var fileOutput = fs.createWriteStream("../C3RexDoc/repo/"+shortName+".c3addon");

    fileOutput.on('close', function () {
        console.log(archive.pointer() + ' total bytes');
        console.log('archiver has been finalized and the output file descriptor has closed.');
    });
    
    var archive = archiver('zip');    
    archive.pipe(fileOutput);
    archive.directory(fullPath, "");
    archive.on('error', function(err){
        throw err;
    });
    archive.finalize();


});