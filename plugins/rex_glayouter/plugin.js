//Converted with C2C3AddonConverter v1.0.0.14
"use strict";

{
	const PLUGIN_ID = "Rex_Layouter";
	const PLUGIN_VERSION = "0.1.0.0";
	const PLUGIN_CATEGORY = "other";

	let app = null;

	const PLUGIN_CLASS = SDK.Plugins.Rex_Layouter = class Rex_Layouter extends SDK.IPluginBase
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
			this._info.SetPluginType("world");
			this._info.SetIsResizable(true);
			this._info.SetIsRotatable(true);
			this._info.SetHasImage(false);
			this._info.SetIsTiled(false);
			this._info.SetIsSingleGlobal(false);
			this._info.SetIsDeprecated(false);
			this._info.SetSupportsEffects(false);
			this._info.SetMustPreDraw(false);
			this._info.SetCanBeBundled(false);
			this._info.AddCommonPositionACEs();
			this._info.AddCommonSizeACEs();
			this._info.AddCommonAngleACEs();
			this._info.AddCommonAppearanceACEs();
			this._info.AddCommonZOrderACEs();
			SDK.Lang.PushContext(".properties");
			this._info.SetProperties([
				new SDK.PluginProperty("combo", "pin-mode", {initialValue:"none", items:["none","position & angle","position only","angle only"]}),
				new SDK.PluginProperty("combo", "hotspot", {initialValue:"top-left", items:["top-left","top","top-right","left","center","right","bottom-left","bottom","bottom-right"]})
			]);
			this._info.AddFileDependency({
				filename: "c2runtime/rex_createObject.js",
				type: "inline-script"
				});					
			SDK.Lang.PopContext();		// .properties
			SDK.Lang.PopContext();
		}
	};
	PLUGIN_CLASS.Register(PLUGIN_ID, PLUGIN_CLASS);
}
