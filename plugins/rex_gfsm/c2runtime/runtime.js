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
        this.checkState = null; 
        this.checkState2 = null;
        this.hasCalled = false;
		this.nextState = null;
				
        this.activated = (this.properties[0] == 1);
		var previousState = "Off";		
		var currentState = this.properties[1];		
        currentState = (currentState!="")? currentState:"Off";
        
		if (!this.recycled)
	    {       	           
	    	this.fsm = new window.rexObjs.FSMKlass();
	
	    	var self = this;
	    	this.fsm.OnGetNextState = function ()
	    	{
	    		self.nextState = null;
	    		var hasCalled = self.runTrigger(cr.plugins_.Rex_FSM.prototype.cnds.OnLogic);
	    		if (!hasCalled)
	    			self.runTrigger(cr.plugins_.Rex_FSM.prototype.cnds.OnDefaultLogic);
	    		
	    		return self.nextState;
	    	};
	
	    	this.fsm.OnTransfer = function(preState, curState)
	    	{
	    		self.checkState = preState;
	    		self.checkState2 = curState;
	    		var hasCalled = self.runTrigger(cr.plugins_.Rex_FSM.prototype.cnds.OnTransfer);
	    		self.checkState = null;
	    		self.checkState2 = null; 
	    		return hasCalled;
	    	};
	
	    	this.fsm.OnExit = function (preState)
	    	{
	    		self.checkState = preState;
	    		var hasCalled = self.runTrigger(cr.plugins_.Rex_FSM.prototype.cnds.OnExit);
	    		self.checkState = null;
	    		// no exit handle event, try to trigger default exit event
	    		if (hasCalled)
	    			return;
	
	    		self.runTrigger(cr.plugins_.Rex_FSM.prototype.cnds.OnDefaultExit);
	    	};
	
	    	this.fsm.OnEnter = function (curState)
	    	{
	    		self.checkState = curState;
	    		var hasCalled = self.runTrigger(cr.plugins_.Rex_FSM.prototype.cnds.OnEnter);
	    		self.checkState = null;
	    		// no enter handle event, try to trigger default enter event
	    		if (hasCalled)
	    			return;
	
	    		self.runTrigger(cr.plugins_.Rex_FSM.prototype.cnds.OnDefaultEnter);
	    	};
	
	    	this.fsm.OnStateChanged = function ()
	    	{ 
	    		self.runTrigger(cr.plugins_.Rex_FSM.prototype.cnds.OnStateChanged);				
	    	};
	    }
	    
	    this.fsm.Init(previousState, currentState);               
	};  
	
    instanceProto.runTrigger = function(trigger)
    {
        this.hasCalled = false;
        this.runtime.trigger(trigger, this);
        return this.hasCalled;        
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
	    var isMyHanlder = cr.equals_nocase(this.checkState, name);
        this.hasCalled |= isMyHanlder;
		return isMyHanlder;
	};

	Cnds.prototype.OnDefaultEnter = function ()
	{
		return true;
	}; 	
	
	Cnds.prototype.OnExit = function (name)
	{
	    var isMyHanlder = cr.equals_nocase(this.checkState, name);
        this.hasCalled |= isMyHanlder;
		return isMyHanlder;
	};	
    
	Cnds.prototype.OnDefaultExit = function ()
	{
		return true;
	}; 	    

	Cnds.prototype.OnTransfer = function (name_from, name_to)
	{
		var isMyHanlder = cr.equals_nocase(this.checkState, nameFrom) && 
		cr.equals_nocase(this.checkState2, nameTo);
        this.hasCalled |= isMyHanlder;
        return isMyHanlder && this.isMyCall;
	};	
	
	Cnds.prototype.OnStateChanged = function ()
	{
		return true;
	};     
	Cnds.prototype.OnLogic = function (name)
	{
	    var isMyHanlder = cr.equals_nocase(this.fsm.CurState, name);
        this.hasCalled |= isMyHanlder;
		return isMyHanlder;
	}; 
	
	Cnds.prototype.IsCurState = function (name)
	{
		return cr.equals_nocase(this.fsm.CurState, name);
	};
	   
	Cnds.prototype.IsPreState = function (name)
	{
		return cr.equals_nocase(this.fsm.PreState, name);
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
