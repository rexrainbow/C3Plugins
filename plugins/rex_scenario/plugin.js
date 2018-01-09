//Converted with C2C3AddonConverter v1.0.0.14
"use strict";

{
	const PLUGIN_ID = "Rex_Scenario";
	const PLUGIN_VERSION = "0.1.0.0";
	const PLUGIN_CATEGORY = "other";

	let app = null;

	const PLUGIN_CLASS = SDK.Plugins.Rex_Scenario = class Rex_Scenario extends SDK.IPluginBase
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
			this._info.SetIsSingleGlobal(false);
			this._info.SetIsDeprecated(false);
			this._info.SetSupportsEffects(false);
			this._info.SetMustPreDraw(false);
			this._info.SetCanBeBundled(false);
			SDK.Lang.PushContext(".properties");
			this._info.SetProperties([
				new SDK.PluginProperty("check", "debug-mode", false),
				new SDK.PluginProperty("combo", "time-stamp", {initialValue:"differential", items:["accumulation","differential"]}),
				new SDK.PluginProperty("check", "eval-mode", true),
				new SDK.PluginProperty("check", "sync-timescale", true),
				new SDK.PluginProperty("check", "mustache", true),
				new SDK.PluginProperty("text", "left-delimiter", "{{"),
				new SDK.PluginProperty("text", "right-delimiter", "}}")
			]);
			this._info.AddFileDependency({
				filename: "c2runtime/rex_scenario.js",
				type: "inline-script"
			});
			this._info.AddFileDependency({
				filename: "c2runtime/rex_csvToArray.js",
				type: "inline-script"
			});					
			this._info.AddFileDependency({
				filename: "mustache.min.js",
				type: "external-script"
				});
			SDK.Lang.PopContext();		// .properties
			SDK.Lang.PopContext();
		}
	};
	PLUGIN_CLASS.Register(PLUGIN_ID, PLUGIN_CLASS);
}
