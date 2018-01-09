// ECMAScript 5 strict mode
"use strict";

assert2(cr, "cr namespace not created");
assert2(cr.plugins_, "cr.plugins_ not created");

/////////////////////////////////////
// Plugin class
cr.plugins_.Rex_CSV2Array = function(runtime)
{
	this.runtime = runtime;
};

(function ()
{
	var pluginProto = cr.plugins_.Rex_CSV2Array.prototype;
		
	/////////////////////////////////////
	// Object type class
	pluginProto.Type = function(plugin)
	{
		this.plugin = plugin;
		this.runtime = plugin.runtime;
	};
	
	var typeProto = pluginProto.Type.prototype;

	typeProto.onCreate = function()
	{
	};

	/////////////////////////////////////
	// Instance class
	pluginProto.Instance = function(type)
	{
		this.type = type;
		this.runtime = type.runtime;
	};
	
	var instanceProto = pluginProto.Instance.prototype;

	instanceProto.onCreate = function()
	{
        this.strDelimiter = this.properties[0];
        this.isEvalMode = this.properties[1];
	    this.exp_CurX = 0;
	    this.exp_CurY = 0;
	    this.exp_CurValue = "";
	    this.exp_Width = 0;
	    this.exp_Height = 0;        
	};
	
	instanceProto.value_get = function(v)
	{
	    if (v == null)
	        v = 0;
	    else if (this.isEvalMode)
	        v = eval("("+v+")");
        
        return v;
	};
	
	instanceProto.saveToJSON = function ()
	{
		return { "delimiter": this.strDelimiter 
                     };
	};
	
	instanceProto.loadFromJSON = function (o)
	{
        this.strDelimiter = o["delimiter"];
	};
	//////////////////////////////////////
	// Conditions
	function Cnds() {};
	pluginProto.cnds = new Cnds();      
    
	Cnds.prototype.ForEachCell = function (csv_string)
	{
	    var table = window.rexObjs.CSVToArray(csv_string, this.strDelimiter);
		var yCnt = table.length;
		var xCnt = table[0].length;
		var i,j;
	    
        var current_frame = this.runtime.getCurrentEventStack();
        var current_event = current_frame.current_event;
		var solModifierAfterCnds = current_frame.isModifierAfterCnds();
			    
	    this.exp_Width = xCnt;
	    this.exp_Height = yCnt;                
        if (solModifierAfterCnds)
        {
		    for (j=0; j<yCnt; j++ )
	        {
	            this.exp_CurY = j;	            
	            for (i=0; i<xCnt; i++ )
	            {
                    this.runtime.pushCopySol(current_event.solModifiers);
                    
	                this.exp_CurX = i;
                    this.exp_CurValue = this.value_get(table[j][i]);                    
		    	    current_event.retrigger();
		    	    
		    	    this.runtime.popSol(current_event.solModifiers);
		        }
		    }	
	    }
	    else
	    {
		    for (j=0; j<yCnt; j++ )
	        {
	            this.exp_CurY = j;	            
	            for (i=0; i<xCnt; i++ )
	            {
	                this.exp_CurX = i;
                    this.exp_CurValue = this.value_get(table[j][i]);        
		    	    current_event.retrigger();
		        }
		    }	        
	    }

		return false;
	};  
	
	//////////////////////////////////////
	// Actions
	function Acts() {};
	pluginProto.acts = new Acts();

	var fake_ret = {value:0,
	                set_any: function(value){this.value=value;},
	                set_int: function(value){this.value=value;},	 
                    set_float: function(value){this.value=value;},	 
                    set_string: function(value){this.value=value;},	    
	               }; 
    Acts.prototype.CSV2Array = function (csv_string, array_objs, map_mode, zIndex)
	{  
	    assert2(cr.plugins_.Arr, "[CSV2Array] Error:No Array object found.");
	    	    
        var array_obj = array_objs.getFirstPicked();
        var is_array_inst = (array_obj instanceof cr.plugins_.Arr.prototype.Instance);
        assert2(is_array_inst, "[CSV2Array] Error:Need an array object.");

        var table = window.rexObjs.CSVToArray(csv_string, this.strDelimiter);        
		var xCnt = table.length;
		var yCnt = table[0].length;
		
		if (zIndex == null)
		{
		    zIndex = 0;
		    if (map_mode == 0)
		        cr.plugins_.Arr.prototype.acts.SetSize.apply(array_obj, [xCnt, yCnt, zIndex+1]);
	        else
		        cr.plugins_.Arr.prototype.acts.SetSize.apply(array_obj, [yCnt, xCnt, zIndex+1]);
		}
		else
		{
		    if (zIndex < 0)
		        zIndex = 0;
		    cr.plugins_.Arr.prototype.exps.Depth.call(array_obj, fake_ret);		    
		    var z_cnt = Math.max(fake_ret.value, zIndex+1);
		    if (map_mode == 0)
		        cr.plugins_.Arr.prototype.acts.SetSize.apply(array_obj, [xCnt, yCnt, z_cnt]);
	        else
		        cr.plugins_.Arr.prototype.acts.SetSize.apply(array_obj, [yCnt, xCnt, z_cnt]);
		}
		    
        var i,j,v;
		var setArrayFn = cr.plugins_.Arr.prototype.acts.SetXYZ;
		
		if (map_mode == 0)
		{
		    for(j=0;j<yCnt;j++)
		    {
		        for(i=0;i<xCnt;i++)
			    {
			        v = this.value_get(table[i][j]);
			        setArrayFn.apply(array_obj, [i,j,zIndex, v]);
			    }
		    }
        }	
        else
        {
		    for(j=0;j<yCnt;j++)
		    {
		        for(i=0;i<xCnt;i++)
			    {
			        v = this.value_get(table[i][j]);
			        setArrayFn.apply(array_obj, [j,i,zIndex, v]);
			    }
		    }
        }		
	};
    
	Acts.prototype.SetDelimiter = function (s)
	{
        this.strDelimiter = s;
	};     
	//////////////////////////////////////
	// Expressions
	function Exps() {};
	pluginProto.exps = new Exps();
    
	Exps.prototype.CurX = function (ret)
	{
		ret.set_int(this.exp_CurX);
	};
    
	Exps.prototype.CurY = function (ret)
	{
		ret.set_int(this.exp_CurY);
	};	
    
	Exps.prototype.CurValue = function (ret)
	{
		ret.set_any(this.exp_CurValue);
	};

	Exps.prototype.Width = function (ret)
	{
		ret.set_int(this.exp_Width);
	};
    
	Exps.prototype.Height = function (ret)
	{
		ret.set_int(this.exp_Height);
	};	    
	
	Exps.prototype.Delimiter = function (ret)
	{ 
		ret.set_string(this.strDelimiter);
	};     
}());