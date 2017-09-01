(function () {
    if (!window.rexObjs)
        window.rexObjs = {};

    // class of board
    if (window.rexObjs.BoardKlass)
        return;

    window.rexObjs.BoardKlass = function () {
        this.xyz2uid = {};
        this.uid2xyz = {};
        this.x_max = null;
        this.y_max = null;
        this.x_min = null;
        this.y_min = null;
    };
    var BoardKlassProto = window.rexObjs.BoardKlass.prototype;

    BoardKlassProto.Reset = function (ignore_recycle) {
        this.xyz2uid = {};
        window.rexObjs.BoardLXYZCache.freeLinesInDict(this.uid2xyz);

        this.x_max = null;
        this.y_max = null;
        this.x_min = null;
        this.y_min = null;
    };

    BoardKlassProto.GetAllChess = function () {
        return this.uid2xyz;
    };

    BoardKlassProto.AddCell = function (uid, x, y, z) {
        if (arguments.length == 2) {
            var xyz = x;
            x = xyz.x; y = xyz.y; z = xyz.z;
        }

        // xyz
        if (!this.xyz2uid.hasOwnProperty(x))
            this.xyz2uid[x] = {};
        var tmpx = this.xyz2uid[x];
        if (!tmpx.hasOwnProperty(y))
            tmpx[y] = {};
        var tmpy = tmpx[y];
        tmpy[z] = uid;

        // uid
        this.uid2xyz[uid] = window.rexObjs.BoardLXYZCache.allocLine(x, y, z);

        this.x_max = null;
        this.y_max = null;
        this.x_min = null;
        this.y_min = null;
    };

    BoardKlassProto.GetCell = function (x, y, z) {
        // (x,y,z) -> uid
        // (x,y) -> zHash = {z:uid}
        var tmp = this.xyz2uid[x];
        if (tmp != null) {
            tmp = tmp[y];
            if (z == null)
                return tmp;
            else if (tmp != null)
                return tmp[z];
        }
        return null;
    };

    BoardKlassProto.RemoveCell = function (x, y, z) {
        var uid, xyz;
        // board.RemoveCell(uid)        
        if (arguments.length === 1) {
            uid = x;
            xyz = this.uid2xyz[uid];
            if (!xyz)
                return;
            x = xyz.x, y = xyz.y, z = xyz.z;
        }
        // board.RemoveCell(x,y,z)               
        else if (arguments.length === 3) {
            uid = this.GetCell(x, y, z);
            if (uid == null)
                return;

            xyz = this.uid2xyz[uid];
        }
        else
            return;

        // xyz
        if (!this.xyz2uid.hasOwnProperty(x))
            return;
        var tmpx = this.xyz2uid[x];
        if (!tmpx.hasOwnProperty(y))
            return;
        var tmpy = tmpx[y];
        if (!tmpy.hasOwnProperty(z))
            return;

        delete tmpy[z];
        if (isEmptyTable(tmpy))
            delete tmpx[y];
        if (isEmptyTable(tmpx))
            delete this.xyz2uid[x];

        // uid
        delete this.uid2xyz[uid];
        window.rexObjs.BoardLXYZCache.freeLine(xyz);

        this.x_max = null;
        this.y_max = null;
        this.x_min = null;
        this.y_min = null;
    };

    var isEmptyTable = function (o) {
        for (var k in o)
            return false;

        return true;
    };

    BoardKlassProto.ResetCells = function (uid2xyz) {
        this.Reset();
        var uid, xyz;
        for (uid in uid2xyz) {
            xyz = uid2xyz[uid];
            this.AddCell(parseInt(uid), xyz.x, xyz.y, xyz.z);
        }
    };

    BoardKlassProto.GetMaxX = function () {
        if (this.x_max === null) {
            var uid, xyz;
            for (uid in this.uid2xyz) {
                xyz = this.uid2xyz[uid];
                if ((this.x_max === null) || (this.x_max < xyz.x))
                    this.x_max = xyz.x;
            }
        }

        return this.x_max;
    };

    BoardKlassProto.GetMaxY = function () {
        if (this.y_max === null) {
            var uid, xyz;
            for (uid in this.uid2xyz) {
                xyz = this.uid2xyz[uid];
                if ((this.y_max === null) || (this.y_max < xyz.y))
                    this.y_max = xyz.y;
            }
        }

        return this.y_max;
    };

    BoardKlassProto.GetMinX = function () {
        if (this.x_min === null) {
            var uid, xyz;
            for (uid in this.uid2xyz) {
                xyz = this.uid2xyz[uid];
                if ((this.x_min === null) || (this.x_min > xyz.x))
                    this.x_min = xyz.x;
            }
        }

        return this.x_min;
    };

    BoardKlassProto.GetMinY = function () {
        if (this.y_min === null) {
            var uid, xyz;
            for (uid in this.uid2xyz) {
                xyz = this.uid2xyz[uid];
                if ((this.y_min === null) || (this.y_min > xyz.y))
                    this.y_min = xyz.y;
            }
        }

        return this.y_min;
    };


    BoardKlassProto.saveToJSON = function () {
        // wrap: copy from this.items
        var uid, uid2xyz = {}, xyz;
        for (uid in this.uid2xyz) {
            uid2xyz[uid] = {};
            xyz = this.uid2xyz[uid];
            uid2xyz[uid]["x"] = xyz.x;
            uid2xyz[uid]["y"] = xyz.y;
            uid2xyz[uid]["z"] = xyz.z;
        }
        return {
            "xyz2uid": this.xyz2uid,
            "uid2xyz": uid2xyz
        };
    };

    BoardKlassProto.loadFromJSON = function (o) {
        this.xyz2uid = o["xyz2uid"];

        window.rexObjs.BoardLXYZCache.freeLinesInDict(this.uid2xyz);
        var uid, uid2xyz = o["uid2xyz"], xyz;
        for (uid in uid2xyz) {
            xyz = uid2xyz[uid];
            this.uid2xyz[uid] = window.rexObjs.BoardLXYZCache.allocLine(xyz["x"], xyz["y"], xyz["z"]);
        }
    };

}());
