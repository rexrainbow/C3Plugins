(function () {
    if (!window.rexObjs)
        window.rexObjs = {};
    
    if (!window.rexObjs.FirebaseObj)
        window.rexObjs.FirebaseObj = {};

    if (!window.rexObjs.FirebaseObj.OnInit)
        window.rexObjs.FirebaseObj.OnInit = {};
    var onInit = window.rexObjs.FirebaseObj.OnInit;

    var __handlers = [];
    onInit.AddHandler = function (callback) {
        if (__handlers === null)
            callback()
        else
            __handlers.push(callback);
    };
    onInit.RunHandlers = function () {
        var i, cnt = __handlers.length;
        for (i = 0; i < cnt; i++) {
            __handlers[i]();
        }
        __handlers = null;
    };
}()); 