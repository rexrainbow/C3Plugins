(function () {
    if (!window.rexObjs)
        window.rexObjs = {};

    if (window.rexObjs.TimelineKlass)
        return;

    window.rexObjs.TimelineKlass = function () {
        this.CleanAll();
    };
    var TimeLineProto = window.rexObjs.TimelineKlass.prototype;

    var _TIMERQUEUE_SORT = function (timerA, timerB) {
        var ta = timerA.absTime;
        var tb = timerB.absTime;
        return (ta < tb) ? -1 : (ta > tb) ? 1 : 0;
    }

    TimeLineProto.CleanAll = function () {
        this.triggered_timer = null;
        this.absTime = 0;
        this._timer_absTime = 0;
        this._waitingTimerQueue = [];
        this._processTimerQueue = [];
        this._suspendTimerQueue = [];

        this._activateQueue = [this._waitingTimerQueue, this._processTimerQueue];
        this._allQueues = [this._waitingTimerQueue, this._processTimerQueue, this._suspendTimerQueue];
    };

    TimeLineProto.CurrentTimeGet = function () {
        return this._timer_absTime;
    };

    TimeLineProto.RegistTimer = function (timer) {
        this._add_timer_to_activate_lists(timer);
    };

    TimeLineProto.RemoveTimer = function (timer) {
        this._removeTimerFromQueues(timer, false);  //activate_only=False
        timer._idle();
    };

    TimeLineProto.Dispatch = function (deltaTime) {
        this.absTime += deltaTime;

        // sort _waitingTimerQueue
        this._waitingTimerQueue.sort(_TIMERQUEUE_SORT);

        // get time-out timer
        var quene_length = this._waitingTimerQueue.length;
        var i, timer;
        var timerCnt = 0;
        for (i = 0; i < quene_length; i++) {
            timer = this._waitingTimerQueue[i];
            if (this._is_timer_time_out(timer)) {
                this._processTimerQueue.push(timer);
                timerCnt += 1;
            }
        }

        // remainder timers   
        if (timerCnt) {
            for (i = timerCnt; i < quene_length; i++) {
                this._waitingTimerQueue[i - timerCnt] = this._waitingTimerQueue[i];
            }
            this._waitingTimerQueue.length -= timerCnt;
        }

        // do call back function with arg list
        while (this._processTimerQueue.length > 0) {
            this._processTimerQueue.sort(_TIMERQUEUE_SORT);
            this.triggered_timer = this._processTimerQueue.shift();
            this._timer_absTime = this.triggered_timer.absTime;
            //log("[TimeLine] Current Time="+this._timer_absTime);
            this.triggered_timer.DoHandle();
        }
        this._timer_absTime = this.absTime;

    };

    TimeLineProto.SuspendTimer = function (timer) {
        var is_success = this._removeTimerFromQueues(timer, true); //activate_only=True
        if (is_success) {
            this._suspendTimerQueue.push(timer);
            timer.__suspend__();
        }
        return is_success;
    };

    TimeLineProto.ResumeTimer = function (timer) {
        var is_success = false;
        var itemIndex = this._suspendTimerQueue.indexOf(timer);
        if (itemIndex != (-1)) {
            cr.arrayRemove(this._suspendTimerQueue, itemIndex);
            timer.__resume__();
            this.RegistTimer(timer);
            is_success = true;
        }
        return is_success;
    };

    TimeLineProto.SetTimescale = function (timer, timescale) {
        timer.__setTimescale__(timescale);
        var is_success = this._removeTimerFromQueues(timer, true);  //activate_only=True
        if (is_success) {
            this.RegistTimer(timer);
        }
        return is_success;
    };

    TimeLineProto.ChangeTimerRate = function (timer, rate) {
        timer.__changeRate__(rate);
        var is_success = this._removeTimerFromQueues(timer, true);  //activate_only=True
        if (is_success) {
            this.RegistTimer(timer);
        }
        return is_success;
    };

    TimeLineProto.saveToJSON = function () {
        return { "at": this.absTime };
    };

    TimeLineProto.loadFromJSON = function (o) {
        this.absTime = o["at"];
    };

    // internal function        
    TimeLineProto._is_timer_time_out = function (timer) {
        return (timer.absTime <= this.absTime);
    };

    TimeLineProto._add_timer_to_activate_lists = function (timer) {
        var queue = (this._is_timer_time_out(timer)) ?
            this._processTimerQueue : this._waitingTimerQueue;
        queue.push(timer);
    };

    TimeLineProto._removeTimerFromQueues = function (timer, activate_only) {
        var is_success = false;
        var timer_lists = (activate_only) ? this._activateQueue : this._allQueues;
        var i;
        var lists_length = timer_lists.length;
        var timer_queue, itemIndex;
        for (i = 0; i < lists_length; i++) {
            timer_queue = timer_lists[i];
            itemIndex = timer_queue.indexOf(timer);
            if (itemIndex != (-1)) {
                cr.arrayRemove(timer_queue, itemIndex);
                is_success = true;
                break;
            }
        }
        return is_success;
    };


    // Timer
    window.rexObjs.TimerKlass = function (timeline) {
        this.Reset(timeline);
        this.extra = {};
        // state: 
        // - idle: (!this._isAlive) && (!this._isActive)
        // - run: (this._isAlive) && (this._isActive)
        // - suspend: (this._isAlive) && (!this._isActive)
    };
    var TimerProto = window.rexObjs.TimerKlass.prototype;

    TimerProto.Reset = function (timeline) {
        this.timeline = timeline;        
        this.delayTime = 0; //delayTime
        this._remainderTime = 0;
        this.absTime = 0;
        this.timescale = 1;
        this._idle();
        this._setAbsTimeout(0); // delayTime
    };

    // export functions
    TimerProto.Restart = function (delayTime) {
        if (delayTime != null)  // assign new delay time
        {
            this.delayTime = delayTime;
        }

        var t = this.delayTime / this.timescale;
        this._setAbsTimeout(t);
        if (this._isAlive) {
            if (!this._isActive) {
                this._remainderTime = this.absTime;
                this.Resume(); // update timer in TimeLineMgr 
            }
        }
        else {
            this.timeline.RegistTimer(this);
            this._run();
        }
    };
    TimerProto.Start = TimerProto.Restart;

    TimerProto.Suspend = function () {
        this.timeline.SuspendTimer(this);
    };

    TimerProto.Resume = function () {
        this.timeline.ResumeTimer(this);
    };

    TimerProto.SetTimescale = function (timescale) {
        if (this._isActive && (timescale === this.timescale))
            return;

        this.timeline.SetTimescale(this, timescale);
    };

    TimerProto.ChangeRate = function (rate) {
        this.timeline.ChangeTimerRate(this, rate);
    };

    TimerProto.Remove = function () {
        if (this._isAlive)
            this.timeline.RemoveTimer(this);
    };

    TimerProto.IsAlive = function () {
        return this._isAlive;
    };

    TimerProto.IsActive = function () {
        return (this._isAlive && this._isActive);
    };

    TimerProto.RemainderTimeGet = function (ignoreTimeScale) {
        var remainderTime;

        if (this.IsActive())       // -> run             
            remainderTime = this.absTime - this.timeline.CurrentTimeGet();
        else if (this.IsAlive())   // (!this.IsActive() && this.IsAlive()) -> suspend        
            remainderTime = this._remainderTime;
        else
            remainderTime = 0;

        // ignoreTimeScale to get real remain time (for saving)
        if (!ignoreTimeScale) {
            if ((this.timescale !== 0) || (this.timescale !== 1))
                remainderTime *= this.timescale;
        }

        return remainderTime;
    };

    TimerProto.RemainderTimeSet = function (remainderTime) {
        if (!this.IsAlive())
            return;

        // scale delay time
        var delayTime = this.delayTime;
        if ((this.timescale !== 0) || (this.timescale !== 1))
            delayTime /= this.timescale;

        this._remainderTime = cr.clamp(remainderTime, 0, delayTime);
        this.absTime = this.timeline.CurrentTimeGet() + this._remainderTime;
    };
    TimerProto.ElapsedTimeGet = function () {
        return (this.delayTime - this.RemainderTimeGet());
    };

    TimerProto.RemainderTimePercentGet = function () {
        return (this.delayTime == 0) ? 0 :
            (this.RemainderTimeGet() / this.delayTime);
    };

    TimerProto.ElapsedTimePercentGet = function () {
        return (this.delayTime == 0) ? 0 :
            (this.ElapsedTimeGet() / this.delayTime);
    };

    TimerProto.ExpiredTimeGet = function () {
        return (this.timeline.absTime - this.absTime);
    };

    TimerProto.DelayTimeGet = function () {
        return this.delayTime;
    };

    // hang this function
    //TimerProto.OnTimeout = function()
    //{            
    //};   

    TimerProto.TimeoutHandlerSet = function (handler) {
        this.OnTimeout = handler;
    };

    // export to timeline
    TimerProto.DoHandle = function () {
        this._idle();
        if (this.OnTimeout)
            this.OnTimeout();
    };

    // export to save/load timer
    TimerProto.saveToJSON = function () {
        var remainderTime = this.RemainderTimeGet(true);
        return {
            "dt": this.delayTime,
            "rt": remainderTime,
            "ts": this.timescale,
            "alive": this._isAlive,
            "active": this._isActive,
            "ex": this.extra
        };
    };

    TimerProto.loadFromJSON = function (o) {
        this.delayTime = o["dt"];
        this._isAlive = o["alive"];
        this._isActive = o["active"];
        this.timescale = o["ts"];    // compaticable           
        this.extra = o["ex"];
        this.RemainderTimeSet(o["rt"]);  // set remaind_time and absTime    
        // this._handler will be set at timer created
    };

    TimerProto.afterLoad = function () {
        if (this.IsAlive()) {
            this.timeline.RegistTimer(this);
            if (!this.IsActive()) {
                this.timeline.SuspendTimer(this);
            }
        }
    };

    // internal functions
    TimerProto._idle = function () {
        this._isAlive = false;   // start, stop
        this._isActive = false;  // suspend, resume
    };

    TimerProto._run = function () {
        this._isAlive = true;
        this._isActive = true;
    };

    TimerProto._setAbsTimeout = function (deltaTime) {
        this.absTime = this.timeline.CurrentTimeGet() + deltaTime;
    };

    // do not call this directly
    TimerProto.__suspend__ = function () {
        this._remainderTime = this.absTime - this.timeline.CurrentTimeGet();
        this._isActive = false;
    };

    // do not call this directly
    TimerProto.__resume__ = function () {
        this._setAbsTimeout(this._remainderTime);
        this._isActive = true;
    };

    TimerProto.__setTimescale__ = function (timescale) {
        if (timescale < 0)   // invalid
            return;

        var reset_rate = false;
        if ((timescale == 0) && this._isActive) // suspend
        {
            this.Suspend();
        }
        else if ((timescale > 0) && (!this._isActive)) // resume
        {
            this.Resume();
            reset_rate = true;
        }
        else if ((timescale > 0) && this._isActive) // this._isActive, normal
        {
            reset_rate = true;
        }

        if (reset_rate) {
            var rate = this.timescale / timescale;
            this.__changeRate__(rate);
            this.timescale = timescale;
        }
    };

    TimerProto.__changeRate__ = function (rate) {
        if (this._isActive) {
            var absTime = this.timeline.CurrentTimeGet();
            var remainderTime = this.absTime - absTime;
            this.absTime = absTime + (remainderTime * rate);
        }
        else {
            this._remainderTime *= rate;
        }
    };
}());
