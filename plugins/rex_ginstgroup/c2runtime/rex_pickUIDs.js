(function () {
    if (!window.rexObjs)
        window.rexObjs = {};

    // general pick instances function
    if (window.rexObjs.PickUIDs)
        return;

	var _uidmap = {};
	var PickUIDs = function (uids, objtype, checkCb) {
		var sol = objtype.getCurrentSol();
		sol.instances.length = 0;
		sol.select_all = false;
		var isFamily = objtype.is_family;
		var members, memberCnt, i;
		if (isFamily) {
			members = objtype.members;
			memberCnt = members.length;
		}
		var i, j, uid_cnt = uids.length;
		for (i = 0; i < uid_cnt; i++) {
			var uid = uids[i];
			if (uid == null)
				continue;

			if (_uidmap.hasOwnProperty(uid))
				continue;
			_uidmap[uid] = true;

			var inst = this.runtime.getObjectByUID(uid);
			if (inst == null)
				continue;
			if ((checkCb != null) && (!checkCb(uid)))
				continue;

			var typeName = inst.type.name;
			if (isFamily) {
				for (j = 0; j < memberCnt; j++) {
					if (typeName == members[j].name) {
						sol.instances.push(inst);
						break;
					}
				}
			} else {
				if (typeName == objtype.name) {
					sol.instances.push(inst);
				}
			}
		}
		objtype.applySolToContainer();

		for (var k in _uidmap)
			delete _uidmap[k];

		return (sol.instances.length > 0);
	};

	window.rexObjs.PickUIDs = PickUIDs;
}());
