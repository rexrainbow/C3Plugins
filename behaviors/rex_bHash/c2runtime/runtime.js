// ECMAScript 5 strict mode
"use strict";

assert2(cr, "cr namespace not created");
assert2(cr.behaviors, "cr.behaviors not created");

/////////////////////////////////////
// Behavior class
cr.behaviors.Rex_bHash = function (runtime) {
    this.runtime = runtime;
};

(function () {
    var behaviorProto = cr.behaviors.Rex_bHash.prototype;

    /////////////////////////////////////
    // Behavior type class
    behaviorProto.Type = function (behavior, objtype) {
        this.behavior = behavior;
        this.objtype = objtype;
        this.runtime = behavior.runtime;
    };

    var behtypeProto = behaviorProto.Type.prototype;

    behtypeProto.onCreate = function () {
    };

    /////////////////////////////////////
    // Behavior instance class
    behaviorProto.Instance = function (type, inst) {
        this.type = type;
        this.behavior = type.behavior;
        this.inst = inst;
        this.runtime = type.runtime;
    };

    var behinstProto = behaviorProto.Instance.prototype;

    behinstProto.onCreate = function () {
        var initJson = this.properties[0];
        if (initJson != "")
            this.hashtable = JSON.parse(initJson);
        else
            this.hashtable = {};
        this.currentEntry = this.hashtable;

        this.setIndent(this.properties[1]);

        this.exp_CurKey = "";
        this.exp_CurValue = 0;
        this.exp_Loopindex = 0;
    };

    behinstProto.tick = function () {
    };

    var din = window.rexObjs.Din;
    var getValue = window.rexObjs.Keys2Value;
    var getCV = window.rexObjs.Keys2CV;
    var setValue = window.rexObjs.SetValueByKeys;
    var getEntry = window.rexObjs.Keys2Entry;
    var removeKey = window.rexObjs.RemoveByKeys;

    behinstProto.cleanAll = function () {
        for (var k in this.hashtable)
            delete this.hashtable[k];
        this.currentEntry = this.hashtable;
    };

    behinstProto.setIndent = function (space) {
        if (isNaN(space))
            this.space = space;
        else
            this.sapce = parseInt(space);
    };

    var getKeysCnt = function (o) {
        if (o == null)  // nothing
            return (-1);
        else if ((typeof o == "number") || (typeof o == "string"))  // number/string
            return 0;
        else if (o.length != null)  // list
            return o.length;

        // hash table
        var key, cnt = 0;
        for (key in o)
            cnt += 1;
        return cnt;
    };

    var isArray = function (o) {
        return (o instanceof Array);
    }

    behinstProto.saveToJSON = function () {
        return { "d": this.hashtable };
    };

    behinstProto.loadFromJSON = function (o) {
        this.hashtable = o["d"];
    };

    // The comments around these functions ensure they are removed when exporting, since the
    // debugger code is no longer relevant after publishing.
    /**BEGIN-PREVIEWONLY**/

    // slightly modified neet simple function from Pumbaa80
    // http://stackoverflow.com/questions/4810841/how-can-i-pretty-print-json-using-javascript#answer-7220510
    function syntaxHighlight(json) {
        json = json.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); // basic html escaping
        return json
            .replace(/("(\\u[a-zA-Z0-9]{4}|\\[^u]|[^\\"])*"(\s*:)?|\b(true|false|null)\b|-?\d+(?:\.\d*)?(?:[eE][+\-]?\d+)?)/g, function (match) {
                var cls = 'red';
                if (/^"/.test(match)) {
                    if (/:$/.test(match)) {
                        cls = 'blue';
                    } else {
                        cls = 'green';
                    }
                } else if (/true|false/.test(match)) {
                    cls = 'Sienna';
                } else if (/null/.test(match)) {
                    cls = 'gray';
                }
                return '<span style="color:' + cls + ';">' + match + '</span>';
            })
            .replace(/\t/g, "&nbsp;&nbsp;") // to keep indentation in html
            .replace(/\n/g, "<br/>");       // to keep line break in html
    }

    behinstProto.getDebuggerValues = function (propsections) {
        // Append to propsections any debugger sections you want to appear.
        // Each section is an object with two members: "title" and "properties".
        // "properties" is an array of individual debugger properties to display
        // with their name and value, and some other optional settings.
        var str = JSON.stringify(this.hashtable, null, "\t");

        propsections.push({
            "title": "JSON",
            "properties": [
                {
                    "name": "content",
                    "value": "<span style=\"cursor:text;-webkit-user-select: text;-khtml-user-select:text;-moz-user-select:text;-ms-user-select:text;user-select:text;\">" + syntaxHighlight(str) + "</style>",
                    "html": true,
                    "readonly": true
                }

                // Each property entry can use the following values:
                // "name" (required): name of the property (must be unique within this section)
                // "value" (required): a boolean, number or string for the value
                // "html" (optional, default false): set to true to interpret the name and value
                //                                   as HTML strings rather than simple plain text
                // "readonly" (optional, default false): set to true to disable editing the property

                // Example:
                // {"name": "My property", "value": this.myValue}
            ]
        });
    };

    behinstProto.onDebugValueEdited = function (header, name, value) {
        // Called when a non-readonly property has been edited in the debugger. Usually you only
        // will need 'name' (the property name) and 'value', but you can also use 'header' (the
        // header title for the section) to distinguish properties with the same name.
        // if (name === "My property")
        //  this.myProperty = value;
    };
    /**END-PREVIEWONLY**/
    //////////////////////////////////////
    // Conditions
    function Cnds() { };
    behaviorProto.cnds = new Cnds();

    Cnds.prototype.ForEachKey = function (keys) {
        var entry = getEntry(this.hashtable, keys);

        var current_frame = this.runtime.getCurrentEventStack();
        var current_event = current_frame.current_event;
        var solModifierAfterCnds = current_frame.isModifierAfterCnds();

        var key, value;
        this.exp_Loopindex = -1;
        for (key in entry) {
            if (solModifierAfterCnds)
                this.runtime.pushCopySol(current_event.solModifiers);

            this.exp_CurKey = key;
            this.exp_CurValue = entry[key];
            this.exp_Loopindex++;
            current_event.retrigger();


            if (solModifierAfterCnds)
                this.runtime.popSol(current_event.solModifiers);
        }

        this.exp_CurKey = "";
        this.exp_CurValue = 0;
        return false;
    };

    Cnds.prototype.KeyExists = function (keys) {
        if (keys == "")
            return false;

        return (getValue(this.hashtable, keys) !== undefined);
    };

    Cnds.prototype.IsEmpty = function (keys) {
        var entry = getEntry(this.hashtable, keys);
        for (var k in entry) {
            return false;
        }
        return true;
    };
    //////////////////////////////////////
    // Actions
    function Acts() { };
    behaviorProto.acts = new Acts();

    Acts.prototype.SetValueByKeyString = function (keys, val) {
        setValue(this.hashtable, keys, val);
    };

    Acts.prototype.SetCurHashEntey = function (keys) {
        this.currentEntry = getEntry(this.hashtable, keys);
    };

    Acts.prototype.SetValueInCurHashEntry = function (keys, val) {
        setValue(this.currentEntry, keys, val);
    };

    Acts.prototype.CleanAll = function () {
        this.cleanAll();
    };

    Acts.prototype.LoadJSON = function (jsonString) {
        if (jsonString != "")
            this.hashtable = JSON.parse(jsonString);
        else
            this.cleanAll();
    };

    Acts.prototype.RemoveByKeyString = function (keys) {
        removeKey(this.hashtable, keys);
        this.currentEntry = this.hashtable;
    };

    Acts.prototype.PickKeysToArray = function (keys, arrayObjs) {
        if (!arrayObjs)
            return;

        var arrInst = arrayObjs.getFirstPicked();
        if (!arrInst)
            return;

        if (cr.plugins_.Arr && (arrInst instanceof cr.plugins_.Arr.prototype.Instance)) {
        }
        else {
            assert2(null, "[JSON] Action:Pick keys need an array type of parameter.");
        }

        cr.plugins_.Arr.prototype.acts.SetSize.apply(arrInst, [0, 1, 1]);
        var entry = getEntry(this.hashtable, keys);
        for (var k in entry)
            cr.plugins_.Arr.prototype.acts.Push.call(arrInst, 0, k, 0);
    };

    var getFullKey = function (currentKey, key) {
        if (currentKey !== "")
            key = currentKey + "." + key;

        return key;
    };
    Acts.prototype.MergeTwoJSON = function (hashTableObjs, conflictHandlerMode) {
        if (!hashTableObjs)
            return;

        var hashB = hashTableObjs.getFirstPicked();
        if (!hashB)
            return;

        var untraversalTables = [], node;
        var curHash, currentKey, keyB, valueB, keyA, valueA, fullKey;

        // Clean all then deep copy from hash table B
        if (conflictHandlerMode === 2) {
            this.cleanAll();
            conflictHandlerMode = 0;
        }

        switch (conflictHandlerMode) {
            case 0: // Overwrite from hash B
                untraversalTables.push({ table: hashB.hashtable, key: "" });
                while (untraversalTables.length !== 0) {
                    node = untraversalTables.shift();
                    curHash = node.table;
                    currentKey = node.key;
                    for (keyB in curHash) {
                        valueB = curHash[keyB];
                        fullKey = getFullKey(currentKey, keyB);
                        valueA = getValue(this.hashtable, fullKey);
                        // number, string, boolean, null
                        if ((valueB === null) || typeof (valueB) !== "object") {
                            setValue(this.hashtable, fullKey, valueB);
                        }
                        else {
                            // valueB is an array but valueA is not an array
                            if (isArray(valueB) && !isArray(valueA))
                                setValue(this.hashtable, fullKey, []);

                            untraversalTables.push({ table: valueB, key: fullKey });
                        }
                    }
                }
                break;

            case 1:  // Merge new keys from hash table B
                untraversalTables.push({ table: hashB.hashtable, key: "" });
                while (untraversalTables.length !== 0) {
                    node = untraversalTables.shift();
                    curHash = node.table;
                    currentKey = node.key;
                    for (keyB in curHash) {
                        valueB = curHash[keyB];
                        fullKey = getFullKey(currentKey, keyB);
                        valueA = getValue(this.hashtable, fullKey);
                        if (valueA !== undefined)
                            continue;

                        if ((valueB == null) || typeof (valueB) !== "object") {
                            setValue(this.hashtable, fullKey, valueB);
                        }
                        else {
                            // valueB is an array
                            if (isArray(valueB))
                                setValue(this.hashtable, fullKey, []);

                            untraversalTables.push({ table: valueB, key: fullKey });
                        }
                    }
                }
                break;

        }
    };

    Acts.prototype.SetJSONByKeyString = function (keys, val) {
        setValue(this.hashtable, keys, JSON.parse(val));
    };

    Acts.prototype.AddToValueByKeyString = function (keys, val) {
        if (keys === "")
            return;

        keys = keys.split(".");
        var lastKey = keys.pop();
        var entry = getEntry(this.hashtable, keys);
        entry[lastKey] = (entry[lastKey] || 0) + val;
    };

    Acts.prototype.Shuffle = function (keys) {
        var arr = getValue(this.hashtable, keys);
        if (!isArray(arr))
            return;

        window.rexObjs.ShuffleArr(arr);
    };

    Acts.prototype.Sort = function (keys, sortKey, sortMode_) {
        var arr = getValue(this.hashtable, keys);
        if (!isArray(arr))
            return;

        if (sortKey === "")
            sortKey = null;
        else
            sortKey = sortKey.split(".");

        var self = this;
        var sortFn = function (itemA, itemB) {
            var valA = (sortKey) ? getValue(itemA, sortKey) : itemA;
            var valB = (sortKey) ? getValue(itemB, sortKey) : itemB;
            var m = sortMode_;

            if (sortMode_ >= 2)  // logical descending, logical ascending
            {
                valA = parseFloat(valA);
                valB = parseFloat(valB);
                m -= 2;
            }

            switch (m) {
                case 0:  // descending
                    if (valA === valB) return 0;
                    else if (valA < valB) return 1;
                    else return -1;
                    break;

                case 1:  // ascending
                    if (valA === valB) return 0;
                    else if (valA > valB) return 1;
                    else return -1;
                    break;

            }
        }
        arr.sort(sortFn);
    };

    Acts.prototype.PushJSON = function (keys, val) {
        Acts.prototype.PushValue.call(this, keys, JSON.parse(val));
    };

    Acts.prototype.PushValue = function (keys, val) {
        var arr = getEntry(this.hashtable, keys, []);
        if (!isArray(arr))
            return;

        arr.push(val);
    };

    Acts.prototype.InsertJSON = function (keys, val, idx) {
        Acts.prototype.InsertValue.call(this, keys, JSON.parse(val), idx);
    };

    Acts.prototype.InsertValue = function (keys, val, idx) {
        var arr = getEntry(this.hashtable, keys, []);
        if (!isArray(arr))
            return;

        arr.splice(idx, 0, val);
    };

    Acts.prototype.SetIndent = function (space) {
        this.setIndent(space);
    };

    //////////////////////////////////////
    // Expressions
    function Exps() { };
    behaviorProto.exps = new Exps();

    Exps.prototype.Hash = function (ret, keys, defaultValue) {
        ret.set_any(getCV(this.hashtable, keys, defaultValue, this.space));
    };
    Exps.prototype.At = Exps.prototype.Hash;

    Exps.prototype.AtKeys = function (ret) {
        var keys = [];
        var i, cnt = arguments.length, k;
        for (i = 1; i < cnt; i++) {
            k = arguments[i];
            if ((typeof (k) === "string") && (k.indexOf(".") !== -1))
                keys.push.apply(keys, k.split("."));
            else
                keys.push(k);
        }

        ret.set_any(getCV(this.hashtable, keys, null, this.space));
    };

    Exps.prototype.Entry = function (ret, keys, defaultValue) {
        ret.set_any(getCV(this.currentEntry, keys, null, this.space));
    };

    Exps.prototype.HashTableToString = function (ret) {
        var json_string = JSON.stringify(this.hashtable, null, this.space);
        ret.set_string(json_string);
    };

    Exps.prototype.CurKey = function (ret) {
        ret.set_string(this.exp_CurKey);
    };

    Exps.prototype.CurValue = function (ret, keys, defaultValue) {
        ret.set_any(getCV(this.exp_CurValue, keys, defaultValue, this.space));
    };

    Exps.prototype.ItemCnt = function (ret, keys) {
        var obj = getValue(this.hashtable, keys);
        var cnt = getKeysCnt(obj);
        ret.set_int(cnt);
    };

    Exps.prototype.Keys2ItemCnt = function (ret, key) {
        var keys = (arguments.length > 2) ?
            Array.prototype.slice.call(arguments, 1) :
            [key];

        var obj = getValue(this.hashtable, keys);
        var cnt = getKeysCnt(obj);
        ret.set_int(cnt);
    };

    Exps.prototype.ToString = function (ret) {
        var table;
        if (arguments.length == 1)  // no parameter
            table = this.hashtable;
        else {
            var i, cnt = arguments.length;
            table = {};
            for (i = 1; i < cnt; i = i + 2)
                table[arguments[i]] = arguments[i + 1];
        }
        ret.set_string(JSON.stringify(table, null, this.space));
    };

    Exps.prototype.AsJSON = Exps.prototype.HashTableToString;

    Exps.prototype.RandomKeyAt = function (ret, keys, defaultValue) {
        var val;
        var o = getValue(this.hashtable, keys);
        if (typeof (o) === "object") {
            var isArr = isArray(o);
            if (!isArr)
                o = Object.keys(o);

            var cnt = o.length;
            if (cnt > 0) {
                val = Math.floor(Math.random() * cnt);
                if (!isArr)
                    val = o[val];
            }
        }

        ret.set_any(din(val, defaultValue, this.space));
    };

    Exps.prototype.Loopindex = function (ret) {
        ret.set_int(this.exp_Loopindex);
    };

    Exps.prototype.Pop = function (ret, keys, idx) {
        var arr = getEntry(this.hashtable, keys);
        var val;
        if (arr == null)
            val = 0;
        else if ((idx == null) || (idx === (arr.length - 1)))
            val = arr.pop()
        else
            val = arr.splice(idx, 1);

        ret.set_any(din(val, null, this.space));
    };


}());