"use strict";

{
	const PLUGIN_CLASS = SDK.Plugins.Rex_Tilt2ArrowKey;

	PLUGIN_CLASS.Instance = class Rex_Tilt2ArrowKeyInstance extends SDK.IInstanceBase
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
	};
}
