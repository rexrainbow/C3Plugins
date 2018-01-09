//Converted with C2C3AddonConverter v1.0.0.7
"use strict";

{
	const BEHAVIOR_ID = "Rex_Zigzag";
	const BEHAVIOR_VERSION = "1.0.0.0";
	const BEHAVIOR_CATEGORY = "movements";
	const BEHAVIOR_CLASS = SDK.Behaviors.Rex_Zigzag = class Rex_Zigzag extends SDK.IBehaviorBase
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
				new SDK.PluginProperty("check", "activated", true),
				new SDK.PluginProperty("check", "start", true),
				new SDK.PluginProperty("check", "rotatable", true),
				new SDK.PluginProperty("integer", "repeat-count", 0),
				new SDK.PluginProperty("longtext", "commands", ""),
				new SDK.PluginProperty("float", "max-moving-speed", 400),
				new SDK.PluginProperty("float", "moving-acceleration", 0),
				new SDK.PluginProperty("float", "moving-deceleration", 0),
				new SDK.PluginProperty("float", "max-rotation-speed", 180),
				new SDK.PluginProperty("float", "rotation-acceleration", 0),
				new SDK.PluginProperty("float", "rotation-deceleration", 0),
				new SDK.PluginProperty("float", "initial-angle", 0),
				new SDK.PluginProperty("check", "precise-mode", false),
				new SDK.PluginProperty("check", "continued-mode", false)
			]);
			this._info.AddFileDependency({
				filename: "c2runtime/rex_zigzag.js",
				type: "inline-script"
				});					
			SDK.Lang.PopContext();		// .properties
			SDK.Lang.PopContext();
		}
	};
	BEHAVIOR_CLASS.Register(BEHAVIOR_ID, BEHAVIOR_CLASS);
}
