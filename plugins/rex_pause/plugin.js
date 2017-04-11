"use strict";

{
    const PLUGIN_ID = "Rex_Pause";
    ////////////////////////////////////////////
    
    const PLUGIN_VERSION = "1.0.0.0";
    const PLUGIN_CATEGORY = "general";
    
    let app = null;
    
    const PLUGIN_CLASS = SDK.Plugins.Rex_Pause = class Rex_Pause extends SDK.IPluginBase
    {
        constructor()
        {
            super(PLUGIN_ID);
            
            SDK.Lang.PushContext("plugins.rex_pause");
            this._info.SetIcon("icon.png", "image/png");
            this._info.SetName(lang(".name"));
            this._info.SetDescription(lang(".description"));
            this._info.SetVersion(PLUGIN_VERSION);
            this._info.SetCategory(PLUGIN_CATEGORY);
            this._info.SetAuthor("Rex.Rainbow");
            this._info.SetHelpUrl(lang(".help-url"));
            this._info.SetIsSingleGlobal(true);
            
            SDK.Lang.PushContext(".properties");
            
            this._info.SetProperties([
            ]);
            
            SDK.Lang.PopContext();		// .properties
            
            SDK.Lang.PopContext();
        }
    };
    
    PLUGIN_CLASS.Register(PLUGIN_ID, PLUGIN_CLASS);
}