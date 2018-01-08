//Converted with C2C3AddonConverter v1.0.0.14
"use strict";

{
	const BEHAVIOR_ID = "Rex_layouter_linear";
	const BEHAVIOR_VERSION = "1.0.0.0";
	const BEHAVIOR_CATEGORY = "other";
	const BEHAVIOR_CLASS = SDK.Behaviors.Rex_layouter_linear = class Rex_layouter_linear extends SDK.IBehaviorBase
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
				new SDK.PluginProperty("combo", "mode", {initialValue:"fix", items:["average","fix"]}),
				new SDK.PluginProperty("combo", "direction", {initialValue:"left to right", items:["left to right","right to left","top to bottom","bottom to top"]}),
				new SDK.PluginProperty("combo", "alignment", {initialValue:"start", items:["start","center","end"]}),
				new SDK.PluginProperty("float", "spacing", 40)
			]);
			SDK.Lang.PopContext();		// .properties
			SDK.Lang.PopContext();
		}
	};
	BEHAVIOR_CLASS.Register(BEHAVIOR_ID, BEHAVIOR_CLASS);
}
