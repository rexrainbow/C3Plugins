"use strict";

{
	const PLUGIN_CLASS = SDK.Plugins.Rex_TimeLine;

	PLUGIN_CLASS.Type = class Rex_TimeLineType extends SDK.ITypeBase
	{
		constructor(sdkPlugin, iObjectType)
		{
			super(sdkPlugin, iObjectType);
		}
	};
}
