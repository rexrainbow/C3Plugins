//Converted with C2C3AddonConverter v1.0.0.14
"use strict";

{
	const BEHAVIOR_ID = "Rex_layouter_cyclic";
	const BEHAVIOR_VERSION = "1.0.0.0";
	const BEHAVIOR_CATEGORY = "other";
	const BEHAVIOR_CLASS = SDK.Behaviors.Rex_layouter_cyclic = class Rex_layouter_cyclic extends SDK.IBehaviorBase
	{
		constructor()
		{
			super(BEHAVIOR_ID);
			SDK.Lang.PushContext("behaviors." + BEHAVIOR_ID.toLowerCase());
			this._info.SetIcon("icon.png", "image/png");
			this._info.SetName(lang(".name"));
			this._info.SetDescription(lang(".description"));
			this._info.SetVersion(BEHAVIOR_VERSION);
			this._info.SetCategory(BEHAVIOR_CATEGORY);
			this._info.SetAuthor("Rex.Rainbow");
			this._info.SetHelpUrl(lang(".help-url"));
			this._info.SetIsOnlyOneAllowed(true);
			SDK.Lang.PushContext(".properties");
			this._info.SetProperties([
				new SDK.PluginProperty("combo", "shape", {initialValue:"circle", items:["circle","ellipse"]}),
				new SDK.PluginProperty("combo", "mode", {initialValue:"average", items:["average","fix"]}),
				new SDK.PluginProperty("float", "start-angle", 0),
				new SDK.PluginProperty("float", "range-angle", 360),
				new SDK.PluginProperty("float", "delta-angle", 15),
				new SDK.PluginProperty("float", "angle-offset", 0)
			]);
			SDK.Lang.PopContext();		// .properties
			SDK.Lang.PopContext();
		}
	};
	BEHAVIOR_CLASS.Register(BEHAVIOR_ID, BEHAVIOR_CLASS);
}
