/**
 *
 * occ adapter
 *
 */

/* jshint -W097 */// jshint strict:false
/*jslint node: true */
"use strict";

// you have to require the utils module and call adapter function
var utils =    require(__dirname + '/lib/utils'); // Get common adapter utils
var fs =      require('fs');
var schedule =     require('node-schedule');
var host;
var port;
var colors = ["#A7194B","#FE2712","#FB9902","#FABC02","#FEFE33","#D0EA2B","#66B032","#0391CE","#0247FE","#3D01A5","#8601AF","#006600","#006699","#0066FF","#33FF00","#660066","#66FF99","#CC0066","#CCFFCC","#FF9966"];

var rega =              {};
var objects =           {};
var states =            {};
var scripts =           {};
var subscriptions =     [];
var enums =             [];
var channels =          null;
var devices =           null;
var attempts =          {};
var allEvents = {};
var colorPicker = 0;
var scheduledJobs = {};

var thermostatArray = [];
var variableArray = [];

function getData(callback) {
    var statesReady;
    var objectsReady;

    adapter.log.debug('requesting all states');
    adapter.getForeignStates('occ.*', function (err, res) {
        states = res;
        statesReady = true;
        adapter.log.debug('received all states');
        if (objectsReady && typeof callback === 'function') callback();
    });
    adapter.log.debug('requesting all objects');

    adapter.objects.getObjectList({include_docs: true}, function (err, res) {
        res = res.rows;
        objects = {};
        enums = [];
        for (var i = 0; i < res.length; i++) {
            objects[res[i].doc._id] = res[i].doc;
            if (res[i].doc.type === 'enum') enums.push(res[i].doc._id);
        }

        objectsReady = true;
        adapter.log.debug('received all objects');
        if (statesReady && typeof callback === 'function') callback();
    });

    thermostatArray = adapter.config.thermostat;
    variableArray = adapter.config.variable;
}

