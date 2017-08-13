// ECMAScript 5 strict mode
"use strict";

assert2(cr, "cr namespace not created");
assert2(cr.plugins_, "cr.plugins_ not created");

/////////////////////////////////////
// Plugin class
cr.plugins_.Rex_CSV = function(runtime)
{
	this.runtime = runtime;
};

(function ()
{
	var pluginProto = cr.plugins_.Rex_CSV.prototype;
		
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
	    this.isInPreview = (typeof cr_is_preview !== "undefined");  
        this.strDelimiter = this.properties[0];
        this.isEvalMode = (this.properties[1] == 1);
        this.tables = {};
        this.currentPageName = null;
        this.currentTable = null;
        this.forPage = "";
        this.atCol = "";
        this.atRow = "";  
        this.atPage = "";  
        
        // turn to default page "_"
        this.TurnPage("_");          
        this.checkName = "CSV";   
        
        /**BEGIN-PREVIEWONLY**/
        this.dbg = {
            "pageName": "_",
            "colName" : ""
        };      
        /**END-PREVIEWONLY**/        
	};
	
	instanceProto.getValue = function(v)
	{
	    if (v == null)
	        v = 0;
	    else if (this.isEvalMode)
	        v = eval("("+v+")");
        
        return v;
	};	

	instanceProto.HasPage = function(page)
	{  
	    return (this.tables[page] != null);     
	};
	
	instanceProto.TurnPage = function(page)
	{  
        if (this.currentPageName === page)
            return;
        
        if (!this.HasPage(page))
        {
            this.tables[page] = new window.rexObjs.CSVKlass(this);
        }    
        this.currentPageName = page;
        this.currentTable = this.tables[page];       
	};

	instanceProto.Get = function (col, row, page)
	{
        this.atCol = col;
        this.atRow = row;
        if (page != null)
        {
            this.TurnPage(page);
        }
        this.atPage = this.currentPageName;  
        return this.currentTable.At(col,row);
	};

	instanceProto.Set = function (value, col, row, page)
	{
        this.atCol = col;
        this.atRow = row;
        if (page != null)
        {
            this.TurnPage(page);
        }
        this.atPage = this.currentPageName;  
        this.currentTable.SetCell(col, row, value);       
	};

	instanceProto.GetColCnt = function (page)
	{
        if (page != null)
        {
            this.TurnPage(page);
        }
        this.atPage = this.currentPageName;  
        return this.currentTable.GetColCnt();   
	};

	instanceProto.GetRowCnt = function (page)
	{
        if (page != null)
        {
            this.TurnPage(page);
        }
        this.atPage = this.currentPageName;  
        return this.currentTable.GetRowCnt();   
	}; 

	instanceProto.TableToString = function (page)
	{
        if (page != null)
        {
            this.TurnPage(page);
        }
        return this.currentTable.ToString();   
	};
	
	instanceProto.saveToJSON = function ()
	{
	    var page, tables={};
	    for (page in this.tables)	   
        {
            this.TurnPage(page);
	        tables[page] = {"d":this.currentTable.table, 
			                "k":this.currentTable.keys, 
							"i":this.currentTable.items}
		}
		return { "d": tables,
                      "delimiter": this.strDelimiter,
                   };
	};
	
	instanceProto.loadFromJSON = function (o)
	{
	    var tables = o["d"], table;
		var page;
		for (page in tables)
		{
		    this.TurnPage(page);
		    table = tables[page];
			this.currentTable.table = table["d"];
			this.currentTable.keys = table["k"];
			this.currentTable.items = table["i"];
		}
        
        this.strDelimiter = o["delimiter"];
	};
	
	/**BEGIN-PREVIEWONLY**/
	instanceProto.getDebuggerValues = function (propsections)
	{
	    var prop = [];
	    prop.push({"name": "Page", "value": this.dbg.pageName});
	    prop.push({"name": "Col", "value": this.dbg.colName});

        if (this.HasPage(this.dbg.pageName))
        {
	        var table = this.tables[this.dbg.pageName];
	        if (table.table[this.dbg.colName] != null)
	        {
	            var rows = table.items, r, d;
	            var i, cnt=rows.length;
	            for (i=0; i<cnt; i++)
	            {
	                r = rows[i];
	                d = table.At(this.dbg.colName,r);
	                prop.push({"name": "Row-"+r, "value": d});
	            }
	        }
	    }
		propsections.push({
			"title": this.type.name,
			"properties": prop
		});
	};
	
	instanceProto.onDebugValueEdited = function (header, name, value)
	{
		if (name == "Page")    // change page
		{
		    this.dbg.pageName = value;
		}
		else if (name == "Col")  // change col
		{		    
		    this.dbg.colName = value;
		}
		else if (name.substring(0,4) == "Row-") // set cell value
		{	        
		    if (this.HasPage(this.dbg.pageName))
		    {
		        var r = name.substring(4);
		        var table = this.tables[this.dbg.pageName];
		        if ((table.keys.indexOf(this.dbg.colName) != (-1)) && 
                    (table.items.indexOf(r) != (-1))                 )
                {
                    table.SetCell(this.dbg.colName, r, value);  
                }		       
		    }
	    }
	};
	/**END-PREVIEWONLY**/
	//////////////////////////////////////
	// Conditions
	function Cnds() {};
	pluginProto.cnds = new Cnds();
    
	Cnds.prototype.ForEachCol = function ()
	{
        this.currentTable.ForEachCol();
		return false;
	};    

	Cnds.prototype.ForEachRowInCol = function (col)
	{
        this.currentTable.ForEachRowInCol(col);
		return false;
	}; 
    
	Cnds.prototype.ForEachPage = function ()
	{   
        var current_frame = this.runtime.getCurrentEventStack();
        var current_event = current_frame.current_event;
		var solModifierAfterCnds = current_frame.isModifierAfterCnds();
		
		this.forPage = "";
        var tables = this.tables;
        var page;
        
		for (page in tables)
	    {
		    if (solModifierAfterCnds)
                this.runtime.pushCopySol(current_event.solModifiers);
                
            this.forPage = page;
            this.TurnPage(page);
		    current_event.retrigger();
		    	
            if (solModifierAfterCnds)
		        this.runtime.popSol(current_event.solModifiers);
		}        

		this.forPage = "";
		return false;        
	};    
    
	Cnds.prototype.ForEachRow = function ()
	{
        this.currentTable.ForEachRow();
		return false;
	};    

	Cnds.prototype.ForEachColInRow = function (row)
	{
        this.currentTable.ForEachColInRow(row);
		return false;
	}; 	

	Cnds.prototype.IsDataInCol = function (data, col_name)
	{
		if (!(this.currentTable.keys.indexOf(col_name) != (-1)))
		    return false;    
	    var table = this.currentTable.table;
	    var col_data = table[col_name], row_name;
		var matched = false;
		for (row_name in col_data)
		{
		    if (col_data[row_name] == data)
			{
			    matched = true;
				break;
			}
		}
		return matched;
	}; 

	Cnds.prototype.IsDataInRow = function (data, row_name)
	{
		if (!(this.currentTable.items.indexOf(row_name) != (-1)))
		    return false;    
	    var table = this.currentTable.table;
	    var col_name;
		var matched = false;
		for (col_name in table)
		{
		    if (table[col_name][row_name] == data)
			{
			    matched = true;
				break;
			}
		}
		return matched;
	}; 

    // cf_deprecated
	Cnds.prototype.IsKeyInCol = function (key)
	{
        return (this.currentTable.keys.indexOf(key) != (-1));     
	};
    // cf_deprecated

    // cf_deprecated    
	Cnds.prototype.IsKeyInRow = function (key)
	{
        return (this.currentTable.items.indexOf(key) != (-1));
	};
    // cf_deprecated    

	Cnds.prototype.IsCellValid = function (col, row)
	{
        return ((this.currentTable.keys.indexOf(col) != (-1)) && 
                (this.currentTable.items.indexOf(row) != (-1))   );
	};	

	Cnds.prototype.HasCol = function (col)
	{
        return (this.currentTable.keys.indexOf(col) != (-1));
	};	    

	Cnds.prototype.HasRow = function (row)
	{
        return (this.currentTable.items.indexOf(row) != (-1));
	};	     
	//////////////////////////////////////
	// Actions
	function Acts() {};
	pluginProto.acts = new Acts();
    
	Acts.prototype.LoadCSV = function (csv_string)
	{         
        this.currentTable._parsing(csv_string);
	};
    
	Acts.prototype.SetCell = function (col, row, val)
	{
        this.currentTable.SetCell(col, row, val);       
	};
    
	Acts.prototype.Clear = function ()
	{
		 this.currentTable.Clear();
	};    
    
	Acts.prototype.ConvertRow = function (row, to_type)
	{
         this.currentTable.ConvertRow(row, to_type);
	};   
    
	Acts.prototype.TurnPage = function (page)
	{
         this.TurnPage(page);
	};
    
	Acts.prototype.StringToPage = function (jsonString)
	{
        this.currentTable.JSONString2Page(jsonString);
	};    
    
	Acts.prototype.StringToPage = function (jsonString)
	{
        this.currentTable.JSONString2Page(jsonString);
	};   
    
	Acts.prototype.AppendCol = function (col, init_value)
	{
        this.currentTable.AppendCol(col, init_value);
	}; 
    
	Acts.prototype.AppendRow = function (row, init_value)
	{
        this.currentTable.AppendRow(row, init_value);
	}; 
    
	Acts.prototype.RemoveCol = function (col)
	{
        if (typeof (col) === "number")
        {
            var cols = this.currentTable.keys;
            col = cols[col];
        }
        
        this.currentTable.RemoveCol(col);
	}; 
    
	Acts.prototype.RemoveRow = function (row)
	{
        if (typeof (row) === "number")
        {
            var rows = this.currentTable.items;
            row = rows[row];
        }  
        
        this.currentTable.RemoveRow(row);
	};     
    
	Acts.prototype.SetDelimiter = function (s)
	{
        this.strDelimiter = s;
	}; 

	Acts.prototype.StringToAllTables = function (jsonString)
	{   
	    var page;
	    var tables=JSON.parse(jsonString);
	    for (page in tables)
	    {
	        this.TurnPage(page);
	        this.currentTable.JSONString2Page(tables[page]);
	    }
	};
    
	Acts.prototype.SortCol = function (col, is_increasing)
	{
        this.currentTable.SortCol(col, is_increasing);
	};
    
	Acts.prototype.SortRow = function (row, is_increasing)
	{
        this.currentTable.SortRow(row, is_increasing);
	}; 
    
	Acts.prototype.SetCellAtPage = function (col, row, page, val)
	{
        this.TurnPage(page);
        this.currentTable.SetCell(col, row, val);       
	};
    
	Acts.prototype.AddToCell = function (col, row, val)
	{
        var value = this.Get(col, row) || 0;        
        this.currentTable.SetCell(col, row, value + val);       
	};
    
	Acts.prototype.AddToCellAtPage = function (col, row, page, val)
	{
        var value = this.Get(col, row, page) || 0;  
        this.TurnPage(page);
        this.currentTable.SetCell(col, row, value + val);       
	};

	Acts.prototype.ConvertCol = function (col, to_type)
	{
         this.currentTable.ConvertCol(col, to_type);
	};    
	//////////////////////////////////////
	// Expressions
	function Exps() {};
	pluginProto.exps = new Exps();
    
	Exps.prototype.At = function (ret, col, row, page, default_value)
	{  
        if (page != null)        
            this.TurnPage(page);  
        
        if (typeof (col) === "number")
        {
            var cols = this.currentTable.keys;
            col = cols[col];
        }
        if (typeof (row) === "number")
        {
            var rows = this.currentTable.items;
            row = rows[row];
        }        
        
        var value = this.Get(col, row, page);
        if (value == null)
            value = (default_value == null)? 0 : default_value;        
        ret.set_any(value);
	}; 
    
	Exps.prototype.CurCol = function (ret)
	{
		ret.set_string(this.currentTable.forCol);
	};
	
	Exps.prototype.CurRow = function (ret)
	{
		ret.set_string(this.currentTable.forRow);
	};
	
	Exps.prototype.CurValue = function (ret)
	{
		ret.set_any(this.currentTable.At( this.currentTable.forCol, this.currentTable.forRow ));
	}; 

	Exps.prototype.AtCol = function (ret)
	{
		ret.set_string(this.atCol);
	};
	
	Exps.prototype.AtRow = function (ret)
	{
		ret.set_string(this.atRow);
	};   
	
	Exps.prototype.AtPage = function (ret)
	{
		ret.set_string(this.atPage);
	}; 
	
	Exps.prototype.CurPage = function (ret)
	{
		ret.set_string(this.forPage);
	};
	
	Exps.prototype.TableToString = function (ret, page)
	{ 
		ret.set_string(this.TableToString(page));
	};    
	
	Exps.prototype.ColCnt = function (ret, page)
	{
		ret.set_int(this.GetColCnt(page));
	};
	
	Exps.prototype.RowCnt = function (ret, page)
	{ 
		ret.set_int(this.GetRowCnt(page));
	}; 
	
	Exps.prototype.Delimiter = function (ret)
	{ 
		ret.set_string(this.strDelimiter);
	}; 
	
	Exps.prototype.AllTalbesToString = function (ret)
	{ 
	    var page, table2string={};
	    for (page in this.tables)	    
	        table2string[page] = this.TableToString(page);        
		ret.set_string(JSON.stringify(table2string));
	};
	
	Exps.prototype.TableToCSV = function (ret)
	{ 
		ret.set_string(this.currentTable.ToCSVString());
	}; 	
	
	Exps.prototype.NextCol = function (ret, col)
	{ 
        if (col == null) 
            col = this.atCol;
        
        var cols = this.currentTable.keys;
        var idx = cols.indexOf(col);
        var next_col;
        if (idx !== -1)
            next_col = cols[idx+1];
        
		ret.set_string(next_col || "");
	}; 	
	
	Exps.prototype.PreviousCol = function (ret, col)
	{ 
        if (col == null) 
            col = this.atCol;
        
        var cols = this.currentTable.keys;
        var idx = cols.indexOf(col);
        var next_col;
        if (idx !== -1)
            next_col = cols[idx-1];
        
		ret.set_string(next_col || "");
	};
	
	Exps.prototype.NextRow = function (ret, row)
	{ 
        if (row == null) 
            row = this.atRow;
        
        var rows = this.currentTable.items;
        var idx = rows.indexOf(row);
        var next_row;
        if (idx !== -1)
            next_row = rows[idx+1];
        
		ret.set_string(next_row || "");
	}; 	
	
	Exps.prototype.PreviousRow = function (ret, row)
	{ 
        if (row == null) 
            row = this.atRow;
        
        var rows = this.currentTable.items;
        var idx = rows.indexOf(row);
        var next_row;
        if (idx !== -1)
            next_row = rows[idx-1];
        
		ret.set_string(next_row || "");
	};
}());
