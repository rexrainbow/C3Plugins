(function () {
    if (!window.rexObjs)
        window.rexObjs = {};

    if (window.rexObjs.ObjCacheKlass)
        return;

    var CanvasTextKlass = function () {
        // overwrite these functions
        this.splitTextFn = null;
        this.tagText2PropFn = null;
        this.prop2TagTextFn = null;
        // overwrite these functions

        this.canvas = null;
        this.context = null;

        this.textInfo = {
            "text": "",
            "x": 0,
            "y": 0,
            "boxWidth": 0,
            "boxHeight": 0,
            "ignore": null,
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
                this.context.font = style + " " + weight + " " + ptSize + " " + family;
            }

            var color = this.getFillColor(propScope);
            if (color.toLowerCase() !== "none")
                this.context.fillStyle = color;

            var stroke = this.getStroke(propScope);
            if (stroke.toLowerCase() !== "none") {
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
            var img = window.rexObjs.ImageBank.GetImage(pen.prop["img"]);
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
            if (this.getStroke(pen.prop).toLowerCase() !== "none")
                ctx.strokeText(pen.text, startX, startY);

            // fill text
            if (this.getFillColor(pen.prop).toLowerCase() !== "none")
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
            ctx.fillRect(0, 0, this.textInfo["boxWidth"], this.textInfo["boxHeight"]);
        }
    };

    CanvasTextKlassProto.drawPens = function (pensMgr, textInfo) {
        var boxWidth = textInfo["boxWidth"],
            boxHeight = textInfo["boxHeight"];
        var startX = textInfo["x"],
            startY = textInfo["y"];
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

    var NO_NEWLINE = 0;
    CanvasTextKlassProto.updatePens = function (pensMgr, textInfo, noWrap) {
        if (textInfo == null)
            textInfo = this.textInfo;

        pensMgr.freePens();

        // Save the textInfo into separated vars to work more comfortably.
        var text = textInfo["text"],
            boxWidth = textInfo["boxWidth"],
            boxHeight = textInfo["boxHeight"];
        if (text === "")
            return;

        var startX = 0,
            startY = 0;
        var cursorX = startX,
            cursorY = startY;
        var rawText, currentProp;

        var m, match = this.splitTextFn(text);
        var i, matchCnt = match.length;
        for (i = 0; i < matchCnt; i++) {
            var result = this.tagText2PropFn(match[i], currentProp);
            rawText = result.rawText;
            currentProp = result.prop;

            // add image pen                    
            if (currentProp.hasOwnProperty("img")) {
                var img = window.rexObjs.ImageBank.GetImage(currentProp["img"]);
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

                    // wrap text
                    var wrapLines = window.rexObjs.text2Lines(rawText, this.context, boxWidth, this.plugin.wrapbyword, cursorX - startX);

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

        if (!textInfo["ignore"]) {
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

        var textSave = this.textInfo["text"];
        this.textInfo["text"] = text;
        this.updatePens(__tempPensMgr, this.textInfo, true);
        this.textInfo["text"] = textSave;

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

    /**
     * Save a new class definition.
     */
    CanvasTextKlassProto.defineClass = function (id, definition) {
        this.savedClasses[id] = definition;
        return true;
    };

    /**
     * Returns a saved class.
     */
    CanvasTextKlassProto.getClass = function (id) {
        return this.savedClasses[id];
    };

    /**
     * A simple function to check if the given value is empty.
     */
    var isEmpty = function (str) {
        // Remove white spaces.
        str = str.replace(/^\s+|\s+$/, '');
        return str.length == 0;
    };

    /**
     * A simple function clear whitespaces.
     */
    CanvasTextKlassProto.trim = function (str) {
        var ws, i;
        str = str.replace(/^\s\s*/, '');
        ws = /\s/;
        i = str.length;
        while (ws.test(str.charAt(--i))) {
            continue;
        }
        return str.slice(0, i + 1);
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

    window.rexObjs.CanvasTextKlass = CanvasTextKlass;
}());