var adapter = utils.adapter({
    name: 'occ',

    ready: function () {
        getData(function () {
            adapter.subscribeForeignObjects('*');
            adapter.subscribeForeignStates('*');

            adapter.log.debug("run loadData()");
            loadData();

            if (adapter.config.ical == true) {
                adapter.log.debug("init iCal Objects...");
                addiCalObjects();
            }
        });

    },
    message: function (obj) {
        adapter.log.error("MESSAGE arrived: " + JSON.stringify(obj));
        /* Split message
         MESSAGE arrived: {"command":"send","message":{"start":"2015-07-05T13:18:39.332Z","end":"2015-07-05T13:18:39.332Z","title":"First Title","IDID":"#Object"},"from":"system.adapter.javascript.0","_id":5693}
         */
        var event = obj.message;
        if (event.IDID == undefined || event.start == undefined || event.state == undefined || event.end == undefined || event.title == undefined) {
            adapter.log.error("sendTo was not successfull...");
        } else {
            // Dummy Objects
            event.subID = obj._id;
            event.allDay = false;
            event.id = event.title + "_" + event.id + "_" + event.IDID;
            event.repeater = true;
            event.tooltip = "";
            event.editable = true;
            event.startEditable = true;
            event.durationEditable = true;
            event.switcher = true;
            event.typo = "switch";

            event.start = new Date(event.start);
            event.end = new Date(event.end);
            var scheduleName = event.IDID + "###" + event.start.getTime() + "###" + event.state;

            job = new Object();
            job.objectName = event.IDID;
            job.scheduleName = scheduleName;

            var obj = objects[event.IDID];
            job.TYPE = obj.type;

            // Create job for true and false
            job.state = event.state;
            job.time = event.start;
            createScheduledJob(job);

            // If true, create two Jobs
            if (obj.common.type == "boolean") {
                var job = new Object();
                scheduleName = event.IDID + "###" + event.end.getTime() + "###" + !event.state;

                job.objectName = event.IDID;
                job.scheduleName = scheduleName;
                job.TYPE = obj.type;

                // Create job for true and false
                job.state = !event.state;
                job.time = event.end;
                createScheduledJob(job);
            }
        }
        readEventsFromFile(obj._id, function(data) {
            //var events = JSON.parse(data);
            var events = [];
            events.push(event);
            writeEvents2ioBroker(obj._id, JSON.stringify(events));
        })

    },
    objectChange: function (id, object) {
        adapter.log.debug('objectChange ' + id + ' ' + JSON.stringify(object));

        if (object == undefined) {
            return;
        }
        if (id.search("occ.0") == 0) {
            var address = id.replace("occ.0.","");
            var elems = address.split(".");
            var objName = elems[0]+"."+elems[1]+"."+elems[2];
            var obj = objects[objName];
            var TYPE = obj.native.TYPE;
            // TODO: remove
            /*
             if (id.search(".update") == 0) {
             return;
             }
             */

            if (address.search("_#") > 1) {
                address = address.split("_#")[0];
            }

            if (id.search(".dummy") < 0) {
                var addr = address.replace(object.native.title,"");

                // var state = states["occ.0." + addr + "update"];
                var state = object.common.eventState;
                if (state == undefined) {
                    return;
                }
            }

            var decalc_address;
            var param_address;
            var paramset = {};
            var decalcset = {};
            var decalcType;
            var first = true;
            var start;
            var end;
            var IDID;
            var begin;
            var scheduleName;
            var objectName;
            var job;
            var allJobs;
            var date;

            if (id.search(".dummy") > 0) {
                var objx = object.native;

                for (var object in objx) {
                    var o = objx[object];

                    var thermostat;
                    IDID = o.IDID;

                    var elems = IDID.split(".");
                    var instance = elems[0] + "." + elems[1] + "." + elems[2];
                    var obj = objects[instance];
                    var TYPE = obj.native.TYPE;

                    thermostat = thermostatArray[TYPE];
                    if (thermostat == undefined) {
                        return new Error("'type' must defined within io-package.json as type thermostat");
                    }

                    /*
                     if (first == true) {
                     if (thermostat.mode !== undefined) {
                     var tname = thermostat.mode[0];
                     var tvalue = thermostat.mode[1];
                     decalcset = {};
                     paramset = {};
                     paramset[tname] = tvalue;
                     } else {
                     var tname = thermostatArray.mode[0];
                     var tvalue = thermostatArray.mode[1];
                     decalcset = {};
                     paramset = {};
                     decalcset[tname] = tvalue;
                     }
                     first = false;
                     }
                     */
                    if (thermostat != undefined) {
                        var temperature = o.temperature; // 17
                        var title = o.title;
                        var number = title.split("_")[2];
                        number = number - 1;
                        if (number == 0) {
                            // Todo: it's the last entry from day before
                            // TEMPERATUR_MONDAY_0 = TEMPERATUR_SUNDAY_???
                        }

                        start = o.start;
                        end = o.end;
                        var x = new Date(end);
                        var hours = x.getHours();
                        var min = x.getMinutes();

                        var timeout = (hours * 60) + min;
                        if (timeout == 0) {
                            // Last Entry
                            timeout = 1440;
                        }

                        var timeoutText = "";
                        var tt;
                        if (thermostat != undefined) {
                            tt = thermostat.timeoutText;
                            if (tt instanceof Array && tt.length == 2) {
                                timeoutText = title.replace(tt[0], tt[1]);
                            } else {
                                tt = thermostatArray.timeoutText;
                                timeoutText = title.replace(tt[0], tt[1]);
                            }
                        } else {
                            return new Error("'type' must defined within io-package.json as type thermostat");
                        }

                        // Use correct address for push
                        var decalc_chn = thermostat.decalc_chn;
                        if (decalc_chn == undefined) {
                            decalc_chn = thermostatArray['decalc_chn']
                        }
                        //decalc_address = IDID + ":" + decalc_chn;
                        decalc_address = obj._id + ":" + decalc_chn;

                        // Bugfix, Set Decalc
                        // TODO: Check if DECALC needs extra channel (thermostat.decalc_chn)
                        if (title == "DECALCIFICATION") {
                            var decalcDay = new Date(start).getDay();

                            /* Javascript Date
                             0 = Sunday
                             1 = Monday
                             2 = Tuesday
                             3 = Wednesday
                             4 = Thursday
                             5 = Friday
                             6 = Saturday
                             */

                            /* Homematic Date
                             0 = Saturday
                             1 = Sunday
                             2 = Monday
                             3 = Tuesday
                             4 = Wednesday
                             5 = Thursday
                             6 = Friday
                             */

                            if (decalcDay == 6) {
                                decalcDay = 0;
                            } else {
                                decalcDay += 1;
                            }

                            var decalc_day;
                            var decalc_time;
                            var dmin;
                            var dhour;
                            if (thermostat != undefined) {
                                decalcType = thermostat.decalcset;
                                if (decalcType == undefined) {
                                    decalcType = thermostatArray.decalcset;
                                }
                                decalc_day = thermostat.decalc_day;
                                if (decalc_day == undefined) {
                                    decalc_day = thermostatArray.decalc_day;
                                }
                                decalc_time = thermostat.decalc_time;
                                if (decalc_time == undefined) {
                                    decalc_time = thermostatArray.decalc_time;
                                }
                                if (decalc_time instanceof Array && decalc_time.length == 2) {
                                    decalcset[decalc_time[0]] = new Date(start).getMinutes();
                                    decalcset[decalc_time[1]] = new Date(start).getHours();
                                } else {
                                    decalcset[decalc_time] = (new Date(start).getHours() * 60) + new Date(start).getMinutes();
                                }
                                decalcset[decalc_day] = decalcDay; //  0 => Saturday, ..., 6 => Friday
                            } else {
                                return new Error("'type' must defined within io-package.json as type thermostat");
                            }
                        } else {
                            paramset[timeoutText] = timeout;
                            paramset[title] = {explicitDouble: temperature};
                        }
                    }
                }
                if (thermostat == undefined) {
                    return;
                }
                var paramType;
                if (thermostat.paramset == undefined) {
                    paramType = thermostatArray.paramset;
                } else {
                    paramType = thermostat.paramset;
                }

                var param_chn;
                if (thermostat.param_chn == undefined) {
                    param_chn = thermostatArray.param_chn;
                } else {
                    param_chn = thermostat.param_chn;
                }
                param_address = obj._id+":"+param_chn;
                if (param_address == decalc_address) {
                    for (var value in decalcset) {
                        paramset[value] = decalcset[value];
                    }
                    putParamsets(param_address, paramset, decalcType);
                } else {
                    putParamsets(param_address, paramset, paramType);
                    putParamsets(decalc_address, decalcset, decalcType);
                }
                // TODO: remove
                // var updateName = adapter.namespace + "." + IDID + ".update";
                // adapter.setState(updateName, {val: "latest", ack: true});

                var dummyName = adapter.namespace + "." + IDID + ".dummy";
                adapter.delObject(dummyName, function (res, err) {
                    if (res != undefined && res != "Not exists") adapter.log.error("res from delObject: " + res);
                    if (err != undefined) adapter.log.error("err from delObject: " + err);
                });
                adapter.deleteState(dummyName, function (res, err) {
                    if (res != undefined && res != "Not exists") adapter.log.error("res from deleteState: " + res);
                    if (err != undefined) adapter.log.error("err from deleteState: " + err);
                });
                return;
            } else if (state.val == "save") {
                TYPE = obj.native.TYPE;
                IDID = object.native.IDID;

                var obj = objects[IDID];
                // hm-rpc definition, role = switch, openzwave definition, role = state
                if (obj.common != undefined && obj.common.role != undefined && (obj.common.role == "switch" || obj.common.role == "state")) {
                    createJob(object);

                    // TODO: remove
                    /*
                     var updateName = adapter.namespace + "." + IDID + ".update";
                     adapter.setState(updateName, {val: "latest", ack: true});
                     */
                    return;

                } else if (TYPE == 'VARDP') {
                    start = array['start'];
                    end = array['end'];
                    begin = new Date(start);
                    end = new Date(end);
                    objectName = IDID;
                    var address;

                    state = array['state'];
                    // So go on and find the correct Object
                    if (array['subID'] !== undefined && array['subID'] == "google") {
                        objectName = array['IDID'];
                        var cr = false;
                        /* ****************************************************** */
                        for (var object in objects) {
                            var obj = objects[object];
                            adapter.log.debug("---> " + obj._id);
                            var common = obj.common;
                            if (common != undefined && common.name != undefined) {
                                if (obj.common.name == objectName || obj._id == objectName) {
                                    adapter.log.info("Object found <<<<<< " + JSON.stringify(obj));

                                    address = obj._id;
                                    cr = true;
                                }

                            }
                            if (cr) {
                                scheduleName = address + "###" + begin.getTime() + "###" + state;

                                job = new Object();
                                job.objectName = address;
                                job.scheduleName = scheduleName;
                                job.TYPE = TYPE;

                                // Create job for true and false
                                job.state = state;
                                job.time = begin;
                                createScheduledJob(job);

                                // If true, create two Jobs
                                if (obj.common.type == "boolean") {
                                    job = new Object();
                                    scheduleName = address + "###" + end.getTime() + "###" + !state;

                                    job.objectName = address;
                                    job.scheduleName = scheduleName;
                                    job.TYPE = TYPE;

                                    // Create job for true and false
                                    job.state = !state;
                                    job.time = end;
                                    createScheduledJob(job);
                                }
                                cr = false;
                            }
                        }
                        /* ****************************************************** */
                    } else {
                        scheduleName = objectName + "###" + begin.getTime() + "###" + state;

                        job = new Object();
                        job.objectName = objectName;
                        job.scheduleName = scheduleName;
                        job.TYPE = TYPE;

                        job.state = state;
                        job.time = begin;
                        createScheduledJob(job);
                    }
                    loadData();
                }
            } else if (state.val == "delete") {
                var array = object.native;

                TYPE = obj.native.TYPE;
                IDID = object.native.IDID;

                var obj = objects[IDID];
                if (obj.common != undefined && obj.common.role != undefined && (obj.common.role == "switch" || obj.common.role == "state")) {
                    objectName = IDID;

                    state = array['switcher'];

                    allJobs = schedule['scheduledJobs'];
                    date = new Date(array['start']);
                    scheduleName = objectName + "###" + date.getTime() + "###" + state;

                    if (allJobs[scheduleName] != undefined) {
                        adapter.log.debug("Cancel Job: " + scheduleName);
                        allJobs[scheduleName].cancel();
                    } else {
                        adapter.log.debug("Job: " + scheduleName + " does not exists, do nothing");
                    }

                    date = new Date(array['end']);
                    scheduleName = objectName + "###" + date.getTime() + "###" + !state;

                    if (allJobs[scheduleName] != undefined) {
                        adapter.log.debug("Cancel Job: " + scheduleName);
                        allJobs[scheduleName].cancel();
                    } else {
                        adapter.log.debug("Job: " + scheduleName + " does not exists, do nothing");
                    }
                }
                adapter.delObject(id, function(err,res) {
                    adapter.log.debug("ERR: delObject " + err);
                    adapter.log.debug("RES: delObject " + res);
                });
                // TODO: remove
                /*
                 var updateName = adapter.namespace + "." + IDID + ".update";
                 adapter.setState(updateName, {val: "latest", ack: true});
                 return;
                 */
            }
        }

        if (id.search("LEQ115") > 0) {
            adapter.log.error("objectChange: ID " + id + " = " + JSON.stringify(state));
        }

        if (id.search("enum.occ") == 0) {
            adapter.log.info("Enums has changed, reload Data from it...");
            adapter.log.debug('objectChange ' + id + ' ' + JSON.stringify(object));
            getData(function () {
                loadData();
                if (adapter.config.ical == true) {
                    adapter.log.debug("init iCal Objects...");
                    addiCalObjects();
                }
            });
        }
    },
    stateChange: function (id, state) {
        adapter.log.debug("ID " + id + " = " + JSON.stringify(state));

        // TODO: remove .update
        if (id.search("occ.0") == 0 && id.search(".update") > 0) {
            getData(function () {
                adapter.log.info("stateChange for id: " + id + " value: " + JSON.stringify(state));
            });
        }

        if (id.search("CONFIG_PENDING") > 0) {
            //adapter.log.debug(id + " = " + JSON.stringify(state));
            if (state.val == true) {
                adapter.log.info(id + " active");
            } else {
                adapter.log.info(id + " done");
                id = id.replace(".CONFIG_PENDING","");
                // TODO: id = hm-rpc.0.JEQ0550466.0, but must = occ.0.hm-rpc.0.JEQ0550466.1.TEMPERATURE
                id = adapter.namespace + "." + id.slice(0, id.length-2);
                adapter.objects.getObjectList({startkey: id, endkey: id + '\u9999'}, function (err, res) {
                    loadData(id);
                });
            }
        }

        // Todo: remove hardcoded objects for MAX! Thermostat
        if (id.search("LEQ115") > 0) {
            adapter.log.error("stateChange: ID " + id + " = " + JSON.stringify(state));
        }
        // Todo: remove hardcoded instance number from ical
        if (id == "ical.0.data.table") {
            if (adapter.config.ical == true) {
                adapter.log.info("ical has changed, reload Data");
                adapter.log.debug('stateChange ' + id + ' ' + JSON.stringify(state));
                getData(function () {
                    addiCalObjects();
                });
            }
        } else if (state.ack != undefined && state.ack != true) {
            adapter.log.debug('This stateChange is not acknowledged');
        }
    },
    unload: function (callback) {
        try {
            // Todo create JSON File from all Jobs, so we can delete it, if occ was not running, while event was deleted
            writeEvents2ioBroker("scheduledJobs", JSON.stringify(scheduledJobs));

            adapter.log.info('cleaned everything up...');
            callback();
        } catch (e) {
            callback();
        }
    }
});

