var allEvents = "";
var progval = 0;
var progressbar = $( "#progressbar" );
var eventSources = new Array();
var dialogoptions, dialogioptions;
var states = {};
var objects = {};
var enums = [];

function nextDay(d, dow){
    d.setDate(d.getDate() + (dow+(7-d.getDay())) % 7);
    return d;
}

// TODO: Remove Function
function writeEventsToFile(event, eventID) {
    var eventsFromCalendar = $('#calendar').fullCalendar('clientEvents');
    // Bugfix: Elements can only saved if source tree is not available (cyclic object while JSON.stringify)
    for (var i = 0; i < eventsFromCalendar.length; i++) {
        delete eventsFromCalendar[i].source
    }
    var events = new Array();

    eventID = eventID.replace(":",".");

    // Todo: only save the events from eventID into json file
    for (var key in eventsFromCalendar) {
        var value = eventsFromCalendar[key];
        var id = value.id
        var n = id.search(eventID);
        if (n > 0) {
            events.push(value);
        } else {
            // Todo: save Objects with same IDID too
            var IDID = value.IDID;
            IDID = IDID.replace(":",".");

            n = IDID.search(eventID);
            if (n >= 0) {
                //alert("save object cause of IDID name");
                events.push(value);
            }
        }
    }
    if (events.length == 0) {
        events.push(event);
    }

    var jstrng = JSON.stringify(events);
    console.log(jstrng);

    // Bugfix
    if (eventID == "Object" || eventID == "iCal") {
        eventID = "#"+eventID;
    }
    servConn.writeFile('occ-events_'+eventID+'.json', jstrng, function () {
        console.log("file was written with" + JSON.stringify(jstrng));
    });
}

function getData(callback) {
    var objectsReady;
    var statesReady;

    console.log('requesting all states');
    servConn.getStates('*', function (err, res) {
        states = res;
        statesReady = true;
        console.log('received all states');
        if (objectsReady && typeof callback === 'function') callback();
    });

    console.log('requesting all objects');

    servConn.getObjects(function (err, res) {
        objects = res;
        enums = [];
        for (object in objects) {
            if (objects[object].type === 'enum') enums.push(objects[object]._id);
        }
        objectsReady = true;
        console.log('received all objects');
        if (statesReady && typeof callback === 'function') callback();
    });
}

function createTypes() {
    $("#alltypes").multiselect({
        multiple: false,
        header: "Select an option",
        noneSelectedText: "Select an Option",
        selectedList: 1,
        click: function(event, ui){
            if (ui.checked) {
                $('#divTemperature').hide();
                $('#divSpinner').hide();
                $('#divSwitch').hide();
                $('#div_Script').hide();
                $("#divState_Generic").show();

                if (ui.value == "Script") {
                    $('#div_Script').show();
                } else if (ui.value == "Thermostat") {
                    $('#divTemperature').show();
                    $('#divSpinner').show();
                } else if (ui.value == "Variable") {

                } else if (ui.value == "Switch") {
                    $('#divSwitch').show();
                }
                $("#divState_Generic").hide();
                // Todo: Not yet supported
                $('button_reset').show();
            }
        },
        selectedText: function(numChecked, numTotal, checkedItems) {
        },
        uncheckAll: function(){
        },
        optgrouptoggle: function(event, ui) {
        }
    });

    $("#alltypes").children().remove("optgroup");

    // Todo: add Object and iCal to Group
    var glob_optgroup = $('<optgroup>');
    glob_optgroup.attr('label',"Supported Types");

    var glob_option = $("<option></option>");

    glob_option.val("Switch");
    glob_option.text("Switch");
    glob_optgroup.append(glob_option);

    var glob_option = $("<option></option>");

    glob_option.val("Script");
    glob_option.text("Script");
    glob_optgroup.append(glob_option);

    var glob_option = $("<option></option>");

    glob_option.val("Thermostat");
    glob_option.text("Thermostat");
    glob_optgroup.append(glob_option);

    var glob_option = $("<option></option>");

    glob_option.val("Variable");
    glob_option.text("Variable");
    glob_optgroup.append(glob_option);

    $("#alltypes").append(glob_optgroup);
    $('#alltypes').multiselect( 'refresh' );
}

function readEventsFromObjects() {
    $("#allelement").children().remove("optgroup");
    $("#allelements").children().remove("optgroup");

    // Todo: add Object and iCal to Group
    var glob_optgroup = $('<optgroup>');
    glob_optgroup.attr('label',"Global");

    var glob_option = $("<option></option>");

    glob_option.val("#Object");
    glob_option.text("#Object");
    glob_optgroup.append(glob_option);

    var glob_option = $("<option></option>");

    glob_option.val("#iCal");
    glob_option.text("#iCal");
    glob_optgroup.append(glob_option);

    for (var i = 0; i < enums.length; i++) {
        if (enums[i].search("enum.occ.") == 0) {
            console.log("RES: " + enums[i]);
            var obj = objects[enums[i]];
            var optgroup = $('<optgroup>');

            $("#allelements").multiselect({
                click: function(event, ui){
                    if (ui.checked) {
                        var ioEvents = [];
                        for (var obj in objects) {
                            if (obj.search("occ.0") == 0) {
                                //console.log("--"+obj);
                                if (obj.search(ui.value) > 0) {
                                    if (obj.search(".update") == -1 && obj.search(".html") == -1 && obj.search(".color") == -1) {
                                        if (objects[obj].native !== undefined) {
                                            ioEvents.push(objects[obj].native);
                                        }
                                    }
                                }
                            }
                        }
                        var s = JSON.stringify(ioEvents);
                        allEvents = s;
                        parseEvents(s, true, ui.value);
                    } else {
                        // TODO: CHECK IF WE NEED ioBroker.objects
                        parseEvents(null, "delete", ui.value);
                    }
                },
                selectedText: function(numChecked, numTotal, checkedItems) {
                },
                uncheckAll: function(){
                    $('#calendar').fullCalendar('removeEvents');
                    eventSources = new Array();
                },
                checkAll: function(event, ui) {
                    var allElements = $('#allelements').val();
                    var valArr = allElements;
                    i = 0, size = valArr.length, $options = $('#allelements option');

                    for(i; i < size; i++){
                        $options.filter('[value="'+valArr[i]+'"]').prop('selected', true);

                        $("#allelements").multiselect("widget").find(":checkbox[value='"+valArr[i]+"']").each(function() {
                            this.click();
                        });
                    }
                    $("#allelements").multiselect("refresh");
                },
                optgrouptoggle: function(event, ui){
                    if (ui.checked == false) {
                        $('#calendar').fullCalendar('removeEvents');
                        eventSources = new Array();
                    }
                }
            }).multiselectfilter();
            console.log("RES1: " + JSON.stringify(obj));
            var object = obj;
            optgroup.attr('label',object.common.name);

            if (typeof object.common.members != 'undefined') {
                console.log("MEMBERS: " + object.common.members);
                for (var m in object.common.members) {
                    var option = $("<option></option>");
                    var objName = object.common.members[m];

                    var array = objName.split(".");
                    objName = array[2]+'.'+array[3];

                    option.val(object.common.members[m]);
                    option.text(object.common.members[m]);
                    optgroup.append(option);

                    var objx = objects[object.common.members[m]];
                    option.text(objx.common.name);
                }
            }

            $("#allelements").append(glob_optgroup);
            $('#allelements').multiselect( 'refresh' );

            $("#allelement").append(optgroup);
            $('#allelement').multiselect( 'refresh' );
            $("#allelements").append(optgroup.clone());
            $('#allelements').multiselect( 'refresh' );
        }
    }
}

function saveEventToObject(event, flag) {
    /* Todo: Cyclic Object */
    delete event.source;
    var fileName;
    var id;
    var title;
    var objectName;
    var timestamp;

    if (event.IDID == undefined) {
        fileName = event[0].IDID;
        id = event[0].id;
        title = event[0].title;
        timestamp = event[0].start.unix();
    } else {
        fileName = event.IDID;
        id = event.id;
        title = event.title;
        timestamp = event.start.unix();
    }

    objectName = 'occ.0.'+fileName+"."+title + "_#" + timestamp + "#";

    var stateObj;

    if (flag == "submit") {
        stateObj = {
            common: {
                name:  objectName,
                read:  true,
                write: true,
                type: 'state',
                role: 'meta.config',
                update: true
            },
            native: event[0],
            type:   'state'
        };
    } else {
        stateObj = {
            common: {
                name:  objectName,
                read:  true,
                write: true,
                type: 'state',
                role: 'meta.config',
                update: true
            },
            native: event,
            type:   'state'
        };

    }

    if (fileName == "undefined" || fileName == undefined) {
        alert("Failure");
    }

    servConn._socket.emit('setState', 'occ.0.'+fileName+".update", {val: flag, ack: true});
    servConn._socket.emit('setObject', objectName, stateObj);

    console.log("setState for " + 'occ.0.'+fileName+".update");
    console.log("setObject for " + objectName);
}

