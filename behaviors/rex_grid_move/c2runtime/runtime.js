// ECMAScript 5 strict mode
"use strict";

assert2(cr, "cr namespace not created");
assert2(cr.behaviors, "cr.behaviors not created");

/////////////////////////////////////
// Behavior class
cr.behaviors.Rex_GridMove = function (runtime) {
    this.runtime = runtime;
};

(function () {
    var behaviorProto = cr.behaviors.Rex_GridMove.prototype;

    /////////////////////////////////////
    // Behavior type class
    behaviorProto.Type = function (behavior, objtype) {
        this.behavior = behavior;
        this.objtype = objtype;
        this.runtime = behavior.runtime;
    };

    var behtypeProto = behaviorProto.Type.prototype;

    behtypeProto.onCreate = function () {
        this.group = null;
        this.randomGen = null;
    };

    behtypeProto.GetInstGroup = function () {
        if (this.group != null)
            return this.group;

        var plugins = this.runtime.types;
        var name, inst;
        for (name in plugins) {
            inst = plugins[name].instances[0];

            if (cr.plugins_.Rex_gInstGroup && (inst instanceof cr.plugins_.Rex_gInstGroup.prototype.Instance)) {
                this.group = inst;
                return this.group;
            }
        }
        assert2(this.group, "Grid move behavior: Can not find instance group oject.");
        return null;
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

    var getUID = function (objs) {
        var uid;
        if (objs == null)
            uid = null;
        else if (typeof (objs) === "object") {
            var inst = objs.getFirstPicked();
            uid = (inst != null) ? inst.uid : null;
        }
        else
            uid = objs;

        return uid;
    };

    behinstProto.onCreate = function () {
        this.board = null;
        if (!this.recycled) {
            this.cmdMoveTo = new CmdMoveToKlass(this);
        }
        this.cmdMoveTo.Reset(this);

        this.isMovingRequestAccepted = false;
        this.isMyCall = false;
        this.exp_BlockerUID = (-1);
        this.exp_Direction = (-1);
        this.exp_SourceLX = (-1);
        this.exp_SourceLY = (-1);
        this.exp_SourceLZ = (-1);
        this.exp_DestinationLX = (-1);
        this.exp_DestinationLY = (-1);
        this.exp_DestinationLZ = (-1);
        this.exp_TargetPX = 0;
        this.exp_TargetPY = 0;
        this.isCustomSolid = null;

        if (!this.recycled) {
            this.wanderInfo = {
                "rx": 0,
                "ry": 0,
                "o": { "x": 0, "y": 0, "z": 0 }
            };
        }
        this.wanderInfo["rx"] = this.properties[4];
        this.wanderInfo["ry"] = this.properties[5];

        this.force_move = this.properties[6];
        this.enable_moveTo = this.properties[7];
        if (!this.recycled) {
            this._dir_sequence = [];
            this._colliding_xyz = {};
            this._colliding_zhash2uids = {};
        }
        else {
            this._dir_sequence.length = 0;
            var k;
            for (k in this._colliding_xyz)
                delete this._colliding_xyz[k];
            for (k in this._colliding_zhash2uids)
                delete this._colliding_zhash2uids[k];
        }
        this._target_uid = null;
        this._z_saved = null;
    };

    behinstProto.tick = function () {
        this.cmdMoveTo.tick();
    };

    var _dir_sequence_init = function (arr, dir_count) {
        var i;
        arr.length = 0;
        for (i = 0; i < dir_count; i++)
            arr.push(i);
    };

    behinstProto.GetBoard = function () {
        var xyz;
        if (this.board != null) {
            xyz = this.board.uid2xyz(this.inst.uid);
            if (xyz != null)
                return this.board;  // find out xyz on board
            else  // chess no longer at board
                this.board = null;
        }

        var plugins = this.runtime.types;
        var name, inst;
        for (name in plugins) {
            inst = plugins[name].instances[0];
            if (cr.plugins_.Rex_SLGBoard && (inst instanceof cr.plugins_.Rex_SLGBoard.prototype.Instance)) {
                xyz = inst.uid2xyz(this.inst.uid)
                if (xyz != null) {
                    this.board = inst;
                    _dir_sequence_init(this._dir_sequence, inst.GetLayout().GetDirCount());
                    this.wanderInfo["o"]["x"] = xyz.x;
                    this.wanderInfo["o"]["y"] = xyz.y;
                    this.wanderInfo["o"]["z"] = xyz.z;
                    return this.board;
                }
            }
        }
        return null;
    };

    behinstProto.chess_xyz_get = function (uid) {
        if (uid == null)
            uid = this.inst.uid;
        var board = this.GetBoard();
        if (board != null)
            return board.uid2xyz(uid);
        else
            return null;
    };
    behinstProto._chess_inst_get = function (uid) {
        var board = this.GetBoard();
        if (board != null)
            return board.uid2inst(uid);
        else
            return null;
    };

    var _solid_get = function (inst) {
        return (inst && inst.extra && inst.extra["solidEnabled"]);
    };

    behinstProto.target2dir = function (target_x, target_y, target_z) {
        var my_xyz = this.chess_xyz_get();
        return this.GetBoard().xy2NeighborDir(my_xyz.x, my_xyz.y, target_x, target_y);
    };

    behinstProto.set_move_target = function (target_x, target_y, target_z, dir) {
        var my_xyz = this.chess_xyz_get();
        this.exp_SourceLX = my_xyz.x;
        this.exp_SourceLY = my_xyz.y;
        this.exp_SourceLZ = my_xyz.z;

        this.exp_DestinationLX = target_x;
        this.exp_DestinationLY = target_y;
        this.exp_DestinationLZ = target_z;
        this.exp_Direction = (dir != null) ? dir : (-1);
    };

    behinstProto._custom_can_move_to_get = function () {
        this.isCustomSolid = null;
        this.runtime.trigger(cr.behaviors.Rex_GridMove.prototype.cnds.OnGetSolid, this.inst);
        var can_move_to;
        if (this.isCustomSolid == null)
            can_move_to = null;
        else if (this.isCustomSolid)
            can_move_to = (-1);
        else
            can_move_to = 1;
        return can_move_to;
    };

    behinstProto.test_move_to = function (target_x, target_y, target_z, dir)   // return 1 if can move to
    {
        this.set_move_target(target_x, target_y, target_z, dir);
        this.exp_BlockerUID = (-1);

        var my_xyz = this.chess_xyz_get();
        if ((target_x === my_xyz.x) && (target_y === my_xyz.y) && (target_z === my_xyz.z))
            return 1; // can move to target
        else if (!this.board.IsInsideBoard(target_x, target_y))  // tile does not exist
            return null;

        var _target_uid = this.board.xyz2uid(target_x, target_y, target_z);
        this._target_uid = _target_uid;  // pass _target_uid out

        if (this.force_move)
            return 1; // can move to target

        if (_target_uid == null)  // no overlap at the same z
        {
            // first, get solid property from event sheet
            var custom_can_move_to = this._custom_can_move_to_get();
            if (custom_can_move_to != null)
                return custom_can_move_to;

            // find out if neighbors have solid property
            var zHash = this.board.xy2zHash(target_x, target_y);
            if (!zHash)
                return null;
            var z;
            if (target_z != 0) {
                if (zHash[0] == null)  // tile does not exist
                    return null;
                for (z in zHash) {
                    _target_uid = zHash[z];
                    if (_solid_get(this.board.uid2inst(_target_uid)))  // solid
                    {
                        this.exp_BlockerUID = _target_uid;
                        return (-1);  // blocked
                    }
                }
                return 1; // can move to target
            }
            else  // target_z == 0
            {
                return (zHash[0] == null) ? 1 : null;
            }
        }
        else {
            this.exp_BlockerUID = _target_uid;
            return (-1);  // blocked
        }
    };

    behinstProto.move_to_target = function (target_x, target_y, target_z, dir) {
        var can_move = this.test_move_to(target_x, target_y, target_z, dir);
        if (can_move == 1)  // can move to neighbor
        {
            var z_index;

            if (this.force_move) {
                if ((this._z_saved != null) &&     // slink
                    (this.board.xyz2uid(target_x, target_y, this._z_saved) == null)) {
                    z_index = this._z_saved;
                    this._z_saved = null;
                }
                else {
                    if (this._target_uid == null)
                        z_index = target_z;
                    else  // overlap with other chess -> change my z index to avoid overlapping
                    {
                        if (this._z_saved == null) {
                            this._z_saved = target_z;
                            z_index = "#" + this.inst.uid.toString();
                        }
                        else
                            z_index += "#";
                        while (this.board.xyz2uid(target_x, target_y, z_index) != null)
                            z_index += "#";
                    }
                }

            }
            else  // normal mode
                z_index = target_z;

            // set physical position
            this.moveto_pxy(target_x, target_y, target_z, dir);
            // set logical position
            this.board.MoveChess(this.inst, target_x, target_y, z_index);

            this.on_moving_request_success(true);
        }   // if (can_move == 1)
        else if (can_move == (-1)) {
            this.on_moving_request_success(false);
        }
        else {
            this.isMovingRequestAccepted = false;
        }
        return (can_move == 1);
    };

    behinstProto.moveto_pxy = function (lx, ly, lz, dir) {
        var board = this.GetBoard();
        var layout = board.GetLayout();
        this.exp_TargetPX = layout.LXYZ2PX(lx, ly, lz);
        this.exp_TargetPY = layout.LXYZ2PY(lx, ly, lz);

        if (!this.enable_moveTo)
            return;

        if ((!board.isWrapMode) || (dir == null)) {
            // not wrap mode, or not neighbor : move to target directly
            var seg = new MoveSegmentKlass(this.inst.x, this.inst.y, this.exp_TargetPX, this.exp_TargetPY);
            this.cmdMoveTo.movingStart(seg);
        }
        else // board.isWrapMode
        {
            var cur_xyz = this.chess_xyz_get();
            var relay_lx = layout.GetNeighborLX(cur_xyz.x, cur_xyz.y, dir);
            var relay_ly = layout.GetNeighborLY(cur_xyz.x, cur_xyz.y, dir);

            if ((relay_lx == lx) && (relay_ly == ly)) {
                // non-wrapped neighbor : move to target directly
                var seg = new MoveSegmentKlass(this.inst.x, this.inst.y, this.exp_TargetPX, this.exp_TargetPY);
                this.cmdMoveTo.movingStart(seg);
            }
            else {
                // wrap neighbor : move to relay point
                var relay_px = layout.LXYZ2PX(relay_lx, relay_ly, 0);
                var relay_py = layout.LXYZ2PY(relay_lx, relay_ly, 0);
                var seg0 = new MoveSegmentKlass(this.inst.x, this.inst.y, relay_px, relay_py);

                // wrap relay lxy
                if ((relay_lx < 0) || (relay_lx > board.x_max))
                    relay_lx = board.x_max - relay_lx;
                if ((relay_ly < 0) || (relay_ly > board.y_max))
                    relay_ly = board.y_max - relay_ly;
                relay_px = layout.LXYZ2PX(relay_lx, relay_ly, 0);
                relay_py = layout.LXYZ2PY(relay_lx, relay_ly, 0);
                var seg1 = new MoveSegmentKlass(relay_px, relay_py, this.exp_TargetPX, this.exp_TargetPY);
                this.cmdMoveTo.movingStart(seg0, seg1);
            }
        }

    };

    behinstProto.on_moving_request_success = function (can_move) {
        this.isMovingRequestAccepted = can_move;
        this.isMyCall = true;
        var trig = (can_move) ? cr.behaviors.Rex_GridMove.prototype.cnds.OnMovingRequestAccepted :
            cr.behaviors.Rex_GridMove.prototype.cnds.OnMovingRequestRejected;
        this.runtime.trigger(trig, this.inst);
        this.isMyCall = false;
    };

    var _shuffle = function (arr, random_gen) {
        var i = arr.length, j, temp, random_value;
        if (i == 0) return;
        while (--i) {
            random_value = (random_gen == null) ?
                Math.random() : random_gen.random();
            j = Math.floor(random_value * (i + 1));
            temp = arr[i];
            arr[i] = arr[j];
            arr[j] = temp;
        }
    };

    behinstProto.colliding_checking = function (target_x, target_y, target_z, dir) {
        this.set_move_target(target_x, target_y, target_z, dir);

        this._colliding_xyz.x = target_x;
        this._colliding_xyz.y = target_y;
        this._colliding_xyz.z = target_z;
        this.runtime.trigger(cr.behaviors.Rex_GridMove.prototype.cnds.OnCollidedBegin, this.inst);
    };

    behinstProto._zhash2uids = function (zHash) {
        var z, target_uids = this._colliding_zhash2uids;
        for (z in target_uids)
            delete target_uids[z];
        for (z in zHash)
            target_uids[zHash[z]] = true;
        return target_uids;
    };

    behinstProto._collide_test = function (colliding_xyz, objtype, group_name) {
        // pick collided instances into group
        var result_group, sol;
        if (group_name != null) {
            result_group = this.type.GetInstGroup().GetGroup(group_name);
            result_group.Clean();
        }
        // pick collided instances into SOL
        else {
            sol = objtype.getCurrentSol();
            sol.select_all = false;
            sol.instances.length = 0;   // clear contents
        }

        var zHash = this.board.xy2zHash(colliding_xyz.x, colliding_xyz.y);
        if (!zHash)
            return false;

        var target_uids = this._zhash2uids(zHash);
        var is_collided = false;
        var uid, inst;
        for (uid in target_uids) {
            uid = parseInt(uid);
            if (uid === this.inst.uid)
                continue;

            inst = this._uid2inst(uid, objtype);
            if (inst === null)
                continue;

            if (group_name != null) {
                result_group.AddUID(uid);
            }
            else {
                sol.instances.push(inst);
            }

            is_collided = true
        }
        return is_collided;
    };

    behinstProto._uid2inst = function (uid, objtype) {
        var inst = this.runtime.getObjectByUID(uid);
        if (inst == null)
            return null;

        if ((objtype == null) || (inst.type == objtype))
            return inst;
        else if (objtype.is_family) {
            var families = inst.type.families;
            var cnt = families.length, i;
            for (i = 0; i < cnt; i++) {
                if (objtype == families[i])
                    return inst;
            }
        }
        // objtype mismatch
        return null;
    };

    behinstProto.saveToJSON = function () {
        var randomGenUid = (this.type.randomGen != null) ? this.type.randomGen.uid : (-1);
        return {
            "mrq": this.isMovingRequestAccepted,
            "mt": this.cmdMoveTo.saveToJSON(),
            "wander": this.wanderInfo,
            "z": this._z_saved,
            "e_buid": this.exp_BlockerUID,
            "e_dir": this.exp_Direction,
            "e_slx": this.exp_SourceLX,
            "e_sly": this.exp_SourceLY,
            "e_slz": this.exp_SourceLZ,
            "e_dlx": this.exp_DestinationLX,
            "e_dly": this.exp_DestinationLY,
            "e_dlz": this.exp_DestinationLZ,
            "e_tpx": this.exp_TargetPX,
            "e_tpy": this.exp_TargetPY,
            "ruid": randomGenUid,
        };
    };

    behinstProto.loadFromJSON = function (o) {
        this.isMovingRequestAccepted = o["mrq"];
        this.cmdMoveTo.loadFromJSON(o["mt"]);
        this.wanderInfo = o["wander"];
        this._z_saved = o["z"];
        this.exp_BlockerUID = o["e_buid"];
        this.exp_Direction = o["e_dir"];
        this.exp_SourceLX = o["e_slx"];
        this.exp_SourceLY = o["e_sly"];
        this.exp_SourceLZ = o["e_slz"];
        this.exp_DestinationLX = o["e_dlx"];
        this.exp_DestinationLY = o["e_dly"];
        this.exp_DestinationLZ = o["e_dlz"];
        this.exp_TargetPX = o["e_tpx"];
        this.exp_TargetPY = o["e_tpy"];
        this.randomGenUid = o["ruid"];
    };

    behinstProto.afterLoad = function () {
        if (this.randomGenUid === -1)
            this.type.randomGen = null;
        else {
            this.type.randomGen = this.runtime.getObjectByUID(this.randomGenUid);
            assert2(this.type.randomGen, "Grid move: Failed to find random gen object by UID");
        }
        this.randomGenUid = -1;
        this.board = null;
    };

    //////////////////////////////////////
    // Conditions
    function Cnds() { };
    behaviorProto.cnds = new Cnds();

    Cnds.prototype.OnHitTarget = function () {
        return (this.cmdMoveTo.isMyCall);
    };

    Cnds.prototype.IsMoving = function () {
        return (this.cmdMoveTo.isMoving);
    };

    Cnds.prototype.OnMovingRequestAccepted = function () {
        return (this.isMyCall);
    };
    Cnds.prototype.OnMovingRequestRejected = function () {
        return (this.isMyCall);
    };
    Cnds.prototype.IsMovingRequestAccepted = function () {
        return this.isMovingRequestAccepted;
    };
    Cnds.prototype.TestMoveToOffset = function (dx, dy) {
        var xyz = this.chess_xyz_get();
        if (xyz == null)
            return false;

        var board = this.GetBoard();
        var tx = board.WrapLX(xyz.x + dx);
        var ty = board.WrapLY(xyz.y + dy);
        var tz = xyz.z;
        var dir = this.target2dir(tx, ty, tz);
        var can_move = this.test_move_to(tx, ty, tz, dir);
        return (can_move == 1);
    };
    Cnds.prototype.TestMoveToNeighbor = function (dir) {
        var xyz = this.chess_xyz_get();
        if (xyz == null)
            return false;

        var board = this.GetBoard();
        var tx = board.GetNeighborLX(xyz.x, xyz.y, dir);
        var ty = board.GetNeighborLY(xyz.x, xyz.y, dir);
        var tz = xyz.z;
        var can_move = this.test_move_to(tx, ty, tz, dir);
        return (can_move == 1);
    };

    Cnds.prototype.OnCollidedBegin = function (objtype, group_name) {
        return this._collide_test(this._colliding_xyz, objtype, group_name);
    };

    Cnds.prototype.OnGetSolid = function () {
        return true;
    };

    //////////////////////////////////////
    // Actions
    function Acts() { };
    behaviorProto.acts = new Acts();

    Acts.prototype.SetActivated = function (s) {
        this.cmdMoveTo.activated = (s == 1);
    };

    Acts.prototype.SetMaxSpeed = function (s) {
        this.cmdMoveTo.moveParams["max"] = s;
        this.cmdMoveTo.setcurrentSpeed(null);
    };

    Acts.prototype.SetAcceleration = function (a) {
        this.cmdMoveTo.moveParams["acc"] = a;
        this.cmdMoveTo.setcurrentSpeed(null);
    };

    Acts.prototype.SetDeceleration = function (a) {
        this.cmdMoveTo.moveParams["dec"] = a;
    };

    Acts.prototype.SetCurrentSpeed = function (s) {
        this.cmdMoveTo.setcurrentSpeed(s);
    };

    Acts.prototype.MoveToNeighbor = function (dir) {
        if (!this.cmdMoveTo.activated)
            return;

        var xyz = this.chess_xyz_get();
        if (xyz == null)
            return;

        var board = this.GetBoard();
        var tx = board.GetNeighborLX(xyz.x, xyz.y, dir);
        var ty = board.GetNeighborLY(xyz.x, xyz.y, dir);
        var tz = xyz.z;
        this.colliding_checking(tx, ty, tz, dir);
        this.move_to_target(tx, ty, tz, dir);
    };

    Acts.prototype.MoveToLXY = function (lx, ly) {
        if (!this.cmdMoveTo.activated)
            return;

        var xyz = this.chess_xyz_get();
        if (xyz == null)
            return;

        var tx = lx;
        var ty = ly;
        var tz = xyz.z;
        var dir = this.target2dir(tx, ty, tz);
        this.colliding_checking(tx, ty, tz, dir);
        this.move_to_target(tx, ty, tz, dir);
    };

    Acts.prototype.MoveToOffset = function (dx, dy) {
        if (!this.cmdMoveTo.activated)
            return;

        var xyz = this.chess_xyz_get();
        if (xyz == null)
            return;

        var board = this.GetBoard();
        var tx = board.WrapLX(xyz.x + dx);
        var ty = board.WrapLY(xyz.y + dy);
        var tz = xyz.z;
        var dir = this.target2dir(tx, ty, tz);
        this.colliding_checking(tx, ty, tz, dir);
        this.move_to_target(tx, ty, tz, dir);
    };

    Acts.prototype.MoveToTargetChess = function (objtype) {
        if (!this.cmdMoveTo.activated)
            return;
        var uid = getUID(objtype);
        if (uid == null)
            return;
        var target_xyz = this.chess_xyz_get(uid);
        if (target_xyz == null)
            return;

        var xyz = this.chess_xyz_get();
        if (xyz == null)
            return;

        var tx = target_xyz.x;
        var ty = target_xyz.y;
        var tz = xyz.z;
        var dir = this.target2dir(tx, ty, tz);
        this.colliding_checking(tx, ty, tz, dir);
        this.move_to_target(tx, ty, tz, dir);
    };

    function GetThisBehavior(inst) {
        var i, len;
        for (i = 0, len = inst.behavior_insts.length; i < len; i++) {
            if (inst.behavior_insts[i] instanceof behaviorProto.Instance)
                return inst.behavior_insts[i];
        }

        return null;
    };

    Acts.prototype.Swap = function (chessB_uid) {
        var chessB_inst = this._chess_inst_get(chessB_uid);
        if (chessB_inst == null)
            return;
        var chessB_binst = GetThisBehavior(chessB_inst);
        if (chessB_binst == null)
            return;

        var my_xyz = this.chess_xyz_get(this.inst.uid);
        var chessB_xyz = this.chess_xyz_get(chessB_uid);
        if ((my_xyz == null) || (chessB_xyz == null))
            return;

        // physical moving
        var my_dir = this.target2dir(chessB_xyz.x, chessB_xyz.y, chessB_xyz.z);
        this.moveto_pxy(chessB_xyz.x, chessB_xyz.y, chessB_xyz.z, my_dir);
        var chessB_dir = chessB_binst.target2dir(my_xyz.x, my_xyz.y, my_xyz.z);
        chessB_binst.moveto_pxy(my_xyz.x, my_xyz.y, my_xyz.z, chessB_dir);
        // logical swap
        this.GetBoard().SwapChess(this.inst.uid, chessB_uid);

        // request success
        this.set_move_target(chessB_xyz.x, chessB_xyz.y, chessB_xyz.z, my_dir);
        chessB_binst.set_move_target(my_xyz.x, my_xyz.y, my_xyz.z, chessB_dir);
        this.on_moving_request_success(true);
        chessB_binst.on_moving_request_success(true);
    };
    Acts.prototype.Wander = function () {
        if (!this.cmdMoveTo.activated)
            return;

        var xyz = this.chess_xyz_get();
        if (xyz == null)
            return;

        var board = this.GetBoard();
        var layout = this.GetBoard().layout;
        var init_lx = this.wanderInfo["o"]["x"];
        var init_ly = this.wanderInfo["o"]["y"];
        var rangeX = this.wanderInfo["rx"];
        var rangeY = this.wanderInfo["ry"];
        _shuffle(this._dir_sequence, this.type.randomGen);
        var i, dir, dir_count = this._dir_sequence.length;
        var tx, ty, tz = xyz.z, can_move;
        for (i = 0; i < dir_count; i++) {
            dir = this._dir_sequence[i];
            tx = board.GetNeighborLX(xyz.x, xyz.y, dir);
            ty = board.GetNeighborLY(xyz.x, xyz.y, dir);
            if ((Math.abs(tx - init_lx) > rangeX) ||
                (Math.abs(ty - init_ly) > rangeY))
                continue;
            can_move = this.move_to_target(tx, ty, tz, dir);
            if (can_move)
                break;
        }
    };

    Acts.prototype.SetWanderRangeX = function (rangeX) {
        if (rangeX < 0)
            rangeX = 0;
        this.wanderInfo["rx"] = rangeX;
    };

    Acts.prototype.SetWanderRangeY = function (rangeY) {
        if (rangeY < 0)
            rangeY = 0;
        this.wanderInfo["ry"] = rangeY;
    };

    Acts.prototype.SetRandomGenerator = function (random_gen_objs) {
        var random_gen = random_gen_objs.instances[0];
        if (random_gen.check_name == "RANDOM")
            this.type.randomGen = random_gen;
        else
            alert("[Grid move] This object is not a random generator object.");
    };

    Acts.prototype.ResetWanderCenter = function () {
        var xyz = this.chess_xyz_get();
        if (xyz == null)
            return;
        this.wanderInfo["o"]["x"] = xyz.x;
        this.wanderInfo["o"]["y"] = xyz.y;
        this.wanderInfo["o"]["z"] = xyz.z;
    };

    Acts.prototype.SetDestinationSolid = function (is_solid) {
        this.isCustomSolid = (is_solid > 0);
    };

    Acts.prototype.SetDestinationMoveable = function (is_moveable) {
        this.isCustomSolid = (!(is_moveable > 0));
    };

    Acts.prototype.SetInstanceGroup = function (group_objs) {
        var group = group_objs.instances[0];
        if (group.check_name == "INSTGROUP")
            this.type.group = group;
        else
            alert("[Grid move] This object is not a instance group object.");
    };

    // AI - Approach / Depart
    // helper
    var _get_logic_distance = function (board, target_insts, my_lx, my_ly, my_lz) {
        var layout = board.GetLayout();
        var i, cnt = target_insts.length, inst;
        var target_xyz, total_dist_sum = 0;
        for (i = 0; i < cnt; i++) {
            inst = target_insts[i];
            target_xyz = board.uid2xyz(inst.uid);
            if (target_xyz == null)
                continue;

            total_dist_sum += layout.LXYZ2Dist(my_lx, my_ly, my_lz, target_xyz.x, target_xyz.y, target_xyz.z, true);
        }
        return total_dist_sum;
    };
    var _ApproachOrDepart_dist2lxy = [];
    var _ApproachOrDepart_dist2lxy_sort_fn = function (pA, pB) {
        return (pA.d < pB.d) ? -1 : (pA.d > pB.d) ? 1 : 0;
    };
    Acts.prototype.ApproachOrDepart = function (chess_objs, is_depart) {
        if (!this.cmdMoveTo.activated)
            return;
        var xyz = this.chess_xyz_get();
        if (xyz == null)
            return;
        // get targets            
        var target_insts;
        if (typeof chess_objs == "number") {
            var inst = this.runtime.getObjectByUID(chess_objs);
            if (inst == null)
                return;
            target_insts = [inst];
        }
        else if (typeof chess_objs == "string") {
            var uids = JSON.parse(chess_objs);
            var i, cnt = uids.length, inst;
            target_insts = [];
            for (i = 0; i < cnt; i++) {
                inst = this.runtime.getObjectByUID(uids[i]);
                if (inst == null)
                    continue;
                target_insts.push(inst);
            }
        }
        else {
            if (!chess_objs)
                return;
            target_insts = chess_objs.getCurrentSol().getObjects();
        }
        if (target_insts.length === 0)
            return;
        // ----   
        var board = this.GetBoard();
        var layout = board.GetLayout();
        var i, dir_count = this._dir_sequence.length;
        var tx, ty, tz = xyz.z, can_move, pd;

        // get current distance
        pd = _get_logic_distance(board, target_insts, xyz.x, xyz.y, xyz.z);
        if (target_insts.length === 1)    // single target instance
        {
            if (pd === 0)
                return;  // overlap with target
        }
        else    // mutiple target instances
            _ApproachOrDepart_dist2lxy.push({ d: pd, lx: tx, ly: ty });

        // get neighbors' distance
        for (i = 0; i < dir_count; i++) {
            tx = board.GetNeighborLX(xyz.x, xyz.y, i);
            ty = board.GetNeighborLY(xyz.x, xyz.y, i);
            can_move = this.test_move_to(tx, ty, tz, i);
            if (can_move != 1)
                continue;

            pd = _get_logic_distance(board, target_insts, tx, ty, tz);
            _ApproachOrDepart_dist2lxy.push({ d: pd, lx: tx, ly: ty });
        }
        var dist2lxy;
        var cnt = _ApproachOrDepart_dist2lxy.length;
        if (cnt == 0)
            return;
        else {
            if (cnt > 1) {
                _shuffle(_ApproachOrDepart_dist2lxy);
            }
            dist2lxy = _ApproachOrDepart_dist2lxy[0];
            var i;

            if (is_depart == 0)  // find min
            {
                for (i = 1; i < cnt; i++) {
                    if (dist2lxy.d > _ApproachOrDepart_dist2lxy[i].d)
                        dist2lxy = _ApproachOrDepart_dist2lxy[i];
                }
            }
            else  // find max
            {
                for (i = 1; i < cnt; i++) {
                    if (dist2lxy.d < _ApproachOrDepart_dist2lxy[i].d)
                        dist2lxy = _ApproachOrDepart_dist2lxy[i];
                }
            }
        }

        if ((dist2lxy.lx !== xyz.x) || (dist2lxy.ly !== xyz.y))
            this.move_to_target(dist2lxy.lx, dist2lxy.ly, tz);

        _ApproachOrDepart_dist2lxy.length = 0;
    };
    // AI - Approach / Depart

    Acts.prototype.Stop = function () {
        this.cmdMoveTo.isMoving = false;
    };

    Acts.prototype.SetForceMoving = function (e) {
        this.force_move = (e === 1);
    };


    //////////////////////////////////////
    // Expressions
    function Exps() { };
    behaviorProto.exps = new Exps();

    Exps.prototype.Activated = function (ret) {
        ret.set_int((this.cmdMoveTo.activated) ? 1 : 0);
    };

    Exps.prototype.Speed = function (ret) {
        ret.set_float(this.cmdMoveTo.currentSpeed);
    };

    Exps.prototype.MaxSpeed = function (ret) {
        ret.set_float(this.cmdMoveTo.moveParams["max"]);
    };

    Exps.prototype.Acc = function (ret) {
        ret.set_float(this.cmdMoveTo.moveParams["acc"]);
    };

    Exps.prototype.Dec = function (ret) {
        ret.set_float(this.cmdMoveTo.moveParams["dec"]);
    };

    Exps.prototype.TargetX = function (ret) {
        ret.set_float(this.exp_TargetPX);
    };

    Exps.prototype.TargetY = function (ret) {
        ret.set_float(this.exp_TargetPY);
    };

    Exps.prototype.BlockerUID = function (ret) {
        ret.set_any(this.exp_BlockerUID);
    };

    Exps.prototype.Direction = function (ret) {
        ret.set_int(this.exp_Direction);
    };

    Exps.prototype.DestinationLX = function (ret) {
        ret.set_int(this.exp_DestinationLX);
    };

    Exps.prototype.DestinationLY = function (ret) {
        ret.set_int(this.exp_DestinationLY);
    };

    Exps.prototype.DestinationLZ = function (ret) {
        ret.set_int(this.exp_DestinationLZ);
    };

    Exps.prototype.SourceLX = function (ret) {
        ret.set_int(this.exp_SourceLX);
    };

    Exps.prototype.SourceLY = function (ret) {
        ret.set_int(this.exp_SourceLY);
    };

    Exps.prototype.SourceLZ = function (ret) {
        ret.set_int(this.exp_SourceLZ);
    };



    // MoveSegmentKlass
    var MoveSegmentKlass = function (x0, y0, x1, y1) {
        if (arguments.length > 0)
            this.Reset(x0, y0, x1, y1);
        else
            this.Reset(0, 0, 0, 0);
    }
    var MoveSegmentKlassProto = MoveSegmentKlass.prototype;

    MoveSegmentKlassProto.Reset = function (x0, y0, x1, y1) {
        this.x0 = x0;
        this.y0 = y0;
        this.x1 = x1;
        this.y1 = y1;
        this.angle = cr.angleTo(x0, y0, x1, y1);
        this.remainDistance = cr.distanceTo(this.x0, this.y0, this.x1, this.y1);
    };

    MoveSegmentKlassProto.GetRemainDistance = function (d) {
        this.remainDistance -= d;
        return this.remainDistance;
    };
    MoveSegmentKlassProto.saveToJSON = function () {
        return {
            "x0": this.x0,
            "y0": this.y0,
            "x1": this.x1,
            "y1": this.y1,
            "a": this.angle,
            "rd": this.remainDistance
        };
    };

    MoveSegmentKlassProto.loadFromJSON = function (o) {
        this.x0 = o["x0"];
        this.y0 = o["y0"];
        this.x1 = o["x1"];
        this.y1 = o["y1"];
        this.angle = o["a"];
        this.remainDistance = o["rd"];
    };

    // CmdMoveToKlass
    var CmdMoveToKlass = function (plugin) {
        this.moveParams = {
            "max": 0,
            "acc": 0,
            "dec": 0
        };
        this.segments = [];
    };
    var CmdMoveToKlassProto = CmdMoveToKlass.prototype;

    CmdMoveToKlassProto.Reset = function (plugin) {
        this.activated = plugin.properties[0];
        this.moveParams["max"] = plugin.properties[1];
        this.moveParams["acc"] = plugin.properties[2];
        this.moveParams["dec"] = plugin.properties[3];
        this.is_continue_mode = plugin.properties[8];
        this.segments.length = 0;
        this.isMoving = false;
        this.currentSpeed = 0;
        this.remainDistance = 0;  // used to control the moving speed
        this.remainDt = 0;
        this.isMyCall = false;

        this.inst = plugin.inst;
        this.runtime = plugin.runtime;
    };

    CmdMoveToKlassProto.tick = function () {
        this.remainDt = 0;
        if ((!this.activated) || (!this.isMoving))
            return;

        var dt = this.runtime.getDt(this.inst);
        this.move(dt);
    };

    CmdMoveToKlassProto.move = function (dt) {
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

    CmdMoveToKlassProto.setcurrentSpeed = function (speed) {
        if (speed != null) {
            this.currentSpeed = (speed > this.moveParams["max"]) ?
                this.moveParams["max"] : speed;
        }
        else if (this.moveParams["acc"] == 0) {
            this.currentSpeed = this.moveParams["max"];
        }
    };

    CmdMoveToKlassProto.movingStart = function () {
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

    CmdMoveToKlassProto.setStarPosition = function (offset_distance) {
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

    CmdMoveToKlassProto.saveToJSON = function () {
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

    CmdMoveToKlassProto.loadFromJSON = function (o) {
        this.activated = o["en"];
        this.moveParams = o["v"];
        this.isMoving = o["is_m"];
        this.currentSpeed = o["c_spd"];
        this.remainDistance = o["rd"];

        var segSave = o["seg"];
        var i, cnt = segSave.length;
        for (i = 0; i < cnt; i++) {
            var seg = new MoveSegmentKlass();
            seg.loadFromJSON(segSave[i]);
            this.segments.push(seg);
        }
    };    

}());