function createScheduledJob(job) {
    /*
     job.time
     job.objectName
     job.state
     job.scheduleName
     job.TYPE
     */

    var now = new Date();
    var allJobs = schedule['scheduledJobs'];

    if (allJobs[job.scheduleName] == undefined) {
        if (job.time > now) {
            adapter.log.info("Create scheduled Object for " + job.objectName + " (" + job.TYPE + ") at " + job.time.toLocaleDateString() + " " + job.time.toLocaleTimeString() + ", state = " + job.state);

            var jobName = job.scheduleName;
            scheduledJobs[jobName] = job;

            var a = schedule.scheduleJob(job.scheduleName, job.time, function(){
                adapter.log.info("start changeState for TYPE " + job.TYPE + " address " + job.objectName);
                var obj = objects[job.objectName];
                if (obj.common != undefined && obj.common.role != undefined) {
                    // hm-rpc switches has type channel and role switch
                    // zwave switches has type state and role state
                    if (obj.common.role == "switch" && obj.type != "state") {
                        if (job.objectName.search("STATE" == 0)) {
                            job.objectName = job.objectName + ".STATE";
                        }
                    }
                }
                changeState(job.objectName, job.state);
                a.cancel();
            });
        } else {
            adapter.log.error("Old Job " + job.objectName + " (" + job.TYPE + ") at " + job.time.toLocaleDateString() + " " + job.time.toLocaleTimeString() + ", state = " + job.state + "(" + now.toLocaleTimeString() + ") do nothing");
        }
    } else {
        adapter.log.info("Job: " + job.scheduleName + " already exists at " + job.time.toLocaleDateString() + " " + job.time.toLocaleTimeString());
    }
}

