(function () {
    if (!window.rexObjs)
        window.rexObjs = {};

    var getValue = function (obj, keys) {
        // keys: string with dot notation, or an array

        // null obj
        if (obj == null) {
            return obj;
        }

        // invalid key           
        else if ((keys == null) || (keys === "") || (keys.length === 0)) {
            return obj;
        }

        // key but no object
        else if (typeof (obj) !== "object")
            return null;

        else {
            if (typeof (keys) === "string")
                keys = keys.split(".");

            var i, cnt = keys.length, key;
            var v = obj;
            for (i = 0; i < cnt; i++) {
                key = keys[i];
                if (v.hasOwnProperty(key))
                    v = v[key];
                else
                    return undefined;
            }
            return v;
        }
    };

    var din = function (d, defaultValue) {
        if (d === true)
            return 1;
        else if (d === false)
            return 0;
        else if (d == null) {
            if (defaultValue != null)
                return defaultValue;
            else
                return 0;
        }
        else if (typeof (d) == "object")
            return JSON.stringify(d);
        else
            return d;
    };

    var setValue = function (obj, keys, value) {
        // no object
        if (typeof (obj) !== "object")
            return;

        // invalid key
        else if ((keys === "") || (keys.length === 0)) {
            // don't erase obj
            if (value == null)
                return;
            // set obj to another object
            else if (typeof (value) === "object")
                obj = value;
        }

        else {
            if (typeof (keys) === "string")
                keys = keys.split(".");

            var lastKey = keys.pop();
            var entry = getEntry(obj, keys);
            entry[lastKey] = value;
        }
    };

    var getEntry = function (obj, keys, defaultEntry) {
        var entry = obj;
        if ((keys === "") || (keys.length === 0)) {
            //entry = root;
        }
        else {
            if (typeof (keys) === "string")
                keys = keys.split(".");

            var i, cnt = keys.length, key;
            for (i = 0; i < cnt; i++) {
                key = keys[i];
                if ((entry[key] == null) || (typeof (entry[key]) !== "object")) {
                    var newEntry;
                    if (i === cnt - 1) {
                        newEntry = defaultEntry || {};
                    }
                    else {
                        newEntry = {};
                    }

                    entry[key] = newEntry;
                }

                entry = entry[key];
            }
        }

        return entry;
    };



    window.rexObjs.Din = din;
    window.rexObjs.keys2Value = getValue;
    window.rexObjs.Keys2CV = function (o, k, defaultValue) {
        return din(getValue(o, k), defaultValue);
    };

    window.rexObjs.SetValueByKeys = setValue;
    window.rexObjs.Keys2Entry = getEntry;

}());     