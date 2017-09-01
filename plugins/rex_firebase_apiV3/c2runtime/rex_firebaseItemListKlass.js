(function () {
    if (!window.rexObjs)
        window.rexObjs = {};
    
    if (!window.rexObjs.FirebaseObj)
        window.rexObjs.FirebaseObj = {};

    window.rexObjs.FirebaseObj.ItemListKlass = function () {
        // -----------------------------------------------------------------------
        // export: overwrite these values
        this.updateMode = 1;                  // AUTOCHILDUPDATE
        this.keyItemID = "__itemID__";

        // custom snapshot2Item function
        this.snapshot2Item = null;

        // auto child update, to get one item
        this.onItemAdd = null;
        this.onItemRemove = null;
        this.onItemChange = null;

        // manual update or
        // auto all update, to get all items
        this.onItemsFetch = null;

        // used in ForEachItem
        this.onGetIterItem = null;

        this.extra = {};
        // export: overwrite these values
        // -----------------------------------------------------------------------        

        // -----------------------------------------------------------------------        
        // internal
        this.query = null;
        this.items = [];
        this.itemID2Index = {};

        // saved callbacks
        this.onAddChildCb = null;
        this.onRemoveChildCb = null;
        this.onChangeChildCb = null;
        this.onItemsFetchCb = null;
        // internal       
        // -----------------------------------------------------------------------        
    };

    var ItemListKlassProto = window.rexObjs.FirebaseObj.ItemListKlass.prototype;

    ItemListKlassProto.MANUALUPDATE = 0;
    ItemListKlassProto.AUTOCHILDUPDATE = 1;
    ItemListKlassProto.AUTOALLUPDATE = 2;

    // --------------------------------------------------------------------------
    // export
    ItemListKlassProto.GetItems = function () {
        return this.items;
    };

    ItemListKlassProto.GetItemIndexByID = function (itemID) {
        return this.itemID2Index[itemID];
    };

    ItemListKlassProto.GetItemByID = function (itemID) {
        var i = this.GetItemIndexByID(itemID);
        if (i == null)
            return null;

        return this.items[i];
    };

    ItemListKlassProto.Clean = function () {
        this.items.length = 0;
        cleanTable(this.itemID2Index);
    };

    ItemListKlassProto.StartUpdate = function (query) {
        this.StopUpdate();
        this.Clean();

        if (this.updateMode === this.MANUALUPDATE)
            this.manualUpdate(query);
        else if (this.updateMode === this.AUTOCHILDUPDATE)
            this.startUpdateChild(query);
        else if (this.updateMode === this.AUTOALLUPDATE)
            this.startUpdateAll(query);
    };

    ItemListKlassProto.StopUpdate = function () {
        if (this.updateMode === this.AUTOCHILDUPDATE)
            this.stopUpdateChild();
        else if (this.updateMode === this.AUTOALLUPDATE)
            this.stopUpdateAll();
    };

    ItemListKlassProto.ForEachItem = function (runtime, start, end) {
        if ((start == null) || (start < 0))
            start = 0;
        if ((end == null) || (end > this.items.length - 1))
            end = this.items.length - 1;

        var current_frame = runtime.getCurrentEventStack();
        var current_event = current_frame.current_event;
        var solModifierAfterCnds = current_frame.isModifierAfterCnds();

        var i;
        for (i = start; i <= end; i++) {
            if (solModifierAfterCnds) {
                runtime.pushCopySol(current_event.solModifiers);
            }

            if (this.onGetIterItem)
                this.onGetIterItem(this.items[i], i);
            current_event.retrigger();

            if (solModifierAfterCnds) {
                runtime.popSol(current_event.solModifiers);
            }
        }

        return false;
    };
    // export
    // --------------------------------------------------------------------------    

    // --------------------------------------------------------------------------
    // internal   
    ItemListKlassProto.addItem = function (snapshot, prevName, force_push) {
        var item;
        if (this.snapshot2Item)
            item = this.snapshot2Item(snapshot);
        else {
            var k = snapshot["key"];
            item = snapshot["val"]();
            item[this.keyItemID] = k;
        }

        if (force_push === true) {
            this.items.push(item);
            return;
        }

        if (prevName == null) {
            this.items.unshift(item);
        }
        else {
            var i = this.itemID2Index[prevName];
            if (i == this.items.length - 1)
                this.items.push(item);
            else
                this.items.splice(i + 1, 0, item);
        }

        return item;
    };

    ItemListKlassProto.removeItem = function (snapshot) {
        var k = snapshot["key"];
        var i = this.itemID2Index[k];
        var item = this.items[i];
        cr.arrayRemove(this.items, i);
        return item;
    };

    ItemListKlassProto.updateItemID2Index = function () {
        cleanTable(this.itemID2Index);
        var i, cnt = this.items.length;
        for (i = 0; i < cnt; i++) {
            this.itemID2Index[this.items[i][this.keyItemID]] = i;
        }
    };

    ItemListKlassProto.manualUpdate = function (query) {
        var self = this;
        var onReadItem = function (childSnapshot) {
            self.addItem(childSnapshot, null, true);
        };
        var handler = function (snapshot) {
            snapshot["forEach"](onReadItem);
            self.updateItemID2Index();
            if (self.onItemsFetch)
                self.onItemsFetch(self.items)
        };

        query["once"]("value", handler);
    };

    ItemListKlassProto.startUpdateChild = function (query) {
        var self = this;
        var onAddChildCb = function (newSnapshot, prevName) {
            var item = self.addItem(newSnapshot, prevName);
            self.updateItemID2Index();
            if (self.onItemAdd)
                self.onItemAdd(item);
        };
        var onRemoveChildCb = function (snapshot) {
            var item = self.removeItem(snapshot);
            self.updateItemID2Index();
            if (self.onItemRemove)
                self.onItemRemove(item);
        };
        var onChangeChildCb = function (snapshot, prevName) {
            var item = self.removeItem(snapshot);
            self.updateItemID2Index();
            self.addItem(snapshot, prevName);
            self.updateItemID2Index();
            if (self.onItemChange)
                self.onItemChange(item);
        };

        this.query = query;
        this.onAddChildCb = onAddChildCb;
        this.onRemoveChildCb = onRemoveChildCb;
        this.onChangeChildCb = onChangeChildCb;

        query["on"]("child_added", onAddChildCb);
        query["on"]("child_removed", onRemoveChildCb);
        query["on"]("child_moved", onChangeChildCb);
        query["on"]("child_changed", onChangeChildCb);
    };

    ItemListKlassProto.stopUpdateChild = function () {
        if (!this.query)
            return;

        this.query["off"]("child_added", this.onAddChildCb);
        this.query["off"]("child_removed", this.onRemoveChildCb);
        this.query["off"]("child_moved", this.onChangeChildCb);
        this.query["off"]("child_changed", this.onChangeChildCb);
        this.onAddChildCb = null;
        this.onRemoveChildCb = null;
        this.onChangeChildCb = null;
        this.query = null;
    };

    ItemListKlassProto.startUpdateAll = function (query) {
        var self = this;
        var onReadItem = function (childSnapshot) {
            self.addItem(childSnapshot, null, true);
        };
        var onItemsFetchCb = function (snapshot) {
            self.Clean();
            snapshot["forEach"](onReadItem);
            self.updateItemID2Index();
            if (self.onItemsFetch)
                self.onItemsFetch(self.items)
        };

        this.query = query;
        this.onItemsFetchCb = onItemsFetchCb;

        query["on"]("value", onItemsFetchCb);
    };

    ItemListKlassProto.stopUpdateAll = function () {
        if (!this.query)
            return;

        this.query["off"]("value", this.onItemsFetchCb);
        this.onItemsFetchCb = null;
        this.query = null;
    };

    var cleanTable = function (o) {
        var k;
        for (k in o)
            delete o[k];
    };
    // internal 
    // --------------------------------------------------------------------------	
}()); 