function loadData(objectID) {
    var e = "enum.occ.";

    // Load only specific Object, cause CONFIG_PENDING was done
    if (objectID != undefined) {
        loadObject(objectID);
    } else {
        for (var i = 0; i < enums.length; i++) {
            var enu = enums[i];
            if (enu.search(e) == 0) {
                var res = objects[enu];

                adapter.log.debug("Adapter getEnum: "+JSON.stringify(res));
                adapter.log.debug("Adapter getEnum Result: "+res);

                adapter.log.debug("EnumGroup: "+res['common'].name);
                var len = res['common'].members.length;
                for (var l = 0; l < len; l++) {
                    var member = res['common'].members[l];
                    loadObject(member);
                }
            }
        }
    }
    writeEvents2ioBroker("#Object", "");
}

function loadObject(member) {
    var localObject = objects[member];
    adapter.log.debug(JSON.stringify(localObject));

    adapter.log.debug("Member: " + member);

    // TODO: Get Parent from localObject and check if member is a thermostat or a state
    var elems = member.split(".");
    var instance = elems[0] + "." + elems[1];
    var objName = elems[2];
    var address = instance + "." + objName;
    var lObject = objects[address];

    /* TODO: remove
     var updateName = adapter.namespace + "." + member + ".update", updateObj;
     var objx = objects[updateName];
     if (objx == undefined) {
     var updateObj = {
     "type": "state",
     "common": {
     name: "update",
     role: 'meta.config',
     type: "string",
     read: true,
     write: true
     },
     "native": {},
     };
     adapter.log.info("setObject for id " + updateName);
     adapter.setObject(updateName, updateObj);
     }
     */
    if (lObject !== undefined && lObject.native.TYPE !== undefined) {
        var memberType = lObject.native.TYPE;
        var thermostat = thermostatArray[memberType];
        if (thermostat != undefined) {
            var paramType = thermostat.paramset;
            if (paramType == undefined) {
                paramType = thermostatArray['paramset'];
            }
            var param_chn = thermostat.param_chn;
            if (param_chn == undefined) {
                param_chn = thermostatArray['param_chn']
            }
            var masterID = lObject._id + "." + param_chn;

            // Get initial Objects
            getParamsets(masterID, paramType, true, null, member);
        } else if (objects[member] == undefined) {
            return new Error("Member " + member + " not found");
        } else {
            parseScheduler(member);
        }
    }
}

function addiCalObjects() {
    // Todo: Allow more then one Instance
    var id = "ical.0.data.table"/*JS iCal table*/;

    adapter.getForeignState(id, function (err, state) {
        if (err || !state) {
            obj.state = false;
        }
    });

    var res = states[id];
    var events = [];
    var event;

    if (res != undefined && res.val != undefined) {
        for (var i=0;i<res.val.length;i++) {
            var ev = res.val[i];

            // New Event
            event = new Object();
            var ID = ev._IDID;

            var IDID = ID;

            event.start = new Date(ev._date);
            event.end = new Date(ev._end);
            event.title = ev.event;
            event.subID = IDID;

            var colorName = adapter.namespace + "." + ID + ".color";
            if (colorName != undefined && states[colorName] != undefined) {
                event.color = states[colorName].val;
            } else {
                event.color = colors[colorPicker];
            }
            adapter.log.debug("ID: " + ID + " color: " + event.color);
            event.allDay = ev._allDay;
            event.id = event.title + "_" + ID;

            // Split ev._section (occ#LEQ0885447:1#true)
            var state;
            var elems = ev._section.split("#");
            if (elems.length == 3 && elems[0] == "occ") {
                var address = elems[1];
                state = elems[2];
                // *********************************************************
                // Todo: Dummy Objects
                event.repeater = "true";
                var wk = 1;
                var dateStart;
                var editable;

                // Create recurring Event
                if (wk == 1) {
                    dateStart = event.start;
                    editable = true;
                    event.tooltip = "This is a recurring Event.";
                } else {
                    editable = false;
                    event.title = event.title + " (Repeated Event)";
                    event.tooltip = "This is a recurring Event.\n\nThe original Event can be found at\n" + dateStart;
                }

                event.editable = editable;
                event.startEditable = editable;
                event.durationEditable = editable;
                // Todo: create recurring Events

                // Check if address has Fully Qualified Object Name like hm-rpc.0.LEQ088447:1.STATE
                var objectID = address.replace(":",".");
                var obj;

                if (states[objectID] != undefined) {
                    obj = objects[objectID];
                    adapter.log.info("Object found >>>>>> " + JSON.stringify(obj));
                    adapter.log.info(objectID + " is a real address, State found");

                    address = objectID;
                } else {
                    // If we only knew the Name, we must check the Object Address
                    var objectName = address;

                    for (var object in objects) {
                        obj = objects[object];
                        adapter.log.debug("---> " + obj._id);
                        if (obj.common != undefined && obj.common.name != undefined) {
                            if (obj.common.name == objectName || obj._id == objectName) {
                                adapter.log.debug("Object found <<<<<< " + JSON.stringify(obj));
                                address = obj._id;
                                break;
                            }
                        }
                    }
                }

                if (obj.native != undefined) {
                    if ( obj.native["TypeName"] != undefined) {
                        event.subType = obj.native["TypeName"];
                    } else if (obj.native["CONTROL"] != undefined) {
                        event.subType = obj.native["CONTROL"];
                    } else {
                        event.subType = obj.native["PARENT_TYPE"];
                    }
                } else {
                    event.subType = "VARDP";
                }

                //var obj = objects[IDID];
                event.IDID = address;

                var obj = objects[address];
                if (obj.common != undefined && obj.common.role != undefined && (obj.common.role == "switch" || obj.common.role == "state")) {
                    if (state == "on") {
                        event.switcher = true;
                        state = true;
                        event.typo = "switch";
                    } else if (state == "off") {
                        event.switcher = false;
                        state = false;
                        event.typo = "switch";
                    }
                    event.state = state;
                } else if (event.subType == "VARDP") {
                    // Bugfix true | false comes as string so convert it to boolean
                    if (state == "true") {
                        event.state = true;
                    } else if (state == "false") {
                        event.state = false;
                    } else {
                        event.state = state;
                    }
                    event.typo = obj.common.type;
                    event.valueType = obj.native.ValueType;
                } // else TEMPERATURE

                scheduleName = address + "###" + event.start.getTime() + "###" + event.state;

                job = new Object();
                job.objectName = address;
                job.scheduleName = scheduleName;
                job.TYPE = event.subType;

                // Create job for true and false
                job.state = state;
                job.time = event.start;
                createScheduledJob(job);

                // If true, create two Jobs
                if (event.typo == "boolean" || event.typo == "switch") {
                    var job = new Object();
                    var scheduleName = address + "###" + event.end.getTime() + "###" + !state;

                    job.objectName = address;
                    job.scheduleName = scheduleName;
                    job.TYPE = event.subType;

                    // Create job for true and false
                    job.state = !state;
                    job.time = event.end;
                    createScheduledJob(job);
                } // else TEMPERATURE

                events.push(event);
                adapter.log.debug("NEW START = " + event.start + " NEW END = " + event.end);
                writeEvents2ioBroker("#iCal", JSON.stringify(events));
            } else {
                adapter.log.error("No valid iCal Objects found, Description Text must be occ#OBJECT_ADDRESS#OBJECT_VALUE")
            }
        }
        writeEvents2ioBroker("#iCal", JSON.stringify(events));
    }
}

