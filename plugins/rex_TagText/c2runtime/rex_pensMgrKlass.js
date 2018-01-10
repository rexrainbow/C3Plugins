(function () {
    if (!window.rexObjs)
        window.rexObjs = {};

    if (window.rexObjs.PensMgrKlass)
        return;

    var penCache = new window.rexObjs.ObjCacheKlass();
    var lineCache = new window.rexObjs.ObjCacheKlass();
    var PensMgrKlass = function () {
        this.pens = []; // all pens
        this.lines = []; // pens in lines [ [],[],[],.. ]
    };
    var PensMgrKlassProto = PensMgrKlass.prototype;

    PensMgrKlassProto.freePens = function () {
        var li, lcnt = this.lines.length;
        for (li = 0; li < lcnt; li++)
            this.lines[li].length = 0; // unlink pens 

        penCache.freeAllLines(this.pens);
        lineCache.freeAllLines(this.lines);
    };

    PensMgrKlassProto.addPen = function (txt, x, y, width, prop, newLineMode) {
        var pen = penCache.allocLine();
        if (pen === null) {
            pen = new PenKlass();
        }
        pen.setPen(txt, x, y, width, prop, newLineMode);

        var previousPen = this.pens[this.pens.length - 1];
        if (previousPen == null)
            pen.startIndex = 0;
        else
            pen.startIndex = previousPen.getNextStartIndex();
        this.pens.push(pen);

        // maintan lines
        var line = this.lines[this.lines.length - 1];
        if (line == null) {
            line = lineCache.allocLine() || [];
            this.lines.push(line);
        }
        line.push(pen);

        // new line, add an empty line
        if (newLineMode !== NO_NEWLINE) {
            line = lineCache.allocLine() || [];
            this.lines.push(line);
        }
    };

    PensMgrKlassProto.getPens = function () {
        return this.pens;
    };

    PensMgrKlassProto.getLastPen = function () {
        return this.pens[this.pens.length - 1];
    };

    PensMgrKlassProto.getLines = function () {
        return this.lines;
    };

    PensMgrKlassProto.getLineStartChartIndex = function (i) {
        var line = this.lines[i];
        if (line == null)
            return 0;

        return line[0].startIndex;
    };

    PensMgrKlassProto.getLineEndChartIndex = function (i) {
        var li, hasLastPen = false,
            line;
        for (li = i; li >= 0; li--) {
            line = this.lines[li];
            hasLastPen = (line != null) && (line.length > 0);
            if (hasLastPen)
                break;
        }
        if (!hasLastPen)
            return 0;

        var lastPen = line[line.length - 1];
        return lastPen.getEndIndex();
    };

    PensMgrKlassProto.copy = function (targetPensMgr) {
        if (targetPensMgr == null)
            targetPensMgr = new PensMgrKlass();

        targetPensMgr.freePens();

        var li, lcnt = this.lines.length;
        var pens, pi, pcnt, pen;
        for (li = 0; li < lcnt; li++) {
            pens = this.lines[li];
            pcnt = pens.length;

            for (pi = 0; pi < pcnt; pi++) {
                pen = pens[pi];
                targetPensMgr.addPen(pen.text,
                    pen.x,
                    pen.y,
                    pen.width,
                    pen.prop,
                    pen.newLineMode);

            }
        }

        return targetPensMgr;
    };

    PensMgrKlassProto.getLineWidth = function (i) {
        var line = this.lines[i];
        if (!line)
            return 0;

        var lastPen = line[line.length - 1];
        if (!lastPen)
            return 0;

        var firstPen = line[0];
        var lineWidth = lastPen.getLastX(); // start from 0
        return lineWidth;
    };

    PensMgrKlassProto.getMaxLineWidth = function () {
        var w, maxW = 0,
            i, cnt = this.lines.length,
            line, lastPen;
        for (i = 0; i < cnt; i++) {
            w = this.getLineWidth(i);
            if (w > maxW)
                maxW = w;
        }

        return maxW;
    };

    PensMgrKlassProto.getRawText = function () {
        var txt = "",
            i, cnt = this.pens.length,
            pen;
        for (i = 0; i < cnt; i++)
            txt += this.pens[i].getRawText();

        return txt;
    };

    PensMgrKlassProto.getRawTextLength = function () {
        var l = 0,
            i, cnt = this.pens.length,
            pen;
        for (i = 0; i < cnt; i++)
            l += this.pens[i].getRawText().length;

        return l;
    };

    PensMgrKlassProto.getSliceTagText = function (start, end, prop2TagTextFn) {
        if (start == null)
            start = 0;
        if (end == null) {
            var last_pen = this.getLastPen();
            if (last_pen == null)
                return "";

            end = last_pen.getEndIndex();
        }

        var txt = "",
            i, cnt = this.pens.length,
            pen, penTxt, penStartIdx, penEndIdx, isInRange;
        var previousProp;
        for (i = 0; i < cnt; i++) {
            pen = this.pens[i];
            penTxt = pen.getRawText();
            penStartIdx = pen.startIndex;
            penEndIdx = pen.getNextStartIndex();

            if (penEndIdx < start)
                continue;

            isInRange = (penStartIdx >= start) && (penEndIdx < end);
            if (!isInRange) {
                penTxt = penTxt.substring(start - penStartIdx, end - penStartIdx);
            }
            txt += prop2TagTextFn(penTxt, pen.prop, previousProp);
            previousProp = pen.prop;

            if (penEndIdx >= end)
                break;
        }

        return txt;
    };

    var PenKlass = function () {
        this.text = null;
        this.x = null;
        this.y = null;
        this.width = null;
        this.prop = {};
        this.newLineMode = null;
        this.startIndex = null;
    }
    var PenKlassProto = PenKlass.prototype;

    PenKlassProto.setPen = function (txt, x, y, width, prop, newLineMode, startIndex) {
        this.text = txt;
        this.x = x;
        this.y = y;
        this.width = width;
        copyTable(prop, this.prop); // font, size, color, shadow, etc...
        this.newLineMode = newLineMode; // 0= no new line, 1=raw "\n", 2=wrapped "\n"
        this.startIndex = startIndex;
    };

    PenKlassProto.getRawText = function () {
        var txt = this.text || "";
        if (this.newLineMode == RAW_NEWLINE)
            txt += "\n";

        return txt;
    }
    PenKlassProto.getNextStartIndex = function () {
        return this.startIndex + this.getRawText().length;
    };

    PenKlassProto.getEndIndex = function () {
        return this.getNextStartIndex() - 1;
    };

    PenKlassProto.getLastX = function () {
        return this.x + this.width;
    };

    var copyTable = function (inObj, outObj, isMerge) {
        if (outObj == null)
            outObj = {};

        if (!isMerge) {
            for (var k in outObj) {
                if (!inObj.hasOwnProperty(k))
                    delete outObj[k];
            }
        }

        for (var k in inObj)
            outObj[k] = inObj[k];

        return outObj;
    };

    window.rexObjs.PensMgrKlass = PensMgrKlass;
}());