var fs = require("fs");
var archiver = require('archiver');

var zipOne = function(fullPath)
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
};

module.exports = {
    "zipOne": zipOne
};
