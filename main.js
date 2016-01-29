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

var colors = ["#307DD7", "#AA4643", "#89A54E", "#71588F", "#4198AF", "#7FD13B", "#EA157A", "#FEB80A", "#00ADDC", "#738AC8",
    "#E8601A", "#FF9639", "#F5BD6A", "#599994", "#115D6E", "#D02841", "#FF7C41", "#FFC051", "#5B5F4D", "#364651", "#25A0DA",
    "#309B46", "#8EBC00", "#FF7515", "#FFAE00", "#0A3A4A", "#196674", "#33A6B2", "#9AC836", "#D0E64B", "#CC6B32", "#FFAB48",
    "#FFE7AD", "#A7C9AE", "#888A63", "#3F3943", "#01A2A6", "#29D9C2", "#BDF271", "#FFFFA6", "#1B2B32", "#37646F", "#A3ABAF",
    "#E1E7E8", "#B22E2F", "#5A4B53", "#9C3C58", "#DE2B5B", "#D86A41", "#D2A825", "#993144", "#FFA257", "#CCA56A", "#ADA072",
    "#949681", "#105B63", "#EEEAC5", "#FFD34E", "#DB9E36", "#BD4932", "#BBEBBC", "#F0EE94", "#F5C465", "#FA7642", "#FF1E54",
    "#60573E", "#F2EEAC", "#BFA575", "#A63841", "#BFB8A3", "#444546", "#FFBB6E", "#F28D00", "#D94F00", "#7F203B", "#583C39",
    "#674E49", "#948658", "#F0E99A", "#564E49", "#142D58", "#447F6E", "#E1B65B", "#C8782A", "#9E3E17", "#4D2B1F", "#635D61",
    "#7992A2", "#97BFD5", "#BFDCF5", "#844341", "#D5CC92", "#BBA146", "#897B26", "#55591C", "#56626B", "#6C9380", "#C0CA55",
    "#F07C6C", "#AD5472", "#96003A", "#FF7347", "#FFBC7B", "#FF4154", "#642223", "#5D7359", "#E0D697", "#D6AA5C", "#8C5430",
    "#661C0E", "#16193B", "#35478C", "#4E7AC7", "#7FB2F0", "#ADD5F7", "#7B1A25", "#BF5322", "#9DA860", "#CEA457", "#B67818",
    "#0081DA", "#3AAFFF", "#99C900", "#FFEB3D", "#309B46", "#0069A5", "#0098EE", "#7BD2F6", "#FFB800", "#FF6800", "#FF6800",
    "#A0A700", "#FF8D00", "#678900", "#0069A5"];

var types = {
    0: 'global',
    1: 'thermostat',
    2: 'switch',
    3: 'variable',
    4: 'undefined',
    5: 'decalc',
    6: 'ical',
    7: 'script',
    global: 0,
    homematic: 1,
    switch: 2,
    variable: 3,
    undefined: 4,
    decalc: 5,
    ical: 6,
    script: 7
};

var weekdays = {
    'MO': 1,
    'TU': 2,
    'WE': 3,
    'TH': 4,
    'FR': 5,
    'SA': 6,
    'SU': 0
};

var objects =           {};
var states =            {};
// var enums =             [];
var allEvents = {};
var colorPicker = 0;
var scheduledJobs = {};

var thermostatArray = [];
var variableArray = [];

// Todo: Allow more then one Instance
var iCalID = "ical.0.data.table"; //JS iCal table

