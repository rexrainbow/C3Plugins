// ECMAScript 5 strict mode
"use strict";

assert2(cr, "cr namespace not created");
assert2(cr.plugins_, "cr.plugins_ not created");

/////////////////////////////////////
// Plugin class
cr.plugins_.Rex_TimeLine = function (runtime) {
    this.runtime = runtime;
};

(function () {
    // TimerCacheKlass
    var TimerCacheKlass = function () {
        this.lines = [];
    };
    var TimerCacheKlassProto = TimerCacheKlass.prototype;

    TimerCacheKlassProto.alloc = function (timeline, on_timeout) {
        var timer;
        if (this.lines.length > 0) {
            timer = this.lines.pop();
            timeline.LinkTimer(timer);
        }
        else {
            timer = timeline.CreateTimer(on_timeout);
        }
        return timer;
    };

    TimerCacheKlassProto.free = function (timer) {
        this.lines.push(timer);
    };
    // TimerCacheKlass	
    cr.plugins_.Rex_TimeLine.timerCache = new TimerCacheKlass();

    var pluginProto = cr.plugins_.Rex_TimeLine.prototype;

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
        this.updateMode = this.properties[0];
        this.ManualMode = (this.updateMode === 0);
        this.GameTimeMode = (this.updateMode === 1);
        this.RealTimeMode = (this.updateMode === 2);

        this.updateManually = this.ManualMode;
        this.updateWithGameTime = this.GameTimeMode;
        this.updateWithRealTime = this.RealTimeMode;

        if (this.RealTimeMode) {
            var timer = new Date();
            this.lastRealTime = timer.getTime();
        }
        else {
            this.lastRealTime = null;
        }

        this.my_timescale = -1.0;

        // timeline  
        this.timeline = new window.rexObjs.TimelineKlass();
        if (this.GameTimeMode || this.RealTimeMode)
            this.runtime.tickMe(this);
        this.check_name = "TIMELINE";

        // timers
        if (!this.recycled) {
            this.timers = {};
        }
        this.timerCache = cr.plugins_.Rex_TimeLine.timerCache;
        this.exp_triggeredTimerName = "";
        this.timersSave = null;

        // callback:      
        this.c2FnType = null;
    };

    instanceProto.onDestroy = function () {
        this.timeline.CleanAll();
        var name;
        for (name in this.timers)
            this.destroyLocalTimer(name);
    };

    instanceProto.tick = function () {
        if (this.GameTimeMode) {
            if (this.updateWithGameTime) {
                var dt = this.runtime.getDt(this);
                this.timeline.Dispatch(dt);
            }
        }
        else if (this.RealTimeMode) {
            var timer = new Date();
            var lastRealTime = timer.getTime();

            if (this.updateWithRealTime) {
                var dt = (lastRealTime - this.lastRealTime) / 1000;
                this.timeline.Dispatch(dt);
            }

            this.lastRealTime = lastRealTime;
        }
    };

    // export: get new timer instance
    instanceProto.CreateTimer = function (on_timeout) {
        var timer = new window.rexObjs.TimerKlass(this.timeline);
        timer.TimeoutHandlerSet(on_timeout);  // hang OnTimeout function
        return timer;
    };

    instanceProto.LinkTimer = function (timer) {
        timer.Reset(this.timeline)
        return timer;
    };

    // load timer (for save/load system)
    instanceProto.LoadTimer = function (load_info, on_timeout) {
        var timer = this.CreateTimer(on_timeout);
        timer.loadFromJSON(load_info);
        timer.afterLoad();
        return timer;
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

    instanceProto.TimeGet = function () {
        return this.timeline.absTime;
    };

    // ---- local timer ----
    // get timer / free timer
    instanceProto.create_local_timer = function (timer_name) {
        var timer = this.timers[timer_name];
        if (timer != null)  // timer exist
        {
            timer.Remove();
        }
        else      // get timer from timer cache
        {
            timer = this.timerCache.alloc(this, on_timeout);
            timer.plugin = this;
            this.timers[timer_name] = timer;
        }

        return timer;
    };

    instanceProto.destroyLocalTimer = function (timer_name) {
        var timer = this.timers[timer_name];
        if (timer == null)
            return;

        timer.Remove();
        delete this.timers[timer_name];
        this.timerCache.free(timer);
    };

    instanceProto.timer_cache_clean = function () {
        this.timerCache.lines.length = 0;
    };

    // handler of timeout for timers in this plugin, this=timer   
    var on_timeout = function () {
        var plugin = this.plugin;
        plugin.exp_triggeredTimerName = this._cb.name;
        var name = this._cb.command;
        var params = this._cb.params;
        plugin.RunCallback(name, params, true);

        if (this._repeat_count === 0)
            this.Start();
        else if (this._repeat_count > 1) {
            this._repeat_count -= 1;
            this.Start();
        }
    };

    instanceProto._get_timer_cb_params = function (timer_name) {
        var params = {
            name: timer_name,
            command: "",
            params: []
        };
        return params;
    };   // fix me
    // ---- local timer ----

    instanceProto.saveToJSON = function () {
        var name, timer, timersSave = {};
        for (name in this.timers) {
            timer = this.timers[name];
            timersSave[name] = {
                "tim": timer.saveToJSON(),
                "cmd": timer._cb.command,
                "pams": timer._cb.params,
                "rc": timer._repeat_count,
            };
        }
        return {
            "ts": this.my_timescale,
            "ug": this.updateWithGameTime,
            "tl": this.timeline.saveToJSON(),
            "timers": timersSave,
            "lrt": this.lastRealTime,
            "ft": this.c2FnType,
        };
    };

    instanceProto.loadFromJSON = function (o) {
        this.my_timescale = o["ts"];
        this.timeline.loadFromJSON(o["tl"]);
        this.timersSave = o["timers"];
        this.lastRealTime = o["lrt"];
        this.c2FnType = o["ft"];

        this.onDestroy();
        this.timer_cache_clean();
    };


    instanceProto.afterLoad = function () {
        var name, timer_info, timer;
        for (name in this.timersSave) {
            timer_info = this.timersSave[name];
            timer = this.LoadTimer(timer_info["tim"], on_timeout);
            timer.plugin = this;
            timer._cb = this._get_timer_cb_params(name);
            timer._cb.command = timer_info["cmd"];
            timer._cb.params = timer_info["pams"];
            timer._repeat_count = timer_info["rc"];
        }
        this.timersSave = null;
    };

    /**BEGIN-PREVIEWONLY**/
    instanceProto.getDebuggerValues = function (propsections) {
        var props = [];
        props.push({ "name": "Timeline's time", "value": this.timeline.absTime });

        var name, timer;
        for (name in this.timers) {
            timer = this.timers[name];
            props.push({ "name": name, "value": timer._cb.command });
        }


        propsections.push({
            "title": this.type.name,
            "properties": props
        });
    };

    instanceProto.onDebugValueEdited = function (header, name, value) {
    };
    /**END-PREVIEWONLY**/

    //////////////////////////////////////
    // Conditions
    function Cnds() { };
    pluginProto.cnds = new Cnds();

    Cnds.prototype.IsRunning = function (timer_name) {
        var timer = this.timers[timer_name];
        return (timer) ? timer.IsActive() : false;
    };

    //////////////////////////////////////
    // Actions
    function Acts() { };
    pluginProto.acts = new Acts();

    Acts.prototype.PushTimeLine = function (deltaTime) {
        if (!this.updateManually)
            return;

        // push manually
        this.timeline.Dispatch(deltaTime);
    };

    // deprecated
    Acts.prototype.Setup_deprecated = function () { };
    Acts.prototype.CreateTimer_deprecated = function () { };
    // deprecated

    Acts.prototype.StartTimer = function (timer_name, delayTime, repeat_count) {
        var timer = this.timers[timer_name];
        if (timer) {
            timer._repeat_count = repeat_count;
            timer.Start(delayTime);
        }
    };

    Acts.prototype.StartTrgTimer = function (delayTime) {
        var timer_name = this.exp_triggeredTimerName;
        var timer = this.timers[timer_name];
        if (timer)
            timer.Start(delayTime);
    };

    Acts.prototype.PauseTimer = function (timer_name) {
        var timer = this.timers[timer_name];
        if (timer)
            timer.Suspend();
    };

    Acts.prototype.ResumeTimer = function (timer_name) {
        var timer = this.timers[timer_name];
        if (timer)
            timer.Resume();
    };

    Acts.prototype.StopTimer = function (timer_name) {
        var timer = this.timers[timer_name];
        if (timer)
            timer.Remove();
    };

    Acts.prototype.CleanTimeLine = function () {
        this.timeline.CleanAll();
    };

    Acts.prototype.DeleteTimer = function (timer_name) {
        this.destroyLocalTimer(timer_name);
    };

    Acts.prototype.SetTimerParameter = function (timer_name, index, value) {
        var timer = this.timers[timer_name];
        if (timer) {
            timer._cb.params[index] = value;
        }
    };

    Acts.prototype.PauseTimeLine = function () {
        if (this.GameTimeMode)
            this.updateWithGameTime = false;
        else if (this.RealTimeMode)
            this.updateWithRealTime = false;
    };

    Acts.prototype.ResumeTimeLine = function () {
        if (this.GameTimeMode)
            this.updateWithGameTime = true;
        else if (this.RealTimeMode)
            this.updateWithRealTime = true;
    };

    Acts.prototype.CreateTimer = function (timer_name, callback_name, callback_params) {
        var timer = this.create_local_timer(timer_name);
        timer._cb = this._get_timer_cb_params(timer_name);
        timer._cb.command = callback_name;
        cr.shallowAssignArray(timer._cb.params, callback_params);
    };

    Acts.prototype.SetTimerParameters = function (timer_name, callback_params) {
        var timer = this.timers[timer_name];
        if (timer) {
            cr.shallowAssignArray(timer._cb.params, callback_params);
        }
    };

    Acts.prototype.SetTrgTimerParameters = function (callback_params) {
        var timer_name = this.exp_triggeredTimerName;
        var timer = this.timers[timer_name];
        if (timer) {
            cr.shallowAssignArray(timer._cb.params, callback_params);
        }
    };

    Acts.prototype.DeleteTrgTimer = function () {
        this.destroyLocalTimer(this.exp_triggeredTimerName);
    };

    Acts.prototype.PushTimeLineTo = function (t) {
        if (!this.updateManually)
            return;

        // push manually
        var deltaTime = t - this.timeline.absTime;
        if (deltaTime < 0)
            return;

        this.timeline.Dispatch(deltaTime);
    };

    Acts.prototype.SetupCallback = function (callbackType) {
        this.c2FnType = (callbackType === 0) ? "c2_callFunction" : "c2_callRexFunction2";
    };

    //////////////////////////////////////
    // Expressions
    function Exps() { };
    pluginProto.exps = new Exps();

    Exps.prototype.TimerRemainder = function (ret, timer_name) {
        var timer = this.timers[timer_name];
        var t = (timer) ? timer.RemainderTimeGet() : 0;
        ret.set_float(t);
    };

    Exps.prototype.TimerElapsed = function (ret, timer_name) {
        var timer = this.timers[timer_name];
        var t = (timer) ? timer.ElapsedTimeGet() : 0;
        ret.set_float(t);
    };

    Exps.prototype.TimerRemainderPercent = function (ret, timer_name) {
        var timer = this.timers[timer_name];
        var t = (timer) ? timer.RemainderTimePercentGet() : 0;
        ret.set_float(t);
    };

    Exps.prototype.TimerElapsedPercent = function (ret, timer_name) {
        var timer = this.timers[timer_name];
        var t = (timer) ? timer.ElapsedTimePercentGet() : 0;
        ret.set_float(t);
    };

    Exps.prototype.TimeLineTime = function (ret) {
        ret.set_float(this.timeline.absTime);
    };

    Exps.prototype.TriggeredTimerName = function (ret) {
        ret.set_string(this.exp_triggeredTimerName);
    };

    Exps.prototype.TimerDelayTime = function (ret) {
        var timer = this.timers[timer_name];
        var t = (timer) ? timer.DelayTimeGet() : 0;
        ret.set_float(t);
    };

}());
