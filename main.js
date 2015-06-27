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
var firstRun = 0;
var allEvents = [];
var colorPicker = 0;

function getData(callback) {
    var statesReady;
    var objectsReady;

    adapter.log.info('requesting all states');
    adapter.getForeignStates('*', function (err, res) {
        states = res;
        statesReady = true;
        adapter.log.info('received all states');
        if (objectsReady && typeof callback === 'function') callback();
    });
    adapter.log.info('requesting all objects');

    adapter.objects.getObjectList({include_docs: true}, function (err, res) {
        res = res.rows;
        objects = {};
        for (var i = 0; i < res.length; i++) {
            objects[res[i].doc._id] = res[i].doc;
            if (res[i].doc.type === 'enum') enums.push(res[i].doc._id);
        }

        objectsReady = true;
        adapter.log.info('received all objects');
        if (statesReady && typeof callback === 'function') callback();
    });
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
    },
    objectChange: function (id, object) {
        adapter.log.debug('objectChange ' + id + ' ' + JSON.stringify(object));

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
        } else {
            var objexts = id.split("###");
            var action = objexts[1];
            var tmp = objexts[0].split('.');

            adapter.log.debug("--------------->"+state);
            adapter.log.debug('rpc -> setValue ' + id + ' ' + tmp[0] + ' ' + tmp[1] + ': ' + tmp[2] + ' ' + state.val);

            var array = state.val;

            var TYPE;
            var IDID;
            var IDPARENT;

            var end;
            var start;
            var ende;
            var begin;
            var objectName;
            var allJobs;
            var job;
            var date;

            var scheduleName;

            if (action == "submit") {
                var paramset;
                // Todo: set Regelmodus to AUTO or MANU or CENT
                // actual AUTO
                paramset = {'MODE_TEMPERATUR_REGULATOR': 1};

                for (var i=0;i<array.length;i++) {
                    IDID = array[i]['IDID'];
                    IDPARENT = array[i]['IDPARENT']; // hm-rpc.0
                    TYPE = array[i]['IDTYPE']; // HM-TT-TC

                    if (TYPE == 'HM-CC-TC' || TYPE == "HM-CC-RT-DN" || TYPE == "BC-RT-TRX-CyG-3") {
                        var temperature = array[i]['temperature']; // 17

                        var title = array[i]['title'].split(" "); // TEMPERATUR_MONDAY_0 - JEQ0550466:2
                        var temperatureText = title[0];

                        var number = temperatureText.split("_")[2];
                        number = number - 1;
                        if (number == 0) {
                            // Todo: it's the last entry from day before
                            // TEMPERATUR_MONDAY_0 = TEMPERATUR_SUNDAY_???
                        }

                        start = array[i]['start'];
                        end = array[i]['end'];
                        var x = new Date(end);
                        var hours = x.getHours();
                        var min = x.getMinutes();

                        var timeout = (hours * 60) + min;
                        if (timeout == 0) {
                            // Last Entry
                            timeout = 1440;
                        }

                        var timeoutText = "";
                        if (TYPE == "HM-CC-TC") {
                            timeoutText = temperatureText.replace("TEMPERATUR", "TIMEOUT");
                        } else if (TYPE == "HM-CC-RT-DN" || TYPE == "BC-RT-TRX-CyG-3") {
                            timeoutText = temperatureText.replace("TEMPERATURE", "TIMEOUT");
                        }

                        // Bugfix, Set Decalc
                        if (temperatureText == "DECALCIFICATION") {
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
                                decalcDay+=1;
                            }


                            if (TYPE == "HM-CC-TC") {
                                paramset["DECALCIFICATION_DAY"] = decalcDay;
                                paramset["DECALCIFICATION_MINUTE"] = new Date(start).getMinutes();
                                paramset["DECALCIFICATION_HOUR"] = new Date(start).getHours();

                            } else if (TYPE == "HM-CC-RT-DN" || TYPE == "BC-RT-TRX-CyG-3") {
                                paramset["DECALCIFICATION_WEEKDAY"] = decalcDay; //  0 => Saturday, ..., 6 => Friday
                                paramset["DECALCIFICATION_TIME"] = (new Date(start).getHours() * 60) + new Date(start).getMinutes();
                            }
                        } else {
                            paramset[timeoutText] = timeout;
                            paramset[temperatureText] = {explicitDouble: temperature};
                        }
                    }
                }
                adapter.log.debug(JSON.stringify(paramset));
                putParamsets(IDPARENT+"."+IDID, paramset);
            } else if (action == "save") {
                TYPE = array['IDTYPE'];
                IDPARENT = array['IDPARENT'];
                IDID = array['IDID'];
                if (TYPE == "HM-LC-Sw1-FM" || TYPE == 'HM-LC-Sw2-FM' || TYPE == "HM-LC-Sw4-DR") {
                    start = array['start'];
                    ende = array['end'];
                    begin = new Date(start);
                    end = new Date(ende);
                    objectName = IDID;
                    state = array['switcher'];

                    scheduleName = objectName+"###"+begin.getTime()+"###"+state;

                    job = new Object();
                    job.objectName = objectName;
                    job.scheduleName = scheduleName;
                    job.TYPE = TYPE;

                    job.state = state;
                    job.time = begin;
                    createScheduledJob(job);

                    // Create job for true and false
                    scheduleName = objectName+"###"+end.getTime()+"###"+!state;

                    job = new Object();
                    job.objectName = objectName;
                    job.scheduleName = scheduleName;

                    job.TYPE = TYPE;
                    job.state = !state;
                    job.time = end;
                    createScheduledJob(job);
                } else if (TYPE == 'VARDP') {
                    start = array['start'];
                    ende = array['end'];
                    begin = new Date(start);
                    end = new Date(ende);
                    objectName = IDID;
                    var address;

                    state = array['state'];
                    // So go on and find the correct Object
                    if (IDPARENT == "google") {
                        objectName = array['section'];
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
                }
            } else if (action == "delete") {
                TYPE = array['IDTYPE']; // HM-TT-TC
                IDPARENT = array['IDPARENT'];
                IDID = array['IDID'];
                if (TYPE == 'HM-LC-Sw1-FM' || TYPE == 'HM-LC-Sw2-FM' || TYPE == "HM-LC-Sw4-DR") {

                    IDID = IDID.replace(".", ":");
                    objectName = IDPARENT + "." + IDID;

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
            }
        }
    },

    unload: function (callback) {
        try {
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

            var a = schedule.scheduleJob(job.scheduleName, job.time, function(){
                adapter.log.info("start changeState for TYPE " + job.TYPE + " address " + job.objectName);
                if (job.TYPE == 'HM-LC-Sw1-FM' || job.TYPE == "HM-LC-Sw2-FM" || job.TYPE == "HM-LC-Sw4-DR") {
                    // Bugfix, let Homematic Switches set their State by ioBroker
                    // change_hmrpc_State(job.objectName, job.state);
                    if (job.objectName.search("STATE" == 0)) {
                        job.objectName = job.objectName + ".STATE";
                    }
                    changeState(job.objectName, job.state);
                } else {
                    changeState(job.objectName, job.state);
                }
                a.cancel();
            });
        } else {
            adapter.log.debug("Old Job " + job.objectName + " (" + job.TYPE + ") at " + job.time.toLocaleDateString() + " " + job.time.toLocaleTimeString() + ", state = " + job.state + "(" + now.toLocaleTimeString() + ") do nothing");
        }
    } else {
        adapter.log.info("Job: " + job.scheduleName + " already exists at " + job.time.toLocaleDateString() + " " + job.time.toLocaleTimeString());
    }
}

