(function () {
    if (!window.rexObjs)
        window.rexObjs = {};

    if (window.rexObjs.zigzag)
        return;
    else
        window.rexObjs.zigzag = {};


    // command queue    
    window.rexObjs.zigzag.CmdQueue = function (repeatCount) {
        this.Init(repeatCount);
    };
    var CmdQueueProto = window.rexObjs.zigzag.CmdQueue.prototype;

    CmdQueueProto.Init = function (repeatCount) {
        this.CleanAll();
        this.repeatCount = repeatCount;
        this.repeatCountSave = repeatCount;
    };

    CmdQueueProto.CleanAll = function () {
        this.queueIndex = 0;
        this.currentCmdQueueIndex = -1;
        this.queue = [];
    };

    CmdQueueProto.Reset = function () {
        this.repeatCount = this.repeatCountSave;
        this.queueIndex = 0;
        this.currentCmdQueueIndex = -1;
    };

    CmdQueueProto.Push = function (item) {
        this.queue.push(item);
    };

    CmdQueueProto.PushList = function (items) {
        this.queue.push.apply(this.queue, items);
    };

    CmdQueueProto.GetCmd = function () {
        var cmd;
        cmd = this.queue[this.queueIndex];
        this.currentCmdQueueIndex = this.queueIndex;
        var index = this.queueIndex + 1;
        if (index >= this.queue.length) {
            if (this.repeatCount != 1) // repeat
            {
                this.queueIndex = 0;
                this.repeatCount -= 1;
            } else {
                this.queueIndex = (-1); // finish
            }
        } else
            this.queueIndex = index;
        return cmd;
    };

    CmdQueueProto.saveToJSON = function () {
        return {
            "i": this.queueIndex,
            "cci": this.currentCmdQueueIndex,
            "q": this.queue,
            "rptsv": this.repeatCountSave,
            "rpt": this.repeatCount
        };
    };

    CmdQueueProto.loadFromJSON = function (o) {
        this.queueIndex = o["i"];
        this.currentCmdQueueIndex = o["cci"];
        this.queue = o["q"];
        this.repeatCountSave = o["rptsv"];
        this.repeatCount = o["rpt"];
    };

    // move
    window.rexObjs.zigzag.CmdMoveKlass = function (inst,
        maxSpeed, acc, dec,
        preciseMode, continuedMode) {
        this.Init(inst,
            maxSpeed, acc, dec,
            preciseMode, continuedMode);
    };
    var CmdMoveKlassProto = window.rexObjs.zigzag.CmdMoveKlass.prototype;

    CmdMoveKlassProto.Init = function (inst,
        maxSpeed, acc, dec,
        preciseMode, continuedMode) {
        this.inst = inst;
        this.move = {
            "max": maxSpeed,
            "acc": acc,
            "dec": dec
        };
        this.isDone = true;
        this.preciseMode = preciseMode;
        this.continuedMode = continuedMode;
        this.currentSpeed = 0;
    };

    CmdMoveKlassProto.CmdInit = function (positionData, distance,
        newSpeedValue) {
        this.target = positionData;
        this.dir = (distance >= 0);
        this.remainDistance = Math.abs(distance);
        this.isDone = false;
        var angle = positionData["a"];
        positionData["x"] += (distance * Math.cos(angle));
        positionData["y"] += (distance * Math.sin(angle));

        if (newSpeedValue)
            speedReset.apply(this, newSpeedValue);
        setCurrentSpeed.call(this, null);
    };

    CmdMoveKlassProto.Tick = function (dt) {
        var remainDt;
        var distance = getMoveDistance.call(this, dt);
        this.remainDistance -= distance;

        // is hit to target at next tick?
        if ((this.remainDistance <= 0) || (this.currentSpeed <= 0)) {
            this.isDone = true;
            if (this.preciseMode) // precise mode
            {
                this.inst.x = this.target["x"];
                this.inst.y = this.target["y"];
            } else // non-precise mode
            {
                var angle = this.target["a"];
                distance += this.remainDistance;
                if (!this.dir) {
                    distance = -distance;
                }
                this.inst.x += (distance * Math.cos(angle));
                this.inst.y += (distance * Math.sin(angle));
                this.target["x"] = this.inst.x;
                this.target["y"] = this.inst.y;
            }
            remainDt = (this.continuedMode) ? getRemaindDt.call(this) : 0;
        } else {
            var angle = this.target["a"];
            if (!this.dir) {
                distance = -distance;
            }
            this.inst.x += (distance * Math.cos(angle));
            this.inst.y += (distance * Math.sin(angle));
            remainDt = 0;
        }

        this.inst.set_bbox_changed();
        return remainDt;
    };

    CmdMoveKlassProto.saveToJSON = function () {
        return {
            "v": this.move,
            "id": this.isDone,
            "pm": this.preciseMode,
            "cspd": this.currentSpeed,
            //"t": this.target,
            "dir": this.dir,
            "rd": this.remainDistance,
        };
    };

    CmdMoveKlassProto.loadFromJSON = function (o) {
        this.move = o["v"];
        this.isDone = o["id"];
        this.preciseMode = o["pm"];
        this.currentSpeed = o["cspd"];
        //this.target = o["t"];
        this.dir = o["dir"];
        this.remainDistance = o["rd"];
    };

    // rotate
    window.rexObjs.zigzag.CmdRotateKlass = function (inst,
        rotatable,
        maxSpeed, acc, dec,
        preciseMode, continuedMode) {
        this.Init(inst,
            rotatable,
            maxSpeed, acc, dec,
            preciseMode, continuedMode);
    };
    var CmdRotateKlassProto = window.rexObjs.zigzag.CmdRotateKlass.prototype;

    CmdRotateKlassProto.Init = function (inst,
        rotatable,
        maxSpeed, acc, dec,
        preciseMode, continuedMode) {
        this.inst = inst;
        this.rotatable = rotatable;
        this.move = {
            "max": maxSpeed,
            "acc": acc,
            "dec": dec
        };
        this.isDone = true;
        this.isZeroDtMode = ((maxSpeed >= 36000) && (acc == 0) && (dec == 0));
        this.preciseMode = preciseMode;
        this.continuedMode = continuedMode;
        this.currentAngleDeg = (rotatable) ? cr.to_clamped_degrees(inst.angle) : 0;
        this.currentSpeed = 0;
    };

    CmdRotateKlassProto.CmdInit = function (positionData, distance,
        newSpeedValue) {
        this.target = positionData;
        this.currentAngleDeg = cr.to_clamped_degrees(positionData["a"]);
        this.targetAngleDeg = this.currentAngleDeg + distance;
        this.dir = (distance >= 0);
        var angle = cr.to_clamped_radians(this.targetAngleDeg);
        this.remainDistance = Math.abs(distance);
        this.isDone = false;
        positionData["a"] = angle;

        if (newSpeedValue)
            speedReset.apply(this, newSpeedValue);
        setCurrentSpeed.call(this, null);
    };

    CmdRotateKlassProto.Tick = function (dt) {
        var remainDt;
        var targetAngleRad;
        if (this.isZeroDtMode) {
            remainDt = dt;
            this.isDone = true;
            targetAngleRad = this.target["a"];
            this.currentAngleDeg = this.targetAngleDeg;
        } else {
            var distance = getMoveDistance.call(this, dt);
            this.remainDistance -= distance;

            // is hit to target at next tick?
            if ((this.remainDistance <= 0) || (this.currentSpeed <= 0)) {
                this.isDone = true;
                if (this.preciseMode) // precise mode
                {
                    targetAngleRad = this.target["a"];
                    this.currentAngleDeg = this.targetAngleDeg;
                } else // non-precise mode
                {
                    distance += this.remainDistance;
                    this.currentAngleDeg += ((this.dir) ? distance : (-distance));
                    targetAngleRad = cr.to_clamped_radians(this.currentAngleDeg);
                    this.target["a"] = targetAngleRad;
                }
                remainDt = (this.continuedMode == 1) ? getRemaindDt.call(this) : 0;
            } else {
                this.currentAngleDeg += ((this.dir) ? distance : (-distance));
                targetAngleRad = cr.to_clamped_radians(this.currentAngleDeg);
                remainDt = 0;
            }
        }

        if (this.rotatable) {
            this.inst.angle = targetAngleRad;
            this.inst.set_bbox_changed();
        }
        return remainDt;
    };

    CmdRotateKlassProto.saveToJSON = function () {
        return {
            "ra": this.rotatable,
            "v": this.move,
            "id": this.isDone,
            "izm": this.isZeroDtMode,
            "pm": this.preciseMode,
            "cad": this.currentAngleDeg,
            "cspd": this.currentSpeed,
            //"t": this.target,
            "tad": this.targetAngleDeg,
            "dir": this.dir,
            "rd": this.remainDistance,
        };
    };

    CmdRotateKlassProto.loadFromJSON = function (o) {
        this.rotatable = o["ra"];
        this.move = o["v"];
        this.isDone = o["id"];
        this.isZeroDtMode = o["izm"];
        this.preciseMode = o["pm"];
        this.currentAngleDeg = o["cad"];
        this.currentSpeed = o["cspd"];
        //this.target = o["t"];
        this.targetAngleDeg = o["tad"];
        this.dir = o["dir"];
        this.remainDistance = o["rd"];
    };

    var setCurrentSpeed = function (speed) {
        var move = this.move;
        if (speed != null) {
            this.currentSpeed = (speed > move["max"]) ?
                move["max"] : speed;
        } else if (move["acc"] > 0) {
            this.currentSpeed = 0;
        } else {
            this.currentSpeed = move["max"];
        }
    };

    var getMoveDistance = function (dt) {
        var move = this.move;
        // assign speed
        var isSlowDown = false;
        if (move["dec"] != 0) {
            // is time to deceleration?
            var _distance = (this.currentSpeed * this.currentSpeed) / (2 * move["dec"]); // (v*v)/(2*a)
            isSlowDown = (_distance >= this.remainDistance);
        }
        var acc = (isSlowDown) ? (-move["dec"]) : move["acc"];
        if (acc != 0) {
            setCurrentSpeed.call(this, this.currentSpeed + (acc * dt));
        }

        // Apply movement to the object     
        var distance = this.currentSpeed * dt;
        return distance;
    };

    var getRemaindDt = function () {
        var remainDt;
        if ((this.move["acc"] > 0) || (this.move["dec"] > 0)) {
            setCurrentSpeed.call(this, 0); // stop in point
            remainDt = 0;
        } else {
            remainDt = (-this.remainDistance) / this.currentSpeed;
        }
        return remainDt;
    };


    var speedReset = function (max, acc, dec) {
        if (max != null)
            this.move["max"] = max;
        if (acc != null)
            this.move["acc"] = acc;
        if (dec != null)
            this.move["dec"] = dec;
    };

    // wait
    window.rexObjs.zigzag.CmdWaitKlass = function (continuedMode) {
        this.Init(continuedMode);
    };
    var CmdWaitKlassProto = window.rexObjs.zigzag.CmdWaitKlass.prototype;

    CmdWaitKlassProto.Init = function (continuedMode) {
        this.isDone = true;
        this.continuedMode = continuedMode;
    };

    CmdWaitKlassProto.CmdInit = function (positionData, distance) {
        this.remainDistance = distance;
        this.isDone = false;
        this.target = positionData;
    };

    CmdWaitKlassProto.Tick = function (dt) {
        this.remainDistance -= dt;
        var remainDt;
        if (this.remainDistance <= 0) {
            remainDt = (this.continuedMode) ? (-this.remainDistance) : 0;
            this.isDone = true;
        } else {
            remainDt = 0;
        }
        return remainDt;
    };

    CmdWaitKlassProto.saveToJSON = function () {
        return {
            "id": this.isDone,
            "rd": this.remainDistance,
        };
    };

    CmdWaitKlassProto.loadFromJSON = function (o) {
        this.isDone = o["id"];
        this.remainDistance = o["rd"];
    };

}());