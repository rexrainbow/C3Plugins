(function ()
{
    if (!window.rexObjs)
        window.rexObjs = {};
    
    if (window.rexObjs.ImageBank)
        return;

    var ImageBankKlass = function () {
        this.images = {};
    }
    var ImageBankKlassProto = ImageBankKlass.prototype;

    ImageBankKlassProto.AddImage = function (name, inst, yoffset_) {
        var img = getImage(inst);
        if (!inst)
            return;

        this.images[name] = {
            img: img,
            width: inst.width,
            height: inst.height,
            yoffset: yoffset_
        };
    };
    ImageBankKlassProto.GetImage = function (name, inst) {
        return this.images[name];
    };
    ImageBankKlassProto.RemoveImage = function (name) {
        if (this.images.hasOwnProperty(name))
            delete this.images[name];
    };
    ImageBankKlassProto.RemoveAll = function () {
        for (var n in this.images)
            delete this.images[n];
    };

    var getImage = function (inst) {
        if (!inst)
            return null;

        var img;
        if (inst.canvas)
            img = inst.canvas;
        else if (inst.curFrame && inst.curFrame.texture_img)
            img = inst.curFrame.texture_img;
        else
            img = null;

        return img;
    };

    window.rexObjs.ImageBankKlass = ImageBankKlass;
    window.rexObjs.ImageBank = new ImageBankKlass();       
}());   