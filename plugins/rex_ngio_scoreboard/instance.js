"use strict";

{
	const PLUGIN_CLASS = SDK.Plugins.Rex_NGIO_Scoreboard;

	PLUGIN_CLASS.Instance = class Rex_NGIO_ScoreboardInstance extends SDK.IInstanceBase
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
