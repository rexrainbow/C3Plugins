(function ()
{
    if (!window.rexObjs)
        window.rexObjs = {};
    
    if (window.rexObjs.FSMKlass)
        return;

    window.rexObjs.FSMKlass = function(plugin, previousState, currentState)
    {
        this.Reset(plugin, previousState, currentState);
    };
    var FSMKlassProto = window.rexObjs.FSMKlass.prototype;

    FSMKlassProto.Reset = function (plugin, previousState, currentState)
    {
        this.plugin = plugin;
        this.PreState = previousState;
        this.CurState = currentState;
    }; 
    	
    FSMKlassProto.Request = function(new_state)
    {
        if (new_state == null)
        {
            new_state = this.plugin.get_next_state();
            if (new_state == null)
                return;
        }
            
        // new_state != null: state transfer
        this.PreState = this.CurState;
        this.CurState = new_state;
                
        var pre_state = this.PreState;
        var cur_state = this.CurState;
        
        // trigger OnStateChanged first
		this.plugin.run_trigger(cr.plugins_.Rex_FSM.prototype.cnds.OnStateChanged);
                        
        // try to run transfer_action
        var isEcho = this._run_transfer_action(pre_state, cur_state);     
        if (isEcho)
            return;
         
        // no transfer_action found
        this._run_exit_action(pre_state);
        this._run_enter_action(cur_state);
    };
    
    FSMKlassProto._run_transfer_action = function(pre_state, cur_state)
    {
        this.plugin.checkState = pre_state;
        this.plugin.checkState2 = cur_state;
        var isEcho = this.plugin.run_trigger(cr.plugins_.Rex_FSM.prototype.cnds.OnTransfer);
        this.plugin.checkState = null;
        this.plugin.checkState2 = null; 
        return isEcho;
    };    

    FSMKlassProto._run_exit_action = function(pre_state)
    {
        this.plugin.checkState = pre_state;
	    var isEcho = this.plugin.run_trigger(cr.plugins_.Rex_FSM.prototype.cnds.OnExit);
	    this.plugin.checkState = null;	    
        // no exit handle event, try to trigger default exit event
		if (isEcho)
		{
		    return;
		}
	    this.plugin.run_trigger(cr.plugins_.Rex_FSM.prototype.cnds.OnDefaultExit);
    };
    
    FSMKlassProto._run_enter_action = function(cur_state)
    {
        this.plugin.checkState = cur_state;
	    var isEcho = this.plugin.run_trigger(cr.plugins_.Rex_FSM.prototype.cnds.OnEnter);
	    this.plugin.checkState = null;
        // no enter handle event, try to trigger default enter event
		if (isEcho)
		{
		    return;
		}
	    this.plugin.run_trigger(cr.plugins_.Rex_FSM.prototype.cnds.OnDefaultEnter); 
    };  
	
	FSMKlassProto.saveToJSON = function ()
	{    
		return { "ps": this.PreState,
		         "cs": this.CurState
			   };
	};
	
	FSMKlassProto.loadFromJSON = function (o)
	{
	    this.PreState = o["ps"];
		this.CurState = o["cs"];
	};	
}());
