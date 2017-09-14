(function () {
    if (!window.rexObjs)
        window.rexObjs = {};

    if (window.rexObjs.Keys2Value)
        return;


    var isInValidKey = function (keys) {
        return (keys == null) || (keys === "") || (keys.length === 0);
    };

    var isArray = function (o) {
        return (o instanceof Array);
    }

    var getValue = function (obj, keys) {
        // keys: string with dot notation, or an array

        // null obj
        if (obj == null) {
            return obj;
        }

        // invalid key           
        else if (isInValidKey(keys)) {
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

    var din = function (d, defaultValue, space) {
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
            return JSON.stringify(d, null, space);
        else
            return d;
    };

    var setValue = function (obj, keys, value) {
        // no object
        if (typeof (obj) !== "object")
            return;

        // invalid key
        else if (isInValidKey(keys)) {
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
        if (isInValidKey(keys)) {
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

    var removeKey = function (obj, keys) {
        if (isInValidKey(keys)) {
            // clean all keys
            for (var k in obj)
                delete obj[k];
        }
        else {
            if (typeof (keys) === "string")
                keys = keys.split(".");

            if (getValue(obj, keys) === undefined)
                return;

            var lastKey = keys.pop();
            var entry = getEntry(obj, keys);

            if (!isArray(entry)) {
                delete entry[lastKey];
            }
            else {
                if ((lastKey < 0) || (lastKey >= entry.length))
                    return;
                else if (lastKey === (entry.length - 1))
                    entry.pop();
                else if (lastKey === 0)
                    entry.shift();
                else
                    entry.splice(lastKey, 1);
            }
        }
    };


    window.rexObjs.Din = din;
    window.rexObjs.Keys2Value = getValue;
    window.rexObjs.Keys2CV = function (o, k, defaultValue, space) {
        return din(getValue(o, k), defaultValue, space);
    };

    window.rexObjs.SetValueByKeys = setValue;
    window.rexObjs.Keys2Entry = getEntry;
    window.rexObjs.RemoveByKeys = removeKey;

}());     