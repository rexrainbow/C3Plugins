"use strict";

{
	const BEHAVIOR_CLASS = SDK.Behaviors.Rex_pinOffsetXY;

	BEHAVIOR_CLASS.Instance = class Rex_pinOffsetXYInstance extends SDK.IBehaviorInstanceBase
	{
		constructor(sdkBehType, behInst)
		{
			super(sdkBehType, behInst);
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
