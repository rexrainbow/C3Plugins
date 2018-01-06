
(function () {
    if (!window.rexObjs)
        window.rexObjs = {};

    if (window.rexObjs.SequenceMatcherBufferKlass)
        return;

    var BufferKlass = function (maxLen) {
        this.buf = [];
        this.setMaxLength(maxLen);
    };
    var BufferKlassProto = BufferKlass.prototype;

    BufferKlassProto.clean = function () {
        this.buf.length = 0;
    };

    BufferKlassProto.setMaxLength = function (maxLen) {
        this.maxLen = maxLen;
        if (maxLen < this.buf.length)
            this.buf.length = maxLen;
    };

    BufferKlassProto.pushData = function (data) {
        this.buf.push(data);
        if (this.buf.length > this.maxLen)
            this.buf.shift()
    };

    BufferKlassProto.isMatched = function (pattern) {
        if (pattern == "")
            return false;

        var has_comma = (pattern.indexOf(",") != -1);
        if (has_comma) {
            pattern = pattern.split(",");
        }

        var patternLen = pattern.length;
        var bufLen = this.buf.length;
        if (patternLen > bufLen)
            return false;

        var i, isMatched = true;
        for (i = 0; i < patternLen; i++) {
            if (pattern[patternLen - 1 - i] != this.buf[bufLen - 1 - i]) {
                isMatched = false;
                break;
            }
        }
        return isMatched;
    };

    BufferKlassProto.saveToJSON = function () {
        return {
            "b": this.buf,
            "l": this.maxLen,
        };
    };

    BufferKlassProto.loadFromJSON = function (o) {
        this.buf = o["b"];
        this.setMaxLength(o["l"]);
    };

    BufferKlassProto.content2string = function (separator) {
        return this.buf.join(separator);
    };

    window.rexObjs.SequenceMatcherBufferKlass = BufferKlass;
}());   