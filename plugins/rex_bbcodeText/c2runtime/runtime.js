// ECMAScript 5 strict mode
"use strict";

assert2(cr, "cr namespace not created");
assert2(cr.plugins_, "cr.plugins_ not created");

/////////////////////////////////////
// Plugin class
cr.plugins_.rex_bbcodeText = function (runtime) {
    this.runtime = runtime;
};

(function () {
    var pluginProto = cr.plugins_.rex_bbcodeText.prototype;

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

    typeProto.onCreate = function () {};

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

        this.textShadow = "";

        this.lastwidth = this.width;
        this.lastwrapwidth = this.width;
        this.lastheight = this.height;

        this.baseLineMode = this.properties[12];
        this.vshift = this.properties[13] * this.runtime.devicePixelRatio;
        this.isForceRender = (this.properties[14] === 1);
        this.LockCanvasSize(this.properties[15], this.width, this.height);

        // For WebGL rendering
        this.mycanvas = null;
        this.myctx = null;
        this.mytex = null;
        this.need_text_redraw = false;
        this.last_render_tick = this.runtime.tickcount;

        if (this.recycled)
            this.rcTex.set(0, 0, 1, 1);
        else
            this.rcTex = new cr.rect(0, 0, 1, 1);

        // In WebGL renderer tick this text object to release memory if not rendered any more
        if (this.runtime.glwrap)
            this.runtime.tickMe(this);

        assert2(this.pxHeight, "Could not determine font text height");

        if (!this.recycled) {
            this.canvasText = new window.rexObjs.CanvasTextKlass();
            this.canvasText.imageBank = window.rexObjs.ImageBank;
            this.canvasText.splitTextFn = splitText;
            this.canvasText.tagText2PropFn =

                this.canvasText.prop2TagTextFn = prop2TagText;
        }
        this.canvasText.Reset(this);
        this.canvasText.textBaseline = (this.baseLineMode === 0) ? "alphabetic" : "top";
        this.canvasText.stroke.lineWidth = this.properties[16];
        this.canvasText.stroke.lineJoin = lineJoinMode[this.properties[17]];
        this.canvasText.underline.thickness = this.properties[18];
        this.canvasText.underline.offset = this.properties[19];
        this.setShadow(this.properties[20], this.properties[21], this.properties[22], this.properties[23]);

        this.canvasText.backgroundColor = this.properties[24];

        // render text at object initialize
        if (this.text)
            this.renderText(this.isForceRender);
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

    instanceProto.setFont = function () {
        var arr = this.font.split(" ");

        var i;
        for (i = 0; i < arr.length; i++) {
            // Ends with 'pt'
            if (arr[i].substr(arr[i].length - 2, 2) === "pt") {
                this.ptSize = parseInt(arr[i].substr(0, arr[i].length - 2));
                this.pxHeight = Math.ceil((this.ptSize / 72.0) * 96.0) + 4; // assume 96dpi...

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
            "t": this.text,
            "f": this.font,
            "c": this.color,
            "ha": this.halign,
            "va": this.valign,
            "wr": this.wrapbyword,
            "lho": this.line_height_offset,
            "vs": this.vshift,
            "fn": this.facename,
            "fs": this.fontstyle,
            "ps": this.ptSize,
            "pxh": this.pxHeight,
            "ts": this.textShadow,
            "lrt": this.last_render_tick,
            "bl": this.canvasText.textBaseline,
            "txtObj": this.canvasText.saveToJSON(),
            "isLcs": this.isCanvasSizeLocked,
            "lcw": this.lockedCanvasWidth,
            "lch": this.lockedCanvasHeight
        };
    };

    instanceProto.loadFromJSON = function (o) {
        this.text = o["t"];
        this.font = o["f"];
        this.color = o["c"];
        this.halign = o["ha"];
        this.valign = o["va"];
        this.wrapbyword = o["wr"];
        this.line_height_offset = o["lho"];
        this.vshift = o["vs"];
        this.facename = o["fn"];
        this.fontstyle = o["fs"];
        this.ptSize = o["ps"];
        this.pxHeight = o["pxh"];
        this.textShadow = o["ts"];
        this.last_render_tick = o["lrt"];

        this.text_changed = true;
        this.lastwidth = this.width;
        this.lastwrapwidth = this.width;
        this.lastheight = this.height;

        this.canvasText.textBaseline = o["bl"];
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
        this.font = this.fontstyle + " " + this.ptSize.toString() + "pt " + this.facename;
        this.renderText(this.isForceRender);
    };

    instanceProto.draw = function (ctx, glmode, is_ignore) {
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
        lineHeight += (this.line_height_offset * this.runtime.devicePixelRatio);

        // configure
        this.canvasText.canvas = ctx.canvas;
        this.canvasText.context = ctx;
        // default setting
        this.canvasText.defaultProperties.family = this.facename;
        // this.canvasText.defaultProperties.weight = ??
        this.canvasText.defaultProperties.ptSize = this.ptSize.toString() + "pt";
        this.canvasText.defaultProperties.style = this.fontstyle;
        this.canvasText.defaultProperties.color = this.color;
        this.canvasText.defaultProperties.shadow = this.textShadow;
        this.canvasText.lineHeight = lineHeight;

        this.canvasText.textInfo.text = this.text;
        this.canvasText.textInfo.x = penX;
        this.canvasText.textInfo.y = penY;
        this.canvasText.textInfo.boxWidth = width;
        this.canvasText.textInfo.boxHeight = height;
        this.canvasText.textInfo.ignore = is_ignore;
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
        var layer_angle = this.layer.getAngle();
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

        if (this.runtime.pixel_rounding || (this.angle === 0 && layer_angle === 0)) {
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

        if (this.angle === 0 && layer_angle === 0) {
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

    instanceProto.renderText = function (is_render_now) {
        if (is_render_now) {
            this.text_changed = true;
            this.fakeRender();
        }

        this.text_changed = true;
        this.runtime.redraw = true;
    };

    instanceProto.set_text = function (txt) {
        if (this.text !== txt) {
            this.text = txt;
            this.renderText(this.isForceRender);
        }
    };

    instanceProto.setShadow = function (offsetX, offsetY, blur_, color_) {
        color_ = color_.replace(/ /g, '');

        // 2px 2px 2px #000        
        var shadow = offsetX.toString() + "px " + offsetY.toString() + "px " + blur_.toString() + "px " + color_;

        this.textShadow = shadow;
    };

    instanceProto.LockCanvasSize = function (isLocked, width, height) {
        this.isCanvasSizeLocked = isLocked;
        this.lockedCanvasWidth = width;
        this.lockedCanvasHeight = height;
    };

    var copy_dict = function (in_obj, out_obj, is_merge) {
        if (out_obj == null)
            out_obj = {};

        if (!is_merge) {
            for (var k in out_obj) {
                if (!in_obj.hasOwnProperty(k))
                    delete out_obj[k];
            }
        }

        for (var k in in_obj)
            out_obj[k] = in_obj[k];

        return out_obj;
    };

    /**BEGIN-PREVIEWONLY**/
    instanceProto.getDebuggerValues = function (propsections) {
        propsections.push({
            "title": this.type.name,
            "properties": [{
                    "name": "Text",
                    "value": this.text
                },
                {
                    "name": "Font",
                    "value": this.font
                },
                {
                    "name": "Line height",
                    "value": this.line_height_offset
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
            this.font = value;
            this.setFont();
        } else if (name === "Line height")
            this.line_height_offset = value;

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

    // internal    
    var __splitTextResult = [];
    var splitText = function (txt, mode) {
        var re = /\[b\]|\[\/b\]|\[i\]|\[\/i\]|\[size=(\d+)\]|\[\/size\]|\[color=([a-z]+|#[0-9abcdef]+)\]|\[\/color\]|\[u\]|\[u=([a-z]+|#[0-9abcdef]+)\]|\[\/u\]|\[shadow\]|\[\/shadow\]|\[stroke=([a-z]+|#[0-9abcdef]+)\]|\[\/stroke\]|\[img=([^\]]+)\]|\[\/img\]/ig;
        __splitTextResult.length = 0;
        var arr, m, charIdx = 0,
            totalLen = txt.length,
            matchStart = totalLen;
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

            if (mode == null)
                __splitTextResult.push(m);

            charIdx = re["lastIndex"];
        }


        if (charIdx < totalLen) {
            __splitTextResult.push(txt.substring(charIdx, totalLen));
        }
        return __splitTextResult;
    };



    var __re_bold_open = /\[b\]/i;
    var __re_bold_close = /\[\/b\]/i;
    var __re_italics_open = /\[i\]/i;
    var __re_italics_close = /\[\/i\]/i;
    var __re_size_open = /\[size=(\d+)\]/i;
    var __re_size_close = /\[\/size\]/i;
    var __re_color_open = /\[color=([a-z]+|#[0-9abcdef]+)\]/i;
    var __re_color_close = /\[\/color\]/i;
    var __re_underline_open = /\[u\]/i;
    var __re_underline_openC = /\[u=([a-z]+|#[0-9abcdef]+)\]/i;
    var __re_underline_close = /\[\/u\]/i;
    var __re_shadow_open = /\[shadow\]/i;
    var __re_shadow_close = /\[\/shadow\]/i;
    var __re_stroke_open = /\[stroke=([a-z]+|#[0-9abcdef]+)\]/i;
    var __re_stroke_close = /\[\/stroke\]/i;
    var __re_image_open = /\[img=([^\]]+)\]/i;
    var __re_image_close = /\[\/img\]/i;
    var __curr_propScope = {};
    var PROP_REMOVE = false;
    var PROP_ADD = true;
    var __text2PropResult = {
        rawText: "",
        prop: null
    };
    var tagText2Prop = function (txt, previousProp, tags) {
        var rawText, propOut;
        // Check if current fragment is a class tag.
        if (__re_bold_open.test(m)) {
            updatePropScope(previousProp, PROP_ADD, "b", true);
            continue;
        } else if (__re_bold_close.test(m)) {
            updatePropScope(previousProp, PROP_REMOVE, "b");
            continue;
        } else if (__re_italics_open.test(m)) {
            updatePropScope(previousProp, PROP_ADD, "i", true);
            continue;
        } else if (__re_italics_close.test(m)) {
            updatePropScope(previousProp, PROP_REMOVE, "i");
            continue;
        } else if (__re_size_open.test(m)) {
            innerMatch = m.match(__re_size_open);
            updatePropScope(previousProp, PROP_ADD, "size", innerMatch[1] + "pt");
            continue;
        } else if (__re_size_close.test(m)) {
            updatePropScope(previousProp, PROP_REMOVE, "size");
            continue;
        } else if (__re_color_open.test(m)) {
            innerMatch = m.match(__re_color_open);
            updatePropScope(previousProp, PROP_ADD, "color", innerMatch[1]);
            continue;
        } else if (__re_color_close.test(m)) {
            updatePropScope(previousProp, PROP_REMOVE, "color");
            continue;
        } else if (__re_underline_open.test(m)) {
            innerMatch = m.match(__re_underline_open);
            updatePropScope(previousProp, PROP_ADD, "u", true);
            continue;
        } else if (__re_underline_openC.test(m)) {
            innerMatch = m.match(__re_underline_openC);
            updatePropScope(previousProp, PROP_ADD, "u", innerMatch[1]);
            continue;
        } else if (__re_underline_close.test(m)) {
            updatePropScope(previousProp, PROP_REMOVE, "u");
            continue;
        } else if (__re_shadow_open.test(m)) {
            updatePropScope(previousProp, PROP_ADD, "shadow", true);
            continue;
        } else if (__re_shadow_close.test(m)) {
            updatePropScope(previousProp, PROP_REMOVE, "shadow");
            continue;
        } else if (__re_stroke_open.test(m)) {
            innerMatch = m.match(__re_stroke_open);
            updatePropScope(previousProp, PROP_ADD, "stroke", innerMatch[1]);
            continue;
        } else if (__re_stroke_close.test(m)) {
            updatePropScope(previousProp, PROP_REMOVE, "stroke");
            continue;
        }

        if (rawText == null) {
            rawText = txt;
        }

        if (propOut == null) {
            propOut = {};
        }

        __text2PropResult.rawText = rawText;
        __text2PropResult.prop = propOut;
        return __text2PropResult;
    };

    var updatePropScope = function (propScope, op, prop, value) {
        if (op === PROP_ADD)
            propScope[prop] = value;
        else
            remove_prop(propScope, prop);

        return propScope;
    };

    // properties to text string
    var __emptyProp = {};
    var prop2TagText = function (txt, prop, previousProp) {
        if (previousProp == null)
            previousProp = __emptyProp;

        for (var k in previousProp) {
            if (prop.hasOwnProperty(k))
                continue;

            txt = "[/" + k + "]" + txt;
        }

        var header = "";
        for (var k in prop) {
            if (previousProp[k] === prop[k])
                continue;

            if (k === "size")
                header += ("[size=" + prop[k].replace("pt", "") + "]");
            else if ((k === "color") || (k === "stroke") || (k === "img"))
                header += ("[" + k + "=" + prop[k] + "]");

            else if (k === "u") {
                if (prop[k] === true)
                    header += "[u]";
                else
                    header += ("[u=" + prop[k] + "]");
            } else
                header += ("[" + k + "]");
        }
        txt = header + txt;

        return txt;
    };
    //////////////////////////////////////
    // Conditions
    function Cnds() {};
    pluginProto.cnds = new Cnds();

    Cnds.prototype.CompareText = function (text_to_compare, case_sensitive) {
        if (case_sensitive)
            return this.text == text_to_compare;
        else
            return cr.equals_nocase(this.text, text_to_compare);
    };

    //////////////////////////////////////
    // Actions
    function Acts() {};
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

        if (face_ === this.facename && newstyle === this.fontstyle)
            return; // no change

        this.facename = face_;
        this.fontstyle = newstyle;
        this.updateFont();
    };

    Acts.prototype.SetFontSize = function (size_) {
        if (this.ptSize === size_)
            return;

        this.ptSize = size_;
        this.pxHeight = Math.ceil((this.ptSize / 72.0) * 96.0) + 4; // assume 96dpi...
        this.updateFont();
    };

    Acts.prototype.SetFontColor = function (rgb) {
        var newcolor;
        if (typeof (rgb) == "number")
            newcolor = "rgb(" + cr.GetRValue(rgb).toString() + "," + cr.GetGValue(rgb).toString() + "," + cr.GetBValue(rgb).toString() + ")";
        else
            newcolor = rgb;

        if (newcolor === this.color)
            return;

        this.color = newcolor;
        this.renderText(this.isForceRender);
    };

    Acts.prototype.SetWebFont = function (familyname_, cssurl_) {
        if (this.runtime.isDomFree) {
            cr.logexport("[Construct 2] Text plugin: 'Set web font' not supported on this platform - the action has been ignored");
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
            // Use it immediately without requesting again.  Whichever object
            // made the original request will refresh the canvas when it finishes
            // loading.

            if (this.facename === newfacename)
                return; // no change

            this.facename = newfacename;
            this.updateFont();

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

        this.facename = "'" + familyname_ + "'";
        this.updateFont();

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

        if (newstyle === this.fontstyle)
            return; // no change

        this.fontstyle = newstyle;
        this.updateFont();
    };

    Acts.prototype.SetFontFace2 = function (face_) {
        if (face_ === this.facename)
            return; // no change

        this.facename = face_;
        this.updateFont();
    };

    Acts.prototype.SetLineHeight = function (line_height_offset) {
        if (this.line_height_offset === line_height_offset)
            return;

        this.line_height_offset = line_height_offset;
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

    Acts.prototype.SetWrapping = function (wrap_mode) {
        wrap_mode = (wrap_mode === 0); // 0=word, 1=character
        if (this.wrapbyword === wrap_mode)
            return;

        this.wrapbyword = wrap_mode;
        this.renderText(this.isForceRender);
    };

    Acts.prototype.SetShadow = function (offsetX, offsetY, blur_, color_) {
        this.setShadow(offsetX, offsetY, blur_, color_);
        this.renderText(this.isForceRender);
    };

    Acts.prototype.SetThickness = function (w) {
        if (w === this.canvasText.underline.thickness)
            return;

        this.canvasText.underline.thickness = w;
        this.need_text_redraw = true;
        this.runtime.redraw = true;
    };
    Acts.prototype.SetOffsetY = function (offset) {
        if (offset === this.canvasText.underline.offset)
            return;

        this.canvasText.underline.offset = offset;
        this.need_text_redraw = true;
        this.runtime.redraw = true;
    };

    Acts.prototype.SetStrokeLineWidth = function (w) {
        if (w === this.canvasText.stroke.lineWidth)
            return;

        this.canvasText.stroke.lineWidth = w;
        this.need_text_redraw = true;
        this.runtime.redraw = true;
    };

    Acts.prototype.SetStrokeLineJoin = function (m) {
        m = lineJoinMode[m];
        if (m === this.canvasText.stroke.lineJoin)
            return;

        this.canvasText.stroke.lineJoin = m;
        this.need_text_redraw = true;
        this.runtime.redraw = true;
    };

    Acts.prototype.SetBackgroundColor = function (color) {
        if (color === this.canvasText.backgroundColor)
            return;

        this.canvasText.backgroundColor = color;
        this.need_text_redraw = true;
        this.runtime.redraw = true;
    };

    Acts.prototype.LockCanvasSize = function (width, height) {
        this.LockCanvasSize(true, width, height);
    };
    Acts.prototype.UnLockCanvasSize = function () {
        this.LockCanvasSize(false);
    };

    Acts.prototype.AddImage = function (key, objs, yoffset) {
        if (!objs)
            return;

        window.RexImageBank.AddImage(key, objs.getFirstPicked(), yoffset);
        this.renderText(this.isForceRender);
    };

    Acts.prototype.RemoveImage = function (key) {
        window.RexImageBank.RemoveImage(key);
        this.renderText(this.isForceRender);
    };

    Acts.prototype.RemoveAll = function () {
        window.RexImageBank.RemoveAll();
        this.renderText(this.isForceRender);
    };

    //////////////////////////////////////
    // Expressions
    function Exps() {};
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
        var total_line_count = this.canvasText.getLines().length;
        var text_height = total_line_count * (this.pxHeight + this.line_height_offset) - this.line_height_offset;

        if (this.baseLineMode === 0) // alphabetic
            text_height += this.vshift;

        ret.set_float(text_height);
    };

    Exps.prototype.RawText = function (ret) {
        ret.set_string(this.canvasText.getRawText());
    };

    Exps.prototype.LastClassPropValue = function (ret, name, default_value) {
        var val;
        var last_pen = this.canvasText.getLastPen();
        if (last_pen)
            val = last_pen.prop[name];

        if (!val)
            val = default_value || 0;

        ret.set_any(val);
    };



    CanvasTextProto.updatePens = function (pensMgr, textInfo, ignore_wrap) {
        if (textInfo == null)
            textInfo = this.textInfo;

        pensMgr.freePens();

        // Save the textInfo into separated vars to work more comfortably.
        var text = textInfo["text"],
            boxWidth = textInfo["boxWidth"],
            boxHeight = textInfo["boxHeight"];
        if (text === "")
            return;

        //var start_x = textInfo["x"], start_y = textInfo["y"];  
        // textInfo["x"], textInfo["y"] had been moved to drawPens

        var start_x = 0,
            start_y = 0;
        var cursor_x = start_x,
            cursor_y = start_y;
        var proText;


        // The main regex. Looks for <style>, <class> tags.
        var m, match = splitText(text);
        if (match.length === 0)
            return;
        var i, match_cnt = match.length;
        var innerMatch = null;

        for (i = 0; i < match_cnt; i++) {

            m = match[i];
            // Check if current fragment is a class tag.
            if (__re_bold_open.test(m)) {
                updatePropScope(__curr_propScope, PROP_ADD, "b", true);
                continue;
            } else if (__re_bold_close.test(m)) {
                updatePropScope(__curr_propScope, PROP_REMOVE, "b");
                continue;
            } else if (__re_italics_open.test(m)) {
                updatePropScope(__curr_propScope, PROP_ADD, "i", true);
                continue;
            } else if (__re_italics_close.test(m)) {
                updatePropScope(__curr_propScope, PROP_REMOVE, "i");
                continue;
            } else if (__re_size_open.test(m)) {
                innerMatch = m.match(__re_size_open);
                updatePropScope(__curr_propScope, PROP_ADD, "size", innerMatch[1] + "pt");
                continue;
            } else if (__re_size_close.test(m)) {
                updatePropScope(__curr_propScope, PROP_REMOVE, "size");
                continue;
            } else if (__re_color_open.test(m)) {
                innerMatch = m.match(__re_color_open);
                updatePropScope(__curr_propScope, PROP_ADD, "color", innerMatch[1]);
                continue;
            } else if (__re_color_close.test(m)) {
                updatePropScope(__curr_propScope, PROP_REMOVE, "color");
                continue;
            } else if (__re_underline_open.test(m)) {
                innerMatch = m.match(__re_underline_open);
                updatePropScope(__curr_propScope, PROP_ADD, "u", true);
                continue;
            } else if (__re_underline_openC.test(m)) {
                innerMatch = m.match(__re_underline_openC);
                updatePropScope(__curr_propScope, PROP_ADD, "u", innerMatch[1]);
                continue;
            } else if (__re_underline_close.test(m)) {
                updatePropScope(__curr_propScope, PROP_REMOVE, "u");
                continue;
            } else if (__re_shadow_open.test(m)) {
                updatePropScope(__curr_propScope, PROP_ADD, "shadow", true);
                continue;
            } else if (__re_shadow_close.test(m)) {
                updatePropScope(__curr_propScope, PROP_REMOVE, "shadow");
                continue;
            } else if (__re_stroke_open.test(m)) {
                innerMatch = m.match(__re_stroke_open);
                updatePropScope(__curr_propScope, PROP_ADD, "stroke", innerMatch[1]);
                continue;
            } else if (__re_stroke_close.test(m)) {
                updatePropScope(__curr_propScope, PROP_REMOVE, "stroke");
                continue;
            }

            // add image pen            
            else if (__re_image_open.test(m)) {
                innerMatch = m.match(__re_image_open);

                var key = innerMatch[1];
                var img = window.RexImageBank.GetImage(key);
                if (!img)
                    continue;

                updatePropScope(__curr_propScope, PROP_ADD, "img", key);

                if (!ignore_wrap) {
                    if (img.width > boxWidth - (cursor_x - start_x)) {
                        cursor_x = start_x;
                        cursor_y += this.lineHeight;
                    }
                    pensMgr.addPen(null, // text
                        cursor_x, // x
                        cursor_y, // y
                        img.width, // width
                        __curr_propScope, // prop
                        0 // new_line_mode
                    );

                    cursor_x += img.width;
                } else {
                    pensMgr.addPen(null, // text
                        null, // x
                        null, // y
                        null, // width
                        __curr_propScope, // prop
                        0 // new_line_mode
                    );
                }

                updatePropScope(__curr_propScope, PROP_REMOVE, "img");
                continue;
            } else if (__re_image_close.test(m)) {
                updatePropScope(__curr_propScope, PROP_REMOVE, "img");
                continue;
            }

            // add text pen
            else {
                proText = m;

                if (!ignore_wrap) {
                    // Save the current context.
                    this.context.save();

                    this.apply_propScope(__curr_propScope);

                    var wrap_lines = wordWrap(proText, this.context, boxWidth, this.plugin.wrapbyword, cursor_x - start_x);

                    // add pens
                    var lcnt = wrap_lines.length,
                        n, wrap_line;
                    for (n = 0; n < lcnt; n++) {
                        wrap_line = wrap_lines[n];
                        pensMgr.addPen(wrap_line.text, // text
                            cursor_x, // x
                            cursor_y, // y
                            wrap_line.width, // width
                            __curr_propScope, // prop
                            wrap_line.newLineMode // new_line_mode
                        );

                        if (wrap_line.newLineMode !== NO_NEWLINE) {
                            cursor_x = start_x;
                            cursor_y += this.lineHeight;
                        } else {
                            cursor_x += wrap_line.width;
                        }

                    }

                    this.context.restore();
                } else {
                    pensMgr.addPen(proText, // text
                        null, // x
                        null, // y
                        null, // width
                        __curr_propScope, // prop
                        0 // new_line_mode
                    );
                    // new line had been included in raw text
                }
                continue;
            }
        } // for (i = 0; i < match_cnt; i++) 


        // clean __curr_propScope
        for (var k in __curr_propScope)
            delete __curr_propScope[k];
    };

    var remove_prop = function (propScope, prop) {
        if (propScope.hasOwnProperty(prop))
            delete propScope[prop];
    };

}());