function parseEvents(jsonEvent, flag, objectID) {
    if (flag == true) {

        //TODO: generate Objects for repeating Events
        //console.log(jsonEvent);
        var jsonData = JSON.parse(jsonEvent);
        var arr = new Array();

        for (var i = 0; i < jsonData.length; i++) {
            var ev = jsonData[i];

            // TODO: Create Events for each
            // ev.repeaterCombo = day
            // ev.numberoftimes = 4
            // ev.endCombo = times
            var eventID = ev.id;
            var repeatEnd = new Date(ev.jqdEnd);

            var dat = new Date(ev.jqdFrom);
            var y = dat.getFullYear();
            var m = dat.getMonth();
            var d = dat.getDate();
            var startDate = new Date(y, m, d);

            // Todo: Check if repeaterCombo is custom...
            if (ev.repeaterCombo == "custom") {
                var combo = $("#repeaterTab").tabs('option', 'active');
                alert("combo = " + combo);
                if (combo == 0) {
                    var days = $("#dailyinput").val();
                    alert("days = " + days);
                    createEvent(ev, days, "day", eventID);
                } else if (combo == 1) {
                    var days = $("#weeklyinput").val();
                    var mon = $('#jqbmonday').prop('checked') ? $('#jqbmonday').val() : false;
                    var tue = $('#jqbtuesday').prop('checked') ? $('#jqbtuesday').val() : false;
                    var wed = $('#jqbwednesday').prop('checked') ? $('#jqbwednesday').val() : false;
                    var thu = $('#jqbthursday').prop('checked') ? $('#jqbthursday').val(): false;
                    var fri = $('#jqbfriday').prop('checked') ? $('#jqbfriday').val() : false;
                    var sat = $('#jqbsaturday').prop('checked') ? $('#jqbsaturday').val() : false;
                    var sun = $('#jqbsunday').prop('checked') ? $('#jqbsunday').val() : false;
                    var weekdays = [mon, tue, wed, thu, fri, sat, sun];
                    alert(weekdays);
                    createEvent(ev, "weekday", eventID, weekdays);
                } else if (combo == 2) {
                    var days = $("#monthlyinput").val();
                    var onEach = $('#monthlygroup1').prop('checked');
                    if (onEach == true) {
                        jQuery("input[name='button_monthly']").each(function() {
                            alert( this.value + ":" + this.checked );
                        });
                    } else {
                        var monthlycombofirst = $('#monthlycombofirst').val();
                        var monthlycombosecond = $('#monthlycombosecond').val();
                        alert(monthlycombofirst);
                        alert(monthlycombosecond);
                    }
                } else if (combo == 3) {

                }
            } else {
                if (ev.endCombo == "times") {
                    createEvent(ev, ev.numberoftimes, ev.repeaterCombo, eventID);
                } else if (ev.endCombo == "date") {
                    if (ev.repeaterCombo == "day") {
                        // Create events until End $("#endCombo").val() + " " + $("#jqdEnd").val()
                        var days = (repeatEnd - startDate) / 1000 / 60 / 60 / 24;
                        createEvent(ev, days, "day", eventID);
                    } else if (ev.repeaterCombo == "week") {
                        var days = (repeatEnd - startDate) / 1000 / 60 / 60 / 24 / 7;
                        createEvent(ev, days, "week", eventID);
                    } else if (ev.repeaterCombo == "month") {
                        var days = (repeatEnd.getMonth() - startDate.getMonth());
                        createEvent(ev, days, "month", eventID);
                    } else if (ev.repeaterCombo == "year") {
                        var days = (repeatEnd.getYear() - startDate.getYear());
                        createEvent(ev, days, "year", eventID);
                    }
                } else {
                    createEvent(ev, 0, "single", eventID);
                }
            }
        }
        /* TODO !!!
         eventSources[objectID] = arr;
         $('#calendar').fullCalendar('removeEvents');
         //$('#calendar').fullCalendar('addEventSource', eventSources[objectID]);

         // Todo: render all known Events from eventSources
         for (var key in eventSources) {
         var value = eventSources[key];
         $('#calendar').fullCalendar('addEventSource', value);
         }

         $('#calendar').fullCalendar('rerenderEvents');

         //console.log("----------------> "+objectID);
         */
    } else if (flag == "delete") {
        // Get All Objects with this objectID / IDID
        var eventsFromCalendar = $('#calendar').fullCalendar('clientEvents');
        var localID = objectID.replace(".",":");
        var localEvents = [];
        for (var i = 0; i < eventsFromCalendar.length; i++) {
            var localEvent =  eventsFromCalendar[i];
            if (localEvent.IDID == localID) {
                localEvents.push(localEvent);
            }
        }

        $('#calendar').fullCalendar('removeEventSource', localEvents);
        $('#calendar').fullCalendar('rerenderEvents');
        $('#calendar').fullCalendar( 'refetchEvents' );

        if (jsonEvent != undefined) {
            // TODO: Remove Function
            //writeEventsToFile(null, objectID);
            saveEventToObject(jsonEvent, "delete");
        }
        //console.log("DELETE: "+objectID);
    } else  {
        var jsonData = JSON.parse(jsonEvent);

        alert("Hier muss der Typ abgefragt werden! " + jsonData["IDTYPE"]);
        var weekDays = ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY', 'SUNDAY'];

        for (var weekday in weekDays) {
            for (var i = 1; i < 25; i++) {
                //for (var i = 1; i < 6; i++) {
                var tempName = "TEMPERATUR_" + weekDays[weekday] + "_" + i;
                console.log(tempName + ":" + jsonData[tempName]);
                var timeName = "TIMEOUT_" + weekDays[weekday] + "_" + i;
                //console.log(timeName + ":" + jsonData[timeName]);
                var timeout = jsonData[timeName];
                if (timeout / 60 == 24) {
                    //console.log("Midnight for " + tempName);
                } else {
                    var hours = Math.floor( timeout / 60);
                    var minutes = timeout % 60;
                    var year = 2015;
                    var month = 3;
                    var day = 24;

                    console.log(tempName + "=" + hours + ":" + minutes + " TEMP=" + jsonData[tempName]);

                    // New Event
                    var event = new Object();

                    var today = new Date();
                    var n = today.getDay() - 1;

                    var monday = new Date(year, month, day - n, hours, minutes);
                    // CHECK if start begins at midnight
                    if (parseInt(minutes) + parseInt(hours) > 0 && i == 1) {
                        // Create Object from midnight until first event
                        event.start = new Date(year, month, day - n + parseInt(weekday), 0, 0);
                        event.end = new Date(year, month, day - n + parseInt(weekday), hours, minutes);
                        var x = parseInt(i) - 1;

                        var tempn = "TEMPERATUR_" + weekDays[weekday] + "_" + x;
                        var temperature = jsonData[tempName];
                        event.title = tempn;
                        event.subID = "TIMEOUT_" + weekDays[weekday] + "_" + x;
                        event.color = "#3A87AD";
                        event.allDay = false;
                        event.id = event.title;
                        event.editable = true;
                        event.startEditable = true;
                        event.durationEditable = true;
                        event.temperature = temperature;

                        $('#calendar').fullCalendar('renderEvent', event);
                    }

                    event.start = new Date(year, month, day - n + parseInt(weekday), hours, minutes);

                    var x = parseInt(i) + 1;
                    var dummy = "TIMEOUT_" + weekDays[weekday] + "_" + x;
                    //console.log(timeName + ":" + jsonData[timeName]);
                    var timeend = jsonData[dummy];

                    var hours = Math.floor( timeend / 60);
                    var minutes = timeend % 60;
                    //alert("endtime="+hours+":"+minutes);

                    event.end = new Date(year, month, day - n + parseInt(weekday), hours, minutes);
                    // DUMMY END

                    var x = parseInt(i) - 1;
                    if (x == 0)
                        x = 2;
                    var tempn = "TEMPERATUR_" + weekDays[weekday] + "_" + x;
                    var temperature = jsonData[tempn]
                    event.title = tempName;
                    event.subID = timeName;
                    event.color = "#3A87AD";
                    event.allDay = false;
                    event.id = event.title;
                    //event.notes = temperature;
                    event.temperature = temperature;
                    event.editable = true;
                    event.startEditable = true;
                    event.durationEditable = true;

                    $('#calendar').fullCalendar('renderEvent', event);
                }
            }
        }
    }
}

function showHideEndCombo(element) {
    if (element == 'never') {
        $('#jqdEnd').attr('disabled', true);
        $('#numberoftimes').attr('disabled', true);
        $('#numberoftimes').hide();
        $('#jqdEnd').hide();
    } else if (element == 'times') {
        $('#jqdEnd').attr('disabled', true);
        $('#jqdEnd').hide();
        $('#numberoftimes').attr('disabled', false);
        $('#numberoftimes').show();
    } else if (element == 'date') {
        $('#jqdEnd').attr('disabled', false);
        $('#jqdEnd').show();
        $('#numberoftimes').attr('disabled', true);
        $('#numberoftimes').hide();
    }
}

function showHideRepeater(element) {
    var checked = false;
    $('#endCombo').attr('disabled', false);

    $('#jqdEnd').attr('disabled', true);
    $('#jqdEnd').hide();
    $('#numberoftimes').attr('disabled', true);
    $('#endCombo').show();
    $('#span_end').show();
    $('#numberoftimes').hide();

    if (element == "none") {
        $('#repeaterTab').hide();
        //$('#event_Dialog').dialog( 'option', 'width', 345 );
        //$('#event_Dialog').dialog( 'option', 'height', 690 );
        $('#event_Dialog').dialog( 'option', 'width', 355 );
        $('#endCombo').val("never");

        checked = true;
        $('#endCombo').attr('disabled', true);
    } else if (element == "custom") {
        alert("Not yet supported");
        $('#repeaterTab').show();
        $('#event_Dialog').dialog( 'option', 'width', 690 );
        checked = false;

        $('#jqdEnd').attr('disabled', true);
        $('#jqdEnd').hide();
        $('#numberoftimes').attr('disabled', true);
        $('#numberoftimes').hide();
        $('#endCombo').hide();
        $('#span_end').hide();
    } else if (element == "day") {
        $('#repeaterTab').hide();
        $('#event_Dialog').dialog('option', 'width', 355);
        $('#jqdTo').val($('#jqdFrom').val());
        checked = true;
    } else {
        $('#repeaterTab').hide();
        $('#event_Dialog').dialog( 'option', 'width', 355 );
        checked = true;
    }

    if ($('#endCombo').val() == "times") {
        $('#numberoftimes').show();
        $('#numberoftimes').attr('disabled', false);
    } else if ($('#endCombo').val() == "date") {
        $('#jqdEnd').show();
        $('#jqdEnd').attr('disabled', false);
    }

    if ($('#checkbox_allday').prop("checked") == true) {
        hideFromTo(checked);
    }
}