function loadData() {
    var e = "enum.occ.";
    for (var i=0; i<enums.length; i++) {
        var enu = enums[i];
        if (enu.search(e) == 0) {
            var res = objects[enu];

            adapter.log.debug("Adapter getEnum: "+JSON.stringify(res));
            adapter.log.debug("Adapter getEnum Result: "+res);

            adapter.log.debug("EnumGroup: "+res['common'].name);
            var len = res['common'].members.length;
            for (var l = 0; l < len; l++) {
                var member = res['common'].members[l];

                var localObject = objects[member];
                adapter.log.debug(JSON.stringify(localObject));

                adapter.log.debug("Member: " + member);
                if (states[member] == undefined) {
                    getParamsets(member, 'MASTER');
                }
            }
        }
    }

    writeEventsToFile("#Object", "");
}

function addiCalObjects() {
    // Todo: Allow more then one Instance
    var id = "ical.0.data.table"/*JS iCal table*/;

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
            var IDPARENT = ev._calName;
            var IDTYPE = ev._class;

            event.start = new Date(ev._date);
            event.end = new Date(ev._end);

            event.title = ev.event;

            event.IDTYPE = IDTYPE;
            event.IDPARENT = IDPARENT;
            event.IDID = IDID;

            event.color = colors[colorPicker];
            adapter.log.debug("ID: " + ID + " color: " + event.color);
            event.allDay = ev._allDay;
            event.id = event.title + "_" + ID;

            // Split ev.section (occ;LEQ0885447:1;true)
            var state;
            var elems = ev._section.split("#");
            if (elems.length == 3 && elems[0] == "occ") {
                event.section = elems[1];
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

                var address;

                var objectID = event.section.replace(":",".");
                var obj;

                if (states[objectID] != undefined) {
                    obj = objects[objectID];
                    adapter.log.info("Object found >>>>>> " + JSON.stringify(obj));
                    adapter.log.info(objectID + " is a real address, State found");

                    address = objectID;
                } else {
                    // If we only knew the Name, we must check the Object Address
                    var objectName = event.section.replace(":", ".");

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
                        event.IDTYPE = obj.native["TypeName"]; // VARDP
                    } else if (obj.native["CONTROL"] != undefined) {
                        event.IDTYPE = obj.native["CONTROL"]; // SWITCH.STATE
                    } else {
                        event.IDTYPE = obj.native["PARENT_TYPE"]; // HM-LC-Sw2-FM
                    }
                } else {
                    event.IDTYPE = "VARDP";
                }

                if (event.IDTYPE == "HM-LC-Sw1-FM" || event.IDTYPE == "HM-LC-Sw2-FM" || event.IDTYPE == "HM-LC-Sw4-DR" || event.IDTYPE == "SWITCH.STATE") {
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
                } else if (event.IDTYPE == "VARDP") {
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
                job.TYPE = event.IDTYPE;

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
                    job.TYPE = event.IDTYPE;

                    // Create job for true and false
                    job.state = !state;
                    job.time = event.end;
                    createScheduledJob(job);
                } // else TEMPERATURE

                events.push(event);
                adapter.log.debug("NEW START = " + event.start + " NEW END = " + event.end);
                writeEventsToFile("#iCal", JSON.stringify(events));
            } else {
                adapter.log.error("No valid iCal Objects found, Description Text must be occ#OBJECT_ADDRESS#OBJECT_VALUE")
            }
        }
        writeEventsToFile("#iCal", JSON.stringify(events));
    }
}

