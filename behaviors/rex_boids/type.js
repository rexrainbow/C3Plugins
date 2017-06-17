"use strict";

{
	const BEHAVIOR_CLASS = SDK.Behaviors.Rex_Boids;

	BEHAVIOR_CLASS.Type = class Rex_BoidsType extends SDK.IBehaviorTypeBase
	{
		constructor(sdkPlugin, iBehaviorType)
		{
			super(sdkPlugin, iBehaviorType);
		}
	};
}
