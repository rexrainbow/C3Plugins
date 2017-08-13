// ECMAScript 5 strict mode
"use strict";

assert2(cr, "cr namespace not created");
assert2(cr.plugins_, "cr.plugins_ not created");

/////////////////////////////////////
// Behavior class
cr.plugins_.Rex_FSM = function(runtime)
{
	this.runtime = runtime;
};

(function ()
{
	var pluginProto = cr.plugins_.Rex_FSM.prototype;
		
	/////////////////////////////////////
	// Behavior type class
	pluginProto.Type = function(plugin)
	{
		this.plugin = plugin;
		this.runtime = plugin.runtime;
	};

	var behtypeProto = pluginProto.Type.prototype;

	behtypeProto.onCreate = function()
	{
	};

	/////////////////////////////////////
	// Behavior instance class
	pluginProto.Instance = function(type)
	{
		this.type = type;
		this.runtime = type.runtime;      
	};

	var instanceProto = pluginProto.Instance.prototype;

	instanceProto.onCreate = function()
	{
        this.activated = (this.properties[0] == 1);
		var previousState = "Off";		
		var currentState = this.properties[1];		
        currentState = (currentState!="")? currentState:"Off";
        
        if (!this.recycled)
            this.fsm = new window.rexObjs.FSMKlass(this, previousState, currentState);
        else
            this.fsm.Reset(this, previousState, currentState);
           
        this.checkState = null; 
        this.checkState2 = null;
        this.isEcho = false;
        this.nextState = null;
	};  
	
    instanceProto.run_trigger = function(trigger)
    {
        this.isEcho = false;
        this.runtime.trigger(trigger, this);
        return (this.isEcho);        
    };
	
    instanceProto.get_next_state = function()
    {
        this.nextState = null;
		var isEcho = this.run_trigger(cr.plugins_.Rex_FSM.prototype.cnds.OnLogic);
		if (!isEcho)
		    this.run_trigger(cr.plugins_.Rex_FSM.prototype.cnds.OnDefaultLogic);
        return this.nextState;
    }; 

	instanceProto.saveToJSON = function ()
	{    
		return { "en": this.activated,
		         "fsm": this.fsm.saveToJSON()
		         };
	};
	
	instanceProto.loadFromJSON = function (o)
	{
	    this.activated = o["en"];
	    this.fsm.loadFromJSON(o["fsm"]);
	};
	
	/**BEGIN-PREVIEWONLY**/
	instanceProto.getDebuggerValues = function (propsections)
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
	pluginProto.cnds = new Cnds();

	Cnds.prototype.OnEnter = function (name)
	{
	    var is_my_handler = (this.checkState == name);
        this.isEcho |= is_my_handler;
		return is_my_handler;
	};

	Cnds.prototype.OnDefaultEnter = function ()
	{
		return true;
	}; 	
	
	Cnds.prototype.OnExit = function (name)
	{
	    var is_my_handler = (this.checkState == name);
        this.isEcho |= is_my_handler;
		return is_my_handler;
	};	
    
	Cnds.prototype.OnDefaultExit = function ()
	{
		return true;
	}; 	    

	Cnds.prototype.OnTransfer = function (name_from, name_to)
	{
	    var is_my_handler = (this.checkState == name_from) && (this.checkState2 == name_to);
        this.isEcho |= is_my_handler;
		return is_my_handler;
	};	
	
	Cnds.prototype.OnStateChanged = function ()
	{
		return true;
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
		return true;
	};    
	//////////////////////////////////////
	// Actions
	function Acts() {};
	pluginProto.acts = new Acts();
    
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
	pluginProto.exps = new Exps();

	Exps.prototype.CurState = function (ret)
	{
	    ret.set_string(this.fsm.CurState);
	};	
	
	Exps.prototype.PreState = function (ret)
	{
	    ret.set_string(this.fsm.PreState);
	}; 
}());
