"use strict";

{
	const PLUGIN_CLASS = SDK.Plugins.Rex_Layouter;

	PLUGIN_CLASS.Instance = class Rex_LayouterInstance extends SDK.IWorldInstanceBase
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
			this.ChangeHotspot(this._inst.GetPropertyValue("hotspot"));
		}
		OnPropertyChanged(id, value)
		{
			if(id === "hotspot")
			{
				this.ChangeHotspot(value);
			}			
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
			iRenderer.SetColorRgba(1, 0.50, 0.48, 1);
			iRenderer.Quad(this._inst.GetQuad());
		}

		ChangeHotspot(value)
		{
			switch(value)
			{
				case "top-left" :
					this._inst.SetOrigin(0, 0);
					break;
				case "top" :
					this._inst.SetOrigin(0.5, 0);
					break;
				case "top-right" :
					this._inst.SetOrigin(1, 0);
					break;
				case "left" :
					this._inst.SetOrigin(0, 0.5);
					break;
				case "center" :
					this._inst.SetOrigin(0.5, 0.5);
					break;
				case "right" :
					this._inst.SetOrigin(1, 0.5);
					break;
				case "bottom-left" :
					this._inst.SetOrigin(0, 1);
					break;
				case "bottom" :
					this._inst.SetOrigin(0.5, 1);
					break;
				case "bottom-right" :
					this._inst.SetOrigin(1, 1);
					break;
			}
		}		
	};
}