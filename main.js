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

var adapter = utils.adapter({
    name: 'occ',

    ready: function () {
        adapter.subscribeStates('*');
        main();
    },
    stateChange: function (id, state) {
        if (state.ack != true) {
            adapter.log.debug('This stateChange is not acknowledged');
        } else {
            var objects = id.split("###");
            var action = objects[1];
            var tmp = objects[0].split('.');

            var val = state.val;
            adapter.log.debug("--------------->"+state);
            adapter.log.debug('rpc -> setValue ' + id + ' ' + tmp[0] + ' ' + tmp[1] + ': ' + tmp[2] + ' ' + state.val);

            // var array = JSON.parse(state.val);
            var array = state.val;

            if (action == "submit") {
                var paramset;
                // set Regelmodus to AUTO
                paramset = {'MODE_TEMPERATUR_REGULATOR': 1};

                // Todo: all events are within array
                for (var i=0;i<array.length;i++) {
                    var TYPE = array[i]['IDTYPE'];
                    var ID = array[i]['IDID'];
                    var PARENT = array[i]['IDPARENT']; // hm-rpc.0
                    var TYPE = array[i]['IDTYPE']; // HM-TT-TC

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

                        var end = array[i]['end'];
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
                        paramset[timeoutText] = timeout;
                        paramset[temperatureText] = {explicitDouble: temperature};
                    }
                }
                adapter.log.debug(JSON.stringify(paramset));
                putParamsets(PARENT+"."+ID, paramset);
            } else if (action == "save") {
                var TYPE = array['IDTYPE']; // HM-TT-TC
                var IDPARENT = array['IDPARENT'];
                var IDID = array['IDID'];
                if (TYPE == 'HM-LC-Sw2-FM' || TYPE == "HM-LC-Sw4-DR") {

                    var now = new Date();
                    //changeState("hm-rpc.0.LEQ0885447:2", true);
                    var start = array['start'];
                    var ende = array['end'];

                    var begin = new Date(start);
                    var end = new Date(ende);

                    //var objectName = tmp[0]+"."+tmp[1]+"."+tmp[2]+":"+tmp[3];
                    var objectName = IDPARENT+"."+tmp[2]+":"+tmp[3];

                    var state = array['switcher'];

                    // Todo: Check if this Job already exists
                    var allJobs = schedule['scheduledJobs'];

                    var scheduleName = objectName+"###"+begin.getTime()+"###"+state;

                    if (allJobs[scheduleName] == undefined) {
                        if (begin > now) {
                            adapter.log.debug("Create scheduled Object for " + objectName + " (" + TYPE + ") at " + begin.toLocaleDateString() + " " + begin.toLocaleTimeString() + ", state = " + state);

                            var a = schedule.scheduleJob(scheduleName, begin, function(){
                                adapter.log.info("start changeState");
                                changeState(objectName, state);
                                //adapter.states.setState(IDPARENT+"."+IDID, {val: true, ack: true});
                                a.cancel();
                            });
                        }
                    } else {
                        adapter.log.debug("Job: " + scheduleName + " already exists");
                    }

                    var scheduleName = objectName+"###"+end.getTime()+"###"+state;
                    if (allJobs[scheduleName] == undefined) {
                        if (end > now) {
                            adapter.log.debug("Create scheduled Object for " + objectName + " (" + TYPE + ") at " + end.toLocaleDateString() + " " + end.toLocaleTimeString() + ", state = " + !state);

                            var b = schedule.scheduleJob(scheduleName, end, function () {
                                adapter.log.info("start changeState");
                                changeState(objectName, !state);
                                //adapter.states.setState(IDPARENT+"."+IDID, {val: true, ack: true});
                                b.cancel();
                            });
                        }
                    } else {
                        adapter.log.debug("Job: " + scheduleName + " already exists");
                    }
                }
            } else if (action == "delete") {
                // Todo: Delete Job from scheduler
                var TYPE = array['IDTYPE']; // HM-TT-TC
                var IDPARENT = array['IDPARENT'];
                var IDID = array['IDID'];
                if (TYPE == 'HM-LC-Sw2-FM' || TYPE == "HM-LC-Sw4-DR") {

                    IDID = IDID.replace(".", ":");
                    var objectName = IDPARENT + "." + IDID;

                    var state = array['switcher'];

                    // Todo: Check if this Job already exists
                    var allJobs = schedule['scheduledJobs'];

                    var date = new Date(array['start']);
                    var scheduleName = objectName + "###" + date.getTime() + "###" + state;

                    if (allJobs[scheduleName] != undefined) {
                        adapter.log.debug("Cancel Job: " + scheduleName);
                        allJobs[scheduleName].cancel();
                    } else {
                        adapter.log.debug("Job: " + scheduleName + " does not exists, do nothing");
                    }

                    var date = new Date(array['end']);
                    var scheduleName = objectName + "###" + date.getTime() + "###" + state;

                    if (allJobs[scheduleName] != undefined) {
                        adapter.log.debug("Cancel Job: " + scheduleName);
                        allJobs[scheduleName].cancel();
                    } else {
                        adapter.log.debug("Job: " + scheduleName + " does not exists, do nothing");
                    }
                }
            } else {
                var ID = array['IDID'];
                var PARENT = array['IDPARENT']; // hm-rpc.0
                var TYPE = array['IDTYPE']; // HM-TT-TC
                var flag = array['flag'];

                adapter.log.error("NOT DEFINED: ID = "+ID+" PARENT = "+PARENT+" TYPE = "+TYPE+" flag = "+flag);
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

        try {
            if (eventInterval) {
                clearInterval(eventInterval);
                eventInterval = null;
            }

            var protocol;
            protocol = 'http://';

//            rpcClient.methodCall('init', [protocol + '192.168.1.8:2001', ''], function (err, data) {
//                hmadapter.states.setState('system.adapter.' + adapter.namespace + '.connected', {val: false});
//                callback();
//            });
        } catch (e) {
            if (adapter && adapter.log) {
                adapter.log.error("Error while unload of main.js: "+e);
            } else {
                console.log("Error while unload of main.js: "+e);
            }
            callback();
        }
    }
});

var rpc = require('homematic-xmlrpc');
//var rpcClient;
var rpcServer;
//var rpcServerStarted;
var eventInterval;
var rpcInitString = null;
var homematicArray = [];

function getAdapterInstances(_adapter, callback) {
    if (typeof _adapter == 'function') {
        callback = _adapter;
        _adapter = null;
    }

    adapter.objects.getObjectView('system', 'instance', {startkey: 'system.adapter.' + (_adapter || adapter), endkey: 'system.adapter.' + (_adapter || adapter) + '.\u9999'}, function (err, doc) {
        if (err) {
            if (callback) callback ([]);
        } else {
            if (doc.rows.length === 0) {
                if (callback) callback ([]);
            } else {
                var res = [];
                for (var i = 0; i < doc.rows.length; i++) {
                    res.push(doc.rows[i].value);
                }
                if (callback) callback (res);
            }
        }

    });
}

function main() {
    var host = adapter.config.rpcListenIp;
    var port = adapter.config.rpcListenPort;

    var device = {};
    var instances = {};
    getAdapterInstances('hm-rpc', function (arr) {
        instances = arr;
        for (var i = 0; i < arr.length; i++) {
            var native = arr[i].native;
            var ccu = native.daemon;
            var type = "BidCos-RF";
            if (ccu == "Homegear") {
                ccu = "true";
            } else {
                ccu = "false";
                type = "";
            }

            var name = arr[i]._id;
            if (name.indexOf("system.adapter.") == 0) {
                name = name.substring(15, name.length);
            }
            adapter.log.debug("name:"+name+", ip:"+native.homematicAddress+", type:"+type+", port:"+native.homematicPort+", isCcu:"+ccu);

            // For each adress we have to start a rpc Connection
            // name:hm-rpc.0, ip:192.168.1.8, type:BidCos-RF, port:2001, isCcu:true
            var rpcClient;
            rpcClient = rpc.createClient({
                host: native.homematicAddress,
                port: native.homematicPort,
                path: '/',
                clientPort: port,
            });

            // On First Startup, rpcServerStarted is always false
            // if (!rpcServerStarted) initRpcServer(rpcClient);
            initRpcServer(rpcClient);

            device = {name:name,ip:native.homematicAddress,type:type,port:native.homematicPort,isCcu:ccu,rpcClient:rpcClient,rpcServerStarted:true};
            homematicArray.push(device);

            port++;

            rpcClient.methodCall('init', ['http://'+native.homematicAddress+':'+native.homematicPort, adapter.namespace], function (err, data) {
                adapter.states.setState('system.adapter.' + adapter.namespace + '.connected', {val: false});
                adapter.log.debug("ERR: " + err);
                adapter.log.debug("DATA: " + JSON.stringify(data));
                // TODO: callback();

                if (adapter.config.force) {
                    adapter.getEnum("occ", function(res) {
                        var val = JSON.stringify(res);
                        adapter.log.debug("Adapter getEnum: "+JSON.stringify(res));
                        adapter.log.debug("Adapter getEnum Result: "+res);

                        var arr = [];
                        for (var x in res){
                            arr.push(res[x]);
                        }

                        for (var t = 0; t < arr.length; t++) {
                            adapter.log.debug("EnumGroup: "+arr[t]._id);
                            var len = arr[t].common.members.length;
                            for (var l = 0; l < arr[t].common.members.length; l++) {
                                var member = arr[t].common.members[l];
                                adapter.log.debug("Member: " + member);
                                getParamsets(member);
                            }
                        }
                    });

                    writeEventsToFile("Object", "");
                }
            });
        }
    });
}

function getIPs(host, callback) {
    if (typeof host == 'function') {
        callback = host;
        host = null;
    }

    socket.emit('getHostByIp', host || common.host, function (ip, _host) {
        if (_host) {
            host = _host;
            var IPs4 = [{name: '[IPv4] 0.0.0.0', address: '0.0.0.0', family: 'ipv4'}];
            var IPs6 = [{name: '[IPv6] ::',      address: '::',      family: 'ipv6'}];
            if (host.native.hardware && host.native.hardware.networkInterfaces) {
                for (var eth in host.native.hardware.networkInterfaces) {
                    for (var num = 0; num < host.native.hardware.networkInterfaces[eth].length; num++) {
                        if (host.native.hardware.networkInterfaces[eth][num].family != "IPv6") {
                            IPs4.push({name: '[' + host.native.hardware.networkInterfaces[eth][num].family + '] ' + host.native.hardware.networkInterfaces[eth][num].address + ' - ' + eth, address: host.native.hardware.networkInterfaces[eth][num].address, family: 'ipv4'});
                        } else {
                            IPs6.push({name: '[' + host.native.hardware.networkInterfaces[eth][num].family + '] ' + host.native.hardware.networkInterfaces[eth][num].address + ' - ' + eth, address: host.native.hardware.networkInterfaces[eth][num].address, family: 'ipv6'});
                        }
                    }
                }
            }
            for (var i = 0; i < IPs6.length; i++) {
                IPs4.push(IPs6[i]);
            }
            callback(IPs4);
        }
    });
}

function sendInit(initAddress, rpcClient) {
    if (initAddress) rpcInitString = initAddress;

    rpcClient.methodCall('init', [rpcInitString, adapter.namespace], function (err, data) {
        if (!err) {
            connection(rpcClient);
        } else {
            adapter.log.error("sendInit Error: "+err);
        }
    });
}

function initRpcServer(rpcClient) {
    //rpcServerStarted = true;
    var protocol = 'http://';
    // Todo: get Dynamically host and port;
    var clientPort = rpcClient['options']['clientPort'];

    // Todo: function getIPs(host, callback) ...
    rpcServer = rpc.createServer({host: adapter.config.rpcListenIp, port: clientPort});
    sendInit(protocol + adapter.config.rpcListenIp+":"+clientPort, rpcClient);

    rpcServer.on('event', function (err, params, callback) {
        adapter.log.debug("rpcServer event: "+params);
        connection(rpcClient);
        callback(null, methods.event(err, params));
    });

    rpcServer.on('system.multicall', function (method, params, callback) {
        adapter.log.debug("rpcServer system.multicall: "+JSON.stringify(params));
        connection(rpcClient);
        var response = [];
        for (var i = 0; i < params[0].length; i++) {
            if (methods[params[0][i].methodName]) {
                response.push(methods[params[0][i].methodName](null, params[0][i].params));
            } else {
                response.push('');
            }
        }
        callback(null, response);
    });
}

var methods = {

    event: function (err, params) {
        // Todo: Write Objects in Queue
        adapter.config.type = "xml";
        adapter.log.info(adapter.config.type + 'rpc <- event ' + JSON.stringify(params));
        //adapter.log.debug("PARAM 2 = " + params[2]);
        if (params[2] == "CONFIG_PENDING") {
            adapter.log.debug("----------> PARAM 3 " + params[3]);
            if (params[3].toString() == "true") {
                adapter.log.info("CONFIG PENDING ACTIVE FOR " + params[1]);
            } else {
                adapter.log.info("CONFIG PENDING DONE FOR " + params[1]);
                adapter.log.info("Reload Objects");
                // Todo: Reload Objects from params[1];
                var objectID = params[0] +"." + params[1].replace(':0', '.2');
                // params0 = occ.0
                // params1 = JEQ0550466:0
                // params2 = CONFIG_PENDING
                // params3 = false
                getParamsets(objectID);
            }
        }
    }
};

function connection(rpcClient) {
    var now = (new Date()).getTime();
    // do not send ofter than 5 seconds
    if (!lastEvent || now - lastEvent > 5000) {
        adapter.states.setState('system.adapter.' + adapter.namespace + '.connected', {val: true, expire: 300});
    }

    lastEvent = (new Date()).getTime();

    if (!eventInterval) {
        eventInterval = setInterval(function () {
            var _now = (new Date()).getTime();
            // Check last event time
            if (lastEvent && _now - lastEvent > checkInitInterval * 1000) {
                // Reinit !!!
                sendInit(null, rpcClient);
            }
        }, checkInitInterval * 1000);
    }
}
var lastEvent =     0;
var checkInitInterval = 60;

function getParamsets(objectID) {
    adapter.log.debug(rpcInitString);
    adapter.log.debug(adapter.namespace);
    adapter.log.debug(objectID);
    adapter.log.debug(objectID);
    // TODO: split objectID into <adaptername>.<instance>.<ID>.<CHANNEL>
    var objects = objectID.split(".");
    adapter.log.info("getParamsets: "+objectID);

    var rpcClient;
    for (var i=0;i<homematicArray.length;i++) {
        rpcClient = homematicArray[i].rpcClient;
        var hmrpc = objects[0]+'.'+objects[1];
        if (homematicArray[i].name == hmrpc) {
            var ID = objects[objects.length-2] + ":" + objects[objects.length-1];
            rpcClient.methodCall('getParamset', [ID, 'MASTER'], function (err, data) {
                if (!err) {
                    // TODO: get Type of Object (hm-cc-tc, hm-cc-rt-dn, ...)
                    var parent = objects[0]+"."+objects[1];
                    var objID = parent+"."+objects[objects.length-2];
                    adapter.log.debug("############### " + objID);
                    adapter.objects.getObject(objID, function (err, res) {
                        var type;
                        if (res && res.native) {
                            type = res.native["TYPE"];
                        }

                        if (type == "HM-CC-TC" || type == "HM-CC-RT-DN" || type == "BC-RT-TRX-CyG-3") {
                            parseEvents(data, false, ID, type, parent);
                            writeEventsToFile(ID, JSON.stringify(allEvents));
                        } else if (type == "HM-LC-Sw2-FM" || type == "HM-LC-Sw4-DR") {
                            parseScheduler(ID);
                        }
                        allEvents = [];
                    });
                } else {
                    adapter.log.error("getParamset Error: "+err);
                }
            });
        }
    }
}

var firstRun = 0;

function readEventsFromFile(ID, callback) {
    ID = ID.replace(":",".");
    adapter.log.debug("read in occ-events_" + ID + ".json");
    adapter.readFile(adapter.name+'.0', 'occ-events_'+ID+'.json', function (err, data) {
        if (err || !data) {
            adapter.log.error("Could not read occ-events_"+ID+".json");
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
                adapter.log.error("Could not read occ-events_"+ID+".json");
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
        var objects = address.split(".");
        var ID = objects[objects.length-1];

        var rpcClient;
        for (var i=0;i<homematicArray.length;i++) {
            rpcClient = homematicArray[i].rpcClient;
            var hmrpc = objects[0] + '.' + objects[1];
            if (homematicArray[i].name == hmrpc) {
                adapter.log.debug("putParamset params: "+params);

                rpcClient.methodCall('putParamset', [ID, 'MASTER', params], function (err, data) {
                    if (!err) {
                        adapter.log.info("putParamset was successfull for "+ID);
                    } else {
                        adapter.log.error("putParamset Error: " + err);
                    }
                });

            }
        }
    }
}

function changeState(address, params) {
    if (!adapter.config.demo) {
        var objects = address.split(".");
        var ID = objects[objects.length-1];

        var rpcClient;
        for (var i=0;i<homematicArray.length;i++) {
            rpcClient = homematicArray[i].rpcClient;
            var hmrpc = objects[0] + '.' + objects[1];
            if (homematicArray[i].name == hmrpc) {
                rpcClient.methodCall('setValue', [ID, 'STATE', params], function (err, data) {
                    if (!err) {
                        adapter.log.info("changeState was successfull for "+ID);
                        adapter.log.debug(JSON.stringify(data));
                    } else {
                        adapter.log.error("setValue Error: " + err);
                    }
                });
            }
        }
    }
}

var localEvent;
var allEvents = [];
var allEvents2Write = [];
var colorPicker = 0;

function parseScheduler(ID) {
    readEventsFromFile(ID, function (data, err) {
        if (data != undefined && data != "[null]" && data.length > 2) {
            var jsonData = JSON.parse(data);
            for (var i = 0; i < jsonData.length; i++) {
                var event = jsonData[i];

                var now = new Date();

                var dt = new Date(event.start);

                dt.setHours = dt.getHours + 2;
                event.start = dt;

                //m = $.fullCalendar.moment(event.end);
                //dt = new Date(m.format());
                dt = new Date(event.end);

                dt.setHours = dt.getHours + 2;
                event.end = dt;

                var IDID = event.IDID;
                var IDPARENT = event.IDPARENT;
                var TYPE = event.IDTYPE;

                var state = event.switcher;

                // Todo: create recurring Events
                var date = event.start;

                IDID = IDID.replace(".",":");
                var objectName = IDPARENT+"."+IDID;

                // Todo: Check if this Job already exists
                var allJobs = schedule['scheduledJobs'];

                var scheduleName = objectName+"###"+event.start.getTime()+"###"+state;

                if (allJobs[scheduleName] == undefined) {
                    if (event.start > now) {
                        adapter.log.debug("Create scheduled Object for " + objectName + " (" + TYPE + ") at " + event.start.toLocaleDateString() + " " + event.start.toLocaleTimeString() + ", state = " + state);

                        var a = schedule.scheduleJob(scheduleName, event.start, function(){
                            adapter.log.info("start changeState");
                            changeState(objectName, state);
                            //adapter.states.setState(IDPARENT+"."+IDID, {val: true, ack: true});
                            a.cancel();
                        });
                    }
                } else {
                    adapter.log.debug("Job: " + scheduleName + " already exists");
                }

                var scheduleName = objectName+"###"+event.end.getTime()+"###"+state;
                if (allJobs[scheduleName] == undefined) {
                    if (event.end > now) {
                        adapter.log.debug("Create scheduled Object for " + objectName + " (" + TYPE + ") at " + event.end.toLocaleDateString() + " " + event.end.toLocaleTimeString() + ", state = " + !state);

                        var b = schedule.scheduleJob(scheduleName, event.end, function () {
                            adapter.log.info("start changeState");
                            changeState(objectName, !state);
                            //adapter.states.setState(IDPARENT+"."+IDID, {val: true, ack: true});
                            b.cancel();
                        });
                    }
                } else {
                    adapter.log.debug("Job: " + scheduleName + " already exists");
                }
            }
            writeEventsToFile(ID, data);
        }
    });


/* this will print a message at 09:49am on 25 May, 2015  */
        /*
         var date = new Date(2015, 4, 25, 9, 49, 0);

         var j = schedule.scheduleJob(date, function(){
         var now = new Date();
         console.log(now+'-------> The world is going to end today.');
         j.cancel();
         });
         */
/* this will print a message on Thursday, Friday, Saturday, and Sunday at 5pm */
        /*
         var rule = new schedule.RecurrenceRule();
         rule.dayOfWeek = [0, new schedule.Range(4, 6)];
         rule.hour = 17;
         rule.minute = 0;

         var j = schedule.scheduleJob(rule, function(){
         console.log('Today is recognized by Rebecca Black!');
         });
         j.cancel();
         */

/* this rule, which executes the function every hour at 42 minutes after the hour */
        /*
         var rule = new schedule.RecurrenceRule();
         rule.minute = 42;

         var j = schedule.scheduleJob(rule, function(){
         console.log('The answer to life, the universe, and everything!');
         });
         j.cancel();
         */

/* this example which will log a message every Sunday at 2:30pm */
        /*
         var j = schedule.scheduleJob({hour: 14, minute: 30, dayOfWeek: 0}, function(){
         console.log('Time for tea!');
         });
         j.cancel();
         */
}

function parseEvents(jsonEvent, flag, ID, type, parent) {
    var event;

    if (flag) {
        adapter.log.debug("parseEvents: " + jsonEvent);
        var jsonData = JSON.parse(jsonEvent);
        for (var i = 0; i < jsonData.length; i++) {
            event = jsonData[i];

            event.IDTYPE = type;
            event.IDPARENT = parent;
            event.IDID = ID;

            var m = $.fullCalendar.moment(event.start);

            var dt = new Date(m.format());
            dt.setHours = dt.getHours+2;
            event.start = dt;

            m = $.fullCalendar.moment(event.end);
            dt = new Date(m.format());
            dt.setHours = dt.getHours+2;
            event.end = dt;

            allEvents.push(event);
            // TODO: $('#calendar').fullCalendar('renderEvent', ev);
        }
    } else {
        var timeoutName = "";
        var temperatureName = "";
        if (type == "HM-CC-TC") {
            timeoutName = "TIMEOUT_";
            temperatureName = "TEMPERATUR_";
        } else if (type == "HM-CC-RT-DN" || type == "BC-RT-TRX-CyG-3") {
            timeoutName = "ENDTIME_";
            temperatureName = "TEMPERATURE_";
        }

        jsonData = jsonEvent;
        // TODO: Must parse all weekdays
        var weekDays = ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY', 'SUNDAY'];
        var colors = ["#006600", "#006699", "#0066FF", "#33FF00", "#660066", "#66FF99", "#CC0066", "#CCFFCC", "#FF9966"];
        var firstMidnight = 0;
        var editable;
        var dateStart;

        for (var weekday in weekDays) {
            // TODO: Must parse all timeslots
            for (var i = 1; i < 25; i++) {
                var tempName = temperatureName + weekDays[weekday] + "_" + i;
                adapter.log.debug(tempName + ":" + jsonData[tempName]);
                var timeName = timeoutName + weekDays[weekday] + "_" + i;
                adapter.log.debug(timeName + ":" + jsonData[timeName]);
                var timeout = jsonData[timeName];
                adapter.log.debug("############## "+timeout);

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

                    if (timeout / 60 == 24 || timeout == 0) {
                        firstMidnight = 1;
                    } else {
                        if (timeout / 60 == 24 || timeout == 0) {
                            firstMidnight = 1;
                        }
                        var hours = Math.floor(timeout / 60);
                        var minutes = timeout % 60;

                        // New Event
                        event = new Object();

                        event.IDTYPE = type;
                        event.IDPARENT = parent;
                        event.IDID = ID;

                        // TODO: DAS MUSS NEU GEMACHT WERDEN
                        // CHECK if start begins at midnight

                        if (parseInt(minutes) + parseInt(hours) > 0 && i == 1) {
                            event.start = new Date(year, month, day - n + parseInt(weekday), 0, 0);
                            event.end = new Date(year, month, day - n + parseInt(weekday), hours, minutes);
                            adapter.log.debug("start:"+event.start+",end:"+event.end);
                            var x = parseInt(i) - 1;

                            var tempn = temperatureName + weekDays[weekday] + "_" + x;
                            var temperature = jsonData[tempName];
                            // event.title = tempn + " - " + ID;
                            // event.title = tempName + " - " + ID;
                            event.title = tempName;

                            event.section = ID;
                            event.color = colors[colorPicker];

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
                            // TODO: $('#calendar').fullCalendar('renderEvent', event);
                        }

                        event = new Object();
                        event.start = new Date(year, month, day - n + parseInt(weekday), hours, minutes);
                        //event.start = new Date(year, month, day - n + parseInt(weekday), 0, 0);

                        var x = parseInt(i) + 1;
                        var dummy = timeoutName + weekDays[weekday] + "_" + x;
                        adapter.log.debug(timeName + ":" + jsonData[timeName]);
                        var timeend = jsonData[dummy];

                        var hours = Math.floor(timeend / 60);
                        var minutes = timeend % 60;

                        event.end = new Date(year, month, day - n + parseInt(weekday), hours, minutes);
                        adapter.log.debug("start:"+event.start+",end:"+event.end);

                        //var x = parseInt(i) - 1;
                        var x = parseInt(i) + 1;
                        if (x == 0)
                            x = 2;
                        var tempn = temperatureName + weekDays[weekday] + "_" + x;
                        var temperature = jsonData[tempn]
                        // event.title = tempName + " - " + ID;
                        // event.title = tempn + " - " + ID;
                        event.title = tempn;

                        event.section = ID;
                        event.color = colors[colorPicker];

                        event.allDay = false;
                        event.id = event.title + "_" + ID;
                        //event.notes = temperature;
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
                        /* *************************************************************************************** */
                        //var ts = Math.round((event.start).getTime() / 1000);
                        //adapter.states.setState('occ.0.'+ID, {val: event.title, ack: true, ts: ts});
                        /* *************************************************************************************** */
                        adapter.log.debug("START = " + event.start + " END = " + event.end);
                        // TODO : $('#calendar').fullCalendar('renderEvent', event);
                    }
                    today.setTime(today.getTime() + 7 * (24*60*60*1000));
                }
            }
        }
    }
    colorPicker = colorPicker + 1;
    adapter.log.debug("COLORPICKER" + colorPicker);
}

