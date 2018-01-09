//Converted with C2C3AddonConverter v1.0.0.14
"use strict";

{
	const BEHAVIOR_ID = "Rex_LJ_potential";
	const BEHAVIOR_VERSION = "1.0.0.0";
	const BEHAVIOR_CATEGORY = "movements";
	const BEHAVIOR_CLASS = SDK.Behaviors.Rex_LJ_potential = class Rex_LJ_potential extends SDK.IBehaviorBase
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
				new SDK.PluginProperty("check", "source", true),
				new SDK.PluginProperty("text", "source-tag", ""),
				new SDK.PluginProperty("float", "a", 1),
				new SDK.PluginProperty("float", "n", 1),
				new SDK.PluginProperty("float", "b", 1),
				new SDK.PluginProperty("float", "m", 1),
				new SDK.PluginProperty("float", "sensitivity-range", 0),
				new SDK.PluginProperty("check", "target", false),
				new SDK.PluginProperty("text", "target-tag", "")
			]);
			SDK.Lang.PopContext();		// .properties
			SDK.Lang.PopContext();
		}
	};
	BEHAVIOR_CLASS.Register(BEHAVIOR_ID, BEHAVIOR_CLASS);
}
