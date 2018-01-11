(function () {
    if (!window.rexObjs)
        window.rexObjs = {};

    if (window.rexObjs.CanvasTextKlass)
        return;

    var NO_NEWLINE = 0;
    var RAW_NEWLINE = 1;
    var WRAPPED_NEWLINE = 2;

    var CanvasTextKlass = function () {
        // overwrite these functions and objects
        this.splitTextFn = null;
        this.tagText2PropFn = null;
        this.prop2TagTextFn = null;
        this.imageBank = null;
        // overwrite these functions and objects

        this.canvas = null;
        this.context = null;

        this.textInfo = {
            text: "",
            x: 0,
            y: 0,
            boxWidth: 0,
            boxHeight: 0,
            ignore: null,
        };
        this.pensMgr = new PensMgrKlass();
        this.text_changed = true; // update this.pens to redraw

        /*
         * Default values, overwrite before draw by plugin
         */
        this.defaultProperties = {
            family: "Verdana",
            weight: "",
            ptSize: "12pt",
            color: "#000000",
            stroke: ["none", 1],
            style: "normal",
            shadow: "",
        };
        this.underline = {
            thickness: 1,
            offset: 0
        };
        this.textAlign = "start";
        this.lineHeight = "16";
        this.textBaseline = "alphabetic";
        this.backgroundColor = "";

        var self = this;
        this.getTextWidth = function (txt) {
            return self.context.measureText(txt).width;
        }
    };
    var CanvasTextKlassProto = CanvasTextKlass.prototype;

    CanvasTextKlassProto.Reset = function (plugin) {
        this.plugin = plugin;
    };
    CanvasTextKlassProto.getLines = function () {
        return this.pensMgr.getLines();
    };

    CanvasTextKlassProto.applyPropScope = function (propScope) {
        if (this.isTextMode(propScope)) {
            // draw text
            var font = propScope["font"];
            if (font) {
                this.context.font = font;
            } else {
                var style = propScope["style"] || this.defaultProperties.style;
                var weight = propScope["weight"] || this.defaultProperties.weight;
                var ptSize = this.getTextSize(propScope);
                var family = propScope["family"] || this.defaultProperties.family;
                this.context.font = style + " " + weight + " " + ptSize + " '" + family + "'";
            }

            var color = this.getFillColor(propScope);
            if (isValidColor(color))
                this.context.fillStyle = color;

            var stroke = this.getStroke(propScope);
            if (isValidColor(stroke)) {
                stroke = stroke.split(" ");
                this.context.strokeStyle = stroke[0];
                if (stroke[1] != null) this.context.lineWidth = parseFloat(stroke[1].replace("px", ""));
                if (stroke[2] != null) {
                    this.context.lineJoin = stroke[2];
                    this.context.miterLimit = 2;
                }
            }
        }

        var shadow = (propScope["shadow"]) ? propScope["shadow"] : this.defaultProperties.shadow;
        if (shadow !== "") {
            shadow = shadow.split(" ");
            this.context.shadowOffsetX = parseFloat(shadow[0].replace("px", ""));
            this.context.shadowOffsetY = parseFloat(shadow[1].replace("px", ""));
            this.context.shadowBlur = parseFloat(shadow[2].replace("px", ""));
            this.context.shadowColor = shadow[3];
        }

    };

    CanvasTextKlassProto.isTextMode = function (propScope) {
        var isImageMode = propScope.hasOwnProperty("img");
        return !isImageMode;
    };

    CanvasTextKlassProto.getTextSize = function (propScope) {
        var size;
        if (propScope.hasOwnProperty("size"))
            size = propScope["size"];
        else
            size = this.defaultProperties.ptSize;
        return size;
    };
    CanvasTextKlassProto.getFillColor = function (propScope) {
        var color;
        if (propScope.hasOwnProperty("color"))
            color = propScope["color"];
        else
            color = this.defaultProperties.color;
        return color;
    };
    CanvasTextKlassProto.getStroke = function (propScope) {
        var stroke;
        if (propScope.hasOwnProperty("stroke"))
            stroke = propScope["stroke"];
        else
            stroke = this.defaultProperties.stroke;
        return stroke;
    };

    CanvasTextKlassProto.drawPen = function (pen, offsetX, offsetY) {
        var ctx = this.context;
        ctx.save();

        this.applyPropScope(pen.prop);

        var startX = offsetX + pen.x;
        var startY = offsetY + pen.y;

        // underline
        var underline = pen.prop["u"];
        if (underline) {
            underline = underline.split(" ");
            var color = underline[0];

            var thicknessSave = this.underline.thickness;
            if (underline[1] != null) this.underline.thickness = parseFloat(underline[1].replace("px", ""));

            var offsetSave = this.underline.offset;
            if (underline[2] != null) this.underline.offset = parseFloat(underline[2].replace("px", ""));

            this.drawUnderline(pen.text, startX, startY,
                this.getTextSize(pen.prop),
                color);

            this.underline.thickness = thicknessSave;
            this.underline.offset = offsetSave;
        }

        // draw image
        if (pen.prop.hasOwnProperty("img")) {
            var img = this.imageBank.GetImage(pen.prop["img"]);
            if (img) {
                var y = startY + img.yoffset;
                if (this.textBaseline == "alphabetic") {
                    y -= this.lineHeight;
                }
                ctx.drawImage(img.img, startX, y, img.width, img.height);
            }
        }

        // draw text
        else {
            // stoke
            if (isValidColor(this.getStroke(pen.prop)))
                ctx.strokeText(pen.text, startX, startY);

            // fill text
            if (isValidColor(this.getFillColor(pen.prop)))
                ctx.fillText(pen.text, startX, startY);
        }


        ctx.restore();
    };

    CanvasTextKlassProto.drawUnderline = function (text, x, y, size, color) {
        var ctx = this.context;
        var width = ctx.measureText(text).width;
        //switch(ctx.textAlign)
        //{
        //case "center": x -= (width/2); break;
        //case "right": x -= width; break;
        //}
        y += this.underline.offset;
        if (this.textBaseline === "top")
            y += parseInt(size);

        ctx.beginPath();
        ctx.strokeStyle = color;
        ctx.lineWidth = this.underline.thickness;
        ctx.moveTo(x, y);
        ctx.lineTo(x + width, y);
        ctx.stroke();
    };

    CanvasTextKlassProto.preProcess = function () {
        if (this.backgroundColor !== "") {
            var ctx = this.context;
            ctx.fillStyle = this.backgroundColor;
            ctx.fillRect(0, 0, this.textInfo.boxWidth, this.textInfo.boxHeight);
        }
    };

    CanvasTextKlassProto.drawPens = function (pensMgr, textInfo) {
        var boxWidth = textInfo.boxWidth,
            boxHeight = textInfo.boxHeight;
        var startX = textInfo.x,
            startY = textInfo.y;
        var lines = pensMgr.getLines(),
            lcnt = lines.length;

        var offsetX, offsetY;
        // vertical alignment
        if (this.plugin.valign === 1) // center
            offsetY = Math.max((boxHeight - (lcnt * this.lineHeight)) / 2, 0);
        else if (this.plugin.valign === 2) // bottom
            offsetY = Math.max(boxHeight - (lcnt * this.lineHeight) - 2, 0);
        else
            offsetY = 0;

        offsetY += startY;

        if (this.textBaseline == "alphabetic")
            offsetY += this.plugin.vshift; // shift line down    

        var li, lineWidth;
        var pi, pcnt, pens, pen;
        for (li = 0; li < lcnt; li++) {
            lineWidth = pensMgr.getLineWidth(li);
            if (lineWidth === 0)
                continue;

            if (this.plugin.halign === 1) // center
                offsetX = (boxWidth - lineWidth) / 2;
            else if (this.plugin.halign === 2) // right
                offsetX = boxWidth - lineWidth;
            else
                offsetX = 0;

            offsetX += startX;

            pens = lines[li];
            pcnt = pens.length;
            for (pi = 0; pi < pcnt; pi++) {
                pen = pens[pi];
                if (pen.text === "")
                    continue;

                this.drawPen(pen, offsetX, offsetY);
            }
        }
    };

    CanvasTextKlassProto.postProcess = function () {

    };

    CanvasTextKlassProto.updatePens = function (pensMgr, textInfo, noWrap) {
        debugger
        if (textInfo == null)
            textInfo = this.textInfo;

        pensMgr.freePens();

        // Save the textInfo into separated vars to work more comfortably.
        var txt = textInfo.text,
            boxWidth = textInfo.boxWidth,
            boxHeight = textInfo.boxHeight;
        if (txt === "")
            return;

        var startX = 0,
            startY = 0;
        var cursorX = startX,
            cursorY = startY;
        var rawText, currentProp;

        var m, match = this.splitTextFn(txt);
        var i, matchCnt = match.length;
        for (i = 0; i < matchCnt; i++) {
            var result = this.tagText2PropFn(match[i], currentProp);
            rawText = result.rawText;
            currentProp = result.prop;

            // add image pen                    
            if (currentProp.hasOwnProperty("img")) {
                var img = this.imageBank.GetImage(currentProp["img"]);
                if (!img)
                    continue;

                if (!noWrap) {
                    if (img.width > boxWidth - (cursorX - startX)) {
                        cursorX = startX;
                        cursorY += this.lineHeight;
                    }
                    pensMgr.addPen(null, // text
                        cursorX, // x
                        cursorY, // y
                        img.width, // width
                        currentProp, // prop
                        0 // newLineMode
                    );

                    cursorX += img.width;
                } else {
                    pensMgr.addPen(null, // text
                        null, // x
                        null, // y
                        null, // width
                        currentProp, // prop
                        0 // newLineMode
                    );
                }
            }

            // add text pen            
            else {
                if (!noWrap) {
                    // Save the current context.
                    this.context.save();

                    this.applyPropScope(currentProp);

                    // wrap text to lines
                    var wrapLines = window.rexObjs.text2Lines(rawText, this.getTextWidth, boxWidth, this.plugin.wrapbyword, cursorX - startX);

                    // add pens
                    var lcnt = wrapLines.length,
                        n, l;
                    for (n = 0; n < lcnt; n++) {
                        l = wrapLines[n];
                        pensMgr.addPen(l.text, // text
                            cursorX, // x
                            cursorY, // y
                            l.width, // width
                            currentProp, // prop
                            l.newLineMode // newLineMode
                        );

                        if (l.newLineMode !== NO_NEWLINE) {
                            cursorX = startX;
                            cursorY += this.lineHeight;
                        } else {
                            cursorX += l.width;
                        }

                    }
                    this.context.restore();
                } else {
                    pensMgr.addPen(rawText, // text
                        null, // x
                        null, // y
                        null, // width
                        currentProp, // prop
                        0 // newLineMode
                    );
                    // new line had been included in raw text
                }

            }
        } // for (i = 0; i < matchCnt; i++) 
    };

    CanvasTextKlassProto.drawText = function () {
        var textInfo = this.textInfo;
        if (this.text_changed) {
            this.updatePens(this.pensMgr, textInfo);
            this.text_changed = false;
        }

        if (!textInfo.ignore) {
            // Let's draw the text
            // Set the text Baseline
            this.context.textBaseline = this.textBaseline;
            // Set the text align
            this.context.textAlign = this.textAlign;

            this.preProcess();
            this.drawPens(this.pensMgr, textInfo);
            this.postProcess();
        }

    };

    var __tempPensMgr = null;
    CanvasTextKlassProto.getSubText = function (start, end, text) {
        if (text == null)
            return this.pensMgr.getSliceTagText(start, end, this.prop2TagTextFn);

        if (__tempPensMgr === null)
            __tempPensMgr = new PensMgrKlass();

        var textSave = this.textInfo.text;
        this.textInfo.text = text;
        this.updatePens(__tempPensMgr, this.textInfo, true);
        this.textInfo.text = textSave;

        return __tempPensMgr.getSliceTagText(start, end, this.prop2TagTextFn);
    };

    var RAWTEXTONLY_MODE = 1;
    CanvasTextKlassProto.getRawText = function (text) {
        if (text == null)
            return this.pensMgr.getRawText();

        var m, match = this.splitTextFn(text, 1); // RAWTEXTONLY_MODE
        if (match.length === 0)
            return "";

        var i, matchCnt = match.length;
        var innerMatch, rawTxt = "";
        for (i = 0; i < matchCnt; i++) {
            rawTxt += match[i];
        } // for (i = 0; i < matchCnt; i++)     

        return rawTxt;
    };

    CanvasTextKlassProto.copyPensMgr = function (pensMgr) {
        return this.pensMgr.copy(pensMgr);
    }

    CanvasTextKlassProto.getTextWidth = function (pensMgr) {
        if (pensMgr == null)
            pensMgr = this.pensMgr;

        return pensMgr.getMaxLineWidth();
    };

    CanvasTextKlassProto.getLastPen = function (pensMgr) {
        if (pensMgr == null)
            pensMgr = this.pensMgr;

        return pensMgr.getLastPen();
    };
    // ----

    CanvasTextKlassProto.saveToJSON = function () {
        return {
            "bgc": this.backgroundColor
        };
    };

    CanvasTextKlassProto.loadFromJSON = function (o) {
        this.backgroundColor = o["bgc"];
    };

    var isValidColor = function (color) {
        if (typeof (color) == 'string') {
            return (color.toLowerCase() !== 'none');
        }

        return true;
    }

    window.rexObjs.CanvasTextKlass = CanvasTextKlass;


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

}());