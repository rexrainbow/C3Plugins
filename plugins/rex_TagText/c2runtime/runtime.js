// ECMAScript 5 strict mode
"use strict";

assert2(cr, "cr namespace not created");
assert2(cr.plugins_, "cr.plugins_ not created");

/////////////////////////////////////
// Plugin class
cr.plugins_.rex_TagText = function (runtime) {
    this.runtime = runtime;
};

(function () {
    var pluginProto = cr.plugins_.rex_TagText.prototype;

    pluginProto.onCreate = function () {
        // Override the 'set width' action
        pluginProto.acts.SetWidth = function (w) {
            if (this.width !== w) {
                this.width = w;
                this.set_bbox_changed();

                if (!this.isCanvasSizeLocked)
                    this.renderText(this.isForceRender);
            }
        };
    };

    /////////////////////////////////////
    // Object type class
    pluginProto.Type = function (plugin) {
        this.plugin = plugin;
        this.runtime = plugin.runtime;
    };

    var typeProto = pluginProto.Type.prototype;

    typeProto.onCreate = function () { };

    typeProto.onLostWebGLContext = function () {
        if (this.is_family)
            return;

        var i, len, inst;
        for (i = 0, len = this.instances.length; i < len; i++) {
            inst = this.instances[i];
            inst.mycanvas = null;
            inst.myctx = null;
            inst.mytex = null;
        }
    };

    /////////////////////////////////////
    // Instance class
    pluginProto.Instance = function (type) {
        this.type = type;
        this.runtime = type.runtime;

        this.text_changed = true;
    };

    var instanceProto = pluginProto.Instance.prototype;

    var requestedWebFonts = {}; // already requested web fonts have an entry here
    var lineJoinMode = ["miter", "round", "bevel"];
    instanceProto.onCreate = function () {
        this.text = "";
        this.set_text(this.properties[0]);
        this.facename = this.properties[1]; // "Arial"
        this.ptSize = this.properties[2];
        this.pxHeight = pt2px(this.ptSize);
        this.lineHeightOffset = this.properties[3];
        this.fontstyle = getFontStyle(this.properties[4], this.properties[5]);
        this.color = getColor(this.properties[6]); // [r,g,b]
        this.halign = this.properties[7]; // 0=left, 1=center, 2=right
        this.valign = this.properties[8]; // 0=top, 1=center, 2=bottom
        this.wrapbyword = (this.properties[9] === 0); // 0=word, 1=character
        this.visible = this.properties[10]; // 0=visible, 1=invisible

        this.lastwidth = this.width;
        this.lastwrapwidth = this.width;
        this.lastheight = this.height;


        this.baseLineMode = this.properties[12];
        this.vshift = this.properties[13] * this.runtime.devicePixelRatio;
        this.isForceRender = this.properties[14];
        this.LockCanvasSize(this.properties[15], this.width, this.height);

        // For WebGL rendering
        this.mycanvas = null;
        this.myctx = null;
        this.mytex = null;
        this.need_text_redraw = false;
        this.last_render_tick = this.runtime.tickcount;

        if (this.recycled) {
            this.rcTex.set(0, 0, 1, 1);
        } else {
            this.rcTex = new cr.rect(0, 0, 1, 1);
        }

        // In WebGL renderer tick this text object to release memory if not rendered any more
        if (this.runtime.glwrap)
            this.runtime.tickMe(this);

        this.tagInfo = null;
        if (!this.recycled) {
            var self = this;
            this.savedClasses = {}; // class define            
            this.canvasText = new window.rexObjs.CanvasTextKlass();
            this.canvasText.imageBank = window.rexObjs.ImageBank;
            this.canvasText.parser.splitText = splitText;
            this.canvasText.parser.tagText2Prop = function (txt, prevProp) {
                return tagText2Prop(txt, prevProp, self.savedClasses);
            };
            this.canvasText.parser.prop2ContextProp = prop2ContextProp;
            this.canvasText.parser.prop2TagText = prop2TagText;
        } else {
            for (var k in this.savedClasses)
                delete this.savedClasses[k];
        }
        this.canvasText.textBaseline = (this.baseLineMode === 0) ? "alphabetic" : "top";

        var backgroundColor = this.properties[16];
        if (backgroundColor === "")
            backgroundColor = "none";
        this.canvasText.backgroundColor = backgroundColor;

        // render text at object initialize
        if (this.text)
            this.renderText(this.isForceRender);
    };

    // tags
    instanceProto.defineClass = function (id, definition) {
        this.savedClasses[id] = definition;
    };

    var getColor = function (rgb) {
        if (typeof (rgb) == "object")
            return "rgb(" + Math.floor(rgb[0] * 255).toString() + "," + Math.floor(rgb[1] * 255).toString() + "," + Math.floor(rgb[2] * 255).toString() + ")";
        if (typeof (rgb) == "number")
            return "rgb(" + (cr.GetRValue(rgb) * 255).toString() + "," + (cr.GetGValue(rgb) * 255).toString() + "," + (cr.GetBValue(rgb) * 255).toString() + ")";
        else
            return rgb;
    }

    var getFontStyle = function (isBold, isItalic) {
        if (isBold && isItalic)
            return "bold italic";
        else if (isBold)
            return "bold";
        else if (isItalic)
            return "italic";
        else
            return "";
    };

    var pt2px = function (pt) {
        return Math.ceil((pt / 72.0) * 96.0) + 4; // assume 96dpi...
    };

    instanceProto.setFont = function (font) {
        var arr = font.split(" ");

        var i;
        for (i = 0; i < arr.length; i++) {
            // Ends with 'pt'
            if (arr[i].substr(arr[i].length - 2, 2) === "pt") {
                this.ptSize = parseInt(arr[i].substr(0, arr[i].length - 2));
                this.pxHeight = pt2px(this.ptSize);

                if (i > 0)
                    this.fontstyle = arr[i - 1];

                // Get the face name. Combine all the remaining tokens in case it's a space
                // separated font e.g. "Comic Sans MS"
                this.facename = arr[i + 1];

                for (i = i + 2; i < arr.length; i++)
                    this.facename += " " + arr[i];

                break;
            }
        }
    };

    instanceProto.saveToJSON = function () {
        return {
            "cls": this.savedClasses,
            "t": this.text,
            "ha": this.halign,
            "va": this.valign,
            "wr": this.wrapbyword,
            "lho": this.lineHeightOffset,
            "vs": this.vshift,
            "fn": this.facename,
            "fs": this.fontstyle,
            "ps": this.ptSize,
            "pxh": this.pxHeight,
            "lrt": this.last_render_tick,
            "txtObj": this.canvasText.saveToJSON(),
            "isLcs": this.isCanvasSizeLocked,
            "lcw": this.lockedCanvasWidth,
            "lch": this.lockedCanvasHeight,
        };
    };

    instanceProto.loadFromJSON = function (o) {
        this.savedClasses = o["cls"];
        this.text = o["t"];
        this.halign = o["ha"];
        this.valign = o["va"];
        this.wrapbyword = o["wr"];
        this.lineHeightOffset = o["lho"];
        this.vshift = o["vs"];
        this.facename = o["fn"];
        this.fontstyle = o["fs"];
        this.ptSize = o["ps"];
        this.pxHeight = o["pxh"];
        this.last_render_tick = o["lrt"];

        this.text_changed = true;
        this.lastwidth = this.width;
        this.lastwrapwidth = this.width;
        this.lastheight = this.height;

        this.canvasText.loadFromJSON(o["txtObj"]);

        this.isCanvasSizeLocked = o["isLcs"];
        this.lockedCanvasWidth = o["lcw"];
        this.lockedCanvasHeight = o["lch"];
    };

    instanceProto.tick = function () {
        // In WebGL renderer, if not rendered for 300 frames (about 5 seconds), assume
        // the object has gone off-screen and won't need its textures any more.
        // This allows us to free its canvas, context and WebGL texture to save memory.
        if (this.runtime.glwrap && this.mytex && (this.runtime.tickcount - this.last_render_tick >= 300)) {
            // Only do this if on-screen, otherwise static scenes which aren't re-rendering will release
            // text objects that are on-screen.
            var layer = this.layer;
            this.update_bbox();
            var bbox = this.bbox;

            if (bbox.right < layer.viewLeft || bbox.bottom < layer.viewTop || bbox.left > layer.viewRight || bbox.top > layer.viewBottom) {
                this.runtime.glwrap.deleteTexture(this.mytex);
                this.mytex = null;
                this.myctx = null;
                this.mycanvas = null;
            }
        }
    };

    instanceProto.onDestroy = function () {
        // Remove references to allow GC to collect and save memory
        this.myctx = null;
        this.mycanvas = null;

        if (this.runtime.glwrap && this.mytex)
            this.runtime.glwrap.deleteTexture(this.mytex);

        this.mytex = null;
    };

    instanceProto.updateFont = function () {
        this.renderText(this.isForceRender);
    };

    instanceProto.draw = function (ctx, glmode, noDrawing) {
        var isCtxSave = false;
        var width = (this.isCanvasSizeLocked) ? this.lockedCanvasWidth : this.width;
        var height = (this.isCanvasSizeLocked) ? this.lockedCanvasHeight : this.height;

        ctx.globalAlpha = glmode ? 1 : this.opacity;
        var myscale = 1;

        if (glmode) {
            myscale = this.layer.getScale();

            if (!isCtxSave) {
                ctx.save();
                isCtxSave = true;
            }
            ctx.scale(myscale, myscale);
        }

        // If text has changed, run the word wrap.
        if (this.text_changed || width !== this.lastwrapwidth) {
            this.canvasText.text_changed = true; // it will update pens (wordwrap) to redraw
            this.text_changed = false;
            this.lastwrapwidth = width;
        }

        this.update_bbox();
        var penX = glmode ? 0 : this.bquad.tlx;
        var penY = glmode ? 0 : this.bquad.tly;

        if (this.runtime.pixel_rounding) {
            penX = (penX + 0.5) | 0;
            penY = (penY + 0.5) | 0;
        }


        if (!glmode) {
            var isResized = (width !== this.width) || (height !== this.height);
            var isRotated = (this.angle !== 0);
            if (isRotated || isResized) {
                if (!isCtxSave) {
                    ctx.save();
                    isCtxSave = true;
                }

                if (isResized) {
                    var scalew = this.width / width;
                    var scaleh = this.height / height;
                    ctx.scale(scalew, scaleh);
                    ctx.translate(penX / scalew, penY / scaleh);
                    penX = 0;
                    penY = 0;
                }

                if (isRotated) {
                    if ((penX !== 0) || (penY !== 0))
                        ctx.translate(penX, penY);

                    ctx.rotate(this.angle);
                }

            }
        }

        var lineHeight = this.pxHeight;
        lineHeight += (this.lineHeightOffset * this.runtime.devicePixelRatio);

        // configure
        this.canvasText.canvas = ctx.canvas;
        this.canvasText.context = ctx;
        // default setting
        this.canvasText.defaultProperties.family = this.facename;
        this.canvasText.defaultProperties.ptSize = this.ptSize.toString() + "pt";
        this.canvasText.defaultProperties.style = this.fontstyle;
        this.canvasText.defaultProperties.color = this.color;

        this.canvasText.textInfo.text = this.text;
        this.canvasText.textInfo.x = penX;
        this.canvasText.textInfo.y = penY;
        this.canvasText.textInfo.boxWidth = width;
        this.canvasText.textInfo.boxHeight = height;
        this.canvasText.textInfo.lineHeight = lineHeight;
        this.canvasText.textInfo.vshift = this.vshift;
        this.canvasText.textInfo.halign = this.halign;
        this.canvasText.textInfo.valign = this.valign;
        this.canvasText.textInfo.wrapbyword = this.wrapbyword;
        this.canvasText.textInfo.noDrawing = noDrawing;
        this.canvasText.drawText();


        if (isCtxSave)
            ctx.restore();

        this.last_render_tick = this.runtime.tickcount;
    };

    instanceProto.drawGL = function (glw) {
        if (this.width < 1 || this.height < 1)
            return;

        var need_redraw = this.text_changed || this.need_text_redraw;
        this.need_text_redraw = false;
        var layerScale = this.layer.getScale();
        var layerAngle = this.layer.getAngle();
        var rcTex = this.rcTex;

        // Calculate size taking in to account scale
        var floatscaledwidth = layerScale * this.width;
        var floatscaledheight = layerScale * this.height;
        var scaledwidth = Math.ceil(floatscaledwidth);
        var scaledheight = Math.ceil(floatscaledheight);

        var halfw = this.runtime.draw_width / 2;
        var halfh = this.runtime.draw_height / 2;

        // canvas size  
        var canvaswidth = (!this.isCanvasSizeLocked) ? scaledwidth : Math.ceil(layerScale * this.lockedCanvasWidth);
        var canvasheight = (!this.isCanvasSizeLocked) ? scaledheight : Math.ceil(layerScale * this.lockedCanvasHeight);

        // Create 2D context for this instance if not already
        if (!this.myctx) {
            this.mycanvas = document.createElement("canvas");
            this.mycanvas.width = canvaswidth;
            this.mycanvas.height = canvasheight;
            this.lastwidth = canvaswidth;
            this.lastheight = canvasheight;
            need_redraw = true;
            this.myctx = this.mycanvas.getContext("2d");
        }

        // Update size if changed
        if (canvaswidth !== this.lastwidth || canvasheight !== this.lastheight) {
            this.mycanvas.width = canvaswidth;
            this.mycanvas.height = canvasheight;

            if (this.mytex) {
                glw.deleteTexture(this.mytex);
                this.mytex = null;
            }

            need_redraw = true;
        }

        // Need to update the GL texture
        if (need_redraw) {
            // Draw to my context
            this.myctx.clearRect(0, 0, canvaswidth, canvasheight);
            this.draw(this.myctx, true);

            // Create GL texture if none exists
            // Create 16-bit textures (RGBA4) on mobile to reduce memory usage - quality impact on desktop
            // was almost imperceptible
            if (!this.mytex)
                this.mytex = glw.createEmptyTexture(scaledwidth, scaledheight, this.runtime.linearSampling, this.runtime.isMobile);

            // Copy context to GL texture
            glw.videoToTexture(this.mycanvas, this.mytex, this.runtime.isMobile);
        }

        this.lastwidth = canvaswidth;
        this.lastheight = canvasheight;

        // Draw GL texture
        glw.setTexture(this.mytex);
        glw.setOpacity(this.opacity);

        glw.resetModelView();
        glw.translate(-halfw, -halfh);
        glw.updateModelView();

        var q = this.bquad;

        var tlx = this.layer.layerToCanvas(q.tlx, q.tly, true, true);
        var tly = this.layer.layerToCanvas(q.tlx, q.tly, false, true);
        var trx = this.layer.layerToCanvas(q.trx, q.try_, true, true);
        var try_ = this.layer.layerToCanvas(q.trx, q.try_, false, true);
        var brx = this.layer.layerToCanvas(q.brx, q.bry, true, true);
        var bry = this.layer.layerToCanvas(q.brx, q.bry, false, true);
        var blx = this.layer.layerToCanvas(q.blx, q.bly, true, true);
        var bly = this.layer.layerToCanvas(q.blx, q.bly, false, true);

        if (this.runtime.pixel_rounding || (this.angle === 0 && layerAngle === 0)) {
            var ox = ((tlx + 0.5) | 0) - tlx;
            var oy = ((tly + 0.5) | 0) - tly

            tlx += ox;
            tly += oy;
            trx += ox;
            try_ += oy;
            brx += ox;
            bry += oy;
            blx += ox;
            bly += oy;
        }

        if (this.angle === 0 && layerAngle === 0) {
            trx = tlx + scaledwidth;
            try_ = tly;
            brx = trx;
            bry = tly + scaledheight;
            blx = tlx;
            bly = bry;
            rcTex.right = 1;
            rcTex.bottom = 1;
        } else {
            rcTex.right = floatscaledwidth / scaledwidth;
            rcTex.bottom = floatscaledheight / scaledheight;
        }

        glw.quadTex(tlx, tly, trx, try_, brx, bry, blx, bly, rcTex);

        glw.resetModelView();
        glw.scale(layerScale, layerScale);
        glw.rotateZ(-this.layer.getAngle());
        glw.translate((this.layer.viewLeft + this.layer.viewRight) / -2, (this.layer.viewTop + this.layer.viewBottom) / -2);
        glw.updateModelView();

        this.last_render_tick = this.runtime.tickcount;
    };

    // copy from rex_text_scrolling
    instanceProto.getWebglCtx = function () {
        var inst = this;
        var ctx = inst.myctx;
        if (!ctx) {
            inst.mycanvas = document.createElement("canvas");
            var scaledwidth = Math.ceil(inst.layer.getScale() * inst.width);
            var scaledheight = Math.ceil(inst.layer.getAngle() * inst.height);
            inst.mycanvas.width = scaledwidth;
            inst.mycanvas.height = scaledheight;
            inst.lastwidth = scaledwidth;
            inst.lastheight = scaledheight;
            inst.myctx = inst.mycanvas.getContext("2d");
            ctx = inst.myctx;
        }
        return ctx;
    };

    instanceProto.fakeRender = function () {
        var inst = this;
        var ctx = (this.runtime.enableWebGL) ?
            this.getWebglCtx() : this.runtime.ctx;
        inst.draw(ctx, null, true);
    };

    instanceProto.renderText = function (isRenderNow) {
        if (isRenderNow) {
            this.text_changed = true;
            this.fakeRender();
        }

        this.text_changed = true;
        this.runtime.redraw = true;
    };

    instanceProto.set_text = function (txt) {
        txt = txt.replace(/<\s*br\s*\/>/g, "\n"); // replace "<br />" to "\n"
        if (this.text !== txt) {
            this.text = txt;
            this.renderText(this.isForceRender);
        }
    };

    instanceProto.LockCanvasSize = function (isLocked, width, height) {
        this.isCanvasSizeLocked = isLocked;
        this.lockedCanvasWidth = width;
        this.lockedCanvasHeight = height;
    };

    /**BEGIN-PREVIEWONLY**/
    instanceProto.getDebuggerValues = function (propsections) {
        var font = this.fontstyle + " " + this.ptSize.toString() + "pt " + this.facename;
        propsections.push({
            "title": this.type.name,
            "properties": [{
                "name": "Text",
                "value": this.text
            },
            {
                "name": "Font",
                "value": font
            },
            {
                "name": "Line height",
                "value": this.lineHeightOffset
            },
            {
                "name": "Baseline",
                "value": this.canvasText.textBaseline
            },
            ]
        });
    };

    instanceProto.onDebugValueEdited = function (header, name, value) {
        if (name === "Text")
            this.text = value;
        else if (name === "Font") {
            this.setFont(value);
        } else if (name === "Line height")
            this.lineHeightOffset = value;

        this.text_changed = true;

    };
    /**END-PREVIEWONLY**/

    // export
    instanceProto.getRawText = function (text) {
        return this.canvasText.getRawText(text);
    };
    instanceProto.getSubText = function (start, end, text) {
        return this.canvasText.getSubText(start, end, text);
    };
    instanceProto.copyPensMgr = function (pensMgr) {
        return this.canvasText.copyPensMgr(pensMgr);
    };
    //////////////////////////////////////
    // Conditions
    function Cnds() { };
    pluginProto.cnds = new Cnds();

    Cnds.prototype.CompareText = function (text_to_compare, case_sensitive) {
        if (case_sensitive)
            return this.text == text_to_compare;
        else
            return cr.equals_nocase(this.text, text_to_compare);
    };
    Cnds.prototype.DefineClass = function (name) {
        this.tagInfo = {};

        var current_frame = this.runtime.getCurrentEventStack();
        var current_event = current_frame.current_event;
        var solModifierAfterCnds = current_frame.isModifierAfterCnds();

        if (solModifierAfterCnds)
            this.runtime.pushCopySol(current_event.solModifiers);

        current_event.retrigger();

        if (solModifierAfterCnds)
            this.runtime.popSol(current_event.solModifiers);

        this.defineClass(name, this.tagInfo);
        this.tagInfo = null;
        return false;
    };

    //////////////////////////////////////
    // Actions
    function Acts() { };
    pluginProto.acts = new Acts();


    Acts.prototype.SetText = function (param) {
        if (cr.is_number(param) && param < 1e9)
            param = Math.round(param * 1e10) / 1e10; // round to nearest ten billionth - hides floating point errors

        var text_to_set = param.toString();
        this.set_text(text_to_set);
    };

    Acts.prototype.AppendText = function (param) {
        if (cr.is_number(param))
            param = Math.round(param * 1e10) / 1e10; // round to nearest ten billionth - hides floating point errors

        var text_to_append = param.toString();
        if (text_to_append.length > 0) // not empty
            this.set_text(this.text + text_to_append);
    };

    Acts.prototype.SetFontFace = function (face_, style_) {
        var newstyle = "";

        switch (style_) {
            case 1:
                newstyle = "bold";
                break;
            case 2:
                newstyle = "italic";
                break;
            case 3:
                newstyle = "bold italic";
                break;
        }

        if (this.tagInfo != null) // <class> ... </class>
        {
            this.tagInfo["font-family"] = face_;
            this.tagInfo["font-style"] = newstyle;
            this.renderText(false);
        } else // global
        {

            if (face_ === this.facename && newstyle === this.fontstyle)
                return; // no change

            this.facename = face_;
            this.fontstyle = newstyle;
            this.updateFont();
        }
    };

    Acts.prototype.SetFontSize = function (size_) {
        if (this.tagInfo != null) // <class> ... </class>
        {
            this.tagInfo["font-size"] = size_.toString() + "pt";
            this.renderText(false);
        } else // global
        {
            if (this.ptSize === size_)
                return;

            this.ptSize = size_;
            this.pxHeight = pt2px(this.ptSize);
            this.updateFont();
        }
    };

    Acts.prototype.SetFontColor = function (rgb) {
        var newcolor = getColor(rgb);
        if (this.tagInfo != null) // <class> ... </class>
        {
            this.tagInfo["color"] = newcolor;
            this.renderText(false);
        } else // global
        {
            if (newcolor === this.color)
                return;

            this.color = newcolor;
            this.renderText(this.isForceRender);

        }
    };

    Acts.prototype.SetWebFont = function (familyname_, cssurl_) {
        if (this.runtime.isDomFree) {
            cr.logexport("[Construct 2] TagText plugin: 'Set web font' not supported on this platform - the action has been ignored");
            return; // DC todo
        }

        var self = this;
        var refreshFunc = (function () {
            self.runtime.redraw = true;
            self.text_changed = true;
        });
        var newfacename = "'" + familyname_ + "'";

        // Already requested this web font?
        if (requestedWebFonts.hasOwnProperty(cssurl_)) {

            if (this.tagInfo != null) // <class> ... </class>
            {
                this.tagInfo["font-family"] = newfacename;
                this.renderText(false);
            } else // global
            {

                // Use it immediately without requesting again.  Whichever object
                // made the original request will refresh the canvas when it finishes
                // loading.

                if (this.facename === newfacename)
                    return; // no change

                this.facename = newfacename;
                this.updateFont();

            }

            // There doesn't seem to be a good way to test if the font has loaded,
            // so just fire a refresh every 100ms for the first 1 second, then
            // every 1 second after that up to 10 sec - hopefully will have loaded by then!
            for (var i = 1; i < 10; i++) {
                setTimeout(refreshFunc, i * 100);
                setTimeout(refreshFunc, i * 1000);
            }

            return;
        }

        // Otherwise start loading the web font now
        var wf = document.createElement("link");
        wf.href = cssurl_;
        wf.rel = "stylesheet";
        wf.type = "text/css";
        wf.onload = refreshFunc;

        document.getElementsByTagName('head')[0].appendChild(wf);
        requestedWebFonts[cssurl_] = true;

        if (this.tagInfo != null) // <class> ... </class>
        {
            this.tagInfo["font-family"] = newfacename;
            this.renderText(false);
        } else {
            this.facename = "'" + familyname_ + "'";
            this.updateFont();
        }

        // Another refresh hack
        for (var i = 1; i < 10; i++) {
            setTimeout(refreshFunc, i * 100);
            setTimeout(refreshFunc, i * 1000);
        }

        log("Requesting web font '" + cssurl_ + "'... (tick " + this.runtime.tickcount.toString() + ")");
    };

    Acts.prototype.SetEffect = function (effect) {
        this.compositeOp = cr.effectToCompositeOp(effect);
        cr.setGLBlend(this, effect, this.runtime.gl);

        this.renderText(this.isForceRender);
    };

    Acts.prototype.SetFontStyle = function (style_) {
        var newstyle = "";

        switch (style_) {
            case 1:
                newstyle = "bold";
                break;
            case 2:
                newstyle = "italic";
                break;
            case 3:
                newstyle = "bold italic";
                break;
        }

        if (this.tagInfo != null) // <class> ... </class>
        {
            this.tagInfo["font-style"] = newstyle;
            this.renderText(false);
        } else // global
        {

            if (newstyle === this.fontstyle)
                return; // no change

            this.fontstyle = newstyle;
            this.updateFont();
        }
    };

    Acts.prototype.SetFontFace2 = function (face_) {
        if (this.tagInfo != null) // <class> ... </class>
        {
            this.tagInfo["font-family"] = face_;
            this.renderText(false);
        } else // global
        {

            if (face_ === this.facename)
                return; // no change

            this.facename = face_;
            this.updateFont();
        }
    };

    Acts.prototype.SetLineHeight = function (lineHeightOffset) {
        if (this.lineHeightOffset === lineHeightOffset)
            return;

        this.lineHeightOffset = lineHeightOffset;
        this.renderText(this.isForceRender);
    };

    Acts.prototype.SetHorizontalAlignment = function (align) {
        if (this.halign === align)
            return;

        this.halign = align; // 0=left, 1=center, 2=right
        this.renderText(this.isForceRender);

    };

    Acts.prototype.SetVerticalAlignment = function (align) {
        if (this.valign === align)
            return;

        this.valign = align; // 0=top, 1=center, 2=bottom
        this.renderText(this.isForceRender);

    };

    Acts.prototype.SetWrapping = function (wrapMode) {
        wrapMode = (wrapMode === 0); // 0=word, 1=character
        if (this.wrapbyword === wrapMode)
            return;

        this.wrapbyword = wrapMode;
        this.renderText(this.isForceRender);
    };


    Acts.prototype.SetCustomProperty = function (name_, value_) {
        if (!this.tagInfo)
            return;

        // <class> ... </class>
        this.tagInfo[name_] = value_;
    };

    Acts.prototype.SetShadow = function (offsetX, offsetY, blur_, color_) {
        color_ = color_.replace(/ /g, '');
        if (this.tagInfo != null) // <class> ... </class>
        {
            // 2px 2px 2px #000  
            var shadow = offsetX.toString() + "px " + offsetY.toString() + "px " + blur_.toString() + "px " + color_;
            this.tagInfo["shadow"] = shadow
            this.renderText(false);
        } else // global
        {
            var shadowProp = this.canvasText.defaultProperties["shadow"];
            var valueChanged = false;
            if (shadowProp[0] != color_) {
                shadowProp[0] = color_;
                valueChanged = true;
            }
            if (shadowProp[1] != offsetX) {
                shadowProp[1] = offsetX;
                valueChanged = true;
            }
            if (shadowProp[2] != offsetY) {
                shadowProp[2] = offsetY;
                valueChanged = true;
            }
            if (shadowProp[3] != blur_) {
                shadowProp[3] = blur_;
                valueChanged = true;
            }
            if (valueChanged)
                this.renderText(this.isForceRender);
        }
    };

    Acts.prototype.AddCSSTags = function (css_) {
        // reference - https://github.com/jotform/css.js
        var cssRegex = new RegExp('([\\s\\S]*?){([\\s\\S]*?)}', 'gi');
        var commentsRegex;

        var isRenderNow = false;
        var arr;
        var tagName, comments;
        var props, rules, i, cnt, elems, n, v;
        while (true) {
            arr = cssRegex.exec(css_);
            if (arr === null)
                break;

            // selector
            tagName = arr[1].split('\r\n').join('\n').trim();
            commentsRegex = new RegExp(this.cssCommentsRegex, 'gi');
            comments = commentsRegex.exec(tagName);
            if (comments !== null) {
                tagName = tagName.replace(commentsRegex, '').trim();
            }
            tagName = tagName.replace(/\n+/, "\n");

            // rules
            props = {};
            rules = arr[2].split('\r\n').join('\n').split(';');
            cnt = rules.length;
            for (i = 0; i < cnt; i++) {
                if (rules[i].indexOf(":") === (-1))
                    continue;

                elems = rules[i].trim().split(':');
                n = elems[0].trim().toLowerCase();
                v = elems[1].trim();
                props[n] = v;
            }
            this.defineClass(tagName, props);
            isRenderNow = true;
        }

        if (isRenderNow)
            this.renderText(this.isForceRender);
    };

    Acts.prototype.SetUnderline = function (color_, thickness, offset) {
        color_ = color_.replace(/ /g, '');

        // yellow 1px 0px
        var underline = color_ + " " + thickness.toString() + "px " + offset.toString() + "px";
        if (this.tagInfo != null) // <class> ... </class>
        {

            this.tagInfo["underline"] = underline;
            this.renderText(false);
        }
        //else    // global
        //{
        //    this.renderText(this.isForceRender);
        //}              
    };

    Acts.prototype.SetStroke = function (color_, lineWidth, lineJoin) {
        color_ = color_.replace(/ /g, '');
        lineJoin = lineJoinMode[lineJoin];

        if (this.tagInfo != null) // <class> ... </class>
        {
            // yellow 1px miter
            var stroke = color_ + " " + lineWidth.toString() + "px " + lineJoin;
            this.tagInfo["stroke"] = stroke;
            this.renderText(false);
        } else // global
        {
            var strokeProp = this.canvasText.defaultProperties["stroke"];
            var valueChanged = false;
            if (strokeProp[0] !== color_) {
                strokeProp[0] = color_;
                valueChanged = true;
            }
            if (strokeProp[1] !== lineWidth) {
                strokeProp[1] = lineWidth;
                valueChanged = true;
            }
            if (strokeProp[2] !== lineJoin) {
                strokeProp[2] = lineJoin;
                valueChanged = true;
            }

            if (valueChanged) {
                this.renderText(this.isForceRender);
            }
        }
    };

    Acts.prototype.InsertImage = function (key) {
        if (this.tagInfo != null) // <class> ... </class>
        {
            this.tagInfo["image"] = key;
            this.renderText(false);
        }
        //else    // global
        //{
        //    this.renderText(this.isForceRender);
        //}          
    };

    Acts.prototype.AddImage = function (key, objs, yoffset) {
        if (!objs)
            return;

        window.rexObjs.ImageBank.AddImage(key, objs.getFirstPicked(), yoffset);
        this.renderText(this.isForceRender);
    };

    Acts.prototype.RemoveImage = function (key) {
        window.rexObjs.ImageBank.RemoveImage(key);
        this.renderText(this.isForceRender);
    };

    Acts.prototype.RemoveAll = function () {
        window.rexObjs.ImageBank.RemoveAll();
        this.renderText(this.isForceRender);
    };

    Acts.prototype.SetBackgroundColor = function (rgb) {
        if (rgb === "")
            rgb = "none";

        var color = getColor(rgb);
        if (color === this.canvasText.backgroundColor)
            return;

        this.canvasText.backgroundColor = color;
        this.need_text_redraw = true;
        this.runtime.redraw = true;
    };

    //////////////////////////////////////
    // Expressions
    function Exps() { };
    pluginProto.exps = new Exps();

    Exps.prototype.Text = function (ret, start, end) {
        var txt;
        if ((start == null) && (end == null))
            txt = this.text;
        else
            txt = this.getSubText(start, end);
        ret.set_string(txt);
    };

    Exps.prototype.FaceName = function (ret) {
        ret.set_string(this.facename);
    };

    Exps.prototype.FaceSize = function (ret) {
        ret.set_int(this.ptSize);
    };

    Exps.prototype.TextWidth = function (ret) {
        ret.set_int(this.canvasText.getTextWidth());
    };

    Exps.prototype.TextHeight = function (ret) {
        var totalLinesCount = this.canvasText.getLines().length;
        var textHeight = totalLinesCount * (this.pxHeight + this.lineHeightOffset) - this.lineHeightOffset;

        if (this.baseLineMode === 0) // alphabetic
            textHeight += this.vshift;

        ret.set_float(textHeight);
    };

    Exps.prototype.RawText = function (ret) {
        ret.set_string(this.canvasText.getRawText());
    };

    Exps.prototype.LastClassPropValue = function (ret, name, defaultValue) {
        var val;
        var lastPen = this.canvasText.getLastPen();
        if (lastPen)
            val = lastPen.prop[name];

        if (!val)
            val = defaultValue || 0;

        ret.set_any(val);
    };


    // split text into array
    var __splitTextResult = [];
    var splitText = function (txt, mode) {
        var re = /<\s*class=["|']([^"|']+)["|']\s*\>([\s\S]*?)<\s*\/class\s*\>|<\s*style=["|']([^"|']+)["|']\s*\>([\s\S]*?)<\s*\/style\s*\>/g;
        __splitTextResult.length = 0;
        var arr, m, charIdx = 0,
            totalLen = txt.length,
            matchStart = totalLen;
        var innerMatch;
        while (true) {
            arr = re.exec(txt);
            if (!arr) {
                break;
            }


            m = arr[0];
            matchStart = re["lastIndex"] - m.length;

            if (charIdx < matchStart) {
                __splitTextResult.push(txt.substring(charIdx, matchStart));

            }
            if (mode == null) {
                __splitTextResult.push(m);
            } else if (mode === 1) { // RAWTEXTONLY_MODE
                if (__re_class_header.test(m)) {
                    innerMatch = m.match(__re_class);
                    __splitTextResult.push(innerMatch[2]);
                } else if (__re_style_header.test(m)) {
                    innerMatch = m.match(__re_style);
                    __splitTextResult.push(innerMatch[2]);
                }
            }

            charIdx = re["lastIndex"];
        }


        if (charIdx < totalLen) {
            __splitTextResult.push(txt.substring(charIdx, totalLen));
        }
        return __splitTextResult;
    };


    // text to properties
    var __re_class_header = /<\s*class=/i;
    var __re_class = /<\s*class=["|']([^"|']+)["|']\s*\>([\s\S]*?)<\s*\/class\s*\>/;
    var __re_style_header = /<\s*style=/i;
    var __re_style = /<\s*style=["|']([^"|']+)["|']\s*\>([\s\S]*?)<\s*\/style\s*\>/;
    var __text2PropResult = {
        rawText: "",
        prop: null
    };
    var tagText2Prop = function (txt, prevProp, tags) {
        var retProp = __text2PropResult;
        var rawText, propOut;
        // Check if current fragment is a class tag.
        if (__re_class_header.test(txt)) {
            // Looks the attributes and text inside the class tag.
            var innerMatch = txt.match(__re_class);
            if (innerMatch != null) {
                propOut = transferProp(tags[innerMatch[1]]);
                propOut["class"] = innerMatch[1];
                rawText = innerMatch[2];
            }
        } else if (__re_style_header.test(txt)) {
            // Looks the attributes and text inside the style tag.
            var innerMatch = txt.match(__re_style);
            if (innerMatch != null) {
                // innerMatch[1] contains the properties of the attribute.               
                propOut = transferProp(style2Prop(innerMatch[1]));
                rawText = innerMatch[2];
            }
        }

        if (rawText == null) {
            rawText = txt;
        }

        if (propOut == null) {
            propOut = {};
        }

        retProp.rawText = rawText;
        retProp.prop = propOut;
        return retProp;
    };

    var transferProp = function (propIn, propOut) {
        var propOut = {};

        if (!propIn) {
            return propOut;
        }

        for (var atribute in propIn) {
            switch (atribute) {
                case "font-family":
                    propOut["family"] = propIn[atribute];
                    break;

                case "font-weight":
                    propOut["weight"] = propIn[atribute];
                    break;

                case "font-size":
                    propOut["size"] = propIn[atribute];
                    break;

                case "font-style":
                    propOut["style"] = propIn[atribute];
                    break;


                case "text-shadow":
                    propOut["shadow"] = propIn[atribute];
                    break;

                case "underline":
                    propOut["u"] = propIn[atribute];
                    break;

                case "image":
                    propOut["img"] = propIn[atribute];
                    break;

                default:
                    propOut[atribute] = propIn[atribute];
                    break;
            }
        }

        return propOut;
    };

    var style2Prop = function (s) {
        s = s.split(";");
        var i, cnt = s.length;
        var result = {},
            prop, k, v;
        for (i = 0; i < cnt; i++) {
            prop = s[i].split(":");
            k = prop[0], v = prop[1];
            if (isEmpty(k) || isEmpty(v)) {
                // Wrong property name or value. We jump to the
                // next loop.
                continue;
            }

            result[k] = v;
        }
        return result;
    };
    var isEmpty = function (str) {
        // Remove white spaces.
        str = str.replace(/^\s+|\s+$/, '');
        return str.length == 0;
    };

    var __contextPropResult = {
        stroke: [null, null, null],
        shadow: [null, null, null, null],
        underline: [null, null, null]
    };
    var __nullList = [];
    var prop2ContextProp = function (defaultContextProp, prop, noRawText) {
        var retProp = __contextPropResult;

        if (prop["img"] == null) {
            // text mode
            retProp.img = null;
            if (noRawText) {
                return retProp;
            }

            if (prop["font"] != null) {
                retProp.font = prop["font"];
            } else {
                retProp.family = (prop["family"] != null) ? prop["family"] : defaultContextProp["family"];
                retProp.weight = (prop["weight"] != null) ? prop["weight"] : defaultContextProp["weight"];
                retProp.ptSize = (prop["size"] != null) ? prop["size"] : defaultContextProp["ptSize"];
                retProp.style = (prop["style"] != null) ? prop["style"] : defaultContextProp["style"];
                retProp.font = null;
            }
            retProp.color = (prop["color"] != null) ? prop["color"] : defaultContextProp["color"];

            var stroke;
            if (prop["stroke"] != null) {
                // yellow 1px miter
                stroke = prop["stroke"].split(" ");
            } else {
                stroke = __nullList;
            }

            var defaultStroke = defaultContextProp["stroke"]; // [color, lineWidth, lineJoin]   
            retProp.stroke[0] = (stroke[0] != null) ? stroke[0] : defaultStroke[0];
            retProp.stroke[1] = (stroke[1] != null) ? parseFloat(stroke[1].replace("px", "")) : defaultStroke[1];
            retProp.stroke[2] = (stroke[2] != null) ? stroke[2] : defaultStroke[2];
        } else {
            retProp.img = prop["img"];
        }


        var shadow;
        if (prop["shadow"] != null) {
            // 2px 2px 2px #000
            shadow = prop["shadow"].split(" ");
        } else {
            shadow = __nullList;
        }

        var defaultShadow = defaultContextProp["shadow"]; // [color, offsetx, offsety, blur]    
        retProp.shadow[0] = (shadow[3] != null) ? shadow[3] : defaultShadow[0];
        if (retProp.shadow[0] != null) {
            retProp.shadow[1] = (shadow[0] != null) ? parseFloat(shadow[0].replace("px", "")) : defaultShadow[1];
            retProp.shadow[2] = (shadow[1] != null) ? parseFloat(shadow[1].replace("px", "")) : defaultShadow[2];
            retProp.shadow[3] = (shadow[2] != null) ? parseFloat(shadow[2].replace("px", "")) : defaultShadow[3];
        }

        var underline;
        if (prop["u"] != null) {
            // yellow 1px 0px     
            underline = prop["u"].split(" ");
        } else {
            underline = __nullList;
        }

        var defaultUnderline = defaultContextProp["underline"]; // [color, thickness, offset]
        retProp.underline[0] = (underline[0] != null) ? underline[0] : defaultUnderline[0];
        retProp.underline[1] = (underline[1] != null) ? parseFloat(underline[1].replace("px", "")) : defaultUnderline[1];
        retProp.underline[2] = (underline[2] != null) ? parseFloat(underline[2].replace("px", "")) : defaultUnderline[2];
        return retProp;
    };

    // properties to text string
    var __propList = [];
    var prop2TagText = function (txt, prop, prevProp) {
        if (prop["class"]) // class mode
            txt = "<class='" + prop["class"] + "'>" + txt + "</class>";
        else // style mode
        {
            __propList.length = 0;
            for (var k in prop) {
                __propList.push(k + ":" + prop[k]);
            }

            if (__propList.length > 0)
                txt = "<style='" + __propList.join(";") + "'>" + txt + "</style>";
        }
        return txt;
    };
}());