var methods = {
    event: function (err, params) {
        adapter.config.type = "xml";
        adapter.log.debug(adapter.config.type + 'rpc <- event ' + JSON.stringify(params));
        //adapter.log.debug("PARAM 2 = " + params[2]);
        if (params[2] == "CONFIG_PENDING") {
            adapter.log.debug("----------> PARAM 3 " + params[3]);
            if (params[3].toString() == "true") {
                adapter.log.info("CONFIG PENDING ACTIVE FOR " + params[1]);
            } else {
                adapter.log.info("CONFIG PENDING DONE FOR " + params[1]);
                adapter.log.info("Reload Objects");
                var objectID = params[0] +"." + params[1].replace(':0', '.2');
                getParamsets(objectID, 'MASTER');
            }
        }
    }
};

function getParamsets(objectID, paramType) {
    adapter.log.debug(adapter.namespace);
    adapter.log.debug(objectID);
    var objectsID = objectID.split(".");
    adapter.log.info("try to getParamset: "+objectID );

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
            var type;
            if (res && res.native) {
                type = res.native["TYPE"];
            }
            var myID;

            if (type == "HM-CC-TC" || type == "HM-CC-RT-DN") {
                parseEvents(data, ID, type, parent);
                parseDecalc(data, ID, type, parent);
                colorPicker = colorPicker + 1;
                adapter.log.debug("COLORPICKER" + colorPicker);
                myID = parent+"."+ID;
                adapter.log.debug("----------> " + myID + "(" + type + ")");
                writeEventsToFile(myID, JSON.stringify(allEvents));
                allEvents = [];
            } else if (type == "BC-RT-TRX-CyG-3") {
                var channel = ID.split(":");
                if (channel[1] == 0) {
                    parseEvents(data, ID, type, parent);
                    var dID = parent + "." + ID.replace(":0", ".1");
                    getParamsets(dID, 'VALUES');
                } else {
                    // parseDecalc is not working for MAX! cause DECALC Objects are within Channel 1
                    parseDecalc(data, ID, type, parent);
                }

                if (channel[1] == 0) {
                    colorPicker = colorPicker + 1;
                    adapter.log.debug("COLORPICKER" + colorPicker);
                    myID = parent+"."+ID;
                    adapter.log.debug("----------> " + myID + "(" + type + ")");
                    writeEventsToFile(myID, JSON.stringify(allEvents));
                    allEvents = [];
                }
            } else if (type == "HM-LC-Sw1-FM" || type == "HM-LC-Sw2-FM" || type == "HM-LC-Sw4-DR") {
                parseScheduler(parent, ID);
            }
        } else {
            adapter.log.error("getParamset Error: "+err);
        }
    });
}

