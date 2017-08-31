"use strict";

{
	const PLUGIN_CLASS = SDK.Plugins.Rex_Random;

	PLUGIN_CLASS.Type = class Rex_RandomType extends SDK.ITypeBase
	{
		constructor(sdkPlugin, iObjectType)
		{
			super(sdkPlugin, iObjectType);
		}
	};
}
