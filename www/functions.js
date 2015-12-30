function nextDay(d, dow){
    d.setDate(d.getDate() + (dow+(7-d.getDay())) % 7);
    return d;
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
        for (var object in objects) {
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

    /* Not Supported
    var glob_option = $("<option></option>");
    glob_option.val("Script");
    glob_option.text("Script");
    glob_optgroup.append(glob_option);
     */

    var glob_option = $("<option></option>");
    glob_option.val("Thermostat");
    glob_option.text("Thermostat");
    glob_optgroup.append(glob_option);

    /* Not Supported
    var glob_option = $("<option></option>");
    glob_option.val("Variable");
    glob_option.text("Variable");
    glob_optgroup.append(glob_option);
    */

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
                                    // TODO: Remove .update
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
                    objName = array[2] + '.' + array[3];

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

function saveEventToObject(event, flag, save_timestamp) {
    /* Todo: Cyclic Object */
    delete event.source;
    var fileName;
    var id;
    var title;
    var objectName;
    var timestamp;

    var stateObj;

    // Only exists if event is an array
    // TODO: Check, this can cause only for Homematic Thermostat and Submit Button
    if (event.IDID == undefined) {
        if (event.length > 0) {

            var e = event[0];
            fileName = e.IDID;
            id = e.id;
            title = e.title;
            timestamp = e.start.unix();
            objectName = 'occ.0.'+fileName+".dummy";

            stateObj = {
                common: {
                    name:  objectName,
                    read:  true,
                    write: true,
                    type: 'state',
                    role: 'meta.config',
                    update: true,
                    eventState: flag
                },
                native: event,
                type:   'state'
            };

            //servConn._socket.emit('setState', 'occ.0.' + fileName + ".update", {val: flag, ack: true});
            servConn._socket.emit('setObject', objectName, stateObj);

            //console.log("setState for " + 'occ.0.' + fileName + ".update" + " state = " + flag);
            console.log("setObject for " + objectName);
        }
    } else {
        fileName = event.IDID;
        id = event.id;
        title = event.title;
        if (flag == "delete" && event.end._i != undefined) {
            timestamp = Date.parse(event.start._i) / 1000;
        } else {
            timestamp = event.start.unix();
        }

        if (save_timestamp) {
            objectName = 'occ.0.' + fileName + "." + title + "_#" + timestamp + "#";
        } else {
            objectName = 'occ.0.'+fileName+"."+title;
        }

        stateObj = {
            common: {
                name: objectName,
                read: true,
                write: true,
                type: 'state',
                role: 'meta.config',
                update: true,
                eventState: flag
            },
            native: event,
            type: 'state'
        };

        if (fileName == "undefined" || fileName == undefined) {
            alert("Failure");
        }

        //servConn._socket.emit('setState', 'occ.0.' + fileName + ".update", {val: flag, ack: true});
        servConn._socket.emit('setObject', objectName, stateObj);

        //console.log("setState for " + 'occ.0.' + fileName + ".update" + " state = " + flag);
        console.log("setObject for " + objectName);
    }
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
            saveEventToObject(jsonEvent, "delete", true);
        }
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
        $('#jqdEnd').attr('disabled', true).hide();
        //$('#jqdEnd').hide();
        $('#numberoftimes').attr('disabled', true).hide();
        //$('#numberoftimes').hide();
    } else if (element == 'times') {
        $('#jqdEnd').attr('disabled', true).hide();
        //$('#jqdEnd').hide();
        $('#numberoftimes').attr('disabled', false).show();
        //$('#numberoftimes').show();
    } else if (element == 'date') {
        $('#jqdEnd').attr('disabled', false).show();
        //$('#jqdEnd').show();
        $('#numberoftimes').attr('disabled', true).hide();
        //$('#numberoftimes').hide();
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

        event.VARDP = Boolean($('#VARDP').val());
        if (event.VARDP === false) {
            event.temperature = temperature;
            event.switcher = switcher;
            event.state = state;
            event.decalc = decalc;
        }
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
    var endCombo = ev.endCombo;
    var numberoftimes = ev.numberoftimes;
    var repeaterCombo = ev.repeaterCombo;

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

        event.numberoftimes = numberoftimes;
        event.endCombo = endCombo;
        event.repeaterCombo = repeaterCombo;

        event.IDID = IDID;
        if (ev.iCal) {
            event.iCal = ev.iCal;
        }

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
        // updatePrivateFields(event); Only when creating from HTML
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
            var days;
            if ($("#repeaterCombo").val() == "day") {
                // Create events until End $("#endCombo").val() + " " + $("#jqdEnd").val()
                days = (repeatEnd - startDate) / 1000 / 60 / 60 / 24;
                createEventFromHTML(days, "day", eventID);
            } else if ($("#repeaterCombo").val() == "week") {
                days = (repeatEnd - startDate) / 1000 / 60 / 60 / 24 / 7;
                createEventFromHTML(days, "week", eventID);
            } else if ($("#repeaterCombo").val() == "month") {
                days = (repeatEnd.getMonth() - startDate.getMonth());
                createEventFromHTML(days, "month", eventID);
            } else if ($("#repeaterCombo").val() == "year") {
                days = (repeatEnd.getYear() - startDate.getYear());
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
