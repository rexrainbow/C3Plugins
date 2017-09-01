// ECMAScript 5 strict mode
"use strict";

assert2(cr, "cr namespace not created");
assert2(cr.behaviors, "cr.behaviors not created");

/////////////////////////////////////
// Behavior class
cr.behaviors.Rex_Zigzag = function (runtime) {
    this.runtime = runtime;
};

(function () {
    var behaviorProto = cr.behaviors.Rex_Zigzag.prototype;

    /////////////////////////////////////
    // Behavior type class
    behaviorProto.Type = function (behavior, objtype) {
        this.behavior = behavior;
        this.objtype = objtype;
        this.runtime = behavior.runtime;
    };

    var behtypeProto = behaviorProto.Type.prototype;

    behtypeProto.onCreate = function () {

    };

    /////////////////////////////////////
    // Behavior instance class
    behaviorProto.Instance = function (type, inst) {
        this.type = type;
        this.behavior = type.behavior;
        this.inst = inst;				// associated object instance to modify
        this.runtime = type.runtime;
    };

    var behinstProto = behaviorProto.Instance.prototype;

    var transferCmd = function (name, param) {
        switch (name) {
            case "F":
                name = "M";  // move
                break;
            case "B":
                name = "M";  // move
                param = -param;
                break;
            case "R":
                name = "R";  // rotate
                break;
            case "L":
                name = "R";  // rotate
                param = -param;
                break;
            case "W":
                break;
            default:
                return null;  // no matched command
                break;
        }
        return ({ "cmd": name, "param": param });
    };

    var parseSpeed = function (speedString) {
        var newSpeedValue = (speedString != "") ?
            eval("(" + speedString + ")") : null;
        return newSpeedValue;
    };

    var parsingRresult = [null, null];
    var parseCmd1 = function (cmd)      // split cmd string and speed setting
    {
        var startIndex = cmd.indexOf("[");
        var retCmd;
        var speedString;
        if (startIndex != (-1)) {
            speedString = cmd.slice(startIndex);
            retCmd = cmd.slice(0, startIndex);
        }
        else {
            speedString = "";
            retCmd = cmd;
        }

        parsingRresult[0] = retCmd;
        parsingRresult[1] = speedString;
        return parsingRresult;
    };

    var parseCmdString = function (cmdString) {
        var ret_cmds = [];
        var cmds = cmdString.split(";");
        var i;
        var cmd_length = cmds.length;
        var cmd, cmd_slices, cmd_name, cmd_param, cmd_parsed;
        var tmp;
        for (i = 0; i < cmd_length; i++) {
            tmp = parseCmd1(cmds[i]);
            cmd = tmp[0];
            cmd = cmd.replace(/(^\s*)|(\s*$)/g, "");
            cmd = cmd.replace(/(\s+)/g, " ");
            cmd_slices = cmd.split(" ");
            if (cmd_slices.length == 2) {
                cmd_name = cmd_slices[0].toUpperCase();
                cmd_param = parseFloat(cmd_slices[1]);
                cmd_parsed = transferCmd(cmd_name, cmd_param);
                if (cmd_parsed) {
                    cmd_parsed["speed"] = parseSpeed(tmp[1]);
                    ret_cmds.push(cmd_parsed);
                }
                else {
                    log("Zigzag : Can not parse command " + i + ": '" + cmd + "'");
                    continue;
                }
            }
            else {
                log("Zigzag : Can not parse command " + i + ": '" + cmd + "'");
                continue;
            }
        }
        return ret_cmds;
    };

    behinstProto.onCreate = function () {
        this.activated = this.properties[0];
        this.isRun = (this.properties[1] == 1);
        var isRotatable = (this.properties[2] == 1);
        var preciseMode = (this.properties[12] == 1);
        var continuedMode = (this.properties[13] == 1);
        this.currentCmd = null;
        this.isMyCall = false;

        var initAngle = (isRotatable) ?
            this.inst.angle :
            cr.to_clamped_radians(this.properties[11]);

        if (!this.recycled) {
            this.positionData = { "x": 0, "y": 0, "a": 0 };
        }
        this.positionData["x"] = this.inst.x;
        this.positionData["y"] = this.inst.y,
            this.positionData["a"] = initAngle;

        if (!this.recycled) {
            var CmdQueue = window.rexObjs.zigzag.CmdQueue;
            this.CmdQueue = new CmdQueue(this.properties[3]);
        }
        else {
            this.CmdQueue.Init(this.properties[3]);
        }

        if (!this.recycled) {
            var CmdMoveKlass = window.rexObjs.zigzag.CmdMoveKlass;
            this.CmdMove = new CmdMoveKlass(this.inst,
                this.properties[5],
                this.properties[6],
                this.properties[7],
                preciseMode,
                continuedMode);
        }
        else {
            this.CmdMove.Init(this.inst,
                this.properties[5],
                this.properties[6],
                this.properties[7],
                preciseMode,
                continuedMode);
        }

        if (!this.recycled) {
            var CmdRotateKlass = window.rexObjs.zigzag.CmdRotateKlass;
            this.CmdRotate = new CmdRotateKlass(this.inst,
                isRotatable,
                this.properties[8],
                this.properties[9],
                this.properties[10],
                preciseMode,
                continuedMode);
        }
        else {
            this.CmdRotate.Init(this.inst,
                isRotatable,
                this.properties[8],
                this.properties[9],
                this.properties[10],
                preciseMode,
                continuedMode);
        }

        if (!this.recycled) {
            var CmdWaitKlass = window.rexObjs.zigzag.CmdWaitKlass;
            this.CmdWait = new CmdWaitKlass(continuedMode);
        }
        else {
            this.CmdWait.Init(continuedMode);
        }

        if (!this.recycled) {
            this.cmdMap = {
                "M": this.CmdMove,
                "R": this.CmdRotate,
                "W": this.CmdWait
            };
        }

        this.AddCommandString(this.properties[4]);
    };

    behinstProto.tick = function () {
        if ((this.activated == 0) || (!this.isRun))
            return;

        var dt = this.runtime.getDt(this.inst);
        var cmd;
        while (dt) {
            if (this.currentCmd == null) // try to get new cmd
            {
                this.currentCmd = this.CmdQueue.GetCmd();
                if (this.currentCmd != null) {
                    // new command start
                    cmd = this.cmdMap[this.currentCmd["cmd"]];
                    cmd.CmdInit(this.positionData, this.currentCmd["param"], this.currentCmd["speed"]);
                    this.isMyCall = true;
                    this.runtime.trigger(cr.behaviors.Rex_Zigzag.prototype.cnds.OnCmdStart, this.inst);
                    this.isMyCall = false;
                }
                else {
                    // command queue finish
                    this.isRun = false;
                    this.isMyCall = true;
                    this.runtime.trigger(cr.behaviors.Rex_Zigzag.prototype.cnds.OnCmdQueueFinish, this.inst);
                    this.isMyCall = false;
                    break;
                }
            }
            else {
                cmd = this.cmdMap[this.currentCmd["cmd"]];
            }

            dt = cmd.Tick(dt);
            if (cmd.isDone) {
                // command finish
                this.isMyCall = true;
                this.runtime.trigger(cr.behaviors.Rex_Zigzag.prototype.cnds.OnCmdFinish, this.inst);
                this.isMyCall = false;
                this.currentCmd = null;
            }
        }
    };

    behinstProto.AddCommand = function (cmd, param) {
        this.CmdQueue.Push(transferCmd(cmd, param));
    };

    behinstProto.AddCommandString = function (cmdString) {
        if (cmdString != "")
            this.CmdQueue.PushList(parseCmdString(cmdString));
    };

    behinstProto.saveToJSON = function () {
        return {
            "en": this.activated,
            "ir": this.isRun,
            "ps": this.positionData,
            "cq": this.CmdQueue.saveToJSON(),
            "cc": this.currentCmd,
            "cm": this.CmdMove.saveToJSON(),
            "cr": this.CmdRotate.saveToJSON(),
            "cw": this.CmdWait.saveToJSON(),
        };
    };

    behinstProto.loadFromJSON = function (o) {
        this.activated = o["en"];
        this.isRun = o["ir"];
        this.positionData = o["ps"];
        this.CmdQueue.loadFromJSON(o["cq"]);
        this.currentCmd = o["cc"];
        this.CmdMove.loadFromJSON(o["cm"]);
        this.CmdRotate.loadFromJSON(o["cr"]);
        this.CmdWait.loadFromJSON(o["cw"]);

        if (this.currentCmd != null)  // link to cmd object
        {
            var cmd = this.cmdMap[this.currentCmd["cmd"]];
            cmd.target = this.positionData;
        }
    };
    //////////////////////////////////////
    // Conditions
    function Cnds() { };
    behaviorProto.cnds = new Cnds();

    Cnds.prototype.CompareMovSpeed = function (cmp, s) {
        return cr.do_cmp(this.CmdMove.currentSpeed, cmp, s);
    };

    Cnds.prototype.CompareRotSpeed = function (cmp, s) {
        return cr.do_cmp(this.CmdRotate.currentSpeed, cmp, s);
    };

    var isValidCmd = function (currentCmd, _cmd) {
        if (currentCmd == null)
            return false;

        var ret;
        switch (_cmd) {
            case 0: //"F"
                ret = ((currentCmd["cmd"] == "M") && (currentCmd["param"] >= 0));
                break;
            case 1: //"B"
                ret = ((currentCmd["cmd"] == "M") && (currentCmd["param"] < 0));
                break;
            case 2: //"R"
                ret = ((currentCmd["cmd"] == "R") && (currentCmd["param"] >= 0));
                break;
            case 3: //"L"
                ret = ((currentCmd["cmd"] == "R") && (currentCmd["param"] < 0));
                break;
            case 4: //"W"
                ret = (currentCmd["cmd"] == "W");
                break;
            default:  // any
                ret = true;
        }
        return ret;
    }

    Cnds.prototype.IsCmd = function (_cmd) {
        return isValidCmd(this.currentCmd, _cmd);
    };

    Cnds.prototype.OnCmdQueueFinish = function () {
        return (this.isMyCall);
    };

    Cnds.prototype.OnCmdStart = function (_cmd) {
        return (isValidCmd(this.currentCmd, _cmd) && this.isMyCall);
    };

    Cnds.prototype.OnCmdFinish = function (_cmd) {
        return (isValidCmd(this.currentCmd, _cmd) && this.isMyCall);
    };

    //////////////////////////////////////
    // Actions
    function Acts() { };
    behaviorProto.acts = new Acts();

    Acts.prototype.SetActivated = function (s) {
        this.activated = s;
    };

    Acts.prototype.Start = function () {
        this.currentCmd = null;
        this.isRun = true;
        this.CmdQueue.Reset();
        // update positionData
        this.positionData["x"] = this.inst.x;
        this.positionData["y"] = this.inst.y;
        if (this.CmdRotate.rotatable)
            this.positionData["a"] = this.inst.angle;
    };

    Acts.prototype.Stop = function () {
        this.currentCmd = null;
        this.isRun = false;
    };

    Acts.prototype.SetMaxMovSpeed = function (s) {
        this.CmdMove.move["max"] = s;
    };

    Acts.prototype.SetMovAcceleration = function (s) {
        this.CmdMove.move["acc"] = s;
    };

    Acts.prototype.SetMovDeceleration = function (s) {
        this.CmdMove.move["dec"] = s;
    };

    Acts.prototype.SetMaxRotSpeed = function (s) {
        this.CmdRotate.move["max"] = s;
    };

    Acts.prototype.SetRotAcceleration = function (s) {
        this.CmdRotate.move["acc"] = s;
    };

    Acts.prototype.SetRotDeceleration = function (s) {
        this.CmdRotate.move["dec"] = s;
    };

    Acts.prototype.SetRepeatCount = function (s) {
        this.CmdQueue.repeatCount = s;
        this.CmdQueue.repeatCountSave = s;
    };

    Acts.prototype.CleanCmdQueue = function () {
        this.CmdQueue.CleanAll();
    };

    var index2NameMap = ["F", "B", "R", "L", "W"];
    Acts.prototype.AddCmd = function (_cmd, param) {
        this.AddCommand(index2NameMap[_cmd], param);
    };

    Acts.prototype.AddCmdString = function (cmdString) {
        this.AddCommandString(cmdString);
    };

    Acts.prototype.SetRotatable = function (s) {
        this.CmdRotate.rotatable = (s == 1);
    };

    Acts.prototype.SetMovingAngle = function (s) {
        var _angle = cr.to_clamped_radians(s);
        this.positionData["a"] = _angle;
        if (this.CmdRotate.rotatable) {
            this.inst.angle = _angle;
            this.inst.set_bbox_changed();
        }
    };

    Acts.prototype.SetPrecise = function (s) {
        var preciseMode = (s == 1);
        this.CmdMove.preciseMode = preciseMode;
        this.CmdRotate.preciseMode = preciseMode;
    };

    //////////////////////////////////////
    // Expressions
    function Exps() { };
    behaviorProto.exps = new Exps();

    Exps.prototype.Activated = function (ret) {
        ret.set_int(this.activated);
    };

    Exps.prototype.MovSpeed = function (ret) {
        ret.set_float(this.CmdMove.currentSpeed);
    };

    Exps.prototype.MaxMovSpeed = function (ret) {
        ret.set_float(this.CmdMove.move["max"]);
    };

    Exps.prototype.MovAcc = function (ret) {
        ret.set_float(this.CmdMove.move["acc"]);
    };

    Exps.prototype.MovDec = function (ret) {
        ret.set_float(this.CmdMove.move["dec"]);
    };

    Exps.prototype.RotSpeed = function (ret) {
        ret.set_float(this.CmdRotate.currentSpeed);
    };

    Exps.prototype.MaxRotSpeed = function (ret) {
        ret.set_float(this.CmdRotate.move["max"]);
    };

    Exps.prototype.RotAcc = function (ret) {
        ret.set_float(this.CmdRotate.move["acc"]);
    };

    Exps.prototype.RotDec = function (ret) {
        ret.set_float(this.CmdRotate.move["dec"]);
    };

    Exps.prototype.Rotatable = function (ret) {
        ret.set_int(this.CmdRotate.rotatable);
    };

    Exps.prototype.RepCnt = function (ret) {
        ret.set_int(this.CmdQueue.repeatCountSave);
    };

    Exps.prototype.CmdIndex = function (ret) {
        ret.set_int(this.CmdQueue.currentCmdQueueIndex);
    };

    Exps.prototype.MovAngle = function (ret) {
        var angle;
        if (isValidCmd(this.currentCmd, 2) || isValidCmd(this.currentCmd, 3)) {
            angle = this.CmdRotate.currentAngleDeg;
            if (angle < 0)
                angle = 360 + angle;
        }
        else
            angle = cr.to_clamped_degrees(this.positionData["a"]);
        ret.set_float(angle);
    };

}());