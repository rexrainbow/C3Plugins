(function () {

    if (!window.rexObjs)
        window.rexObjs = {};

    if (window.rexObjs.ScenarioKlass)
        return;

    var ScenarioKlass = function (plugin) {
        this.plugin = plugin;
        this.isDebugMode = true;
        this.isMustacheMode = false;
        this.isEvalMode = true;
        this.isAccMode = false;
        this.cmdTable = new CmdQueueKlass(this);
        // default is the same as worksheet 
        // -status-
        this.IsRunning = false;
        this.isPaused = false;
        // --------
        this.sn = 0; // serial number of starting
        this.timer = null;
        this.preAbsTime = 0;
        this.offset = 0;
        // for other commands   
        this.extraCmdHandlers = {
            "wait": new CmdWAITKlass(this),
            "time stamp": new CmdTIMESTAMPKlass(this),
            "exit": new CmdEXITKlass(this),
            "tag": new CmdTAGKlass(this),
            "goto": new CmdGOTOKlass(this),
            "if": new CmdIFKlass(this),
            "else if": new CmdELSEIFKlass(this),
            "else": new CmdELSEKlass(this),
            "end if": new CmdENDIFKlass(this),
        };
        // alias
        this.extraCmdHandlers["label"] = this.extraCmdHandlers["tag"];

        // variablies pool
        this["Mem"] = {};
        this.timerSave = null;

        /**BEGIN-PREVIEWONLY**/
        this.debuggerInfo = [];
        /**END-PREVIEWONLY**/
    };
    var ScenarioKlassProto = ScenarioKlass.prototype;

    // export methods
    ScenarioKlassProto.Reset = function () {
        //this.cmdTable = new CmdQueueKlass(this);        
        this.Clean();

        // -status-
        this.IsRunning = false;
        this.isPaused = false;
        // --------
        //this.timer = null;        

        this.preAbsTime = 0;
        this.offset = 0;

        // this["Mem"] = {};
        for (var k in this["Mem"])
            delete this["Mem"][k];

        this.timerSave = null;
    };

    ScenarioKlassProto.onDestroy = function () {
        this.Clean();
    };

    ScenarioKlassProto.SetTimescale = function (ts) {
        if (this.timer)
            this.timer.SetTimescale(ts);
    };

    ScenarioKlassProto.Load = function (s, fmt) {
        this.Clean();
        if (s === "")
            return;

        this.cmdTable.Reset();
        this.Append(s, fmt);
    };

    ScenarioKlassProto.Append = function (s, fmt) {
        if (s === "")
            return;

        var arr;
        if (fmt == 0)
            arr = window.rexObjs.CSVToArray(s);
        else {
            arr = JSON.parse(s);
            if (arr[0].length == null)
                arr = [arr];
        }

        this.removeInvalidCommands(arr);
        this.parseCommands(arr);
        this.cmdTable.Append(arr);
    };

    ScenarioKlassProto.Clean = function () {
        this.Stop();

        // reset all extra cmd handler
        for (var handler in this.extraCmdHandlers)
            this.extraCmdHandlers[handler].onReset();

        this.cmdTable.Clean();
    };

    ScenarioKlassProto.removeInvalidCommands = function (queue) {
        var i, cmd, cnt = queue.length;
        var invalidCmdIndexs = [];
        for (i = 0; i < cnt; i++) {
            cmd = queue[i][0];
            if (this.getCmdType(cmd) === null) {
                // invalid command                
                invalidCmdIndexs.push(i);
                if (this.isDebugMode)
                    log("Scenario: line " + i + " = '" + cmd + "' is not a valid command");
            }
        }

        // remove invalid commands
        cnt = invalidCmdIndexs.length;
        if (cnt != 0) {
            invalidCmdIndexs.reverse();
            for (i = 0; i < cnt; i++)
                queue.splice(invalidCmdIndexs[i], 1);
        }
    };

    ScenarioKlassProto.getCmdType = function (cmd, noEval) {
        if (typeof (cmd) === "number")
            return cmd;
        else if (cmd === "")
            return 0;

        // number: delay command
        if (!isNaN(cmd))
            return parseFloat(cmd);

        // other command types
        if (this.extraCmdHandlers.hasOwnProperty(cmd.toLowerCase()))
            return cmd;

        // eval command
        if (!this.isEvalMode || noEval)
            return null;

        try {
            cmd = this.getParam(cmd);
            return this.getCmdType(cmd, true);
        } catch (err) {
            return null;
        }
    };

    ScenarioKlassProto.parseCommands = function (queue) {
        var i, cnt = queue.length,
            cmdPack, cmd;
        for (i = 0; i < cnt; i++) {
            cmdPack = queue[i];
            cmd = this.getCmdType(cmdPack[0]);
            if (isNaN(cmd)) // might be other command
                this.getCmdHandler(cmd).onParsing(i, cmdPack);
        }
    };

    ScenarioKlassProto.Start = function (offset, tag) {
        // increase sn
        this.sn++;
        if (this.sn === 65535)
            this.sn = 0;
        // increase sn        

        this.IsRunning = true;
        this.isPaused = false;
        this.resetAbsTime();
        if (offset != null)
            this.offset = offset;
        if (this.timer == null) {
            this.timer = this.plugin.getTimeline().CreateTimer(onTimeout);
            this.timer.plugin = this;
        } else
            this.timer.Remove(); // stop timer
        this.cmdTable.Reset();
        var index = this.getCmdHandler("tag").tag2index(tag);
        if (index == null) {
            assert2(index, "Scenario: Could not find tag " + tag);
            return;
        }

        if (this.isDebugMode)
            log("Scenario: Start at tag: " + tag + " , index = " + index);
        this.runNextCmd(index);
    };

    ScenarioKlassProto.Stop = function () {
        this.IsRunning = false;
        this.isPaused = false;
        if (this.timer)
            this.timer.Remove();
    };

    ScenarioKlassProto.getCmdHandler = function (cmd_name) {
        return this.extraCmdHandlers[cmd_name];
    };

    ScenarioKlassProto.GetLastTag = function () {
        return this.getCmdHandler("tag").lastTag;
    };

    ScenarioKlassProto.GetPrevTag = function () {
        return this.getCmdHandler("tag").prevTag;
    };
    ScenarioKlassProto.HasTag = function (tag) {
        return this.getCmdHandler("tag").HasTag(tag);
    };

    // internal methods
    ScenarioKlassProto.resetAbsTime = function () {
        this.preAbsTime = 0;
    };

    ScenarioKlassProto.runNextCmd = function (index) {
        var mysn = this.sn;
        var isContinue = true;
        var cmdPack, cmd;
        while (isContinue) {
            cmdPack = this.cmdTable.get(index);
            index = null;
            if ((cmdPack == null) && (this.cmdTable.queue != null)) {
                this.exit();
                return;
            }
            cmd = this.getCmdType(cmdPack[0]);
            if (!isNaN(cmd))
                isContinue = this.onDelayExecutionCmd(cmd, cmdPack);
            else // might be other command
                isContinue = this.getCmdHandler(cmd.toLowerCase()).onExecuting(cmdPack);

            isContinue = isContinue && (mysn === this.sn);
        }
    };
    ScenarioKlassProto.setTableIndex = function (index) {
        this.cmdTable.currentIndex = index - 1;
    };

    ScenarioKlassProto.exit = function () {
        if (this.isDebugMode)
            log("Scenario: Scenario finished");

        this.IsRunning = false;
        var inst = this.plugin;
        inst.runtime.trigger(cr.plugins_.Rex_Scenario.prototype.cnds.OnCompleted, inst);
    };

    ScenarioKlassProto.pause = function () {
        this.isPaused = true;
        var inst = this.plugin;
        inst.runtime.trigger(cr.plugins_.Rex_Scenario.prototype.cnds.OnWaitingStart, inst);
    };
    ScenarioKlassProto.Resume = function (key) {
        if (!this.IsRunning)
            return;
        if (!this.isPaused)
            return;

        var isUnlocked = this.getCmdHandler("wait").IsKeyMatched(key);
        if (!isUnlocked)
            return;
        this.isPaused = false;
        this.resetAbsTime();
        this.runNextCmd();
    };
    ScenarioKlassProto.IsPaused = function (key) {
        var isKeyMatched = this.getCmdHandler("wait").IsKeyMatched(key);
        return this.isPaused && isKeyMatched;
    };

    ScenarioKlassProto.onTagChanged = function () {
        var inst = this.plugin;
        inst.runtime.trigger(cr.plugins_.Rex_Scenario.prototype.cnds.OnTagChanged, inst);
    };
    ScenarioKlassProto.onDelayExecutionCmd = function (delayT_, cmdPack) {
        var deltaT;
        if (this.isAccMode) {
            var nextAbsTime = delayT_ + this.offset;
            deltaT = nextAbsTime - this.preAbsTime;
            this.preAbsTime = nextAbsTime
        } else
            deltaT = delayT_;

        // get function  name and parameters
        var fnName = cmdPack[1];
        var fnParams = [];
        fnParams.length = cmdPack.length - 2;
        // eval parameters
        var param_cnt = fnParams.length,
            i, param;
        for (i = 0; i < param_cnt; i++) {
            param = cmdPack[i + 2];
            if (param != "") {
                param = this.getParam(param);
            }
            fnParams[i] = param;
        }
        if (deltaT == 0) {
            this.executeC2fn(fnName, fnParams);
        } else {
            this.timer._cb_name = fnName;
            this.timer._cb_params = fnParams;
            this.timer.Start(deltaT);
        }
        return (deltaT == 0); // isContinue
    };

    // call c2fn then return value
    var gC2FnParms = [];
    var _thisArg = null;
    ScenarioKlassProto["_call_c2fn"] = function () {
        var c2FnName = arguments[0];
        var i, cnt = arguments.length;
        for (i = 1; i < cnt; i++) {
            gC2FnParms.push(arguments[i]);
        }
        var retValue = _thisArg._executeC2fn(c2FnName, gC2FnParms);
        gC2FnParms.length = 0;

        return retValue;
    };

    // expression:Call in function object	
    var re = new RegExp("\n", "gm");
    ScenarioKlassProto.getParam = function (param) {
        //debugger

        if (this.isMustacheMode)
            param = this.plugin.render(param, this["Mem"]);

        if (this.isEvalMode) {
            param = param.replace(re, "\\n"); // replace "\n" to "\\n"
            var code_string = "function(scenario)\
                {\
                    var MEM = scenario.Mem;\
                    var Call = scenario._call_c2fn;\
                    return " + param + "\
                }";
            _thisArg = this;

            if (this.isDebugMode) {
                var fn = eval("(" + code_string + ")");
                param = fn(this);
            } else // ignore error
            {
                try {
                    var fn = eval("(" + code_string + ")");
                    param = fn(this);
                } catch (e) {
                    param = 0;
                }
            }
        } else {
            if (!(isNaN(param)))
                param = parseFloat(param);
        }
        return param;
    };

    ScenarioKlassProto.executeC2fn = function (name, params) {
        /**BEGIN-PREVIEWONLY**/
        var debuggerInfo = this.debuggerInfo;
        debuggerInfo.length = 0;
        debuggerInfo.push({
            "name": "Function name",
            "value": name
        });
        var i, cnt = params.length;
        for (i = 0; i < cnt; i++)
            debuggerInfo.push({
                "name": "Parameter " + i,
                "value": params[i]
            });
        /**END-PREVIEWONLY**/

        if (this.isDebugMode)
            log("Scenario: " + name + ":" + params.toString());
        this._executeC2fn(name, params);
    };

    ScenarioKlassProto._executeC2fn = function (name, params) {
        var retValue = this.plugin.RunCallback(name, params);
        return retValue;
    };

    // handler of timeout for timers in this plugin, this=timer   
    var onTimeout = function () {
        this.plugin.delayExecuteC2fn(this._cb_name, this._cb_params);
    };

    ScenarioKlassProto.delayExecuteC2fn = function (name, params) {
        this.executeC2fn(name, params);
        this.runNextCmd();
    };

    ScenarioKlassProto.saveToJSON = function () {
        var timerSave = null;
        if (this.timer != null) {
            timerSave = this.timer.saveToJSON();
            timerSave["__cbargs"] = [this.timer._cb_name, this.timer._cb_params]; // compatiable
        }
        return {
            "q": this.cmdTable.saveToJSON(),
            "isrun": this.IsRunning,
            "isp": this.isPaused,
            "tim": timerSave,
            "pa": this.preAbsTime,
            "off": this.offset,
            "mem": this["Mem"],
            "CmdENDIF": this.getCmdHandler("end if").saveToJSON(),
        };
    };
    ScenarioKlassProto.loadFromJSON = function (o) {
        this.cmdTable.loadFromJSON(o["q"]);
        this.IsRunning = o["isrun"];
        this.isPaused = o["isp"];
        this.timerSave = o["tim"];
        this.preAbsTime = o["pa"];
        this.offset = o["off"];
        this["Mem"] = o["mem"];
        if (o["CmdENDIF"])
            this.getCmdHandler("end if").loadFromJSON(o["CmdENDIF"]);
    };
    ScenarioKlassProto.afterLoad = function () {
        if (this.timerSave != null) {
            var timeline = this.plugin.getTimeline();
            this.timer = timeline.LoadTimer(this.timerSave, onTimeout);
            this.timer.plugin = this;
            this.timer._cb_name = this.timerSave["__cbargs"][0];
            this.timer._cb_params = this.timerSave["__cbargs"][1];
            this.timerSave = null;
        }
    };


    // CmdQueueKlass
    var CmdQueueKlass = function (scenario, queue) {
        this.scenario = scenario;
        this.queue = null;
        this.Reset(queue);
    };
    var CmdQueueKlassProto = CmdQueueKlass.prototype;

    CmdQueueKlassProto.Reset = function (queue) {
        this.currentIndex = -1;
        if (queue)
            this.queue = queue;
    };

    CmdQueueKlassProto.Append = function (queue) {
        if (!queue)
            return;

        if (!this.queue)
            this.queue = [];

        var i, cnt = queue.length;
        for (i = 0; i < cnt; i++) {
            this.queue.push(queue[i]);
        }
    };
    CmdQueueKlassProto.Clean = function () {
        this.currentIndex = -1;

        if (this.queue)
            this.queue.length = 0;
    };

    CmdQueueKlassProto.get = function (index) {
        if (index == null)
            index = this.currentIndex + 1;
        var cmd = this.queue[index];
        if (this.scenario.isDebugMode)
            log("Scenario: Get command from index = " + index);

        this.currentIndex = index;
        return cmd;
    };
    CmdQueueKlassProto.saveToJSON = function () {
        return {
            "q": this.queue,
            "i": this.currentIndex,
        };
    };
    CmdQueueKlassProto.loadFromJSON = function (o) {
        this.queue = o["q"];
        this.currentIndex = o["i"];

        if (this.scenario.isDebugMode)
            log("Scenario: Load, start at index = " + this.currentIndex);
    };

    // extra command : WAIT
    var CmdWAITKlass = function (scenario) {
        this.locked = null;
        this.scenario = scenario;
    };
    var CmdWAITKlassProto = CmdWAITKlass.prototype;
    CmdWAITKlassProto.onReset = function () {};
    CmdWAITKlassProto.onParsing = function (index, cmdPack) {};
    CmdWAITKlassProto.onExecuting = function (cmdPack) {
        var locked = cmdPack[1];
        if ((locked != null) && (locked !== ""))
            this.locked = this.scenario.getParam(locked);
        else
            this.locked = "";

        /**BEGIN-PREVIEWONLY**/
        var debuggerInfo = this.scenario.debuggerInfo;
        debuggerInfo.length = 0;
        debuggerInfo.push({
            "name": "WAIT",
            "value": this.locked
        });
        /**END-PREVIEWONLY**/

        if (this.scenario.isDebugMode)
            log("Scenario: WAIT " + this.locked);

        this.scenario.pause();
        return false; // isContinue
    };
    CmdWAITKlassProto.IsKeyMatched = function (key) {
        if (key == null) // null could unlock all
            return true;

        return (key == this.locked)
    };

    // extra command : TIMESTAMP
    var CmdTIMESTAMPKlass = function (scenario) {
        this.scenario = scenario;
    };
    var CmdTIMESTAMPKlassProto = CmdTIMESTAMPKlass.prototype;
    CmdTIMESTAMPKlassProto.onReset = function () {};
    CmdTIMESTAMPKlassProto.onParsing = function (index, cmdPack) {};
    CmdTIMESTAMPKlassProto.onExecuting = function (cmdPack) {
        var mode = cmdPack[1].toLowerCase().substring(0, 4);
        this.scenario.plugin.isAccMode = (mode == "acc");
        return true; // isContinue
    };

    // extra command : EXIT
    var CmdEXITKlass = function (scenario) {
        this.scenario = scenario;
    };
    var CmdEXITKlassProto = CmdEXITKlass.prototype;
    CmdEXITKlassProto.onReset = function () {};
    CmdEXITKlassProto.onParsing = function (index, cmdPack) {};
    CmdEXITKlassProto.onExecuting = function (cmdPack) {
        /**BEGIN-PREVIEWONLY**/
        var debuggerInfo = this.scenario.debuggerInfo;
        debuggerInfo.length = 0;
        debuggerInfo.push({
            "name": "EXIT",
            "value": ""
        });
        /**END-PREVIEWONLY**/

        if (this.scenario.isDebugMode)
            log("Scenario: EXIT");
        this.scenario.exit();
        return false; // isContinue
    };

    // extra command : TAG (alias: LABEL)
    var CmdTAGKlass = function (scenario) {
        this.scenario = scenario;
        this.tag2indexMap = {};
        this.prevTag = "";
        this.lastTag = "";
    };
    var CmdTAGKlassProto = CmdTAGKlass.prototype;
    CmdTAGKlassProto.onReset = function () {
        var t;
        for (t in this.tag2indexMap)
            delete this.tag2indexMap[t];

        this.prevTag = "";
        this.lastTag = "";
    };
    CmdTAGKlassProto.onParsing = function (index, cmdPack) {
        var tag = cmdPack[1];
        this.checkTag(index, tag);
        this.tag2indexMap[tag] = index;
    };
    CmdTAGKlassProto.onExecuting = function (cmdPack) {
        if (this.scenario.isDebugMode)
            log("Scenario: TAG " + cmdPack[1]);

        this.prevTag = this.lastTag;
        this.lastTag = cmdPack[1];
        this.scenario.resetAbsTime();
        this.scenario.onTagChanged();
        return true; // isContinue
    };
    CmdTAGKlassProto.checkTag = function (index, tag) {
        // check if tag had not been repeated 
        var newTag = (this.tag2indexMap[tag] == null);
        assert2(newTag, "Scenario: line " + index + " , Tag " + tag + " was existed.");

        // check if tag was not in if-block
        var CmdENDIF = this.scenario.getCmdHandler("end if");
        var isnot_in_ifblock = !(CmdENDIF.IsNotInIFblock());
        assert2(isnot_in_ifblock, "Scenario: line " + index + " , Tag " + tag + " is in if-block.");
    };
    CmdTAGKlassProto.tag2index = function (tag) {
        var index = this.tag2indexMap[tag];
        if ((tag == "") && (index == null))
            index = 0;
        return index;
    };
    CmdTAGKlassProto.HasTag = function (tag) {
        return (this.tag2indexMap(tag) != null);
    };

    // extra command : GOTO    
    var CmdGOTOKlass = function (scenario) {
        this.scenario = scenario;
    };
    var CmdGOTOKlassProto = CmdGOTOKlass.prototype;
    CmdGOTOKlassProto.onReset = function () {};
    CmdGOTOKlassProto.onParsing = function (index, cmdPack) {};
    CmdGOTOKlassProto.onExecuting = function (cmdPack) {
        if (this.scenario.isDebugMode)
            log("Scenario: GOTO tag " + cmdPack[1]);

        var tag = this.scenario.getParam(cmdPack[1]);
        var index = this.scenario.getCmdHandler("tag").tag2index(tag);
        if (index == null) {
            assert2(index, "Scenario: Could not find tag " + tag);
            return;
        }
        this.scenario.setTableIndex(index);
        this.scenario.resetAbsTime();
        return true; // isContinue
    };

    var INDEX_NEXTIF = 2;
    var INDEX_ENDIF = 3;
    // extra command : IF
    var CmdIFKlass = function (scenario) {
        this.scenario = scenario;
    };
    var CmdIFKlassProto = CmdIFKlass.prototype;
    CmdIFKlassProto.onReset = function () {};
    CmdIFKlassProto.onParsing = function (index, cmdPack) {
        var CmdENDIF = this.scenario.getCmdHandler("end if");
        CmdENDIF.SetIFblockEnable(index);
        CmdENDIF.pushIFCmd(index, cmdPack);
    };
    CmdIFKlassProto.onExecuting = function (cmdPack) {
        if (this.scenario.isDebugMode)
            log("Scenario: IF " + cmdPack[1]);

        var cond = this.scenario.getParam(cmdPack[1]);
        var CmdENDIF = this.scenario.getCmdHandler("end if");
        CmdENDIF.goToEndFlag = cond;
        if (cond) {
            // goto next line
            this.scenario.resetAbsTime();
            return true; // isContinue    
        } else {
            // goto next if line , or end if line
            var index = cmdPack[INDEX_NEXTIF];
            if (index == null)
                index = cmdPack[INDEX_ENDIF];
            assert2(index, "Scenario: Error at IF block, line " + index);
            this.scenario.setTableIndex(index);
            this.scenario.resetAbsTime();
            return true; // isContinue 
        }
    };

    // extra command : ELSE IF
    var CmdELSEIFKlass = function (scenario) {
        this.scenario = scenario;
    };
    var CmdELSEIFKlassProto = CmdELSEIFKlass.prototype;
    CmdELSEIFKlassProto.onReset = function () {};
    CmdELSEIFKlassProto.onParsing = function (index, cmdPack) {
        var CmdENDIF = this.scenario.getCmdHandler("end if");
        CmdENDIF.pushIFCmd(index, cmdPack);
    };
    CmdELSEIFKlassProto.onExecuting = function (cmdPack) {
        if (this.scenario.isDebugMode)
            log("Scenario: ELSE IF " + cmdPack[1]);

        // go to end
        var goToEndFlag = this.scenario.getCmdHandler("end if").goToEndFlag;
        if (goToEndFlag) {
            var index = cmdPack[INDEX_ENDIF];
            assert2(index, "Scenario: Error at IF block, line " + index);
            this.scenario.setTableIndex(index);
            this.scenario.resetAbsTime();
            return true; // isContinue 
        }

        // test condition
        var cond = this.scenario.getParam(cmdPack[1]);
        var CmdENDIF = this.scenario.getCmdHandler("end if");
        CmdENDIF.goToEndFlag = cond;
        if (cond) {
            // goto next line
            this.scenario.resetAbsTime();
            return true; // isContinue    
        } else {
            // goto next if line , or end if line
            var index = cmdPack[INDEX_NEXTIF];
            if (index == null)
                index = cmdPack[INDEX_ENDIF];
            assert2(index, "Scenario: Error at IF block, line " + index);
            this.scenario.setTableIndex(index);
            this.scenario.resetAbsTime();
            return true; // isContinue 
        }
    };

    // extra command : ELSE
    var CmdELSEKlass = function (scenario) {
        this.scenario = scenario;
    };
    var CmdELSEKlassProto = CmdELSEKlass.prototype;
    CmdELSEKlassProto.onReset = function () {};
    CmdELSEKlassProto.onParsing = function (index, cmdPack) {
        var CmdENDIF = this.scenario.getCmdHandler("end if");
        CmdENDIF.pushIFCmd(index, cmdPack);
    };
    CmdELSEKlassProto.onExecuting = function (cmdPack) {
        if (this.scenario.isDebugMode)
            log("Scenario: ELSE");

        // go to end
        var goToEndFlag = this.scenario.getCmdHandler("end if").goToEndFlag;
        if (goToEndFlag) {
            var index = cmdPack[INDEX_ENDIF];
            assert2(index, "Scenario: Error at IF block, line " + index);
            this.scenario.setTableIndex(index);
            this.scenario.resetAbsTime();
            return true; // isContinue 
        }

        // goto next line
        this.scenario.resetAbsTime();
        return true; // isContinue  
    };

    // extra command : ENDIF
    var CmdENDIFKlass = function (scenario) {
        this.scenario = scenario;
        // onParsing
        this.penddingEnable = false;
        this.penddingCmds = [];
        // onExecuting
        this.goToEndFlag = false;
    };
    var CmdENDIFKlassProto = CmdENDIFKlass.prototype;
    CmdENDIFKlassProto.onReset = function () {
        this.penddingCmds.length = 0;
        this.goToEndFlag = false;
    };
    CmdENDIFKlassProto.onParsing = function (index, cmdPack) {
        assert2(this.penddingEnable, "Scenario: Error at IF block, line " + index);
        var i, cnt = this.penddingCmds.length;
        for (i = 0; i < cnt; i++) {
            this.penddingCmds[i][INDEX_ENDIF] = index;
        }
        this.penddingCmds.length = 0;
        this.penddingEnable = false;
    };
    CmdENDIFKlassProto.onExecuting = function (cmdPack) {
        if (this.scenario.isDebugMode)
            log("Scenario: END IF ");

        this.goToEndFlag = false;
        // goto next line
        this.scenario.resetAbsTime();
        return true; // isContinue        
    };
    CmdENDIFKlassProto.SetIFblockEnable = function (index) {
        assert2(!this.penddingEnable, "Scenario: Error at IF block, line " + index);
        this.penddingEnable = true;
    };
    CmdENDIFKlassProto.IsNotInIFblock = function () {
        return this.penddingEnable;
    };
    CmdENDIFKlassProto.pushIFCmd = function (index, cmdPack) {
        assert2(this.penddingEnable, "Scenario: Error at IF block, line " + index);
        cmdPack.length = 4; // [if , cond, next_if_line, end_if_line]
        cmdPack[INDEX_NEXTIF] = null;
        cmdPack[INDEX_ENDIF] = null;
        if (this.penddingCmds.length >= 1) {
            // assign index of next if line
            var pre_cmd_pack = this.penddingCmds[this.penddingCmds.length - 1];
            pre_cmd_pack[INDEX_NEXTIF] = index;
        }
        this.penddingCmds.push(cmdPack);
    };
    CmdENDIFKlassProto.saveToJSON = function () {
        return {
            "gef": this.goToEndFlag
        };
    };
    CmdENDIFKlassProto.loadFromJSON = function (o) {
        this.goToEndFlag = o["gef"];
    };

    // template
    //var CmdHandlerKlass = function(scenario) {};
    //var CmdHandlerKlassProto = CmdHandlerKlass.prototype;    
    //CmdHandlerKlassProto.onReset = function() {};
    //CmdHandlerKlassProto.onParsing = function(index, cmdPack) {};
    //CmdHandlerKlassProto.onExecuting = function(cmdPack) {};

    window.rexObjs.ScenarioKlass = ScenarioKlass

}());