function hideFromTo(checked) {
    $('#jqdFrom').attr('disabled', checked);
    $('#jqdTo').attr('disabled', checked);
    $('#fromTime').attr('disabled', checked);
    $('#toTime').attr('disabled', checked);
    $('#fromampm').attr('disabled', checked);
    $('#toampm').attr('disabled', checked);
}

function debugMessage() {
    alert( "Title = " +
        $("#input_title").val() + ", Location = " + $("#input_location").val() + "\n" +
        "all-day = " + $("#checkbox_allday").prop('checked') + "\n" +
        "From = " + $("#jqdFrom").val() + " " + $("#fromTime").val() + " " + $("#fromampm").val() + "\n" +
        "To = " + $("#jqdTo").val() + " " + $("#toTime").val() + " " + $("#toampm").val() + "\n" +
        "Repeat on " + $("#repeaterCombo").val() + "\n" +
        "Ends at " + $("#endCombo").val() + " " + $("#jqdEnd").val() + "\n" +
        "RepeaterTab:" + " " + $("#repeaterTab").tabs('option', 'active') + "\n\n" +
        "DAILY: " + " " + $("#dailyinput").val() + "\n\n" +
        "WEEKLY: " + " " + $("#weeklyinput").val() + "\n" +
        "Monday: " + $("#jqbmonday").prop('checked') + "\n" +
        "Tuesday: " + $("#jqbtuesday").prop('checked') + "\n" +
        "Wednesday: " + $("#jqbwednesday").prop('checked') + "\n" +
        "Thursday: " + $("#jqbthursday").prop('checked') + "\n" +
        "Friday: " + $("#jqbfriday").prop('checked') + "\n" +
        "Saturday: " + $("#jqbsaturday").prop('checked') + "\n" +
        "Sunday: " + $("#jqbsunday").prop('checked') + "\n\n" +
        "MONTHLY: " + " " + $("#monthlyinput").val() + "\n" +
        "Group: " + $("#monthlygroup1").prop('checked') + ":" + $("#monthlygroup2").prop('checked') + "\n" +
        "Radio: " + $("#monthlycombofirst").val() + ":" + $("#monthlycombosecond").val() + "\n" +
        "1: " + $("#jqb1").prop('checked') + " 2: " + $("#jqb2").prop('checked') + " 3: " + $("#jqb3").prop('checked') + "\n" +
        "4: " + $("#jqb4").prop('checked') + " 5: " + $("#jqb5").prop('checked') + " 6: " + $("#jqb6").prop('checked') + "\n" +
        "7: " + $("#jqb7").prop('checked') + " 8: " + $("#jqb8").prop('checked') + " 9: " + $("#jqb9").prop('checked') + "\n" +
        "10: " + $("#jqb10").prop('checked') + " 11: " + $("#jqb11").prop('checked') + " 12: " + $("#jqb12").prop('checked') + "\n" +
        "13: " + $("#jqb13").prop('checked') + " 14: " + $("#jqb14").prop('checked') + " 15: " + $("#jqb15").prop('checked') + "\n" +
        "16: " + $("#jqb16").prop('checked') + " 17: " + $("#jqb17").prop('checked') + " 18: " + $("#jqb18").prop('checked') + "\n" +
        "19: " + $("#jqb19").prop('checked') + " 20: " + $("#jqb20").prop('checked') + " 21: " + $("#jqb21").prop('checked') + "\n" +
        "22: " + $("#jqb22").prop('checked') + " 23: " + $("#jqb23").prop('checked') + " 24: " + $("#jqb24").prop('checked') + "\n" +
        "25: " + $("#jqb25").prop('checked') + " 26: " + $("#jqb26").prop('checked') + " 27: " + $("#jqb27").prop('checked') + "\n" +
        "28: " + $("#jqb28").prop('checked') + " 29: " + $("#jqb29").prop('checked') + " 30: " + $("#jqb30").prop('checked') + "\n" +
        "31: " + $("#jqb31").prop('checked') + "\n\n" +
        "YEARLY: " + " " + $("#yearlyinput").val() + "\n" +
        "Group: " + $("#yearlygroup1").prop('checked') + ":" + $("#yearlygroup2").prop('checked') + "\n" +
        "Radio: " + $("#yearlycombofirst").val() + ":" + $("#yearlycombosecond").val() + "\n" +
        "Jan: " + $("#jqbjan").prop('checked') + "\n" +
        "Feb: " + $("#jqbfeb").prop('checked') + "\n" +
        "Mar: " + $("#jqbmar").prop('checked') + "\n" +
        "Apr: " + $("#jqbapr").prop('checked') + "\n" +
        "May: " + $("#jqbmay").prop('checked') + "\n" +
        "Jun: " + $("#jqbjun").prop('checked') + "\n" +
        "Jul: " + $("#jqbjul").prop('checked') + "\n" +
        "Aug: " + $("#jqbaug").prop('checked') + "\n" +
        "Sep: " + $("#jqbsep").prop('checked') + "\n" +
        "Oct: " + $("#jqboct").prop('checked') + "\n" +
        "Nov: " + $("#jqbnov").prop('checked') + "\n" +
        "Dec: " + $("#jqbdec").prop('checked') + "\n" +
        ""
    );
}

function createEventFromHTML(days, type, eventID, params) {
    /* TODO: This doesn't work
     if (eventID == - 1) {
     event.start = dateStart; // its a date string
     event.end = dateEnd; // its a date string.
     }
     */

    var subject = $("#input_title").val(); //the title of the event
    var subID = $("#input_location").val(); //the subID of the event
    var notes = $("#input_notes").val();

    var temperature = $("#temperature_spinner").val();
    var switcher = $("#switcher").prop('checked');
    var state;
    var decalc = $("#setDECALCIFICATION").prop('checked');

    if ($('#divState_20').css('display') != 'none') {
        state = $("#state_input_20").val();
    } else if ($('#divState_2').css('display') != 'none') {
        state = $("#state_input_2").prop('checked');
    } else if ($('#divState_4').css('display') != 'none') {
        state = $("#state_input_4").val();
    } else if ($('#divState_16').css('display') != 'none') {
        state = $("#state_input_16").val();
    }

    var IDID = $("#IDID").val();

    var dat = $("#jqdFrom").datepicker("getDate");
    var y = dat.getFullYear();
    var m = dat.getMonth();
    var d = dat.getDate();

    var fromTime = $("#fromTime").val();
    var times = fromTime.split(":");
    var starthours = times[0];
    var startminutes = times[1];

    var dateStart = new Date(y, m, d, starthours, startminutes); //the day the event takes place

    dat = $("#jqdTo").datepicker("getDate");
    y = dat.getFullYear();
    m = dat.getMonth();
    d = dat.getDate();
    var endDate = new Date(y, m, d);

    var toTime = $("#toTime").val();
    times = toTime.split(":");
    var endhours = times[0];
    var endminutes = times[1];

    var dateEnd = new Date(y, m, d, endhours, endminutes); //the day the event finishes

    var allDay = $("#checkbox_allday").prop('checked'); //true: event all day, False:event from time to time
    var color = $('#colorPicker').data("plugin_tinycolorpicker").colorHex;

    var repeatingEvents = new Array();
    var newStart;

    for (var i = 0; i <= days; i++) {
        var day = dateStart.getDate();
        var month = dateStart.getMonth();
        var year = dateStart.getYear() + 1900;
        var datum = new Date(year, month, day, starthours, startminutes); //the day the event takes place 

        if (type == "month") {
            var yx = datum.getYear() + 1900;
            var mx = datum.getMonth() + i;
            var dx = datum.getDate();
            var mmx = datum.getMinutes();
            var hx = datum.getHours();
            newStart = new Date(yx, mx, dx, hx, mmx);
        } else if (type == "day") {
            newStart = new Date(datum.getTime() + i * 24 * 60 * 60 * 1000);
        } else if (type == "week") {
            newStart = new Date(datum.getTime() + i * 24 * 60 * 60 * 1000 * 7);
        } else if (type == "year") {
            var yx = datum.getYear() + 1900 + i;
            var mx = datum.getMonth();
            var dx = datum.getDate();
            var mmx = datum.getMinutes();
            var hx = datum.getHours();
            newStart = new Date(yx, mx, dx, hx, mmx);
        } else if (type == "single") {
            newStart = dateStart;
        } else if (type == "weekday") {
            for (var d in params) {
                var wday = params[d];
                if (wday == false) {
                    console.log("nothing todo");
                } else {
                    alert("wday = " + wday);
                    alert("datum = " + datum);
                    var pDatum = datum;
                    var day = new Date(nextDay(pDatum, wday)).toLocaleDateString();
                    alert("day = " + day);
                }
            }
        }

        day = dateEnd.getDate();
        month = dateEnd.getMonth();
        year = dateEnd.getYear() + 1900;
        datum = new Date(year, month, day, endhours, endminutes); //the day the event takes place  

        if (type == "month") {
            /* BugFix: set Month correctly */
            var newEnd = new Date(datum.getTime());
            var yx = datum.getYear() + 1900;
            var mx = datum.getMonth() + i;
            var dx = datum.getDate();
            var mmx = datum.getMinutes();
            var hx = datum.getHours();
            var newEnd = new Date(yx, mx, dx, hx, mmx);
        } else if (type == "day") {
            var newEnd = new Date(datum.getTime() + i * 24 * 60 * 60 * 1000);
        } else if (type == "week") {
            var newEnd = new Date(datum.getTime() + i * 24 * 60 * 60 * 1000 * 7);
        } else if (type == "year") {
            var yx = datum.getYear() + 1900 + i;
            var mx = datum.getMonth();
            var dx = datum.getDate();
            var mmx = datum.getMinutes();
            var hx = datum.getHours();
            var newEnd = new Date(yx, mx, dx, hx, mmx);
        } else if (type == "single") {
            var newEnd = dateEnd;
        }

        // New Event 
        event = new Object();
        event.title = subject;
        event.start = newStart; // its a date string 
        event.end = newEnd; // its a date string. 
        event.color = color;
        event.allDay = allDay;
        event.id = eventID;
        event.notes = notes;
        event.temperature = temperature;
        event.switcher = switcher;
        event.state = state;
        event.decalc = decalc;

        event.IDID = IDID;

        var editable;
        if (i == 0) {
            editable = true;
            event.tooltip = "This is a recurring Event.";
        } else {
            editable = false;
            event.title = subject + " (Repeated Event)";
            event.tooltip = "This is a recurring Event.\n\nThe original Event can be found at\n" + dateStart;
        }
        event.editable = editable;
        event.startEditable = editable;
        event.durationEditable = editable;
        // TODO: ADD PRIVATE OBJECTS TO EVENT 
        updatePrivateFields(event);
        // TODO: RenderEvent when all Objects loaded 
        // $('#calendar').fullCalendar('renderEvent', event); 
        repeatingEvents.push(event);
    }

    $('#calendar').fullCalendar('addEventSource', repeatingEvents);
    $('#calendar').fullCalendar('rerenderEvents');
}

