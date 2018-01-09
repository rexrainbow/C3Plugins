//Converted with C2C3AddonConverter v1.0.0.10
"use strict";

{
	const PLUGIN_ID = "Rex_PromptWrap";
	const PLUGIN_VERSION = "0.1.0.0";
	const PLUGIN_CATEGORY = "other";

	let app = null;

	const PLUGIN_CLASS = SDK.Plugins.Rex_PromptWrap = class Rex_PromptWrap extends SDK.IPluginBase
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
			SDK.Lang.PushContext(".properties");
			this._info.SetProperties([
				new SDK.PluginProperty("check", "enable-wrap", true)
			]);
			SDK.Lang.PopContext();		// .properties
			SDK.Lang.PopContext();
		}
	};
	PLUGIN_CLASS.Register(PLUGIN_ID, PLUGIN_CLASS);
}