function readEventsFromFile(ID, callback) {
    ID = ID.replace(":",".");
    adapter.log.debug("read in occ-events_" + ID + ".json");
    adapter.readFile(adapter.name+'.0', 'occ-events_'+ID+'.json', function (err, data) {
        if (err || !data) {
            adapter.log.debug("Could not read occ-events_"+ID+".json");
        } else {
            callback(data);
        }
    });
}
function writeEventsToFile(ID, event) {
    var allEvs = event;

    ID = ID.replace(":",".");
    if (firstRun == 1) {
        adapter.readFile(adapter.name+'.0', 'occ-events_'+ID+'.json', function (err, data) {
            if (err || !data) {
                adapter.log.debug("Could not read occ-events_"+ID+".json : " + err);
            } else {
                allEvs += data;
            }
        });
    } else {
        firstRun = 1;
    }
    adapter.writeFile(adapter.name + ".0", 'occ-events_'+ID+'.json', allEvs);
}

function putParamsets(address, params) {
    if (!adapter.config.demo) {
        var objectsID = address.split(".");
        var ID = objectsID[objectsID.length - 1];
        var paramType = "MASTER";
        var instance = objectsID[0] + "." + objectsID[1];

        adapter.sendTo(instance, "putParamset", {ID: ID, paramType: paramType, params: params}, function (doc) {
            var err = doc.error;
            var data = doc.result;
            adapter.log.debug("data = " + JSON.stringify(data));
            adapter.log.debug("err  = " + JSON.stringify(err));

            if (!err) {
                adapter.log.info("putParamset was successfull for " + ID);
            } else {
                adapter.log.error("putParamset Error: " + err);
            }
        });
    }
}

function changeState(address, params) {
    if (!adapter.config.demo) {
        adapter.log.info("setForeignState for " + address + " params " + params);
        adapter.setForeignState(address, params);
    }
}

function change_hmrpc_State(address, params) {
    if (!adapter.config.demo) {
        var objectsID = address.split(".");
        // Bug: if objects has : then to nothing
        var ID;
        if (objectsID[2].search(":") < 0) {
            ID = objectsID[2] + ":" + objectsID[3];
        } else {
            ID = objectsID[2];
        }
        adapter.log.info("change_hmrpc_State for " + ID + " params " + params);

        var paramType = "STATE";
        var instance = objectsID[0] + "." + objectsID[1];

        adapter.sendTo(instance, "setValue", {ID: ID, paramType: paramType, params: params}, function (doc) {
            var err = doc.error;
            var data = doc.result;
            adapter.log.debug("data = " + JSON.stringify(data));
            adapter.log.debug("err  = " + JSON.stringify(err));

            if (!err) {
                adapter.log.info("change_hmrpc_State was successfull for " + ID);
            } else {
                adapter.log.error("change_hmrpc_State Error: " + err);
            }
        });
    }
}

function parseScheduler(parent, ID) {
    readEventsFromFile(parent+"."+ID, function (data) {
        if (data != undefined && data != "[null]" && data.length > 2) {
            var jsonData = JSON.parse(data);
            for (var i = 0; i < jsonData.length; i++) {
                var event = jsonData[i];

                var dt = new Date(event.start);

                dt.setHours = dt.getHours + 2;
                event.start = dt;

                dt = new Date(event.end);

                dt.setHours = dt.getHours + 2;
                event.end = dt;

                var IDID = event.IDID;
                var TYPE = event.IDTYPE;

                var state = event.switcher;

                // Todo: create recurring Events
                var objectName = IDID;

                var scheduleName = objectName+"###"+event.start.getTime()+"###"+state;

                var job = new Object();
                job.objectName = objectName;
                job.scheduleName = scheduleName;
                job.TYPE = TYPE;

                // Create job for true and false
                job.state = state;
                job.time = event.start;
                createScheduledJob(job);

                scheduleName = objectName+"###"+event.end.getTime()+"###"+!state;
                job.scheduleName = scheduleName;
                job.state = !state;
                job.time = event.end;
                createScheduledJob(job);
            }
            writeEventsToFile(parent+"."+ID, data);
        }
    });
}

