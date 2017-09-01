// ECMAScript 5 strict mode
"use strict";

assert2(cr, "cr namespace not created");
assert2(cr.plugins_, "cr.plugins_ not created");

/////////////////////////////////////
// Plugin class
cr.plugins_.Rex_FirebaseAPIV3 = function (runtime) {
    this.runtime = runtime;
};

(function () {
    var pluginProto = cr.plugins_.Rex_FirebaseAPIV3.prototype;

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
        window["firebase"]["database"]["enableLogging"](this.properties[4] === 1);
        if (this.properties[0] !== "") {
            this.initializeApp(this.properties[0], this.properties[1], this.properties[2], this.properties[3]);
        }
    };

    instanceProto.onDestroy = function () {
    };
    instanceProto.initializeApp = function (apiKey, authDomain, databaseURL, storageBucket) {
        var config = {
            "apiKey": apiKey,
            "authDomain": authDomain,
            "databaseURL": databaseURL,
            "storageBucket": storageBucket,
        };
        window["firebase"]["initializeApp"](config);
        window.rexObjs.FirebaseObj.OnInit.RunHandlers();
    };

    //////////////////////////////////////
    // Conditions
    function Cnds() { };
    pluginProto.cnds = new Cnds();

    //////////////////////////////////////
    // Actions
    function Acts() { };
    pluginProto.acts = new Acts();

    Acts.prototype.initializeApp = function (apiKey, authDomain, databaseURL, storageBucket) {
        this.initializeApp(apiKey, authDomain, databaseURL, storageBucket);
    };

    //////////////////////////////////////
    // Expressions
    function Exps() { };
    pluginProto.exps = new Exps();
    
}()); 