// ECMAScript 5 strict mode
"use strict";

assert2(cr, "cr namespace not created");
assert2(cr.plugins_, "cr.plugins_ not created");

/////////////////////////////////////
// Plugin class
cr.plugins_.Rex_Scenario = function (runtime) {
    this.runtime = runtime;
};

(function () {
    var pluginProto = cr.plugins_.Rex_Scenario.prototype;

    /////////////////////////////////////
    // Object type class
    pluginProto.Type = function (plugin) {
        this.plugin = plugin;
        this.runtime = plugin.runtime;
    };

    var typeProto = pluginProto.Type.prototype;

    typeProto.onCreate = function () {};

    /////////////////////////////////////
    // Instance class
    pluginProto.Instance = function (type) {
        this.type = type;
        this.runtime = type.runtime;
    };

    var instanceProto = pluginProto.Instance.prototype;

    instanceProto.onCreate = function () {
        if (!this.recycled) {
            this._scenario = new window.rexObjs.ScenarioKlass(this);
        } else {
            this._scenario.Reset();
        }


        this._scenario.isDebugMode = (typeof (log) !== "undefined") && this.properties[0];
        this._scenario.isAccMode = (this.properties[1] === 0);
        this._scenario.isEvalMode = this.properties[2];
        this._scenario.isMustacheMode = this.properties[4];
        this.delimiterCfg = null;
        this.setDelimiter(this.properties[5], this.properties[6]);

        this.timeline = null;
        this.timelineUid = -1; // for loading     

        // callback:      
        this.c2FnType = null;

        // sync timescale
        this.my_timescale = -1.0;
        this.runtime.tickMe(this);
        this.isSyncTimescaleMode = this.properties[3];
        this.preTimescale = 1;
    };

    instanceProto.setDelimiter = function (leftDelimiter, rightDelimiter) {
        if (leftDelimiter === "") leftDelimiter = "{{";
        if (rightDelimiter === "") rightDelimiter = "}}";
        if ((leftDelimiter === "{{") && (rightDelimiter === "}}"))
            this.delimiterCfg = null;
        else
            this.delimiterCfg = "{{=" + leftDelimiter + " " + rightDelimiter + "=}}";
    };

    instanceProto.tick = function () {
        if (this.isSyncTimescaleMode)
            this.syncTimescale();
    };

    instanceProto.syncTimescale = function () {
        var ts = this.getTimescale();
        if (this.preTimescale == ts)
            return;

        this._scenario.SetTimescale(ts);
        this.preTimescale = ts;
    };

    instanceProto.getTimescale = function () {
        var ts = this.my_timescale;
        if (ts == -1)
            ts = 1;
        return ts;
    };

    instanceProto.onDestroy = function () {
        this._scenario.onDestroy();
    };

    instanceProto.getTimeline = function () {
        if (this.timeline != null)
            return this.timeline;

        assert2(cr.plugins_.Rex_TimeLine, "Scenario: Can not find timeline oject.");
        var plugins = this.runtime.types;
        var name, inst;
        for (name in plugins) {
            inst = plugins[name].instances[0];
            if (inst instanceof cr.plugins_.Rex_TimeLine.prototype.Instance) {
                this.timeline = inst;
                return this.timeline;
            }
        }
        assert2(this.timeline, "Scenario: Can not find timeline oject.");
        return null;
    };

    // ---- callback ----    
    instanceProto.getC2FnType = function (raise_assert_when_not_fnobj_avaiable) {
        if (this.c2FnType === null) {
            if (window["c2_callRexFunction2"])
                this.c2FnType = "c2_callRexFunction2";
            else if (window["c2_callFunction"])
                this.c2FnType = "c2_callFunction";
            else {
                if (raise_assert_when_not_fnobj_avaiable)
                    assert2(this.c2FnType, "Timeline: Official function, or rex_function2 was not found.");

                this.c2FnType = "";
            }
        }
        return this.c2FnType;
    };

    instanceProto.RunCallback = function (c2FnName, c2FnParms, raise_assert_when_not_fnobj_avaiable) {
        var c2FnGlobalName = this.getC2FnType(raise_assert_when_not_fnobj_avaiable);
        if (c2FnGlobalName === "")
            return null;

        var retValue = window[c2FnGlobalName](c2FnName, c2FnParms);
        return retValue;
    };
    // ---- callback ----      

    instanceProto.render = function (template, view) {
        if (this.delimiterCfg !== null)
            template = this.delimiterCfg + template;

        return window["Mustache"]["render"](template, view);
    };

    instanceProto.saveToJSON = function () {
        return {
            "s": this._scenario.saveToJSON(),
            "tlUid": (this.timeline != null) ? this.timeline.uid : (-1),
            "ft": this.c2FnType,
        };
    };

    instanceProto.loadFromJSON = function (o) {
        this._scenario.loadFromJSON(o["s"]);
        this.timelineUid = o["tlUid"];
        this.c2FnType = o["ft"];
    };

    instanceProto.afterLoad = function () {
        if (this.timelineUid === -1)
            this.timeline = null;
        else {
            this.timeline = this.runtime.getObjectByUID(this.timelineUid);
            assert2(this.timeline, "Scenario: Failed to find timeline object by UID");
        }

        this._scenario.afterLoad();
    };

    /**BEGIN-PREVIEWONLY**/
    instanceProto.getDebuggerValues = function (propsections) {
        var prop = [];
        prop.push({
            "name": "Tag",
            "value": this._scenario.GetLastTag()
        });
        var debuggerInfo = this._scenario.debuggerInfo;
        var i, cnt = debuggerInfo.length;
        for (i = 0; i < cnt; i++)
            prop.push(debuggerInfo[i]);
        var k, mem = this._scenario["Mem"];
        for (k in mem)
            prop.push({
                "name": "MEM-" + k,
                "value": mem[k]
            });

        propsections.push({
            "title": this.type.name,
            "properties": prop
        });
    };

    instanceProto.onDebugValueEdited = function (header, name, value) {
        if (name == "Tag") // change page
        {
            if (this._scenario.HasTag(value))
                this._scenario.Start(null, value);
            else
                alert("Invalid tag " + value);
        } else if (name.substring(0, 4) == "MEM-") // set mem value
        {
            var k = name.substring(4);
            this._scenario["Mem"][k] = value;
        }
    };
    /**END-PREVIEWONLY**/

    //////////////////////////////////////
    // Conditions
    function Cnds() {};
    pluginProto.cnds = new Cnds();

    Cnds.prototype.OnCompleted = function () {
        return true;
    };

    Cnds.prototype.IsRunning = function () {
        return this._scenario.IsRunning;
    };

    Cnds.prototype.OnTagChanged = function () {
        return true;
    };

    Cnds.prototype.IsTagExisted = function (tag) {
        return this._scenario.HasTag(tag);
    };

    Cnds.prototype.IsWaiting = function (key) {
        return this._scenario.IsPaused(key);
    };
    Cnds.prototype.OnWaitingStart = function (key) {
        return this._scenario.IsPaused(key);
    };
    //////////////////////////////////////
    // Actions
    function Acts() {};
    pluginProto.acts = new Acts();

    Acts.prototype.Setup_deprecated = function (timeline_objs, fn_objs) {};

    Acts.prototype.LoadCmds = function (s, fmt) {
        this._scenario.Load(s, fmt);
    };

    Acts.prototype.Start = function (offset, tag) {
        this._scenario.Start(offset, tag);
    };

    Acts.prototype.Pause = function () {
        var timer = this._scenario.timer;
        if (timer)
            timer.Suspend();
    };

    Acts.prototype.Resume = function () {
        var timer = this._scenario.timer;
        if (timer)
            timer.Resume();
    };

    Acts.prototype.Stop = function () {
        this._scenario.Stop();
    };

    Acts.prototype.SetOffset = function (offset) {
        this._scenario.offset = offset;
    };

    Acts.prototype.CleanCmds = function () {
        this._scenario.Clean();
    };

    Acts.prototype.AppendCmds = function (s, fmt) {
        this._scenario.Append(s, fmt);
    };

    Acts.prototype.Continue = function (key) {
        this._scenario.Resume(key);
    };

    Acts.prototype.GoToTag = function (tag) {
        this._scenario.Start(null, tag);
    };

    Acts.prototype.SetMemory = function (index, value) {
        this._scenario["Mem"][index] = value;
    };

    Acts.prototype.StringToMEM = function (JSON_string) {
        this._scenario["Mem"] = JSON.parse(JSON_string);;
    };

    Acts.prototype.SetupTimeline = function (timeline_objs) {
        var timeline = timeline_objs.getFirstPicked();
        if ((cr.plugins_.Rex_TimeLine) && (timeline instanceof cr.plugins_.Rex_TimeLine.prototype.Instance))
            this.timeline = timeline;
        else
            alert("Scenario should connect to a timeline object");
    };

    Acts.prototype.SetupCallback = function (callback_type) {
        this.c2FnType = (callback_type === 0) ? "c2_callFunction" : "c2_callRexFunction2";
    };

    Acts.prototype.SetDelimiters = function (leftDelimiter, rightDelimiter) {
        this.setDelimiter(leftDelimiter, rightDelimiter);
    };
    //////////////////////////////////////
    // Expressions
    function Exps() {};
    pluginProto.exps = new Exps();

    Exps.prototype.LastTag = function (ret) {
        ret.set_string(this._scenario.GetLastTag());
    };

    Exps.prototype.Mem = function (ret, index) {
        var val = (this._scenario["Mem"].hasOwnProperty(index)) ?
            this._scenario["Mem"][index] : 0;
        ret.set_any(val);
    };

    Exps.prototype.MEMToString = function (ret) {
        ret.set_string(JSON.stringify(this._scenario["Mem"]));
    };

    Exps.prototype.PreviousTag = function (ret) {
        ret.set_string(this._scenario.GetPrevTag());
    };

    Exps.prototype.CurrentTag = Exps.prototype.LastTag;

}());