function createEvent(ev, days, type, eventID, params) {
    var subject = ev.title; //the title of the event
    var notes = ev.notes;

    var temperature = ev.temperature;
    var switcher = ev.switcher;
    var state = ev.state;
    var decalc = ev.decalc;

    var IDID = ev.IDID;

    var dat = new Date(ev.start);
    var y = dat.getFullYear();
    var m = dat.getMonth();
    var d = dat.getDate();
    var starthours = dat.getHours();
    var startminutes = dat.getMinutes();

    var dateStart = new Date(y, m, d, starthours, startminutes); //the day the event takes place

    dat = new Date(ev.end);
    y = dat.getFullYear();
    m = dat.getMonth();
    d = dat.getDate();

    var endhours = dat.getHours();
    var endminutes = dat.getMinutes();

    var dateEnd = new Date(y, m, d, endhours, endminutes); //the day the event finishes

    var allDay = ev.allDay; //true: event all day, False:event from time to time
    //var color = $('#colorPicker').data("plugin_tinycolorpicker").colorHex;
    var color = ev.color;

    var repeatingEvents = new Array();
    var newStart;

    for (var i = 0; i <= days; i++) {
        var day = dateStart.getDate();
        var month = dateStart.getMonth();
        var year = dateStart.getYear() + 1900;
        var datum = new Date(year, month, day, starthours, startminutes); //the day the event takes place 

        if (type == "month") {
            var yx = datum.getYear() + 1900;
            var mx = datum.getMonth() + i;
            var dx = datum.getDate();
            var mmx = datum.getMinutes();
            var hx = datum.getHours();
            newStart = new Date(yx, mx, dx, hx, mmx);
        } else if (type == "day") {
            newStart = new Date(datum.getTime() + i * 24 * 60 * 60 * 1000);
        } else if (type == "week") {
            newStart = new Date(datum.getTime() + i * 24 * 60 * 60 * 1000 * 7);
        } else if (type == "year") {
            var yx = datum.getYear() + 1900 + i;
            var mx = datum.getMonth();
            var dx = datum.getDate();
            var mmx = datum.getMinutes();
            var hx = datum.getHours();
            newStart = new Date(yx, mx, dx, hx, mmx);
        } else if (type == "single") {
            newStart = dateStart;
        } else if (type == "weekday") {
            for (var d in params) {
                var wday = params[d];
                if (wday == false) {
                    console.log("nothing todo");
                } else {
                    alert("wday = " + wday);
                    alert("datum = " + datum);
                    var pDatum = datum;
                    var day = new Date(nextDay(pDatum, wday)).toLocaleDateString();
                    alert("day = " + day);
                }
            }
        }

        day = dateEnd.getDate();
        month = dateEnd.getMonth();
        year = dateEnd.getYear() + 1900;
        datum = new Date(year, month, day, endhours, endminutes); //the day the event takes place  

        if (type == "month") {
            /* BugFix: set Month correctly */
            var newEnd = new Date(datum.getTime());
            var yx = datum.getYear() + 1900;
            var mx = datum.getMonth() + i;
            var dx = datum.getDate();
            var mmx = datum.getMinutes();
            var hx = datum.getHours();
            var newEnd = new Date(yx, mx, dx, hx, mmx);
        } else if (type == "day") {
            var newEnd = new Date(datum.getTime() + i * 24 * 60 * 60 * 1000);
        } else if (type == "week") {
            var newEnd = new Date(datum.getTime() + i * 24 * 60 * 60 * 1000 * 7);
        } else if (type == "year") {
            var yx = datum.getYear() + 1900 + i;
            var mx = datum.getMonth();
            var dx = datum.getDate();
            var mmx = datum.getMinutes();
            var hx = datum.getHours();
            var newEnd = new Date(yx, mx, dx, hx, mmx);
        } else if (type == "single") {
            var newEnd = dateEnd;
        }

        // New Event 
        var event = new Object();
        event.title = subject;
        event.start = newStart; // its a date string 
        event.end = newEnd; // its a date string. 
        event.color = color;
        event.allDay = allDay;
        event.id = eventID;
        event.notes = notes;
        event.temperature = temperature;
        event.switcher = switcher;
        event.state = state;
        event.decalc = decalc;

        event.IDID = IDID;

        var editable;
        if (i == 0) {
            editable = true;
            event.tooltip = "This is a recurring Event.";
        } else {
            editable = false;
            event.title = subject + " (Repeated Event)";
            event.tooltip = "This is a recurring Event.\n\nThe original Event can be found at\n" + dateStart;
        }
        event.editable = editable;
        event.startEditable = editable;
        event.durationEditable = editable;
        // TODO: ADD PRIVATE OBJECTS TO EVENT 
        updatePrivateFields(event);
        // TODO: RenderEvent when all Objects loaded 
        // $('#calendar').fullCalendar('renderEvent', event); 
        repeatingEvents.push(event);
    }

    $('#calendar').fullCalendar('addEventSource', repeatingEvents);
    $('#calendar').fullCalendar('rerenderEvents');
}

function updateEvent(eventID) {
    var repeatEnd = new Date($("#jqdEnd").val());

    var dat = $("#jqdFrom").datepicker("getDate");
    var y = dat.getFullYear();
    var m = dat.getMonth();
    var d = dat.getDate();
    var startDate = new Date(y, m, d);

    // Todo: Check if repeaterCombo is custom...
    if ($("#repeaterCombo").val() == "custom") {
        var combo = $("#repeaterTab").tabs('option', 'active');
        alert("combo = " + combo);
        if (combo == 0) {
            var days = $("#dailyinput").val();
            alert("days = " + days);
            createEventFromHTML(days, "day", eventID);
        } else if (combo == 1) {
            var days = $("#weeklyinput").val();
            var mon = $('#jqbmonday').prop('checked') ? $('#jqbmonday').val() : false;
            var tue = $('#jqbtuesday').prop('checked') ? $('#jqbtuesday').val() : false;
            var wed = $('#jqbwednesday').prop('checked') ? $('#jqbwednesday').val() : false;
            var thu = $('#jqbthursday').prop('checked') ? $('#jqbthursday').val(): false;
            var fri = $('#jqbfriday').prop('checked') ? $('#jqbfriday').val() : false;
            var sat = $('#jqbsaturday').prop('checked') ? $('#jqbsaturday').val() : false;
            var sun = $('#jqbsunday').prop('checked') ? $('#jqbsunday').val() : false;
            var weekdays = [mon, tue, wed, thu, fri, sat, sun];
            alert(weekdays);
            createEventFromHTML(0, "weekday", eventID, weekdays);
        } else if (combo == 2) {
            var days = $("#monthlyinput").val();
            var onEach = $('#monthlygroup1').prop('checked');
            if (onEach == true) {
                jQuery("input[name='button_monthly']").each(function() {
                    alert( this.value + ":" + this.checked );
                });
            } else {
                var monthlycombofirst = $('#monthlycombofirst').val();
                var monthlycombosecond = $('#monthlycombosecond').val();
                alert(monthlycombofirst);
                alert(monthlycombosecond);
            }
        } else if (combo == 3) {

        }
    } else {
        if ($("#endCombo").val() == "times") {
            createEventFromHTML($('#numberoftimes').val(), $("#repeaterCombo").val(), eventID);
        } else if ($("#endCombo").val() == "date") {
            if ($("#repeaterCombo").val() == "day") {
                // Create events until End $("#endCombo").val() + " " + $("#jqdEnd").val()
                var days = (repeatEnd - startDate) / 1000 / 60 / 60 / 24;
                createEventFromHTML(days, "day", eventID);
            } else if ($("#repeaterCombo").val() == "week") {
                var days = (repeatEnd - startDate) / 1000 / 60 / 60 / 24 / 7;
                createEventFromHTML(days, "week", eventID);
            } else if ($("#repeaterCombo").val() == "month") {
                var days = (repeatEnd.getMonth() - startDate.getMonth());
                createEventFromHTML(days, "month", eventID);
            } else if ($("#repeaterCombo").val() == "year") {
                var days = (repeatEnd.getYear() - startDate.getYear());
                createEventFromHTML(days, "year", eventID);
            }
        } else {
            createEventFromHTML(0, "single", eventID);
        }
    }
}