function nextDay(d, dow){
    d.setDate(d.getDate() + (dow+(7-d.getDay())) % 7);
    return d;
}

function parseDecalc(jsonEvent, ID, type, parent) {
    var decalcDay = "";
    var decalcTime = "";
    if (type == "HM-CC-TC") {
        decalcDay = jsonEvent["DECALCIFICATION_DAY"]; //  0 => Saturday, ..., 6 => Friday
        var min = jsonEvent["DECALCIFICATION_MINUTE"];
        var hour = jsonEvent["DECALCIFICATION_HOUR"];
        decalcTime = (hour*60)+min;
    } else if (type == "HM-CC-RT-DN" || type == "BC-RT-TRX-CyG-3") {
        decalcDay = jsonEvent["DECALCIFICATION_WEEKDAY"]; //  0 => Saturday, ..., 6 => Friday
        decalcTime = jsonEvent["DECALCIFICATION_TIME"];
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

        event.IDTYPE = type;
        event.IDPARENT = parent;
        event.IDID = ID;

        event.start = new Date(year, month, day, hours, minutes);
        event.end = new Date(year, month, day, hours, minutes+30); // Only for reading
        adapter.log.debug("start:" + event.start + ",end:" + event.end);

        event.title = "DECALCIFICATION";

        event.section = parent + "." + ID;
        event.color = colors[colorPicker];
        adapter.log.debug("ID: " + ID + " color: " + event.color);

        event.allDay = false;
        event.id = event.title + "_" + ID;
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

        allEvents.push(event);
        adapter.log.debug("NEW START = " + event.start + " NEW END = " + event.end);
    }
}

function parseEvents(jsonEvent, ID, type, parent) {
    var event;

    var timeoutName = "";
    var temperatureName = "";
    if (type == "HM-CC-TC") {
        timeoutName = "TIMEOUT_";
        temperatureName = "TEMPERATUR_";
    } else if (type == "HM-CC-RT-DN" || type == "BC-RT-TRX-CyG-3") {
        timeoutName = "ENDTIME_";
        temperatureName = "TEMPERATURE_";
    }

    var jsonData = jsonEvent;
    var weekDays = ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY', 'SUNDAY'];
    var firstMidnight = 0;
    var editable;
    var dateStart;

    for (var weekday in weekDays) {
        for (var i = 1; i < 25; i++) {
            var tempName = temperatureName + weekDays[weekday] + "_" + i;
            adapter.log.debug("ID: " + ID + ", " + tempName + ":" + jsonData[tempName]);
            var timeName = timeoutName + weekDays[weekday] + "_" + i;
            adapter.log.debug("ID: " + ID + ", " + timeName + ":" + jsonData[timeName]);
            var timeout = jsonData[timeName];
            adapter.log.debug("############## ID: " + ID + ", " + timeout);

            // Todo: Write Events for full month
            // Beginning on monday of actual week
            // we do not need elements from past
            // but we create elements for a year (52 weeks)
            /* ***************************************** */
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
                    firstMidnight = 1;
                } else {
                    if (timeout / 60 == 24 || timeout == 0) {
                        firstMidnight = 1;
                    }
                    hours = Math.floor(timeout / 60);
                    minutes = timeout % 60;

                    // New Event
                    event = new Object();

                    event.IDTYPE = type;
                    event.IDPARENT = parent;
                    event.IDID = ID;

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
                        // event.title = tempn + " - " + ID;
                        // event.title = tempName + " - " + ID;
                        event.title = tempName;

                        event.section = parent + "." + ID;
                        event.color = colors[colorPicker];
                        adapter.log.debug("ID: " + ID + " color: " + event.color);

                        event.allDay = false;
                        event.id = event.title + "_" + ID;
                        //event.notes = temperature;
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

                        allEvents.push(event);

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

                    event.section = parent + "." + ID;
                    event.color = colors[colorPicker];
                    adapter.log.debug("ID: " + ID + " color: " + event.color);

                    event.allDay = false;
                    event.id = event.title + "_" + ID;
                    event.temperature = temperature;
                    event.repeater = "true";

                    event.IDTYPE = type;
                    event.IDPARENT = parent;
                    event.IDID = ID;

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

                    allEvents.push(event);

                    adapter.log.debug("START = " + event.start + " END = " + event.end);
                }
                today.setTime(today.getTime() + 7 * (24*60*60*1000));
            }
        }
    }
}
