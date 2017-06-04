"use strict";

{
	const PLUGIN_CLASS = SDK.Plugins.Rex_jsshell;

	PLUGIN_CLASS.Type = class Rex_jsshellType extends SDK.ITypeBase
	{
		constructor(sdkPlugin, iObjectType)
		{
			super(sdkPlugin, iObjectType);
		}
	};
}