function getData(callback) {
    var statesReady;
    var objectsReady;

    adapter.config.initThermostat = true;

    // TODO: Create an entry, to reload all Thermostats on every monday 00:01
    if(adapter.config.forceInit == true) {
        // If forceInit, we must reinit all known Thermostats
        adapter.config.initThermostat = true;
        adapter.objects.getObjectList({startkey: 'occ.' + adapter.instance, endkey: 'occ.' + adapter.instance + '\u9999'}, function (err, res) {
            res = res.rows;
            for (var i = 0; i < res.length; i++) {
                var id = res[i].doc.common.name;

                adapter.log.debug('Remove ' + id + ': ' + id);

                adapter.delObject(id, function (res, err) {
                    if (res != undefined && res != "Not exists") adapter.log.error("res from delObject: " + res);
                    if (err != undefined) adapter.log.error("err from delObject: " + err);
                });
                adapter.deleteState(id, function (res, err) {
                    if (res != undefined && res != "Not exists") adapter.log.error("res from deleteState: " + res);
                    if (err != undefined) adapter.log.error("err from deleteState: " + err);
                });
            }
        });
        adapter.extendForeignObject('system.adapter.' + adapter.namespace, {native: {forceInit: false}});
    }

    adapter.log.debug('requesting all states');
    adapter.getForeignStates('occ.*', function (err, res) {
        states = res;
        statesReady = true;
        adapter.log.debug('received all states');
        if (objectsReady && typeof callback === 'function') callback();
    });
    adapter.log.debug('requesting all objects');

    adapter.objects.getObjectList({include_docs: false}, function (err, res) {
        res = res.rows;
        objects = {};
        for (var i = 0; i < res.length; i++) {
            objects[res[i].doc._id] = res[i].doc;
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
    /*
    message: function (obj) {
        adapter.log.error("MESSAGE arrived: " + JSON.stringify(obj));
        // Split message
        // MESSAGE arrived: {"command":"send","message":{"start":"2015-07-05T13:18:39.332Z","end":"2015-07-05T13:18:39.332Z","title":"First Title","objectID":"#Object"},"from":"system.adapter.javascript.0","_id":5693}

        var event = obj.message;
        if (event.objectID == undefined || event.start == undefined || event.state == undefined || event.end == undefined || event.title == undefined) {
            adapter.log.error("sendTo was not successfull...");
        } else {
            // Dummy Objects
            event.subID = obj._id;
            event.id = event.title + "_" + event.id + "_" + event.objectID;
            event.editable = true;
            event.state_switch = true;
            event.typo = "switch";

            event.start = new Date(event.start);
            event.end = new Date(event.end);
            var scheduleName = event.objectID + "###" + event.start.getTime() + "###" + event.state;

            job = new Object();
            job.objectName = event.objectID;
            job.scheduleName = scheduleName;

            var obj = objects[event.objectID];
            job.TYPE = obj.type;

            // Create job for true and false
            job.state = event.state;
            job.time = event.start;
            createScheduledJob(job);

            // If true, create two Jobs
            if (obj.common.type == "boolean") {
                var job = new Object();
                scheduleName = event.objectID + "###" + event.end.getTime() + "###" + !event.state;

                job.objectName = event.objectID;
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
    */
    objectChange: function (id, object) {
        adapter.log.debug('objectChange ' + id + ' ' + JSON.stringify(object));

        if (object == undefined) {
            return;
        }
        if (id.search("occ.0") == 0) {
            var address = id.replace("occ.0.","");

            var paramset = {};
            var decalcset = {};
            var state = object.common.eventState || "";

            // Only if Homematic Thermostat
            if (id.search(".dummy") > 0) {
                // We need the Parent Object
                var objectID = object.native.objectID;
                var elems = objectID.split(".");
                var parent = elems[0] + "." + elems[1] + "." + elems[2];
                var objectType = objects[parent].native.TYPE;

                var thermostat;
                thermostat = thermostatArray[objectType];
                if (thermostat == undefined) {
                    return new Error("'type' must defined within io-package.json as type thermostat");
                }

                // We need all Objects from this parent
                var rootID = 'occ.0.' + objectID;
                for (var addr in objects) {
                    if (addr.search(rootID) == 0) {
                        if (addr.search(".color") < 0 && addr.search(".dummy") < 0) {
                            var obj = objects[addr];
                            var native = obj.native;
// #################################################### //
                            if (thermostat != undefined) {
                                var temperature = native.state; // 17
                                var title = native.subject;
                                var number = title.split("_")[2];
                                number = number - 1;
                                if (number == 0) {
                                    // Todo: it's the last entry from day before
                                    // TEMPERATUR_MONDAY_0 = TEMPERATUR_SUNDAY_???
                                }

                                var from = native.from;
                                var to = native.to;
                                var x = new Date(to);
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
                                var decalc_address = parent + ":" + decalc_chn;

                                // Bugfix, Set Decalc
                                // TODO: Check if DECALC needs extra channel (thermostat.decalc_chn)
                                if (title == "DECALCIFICATION") {
                                    var decalcDay = new Date(from).getDay();

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
                                    var decalcType;
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
                                            decalcset[decalc_time[0]] = new Date(from).getMinutes();
                                            decalcset[decalc_time[1]] = new Date(from).getHours();
                                        } else {
                                            decalcset[decalc_time] = (new Date(from).getHours() * 60) + new Date(from).getMinutes();
                                        }
                                        decalcset[decalc_day] = decalcDay; //  0 => Saturday, ..., 6 => Friday
                                    } else {
                                        return new Error("'type' must defined within io-package.json as type thermostat");
                                    }
                                } else {
                                    paramset[timeoutText] = timeout;
                                    paramset[title] = {explicitDouble: parseFloat(temperature)};
                                }
                            }
// #################################################### //
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
                var param_address = parent+":"+param_chn;
                if (param_address == decalc_address) {
                    for (var value in decalcset) {
                        paramset[value] = decalcset[value];
                    }
                    putParamsets(param_address, paramset, decalcType);
                } else {
                    putParamsets(param_address, paramset, paramType);
                    putParamsets(decalc_address, decalcset, decalcType);
                }

                var dummyName = adapter.namespace + "." + objectID + ".dummy";
                adapter.delObject(dummyName, function (res, err) {
                    if (res != undefined && res != "Not exists") adapter.log.error("res from delObject: " + res);
                    if (err != undefined) adapter.log.error("err from delObject: " + err);
                });
                adapter.deleteState(dummyName, function (res, err) {
                    if (res != undefined && res != "Not exists") adapter.log.error("res from deleteState: " + res);
                    if (err != undefined) adapter.log.error("err from deleteState: " + err);
                });
                return;
            } else if (state == "save") {
                // If originalData.subject diffs from subject, we must delete the original Object
                if (object.native.originalData != undefined && object.native.originalData.subject != undefined && object.native.originalData.subject != object.native.subject) {
                    var objectName = 'occ.0.' + object.native.objectID + "." + object.native.originalData.subject + "_#" + object.native.id + "#";
                    adapter.log.info("Delete Object " + objectName);
                    adapter.delObject(objectName, function(err,res) {
                        adapter.log.debug("ERR: delObject " + err);
                        adapter.log.debug("RES: delObject " + res);
                    });
                }

                if (object.native.type == types.homematic || object.native.type == types.decalc) {
                    adapter.log.info("Nothing todo for Homematic Thermostat");
                    return;
                } else if (object.native.type == types.switch) {
                } else if (object.native.type == types.variable) {
                } else if (object.native.type == types.ical) {
                    adapter.log.info("Nothing todo for iCal Objects");
                    return;
                } else if (object.native.type == types.script) {
                    adapter.sendTo("javascript", "Logging");
                } else if (object.native.type == types.undefined) {
                    adapter.log.info("Nothing todo for Undefined");
                    return;
                } else if (object.native.type == types.global) {
                    adapter.log.info("Nothing todo for Global");
                    return;
                } else {
                    adapter.log.info("No valid Type found, nothing todo");
                    return;
                }

                if (object.native.originalState && object.native.originalState !== object.native.state) {
                    adapter.log.info("Job Management, Delete cause of state were changed");
                    var origState = object.native.state;
                    object.native.state = object.native.originalState;
                    jobManagement(object, undefined, false);
                    object.native.state = origState;
                    object.native.originalState = origState;
                }

                if ((object.native.originalData.from && object.native.originalData.from != object.native.from) ||
                    (object.native.originalData.to && object.native.originalData.to != object.native.to)) {
                    adapter.log.info("Job Management, Delete cause of from / to were changed");
                    jobManagement(object, undefined, false);
                }

                // if recurrence exists, create new Jobs
                var recurrencePattern = object.native.recurrencePattern;

                // if originalData.recurrence exits and diffs from recurrence, delete all old Jobs
                if (object.native.originalData.recurrencePattern && object.native.originalData.recurrencePattern != object.native.recurrencePattern) {
                    var originalRecurrencePattern = object.native.originalData.recurrencePattern;
                    adapter.log.info("RECURRENCEPATTERN ORIGINAL = " + originalRecurrencePattern);
                    adapter.log.info("Job Management, Delete cause of recurrencePattern were changed");
                    jobManagement(object, originalRecurrencePattern, false);
                    object.native.originalData.recurrencePattern = recurrencePattern;
                }

                adapter.log.info("Job Management, Add");
                jobManagement(object, recurrencePattern, true);

                // loadData();
            } else if (state == "delete") {
                console.log("Remove old scheduled Jobs if they exists");

                // if recurrence exists, remove all Jobs
                var recurrencePattern = object.native.recurrencePattern;

                adapter.log.info("Job Management, Delete");
                jobManagement(object, recurrencePattern, false);

                adapter.log.info("Delete Object " + id);
                adapter.delObject(id, function(err,res) {
                    adapter.log.debug("ERR: delObject " + err);
                    adapter.log.debug("RES: delObject " + res);
                });
            }
        }

        // TODO: Don't know what these means
        if (id.search("LEQ115") > 0) {
            adapter.log.debug("objectChange: ID " + id + " = " + JSON.stringify(state));
        }

        // TODO: Reload after change from iCal, etc.
    },
    stateChange: function (id, state) {
        adapter.log.debug("ID " + id + " = " + JSON.stringify(state));

        if (id.search("CONFIG_PENDING") > 0) {
            //adapter.log.debug(id + " = " + JSON.stringify(state));
            if (state.val == true) {
                adapter.log.info(id + " active");
            } else {
                adapter.log.info(id + " done");
                id = id.replace(".CONFIG_PENDING","");
                // TODO: id = hm-rpc.0.JEQ0550466.0, but must = hm-rpc.0.JEQ0550466.1.TEMPERATURE
                //id = adapter.namespace + "." + id.slice(0, id.length-2);
                id = id.slice(0, id.length-2);
                adapter.log.info("getObjectList for " + id);
                adapter.objects.getObjectList({startkey: id, endkey: id + '\u9999'}, function (err, res) {
                    loadData(id);
                });
            }
        }

        // Todo: remove hardcoded objects for MAX! Thermostat
        if (id.search("LEQ115") > 0) {
            adapter.log.debug("stateChange: ID " + id + " = " + JSON.stringify(state));
        }
        // Todo: remove hardcoded instance number from ical
        if (id == iCalID) {
            if (adapter.config.ical == true) {
                adapter.log.info("ical has changed, reload Data");
                adapter.log.debug('stateChange ' + id + ' ' + JSON.stringify(state));
                getData(function () {
                    addiCalObjects();
                });
            }
        } else if (state != undefined && state.ack != undefined && state.ack != true) {
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
            adapter.log.info("scheduleName = " + jobName);
            scheduledJobs[jobName] = job;

            var a = schedule.scheduleJob(job.scheduleName, job.time, function(){
                adapter.log.info("start changeState for TYPE " + job.TYPE + " address " + job.objectName);
                var obj = objects[job.objectName];
                if (obj != undefined && obj.common != undefined && obj.common.role != undefined) {
                    // hm-rpc switches has type channel and role switch
                    // zwave switches has type state and role state
                    if (obj.common.role == "switch" && obj.type != "state") {
                        if (job.objectName.search("STATE" == 0)) {
                            job.objectName = job.objectName + ".STATE";
                        }
                    }
                }
                if (job.TYPE == "script") {
                    var script = job['state'].replace("script.js.","");
                    adapter.sendTo("javascript", script);
                } else {
                    changeState(job.objectName, job.state);
                }
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
    adapter.log.info("Reload Data for " + objectID);
    // Load only specific Object, cause CONFIG_PENDING was done
    if (objectID != undefined) {
        loadObject(objectID);
    } else {
        if (adapter.config.initThermostat == true) {
            var n = 'hm-rpc';
            for (var obj in objects){
                if (obj.search(n) == 0) {
                    var o = objects[obj];
                    if (o.type == "device") {
                        var type = objects[obj].native.TYPE || "";
                        var thermostat = thermostatArray[type];
                        if (thermostat != undefined) {
                            adapter.log.debug(type);
                            loadObject(obj);
                        }
                    }
                }
            }
            adapter.extendForeignObject('system.adapter.' + adapter.namespace, {native: {initThermostat: false}});
        }
    }
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

    if (lObject !== undefined && lObject.native != undefined && lObject.native.TYPE !== undefined ) {
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
    } else if (lObject !== undefined && lObject.native != undefined && lObject.native.TypeName != undefined && lObject.native.TypeName == "VARDP") {
        parseScheduler(member);
    }
}

function addiCalObjects() {
    adapter.getForeignState(iCalID, function (err, res) {
        if (!err && res) {

        var events = [];
        var event;

        if (res != undefined && res.val != undefined) {
            for (var i=0;i<res.val.length;i++) {
                var ev = res.val[i];

                // New Event
                event = new defaultEvent();
                var ID = 'iCal';
                event.objectID = ID;

                event.type = types.iCal;

                // SOLL: 2016-01-11 02:00:00

                event.from = new Date(ev._date);

                event.to = new Date(ev._end);
                event.subject = ev.event;
                event.resourceId = 'iCal';
                event.room = ev._class;
                event.type = types.ical;
                event.draggable = false;
                event.resizable = false;

//                event.readOnly = true;

                // remove @ . from _IDID
                var id = ev._IDID;
                id = id.replace("@","");
                id = id.replace(".","");
                event.id = id;
                event._id = ID;

                var colorName = adapter.namespace + "." + ID + ".color";
                if (colorName != undefined && states[colorName] != undefined) {
                    event.background = states[colorName].val;
                    event.color = "black";
                } else {
                    event.background = colors[colorPicker];
                    event.color = "black";
                }
                adapter.log.debug("ID: " + ID + " color: " + event.background);
                event.allDay = ev._allDay;

                // Split ev._section (occ#LEQ0885447:1#true)
                var state;
                var elems = ev._section.split("#");
                if (elems.length == 3 && elems[0] == "occ") {
                    var address = elems[1];
                    state = elems[2];
                    // *********************************************************
                    // Todo: Dummy Objects
                    var wk = 1;
                    var dateStart;
                    var editable;

                    // Create recurring Event
                    if (wk == 1) {
                        dateStart = event.start;
                        editable = true;
                    } else {
                        editable = false;
                        event.title = event.title + " (Repeated Event)";
                        event.tooltip = "This is a recurring Event.\n\nThe original Event can be found at\n" + dateStart;
                    }

                    event.editable = editable;
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

                    event.type = types.global;
                    event.state_switch = false;

                    if (obj.native != undefined) {
                        // HM-REGA Variables
                        if ( obj.native["TypeName"] != undefined && obj.native["TypeName"] == 'VARDP') {
                            event.type = types.variable;
                            event.subType = "VARDP";
                        // Homematic Switch
                        } else if (obj.native["CONTROL"] != undefined) {
                            event.type = types.switch;
                            event.state_switch = true;
                            event.subType = "SWITCH";
                        // Zwave Switch
                        } else if (obj.native['Label'] != undefined && obj.native['Label'] == "Switch") {
                            event.type = types.switch;
                            event.state_switch = true;
                            event.subType = "SWITCH";
                        } else {
                            event.subType = obj.native["PARENT_TYPE"];
                        }
                    } else {
                        event.type = types.variable;
                        event.subType = "VARDP";
                    }

                    event.objectID = address;

                    var obj = objects[address];
                    if (obj.common != undefined && obj.common.role != undefined && (obj.common.role == "switch" || obj.common.role == "state")) {
                        if (state == "on") {
                            event.state_switch = true;
                            state = true;
                            event.typo = "switch";
                        } else if (state == "off") {
                            event.state_switch = false;
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
                    adapter.log.error("No valid iCal Objects found, Description Text must be occ#OBJECT_ADDRESS#OBJECT_VALUE");
                    events.push(event);
                    writeEvents2ioBroker("#iCal", JSON.stringify(events));
                }
            }
            writeEvents2ioBroker("#iCal", JSON.stringify(events));
        }
        }
    });
}

function createObjects(allEvents) {
    var object;

    // TODO: Create complete Object Tree
    // occ.0.hm-rpc.0.JEQ0550466.1.TEMPERATURE
    if (allEvents.length > 0) {
        var allEV = JSON.parse(allEvents);
        if (allEV) {
            for (var i in allEV) {
                var event = allEV[i];

                if (event != null) {
                    var title = event.subject;
                    var objectID = event.objectID;
                    object = objects[objectID.replace(":", ".")];
                    var id;
                    if (object == undefined || object._id == undefined) {
                        id = event._id;
                    } else {
                        id = object._id;
                    }
                    var objectName = adapter.namespace + "." + id + "." + title;

                    var stateObj = {
                        common: {
                            name:  objectName,
                            read:  true,
                            write: true,
                            type: 'state',
                            role: 'meta.config'
                        },
                        native: event,
                        type:   'state'
                    };
                    adapter.extendObject(objectName, stateObj);

                    var colorName = adapter.namespace + "." + id + ".color";
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
                    adapter.extendObject(colorName, colorObj);
                    adapter.setState(colorName, {val: event.background, ack: true});
                }
            }
        }
    }
}

function getParamsets(objectID, paramType, flag, rootID, member, name) {
    adapter.log.debug(adapter.namespace);
    adapter.log.debug(objectID);
    if (name == undefined) {
        name = objects[member].common.name || objects[member]._id;
    }

    adapter.log.debug("PARSE: " + name);
    var objectsID = objectID.split(".");
    adapter.log.debug("try to getParamset: "+objectID+" rootID:"+rootID+" member:"+member+" flag(decalc):"+flag );

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

            if (flag) {
                parseEvents(data, ID, type, parent, member, name);

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
                    getParamsets(decalcID, paramType, false, parent+"."+ID, member, name);

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
                parseDecalc(data, rootID, type, parent, member, name);
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

function writeEvents2ioBroker(ID, event) {
    adapter.log.debug("writeEvents2ioBroker for " + ID);
    ID = ID.replace(":",".");
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
                            adapter.log.debug("tempObject is undefined");
                        } else {
                            data[tempName] = tempObject;
                            data[timeName] = timeObject;
                        }
                    }
                }
            }

            /* ################################## */
            var decalc_day = thermostat.decalc_day;
            var decalc_time = thermostat.decalc_time;
            var decalcTime;
            var dmin;
            var dhour;

            if (decalc_day == undefined) {
                decalc_day = thermostatArray.decalc_day;
            }
            if (decalc_time == undefined) {
                decalc_time = thermostatArray.decalc_time;
            }
            if (decalc_time instanceof Array && decalc_time.length == 2) {
                dmin = decalc_time[0];
                dhour = decalc_time[1];
                var min = params[dmin];
                var hour = params[dhour];
                decalcTime = (hour*60)+min;

                data[decalc_day] = params[decalc_day];
                data[dmin] = params[dmin];
                data[dhour] = params[dhour];
            } else {
                if (params[decalc_time] != undefined) {
                    data[decalc_time] = params[decalc_time];
                }
            }

            // TODO: Remove Hardcoded Value
            if (TYPE == "HM-CC-TC") {
                data['MODE_TEMPERATUR_REGULATOR'] = 1; // Always set Mode = AUTO
            }
            /* ################################## */

            adapter.sendTo(instance, "putParamset", {ID: ID, paramType: paramType, params: data}, function (doc) {
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
            var object = res[i].doc;

            // if recurrence exists, remove all Jobs
            var recurrencePattern = object.native.recurrencePattern;

            adapter.log.info("Job Management - parseScheduler, Add");
            jobManagement(object, recurrencePattern, true);
        }
    });
}

function addDays(date, days) {
    var result = new Date(date);
    result.setDate(date.getDate() + days);
    return result;
}

function untilStringToDate (date) {
    var regex = /^(\d{4})(\d{2})(\d{2})(T(\d{2})(\d{2})(\d{2})Z)?$/;
    var nDate = regex.exec(date);
    if (!nDate) {
        throw new Error("Invalid UNTIL value: " + date)
    }
    return new Date(Date.UTC(nDate[1], nDate[2] - 1, nDate[3], nDate[5] || 0, nDate[6] || 0, nDate[7] || 0));
}

function getNextDayOfWeek(date, dayOfWeek) {
    // Code to check that date and dayOfWeek are valid left as an exercise ;)
    var resultDate = new Date(date.getTime());
    resultDate.setDate(date.getDate() + (7 + dayOfWeek - date.getDay()) % 7);
    return resultDate;
}

function jobManagement(object, recurrencePattern, flag) {
    // TODO: change Jobs from recurrencePattern
    if (recurrencePattern) {
        // FREQ=DAILY;INTERVAL=1;COUNT=2
        adapter.log.info("RECURRENCEPATTERN = " + recurrencePattern);

        var rec = recurrencePattern.split(";");
        var frequence = rec[0].replace("FREQ=", "");
        var interval = parseInt(rec[1].replace("INTERVAL=", ""));
        var count;
        var until;
        var byDay;
        var byMonthDay;
        var byMonth;
        var byYearDay;

        if (rec[2].indexOf("COUNT=") == 0) {
            count = rec[2].replace("COUNT=", "");
        } else if (rec[2].indexOf("UNTIL=") == 0) {
            until = rec[2].replace("UNTIL=", "");
        }

        if (frequence == "WEEKLY") {
            byDay = rec[3].replace("BYDAY=", "");
        }

        if (frequence == "MONTHLY") {
            if (until) {
                byMonthDay = rec[4].replace("BYMONTHDAY=", "");
            } else if (count) {
                byMonthDay = rec[4].replace("BYDAY=", "");
            }
        }

        if (frequence == "YEARLY") {
            byMonth = rec[5].replace("BYMONTH=", "");
            if (rec[6].indexOf("BYYEARDAY=") == 0) {
                byYearDay = rec[6].indexOf("BYYEARDAY=");
            } else if (rec[6].indexOf("BYDAY=") == 0) {
                byYearDay = rec[6].indexOf("BYDAY=");
            }
        }

        var originalObject = (JSON.parse(JSON.stringify(object)));

        switch (frequence) {
            case "DAILY" :
                if (until && until.indexOf("9999") < 0) {
                    var end = untilStringToDate(until);
                    var begin = new Date(originalObject.native.from);
                    end.setMinutes(begin.getMinutes());
                    end.setHours(begin.getHours());

                    var from = new Date(originalObject.native.from);
                    var to = new Date(originalObject.native.to);

                    if (originalObject.native.originalData.from &&
                        originalObject.native.originalData.from != originalObject.native.from &&
                        (typeof originalObject.native.originalData.from) == "string") {
                        from = new Date(originalObject.native.originalData.from);
                    }

                    if (originalObject.native.originalData.to &&
                        originalObject.native.originalData.to != originalObject.native.to &&
                        (typeof originalObject.native.originalData.to) == "string") {
                        to = new Date(originalObject.native.originalData.to);
                    }

                    while (end >= from) {
                        jobManagement(originalObject, undefined, flag);

                        from = addDays(from, interval);
                        to = addDays(to, interval);

                        originalObject.native.from = from;
                        originalObject.native.to = to;
                        originalObject.native.originalData.from = from;
                        originalObject.native.originalData.to = to;

                        from = new Date(originalObject.native.from);
                        to = new Date(originalObject.native.to);
                    }
                } else {
                    if (until && until.indexOf("9999") == 0) {
                        count = 100;
                    }
                    var from = new Date(originalObject.native.from);
                    var to = new Date(originalObject.native.to);

                    if (originalObject.native.originalData.from &&
                        originalObject.native.originalData.from != originalObject.native.from &&
                        (typeof originalObject.native.originalData.from) == "string") {
                        from = new Date(originalObject.native.originalData.from);
                    }

                    if (originalObject.native.originalData.to &&
                        originalObject.native.originalData.to != originalObject.native.to &&
                        (typeof originalObject.native.originalData.to) == "string") {
                        to = new Date(originalObject.native.originalData.to);
                    }
                    for (var c = 0; c < count; c++) {
                        jobManagement(originalObject, undefined, flag);

                        from = addDays(from, interval);
                        to = addDays(to, interval);

                        originalObject.native.from = from;
                        originalObject.native.to = to;
                        originalObject.native.originalData.from = from;
                        originalObject.native.originalData.to = to;

                        from = new Date(originalObject.native.from);
                        to = new Date(originalObject.native.to);
                    }
                }
                object = originalObject;
                return true;
            case "WEEKLY":
                // FREQ=WEEKLY;INTERVAL=1;UNTIL=99991230T230000Z;BYDAY=SU
                if (until && until.indexOf("9999") < 0) {
                    var end = untilStringToDate(until);
                    var begin = new Date(originalObject.native.from);
                    end.setMinutes(begin.getMinutes());
                    end.setHours(begin.getHours());

                    var from = new Date(originalObject.native.from);
                    var to = new Date(originalObject.native.to);

                    if (originalObject.native.originalData.from &&
                        originalObject.native.originalData.from != originalObject.native.from &&
                        (typeof originalObject.native.originalData.from) == "string") {
                        from = new Date(originalObject.native.originalData.from);
                    }

                    if (originalObject.native.originalData.to &&
                        originalObject.native.originalData.to != originalObject.native.to &&
                        (typeof originalObject.native.originalData.to) == "string") {
                        to = new Date(originalObject.native.originalData.to);
                    }

                    var day = from.getDay();
                    var w = byDay.split(",");

                    var f = new Date((JSON.parse(JSON.stringify(from))));
                    var t = new Date((JSON.parse(JSON.stringify(to))));

                    for (var i = 0; i < w.length; i++) {
                        var wks = weekdays[w[i]];

                        while (end >= from) {
                            var first = getNextDayOfWeek(f, weekday);
                            var second = getNextDayOfWeek(t, weekday);

                            jobManagement(originalObject, undefined, flag);

                            if (first == undefined && second == undefined) {
                                var from = new Date(originalObject.native.from);
                                var to = new Date(originalObject.native.to);

                                if (originalObject.native.originalData.from &&
                                    originalObject.native.originalData.from != originalObject.native.from &&
                                    (typeof originalObject.native.originalData.from) == "string") {
                                    from = new Date(originalObject.native.originalData.from);
                                }

                                if (originalObject.native.originalData.to &&
                                    originalObject.native.originalData.to != originalObject.native.to &&
                                    (typeof originalObject.native.originalData.to) == "string") {
                                    to = new Date(originalObject.native.originalData.to);
                                }
                            } else {
                                from = first;
                                to = second;
                            }
                            originalObject.native.from = from;
                            originalObject.native.to = to;
                            originalObject.native.originalData.from = from;
                            originalObject.native.originalData.to = to;

                            jobManagement(originalObject, undefined, flag);

                            // Only each Week on the same day as from was
                            from = addDays(from, interval + 6);
                            to = addDays(to, interval + 6);

                            originalObject.native.from = from;
                            originalObject.native.to = to;
                            originalObject.native.originalData.from = from;
                            originalObject.native.originalData.to = to;

                            first = undefined;
                            second = undefined;
                        }
                    }
                } else {
                    if (until && until.indexOf("9999") == 0) {
                        count = 100;
                    }

                    for (var i = 0; i < w.length; i++) {
                        var weekday = weekdays[w[i]];

                        var first = getNextDayOfWeek(f, weekday);
                        var second = getNextDayOfWeek(t, weekday);

                        for (var c = 0; c < count; c++) {
                            if (first == undefined && second == undefined) {
                                var from = new Date(originalObject.native.from);
                                var to = new Date(originalObject.native.to);

                                if (originalObject.native.originalData.from &&
                                    originalObject.native.originalData.from != originalObject.native.from &&
                                    (typeof originalObject.native.originalData.from) == "string") {
                                    from = new Date(originalObject.native.originalData.from);
                                }

                                if (originalObject.native.originalData.to &&
                                    originalObject.native.originalData.to != originalObject.native.to &&
                                    (typeof originalObject.native.originalData.to) == "string") {
                                    to = new Date(originalObject.native.originalData.to);
                                }
                            } else {
                                from = first;
                                to = second;
                            }
                            originalObject.native.from = from;
                            originalObject.native.to = to;
                            originalObject.native.originalData.from = from;
                            originalObject.native.originalData.to = to;

                            jobManagement(originalObject, undefined, flag);

                            // Only each Week on the same day as from was
                            from = addDays(from, interval + 6);
                            to = addDays(to, interval + 6);

                            originalObject.native.from = from;
                            originalObject.native.to = to;
                            originalObject.native.originalData.from = from;
                            originalObject.native.originalData.to = to;

                            first = undefined;
                            second = undefined;
                        }
                    }
                }
                object = originalObject;
                return true;

                return true;
            case "MONTHLY":
                return true;
            case "YEARLY":
                return true;
        }
    }

    if (flag) {
        // Create Jobs
        var state = object.native.state;

        var objectName = object.native.objectID;
        var begin = new Date(object.native.from);
        var to = new Date(object.native.to);
        var TYPE = types[object.native.type];

        // var scheduleName = objectName + "###" + begin.getTime() + "###" + state;
        var scheduleName = objectName + "###" + begin.getTime() + "###" + state;

        var job = new Object();
        job.objectName = objectName;
        job.scheduleName = scheduleName;
        job.TYPE = TYPE;

        job.state = state;
        job.time = begin;

        createScheduledJob(job);

        if (state == true || state == false) {
            job = new Object();
            scheduleName = objectName + "###" + to.getTime() + "###" + !state;

            job.objectName = objectName;
            job.scheduleName = scheduleName;
            job.TYPE = TYPE;

            job.state = !state;
            job.time = to;
            createScheduledJob(job);
        }
    } else {
        var allJobs = schedule['scheduledJobs'];

        var state = object.native.state;

        var objectName = object.native.objectID;
        var begin = new Date(object.native.originalData.from);
        var to = new Date(object.native.originalData.to);
        var TYPE = types[object.native.type];

        var scheduleName = objectName + "###" + begin.getTime() + "###" + state;

        var job = new Object();
        job.objectName = objectName;
        job.scheduleName = scheduleName;
        job.TYPE = TYPE;

        job.state = state;
        job.time = begin;

        if (allJobs[scheduleName] != undefined) {
            adapter.log.info("Cancel Job: " + scheduleName);
            allJobs[scheduleName].cancel();
        } else {
            adapter.log.info("Job: " + scheduleName + " did not exist, do nothing");
        }

        if (state == true || state == false) {
            job = new Object();
            scheduleName = objectName + "###" + to.getTime() + "###" + !state;

            job.objectName = objectName;
            job.scheduleName = scheduleName;
            job.TYPE = TYPE;

            job.state = !state;
            job.time = to;

            if (allJobs[scheduleName] != undefined) {
                adapter.log.info("Cancel Job: " + scheduleName);
                allJobs[scheduleName].cancel();
            } else {
                adapter.log.info("Job: " + scheduleName + " did not exist, do nothing");
            }
        }
    }
}

function nextDay(d, dow){
    d.setDate(d.getDate() + (dow+(7-d.getDay())) % 7);
    return d;
}

function parseDecalc(jsonEvent, ID, type, parent, member, name) {
    adapter.log.debug("parseDecalc for " + ID);
    // var name = objects[member].common.name;
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

    // Bugfix: if it's sunday, we must calculate the current week
    if (today.getDay() == 0) {
        new Date(nextDay(today, decalcDay-14)).getDate();
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
        var event = new defaultEvent();
        event.objectID = member;
        event.resourceId = name;

        event.from = new Date(year, month, day, hours, minutes);
        event.to = new Date(year, month, day, hours, minutes+30); // Only for reading
        adapter.log.debug("from:" + event.from + ",to:" + event.to);

        event.subject = "DECALCIFICATION";

        var colorName = adapter.namespace + "." + member + ".color";
        if (colorName != undefined && states[colorName] != undefined) {
            event.background = states[colorName].val;
            event.color = "black";
        } else {
            event.background = colors[colorPicker];
            event.color = "black";
        }
        adapter.log.debug("ID: " + ID + " color: " + event.background);

        event.oldID = event.subject + "_" + ID.replace(parent+".","");

        var rid = event.subject + ID.replace(parent+".","");
        rid = rid.replace(":","");
        event.id = rid;

        event.type = types.decalc;

        // Create recurring Event
        if (wk == 1) {
            dateStart = event.from;
            editable = false;
        } else {
            editable = true;
            event.subject = event.title + " (Repeated Event)";
            event.tooltip = "This is a recurring Event.\n\nThe original Event can be found at\n" + dateStart;
        }

        event.description = "";
        event.res = "Room 5";
        event.location = "";

        allEvents[ID].push(event);
        adapter.log.debug("NEW FROM = " + event.from + " NEW TO = " + event.to);
    }
}

function defaultEvent(event) {
    this.allDay =               event == undefined ? undefined : event.allDay;
    this.background =           event == undefined ? undefined : event.background;
    this.borderColor =          event == undefined ? undefined : event.borderColor;
    this.color =                event == undefined ? undefined : event.color;
    this.description =          event == undefined ? undefined : event.description;
    this.draggable =            event == undefined ? undefined : event.draggable;
    this.from =                 event == undefined ? undefined : event.from;
    this.hidden =               event == undefined ? undefined : event.hidden;
    this.id =                   event == undefined ? undefined : event.id;
    this.location =             event == undefined ? undefined : event.location;
    this.recurrencePattern =    event == undefined ? undefined : event.recurrencePattern;
    this.FREQ =                 event == undefined ? undefined : event.FREQ;
    this.COUNT =                event == undefined ? undefined : event.COUNT;
    this.UNTIL =                event == undefined ? undefined : event.UNTIL;
    this.BYDAY =                event == undefined ? undefined : event.BYDAY;
    this.BYMONTHDAY =           event == undefined ? undefined : event.BYMONTHDAY;
    this.BYMONTH =              event == undefined ? undefined : event.BYMONTH;
    this.INTERVAL =             event == undefined ? undefined : event.INTERVAL;
    this.recurrenceExption =    event == undefined ? undefined : event.recurrenceExption;
    this.resizeable =           event == undefined ? undefined : event.resizeable;
    this.resourceId =           event == undefined ? undefined : event.resourceId;
    this.readOnly =             event == undefined ? undefined : event.readOnly;
    this.subject =              event == undefined ? undefined : event.subject;
    this.style =                event == undefined ? undefined : event.style;
    this.status =               event == undefined ? undefined : event.status;
    this.to =                   event == undefined ? undefined : event.to;
    this.tooltip =              event == undefined ? undefined : event.tooltip;
    this.timeZone =             event == undefined ? undefined : event.timeZone;

    this.type =                 event == undefined ? undefined : event.type;
    this.state =                event == undefined ? undefined : event.state;
    this.objectID =             event == undefined ? undefined : event.objectID;
    this.oldID =                event == undefined ? undefined : event.oldID;
};

function parseEvents(jsonEvent, ID, type, parent, member, name) {
    var event;

    var timeoutName = "";
    var temperatureName = "";

    var thermostat = thermostatArray[type];
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
                // BUGFIX: n is at sunday always -1, so go back 7 days
                if (n === -1) {
                    n = 6;
                }

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
                        event = new defaultEvent();
                        event.type = types.homematic;

                        event.objectID = member;
                        event.resourceId = name;

                        // CHECK if from begins at midnight
                        var temperature;

                        if (parseInt(minutes) + parseInt(hours) > 0 && i == 1) {
                            event.from = new Date(year, month, day - n + parseInt(weekday), 0, 0);
                            event.to = new Date(year, month, day - n + parseInt(weekday), hours, minutes);
                            adapter.log.debug("from:"+event.from+", to:"+event.to);
                            if (event.to == undefined) {
                                adapter.log.error("event.to is undefined");
                            }
                            var x = parseInt(i) - 1;

                            tempn = temperatureName + weekDays[weekday] + "_" + x;
                            temperature = jsonData[tempName];
                            event.subject = tempName;
                            event.description = "";
                            event.res = "Room 5";
                            event.location = "";

                            var colorName = adapter.namespace + "." + member + ".color";
                            if (colorName != undefined && states[colorName] != undefined) {
                                event.background = states[colorName].val;
                                event.color = "black";
                            } else {
                                event.background = colors[colorPicker];
                                event.color = "black";
                            }
                            adapter.log.debug("ID: " + ID + " color: " + event.background);

                            event.oldID = event.subject + "_" + ID;

                            //event.id = (event.oldID).replace("_","").replace(":","").replace(".");
                            var rid = event.subject + ID;
                            rid = rid.replace(":","");
                            event.id = rid;

                            event.state = temperature;

                            // Create recurring Event
                            if (wk == 1) {
                                dateStart = event.from;
                                editable = false;
                            } else {
                                editable = true;
                                event.subject = event.subject + " (Repeated Event)";
                                event.tooltip = "This is a recurring Event.\n\nThe original Event can be found at\n" + dateStart;
                            }

                            // event.readOnly = editable;
                            // Create recurring Event

                            if (allEvents[parent + "." + ID] == undefined) {
                                allEvents[parent + "." + ID] = [];
                            }
                            allEvents[parent + "." + ID].push(event);

                            adapter.log.debug("NEW FROM = " + event.from + " NEW TO = " + event.to);
                        }

                        event = new defaultEvent();
                        event.type = types.homematic;
                        event.from = new Date(year, month, day - n + parseInt(weekday), hours, minutes);
                        event.objectID = member;
                        event.resourceId = name;

                        var x = parseInt(i) + 1;
                        var dummy = timeoutName + weekDays[weekday] + "_" + x;
                        adapter.log.debug(timeName + ":" + jsonData[timeName]);
                        var timeend = jsonData[dummy];

                        hours = Math.floor(timeend / 60);
                        minutes = timeend % 60;

                        event.to = new Date(year, month, day - n + parseInt(weekday), hours, minutes);
                        adapter.log.debug("from:"+event.from+",to:"+event.to);
                        if (event.to == undefined) {
                            adapter.log.error("event.to is undefined");
                        }

                        x = parseInt(i) + 1;
                        if (x == 0)
                            x = 2;
                        tempn = temperatureName + weekDays[weekday] + "_" + x;
                        temperature = jsonData[tempn]
                        event.subject = tempn;
                        event.description = "";
                        event.res = "Room 5";
                        event.location = "";

                        var colorName = adapter.namespace + "." + member + ".color";
                        if (colorName != undefined && states[colorName] != undefined) {
                            event.background = states[colorName].val;
                            event.color = "black";
                        } else {
                            event.background = colors[colorPicker];
                            event.color = "black";
                        }
                        adapter.log.debug("ID: " + ID + " color: " + event.background);

                        event.oldID = event.subject + "_" + ID;

                        // event.id = (event.oldID).replace("_","").replace(":","").replace(".");
                        var rid = event.subject + ID;
                        rid = rid.replace(":","");
                        event.id = rid;

                        event.state = temperature;

                        // Create recurring Event
                        if (wk == 1) {
                            dateStart = event.from;
                            editable = false;
                        } else {
                            editable = true;
                            event.subject = event.title + " (Repeated Event)";
                            event.tooltip = "This is a recurring Event.\n\nThe original Event can be found at\n" + dateStart;
                        }

                        // event.readOnly = editable;
                        // Create recurring Event

                        allEvents[parent + "." + ID].push(event);

                        adapter.log.debug("FROM = " + event.from + " TO = " + event.to);
                    }
                }
                today.setTime(today.getTime() + 7 * (24*60*60*1000));
            }
        }
    }
}