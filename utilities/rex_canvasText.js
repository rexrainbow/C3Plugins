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
        this.parser = {
            splitText: null, // (txt, mode) -> [txt,...]
            tagText2Prop: null, // (txt, prevProp) -> prop
            prop2ContextProp: null, // (defaultContextProp, customProp) -> contextProp
            prop2TagText: null, // (txt, prop, prevProp) -> txt
        };
        this.fillCanvasPropFn = null;
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
            lineHeight: 12,
            vshift: 0,
            halign: 0, // 0=left, 1=center, 2=right
            valign: 0, // 0=top, 1=center, 2=bottom
            wrapbyword: 0, // 0=word, 1=character
            noDrawing: null,
        };
        this.pensMgr = new PensMgrKlass();
        this.text_changed = true; // update this.pens to redraw

        /*
         * Default values, overwrite before draw by plugin
         */
        this.defaultProperties = {
            "family": "Verdana",
            "weight": "",
            "ptSize": "12pt",
            "color": "#000000",
            "style": "normal",
            "stroke": ["none", 1, "miter"], // [color, lineWidth, lineJoin]
            "underline": ["none", 1, 0], // [color, thickness, offset]
            "shadow": ["none", 0, 0, 0], // [color, offsetx, offsety, blur]
            "img": null, // for image pen
            "font": null // assign font directly
        };

        this.textAlign = "start";
        this.textBaseline = "alphabetic";
        this.backgroundColor = "none";

        var self = this;
        this.getTextWidth = function (txt) {
            return self.context.measureText(txt).width;
        }
    };
    var CanvasTextKlassProto = CanvasTextKlass.prototype;

    CanvasTextKlassProto.getLines = function () {
        return this.pensMgr.getLines();
    };

    CanvasTextKlassProto.setContextPrpo = function (contextProp) {
        if (contextProp.img == null) {
            // draw text
            var font = contextProp.font;
            if (font == null) {
                font = contextProp.style + " " + contextProp.weight + " " + contextProp.ptSize + " '" + contextProp.family + "'";
            }
            this.context.font = font;

            if (isValidColor(contextProp.color))
                this.context.fillStyle = contextProp.color;

            if (isValidColor(contextProp.stroke[0])) {
                this.context.strokeStyle = contextProp.stroke[0];
                this.context.lineWidth = contextProp.stroke[1];
                this.context.lineJoin = contextProp.stroke[2];
                this.context.miterLimit = 2;
            }
        }

        if (isValidColor(contextProp.shadow[0])) {
            this.context.shadowColor = contextProp.shadow[0];
            this.context.shadowOffsetX = contextProp.shadow[1];
            this.context.shadowOffsetY = contextProp.shadow[2];
            this.context.shadowBlur = contextProp.shadow[3];
        }

    };

    CanvasTextKlassProto.drawPen = function (pen, offsetX, offsetY, textInfo) {
        var ctx = this.context;
        ctx.save();

        var curContextProp = this.parser.prop2ContextProp(
            this.defaultProperties,
            pen.prop,
            (pen.text == "")
        );
        this.setContextPrpo(curContextProp);

        var startX = offsetX + pen.x;
        var startY = offsetY + pen.y;

        // underline
        var underlineProp = curContextProp.underline;
        if (isValidColor(underlineProp[0])) {
            this.drawUnderline(pen.text, startX, startY,
                curContextProp.ptSize,
                underlineProp);
        }

        // draw image
        var imgName = curContextProp.img;
        if (imgName != null) {
            var img = this.imageBank.GetImage(imgName);
            if (img) {
                var y = startY + img.yoffset;
                if (this.textBaseline == "alphabetic") {
                    y -= textInfo.lineHeight;
                }
                ctx.drawImage(img.img, startX, y, img.width, img.height);
            }
        }

        // draw text
        else {
            // stoke
            if (isValidColor(curContextProp.stroke[0]))
                ctx.strokeText(pen.text, startX, startY);

            // fill text
            if (isValidColor(curContextProp.color))
                ctx.fillText(pen.text, startX, startY);
        }


        ctx.restore();
    };

    CanvasTextKlassProto.drawUnderline = function (text, x, y, size, underlineProp) {
        var ctx = this.context;
        var width = this.getTextWidth(text);
        //switch(ctx.textAlign)
        //{
        //case "center": x -= (width/2); break;
        //case "right": x -= width; break;
        //}
        y += underlineProp[2];
        if (this.textBaseline === "top")
            y += parseInt(size);

        ctx.beginPath();
        ctx.strokeStyle = underlineProp[0];
        ctx.lineWidth = underlineProp[1];
        ctx.moveTo(x, y);
        ctx.lineTo(x + width, y);
        ctx.stroke();
    };

    CanvasTextKlassProto.preProcess = function () {
        if (isValidColor(this.backgroundColor)) {
            var ctx = this.context;
            ctx.fillStyle = this.backgroundColor;
            ctx.fillRect(0, 0, this.textInfo.boxWidth, this.textInfo.boxHeight);
        }
    };

    CanvasTextKlassProto.drawPens = function (pensMgr, textInfo) {
        var boxWidth = textInfo.boxWidth,
            boxHeight = textInfo.boxHeight,
            halign = textInfo.halign,
            valign = textInfo.valign;
        var startX = textInfo.x,
            startY = textInfo.y;
        var lines = pensMgr.getLines(),
            lcnt = lines.length;

        var offsetX, offsetY;
        // vertical alignment
        if (valign === 1) // center
            offsetY = Math.max((boxHeight - (lcnt * textInfo.lineHeight)) / 2, 0);
        else if (valign === 2) // bottom
            offsetY = Math.max(boxHeight - (lcnt * textInfo.lineHeight) - 2, 0);
        else
            offsetY = 0;

        offsetY += startY;

        if (this.textBaseline == "alphabetic")
            offsetY += textInfo.vshift; // shift line down    

        var li, lineWidth;
        var pi, pcnt, pens, pen;
        for (li = 0; li < lcnt; li++) {
            lineWidth = pensMgr.getLineWidth(li);
            if (lineWidth === 0)
                continue;

            if (halign === 1) // center
                offsetX = (boxWidth - lineWidth) / 2;
            else if (halign === 2) // right
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

                this.drawPen(pen, offsetX, offsetY, textInfo);
            }
        }
    };

    CanvasTextKlassProto.postProcess = function () {

    };

    CanvasTextKlassProto.updatePens = function (pensMgr, textInfo, noWrap) {
        if (textInfo == null)
            textInfo = this.textInfo;

        pensMgr.freePens();

        // Save the textInfo into separated vars to work more comfortably.
        var txt = textInfo.text,
            boxWidth = textInfo.boxWidth,
            boxHeight = textInfo.boxHeight,
            lineHeight = textInfo.lineHeight;
        wrapbyword = textInfo.wrapbyword;
        if (txt === "")
            return;

        var startX = 0,
            startY = 0;
        var cursorX = startX,
            cursorY = startY;
        var rawText, curProp, curContextProp, imgName;

        var m, match = this.parser.splitText(txt);
        var i, matchCnt = match.length;
        for (i = 0; i < matchCnt; i++) {
            var result = this.parser.tagText2Prop(match[i], curProp);
            rawText = result.rawText;
            curProp = result.prop;
            curContextProp = this.parser.prop2ContextProp(
                this.defaultProperties,
                curProp,
                (rawText == "")
            );

            // add image pen  
            imgName = curContextProp.img;
            if (imgName != null) {
                var img = this.imageBank.GetImage(imgName);
                if (!img)
                    continue;

                if (!noWrap) {
                    if (img.width > boxWidth - (cursorX - startX)) {
                        cursorX = startX;
                        cursorY += lineHeight;
                    }
                    pensMgr.addPen(null, // text
                        cursorX, // x
                        cursorY, // y
                        img.width, // width
                        curProp, // prop
                        0 // newLineMode
                    );

                    cursorX += img.width;
                } else {
                    pensMgr.addPen(null, // text
                        null, // x
                        null, // y
                        null, // width
                        curProp, // prop
                        0 // newLineMode
                    );
                }
            }

            // add text pen            
            else if (rawText !== "") {
                if (!noWrap) {
                    // Save the current context.
                    this.context.save();
                    this.setContextPrpo(curContextProp);

                    // wrap text to lines
                    var wrapLines = window.rexObjs.text2Lines(rawText, this.getTextWidth, boxWidth, wrapbyword, cursorX - startX);

                    // add pens
                    var lcnt = wrapLines.length,
                        n, l;
                    for (n = 0; n < lcnt; n++) {
                        l = wrapLines[n];
                        pensMgr.addPen(l.text, // text
                            cursorX, // x
                            cursorY, // y
                            l.width, // width
                            curProp, // prop
                            l.newLineMode // newLineMode
                        );

                        if (l.newLineMode !== NO_NEWLINE) {
                            cursorX = startX;
                            cursorY += lineHeight;
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
                        curProp, // prop
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

        if (!textInfo.noDrawing) {
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
            return this.pensMgr.getSliceTagText(start, end, this.parser.prop2TagText);

        if (__tempPensMgr === null)
            __tempPensMgr = new PensMgrKlass();

        var textSave = this.textInfo.text;
        this.textInfo.text = text;
        this.updatePens(__tempPensMgr, this.textInfo, true);
        this.textInfo.text = textSave;

        return __tempPensMgr.getSliceTagText(start, end, this.parser.prop2TagText);
    };

    var RAWTEXTONLY_MODE = 1;
    CanvasTextKlassProto.getRawText = function (text) {
        if (text == null)
            return this.pensMgr.getRawText();

        var m, match = this.parser.splitText(text, 1); // RAWTEXTONLY_MODE
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

    CanvasTextKlassProto.saveToJSON = function () {
        return {
            "dp": this.defaultProperties,
            "bl": this.textBaseline,
            "bgc": this.backgroundColor
        };
    };

    CanvasTextKlassProto.loadFromJSON = function (o) {
        this.defaultProperties = o["dp"];
        this.textBaseline = o["bl"];
        this.backgroundColor = o["bgc"];
    };

    var isValidColor = function (color) {
        if (typeof (color) == 'string') {
            return (color.toLowerCase() !== 'none');
        }

        return true;
    };

    window.rexObjs.CanvasTextKlass = CanvasTextKlass;
    // ------------------------------------------------------------------------
    // ------------------------------------------------------------------------
    // ------------------------------------------------------------------------

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
    };
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

    var cloneJSON = function (o) {
        return JSON.parse(JSON.stringify(o));
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