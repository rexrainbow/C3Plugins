"use strict";

{
	const PLUGIN_CLASS = SDK.Plugins.Rex_PatternGen;

	PLUGIN_CLASS.Type = class Rex_PatternGenType extends SDK.ITypeBase
	{
		constructor(sdkPlugin, iObjectType)
		{
			super(sdkPlugin, iObjectType);
		}
	};
}
