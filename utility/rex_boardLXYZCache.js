(function () {
    if (!window.rexObjs)
        window.rexObjs = {};

    // logical XYZ structure recycle
    if (window.rexObjs.BoardLXYZCache)
        return;

    var LXYZCacheKlass = function () {
        this.lines = [];
    };
    var LXYZCacheKlassProto = LXYZCacheKlass.prototype;

    LXYZCacheKlassProto.allocLine = function (x, y, z) {
        var l = (this.lines.length > 0) ? this.lines.pop() : {};
        l.x = x;
        l.y = y;
        l.z = z;
        return l;
    };
    LXYZCacheKlassProto.freeLine = function (l) {
        this.lines.push(l);
    };
    LXYZCacheKlassProto.freeLinesInDict = function (d) {
        var k;
        for (k in d) {
            this.lines.push(d[k]);
            delete d[k];
        }
    };
    LXYZCacheKlassProto.freeLinesInArr = function (arr) {
        var i, len;
        for (i = 0, len = arr.length; i < len; i++)
            this.freeLine(arr[i]);
        arr.length = 0;
    };
    window.rexObjs.BoardLXYZCache = new LXYZCacheKlass();
}());    
