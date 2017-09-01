(function () {
    if (!window.rexObjs)
        window.rexObjs = {};

    if (!window.rexObjs.FirebaseObj)
        window.rexObjs.FirebaseObj = {};

    // utility
    var isFullPath = function (p) {
        return (p.substring(0, 8) === "https://");
    };

    var getRef = function (path) {
        var fnName = (isFullPath(path)) ? "refFromURL" : "ref";
        return window["firebase"]["database"]()[fnName](path);
    };  
    // utility

    window.rexObjs.FirebaseObj.CallbackMapKlass = function () {
        this.map = {};
    };

    var CallbackMapKlassProto = window.rexObjs.FirebaseObj.CallbackMapKlass.prototype;

    CallbackMapKlassProto.Reset = function (k) {
        for (var k in this.map)
            delete this.map[k];
    };


    CallbackMapKlassProto.IsExisted = function (absRef, eventType, cbName) {
        if (!this.map.hasOwnProperty(absRef))
            return false;

        if (!eventType)  // don't check event type
            return true;

        var eventMap = this.map[absRef];
        if (!eventMap.hasOwnProperty(eventType))
            return false;

        if (!cbName)  // don't check callback name
            return true;

        var cbMap = eventMap[eventType];
        if (!cbMap.hasOwnProperty(cbName))
            return false;

        return true;
    };

    CallbackMapKlassProto.Add = function (query, eventType, cbName, cb) {
        var absRef = query["toString"]();
        if (this.IsExisted(absRef, eventType, cbName))
            return;

        if (!this.map.hasOwnProperty(absRef))
            this.map[absRef] = {};

        var eventMap = this.map[absRef];
        if (!eventMap.hasOwnProperty(eventType))
            eventMap[eventType] = {};

        var cbMap = eventMap[eventType];
        cbMap[cbName] = cb;

        query["on"](eventType, cb);
    };

    CallbackMapKlassProto.Remove = function (absRef, eventType, cbName) {
        if ((absRef != null) && (typeof (absRef) == "object"))
            absRef = absRef["toString"]();

        if (absRef && eventType && cbName) {
            var cb = this.getCallback(absRef, eventType, cbName);
            if (cb == null)
                return;
            getRef(absRef)["off"](eventType, cb);
            delete this.map[absRef][eventType][cbName];
        }
        else if (absRef && eventType && !cbName) {
            var eventMap = this.map[absRef];
            if (!eventMap)
                return;
            var cbMap = eventMap[eventType];
            if (!cbMap)
                return;
            getRef(absRef)["off"](eventType);
            delete this.map[absRef][eventType];
        }
        else if (absRef && !eventType && !cbName) {
            var eventMap = this.map[absRef];
            if (!eventMap)
                return;
            getRef(absRef)["off"]();
            delete this.map[absRef];
        }
        else if (!absRef && !eventType && !cbName) {
            for (var r in this.map) {
                getRef(r)["off"]();
                delete this.map[r];
            }
        }
    };

    CallbackMapKlassProto.RemoveAllCB = function (absRef) {
        if (absRef) {
            var eventMap = this.map[absRef];
            for (var e in eventMap) {
                var cbMap = eventMap[e];
                for (var cbName in cbMap) {
                    getRef(absRef)["off"](e, cbMap[cbName]);
                }
            }

            delete this.map[absRef];
        }
        else if (!absRef) {
            for (var r in this.map) {
                var eventMap = this.map[r];
                for (var e in eventMap) {
                    var cbMap = eventMap[e];
                    for (var cbName in cbMap) {
                        getRef(r)["off"](e, cbMap[cbName]);
                    }
                }

                delete this.map[r];
            }
        }
    };

    CallbackMapKlassProto.GetRefMap = function () {
        return this.map;
    };    

    CallbackMapKlassProto.getCallback = function (absRef, eventType, cbName) {
        if (!this.IsExisted(absRef, eventType, cbName))
            return null;

        return this.map[absRef][eventType][cbName];
    };    

    CallbackMapKlassProto.getDebuggerValues = function (propsections) {
        var r, eventMap, e, cbMap, cn, display;
        for (r in this.map) {
            eventMap = this.map[r];
            for (e in eventMap) {
                cbMap = eventMap[e];
                for (cn in cbMap) {
                    display = cn + ":" + e + "-" + r;
                    propsections.push({ "name": display, "value": "" });
                }
            }
        }
    };
  
}());     