var warn             = '<span style="font-weight: bold; color:red"><span class="icalWarn">';
var warn2            = '</span></span><span style="font-weight: normal; color:red"><span class="icalWarn2">';
var prewarn          = '<span style="font-weight: bold; color:orange"><span class="icalPreWarn">';
var prewarn2         = '</span></span><span style="font-weight: normal; color:orange"><span class="icalPreWarn2">';

function formatDate(date) {
    var hours = date.getHours();
    var minutes = date.getMinutes();
    //var ampm = hours >= 12 ? 'pm' : 'am';
    //hours = hours % 12;
    hours = hours ? hours : 12; // the hour '0' should be '12'
    hours = hours < 10 ? '0'+hours : hours;
    minutes = minutes < 10 ? '0'+minutes : minutes;
    var strTime = hours + ':' + minutes; // + ' ' + ampm;
    return strTime;
}

function createObjects(allEvents) {
    // First parse all Events for this day / week
    var now = new Date();
    var dayTable = "";
    var weekTable;
    var monthTable;
    var object;

    if (allEvents.length > 0) {
        if( Object.prototype.toString.call( allEvents ) === '[object Array]' ) {
            for (var i in allEvents) {
                var event = allEvents[i];
                var start = new Date(event.start);
                var end = event.end;
                var title = event.title;
                var IDID = event.IDID;
                var temperature = event.temperature;
                object = objects[IDID.replace(":", ".")];

                if (start.getTime() > 0) {
                    if (start.getDate() == now.getDate()) {
                        var time = formatDate(start);
                        dayTable += warn + "Today " + time + warn2 + " " + object.common.name + ", " + temperature + "° Celsius</span></span><br>";
                    }
                }
            }
        } else {
            var allEV = JSON.parse(allEvents);
            if (allEV) {
                // var updateName;
                for (var i in allEV) {
                    var event = allEV[i];
                    if (event != null) {
                        var start = new Date(event.start);
                        var end = new Date(event.end);
                        var title = event.title;
                        var IDID = event.IDID;
                        var switcher = event.switcher;
                        object = objects[IDID.replace(":", ".")];

                        var objectName = adapter.namespace + "." + object._id + "." + title;
                        // updateName = adapter.namespace + "." + object._id + ".update";

                        var stateObj = {
                            common: {
                                name:  objectName, // Todo: Thermostat Objects need objectName
                                read:  true,
                                write: true,
                                type: 'state',
                                role: 'meta.config'
                            },
                            native: event,
                            type:   'state'
                        };
                        adapter.setObject(objectName, stateObj);
                        adapter.log.info("setState for " + objectName);

                        var colorName = adapter.namespace + "." + object._id + ".color";
                        var colorObj = {
                            "type": "state",
                            common: {
                                name:  "color",
                                role: 'meta.config',
                                read:  true,
                                write: true,
                                type: 'string'
                            },
                            "native": {},
                        };
                        adapter.setObject(colorName, colorObj);
                        adapter.setState(colorName, {val: event.color, ack: true});
                        /*
                         var updateObj = {
                         "type": "state",
                         "common": {
                         name: "update",
                         role: 'meta.config',
                         type: "string",
                         read: true,
                         write: true
                         },
                         "native": {},
                         };
                         adapter.setObject(updateName, updateObj);
                         */
                        if (start.getTime() > 0) {
                            if (start.getDate() == now.getDate()) {
                                var time = formatDate(start);
                                var state = switcher ? "Einschalten" : "Ausschalten";
                                dayTable += warn + "Today " + time + warn2 + " " + object.common.name + ", " + state + "</span></span><br>";
                            }
                        }
                        if (end.getTime() > 0) {
                            if (end.getDate() == now.getDate()) {
                                var time = formatDate(end);
                                var state = !switcher ? "Einschalten" : "Ausschalten";
                                dayTable += warn + "Today " + time + warn2 + " " + object.common.name + ", " + state + "</span></span><br>";
                            }
                        }
                    }
                }
                // adapter.setState(updateName, {val: "latest", ack: true});
            }
        }
    }
}

function getParamsets(objectID, paramType, switcher, rootID, member) {
    adapter.log.debug(adapter.namespace);
    adapter.log.debug(objectID);
    var objectsID = objectID.split(".");
    adapter.log.info("try to getParamset: "+objectID+" rootID:"+rootID+" member:"+member+" switcher(decalc):"+switcher );

    var ID = objectsID[objectsID.length-2] + ":" + objectsID[objectsID.length-1];
    var instance = objectsID[0] + "." + objectsID[1];

    adapter.sendTo(instance, "getParamset", {ID:ID, paramType:paramType}, function (doc) {
        var err = doc.error;
        var data = doc.result;
        adapter.log.debug("data = " + JSON.stringify(data));
        adapter.log.debug("err  = " + JSON.stringify(err));

        if (!err) {
            var parent = objectsID[0]+"."+objectsID[1];
            var objID = parent+"."+objectsID[objectsID.length-2];
            adapter.log.debug("############### " + objID);
            var res = objects[objID];

            var role;
            var type;

            if (res && res.common) {
                role = res.common.role;
            }
            if (res && res.native) {
                type = res.native["TYPE"];
            }
            var myID;

            if (switcher) {
                parseEvents(data, ID, type, parent, member);

                // TODO: Check if this type is in thermostatArray
                var thermostat = thermostatArray[type];
                var channel = ID.split(":");
                if (thermostat != undefined) {
                    var paramType = thermostat.decalcset;
                    if (paramType == undefined) {
                        paramType = thermostatArray['decalcset'];
                    }
                    var param_chn = thermostat.decalc_chn;
                    if (param_chn == undefined) {
                        param_chn = thermostatArray['decalc_chn']
                    }
                    var decalcID = parent + "." + channel[0]+"."+param_chn;
                    // Get Decalc Objects
                    getParamsets(decalcID, paramType, false, parent+"."+ID, member);

                    colorPicker = colorPicker + 1;
                    adapter.log.debug("COLORPICKER" + colorPicker);
                    myID = parent+"."+ID;
                    adapter.log.debug("----------> " + myID + "(" + type + ")");
                    writeEvents2ioBroker(member, JSON.stringify(allEvents[myID]));
                } else if (role != undefined && role == "switch") {
                    parseScheduler(parent+"."+ID);
                }
            } else {
                allEvents[rootID] = [];
                parseDecalc(data, rootID, type, parent, member);
                colorPicker = colorPicker + 1;
                adapter.log.debug("COLORPICKER" + colorPicker);
                myID = parent+"."+ID;
                adapter.log.debug("----------> " + myID + "(" + type + ")");
                writeEvents2ioBroker(member, JSON.stringify(allEvents[rootID]));
                allEvents[rootID] = [];
            }
        } else {
            adapter.log.error("getParamset Error: "+JSON.stringify(err));
        }
    });
}

