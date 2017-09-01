// ECMAScript 5 strict mode
"use strict";

assert2(cr, "cr namespace not created");
assert2(cr.plugins_, "cr.plugins_ not created");

/////////////////////////////////////
// Plugin class
cr.plugins_.Rex_Pause = function (runtime) {
    this.runtime = runtime;
};

(function () {
    var pluginProto = cr.plugins_.Rex_Pause.prototype;

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
        this.isPaused = false;
        this.previousTimescale = 0;
    };

    instanceProto.onDestroy = function () {
        this.setState(false);
    };

    instanceProto.setState = function (isPaused) {
        if (isPaused === this.isPaused)
            return;

        this.isPaused = isPaused;
        var trigFn;
        if (this.isPaused) {
            this.previousTimescale = this.runtime.timescale;
            this.runtime.timescale = 0;
            trigFn = cr.plugins_.Rex_Pause.prototype.cnds.OnPaused;
        }
        else {
            this.runtime.timescale = this.previousTimescale;
            this.previousTimescale = 0;
            trigFn = cr.plugins_.Rex_Pause.prototype.cnds.OnResumed;
        }
        this.runtime.trigger(trigFn, this);
    };

    instanceProto.saveToJSON = function () {
        return {
            "p": this.isPaused,
            "ts": this.previousTimescale
        };
    };

    instanceProto.loadFromJSON = function (o) {
        this.isPaused = o["p"];
        this.previousTimescale = o["ts"];
    };

    /**BEGIN-PREVIEWONLY**/
    instanceProto.getDebuggerValues = function (propsections) {
        propsections.push({
            "title": this.type.name,
            "properties": [{ "name": "State", "value": (this.isPaused) ? "Paused" : "Run" },
            { "name": "Previous timescale", "value": this.previousTimescale }]
        });
    };
    /**END-PREVIEWONLY**/

    //////////////////////////////////////
    // Conditions
    function Cnds() { };
    pluginProto.cnds = new Cnds();

    Cnds.prototype.OnPaused = function () {
        return true;
    };

    Cnds.prototype.OnResumed = function () {
        return true;
    };

    Cnds.prototype.IsPaused = function () {
        return this.isPaused;
    };

    //////////////////////////////////////
    // Actions
    function Acts() { };
    pluginProto.acts = new Acts();

    Acts.prototype.ToggleState = function () {
        this.setState(!this.isPaused);
    };

    Acts.prototype.SetState = function (state) {
        var isPaused = (state === 0);
        this.setState(isPaused);
    };

    //////////////////////////////////////
    // Expressions
    function Exps() { };
    pluginProto.exps = new Exps();

    Exps.prototype.PreTimescale = function (ret) {
        ret.set_float(this.previousTimescale);
    };

}());