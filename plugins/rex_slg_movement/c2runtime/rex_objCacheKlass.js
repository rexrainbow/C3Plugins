(function () {
    if (!window.rexObjs)
        window.rexObjs = {};

    if (window.rexObjs.ObjCacheKlass)
        return;

    var ObjCacheKlass = function () {
        this.lines = [];
    };

    var ObjCacheKlassProto = ObjCacheKlass.prototype;

    ObjCacheKlassProto.allocLine = function () {
        return (this.lines.length > 0) ? this.lines.pop() : null;
    };
    ObjCacheKlassProto.freeLine = function (l) {
        this.lines.push(l);
    };
    ObjCacheKlassProto.freeAllLines = function (arr) {
        var i, len;
        for (i = 0, len = arr.length; i < len; i++)
            this.freeLine(arr[i]);
        arr.length = 0;
    };

    window.rexObjs.ObjCacheKlass = ObjCacheKlass;
}());