function updatePrivateFields(event) {
    if ($('#divState_20').css('display') != 'none') {
        event.state = $("#state_input_20").val();
    } else if ($('#divState_2').css('display') != 'none') {
        event.state = $("#state_input_2").prop('checked');
    } else if ($('#divState_4').css('display') != 'none') {
        event.state = $("#state_input_4").val();
    } else if ($('#divState_16').css('display') != 'none') {
        event.state = $("#state_input_16").val();
    }

    event.numberoftimes = $("#numberoftimes").val();
    event.repeaterCombo = $("#repeaterCombo").val();
    event.endCombo = $("#endCombo").val();
    event.jqdFrom = $("#jqdFrom").val();
    event.jqdEnd = $("#jqdEnd").val();
    event.repeaterTab = $("#repeaterTab").tabs('option', 'active');
    event.dailyinput = $("#dailyinput").val();
    event.weeklyinput = $("#weeklyinput").val();
    if ($("#jqbmonday").prop('checked'))
        event.jqbmonday = $("#jqbmonday").prop('checked');
    if ($("#jqbtuesday").prop('checked'))
        event.jqbtuesday = $("#jqbtuesday").prop('checked');
    if ($("#jqbwednesday").prop('checked'))
        event.jqbwednesday = $("#jqbwednesday").prop('checked');
    if ($("#jqbthursday").prop('checked'))
        event.jqbthursday = $("#jqbthursday").prop('checked');
    if ($("#jqbfriday").prop('checked'))
        event.jqbfriday = $("#jqbfriday").prop('checked');
    if ($("#jqbsaturday").prop('checked'))
        event.jqbsaturday = $("#jqbsaturday").prop('checked');
    if ($("#jqbsunday").prop('checked'))
        event.jqbsunday = $("#jqbsunday").prop('checked');
    event.monthlyinput = $("#monthlyinput").val();
    if ($("#monthlygroup1").prop('checked'))
        event.monthlygroup1 = $("#monthlygroup1").prop('checked');
    if ($("#monthlygroup2").prop('checked'))
        event.monthlgroup2 = $("#monthlygroup2").prop('checked');

    event.monthlycombofirst = $("#monthlycombofirst").val();
    event.monthlycombosecond = $("#monthlycombosecond").val();
    if ($("#jqb1").prop('checked'))
        event.jqb1 = $("#jqb1").prop('checked');
    if ($("#jqb2").prop('checked'))
        event.jqb2 = $("#jqb2").prop('checked');
    if ($("#jqb3").prop('checked'))
        event.jqb3 = $("#jqb3").prop('checked');
    if ($("#jqb4").prop('checked'))
        event.jqb4 = $("#jqb4").prop('checked');
    if ($("#jqb5").prop('checked'))
        event.jqb5 = $("#jqb5").prop('checked');
    if ($("#jqb6").prop('checked'))
        event.jqb6 = $("#jqb6").prop('checked');
    if ($("#jqb7").prop('checked'))
        event.jqb7 = $("#jqb7").prop('checked');
    if ($("#jqb8").prop('checked'))
        event.jqb8 = $("#jqb8").prop('checked');
    if ($("#jqb9").prop('checked'))
        event.jqb9 = $("#jqb9").prop('checked');
    if ($("#jqb10").prop('checked'))
        event.jqb10 = $("#jqb10").prop('checked');
    if ($("#jqb11").prop('checked'))
        event.jqb11 = $("#jqb11").prop('checked');
    if ($("#jqb12").prop('checked'))
        event.jqb12 = $("#jqb12").prop('checked');
    if ($("#jqb13").prop('checked'))
        event.jqb13 = $("#jqb13").prop('checked');
    if ($("#jqb14").prop('checked'))
        event.jqb14 = $("#jqb14").prop('checked');
    if ($("#jqb15").prop('checked'))
        event.jqb15 = $("#jqb15").prop('checked');
    if ($("#jqb16").prop('checked'))
        event.jqb16 = $("#jqb16").prop('checked');
    if ($("#jqb17").prop('checked'))
        event.jqb17 = $("#jqb17").prop('checked');
    if ($("#jqb18").prop('checked'))
        event.jqb18 = $("#jqb18").prop('checked');
    if ($("#jqb19").prop('checked'))
        event.jqb19 = $("#jqb19").prop('checked');
    if ($("#jqb20").prop('checked'))
        event.jqb20 = $("#jqb20").prop('checked');
    if ($("#jqb21").prop('checked'))
        event.jqb21 = $("#jqb21").prop('checked');
    if ($("#jqb22").prop('checked'))
        event.jqb22 = $("#jqb22").prop('checked');
    if ($("#jqb23").prop('checked'))
        event.jqb23 = $("#jqb23").prop('checked');
    if ($("#jqb24").prop('checked'))
        event.jqb24 = $("#jqb24").prop('checked');
    if ($("#jqb25").prop('checked'))
        event.jqb25 = $("#jqb25").prop('checked');
    if ($("#jqb26").prop('checked'))
        event.jqb26 = $("#jqb26").prop('checked');
    if ($("#jqb27").prop('checked'))
        event.jqb27 = $("#jqb27").prop('checked');
    if ($("#jqb28").prop('checked'))
        event.jqb28 = $("#jqb28").prop('checked');
    if ($("#jqb29").prop('checked'))
        event.jqb29 = $("#jqb29").prop('checked');
    if ($("#jqb30").prop('checked'))
        event.jqb30 = $("#jqb30").prop('checked');
    if ($("#jqb31").prop('checked'))
        event.jqb31 = $("#jqb31").prop('checked');
    event.yearlyinput = $("#yearlyinput").val();
    if ($("#yearlygroup1").prop('checked'))
        event.yearlygroup1 = $("#yearlygroup1").prop('checked');
    if ($("#yearlygroup2").prop('checked'))
        event.yearlygroup2 = $("#yearlygroup2").prop('checked');
    event.yearlycombofirst = $("#yearlycombofirst").val();
    event.yearlycombosecond = $("#yearlycombosecond").val();
    if ($("#jqbjan").prop('checked'))
        event.jqbjan = $("#jqbjan").prop('checked');
    if ($("#jqbfeb").prop('checked'))
        event.jqbfeb = $("#jqbfeb").prop('checked');
    if ($("#jqbmar").prop('checked'))
        event.jqbmar = $("#jqbmar").prop('checked');
    if ($("#jqbapr").prop('checked'))
        event.jqbapr = $("#jqbapr").prop('checked');
    if ($("#jqbmay").prop('checked'))
        event.jqbmay = $("#jqbmay").prop('checked');
    if ($("#jqbjun").prop('checked'))
        event.jqbjun = $("#jqbjun").prop('checked');
    if ($("#jqbjul").prop('checked'))
        event.jqbjul = $("#jqbjul").prop('checked');
    if ($("#jqbaug").prop('checked'))
        event.jqbaug = $("#jqbaug").prop('checked');
    if ($("#jqbsep").prop('checked'))
        event.jqbsep = $("#jqbsep").prop('checked');
    if ($("#jqboct").prop('checked'))
        event.jqboct = $("#jqboct").prop('checked');
    if ($("#jqbnov").prop('checked'))
        event.jqbnov = $("#jqbnov").prop('checked');
    if ($("#jqbdec").prop('checked'))
        event.jqbdec = $("#jqbdec").prop('checked');

}

$(function() {
    var progressTimer,
        progressbar = $( "#progressbar" ),
        progressLabel = $( ".progress-label" ),
        dialogButtons = [{
            text: "Cancel Download",
            click: closeDownload
        }],
        dialog = $( "#dialog" ).dialog({
            autoOpen: false,
            closeOnEscape: false,
            resizable: false,
            buttons: dialogButtons,
            open: function() {
                progressTimer = setTimeout( progress, 0 );
            },
            beforeClose: function() {
                downloadButton.button( "option", {
                    disabled: false,
                    label: "Start Download"
                });
            }
        }),
        downloadButton = $( "#downloadButton" )
            .button()
            .on( "click", function() {
                $( this ).button( "option", {
                    disabled: true,
                    label: "Downloading..."
                });
                dialog.dialog( "open" );
            });

    progressbar.progressbar({
        value: false,
        change: function() {
            progressLabel.text( "Current Progress: " + progressbar.progressbar( "value" ) + "%" );
        },
        complete: function() {
            progressLabel.text( "Complete!" );
            dialog.dialog( "option", "buttons", [{
                text: "Close",
                click: closeDownload
            }]);
            $(".ui-dialog button").last().focus();
        }
    });

    function progress() {
        // TODO: Check if all Subprocesses from socket.io already returned
        var val = progressbar.progressbar( "value" ) || 0;
        progressbar.progressbar( "value", val + Math.floor( Math.random() * 3 ) );

        if ( val < 90 ) {
            progressTimer = setTimeout( progress, 50 );
        } else {
            clearTimeout( progressTimer );
        }
    }

    function progress() {
        var val = progressbar.progressbar( "value" ) || 0;

        progressbar.progressbar( "value", val + Math.floor( Math.random() * 3 ) );

        if ( val <= 90 ) {
            progressTimer = setTimeout( progress, 50 );
        } else {
            progressTimer = setTimeout ( progress, 100 );
        }
    }

    function closeDownload() {
        clearTimeout( progressTimer );
        dialog
            .dialog( "option", "buttons", dialogButtons )
            .dialog( "close" );
        progressbar.progressbar( "value", false );
        progressLabel
            .text( "Starting download..." );
        downloadButton.focus();
    }
});

