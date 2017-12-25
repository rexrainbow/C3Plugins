(function () {
    if (!window.rexObjs)
        window.rexObjs = {};
    
    if (!window.rexObjs.GridMove)
        window.rexObjs.GridMove = {};

    // MoveSegmentKlass
    var MoveSegment = function (x0, y0, x1, y1) {
        if (arguments.length > 0)
            this.Reset(x0, y0, x1, y1);
        else
            this.Reset(0, 0, 0, 0);
    }
    var MoveSegmentProto = MoveSegment.prototype;

    MoveSegmentProto.Reset = function (x0, y0, x1, y1) {
        this.x0 = x0;
        this.y0 = y0;
        this.x1 = x1;
        this.y1 = y1;
        this.angle = cr.angleTo(x0, y0, x1, y1);
        this.remainDistance = cr.distanceTo(this.x0, this.y0, this.x1, this.y1);
    };

    MoveSegmentProto.GetRemainDistance = function (d) {
        this.remainDistance -= d;
        return this.remainDistance;
    };
    MoveSegmentProto.saveToJSON = function () {
        return {
            "x0": this.x0,
            "y0": this.y0,
            "x1": this.x1,
            "y1": this.y1,
            "a": this.angle,
            "rd": this.remainDistance
        };
    };

    MoveSegmentProto.loadFromJSON = function (o) {
        this.x0 = o["x0"];
        this.y0 = o["y0"];
        this.x1 = o["x1"];
        this.y1 = o["y1"];
        this.angle = o["a"];
        this.remainDistance = o["rd"];
    };

    window.rexObjs.GridMove.MoveSegment = MoveSegment;

    // CmdMoveToKlass
    var CmdMoveTo = function (plugin) {
        this.moveParams = {
            "max": 0,
            "acc": 0,
            "dec": 0
        };
        this.segments = [];
    };
    var CmdMoveToProto = CmdMoveTo.prototype;

    CmdMoveToProto.Reset = function (plugin) {
        this.activated = plugin.properties[0];
        this.moveParams["max"] = plugin.properties[1];
        this.moveParams["acc"] = plugin.properties[2];
        this.moveParams["dec"] = plugin.properties[3];
        this.is_continue_mode = (plugin.properties[8] == 1);
        this.segments.length = 0;
        this.isMoving = false;
        this.currentSpeed = 0;
        this.remainDistance = 0;  // used to control the moving speed
        this.remainDt = 0;
        this.isMyCall = false;

        this.inst = plugin.inst;
        this.runtime = plugin.runtime;
    };

    CmdMoveToProto.tick = function () {
        this.remainDt = 0;
        if ((!this.activated) || (!this.isMoving))
            return;

        var dt = this.runtime.getDt(this.inst);
        this.move(dt);
    };

    CmdMoveToProto.move = function (dt) {
        if (dt == 0)    // can not move if dt == 0
            return;

        // assign speed
        var isSlowDown = false;
        if (this.moveParams["dec"] != 0) {
            // is time to deceleration?                
            var _speed = this.currentSpeed;
            var d = (_speed * _speed) / (2 * this.moveParams["dec"]); // (v*v)/(2*a)
            isSlowDown = (d >= this.remainDistance);
        }
        var acc = (isSlowDown) ? (-this.moveParams["dec"]) : this.moveParams["acc"];
        if (acc != 0) {
            this.setcurrentSpeed(this.currentSpeed + (acc * dt));
        }

        // Apply movement to the object     
        var distance = this.currentSpeed * dt;
        this.remainDistance -= distance;
        var curSeg = this.segments[0];
        var segRemainDistance = curSeg.GetRemainDistance(distance);

        var isHitTarget = false;
        // is hit to target of current segment?
        if ((segRemainDistance <= 0) || (this.currentSpeed <= 0)) {
            if (this.segments.length == 1) {
                isHitTarget = true;        // trigger on hit target
                this.inst.x = curSeg.x1;
                this.inst.y = curSeg.y1;
                this.segments.length = 0;

                // remain dt
                if (this.currentSpeed > 0)  // not stop
                    this.remainDt = (-segRemainDistance) / this.currentSpeed;

                this.setcurrentSpeed(0);
            }
            else {
                this.segments.shift();
                this.setStarPosition(segRemainDistance);
            }
        }
        else {
            var angle = curSeg.angle;
            this.inst.x += (distance * Math.cos(angle));
            this.inst.y += (distance * Math.sin(angle));
        }
        this.inst.set_bbox_changed();

        if (isHitTarget) {
            this.isMoving = false;
            this.isMyCall = true;
            this.runtime.trigger(cr.behaviors.Rex_GridMove.prototype.cnds.OnHitTarget, this.inst);
            this.isMyCall = false;
        }
    };

    CmdMoveToProto.setcurrentSpeed = function (speed) {
        if (speed != null) {
            this.currentSpeed = (speed > this.moveParams["max"]) ?
                this.moveParams["max"] : speed;
        }
        else if (this.moveParams["acc"] == 0) {
            this.currentSpeed = this.moveParams["max"];
        }
    };

    CmdMoveToProto.movingStart = function () {
        this.segments.length = 0;
        this.remainDistance = 0;
        var i, cnt = arguments.length, seg;
        for (i = 0; i < cnt; i++) {
            seg = arguments[i];
            this.segments.push(seg);
            this.remainDistance += seg.remainDistance;
        }

        this.setcurrentSpeed(null);
        this.isMoving = true;
        this.setStarPosition();

        if (this.is_continue_mode)
            this.move(this.remainDt);
    };

    CmdMoveToProto.setStarPosition = function (offset_distance) {
        var curSeg = this.segments[0];
        var offx = 0, offy = 0;
        if ((offset_distance != null) && (offset_distance != 0)) {
            offx = offset_distance * Math.cos(curSeg.angle);
            offy = offset_distance * Math.sin(curSeg.angle);
            curSeg.GetRemainDistance(offset_distance)
        }
        this.inst.x = curSeg.x0 + offx;
        this.inst.y = curSeg.y0 + offy;
        this.inst.set_bbox_changed();
    };

    CmdMoveToProto.saveToJSON = function () {
        var i, cnt = this.segments.length;
        var segSave = [];
        for (i = 0; i < cnt; i++) {
            segSave.push(this.segments[i].saveToJSON());
        }
        return {
            "en": this.activated,
            "v": this.moveParams,
            "is_m": this.isMoving,
            "c_spd": this.currentSpeed,
            "rd": this.remainDistance,
            "seg": segSave
        };
    };

    CmdMoveToProto.loadFromJSON = function (o) {
        this.activated = o["en"];
        this.moveParams = o["v"];
        this.isMoving = o["is_m"];
        this.currentSpeed = o["c_spd"];
        this.remainDistance = o["rd"];

        var segSave = o["seg"];
        var i, cnt = segSave.length;
        for (i = 0; i < cnt; i++) {
            var seg = new MoveSegment();
            seg.loadFromJSON(segSave[i]);
            this.segments.push(seg);
        }
    };

    window.rexObjs.GridMove.CmdMoveTo = CmdMoveTo;
}());  