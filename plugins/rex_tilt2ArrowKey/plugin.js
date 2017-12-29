//Converted with C2C3AddonConverter v1.0.0.14
"use strict";

{
	const PLUGIN_ID = "Rex_Tilt2ArrowKey";
	const PLUGIN_VERSION = "0.1.0.0";
	const PLUGIN_CATEGORY = "input";

	let app = null;

	const PLUGIN_CLASS = SDK.Plugins.Rex_Tilt2ArrowKey = class Rex_Tilt2ArrowKey extends SDK.IPluginBase
	{
		constructor()
		{
			super(PLUGIN_ID);
			SDK.Lang.PushContext("plugins." + PLUGIN_ID.toLowerCase());
			this._info.SetIcon("icon.png", "image/png");
			this._info.SetName(lang(".name"));
			this._info.SetDescription(lang(".description"));
			this._info.SetVersion(PLUGIN_VERSION);
			this._info.SetCategory(PLUGIN_CATEGORY);
			this._info.SetAuthor("Rex.Rainbow");
			this._info.SetHelpUrl(lang(".help-url"));
			this._info.SetIsSingleGlobal(true);
			this._info.SetIsDeprecated(false);
			this._info.SetSupportsEffects(false);
			this._info.SetMustPreDraw(false);
			this._info.SetCanBeBundled(false);
			SDK.Lang.PushContext(".properties");
			this._info.SetProperties([
				new SDK.PluginProperty("combo", "calibration", {initialValue:"0", items:["0","current angle"]}),
				new SDK.PluginProperty("combo", "directions", {initialValue:"8 directions", items:["up & down","left & right","4 directions","8 directions"]}),
				new SDK.PluginProperty("float", "sensitivity", 5)
			]);
			SDK.Lang.PopContext();		// .properties
			SDK.Lang.PopContext();
		}
	};
	PLUGIN_CLASS.Register(PLUGIN_ID, PLUGIN_CLASS);
}
