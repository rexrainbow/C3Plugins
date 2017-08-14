(function ()
{
    if (!window.rexObjs)
        window.rexObjs = {};
    
    // general pick instances function
    if (window.rexObjs.PickUIDs)
        return;

    var _uidmap = {};
	window.rexObjs.PickUIDs = function (uids, objtype, check_callback)
	{
        var sol = objtype.getCurrentSol();
        sol.instances.length = 0;
        sol.select_all = false;
        var is_family = objtype.is_family;
        var members,member_cnt,i;
        if (is_family)
        {
            members = objtype.members;
            member_cnt = members.length;
        }
        var i,j,uid_cnt=uids.length;
        for (i=0; i<uid_cnt; i++)
        {
            var uid = uids[i];
            if (uid == null)
                continue;
            
            if (_uidmap.hasOwnProperty(uid))
                continue;
            _uidmap[uid] = true;
            
            var inst = this.runtime.getObjectByUID(uid);
            if (inst == null)
                continue;
            if ((check_callback != null) && (!check_callback(uid)))
                continue;
            

            
            var type_name = inst.type.name;
            if (is_family)
            {
                for (j=0; j<member_cnt; j++)
                {
                    if (type_name == members[j].name)
                    {
                        sol.instances.push(inst); 
                        break;
                    }
                }
            }
            else
            {
                if (type_name == objtype.name)
                {
                    sol.instances.push(inst);
                }
            }            
        }
        objtype.applySolToContainer();
        
        for (var k in _uidmap)
            delete _uidmap[k];
        
	    return (sol.instances.length > 0);	    
	};    

}());
