(function () {
    if (!window.rexObjs)
        window.rexObjs = {};

    if (window.rexObjs.StackKlass)
        return;

    var StackKlass = function (itemCb) {
        this.items = [];
        this.ptr = -1;
        this.itemCb = itemCb;
    };
    var StackKlassProto = StackKlass.prototype;

    StackKlassProto.getCurrent = function () {
        if (this.ptr < 0)
            return null;

        return this.items[this.ptr];
    };

    StackKlassProto.getOneAbove = function () {
        if (this.items.length == 0)
            return null;

        var i = this.ptr + 1;

        if (i >= this.items.length)
            i = this.items.length - 1;

        return this.items[i];
    };

    // push then set
    StackKlassProto.push = function () {
        this.ptr++;

        if (this.ptr === this.items.length) {
            this.items.push(new this.itemCb());
        }

        return this.items[this.ptr];
    };

    // get then pop
    StackKlassProto.pop = function () {
        assert2(this.ptr >= 0, "Popping empty stack");

        this.ptr--;
    };

    window.rexObjs.StackKlass = StackKlass;
    
}());     