"use strict";

{
	const BEHAVIOR_CLASS = SDK.Behaviors.Rex_Button2;

	BEHAVIOR_CLASS.Instance = class Rex_Button2Instance extends SDK.IBehaviorInstanceBase
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
