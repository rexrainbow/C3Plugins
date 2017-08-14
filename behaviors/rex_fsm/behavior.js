//Converted with C2C3AddonConverter v1.0.0.6
"use strict";

{
	const BEHAVIOR_ID = "Rex_FSM";
	const BEHAVIOR_VERSION = "0.1.0.0";
	const BEHAVIOR_CATEGORY = "attributes";
	const BEHAVIOR_CLASS = SDK.Behaviors.Rex_FSM = class Rex_FSM extends SDK.IBehaviorBase
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
				new SDK.PluginProperty("combo", "activated", {initialValue:"yes", items:["no","yes"]}),
				new SDK.PluginProperty("text", "initial-state", "Off")
			]);
			this._info.AddFileDependency({
				filename: "c2runtime/fsm.js",
				type: "inline-script"
				});					
			SDK.Lang.PopContext();		// .properties
			SDK.Lang.PopContext();
		}
	};
	BEHAVIOR_CLASS.Register(BEHAVIOR_ID, BEHAVIOR_CLASS);
}
