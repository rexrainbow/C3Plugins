// ECMAScript 5 strict mode
"use strict";

assert2(cr, "cr namespace not created");
assert2(cr.plugins_, "cr.plugins_ not created");

/////////////////////////////////////
// Plugin class
cr.plugins_.Rex_Random = function (runtime) {
    this.runtime = runtime;
};

(function () {

    var pluginProto = cr.plugins_.Rex_Random.prototype;

    /////////////////////////////////////
    // Object type class
    pluginProto.Type = function (plugin) {
        this.plugin = plugin;
        this.runtime = plugin.runtime;
    };

    var typeProto = pluginProto.Type.prototype;

    typeProto.onCreate = function () {
    };

    /////////////////////////////////////
    // Instance class
    pluginProto.Instance = function (type) {
        this.type = type;
        this.runtime = type.runtime;
    };

    var instanceProto = pluginProto.Instance.prototype;

    instanceProto.onCreate = function () {
        this.check_name = "RANDOM";
        this.seed = null;
        this.randGen = new window.rexObjs.MersenneTwister(this.seed);
    };

    // export to other plugins
    instanceProto.random = function () {
        return this.randGen.random();
    };

    instanceProto.saveToJSON = function () {
        return {
            "seed": this.seed,
            "rand": this.randGen.saveToJSON()
        };
    };

    instanceProto.loadFromJSON = function (o) {
        this.seed = o["seed"];
        this.randGen.loadFromJSON(o["rand"]);
    };
    //////////////////////////////////////
    // Conditions
    function Cnds() { };
    pluginProto.cnds = new Cnds();

    //////////////////////////////////////
    // Actions
    function Acts() { };
    pluginProto.acts = new Acts();

    Acts.prototype.SetSeed = function (seed) {
        this.seed = seed;
        this.randGen = new window.rexObjs.MersenneTwister(this.seed);
    };
    //////////////////////////////////////
    // Expressions
    function Exps() { };
    pluginProto.exps = new Exps();

    Exps.prototype.Seed = function (ret) {
        ret.set_float(this.seed || 0);
    };
    Exps.prototype.random = function (ret) {
        ret.set_float(this.random());
    };

}());