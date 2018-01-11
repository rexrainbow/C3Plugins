"use strict";

{
	const PLUGIN_CLASS = SDK.Plugins.rex_bbcodeText;

	PLUGIN_CLASS.Instance = class rex_bbcodeTextInstance extends SDK.IWorldInstanceBase
	{
		constructor(sdkType, inst)
		{
			super(sdkType, inst);
		}
		Release()
		{
		}
		OnCreate()
		{
		}
		OnPropertyChanged(id, value)
		{
		}
		LoadC2Property(name, valueString)
		{
			return false;       // not handled
		}
		OnPlacedInLayout()
		{
		}
		Draw(iRenderer, iDrawParams)
		{
			// render placeholder
			iRenderer.SetAlphaBlend();
			iRenderer.SetColorFillMode();
			if (this.HadTextureError())
				iRenderer.SetColorRgba(0.25, 0, 0, 0.25);
			else
				iRenderer.SetColorRgba(1, 1, 0.1, 0.5);
			iRenderer.Quad(this._inst.GetQuad());
		}
	};
}
