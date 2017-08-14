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
        this.checkState = null; 
        this.checkState2 = null;
        this.isMyCall = null;        
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
				var hasCalled = self.runTrigger(cr.behaviors.Rex_FSM.prototype.cnds.OnLogic);
				if (!hasCalled)
					self.runTrigger(cr.behaviors.Rex_FSM.prototype.cnds.OnDefaultLogic);
				
				return self.nextState;
			};

			this.fsm.OnTransfer = function(preState, curState)
			{
				self.checkState = preState;
				self.checkState2 = curState;
				var hasCalled = self.runTrigger(cr.behaviors.Rex_FSM.prototype.cnds.OnTransfer);
				self.checkState = null;
				self.checkState2 = null;
				return hasCalled;
			};

			this.fsm.OnExit = function (preState)
			{
				self.checkState = preState;
				var hasCalled = self.runTrigger(cr.behaviors.Rex_FSM.prototype.cnds.OnExit);
				self.checkState = null;
				// no exit handle event, try to trigger default exit event
				if (hasCalled)
					return;

				self.runTrigger(cr.behaviors.Rex_FSM.prototype.cnds.OnDefaultExit);
			};

			this.fsm.OnEnter = function (curState)
			{
				self.checkState = curState;
				var hasCalled = self.runTrigger(cr.behaviors.Rex_FSM.prototype.cnds.OnEnter);
				self.checkState = null;
				// no enter handle event, try to trigger default enter event
				if (hasCalled)
					return;

				self.runTrigger(cr.behaviors.Rex_FSM.prototype.cnds.OnDefaultEnter);
			};

			this.fsm.OnStateChanged = function ()
			{
				self.runTrigger(cr.behaviors.Rex_FSM.prototype.cnds.OnStateChanged);  				
			};
		}
		
		this.fsm.Init(previousState, currentState);                                
	};  
    
	behinstProto.tick = function ()
	{
	};
	
    behinstProto.runTrigger = function(trigger)
    {
		this.hasCalled = false;
		this.isMyCall = true;        
		this.runtime.trigger(trigger, this.inst);
		this.isMyCall = null;
        return this.hasCalled;        
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
	    var isMyHanlder = cr.equals_nocase(this.checkState, name);
        this.hasCalled |= isMyHanlder;
		return isMyHanlder && this.isMyCall;
	};

	Cnds.prototype.OnDefaultEnter = function ()
	{
		return this.isMyCall;
	}; 	
	
	Cnds.prototype.OnExit = function (name)
	{
	    var isMyHanlder = cr.equals_nocase(this.checkState, name);
        this.hasCalled |= isMyHanlder;
		return isMyHanlder && this.isMyCall;
	};	
    
	Cnds.prototype.OnDefaultExit = function ()
	{
		return this.isMyCall;
	}; 	    

	Cnds.prototype.OnTransfer = function (nameFrom, nameTo)
	{
		var isMyHanlder = cr.equals_nocase(this.checkState, nameFrom) && 
		                  cr.equals_nocase(this.checkState2, nameTo);
        this.hasCalled |= isMyHanlder;
		return isMyHanlder && this.isMyCall;
	};	
	Cnds.prototype.OnStateChanged = function ()
	{
		return this.isMyCall;
	};     
	Cnds.prototype.OnLogic = function (name)
	{
	    var isMyHanlder = cr.equals_nocase(this.fsm.CurState, name);
        this.hasCalled |= isMyHanlder;
		return isMyHanlder && this.isMyCall;
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
		return this.isMyCall;
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
    
    Acts.prototype.GotoState = function (newState)
	{
        if (!this.activated)
            return;
   
	    this.fsm.Request(newState);
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
