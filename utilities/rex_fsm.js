(function () {
    if (!window.rexObjs)
        window.rexObjs = {};

    if (window.rexObjs.FSMKlass)
        return;

    window.rexObjs.FSMKlass = function () {
        this.OnGetNextState = null;
        this.OnTransfer = null;
        this.OnExit = null;
        this.OnEnter = null;
        this.OnStateChanged = null;
    };
    var FSMKlassProto = window.rexObjs.FSMKlass.prototype;

    FSMKlassProto.Init = function (previousState, currentState) {
        this.PreState = previousState;
        this.CurState = currentState;
    };

    FSMKlassProto.Request = function (newState) {
        if (newState == null) {
            if (this.OnGetNextState)
                newState = this.OnGetNextState();
            if (newState == null)
                return;
        }

        // newState != null: state transfer
        this.PreState = this.CurState;
        this.CurState = newState;

        var preState = this.PreState;
        var curState = this.CurState;

        // trigger OnStateChanged first
        if (this.OnStateChanged)
            this.OnStateChanged();

        // try to run transfer_action
        var hasCalled;
        if (this.OnTransfer)
            hasCalled = this.OnTransfer(preState, curState);
        if (hasCalled)
            return;

        // no transfer_action found
        if (this.OnExit)
            this.OnExit(preState);

        if (this.OnEnter)
            this.OnEnter(curState);
    };

    FSMKlassProto.saveToJSON = function () {
        return {
            "ps": this.PreState,
            "cs": this.CurState
        };
    };

    FSMKlassProto.loadFromJSON = function (o) {
        this.PreState = o["ps"];
        this.CurState = o["cs"];
    };
}());
