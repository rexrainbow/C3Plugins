var fs = require("fs");
var async = require("async");
var zipOne = require("./zipOne");

var zipAll = function()
{
    var names = [];
    names.push.apply(names, fs.readdirSync("plugins").map(function(v){return "plugins/"+v;}));
    names.push.apply(names, fs.readdirSync("behaviors").map(function(v){return "behaviors/"+v;}));

    async.map(names, function(fullPath, cb)
    {
        zipOne.zipOne(fullPath);
    });
}

zipAll();
