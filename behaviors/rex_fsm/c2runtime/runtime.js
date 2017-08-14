// ECMAScript 5 strict mode
"use strict";

assert2(cr, "cr namespace not created");
assert2(cr.behaviors, "cr.behaviors not created");

/////////////////////////////////////
// Behavior class
cr.behaviors.Rex_FSM = function(runtime)
{
	this.runtime = runtime;
};

(function ()
{
	var behaviorProto = cr.behaviors.Rex_FSM.prototype;
		
	/////////////////////////////////////
	// Behavior type class
	behaviorProto.Type = function(behavior, objtype)
	{
		this.behavior = behavior;
		this.objtype = objtype;
		this.runtime = behavior.runtime;
	};

	var behtypeProto = behaviorProto.Type.prototype;

	behtypeProto.onCreate = function()
	{
	};

	/////////////////////////////////////
	// Behavior instance class
	behaviorProto.Instance = function(type, inst)
	{
		this.type = type;
		this.behavior = type.behavior;
		this.inst = inst;				// associated object instance to modify
		this.runtime = type.runtime;        
	};

	var behinstProto = behaviorProto.Instance.prototype;

	behinstProto.onCreate = function()
	{      
        this.activated = (this.properties[0] == 1);
		var previousState = "Off";		
		var currentState = this.properties[1];		
        currentState = (currentState!="")? currentState:"Off";
        
        if (!this.recycled)               	           
            this.fsm = new window.rexObjs.FSMKlass();
		
		this.fsm.Init(previousState, currentState);
        
        this.checkState = null; 
        this.checkState2 = null;
        this.isMyCall = null;        
        this.isEcho = false;
        this.nextState = null;                                                   
	};  
    
	behinstProto.tick = function ()
	{
	};
	
    behinstProto.run_trigger = function(trigger)
    {
        this.isEcho = false;
        this.runtime.trigger(trigger, this.inst);
        return (this.isEcho);        
    };
	
    behinstProto.get_next_state = function()
    {
        this.nextState = null;
        this.isMyCall = true;
		var isEcho = this.run_trigger(cr.behaviors.Rex_FSM.prototype.cnds.OnLogic);
		if (!isEcho)
		    this.run_trigger(cr.behaviors.Rex_FSM.prototype.cnds.OnDefaultLogic);
        
        this.isMyCall = null;
        return this.nextState;
    }; 

	behinstProto.saveToJSON = function ()
	{    
		return { "en": this.activated,
		         "fsm": this.fsm.saveToJSON()
		         };
	};
	
	behinstProto.loadFromJSON = function (o)
	{
	    this.activated = o["en"];
	    this.fsm.loadFromJSON(o["fsm"]);
	};
	
	/**BEGIN-PREVIEWONLY**/
	behinstProto.getDebuggerValues = function (propsections)
	{	  
		propsections.push({
			"title": this.type.name,
			"properties": [{"name": "Current", "value": this.fsm.CurState},
			               {"name": "Previous", "value": this.fsm.PreState}]
		});
	};
	/**END-PREVIEWONLY**/
	
	//////////////////////////////////////
	// Conditions
	function Cnds() {};
	behaviorProto.cnds = new Cnds();

	Cnds.prototype.OnEnter = function (name)
	{
	    var is_my_handler = (this.checkState == name);
        this.isEcho |= is_my_handler;
		return is_my_handler;
	};

	Cnds.prototype.OnDefaultEnter = function ()
	{
		return (this.isMyCall);
	}; 	
	
	Cnds.prototype.OnExit = function (name)
	{
	    var is_my_handler = (this.checkState == name);
        this.isEcho |= is_my_handler;
		return is_my_handler;
	};	
    
	Cnds.prototype.OnDefaultExit = function ()
	{
		return (this.isMyCall);
	}; 	    

	Cnds.prototype.OnTransfer = function (name_from, name_to)
	{
	    var is_my_handler = (this.checkState == name_from) && (this.checkState2 == name_to);
        this.isEcho |= is_my_handler;
		return is_my_handler;
	};	
	Cnds.prototype.OnStateChanged = function ()
	{
		return (this.isMyCall);
	};     
	Cnds.prototype.OnLogic = function (name)
	{
	    var is_my_handler = (this.fsm.CurState == name);
        this.isEcho |= is_my_handler;
		return is_my_handler;
	}; 
	Cnds.prototype.IsCurState = function (name)
	{
		return (this.fsm.CurState == name);
	};
	
	Cnds.prototype.IsPreState = function (name)
	{
		return (this.fsm.PreState == name);
	};     
    
	Cnds.prototype.OnDefaultLogic = function ()
	{
		return (this.isMyCall);
	};
	//////////////////////////////////////
	// Actions
	function Acts() {};
	behaviorProto.acts = new Acts();
    
	Acts.prototype.SetActivated = function (s)
	{
		this.activated = (s==1);
	};     

    Acts.prototype.Request = function ()
	{
        if (!this.activated)
            return;

	    this.fsm.Request();
	};  
    
    Acts.prototype.GotoState = function (new_state)
	{
        if (!this.activated)
            return;
   
	    this.fsm.Request(new_state);
	};     

	Acts.prototype.NextStateSet = function (state)
	{
        this.nextState = state;
	};      
	//////////////////////////////////////
	// Expressions
	function Exps() {};
	behaviorProto.exps = new Exps();

	Exps.prototype.CurState = function (ret)
	{
	    ret.set_string(this.fsm.CurState);
	};	
	
	Exps.prototype.PreState = function (ret)
	{
	    ret.set_string(this.fsm.PreState);
	};
}());

(function ()
{
    cr.behaviors.Rex_FSM.FSMKlass = function(plugin, previousState, currentState)
    {
        this.Reset(plugin, previousState, currentState);
    };
    var FSMKlassProto = cr.behaviors.Rex_FSM.FSMKlass.prototype;

    FSMKlassProto.Reset = function(plugin, previousState, currentState)
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
        this.plugin.isMyCall = true;        
		this.plugin.run_trigger(cr.behaviors.Rex_FSM.prototype.cnds.OnStateChanged);
        
                        
        // try to run transfer_action
        var isEcho = this._run_transfer_action(pre_state, cur_state);   
        this.plugin.isMyCall = null;        
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
        var isEcho = this.plugin.run_trigger(cr.behaviors.Rex_FSM.prototype.cnds.OnTransfer);
        this.plugin.checkState = null;
        this.plugin.checkState2 = null; 
        return isEcho;
    };    

    FSMKlassProto._run_exit_action = function(pre_state)
    {
        this.plugin.checkState = pre_state;
	    var isEcho = this.plugin.run_trigger(cr.behaviors.Rex_FSM.prototype.cnds.OnExit);
	    this.plugin.checkState = null;	    
        // no exit handle event, try to trigger default exit event
		if (isEcho)
		{
		    return;
		}
        this.plugin.isMyCall = true;
	    this.plugin.run_trigger(cr.behaviors.Rex_FSM.prototype.cnds.OnDefaultExit);  
        this.plugin.isMyCall = null;
    };
    
    FSMKlassProto._run_enter_action = function(cur_state)
    {
        this.plugin.checkState = cur_state;
	    var isEcho = this.plugin.run_trigger(cr.behaviors.Rex_FSM.prototype.cnds.OnEnter);
	    this.plugin.checkState = null;
        // no enter handle event, try to trigger default enter event
		if (isEcho)
		{
		    return;
		}
        this.plugin.isMyCall = true;
	    this.plugin.run_trigger(cr.behaviors.Rex_FSM.prototype.cnds.OnDefaultEnter);    
        this.plugin.isMyCall = false;        
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