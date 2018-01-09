//Converted with C2C3AddonConverter v1.0.0.14
"use strict";

{
	const PLUGIN_ID = "Rex_ListCtrl";
	const PLUGIN_VERSION = "0.1.0.0";
	const PLUGIN_CATEGORY = "other";

	let app = null;

	const PLUGIN_CLASS = SDK.Plugins.Rex_ListCtrl = class Rex_ListCtrl extends SDK.IPluginBase
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
			this._info.SetIsRotatable(false);
			this._info.SetHasImage(false);
			this._info.SetIsTiled(false);
			this._info.SetIsSingleGlobal(false);
			this._info.SetIsDeprecated(false);
			this._info.SetSupportsEffects(false);
			this._info.SetMustPreDraw(false);
			this._info.SetCanBeBundled(false);
			this._info.AddCommonPositionACEs();
			this._info.AddCommonSizeACEs();
			this._info.AddCommonAppearanceACEs();
			this._info.AddCommonZOrderACEs();
			SDK.Lang.PushContext(".properties");
			this._info.SetProperties([
				new SDK.PluginProperty("color", "color", [0, 0, 0]),				
				new SDK.PluginProperty("float", "line-height", 30),
				new SDK.PluginProperty("integer", "total-lines", 10),
				new SDK.PluginProperty("check", "clamp-oy", true),
				new SDK.PluginProperty("combo", "axis", {initialValue:"vertical", items:["horizontal","vertical"]}),
				new SDK.PluginProperty("combo", "hotspot", {initialValue:"top-left", items:["top-left","top","top-right","left","center","right","bottom-left","bottom","bottom-right"]})
			]);
			SDK.Lang.PopContext();		// .properties
			SDK.Lang.PopContext();
		}
	};
	PLUGIN_CLASS.Register(PLUGIN_ID, PLUGIN_CLASS);
}