$(function() {
    $("#setDECALCIFICATION").change(function() {
        $("#jqdTo").hide();
        $("#toTime").hide();
        $("#toampm").hide();
        $("#span_to").hide();
    });
    $("#setTEMPERATURE").change(function() {
        $("#jqdTo").show();
        $("#toTime").show();
        $("#toampm").show();
        $("#span_to").show();
    });
});

$(document).ready(function() {

    createTypes();

    servConn.init(null, {
        onConnChange: function (isConnected) {
            progressbar.progressbar("value", progval + 2);
            if (isConnected) {
                progressbar.progressbar("value", progval + 2);
            }
            console.log("onConnChange isConnected=" + isConnected);

            getData(function () {
                // Todo: Open Progressbar onLoad
                //dialog.dialog("open");
                progressbar.progressbar("value", progval + 2);

                var $box = $('#colorPicker');
                $box.tinycolorpicker();

                var event_DialogOpts =
                {
                    width: 355,
                    height: 500,
                    position: {
                        my: 'center',
                        at: 'center',
                        of: window
                    },
                    draggable: true,
                    closeOnEscape: true,
                    // autoOpen: true,
                    autoOpen: false,
                    resizable: false,
                    modal: true,
                    /*open: function (event, ui) {
                     $('#event_Dialog').css('overflow-x', 'hidden');
                     }*/
                };
                $("#event_Dialog").dialog(event_DialogOpts);
                $("#event_Dialog").on("dialogopen", $('#eventID').val(-1));

                var jqdFromOpts =
                {
                    dateFormat: 'mm/dd/yy',
                    changeMonth: false,
                    changeYear: false,
                    showButtonPanel: false,
                    showAnim: 'show'
                };
                $("#jqdFrom").datepicker(jqdFromOpts);
                $("#jqdFrom").datepicker("setDate", "new Date()");

                var jqdToOpts =
                {
                    dateFormat: 'mm/dd/yy',
                    changeMonth: false,
                    changeYear: false,
                    showButtonPanel: false,
                    showAnim: 'show'
                };
                $("#jqdTo").datepicker(jqdToOpts);
                $("#jqdTo").datepicker("setDate", "new Date()");

                var jqdEndOpts =
                {
                    dateFormat: 'mm/dd/yy',
                    changeMonth: false,
                    changeYear: false,
                    showButtonPanel: false,
                    showAnim: 'show'
                };
                $("#jqdEnd").datepicker(jqdEndOpts);
                $("#jqdEnd").datepicker("setDate", "new Date()");

                var repeaterTabOpts =
                {
                    show: false,
                    event: 'click',
                    collapsible: true
                };
                $("#repeaterTab").tabs(repeaterTabOpts);

                var jQuerySpinner1Opts =
                {
                    min: 14,
                    max: 30,
                    step: 0.5
                };
                $("#jQuerySpinner1").spinner(jQuerySpinner1Opts);

                $("#jqb1").button();$("#jqb2").button();$("#jqb3").button();$("#jqb4").button();$("#jqb5").button();
                $("#jqb6").button();$("#jqb7").button();$("#jqb8").button();$("#jqb9").button();$("#jqb10").button();
                $("#jqb11").button();$("#jqb12").button();$("#jqb13").button();$("#jqb14").button();$("#jqb15").button();
                $("#jqb16").button();$("#jqb17").button();$("#jqb18").button();$("#jqb19").button();$("#jqb20").button();
                $("#jqb21").button();$("#jqb22").button();$("#jqb23").button();$("#jqb24").button();$("#jqb25").button();
                $("#jqb26").button();$("#jqb27").button();$("#jqb28").button();$("#jqb29").button();$("#jqb30").button();
                $("#jqb31").button();

                $("#jqbmonday").button();
                $("#jqbtuesday").button();
                $("#jqbwednesday").button();
                $("#jqbthursday").button();
                $("#jqbfriday").button();
                $("#jqbsaturday").button();
                $("#jqbsunday").button();

                $("#jqbjan").button();
                $("#jqbfeb").button();
                $("#jqbmar").button();
                $("#jqbapr").button();
                $("#jqbmay").button();
                $("#jqbjun").button();
                $("#jqbjul").button();
                $("#jqbaug").button();
                $("#jqbsep").button();
                $("#jqboct").button();
                $("#jqbnov").button();
                $("#jqbdec").button();

                $("#button_location").button();
                $("#button_script").button();
                $("#button_save").button();
                $("#button_submit").button();
                $("#button_delete").button();
                $("#button_cancel").button();

                $("#button_reset").button();

                $("#button_reset").click(function () {
                    $('#divTemperature').hide();
                    $('#divSpinner').hide();
                    $('#divSwitch').hide();
                    $('#div_Script').hide();
                    $("#divState_Generic").show();

                    $("#input_title").val("Title");
                    $("#input_location").val("Object");
                    $("#input_notes").val("Set some descriptive Notes...");
                    $("#switcher").prop("checked", false);
                    $("#checkbox_allday").prop("checked", false);
                    $('#jqdFrom').attr('disabled', false);
                    $('#jqdTo').attr('disabled', false);
                    $('#fromTime').attr('disabled', false);
                    $('#toTime').attr('disabled', false);
                    $('#fromampm').attr('disabled', false);
                    $('#toampm').attr('disabled', false);
                    $('#repeaterCombo').val('none');
                    $('#endCombo').val('never');
                    $('#endCombo').attr('disabled', true);

                    $('#numberoftimes').val(0);
                    $('#numberoftimes').hide();
                    $('#numberoftimes').attr('disabled', true);

                    $('#jqdEnd').val(new Date().toLocaleDateString());
                    $('#jqdEnd').hide();
                    $('#jqdEnd').attr('disabled', true);
                });

                $("#button_delete").click(function () {
                    var eventID = $('#eventID').val();
                    if (eventID != "-1") {
                        var localID = $('#calendar').fullCalendar('clientEvents', eventID);

                        $('#calendar').fullCalendar('removeEvents', eventID);
                        $('#calendar').fullCalendar('rerenderEvents');

                        parseEvents(localID[0], "delete", localID[0].IDID);

                        $("#event_Dialog").dialog('close');
                        $('#calendar').fullCalendar('rerenderEvents');
                    }
                });

                $("#button_cancel").click(function () {
                    $("#event_Dialog").dialog('close');
                });

                $('#button_location').click(function (event) {
                    $('#selectMultiple').hide();
                    $('#selectSingle').show();

                    dialogoptions = $("#dialog-form").dialog({
                        autoOpen: false,
                        height: 400,
                        width: 400,
                        modal: true,
                        closeOnEscape: false,
                        buttons: {
                            Cancel: function () {
                                dialogoptions.dialog("close");

                                if ($("#input_location").val() == "Object") {
                                    $("#divState_Generic").show();
                                }
                            }
                        },
                        close: function () {
                        }
                    });

                    var location = $("#input_location").val();
                    $.each( $('#allelement option'),function(i2, element2) {
                        if ($(element2).val() == location) {
                            $(element2).prop('selected',true);
                        } else {
                            $(element2).prop('selected',false);
                        }
                    });
                    $("#allelement").multiselect("refresh");

                    dialogoptions.dialog("open");
                    $("#divState_Generic").hide();
                });

                $("#button_save").click(function () {
                    //debugMessage();

                    var allEV = $("#calendar").fullCalendar('clientEvents');
                    var eventID = $('#eventID').val();
                    if (eventID != "-1" && eventID != undefined) {
                        // Edit Mode
                        $('#calendar').fullCalendar('removeEvents', eventID);
                        updateEvent(eventID);

                        var allEV = $("#calendar").fullCalendar('clientEvents');
                    } else {
                        eventID = "_" + Math.random().toString(36).replace(/[^a-z]+/g, '').substr(0, 10);
                        updateEvent(eventID);
                    }

                    var event  = $("#calendar").fullCalendar('clientEvents', eventID);

                    var thermostatArray = objects["system.adapter.occ.0"];
                    if (thermostatArray != undefined) {
                        var addr = event[0].IDID.split(".");
                        addr = addr[0]+"."+addr[1]+"."+addr[2];
                        var parent = objects[addr];
                        if (thermostatArray.native != undefined && thermostatArray.native.thermostat != undefined && thermostatArray.native.thermostat[parent.TYPE] == undefined) {
                            saveEventToObject(event[0], "save");
                        }
                    }

                    $('#calendar').fullCalendar('rerenderEvents');
                    $("#event_Dialog").dialog('close');
                    // TODO: Remove Function
                    //writeEventsToFile(event[0], event[0].IDID);
                });

                $("#button_submit").click(function () {
                    //debugMessage();

                    var allEV = $("#calendar").fullCalendar('clientEvents');
                    var eventID = $('#eventID').val();
                    //alert(eventID);
                    if (eventID != "-1") {
                        // Edit Mode
                        $('#calendar').fullCalendar('removeEvents', eventID);
                        updateEvent(eventID);

                        var allEV = $("#calendar").fullCalendar('clientEvents');
                    } else {
                        eventID = "_" + Math.random().toString(36).replace(/[^a-z]+/g, '').substr(0, 10);
                        updateEvent(eventID);
                    }

                    // Get all Events which have same IDID
                    var event  = $("#calendar").fullCalendar('clientEvents', eventID);
                    var obj = objects[eventID];
                    var IDID = event[0].IDID;
                    var array = new Array();

                    for (var i=0; i<allEV.length;i++) {
                        var tmpEvent = allEV[i];
                        if (tmpEvent.IDID == IDID) {
                            delete tmpEvent.source;
                            array.push(tmpEvent);
                        }
                    }
                    saveEventToObject(array, "submit");
                    // TODO: Remove Function
                    (event[0], event[0].IDID);
                    //writeEventsToFile
                    $("#event_Dialog").dialog('close');
                });

                $("#allelement").multiselect({
                    multiple: false,
                    header: "Select an option",
                    noneSelectedText: "Select an Option",
                    selectedList: 1,
                    click: function(event, ui){
                        dialogoptions.dialog( "close" );

                        var ID = ui.value;

                        var tmp = ui.value.replace(".",":");
                        tmp = tmp.split(":");
                        var parentID = tmp[0];

                        var res = objects[ID];
                        if (res != undefined) {
                            var type;
                            var role;

                            if (res && res.common) {
                                role = res.common.role;
                            }

                            if (res && res.native) {
                                type = res.native["PARENT_TYPE"];
                                console.log("ID == " + res['_id']);
                                if (type == undefined) {
                                    type = res.native["TypeName"];
                                }
                            }

                            var thermostatArray = objects["system.adapter.occ.0"];
                            if (thermostatArray != undefined) {
                                if (thermostatArray.native != undefined && thermostatArray.native.thermostat != undefined && thermostatArray.native.thermostat[event.IDTYPE] != undefined) {
                                    $("#button_submit").show();
                                    $("#divTemperature").show();
                                    $("#divSpinner").show();

                                    $('#checkbox_allday').attr('disabled', true);
                                    $('#repeaterCombo').val("none");
                                    $('#repeaterCombo').attr('disabled', true);
                                    $('#endCombo').attr('disabled', true);
                                    $('#numberoftimes').attr('disabled', true);
                                } else {
                                    $("#button_submit").hide();
                                    $("#divTemperature").hide();
                                    $("#divSpinner").hide();
                                    $("#div_Script").hide();
                                }
                            }

                            if (type == "VARDP") {
                                var valueType = res.native["ValueType"];
                                if (valueType == 2) {
                                    // checkbox
                                    $("#divState_2").show();
                                    $("#divState_16").hide();
                                    $("#divState_4").hide();
                                    $("#divState_20").hide();
                                } else if (valueType == 16) {
                                    // Listbox
                                    $("#divState_2").hide();
                                    $("#divState_16").show();
                                    $("#divState_4").hide();
                                    $("#divState_20").hide();
                                } else if (valueType == 4) {
                                    // Numbers
                                    $("#divState_2").hide();
                                    $("#divState_16").hide();
                                    $("#divState_4").show();
                                    $("#divState_20").hide();
                                } else if (valueType == 20) {
                                    // inputbox
                                    $("#divState_2").hide();
                                    $("#divState_16").hide();
                                    $("#divState_4").hide();
                                    $("#divState_20").show();
                                }
                            } else if (type == "ALARMDP") {
                                $("#divState_2").hide();
                                $("#divState_16").hide();
                                $("#divState_4").hide();
                                $("#divState_20").hide();
                                alert("ALARMDP Values cannot be set");
                            } else if (role == "switch") {
                                $("#divSwitch").show();
                            } else {
                                $("#divSwitch").hide();
                                $("#divState_Generic").show();
                            }

                            //alert(tmp[0]+"."+tmp[1]);
                            $("#IDID").val(tmp[0]+"."+tmp[1]);
                        }
                        $('#input_location').val(ui.text);
                    }
                });

                /*******************************************************************/
                // Calendar Functions
                $('#calendar').fullCalendar({
                    customButtons: {
                        customButton1: {
                            text: 'Refresh',
                            click: function () {
                                getData( function() {
                                    // Todo: set all marked allelements ID back
                                    // cause after reload, all are away
                                    var allElements = $('#allelements').val();

                                    allEvents = new Array();
                                    $('#allelements').multiselect("uncheckAll");

                                    readEventsFromObjects();
                                    var valArr = allElements;
                                    i = 0, size = valArr.length, $options = $('#allelements option');

                                    for(i; i < size; i++){
                                        $options.filter('[value="'+valArr[i]+'"]').prop('selected', true);

                                        $("#allelements").multiselect("widget").find(":checkbox[value='"+valArr[i]+"']").each(function() {
                                            this.click();
                                        });
                                    }
                                    $("#allelements").multiselect("refresh");
                                });
                            }
                        },
                        customButton2: {
                            text: 'Select Options',
                            click: function() {
                                $('#selectSingle').hide();
                                $('#selectMultiple').show();

                                dialogioptions = $( "#dialog-form" ).dialog({
                                    autoOpen: false,
                                    height: 335,
                                    width: 400,
                                    modal: true,
                                    buttons: {
                                        Reload: function() {
                                            getData( function() {
                                                // Todo: set all marked allelements ID back
                                                // cause after reload, all are away
                                                var allElements = $('#allelements').val();

                                                allEvents = new Array();
                                                $('#allelements').multiselect("uncheckAll");

                                                readEventsFromObjects();

                                                var valArr = allElements;
                                                i = 0, size = valArr.length, $options = $('#allelements option');

                                                for(i; i < size; i++){
                                                    $options.filter('[value="'+valArr[i]+'"]').prop('selected', true);

                                                    $("#allelements").multiselect("widget").find(":checkbox[value='"+valArr[i]+"']").each(function() {
                                                        this.click();
                                                    });
                                                }
                                                $("#allelements").multiselect("refresh");
                                            });
                                        },
                                        Close: function() {
                                            dialogioptions.dialog( "close" );
                                        }
                                    },
                                    Close: function() {
                                    }
                                });

                                dialogioptions.dialog( "open" );
                            }
                        },
                        customButton3: {
                            text: 'Upload',
                            color: 'red',
                            click: function () {
                                alert("Upload");
                            }
                        },
                    },
                    header: {
                        left: 'prev,next today customButton1,customButton2,customButton3',
                        center: 'title',
                        right: 'month,agendaWeek,agendaDay' // TODO: Generate customView
                    },
                    defaultView: 'agendaWeek',
                    editable: true,
                    eventLimit: true,
                    // allow "more" link when too many events
                    selectable: true,
                    selectHelper: true,
                    firstDay: 1,
                    timezone:'local',
                    // Select new Timerange = Create a new Planning Entry
                    select: function(start, end, allDay) {
                        // Set Default Values
                        $('#eventID').val( - 1);
                        $('#input_title').val("Title");
                        $('#input_location').val("Object");
                        $('#Checkbox2').attr('disabled', false);
                        hideFromTo(false);

                        $("#divTemperature").hide();
                        $("#divSpinner").hide();
                        $("#divSwitch").hide();

                        $("#divState_2").hide();
                        $("#divState_16").hide();
                        $("#divState_4").hide();
                        $("#divState_20").hide();

                        // Todo: Not yet supported
                        $('#repeaterCombo').val("none");
                        $('#checkbox_allday').attr('disabled', false);
                        $('#repeaterCombo').attr('disabled', false);

                        $('#jqdEnd').attr('disabled', true);
                        $('#jqdEnd').hide();
                        $('#numberoftimes').attr('disabled', true);
                        $('#endCombo').attr('disabled', true);
                        $('#endCombo').val('never');

                        $('#endCombo').show();
                        $('#span_end').show();
                        $('#numberoftimes').hide();

                        $("#button_submit").hide();

                        var m_begin = $.fullCalendar.moment(start);
                        var m_end = $.fullCalendar.moment(end);
                        var all_day = !m_begin.hasTime();

                        var day_begin = (m_begin.date());
                        var month_begin = (m_begin.months());
                        var year_begin = (m_begin.year());

                        var time_end = (m_end.hours() * 60 + m_end.minutes());
                        var day_end = (m_end.date());
                        var month_end = (m_end.months());
                        var year_end = (m_end.year());

                        var picker = $('#colorPicker').data("plugin_tinycolorpicker");
                        picker.setColor("#3A87AD");

                        if (all_day) {
                            $("#fromTime").val("00:00");
                            $("#toTime").val("23:59");
                            $("#checkbox_allday").prop('checked', true);
                            hideFromTo(true);
                        } else {
                            var hours = m_begin.hours();
                            var minute = m_begin.minutes();
                            if (m_begin.hours() < 10)
                                hours = '0' + m_begin.hours();
                            if (m_begin.minutes() < 10)
                                minute = '0' + m_begin.minutes();
                            $("#fromTime").val(hours + ":" + minute);

                            // Bugfix: set toampm and fromampm correct
                            if (hours < 12) {
                                $("#fromampm").val("AM");
                            } else {
                                $("#fromampm").val("PM");
                            }

                            hours = m_end.hours();
                            minute = m_end.minutes();
                            if (m_end.hours() < 10)
                                hours = '0' + m_end.hours();
                            if (m_end.minutes() < 10)
                                minute = '0' + m_end.minutes();
                            $("#toTime").val(hours + ":" + minute);
                            $("#checkbox_allday").prop('checked', false);
                            hideFromTo(false);

                            // Bugfix: set toampm and fromampm correct
                            if (hours < 12) {
                                $("#toampm").val("AM");
                            } else {
                                $("#toampm").val("PM");
                            }
                        }

                        $('#jqdFrom').datepicker("setDate", new Date(year_begin, month_begin, day_begin) );
                        $('#jqdTo').datepicker("setDate", new Date(year_end, month_end, day_end) );

                        $('#setTEMPERATURE').prop("checked", true);
                        //$('#setDECALCIFICATION');
                        $("#event_Dialog").dialog('open');
                    },
                    // Show Planning Entry with Assistent
                    eventClick: function(event) {
                        //alert(event._id + "---" + event.id);

                        if (event.editable == false) {
                            alert(event.tooltip);
                            return;
                        }

                        console.log(event);
                        // opens events in a popup window
                        var obj = objects[event.IDID];
                        if (obj.common.name !== undefined) {
                            $('#input_location').val(obj.common.name);
                        } else {
                            $('#input_location').val(obj._id);
                        }
                        $('#input_title').val(event.title);
                        $('#input_notes').val(event.notes);

                        $('#endCombo').val(event.endCombo);

                        if (event.endCombo == "never") {
                            $('#endCombo').attr('disabled', true);
                        } else {
                            $('#endCombo').attr('disabled', false);
                        }
                        $('#repeaterCombo').val(event.repeaterCombo);

                        showHideEndCombo($('#endCombo').val());

                        if (event.decalc) {
                            $('#setDECALCIFICATION').prop("checked", true);
                            $("#temperature_spinner").val("");
                            $("#jqdTo").hide();
                            $("#toTime").hide();
                            $("#toampm").hide();
                            $("#span_to").hide();
                        } else {
                            $('#setTEMPERATURE').prop("checked", true);
                            $("#temperature_spinner").val(event.temperature);
                            $("#jqdTo").show();
                            $("#toTime").show();
                            $("#toampm").show();
                            $("#span_to").show();
                        }
                        $('#eventID').val(event.id);

                        $("#IDID").val(event.IDID);

                        var thermostatArray = objects["system.adapter.occ.0"];

                        var localObject = objects[event.IDID];
                        var TYPE = localObject.native.TYPE;
                        $("#IDTYPE").val(TYPE);

                        // TODO: Check if Parent is a supported Thermostat
                        var elems = event.IDID.split(".");
                        var instance = elems[0] + "." + elems[1] + "." + elems[2];
                        var obj = objects[instance];
                        var oTYPE = obj.native.TYPE;

                        if (thermostatArray != undefined) {
                            if (thermostatArray.native != undefined && thermostatArray.native.thermostat != undefined && thermostatArray.native.thermostat[oTYPE] != undefined) {
                                $("#IDTYPE").val(oTYPE);
                                $("#button_submit").show();
                                $("#divTemperature").show();
                                $("#divSpinner").show();
                                $('#checkbox_allday').attr('disabled', true);
                                $('#repeaterCombo').attr('disabled', true);


                                $('#repeaterCombo').val("none");
                                $('#endCombo').attr('disabled', true);
                                $('#numberoftimes').attr('disabled', true);
                            } else {
                                $('#checkbox_allday').attr('disabled', false);
                                $('#repeaterCombo').attr('disabled', false);

                                $("#button_submit").hide();
                                $("#divTemperature").hide();
                                $("#divSpinner").hide();
                            }

                            $('#divState_Generic').hide();
                        }

                        var res = objects[event.IDID];
                        if (res != undefined && res.common && res.common.role && (res.common.role == "switch" || res.common.role == "state")) {
                            $("#divSwitch").show();
                        } else {
                            $("#divSwitch").hide();

                            if (event.state != undefined) {
                                $("#divState").show();
                            } else {
                                $("#divState").hide();
                            }
                        }

// Todo: Show VARDP from Google correct
                        if (event.IDTYPE == "VARDP") {
                            var typo = event.typo;
                            var valueType = event.valueType;

                            state = $("#state_input_20").val();
                            state = $("#state_input_2").prop('checked');
                            state = $("#state_input_4").val();
                            state = $("#state_input_16").val();

                            if (typo == "switch") {
                                $("#divTemperature").hide();
                                $("#divSpinner").hide();
                                $("#divSwitch").show();
                            } else if (typo == "temp") {
                                $("#divTemperature").show();
                                $("#divSpinner").show();
                                $("#divSwitch").hide();
                            } else if (typo == "state") {
                                $("#divState").show();
                            }
                            if (valueType == 2) {
                                // checkbox
                                $("#divState_2").show();

                                // Bugfix true | false comes as string so convert it to boolean
                                if (event.state == "true") {
                                    event.state = true;
                                } else if (event.state == "false") {
                                    event.state = false;
                                }
                                $("#state_input_2").prop("checked", event.state);
                                $("#divState_16").hide();
                                $("#divState_4").hide();
                                $("#divState_20").hide();
                            } else if (valueType == 16) {
                                // Listbox
                                $("#divState_2").hide();
                                $("#divState_16").show();
                                $("#state_input_16").val(event.state);
                                $("#divState_4").hide();
                                $("#divState_20").hide();
                            } else if (valueType == 4) {
                                // Numbers
                                $("#divState_2").hide();
                                $("#divState_16").hide();
                                $("#divState_4").show();
                                $("#state_input_4").val(event.state);
                                $("#divState_20").hide();
                            } else if (valueType == 20) {
                                // inputbox
                                $("#divState_2").hide();
                                $("#divState_16").hide();
                                $("#divState_4").hide();
                                $("#divState_20").show();
                                $("#state_input_20").val(event.state);
                            }
                        } else if (event.IDTYPE == "ALARMDP") {
                            $("#divState_2").hide();
                            $("#divState_16").hide();
                            $("#divState_4").hide();
                            $("#divState_20").hide();
                            alert("ALARMDP Values cannot be set");
                        }

                        // Set Values from event
                        //$('#checkbox_allday').attr('disabled', event.allDay);
                        $('#Checkbox2').attr('disabled', false);
                        hideFromTo(false);

                        var m_begin = $.fullCalendar.moment(event.start);
                        var m_end = $.fullCalendar.moment(event.end);
                        var all_day = event.allDay;
                        var day_begin = (m_begin.date());
                        var month_begin = (m_begin.months());
                        var year_begin = (m_begin.year());

                        var time_end = (m_end.hours() * 60 + m_end.minutes());
                        var day_end = (m_end.date());
                        var month_end = (m_end.months());
                        var year_end = (m_end.year());

                        var color = event.color;
                        var picker = $('#colorPicker').data("plugin_tinycolorpicker");
                        if (color == undefined) {
                            console.log("ERROR: No color defined within occ, using default Color!");
                            color = "#0391CE";
                        }
                        picker.setColor(color);

                        if (all_day) {
                            $("#fromTime").val("00:00");
                            $("#toTime").val("23:59");
                            $("#checkbox_allday").prop('checked', true);
                            hideFromTo(true);
                        } else {
                            var hours = m_begin.hours();
                            var minute = m_begin.minutes();
                            if (m_begin.hours() < 10)
                                hours = '0' + m_begin.hours();
                            if (m_begin.minutes() < 10)
                                minute = '0' + m_begin.minutes();
                            $("#fromTime").val(hours + ":" + minute);

                            // Bugfix: set toampm and fromampm correct
                            if (hours < 12) {
                                $("#fromampm").val("AM");
                            } else {
                                $("#fromampm").val("PM");
                            }

                            hours = m_end.hours();
                            minute = m_end.minutes();
                            if (m_end.hours() < 10)
                                hours = '0' + m_end.hours();
                            if (m_end.minutes() < 10)
                                minute = '0' + m_end.minutes();
                            $("#toTime").val(hours + ":" + minute);

                            // Bugfix: set toampm and fromampm correct
                            if (hours < 12) {
                                $("#toampm").val("AM");
                            } else {
                                $("#toampm").val("PM");
                            }

                        }

                        event.color = $('#colorPicker').data("plugin_tinycolorpicker").colorHex;

                        $('#jqdFrom').datepicker("setDate", new Date(year_begin, month_begin, day_begin) );
                        $('#jqdTo').datepicker("setDate", new Date(year_end, month_end, day_end) );

                        if (document.getElementById('event_Dialog').style.display == '') {
                            $("#event_Dialog").dialog('open');
                        } else {
                            $("#event_Dialog").dialog('close');
                        }
                        return false;
                    },
                    // Loading Function, not yet implemented
                    loading: function(bool) {
                        //alert("Loading " + bool);
                    },
                    // Event rendering Function, not yet implemented
                    eventRender: function(event, element, view) {
                        //alert("Render " + event.title + " View " + view + " Element" + element);
                        element.attr('title', event.tooltip);
                    },
                    // Event drop Function, is also called on move of a plan not yet implemented
                    eventDrop: function(event, delta) {
                        alert("Drop " + event.title);
                        var s = new Date(event.start);
                        var e = new Date(event.end);
                        //alert("IDID = " + event.IDID + "ID: " + event._id + " - Start: " + s.toLocaleDateString() + " " + s.toLocaleTimeString() + ", End: " + e.toLocaleDateString() + " " + e.toLocaleTimeString());

                        var allEV = $("#calendar").fullCalendar('clientEvents');
                        var eventID = event._id;

                        var thermostatArray = objects["system.adapter.occ.0"];
                        if (thermostatArray != undefined) {
                            if (thermostatArray.native != undefined && thermostatArray.native.thermostat != undefined && thermostatArray.native.thermostat[event.IDTYPE] == undefined) {
                                saveEventToObject(event, "save");
                            }
                        }

                        $('#calendar').fullCalendar('rerenderEvents');
                        // TODO: Remove Function
                        //writeEventsToFile(event, event.IDID);

                    },
                    eventResize: function(event) {
                        alert("Resize " + event.title);
                        $( "#button_save" ).trigger( "click" );
                    },
                    viewRender: function(view, element) {
                        // TODO: Check if all Events are loaded and displayed
                        // BUG: Objects not viewed for the first time in View Month
                        // Description: Calendar is started for first time in View Week
                        //              Select Items from "Select options"
                        //              Switch to View Month
                        // Workaround:  rerender Events every switch of View

                        //alert('new view: ' + view.name);
                        if (allEvents == "") {
                            //alert("No Events loaded");
                        } else {
                            $('#calendar').fullCalendar('rerenderEvents');
                        }
                    },
                    events: function(start, end, timezone, callback) {
                        // Todo: only Parse Events from actual View (month, week, day)
                        if (allEvents == "") {
                            //alert("Startup...");
                            // No longer needed, get Events from ioBroker Objects
                            readEventsFromObjects();
                        }
                    }
                });;

                $('#calendar').fullCalendar('rerenderEvents');
            });
        }
    });
});
