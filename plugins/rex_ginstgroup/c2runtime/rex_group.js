(function () {
	if (!window.rexObjs)
		window.rexObjs = {};

	// general pick instances function
	if (window.rexObjs.GroupKlass)
		return;

	var GroupKlass = function () {
		this._set = {};
		this._list = [];
	};
	var GroupKlassProto = GroupKlass.prototype;

	GroupKlassProto.Clean = function () {
		var key;
		for (key in this._set)
			delete this._set[key];
		this._list.length = 0;
		return this;
	};

	GroupKlassProto.Copy = function (group) {
		var key, table;
		table = this._set;
		for (key in table)
			delete this._set[key];
		table = group._set;
		for (key in table)
			this._set[key] = table[key];
		cr.shallowAssignArray(this._list, group._list);
		return this;
	};

	GroupKlassProto.SetByUIDList = function (uidList, can_repeat) {
		if (can_repeat) // special case
		{
			cr.shallowAssignArray(this._list, uidList);
			var listLen = uidList.length;
			var i, key, table;
			table = this._set;
			for (key in table)
				delete this._set[key];
			for (i = 0; i < listLen; i++)
				this._set[uidList[i]] = true;
		} else {
			this.Clean();
			this.AddUID(uidList);
		}
		return this;
	};

	GroupKlassProto.AddUID = function (_uid) // single number, number list
	{
		if (typeof (_uid) === "object") // uid list      
		{
			var i, uid, cnt = _uid.length;
			for (i = 0; i < cnt; i++) {
				uid = _uid[i];
				if (this._set[uid] == null) // not in group
				{
					this._set[uid] = true;
					this._list.push(uid); // push back
				}
				// else ingored 
			}
		} else // single number
		{
			if (this._set[_uid] == null) // not in group
			{
				this._set[_uid] = true;
				this._list.push(_uid); // push back
			}
			// else ingored 
		}
		return this;
	};

	GroupKlassProto.PushUID = function (_uid, isFront) // single number, number list
	{
		if (typeof (_uid) === "object") // uid list      
		{
			var i, uid, cnt = _uid.length;
			for (i = 0; i < cnt; i++) {
				uid = _uid[i];
				if (this._set[uid] == null)
					this._set[uid] = true;
				else // remove existed item in this._list
					cr.arrayRemove(this._list, this._list.indexOf(uid));
			}

			// add uid ( no repeating check )
			if (isFront)
				this._list.unshift.apply(this._list, _uid); // push front
			else
				this._list.push.apply(this._list, _uid); // push back	  

		} else // single number
		{
			if (this._set[_uid] == null)
				this._set[_uid] = true;
			else // remove existed item in this._list
				cr.arrayRemove(this._list, this._list.indexOf(_uid));


			// add uid
			if (isFront)
				this._list.unshift(_uid); // push front
			else
				this._list.push(_uid); // push back	        
		}
		return this;
	};

	GroupKlassProto.InsertUID = function (_uid, index) // single number, number list
	{
		if (typeof (_uid) === "object") // uid list             
		{
			var i, uid, cnt = _uid.length;
			for (i = 0; i < cnt; i++) {
				uid = _uid[i];
				if (this._set[uid] == null)
					this._set[uid] = true;
				else // remove existed item in this._list
					cr.arrayRemove(this._list, this._list.indexOf(uid));
			}

			// add uid ( no repeating check )
			arrayInsert(this._list, _uid, index)

		} else // single number
		{
			if (this._set[_uid] == null)
				this._set[_uid] = true;
			else // remove existed item in this._list
				cr.arrayRemove(this._list, this._list.indexOf(_uid));

			arrayInsert(this._list, _uid, index)
		}
		return this;
	};

	GroupKlassProto.RemoveUID = function (_uid) // single number, number list
	{
		if (typeof (_uid) === "object") // uid list                         
		{
			var i, uid, cnt = _uid.length;
			for (i = 0; i < cnt; i++) {
				uid = _uid[i];
				if (this._set[uid] != null) {
					delete this._set[uid];
					cr.arrayRemove(this._list, this._list.indexOf(uid));
				}
				// else ingored 
			}
		} else // single number
		{
			if (this._set[_uid] != null) {
				delete this._set[_uid];
				cr.arrayRemove(this._list, this._list.indexOf(_uid));
			}
		}
		return this;
	};

	GroupKlassProto.UID2Index = function (uid) {
		return this._list.indexOf(uid);
	};

	GroupKlassProto.Index2UID = function (index) {
		var _list = this._list;
		var uid = _list[index];
		if (uid == null)
			uid = -1;
		return uid;
	};

	GroupKlassProto.Pop = function (index) {
		var _list = this._list;
		if (index < 0)
			index = _list.length + index;

		var uid = _list[index];
		if (uid == null)
			uid = -1;
		else
			this.RemoveUID(uid);

		return uid;
	};
	GroupKlassProto.Union = function (group) {
		var uids = group._set;
		var uid;
		for (uid in uids)
			this.AddUID(parseInt(uid));
		return this;
	};

	GroupKlassProto.Complement = function (group) {
		this.RemoveUID(group._list);
		return this;
	};

	GroupKlassProto.Intersection = function (group) {
		// copy this._set
		var uid, uids = this._set;
		var flags = {};
		for (uid in uids)
			flags[uid] = true;

		// clean all
		this.Clean();

		// add intersection itme
		uids = group._set;
		for (uid in uids) {
			if (flags[uid] != null)
				this.AddUID(parseInt(uid));
		}
		return this;
	};

	GroupKlassProto.IsSubset = function (subsetGroup) {
		var subsetUIDs = subsetGroup._set;
		var uid;
		var isSubset = true;
		for (uid in subsetUIDs) {
			if (!(uid in this._set)) {
				isSubset = false;
				break;
			}
		}
		return isSubset;
	};

	GroupKlassProto.GetSet = function () {
		return this._set;
	};

	GroupKlassProto.GetList = function () {
		return this._list;
	};

	GroupKlassProto.IsInGroup = function (uid) {
		return (this._set[uid] != null);
	};

	GroupKlassProto.ToString = function () {
		return JSON.stringify(this._list);
	};

	GroupKlassProto.JSONString2Group = function (JSONString) {
		this.SetByUIDList(JSON.parse(JSONString));
	};

	GroupKlassProto.Shuffle = function (randomGen) {
		window.rexObjs.ShuffleArr(this._list, randomGen);
	};

	var arrayInsert = function (arr, _value, index) {
		var arrLen = arr.length;
		if (index > arrLen)
			index = arrLen;
		if (typeof (_value) != "object") {
			if (index == 0)
				arr.unshift(_value);
			else if (index == arrLen)
				arr.push(_value);
			else {
				var i, last_index = arr.length;
				arr.length += 1;
				for (i = last_index; i > index; i--)
					arr[i] = arr[i - 1];
				arr[index] = _value;
			}
		} else {
			if (index == 0)
				arr.unshift.apply(arr, _value);
			else if (index == arrLen)
				arr.push.apply(arr, _value);
			else {
				var start_index = arr.length - 1;
				var end_index = index;
				var cnt = _value.length;
				arr.length += cnt;
				var i;
				for (i = start_index; i >= end_index; i--)
					arr[i + cnt] = arr[i];
				for (i = 0; i < cnt; i++)
					arr[i + index] = _value[i];
			}
		}
	};

	window.rexObjs.GroupKlass = GroupKlass;
}());