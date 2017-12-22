"use strict";

{
	const PLUGIN_CLASS = SDK.Plugins.Rex_Scenario;

	PLUGIN_CLASS.Type = class Rex_ScenarioType extends SDK.ITypeBase
	{
		constructor(sdkPlugin, iObjectType)
		{
			super(sdkPlugin, iObjectType);
		}
	};
}