function readEventsFromFile(ID, callback) {
    ID = ID.replace(":",".");
    adapter.log.debug("read in occ-events_" + ID + ".json");
    adapter.readFile(adapter.namespace, 'occ-events_'+ID+'.json', function (err, data) {
        if (err || !data) {
            adapter.log.debug("Could not read occ-events_"+ID+".json");
            callback(undefined);
        } else {
            callback(data);
        }
    });
}

function writeEvents2ioBroker(ID, event) {
    adapter.log.error("writeEvents2ioBroker for " + ID);
    ID = ID.replace(":",".");
    // TODO: REMOVE
    //adapter.writeFile(adapter.namespace, 'occ-events_'+ID+'.json', event);
    createObjects(event);
}

function putParamsets(address, params, paramType, ids) {
    if (!adapter.config.demo) {
        var objectsID = address.split(".");
        var ID = objectsID[objectsID.length - 1];
        var instance = objectsID[0] + "." + objectsID[1];

        // TODO: rewrite Objecttree, only change params that were changed
        adapter.sendTo(instance, "getParamset", {ID: ID, paramType: paramType}, function (readObj) {
            var err = readObj.error;
            var data = readObj.result;

            // TODO: Only write TEMPERATUR AND TIMEOUT OBJECTS IF THEY EXISTS WITHIN EVENTS
            var address = ID.replace(":", ".");
            var object = objects[instance+"."+address];
            var TYPE = object.native.PARENT_TYPE;

            /* ################################## */
            // TODO: Check how much Objects are for each day exists. Only valid Items are allowed
            var timeoutName = "";
            var temperatureName = "";

            var thermostat = thermostatArray[TYPE];
            if (thermostat != undefined) {
                temperatureName = thermostat.timeoutText;
                if (temperatureName == undefined) {
                    temperatureName = thermostatArray.timeoutText;
                }
                temperatureName = temperatureName[0] + "_";

                timeoutName = thermostat.timeoutText;
                if (timeoutName == undefined) {
                    timeoutName = thermostatArray.timeoutText;
                }
                timeoutName = timeoutName[1] + "_";

            } else {
                return new Error("'type' must defined within io-package.json as type thermostat");
            }

            var weekDays = ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY', 'SUNDAY'];

            for (var weekday in weekDays) {
                var firstMidnight = 0;

                for (var i = 1; i < 25; i++) {
                    var tempName = temperatureName + weekDays[weekday] + "_" + i;
                    var timeName = timeoutName + weekDays[weekday] + "_" + i;

                    var tempObject = params[tempName];
                    var timeObject = params[timeName];
                    if (timeObject == 1440) {
                        firstMidnight = 1;
                    }

                    if (firstMidnight == 1) {
                        // Create Array with this Objects
                        data[tempName] = tempObject;
                        data[timeName] = timeObject;
                        firstMidnight = 2;
                    } else if (firstMidnight == 2) {
                        // Set Default Values
                        // data[tempName] = {explicitDouble: 18};
                        // data[timeName] = 1440;
                        delete data[timeName];
                        delete data[tempName];
                    } else {
                        if (tempObject == undefined) {
                            adapter.log.error("tempObject is undefined");
                        }
                        data[tempName] = tempObject;
                        data[timeName] = timeObject;
                    }
                }
            }
            /* ################################## */

            adapter.sendTo(instance, "putParamset", {ID: ID, paramType: paramType, params: data}, function (doc) {
//            adapter.sendTo(instance, "putParamset", {ID: ID, paramType: paramType, params: params}, function (doc) {
                var err = doc.error;
                var data = doc.result;
                adapter.log.debug("data = " + JSON.stringify(data));
                adapter.log.debug("err  = " + JSON.stringify(err));

                if (!err) {
                    adapter.log.info("putParamset was successfull for " + ID);
                } else {
                    adapter.log.error("putParamset Error: " + JSON.stringify(err));
                }
            });
        });
    }
}

function changeState(address, params) {
    if (!adapter.config.demo) {
        adapter.log.info("setForeignState for " + address + " params " + params);
        adapter.setForeignState(address, params);
    }
}

function parseScheduler(ID) {
    adapter.objects.getObjectList({startkey: 'occ.0.' + ID, endkey: 'occ.0.' + ID + '\u9999'}, function (err, res) {
        res = res.rows;
        for (var i = 0; i < res.length; i++) {
            var id = res[i].doc.common.name;
            // TODO: remove
            /*
             if (id == "update") {
             // do nothing
             } else {
             */
            var object = res[i].doc;
            createJob(object);
            //}
        }
    });
}

