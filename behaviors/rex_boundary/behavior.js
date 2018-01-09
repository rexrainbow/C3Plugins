//Converted with C2C3AddonConverter v1.0.0.7
"use strict";

{
	const BEHAVIOR_ID = "Rex_boundary";
	const BEHAVIOR_VERSION = "1.0.0.0";
	const BEHAVIOR_CATEGORY = "movements";
	const BEHAVIOR_CLASS = SDK.Behaviors.Rex_boundary = class Rex_boundary extends SDK.IBehaviorBase
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
			this._info.SetIsOnlyOneAllowed(false);
			SDK.Lang.PushContext(".properties");
			this._info.SetProperties([
				new SDK.PluginProperty("combo", "mode", {initialValue:"clamp", items:["clamp","wrap","mod wrap"]}),
				new SDK.PluginProperty("combo", "align", {initialValue:"origin", items:["origin","boundaries"]}),
				new SDK.PluginProperty("check", "horizontal", false),
				new SDK.PluginProperty("float", "left", 0),
				new SDK.PluginProperty("float", "right", 0),
				new SDK.PluginProperty("check", "vertical", false),
				new SDK.PluginProperty("float", "top", 0),
				new SDK.PluginProperty("float", "bottom", 0)
			]);
			SDK.Lang.PopContext();		// .properties
			SDK.Lang.PopContext();
		}
	};
	BEHAVIOR_CLASS.Register(BEHAVIOR_ID, BEHAVIOR_CLASS);
}
