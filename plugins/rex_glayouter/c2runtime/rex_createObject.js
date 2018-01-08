
(function () {
	if (!window.rexObjs)
		window.rexObjs = {};

	// general CreateObject function which call a callback before "OnCreated" triggered
	if (window.rexObjs.CreateObject)
		return;

	// copy from system action: CreateObject
	window.rexObjs.CreateObject = function (obj, layer, x, y, callback, ignore_picking) {
		if (!layer || !obj)
			return;

		var inst = this.runtime.createInstance(obj, layer, x, y);

		if (!inst)
			return;

		this.runtime.isInOnDestroy++;

		// call callback before "OnCreated" triggered
		if (callback)
			callback(inst);
		// call callback before "OnCreated" triggered

		var i, len, s;
		this.runtime.trigger(Object.getPrototypeOf(obj.plugin).cnds.OnCreated, inst);

		if (inst.is_contained) {
			for (i = 0, len = inst.siblings.length; i < len; i++) {
				s = inst.siblings[i];
				this.runtime.trigger(Object.getPrototypeOf(s.type.plugin).cnds.OnCreated, s);
			}
		}

		this.runtime.isInOnDestroy--;

		if (ignore_picking !== true) {
			// Pick just this instance
			var sol = obj.getCurrentSol();
			sol.select_all = false;
			sol.instances.length = 1;
			sol.instances[0] = inst;

			// Siblings aren't in instance lists yet, pick them manually
			if (inst.is_contained) {
				for (i = 0, len = inst.siblings.length; i < len; i++) {
					s = inst.siblings[i];
					sol = s.type.getCurrentSol();
					sol.select_all = false;
					sol.instances.length = 1;
					sol.instances[0] = s;
				}
			}
		}

		// add solModifiers
		//var current_event = this.runtime.getCurrentEventStack().current_event;
		//current_event.addSolModifier(obj);
		// add solModifiers

		return inst;
	};
}());