function createJob(object) {
    var IDID = object.native.IDID;
    var TYPE = object.native.TYPE;

    var start;
    var end;
    var begin;
    var objectName;
    var state;
    var scheduleName;
    var job;

    start = object.native.start;
    end = object.native.end;

    begin = new Date(start);
    end = new Date(end);

    var allDay = object.native.allDay;
    if (allDay == true) {
        adapter.log.info("allDay Value for " + IDID);
    }

    objectName = IDID;
    state = object.native.switcher;

    scheduleName = objectName + "###" + begin.getTime() + "###" + state;

    job = new Object();
    job.objectName = objectName;
    job.scheduleName = scheduleName;
    job.TYPE = TYPE;

    job.state = state;
    job.time = begin;

    createScheduledJob(job);

    // Create job for true and false
    scheduleName = objectName + "###" + end.getTime() + "###" + !state;

    job = new Object();
    job.objectName = objectName;
    job.scheduleName = scheduleName;

    job.TYPE = TYPE;
    job.state = !state;
    job.time = end;
    createScheduledJob(job);

    // Feature: add Support for recurring Events
    var numberoftimes = object.native.numberoftimes; // 2
    var repeaterCombo = object.native.repeaterCombo; // day
    var jqdEnd = object.native.jqdEnd; // "07/02/2015"
    var jende = new Date(jqdEnd);
    if (jqdEnd != undefined && jqdEnd != "" && numberoftimes == 0) {
        var m = end.getMinutes();
        var h = end.getHours();
        jende.setMinutes(m);
        jende.setHours(h);

        if (repeaterCombo == "day") {
            numberoftimes = (jende - end) / 86400000;
        } else if (repeaterCombo == "week") {
            numberoftimes = (jende - end) / 86400000 / 7;
        } else if (repeaterCombo == "month") {
            numberoftimes = (jende.getMonth() - end.getMonth());
        } else if (repeaterCombo == "year") {
            numberoftimes = (jende.getYear() - end.getYear());
        }
    }

    if (repeaterCombo != "none") {
        // add createScheduledJob for every numberoftimes
        for (var i = 1; i <= numberoftimes; i++) {
            if (repeaterCombo == "day") {
                begin.setDate(begin.getDate() + 1);
                end.setDate(end.getDate() + 1);
            } else if (repeaterCombo == "week") {
                begin.setDate(begin.getDate() + 7);
                end.setDate(end.getDate() + 7);
            } else if (repeaterCombo == "month") {
                var yx = begin.getYear() + 1900;
                var mx = begin.getMonth() + 1;
                var dx = begin.getDate();
                var mmx = begin.getMinutes();
                var hx = begin.getHours();
                begin = new Date(yx, mx, dx, hx, mmx);

                var yx = end.getYear() + 1900;
                var mx = end.getMonth() + 1;
                var dx = end.getDate();
                var mmx = end.getMinutes();
                var hx = end.getHours();
                end = new Date(yx, mx, dx, hx, mmx);
            } else if (repeaterCombo == "year") {
                var yx = begin.getYear() + 1900 + 1;
                var mx = begin.getMonth();
                var dx = begin.getDate();
                var mmx = begin.getMinutes();
                var hx = begin.getHours();
                begin = new Date(yx, mx, dx, hx, mmx);

                var yx = end.getYear() + 1900 + 1;
                var mx = end.getMonth();
                var dx = end.getDate();
                var mmx = end.getMinutes();
                var hx = end.getHours();
                end = new Date(yx, mx, dx, hx, mmx);
            }
            scheduleName = objectName + "###" + begin.getTime() + "###" + state;

            job = new Object();
            job.objectName = objectName;
            job.scheduleName = scheduleName;

            job.TYPE = TYPE;
            job.state = state;
            job.time = begin;

            createScheduledJob(job);

            // Create job for true and false
            scheduleName = objectName + "###" + end.getTime() + "###" + !state;

            job = new Object();
            job.objectName = objectName;
            job.scheduleName = scheduleName;

            job.TYPE = TYPE;
            job.state = !state;
            job.time = end;
            createScheduledJob(job);
        }
    }
}

function nextDay(d, dow){
    d.setDate(d.getDate() + (dow+(7-d.getDay())) % 7);
    return d;
}

function parseDecalc(jsonEvent, ID, type, parent, member) {
    adapter.log.info("parseDecalc for " + ID);
    var decalcDay = "";
    var decalcTime = "";

    var thermostat = thermostatArray[type];
    var decalc_day;
    var decalc_time;
    var dmin;
    var dhour;
    if (thermostat != undefined) {
        decalc_day = thermostat.decalc_day;
        decalc_time = thermostat.decalc_time;
        if (decalc_day == undefined) {
            decalc_day = thermostatArray.decalc_day;
        }
        if (decalc_time == undefined) {
            decalc_time = thermostatArray.decalc_time;
        }
        if (decalc_time instanceof Array && decalc_time.length == 2) {
            dmin = decalc_time[0];
            dhour = decalc_time[1];
            var min = jsonEvent[dmin];
            var hour = jsonEvent[dhour];
            decalcTime = (hour*60)+min;
        } else {
            decalcTime = jsonEvent[decalc_time];
        }
        decalcDay = jsonEvent[decalc_day];
    } else {
        return new Error("'type' must defined within io-package.json as type thermostat");
    }

    var editable;
    var today = new Date();
    /* Javascript Date
     0 = Sunday
     1 = Monday
     2 = Tuesday
     3 = Wednesday
     4 = Thursday
     5 = Friday
     6 = Saturday
     */

    /* Homematic Date
     0 = Saturday
     1 = Sunday
     2 = Monday
     3 = Tuesday
     4 = Wednesday
     5 = Thursday
     6 = Friday
     */
    if (decalcDay == 0) {
        decalcDay = 6;
    } else {
        decalcDay-=1;
    }

    var day = new Date(nextDay(today, decalcDay)).getDate();
    var hours = Math.floor(decalcTime / 60);
    var minutes = decalcTime % 60;
    var year = today.getYear() + 1900;
    var month = today.getMonth();

    var dateStart;

    // Todo: Create recurring Element, so fullcalendar can handle it
    //for (var wk = 1; wk < 52; wk++) {
    for (var wk = 1; wk < 2; wk++) {
        // New Event
        var event = new Object();

        event.IDID = member;

        event.start = new Date(year, month, day, hours, minutes);
        event.end = new Date(year, month, day, hours, minutes+30); // Only for reading
        adapter.log.debug("start:" + event.start + ",end:" + event.end);

        event.title = "DECALCIFICATION";

        var colorName = adapter.namespace + "." + member + ".color";
        if (colorName != undefined && states[colorName] != undefined) {
            event.color = states[colorName].val;
        } else {
            event.color = colors[colorPicker];
        }
        adapter.log.debug("ID: " + ID + " color: " + event.color);

        event.allDay = false;
        event.id = event.title + "_" + ID.replace(parent+".","");
        event.decalc = "true";

        // Create recurring Event
        if (wk == 1) {
            dateStart = event.start;
            editable = true;
            event.tooltip = "This is a recurring Event.";
        } else {
            editable = false;
            event.title = event.title + " (Repeated Event)";
            event.tooltip = "This is a recurring Event.\n\nThe original Event can be found at\n" + dateStart;
        }

        event.editable = editable;
        event.startEditable = editable;
        event.durationEditable = editable;

        allEvents[ID].push(event);
        adapter.log.debug("NEW START = " + event.start + " NEW END = " + event.end);
    }
}

