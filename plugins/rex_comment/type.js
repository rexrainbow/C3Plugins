"use strict";

{
	const PLUGIN_CLASS = SDK.Plugins.Rex_Comment;

	PLUGIN_CLASS.Type = class Rex_CommentType extends SDK.ITypeBase
	{
		constructor(sdkPlugin, iObjectType)
		{
			super(sdkPlugin, iObjectType);
		}
	};
}
