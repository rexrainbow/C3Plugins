// ECMAScript 5 strict mode
"use strict";

assert2(cr, "cr namespace not created");
assert2(cr.plugins_, "cr.plugins_ not created");

/////////////////////////////////////
// Plugin class
cr.plugins_.Rex_TweenTasks = function (runtime) {
	this.runtime = runtime;
};

(function () {

	var tweenFunctions = {
		"linear": function (t) {
			return t;
		},
		"easeInQuad": function (t) {
			return t * t;
		},
		"easeOutQuad": function (t) {
			return -1 * t * (t - 2);
		},
		"easeInOutQuad": function (t) {
			if ((t /= 1 / 2) < 1) return 1 / 2 * t * t;
			return -1 / 2 * ((--t) * (t - 2) - 1);
		},
		"easeInCubic": function (t) {
			return t * t * t;
		},
		"easeOutCubic": function (t) {
			return 1 * ((t = t / 1 - 1) * t * t + 1);
		},
		"easeInOutCubic": function (t) {
			if ((t /= 1 / 2) < 1) return 1 / 2 * t * t * t;
			return 1 / 2 * ((t -= 2) * t * t + 2);
		},
		"easeInQuart": function (t) {
			return t * t * t * t;
		},
		"easeOutQuart": function (t) {
			return -1 * ((t = t / 1 - 1) * t * t * t - 1);
		},
		"easeInOutQuart": function (t) {
			if ((t /= 1 / 2) < 1) return 1 / 2 * t * t * t * t;
			return -1 / 2 * ((t -= 2) * t * t * t - 2);
		},
		"easeInQuint": function (t) {
			return 1 * (t /= 1) * t * t * t * t;
		},
		"easeOutQuint": function (t) {
			return 1 * ((t = t / 1 - 1) * t * t * t * t + 1);
		},
		"easeInOutQuint": function (t) {
			if ((t /= 1 / 2) < 1) return 1 / 2 * t * t * t * t * t;
			return 1 / 2 * ((t -= 2) * t * t * t * t + 2);
		},
		"easeInSine": function (t) {
			return -1 * Math.cos(t / 1 * (Math.PI / 2)) + 1;
		},
		"easeOutSine": function (t) {
			return 1 * Math.sin(t / 1 * (Math.PI / 2));
		},
		"easeInOutSine": function (t) {
			return -1 / 2 * (Math.cos(Math.PI * t / 1) - 1);
		},
		"easeInExpo": function (t) {
			return (t == 0) ? 1 : 1 * Math.pow(2, 10 * (t / 1 - 1));
		},
		"easeOutExpo": function (t) {
			return (t == 1) ? 1 : 1 * (-Math.pow(2, -10 * t / 1) + 1);
		},
		"easeInOutExpo": function (t) {
			if (t == 0) return 0;
			if (t == 1) return 1;
			if ((t /= 1 / 2) < 1) return 1 / 2 * Math.pow(2, 10 * (t - 1));
			return 1 / 2 * (-Math.pow(2, -10 * --t) + 2);
		},
		"easeInCirc": function (t) {
			if (t >= 1) return t;
			return -1 * (Math.sqrt(1 - (t /= 1) * t) - 1);
		},
		"easeOutCirc": function (t) {
			return 1 * Math.sqrt(1 - (t = t / 1 - 1) * t);
		},
		"easeInOutCirc": function (t) {
			if ((t /= 1 / 2) < 1) return -1 / 2 * (Math.sqrt(1 - t * t) - 1);
			return 1 / 2 * (Math.sqrt(1 - (t -= 2) * t) + 1);
		},
		"easeInElastic": function (t) {
			var s = 1.70158; var p = 0; var a = 1;
			if (t == 0) return 0; if ((t /= 1) == 1) return 1; if (!p) p = 1 * .3;
			if (a < Math.abs(1)) { a = 1; var s = p / 4; }
			else var s = p / (2 * Math.PI) * Math.asin(1 / a);
			return -(a * Math.pow(2, 10 * (t -= 1)) * Math.sin((t * 1 - s) * (2 * Math.PI) / p));
		},
		"easeOutElastic": function (t) {
			var s = 1.70158; var p = 0; var a = 1;
			if (t == 0) return 0; if ((t /= 1) == 1) return 1; if (!p) p = 1 * .3;
			if (a < Math.abs(1)) { a = 1; var s = p / 4; }
			else var s = p / (2 * Math.PI) * Math.asin(1 / a);
			return a * Math.pow(2, -10 * t) * Math.sin((t * 1 - s) * (2 * Math.PI) / p) + 1;
		},
		"easeInOutElastic": function (t) {
			var s = 1.70158; var p = 0; var a = 1;
			if (t == 0) return 0; if ((t /= 1 / 2) == 2) return 1; if (!p) p = 1 * (.3 * 1.5);
			if (a < Math.abs(1)) { a = 1; var s = p / 4; }
			else var s = p / (2 * Math.PI) * Math.asin(1 / a);
			if (t < 1) return -.5 * (a * Math.pow(2, 10 * (t -= 1)) * Math.sin((t * 1 - s) * (2 * Math.PI) / p));
			return a * Math.pow(2, -10 * (t -= 1)) * Math.sin((t * 1 - s) * (2 * Math.PI) / p) * .5 + 1;
		},
		"easeInBack": function (t) {
			var s = 1.70158;
			return 1 * (t /= 1) * t * ((s + 1) * t - s);
		},
		"easeOutBack": function (t) {
			var s = 1.70158;
			return 1 * ((t = t / 1 - 1) * t * ((s + 1) * t + s) + 1);
		},
		"easeInOutBack": function (t) {
			var s = 1.70158;
			if ((t /= 1 / 2) < 1) return 1 / 2 * (t * t * (((s *= (1.525)) + 1) * t - s));
			return 1 / 2 * ((t -= 2) * t * (((s *= (1.525)) + 1) * t + s) + 2);
		},
		"easeInBounce": function (t) {
			return 1 - tweenFunctions["easeOutBounce"](1 - t);
		},
		"easeOutBounce": function (t) {
			if ((t /= 1) < (1 / 2.75)) {
				return 1 * (7.5625 * t * t);
			} else if (t < (2 / 2.75)) {
				return 1 * (7.5625 * (t -= (1.5 / 2.75)) * t + .75);
			} else if (t < (2.5 / 2.75)) {
				return 1 * (7.5625 * (t -= (2.25 / 2.75)) * t + .9375);
			} else {
				return 1 * (7.5625 * (t -= (2.625 / 2.75)) * t + .984375);
			}
		},
		"easeInOutBounce": function (t) {
			if (t < 1 / 2) return tweenFunctions["easeInBounce"](t * 2) * .5;
			return tweenFunctions["easeOutBounce"](t * 2 - 1) * .5 + 1 * .5;
		}
	};

	var tweenFunctionNames = ["linear", "easeInQuad", "easeOutQuad", "easeInOutQuad",
		"easeInCubic", "easeOutCubic", "easeInOutCubic", "easeInQuart",
		"easeOutQuart", "easeInOutQuart", "easeInQuint", "easeOutQuint",
		"easeInOutQuint", "easeInSine", "easeOutSine", "easeInOutSine",
		"easeInExpo", "easeOutExpo", "easeInOutExpo", "easeInCirc",
		"easeOutCirc", "easeInOutCirc", "easeInElastic", "easeOutElastic",
		"easeInOutElastic", "easeInBack", "easeOutBack", "easeInOutBack",
		"easeInBounce", "easeOutBounce", "easeInOutBounce"];


	var pluginProto = cr.plugins_.Rex_TweenTasks.prototype;

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
		this.tasksMgr = new window.rexObjs.TweenTaskMgrKlass(this);
		this.exp_task = null;
		this.exp_fnPercentage = 0;
		this.exp_bindInstUID = -1;
		this.exp_bindInstTypeSID = null;

		this.my_timescale = -1.0;
		this.runtime.tickMe(this);
	};
	instanceProto.onDestroy = function () {
		this.tasksMgr.CleanAll();
	};
	instanceProto.tick = function () {
		var dt = this.runtime.getDt(this);
		if (dt === 0)
			return;

		this.tasksMgr.Tick(dt);
	};
	instanceProto.OnTaskStart = function (task) {
		this.exp_task = task;
		this.runtime.trigger(cr.plugins_.Rex_TweenTasks.prototype.cnds.OnAnyTaskStart, this);
		this.runtime.trigger(cr.plugins_.Rex_TweenTasks.prototype.cnds.OnTaskStart, this);
		this.exp_task = null;
	};
	instanceProto.OnTaskDone = function (task) {
		this.exp_task = task;
		this.runtime.trigger(cr.plugins_.Rex_TweenTasks.prototype.cnds.OnAnyTaskDone, this);
		this.runtime.trigger(cr.plugins_.Rex_TweenTasks.prototype.cnds.OnTaskDone, this);
		this.exp_task = null;
	};
	instanceProto.CallFunction = function (task, percentage, bindInstUID, bindInstTypeSID) {
		this.exp_task = task;
		this.exp_fnPercentage = percentage;
		this.exp_bindInstUID = bindInstUID;
		this.exp_bindInstTypeSID = bindInstTypeSID;
		this.runtime.trigger(cr.plugins_.Rex_TweenTasks.prototype.cnds.OnFunction, this);
		this.exp_task = null;
		this.exp_fnPercentage = 0;
		this.exp_bindInstUID = -1;
		this.exp_bindInstTypeSID = null;
	};

	instanceProto.PickBindInst = function (uid, sid) {
		var inst = this.runtime.getObjectByUID(uid);
		if (!inst)
			return;
		var objtype = this.get_objtype(sid);
		if (!objtype)
			return;

		var sol = objtype.getCurrentSol();
		sol.select_all = false;
		sol.instances.length = 0;   // clear contents
		sol.instances.push(inst);
		objtype.applySolToContainer();
	};

	var _sid2typeIndex = {};
	instanceProto.get_objtype = function (sid) {
		var idx, objtype;
		if (!_sid2typeIndex.hasOwnProperty(sid)) {
			idx = get_typeIndex(this.runtime.types_by_index, sid);
			_sid2typeIndex[sid] = idx;
			objtype = this.runtime.types_by_index[idx];
		}
		else {
			idx = _sid2typeIndex[sid];
			objtype = this.runtime.types_by_index[idx];
			if ((!objtype) || (objtype.sid != sid)) {
				delete _sid2typeIndex[sid];
				return this.get_objtype(sid);
			}
		}
		return objtype;
	};

	var get_typeIndex = function (objtypes, sid) {
		var i, len = objtypes.length, t;
		for (i = 0; i < len; i++) {
			t = objtypes[i];
			if (t.sid === sid) {
				return i;
			}
		}
	};

	instanceProto.GetFnParam = function (paramName, valueType) {
		if (!this.exp_task)
			return 0;

		var fnParams = this.exp_task.fnParams;
		var v;
		if (fnParams.hasOwnProperty(paramName)) {
			var param = fnParams[paramName];
			if (param.updateFlag) // using default easeType
				easeParam(param, this.exp_fnPercentage, param.easeType);

			v = param.GetValue(valueType);
		}
		else
			v = 0;

		return v;
	};

	var easeParam = function (param, percentage, easeType) {
		var easePercentage;
		if ((percentage == 0) || (percentage == 1))
			easePercentage = percentage;
		else {
			var tweenFn = tweenFunctions[tweenFunctionNames[easeType]];
			easePercentage = tweenFn(percentage);
		}

		var v = param.Lerp(easePercentage);
		return v;
	};

	instanceProto.saveToJSON = function () {
		return {
			"tasksMgr": this.tasksMgr.saveToJSON(),
			"ts": this.my_timescale
		};
	};

	instanceProto.loadFromJSON = function (o) {
		this.tasksMgr.loadFromJSON(o["tasksMgr"]);
		this.my_timescale = o["ts"];
	};

	/**BEGIN-PREVIEWONLY**/
	instanceProto.getDebuggerValues = function (propsections) {
		var prop = [];
		this.tasksMgr.getDebuggerValues(prop);

		propsections.push({
			"title": this.type.name,
			"properties": prop
		});
	};

	instanceProto.onDebugValueEdited = function (header, name, value) {
	};
	/**END-PREVIEWONLY**/
	//////////////////////////////////////
	// Conditions
	function Cnds() { };
	pluginProto.cnds = new Cnds();

	Cnds.prototype.OnFunction = function (fnName) {
		var is_my_fn = cr.equals_nocase(fnName, this.exp_task.fnName);
		if (is_my_fn && (this.exp_bindInstTypeSID != null)) {
			this.PickBindInst(this.exp_bindInstUID, this.exp_bindInstTypeSID);
		}
		return is_my_fn;
	};
	Cnds.prototype.OnTaskDone = function (taskName) {
		return cr.equals_nocase(taskName, this.exp_task.taskName);
	};
	Cnds.prototype.OnAnyTaskDone = function () {
		return true;
	};
	Cnds.prototype.OnAnyTaskStart = function () {
		return true;
	};
	Cnds.prototype.OnTaskStart = function (taskName) {
		return cr.equals_nocase(taskName, this.exp_task.taskName);
	};

	Cnds.prototype.IsRunning = function (taskName) {
		var task = this.tasksMgr.GetActivatedTask(taskName);
		return (!!task);
	};

	//////////////////////////////////////
	// Actions
	function Acts() { };
	pluginProto.acts = new Acts();

	Acts.prototype.ApplyEasing = function (paramName, easeType) {
		if (!this.exp_fnParams.hasOwnProperty(paramName))
			return;

		var param = this.exp_fnParams[paramName];
		easeParam(param, this.exp_fnPercentage, easeType);
	};

	Acts.prototype.NewTweenTask = function (taskName, fnName, interval, repeatCount) {
		this.tasksMgr.CreateTweenTask(taskName, fnName, interval, repeatCount);
	};

	Acts.prototype.SetFnParameter = function (taskName, paramName, start, end, easeType) {
		var task = this.tasksMgr.GetTask(taskName);
		if ((!task) || (!task.SetFnParameter))
			return;

		task.SetFnParameter(paramName, start, end, easeType);
	};

	Acts.prototype.NewWaitTask = function (taskName, interval) {
		this.tasksMgr.CreateWaitTask(taskName, interval);
	};

	Acts.prototype.NewSequenceTask = function (taskName, repeatCount, childrenTasks) {
		var task = this.tasksMgr.CreateSequenceTask(taskName, repeatCount);
		var i, cnt = childrenTasks.length, childTask;
		for (i = 0; i < cnt; i++) {
			this.tasksMgr.AddChildTask(taskName, childrenTasks[i]);
		}
	};
	Acts.prototype.NewParallelTask = function (taskName, repeatCount, childrenTasks) {
		var task = this.tasksMgr.CreateParallelTask(taskName, repeatCount);
		var i, cnt = childrenTasks.length, childTask;
		for (i = 0; i < cnt; i++) {
			this.tasksMgr.AddChildTask(taskName, childrenTasks[i]);
		}
	};

	Acts.prototype.NewInversedTweenTask = function (taskName, targetTaskName) {
		this.tasksMgr.CreateInversedTask(taskName, targetTaskName);
	};

	Acts.prototype.NewWaitForSignalTask = function (taskName, signalName) {
		this.tasksMgr.CreateWaitForSignalTask(taskName, signalName);
	};

	Acts.prototype.AddChildTask = function (parentTaskName, childTaskName) {
		this.tasksMgr.AddChildTask(parentTaskName, childTaskName);
	};

	Acts.prototype.SetTaskParameter = function (taskName, paramName, paramValue) {
		this.tasksMgr.SetTaskParameter(taskName, paramName, paramValue);
	};

	Acts.prototype.BindInst = function (taskName, objtype, destroyAfterTaskDone) {
		if (objtype == null)
			return;

		var inst, sid;
		if (typeof (objtype) == "object") {
			inst = objtype.getFirstPicked();
		}
		else {
			var uid = objtype;
			inst = this.runtime.getObjectByUID(uid);
			objtype = inst.type;
		}

		if (!inst)
			return;

		var task = this.tasksMgr.GetCandidateTask(taskName);
		if (task)
		    task.BindInst(inst.uid, objtype.sid, (destroyAfterTaskDone == 1));
	};

	Acts.prototype.StartTask = function (taskName, destroyAfterDone) {
		this.tasksMgr.StartTask(taskName, destroyAfterDone);
	};

	Acts.prototype.PauseTask = function (taskName) {
		this.tasksMgr.PauseTask(taskName);
	};

	Acts.prototype.ResumeTask = function (taskName) {
		this.tasksMgr.ResumeTask(taskName);
	};

	Acts.prototype.DestroyTask = function (taskName) {
		this.tasksMgr.DestroyTask(taskName);
	};

	Acts.prototype.ContinueTask = function (taskName, signalName) {
		this.tasksMgr.ContinueTasks(taskName, signalName);
	};

	Acts.prototype.ContinueTasksBySignal = function (signalName) {
		this.tasksMgr.ContinueTasks(null, signalName);
	};

	Acts.prototype.SetRemainIntervalPercentage = function (taskName, remainIntervalPercentage) {
		var task = this.tasksMgr.GetActivatedTask(taskName);
		if (task == null)
			return;

		if ((task.interval == null) || (task.remainInterval == null))
			return;

		task.remainInterval = task.interval * remainIntervalPercentage;
	};

	//////////////////////////////////////
	// Expressions
	function Exps() { };
	pluginProto.exps = new Exps();

	Exps.prototype.FnParam = function (ret, paramName, valueType) {
		ret.set_float(this.GetFnParam(paramName, valueType));
	};

	Exps.prototype.TaskParam = function (ret, taskName, paramName, default_value) {
		var v = this.tasksMgr.GetTaskParameter(taskName, paramName);
		if (v == null)
			v = default_value || 0;

		ret.set_any(v);
	};

	Exps.prototype.TaskName = function (ret) {
		var n = "";
		if (this.exp_task)
			n = this.exp_task.taskName;
		ret.set_string(n);
	};

	Exps.prototype.ChildTaskName = function (ret, taskName) {
		var n = "", task;
		if (taskName)
			task = this.tasksMgr.GetActivatedTask(taskName);
		else
			task = this.exp_task;

		if (task && task.GetCurrentSubTask)
			n = task.GetCurrentSubTask().taskName;
		ret.set_string(n);
	};

	Exps.prototype.RootTaskName = function (ret, taskName) {
		var n = "", task;
		if (taskName)
			task = this.tasksMgr.GetActivatedTask(taskName);
		else
			task = this.exp_task;

		if (task)
			n = task.GetRootTask().taskName;
		ret.set_string(n);
	};

	Exps.prototype.BoundInstUID = function (ret) {
		ret.set_int(this.exp_bindInstUID);
	};


}());