function parseEvents(jsonEvent, ID, type, parent, member) {
    var event;

    var timeoutName = "";
    var temperatureName = "";


    var thermostat = thermostatArray[type];
    if (thermostat != undefined) {
        //temperatureName = thermostat.temperature;
        temperatureName = thermostat.timeoutText;
        if (temperatureName == undefined) {
            //temperatureName = thermostatArray.temperature;
            temperatureName = thermostatArray.timeoutText;
        }
        temperatureName = temperatureName[0] + "_";

        timeoutName = thermostat.timeoutText;
        if (timeoutName == undefined) {
            timeoutName = thermostatArray.timeoutText;
        }
        timeoutName = timeoutName[1] + "_";

    } else {
        return new Error("'type' must defined within io-package.json as type thermostat");
    }

    var jsonData = jsonEvent;
    var weekDays = ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY', 'SUNDAY'];
    var editable;
    var dateStart;

    for (var weekday in weekDays) {
        var firstMidnight = 0;

        for (var i = 1; i < 25; i++) {
            var tempName = temperatureName + weekDays[weekday] + "_" + i;
            adapter.log.debug("ID: " + ID + ", " + tempName + ":" + jsonData[tempName]);
            var timeName = timeoutName + weekDays[weekday] + "_" + i;
            adapter.log.debug("ID: " + ID + ", " + timeName + ":" + jsonData[timeName]);
            var timeout = jsonData[timeName];
            adapter.log.debug("############## ID: " + ID + ", " + timeout);

            var today = new Date();

            // Todo: Create recurring Element, so fullcalendar can handle it
            //for (var wk = 1; wk < 52; wk++) {
            for (var wk = 1; wk < 2; wk++) {
                var n = today.getDay() - 1;

                var year = today.getYear() + 1900;
                var month = today.getMonth();
                var day = today.getDate();
                var hours;
                var minutes;
                var tempn;

                if (timeout / 60 == 24 || timeout == 0) {
                    firstMidnight += 1;
                } else {
                    if (firstMidnight < 2) {
                        hours = Math.floor(timeout / 60);
                        minutes = timeout % 60;

                        // New Event
                        event = new Object();

                        event.IDID = member;

                        // CHECK if start begins at midnight
                        var temperature;

                        if (parseInt(minutes) + parseInt(hours) > 0 && i == 1) {
                            event.start = new Date(year, month, day - n + parseInt(weekday), 0, 0);
                            event.end = new Date(year, month, day - n + parseInt(weekday), hours, minutes);
                            adapter.log.debug("start:"+event.start+", end:"+event.end);
                            if (event.end == undefined) {
                                adapter.log.error("event.end is undefined");
                            }
                            var x = parseInt(i) - 1;

                            tempn = temperatureName + weekDays[weekday] + "_" + x;
                            temperature = jsonData[tempName];
                            event.title = tempName;

                            var colorName = adapter.namespace + "." + member + ".color";
                            if (colorName != undefined && states[colorName] != undefined) {
                                event.color = states[colorName].val;
                            } else {
                                event.color = colors[colorPicker];
                            }
                            adapter.log.debug("ID: " + ID + " color: " + event.color);

                            event.allDay = false;
                            event.id = event.title + "_" + ID;
                            event.temperature = temperature;
                            event.repeater = "true";

                            // Create recurring Event
                            if (wk == 1) {
                                dateStart = event.start;
                                editable = true;
                                event.tooltip = "This is a recurring Event.";
                            } else {
                                editable = false;
                                event.title = event.title + " (Repeated Event)";
                                event.tooltip = "This is a recurring Event.\n\nThe original Event can be found at\n" + dateStart;
                            }

                            event.editable = editable;
                            event.startEditable = editable;
                            event.durationEditable = editable;
                            // Create recurring Event

                            if (allEvents[parent + "." + ID] == undefined) {
                                allEvents[parent + "." + ID] = [];
                            }
                            allEvents[parent + "." + ID].push(event);

                            adapter.log.debug("NEW START = " + event.start + " NEW END = " + event.end);
                        }

                        event = new Object();
                        event.start = new Date(year, month, day - n + parseInt(weekday), hours, minutes);

                        var x = parseInt(i) + 1;
                        var dummy = timeoutName + weekDays[weekday] + "_" + x;
                        adapter.log.debug(timeName + ":" + jsonData[timeName]);
                        var timeend = jsonData[dummy];

                        hours = Math.floor(timeend / 60);
                        minutes = timeend % 60;

                        event.end = new Date(year, month, day - n + parseInt(weekday), hours, minutes);
                        adapter.log.debug("start:"+event.start+",end:"+event.end);
                        if (event.end == undefined) {
                            adapter.log.error("event.end is undefined");
                        }

                        x = parseInt(i) + 1;
                        if (x == 0)
                            x = 2;
                        tempn = temperatureName + weekDays[weekday] + "_" + x;
                        temperature = jsonData[tempn]
                        event.title = tempn;

                        var colorName = adapter.namespace + "." + member + ".color";
                        if (colorName != undefined && states[colorName] != undefined) {
                            event.color = states[colorName].val;
                        } else {
                            event.color = colors[colorPicker];
                        }
                        adapter.log.debug("ID: " + ID + " color: " + event.color);

                        event.allDay = false;
                        event.id = event.title + "_" + ID;
                        event.temperature = temperature;
                        event.repeater = "true";

                        event.IDID = member;

                        // Create recurring Event
                        if (wk == 1) {
                            dateStart = event.start;
                            editable = true;
                            event.tooltip = "This is a recurring Event.";
                        } else {
                            editable = false;
                            event.title = event.title + " (Repeated Event)";
                            event.tooltip = "This is a recurring Event.\n\nThe original Event can be found at\n" + dateStart;
                        }

                        event.editable = editable;
                        event.startEditable = editable;
                        event.durationEditable = editable;
                        // Create recurring Event

                        allEvents[parent + "." + ID].push(event);

                        adapter.log.debug("START = " + event.start + " END = " + event.end);
                    }
                }
                today.setTime(today.getTime() + 7 * (24*60*60*1000));
            }
        }
    }
}
