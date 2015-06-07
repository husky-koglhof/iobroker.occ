var allEvents = "";
var progval = 0;
var progressbar = $( "#progressbar" );
var eventSources = new Array();
var dialogoptions, dialogioptions;

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
            // Todo: save Objects with same section too
            var section = value.section;
            section = section.replace(":",".");

            n = section.search(eventID);
            if (n >= 0) {
                //alert("save object cause of section name");
                events.push(value);
            }
        }
    }
    if (events.length == 0) {
        events.push(event);
    }

    var jstrng = JSON.stringify(events);
    console.log(jstrng);

    servConn.writeFile('occ-events_'+eventID+'.json', jstrng, function () {
        console.log("file was written with" + JSON.stringify(jstrng));
    });
}

function readEventsFromFile() {
    // Todo: Parse all Default Events
    servConn.readFile('occ-events_Object.json', function (err, data) {
        if (err) {
            alert('occ-events.json: ' + err);
        } else {
            allEvents = data;
            parseEvents(data, true, null);
        }
    });

    servConn._socket.emit('getObjectView', 'system', 'enum', {startkey: 'enum.occ', endkey: 'enum.occ\u9999'}, function (err, res) {
        progressbar.progressbar( "value" , progval+1);
        if (err) {
            callback(err);
            progressbar.progressbar( "value" , 100);
            return;
        }
        var result = {};
        $("#allelement").children().remove("optgroup");
        $("#allelements").children().remove("optgroup");
        for (var i = 0; i < res.rows.length; i++) {
            console.log("RES: " + res.rows[i].id);
            servConn._socket.emit('getObject', res.rows[i].id, function (err, obj) {
                progressbar.progressbar( "value" , progval+1);
                var optgroup = $('<optgroup>');

                $("#allelements").multiselect({
                        click: function(event, ui){
                            if (ui.checked) {
                                servConn.readFile('occ-events_'+ui.value+'.json', function (err, data) {
                                    if (err) {
                                        alert('occ-events_'+ui.value+'.json: ' + err);
                                    } else {
                                        allEvents = data;
                                        parseEvents(data, true, ui.value);
                                    }
                                });

                            } else {
                                parseEvents(null, "delete", ui.value);
                            }
                        },
                        selectedText: function(numChecked, numTotal, checkedItems){
                            //$( "#dialog" ).dialog( "open" );
                            var allItems = checkedItems;
                            var values = $.map(checkedItems, function(checkbox){
                                servConn.readFile('occ-events_'+checkbox.value+'.json', function (err, data) {
                                    if (err) {
                                        alert('occ-events_'+checkbox.value+'.json: ' + err);
                                    } else {
                                        allEvents = data;
                                        parseEvents(data, true, checkbox.value);
                                    }
                                });

                            });
                        },
                        uncheckAll: function(){
                            $('#calendar').fullCalendar('removeEvents');
                            eventSources = new Array();
                        },
                        optgrouptoggle: function(event, ui){
                            if (ui.checked == false) {
                                $('#calendar').fullCalendar('removeEvents');
                                eventSources = new Array();
                            }
                        }
                }).multiselectfilter();
                for (var x in obj) {
                    progressbar.progressbar( "value" , progval+1);
                    console.log("RES1: " + JSON.stringify(obj[x]));
                    var object = obj[x];

                    optgroup.attr('label',object['name']);

                    if (typeof obj[x].members != 'undefined') {
                        console.log("MEMBERS: " + obj[x].members);
                        for (var m in obj[x].members) {
                            var option = $("<option></option>");
                            var objName = obj[x].members[m];

                            // Todo: objName has instance name included (hm-rpc.0.JEQ0225305.2)
                            var array = objName.split(".");
                            objName = array[2]+'.'+array[3];

                            //option.text(objName);
                            option.val(objName);
                            option.text(obj[x].members[m]);
                            optgroup.append(option);

                            console.log("OBJECT: " + obj[x].members[m]);
                        }
                    }
                }

                $("#allelement").append(optgroup);
                $('#allelement').multiselect( 'refresh' );
                $("#allelements").append(optgroup.clone());
                $('#allelements').multiselect( 'refresh' );
            });
        }
    });
}

function saveEventToObject(event, flag) {
    /* Todo: Cyclic Object */
    delete event.source;

    servConn._socket.emit('setState', 'occ.0.'+event.section+"###"+flag, {
        val: event,
        ack: true
    }, function (res, err) {
        console.log("result: " + res);
        console.log("error: " + err);
    });

}

function parseEvents(jsonEvent, flag, objectID) {
    if (flag == true) {

        //TODO: generate Objects for repeating Events
        console.log(jsonEvent);
        var jsonData = JSON.parse(jsonEvent);
        var arr = new Array();

        for (var i = 0; i < jsonData.length; i++) {
            var ev = jsonData[i];

            var repeating = ev.repeater;
            if (repeating) {
                //alert(ev.repeater);
            }
            var m = $.fullCalendar.moment(ev.start);

            var dt = new Date(m.format());
            dt.setHours = dt.getHours + 2;
            ev.start = dt;

            m = $.fullCalendar.moment(ev.end);
            dt = new Date(m.format());
            dt.setHours = dt.getHours + 2;
            ev.end = dt;

            arr[i] = ev;
            // $('#calendar').fullCalendar('renderEvent', ev);
            console.log(ev.id);
        }
        eventSources[objectID] = arr;
        $('#calendar').fullCalendar('removeEvents');
        //$('#calendar').fullCalendar('addEventSource', eventSources[objectID]);

        // Todo: render all known Events from eventSources
        for (var key in eventSources) {
            var value = eventSources[key];
            $('#calendar').fullCalendar('addEventSource', value);
        }

        $('#calendar').fullCalendar('rerenderEvents');

        console.log("----------------> "+objectID);
    } else if (flag == "delete") {
        // Get All Objects with this objectID / section
        var eventsFromCalendar = $('#calendar').fullCalendar('clientEvents');
        var localID = objectID.replace(".",":");
        var localEvents = [];
        for (var i = 0; i < eventsFromCalendar.length; i++) {
            var localEvent =  eventsFromCalendar[i];
            if (localEvent.section == localID) {
                localEvents.push(localEvent);
            }
        }

        $('#calendar').fullCalendar('removeEventSource', localEvents);
        $('#calendar').fullCalendar('rerenderEvents');
        $('#calendar').fullCalendar( 'refetchEvents' );

        if (jsonEvent != undefined) {
            writeEventsToFile(null, objectID);
            saveEventToObject(jsonEvent, "delete");
        }
        console.log("DELETE: "+objectID);
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

                    // DUMMY, Only Create Objects for the actual week
                    var today = new Date();
                    var n = today.getDay() - 1;

                    var monday = new Date(year, month, day - n, hours, minutes);
                    // CHECK if start begins at midnight
                    if (parseInt(minutes) + parseInt(hours) > 0 && i == 1) {
                        // Create Object from midnight until first event
                        event.start = new Date(year, month, day - n + parseInt(weekday), 0, 0);
                        event.end = new Date(year, month, day - n + parseInt(weekday), hours, minutes);
                        // DUMMY END
                        var x = parseInt(i) - 1;

                        var tempn = "TEMPERATUR_" + weekDays[weekday] + "_" + x;
                        var temperature = jsonData[tempName];
                        event.title = tempn;
                        event.section = "TIMEOUT_" + weekDays[weekday] + "_" + x;
                        event.color = "#3A87AD";
                        event.allDay = false;
                        event.id = event.title;
                        event.editable = true;
                        event.startEditable = true;
                        event.durationEditable = true;
                        //event.notes = temperature;
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
                    event.section = timeName;
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
        $('#jqdEnd').show();
        $('#numberoftimes').attr('disabled', false);
        $('#numberoftimes').hide();
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

    if (element == "none") {
        $('#repeaterTab').hide();
        //$('#event_Dialog').dialog( 'option', 'width', 345 );
        //$('#event_Dialog').dialog( 'option', 'height', 690 );
        $('#event_Dialog').dialog( 'option', 'width', 355 );

        checked = false;
        $('#endCombo').attr('disabled', true);
    } else if (element == "custom") {
        $('#repeaterTab').show();
        $('#event_Dialog').dialog( 'option', 'width', 690 );
        checked = false;
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

    $('#jqdTo').attr('disabled', checked);
    $('#toTime').attr('disabled', checked);
    $('#toampm').attr('disabled', checked);
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
    /*
     function progress() {
     // TODO: Check if all Subprocesses from socket.io already returned
     var val = progressbar.progressbar( "value" ) || 0;

     progressbar.progressbar( "value", val + Math.floor( Math.random() * 3 ) );

     if ( val < 90 ) {
     progressTimer = setTimeout( progress, 50 );
     } else if (val >= 90 && val < 99) {
     progressTimer = setTimeout ( progress, 500 );
     } else {
     //clearTimeout( progressTimer );
     }
     }
     */

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
    $( "#select_options" ).button().on( "click", function() {
        $('#selectSingle').hide();
        $('#selectMultiple').show();

        dialogioptions = $( "#dialog-form" ).dialog({
            autoOpen: false,
            height: 335,
            width: 400,
            modal: true,
            buttons: {
                Reload: function() {
                    readEventsFromFile();
                    // Todo: set all marked allelements ID back
                    // cause after reload, all are away
                    var allElements = $('#allelements').val();

                    allEvents = new Array();
                    $('#allelements').multiselect("uncheckAll");

                    var valArr = allElements;
                    i = 0, size = valArr.length, $options = $('#allelements option');

                    for(i; i < size; i++){
                        //alert($options.filter('[value="'+valArr[i]+'"]').prop('selected'));
                        //alert($options.filter('[value="'+valArr[i]+'"]').val());

                        $options.filter('[value="'+valArr[i]+'"]').prop('selected', true);
                    }
                    $("#allelements").multiselect("refresh");

                    //dialogioptions.dialog( "close" );
                },
                Close: function() {
                    dialogioptions.dialog( "close" );
                }
            },
            close: function() {
            }
        });

        dialogioptions.dialog( "open" );
    });
});


function putParamsets(objectID, params) {
    rpcClient.methodCall('putParamset', [rpcInitString, adapter.namespace], [objectID, 'MASTER', params], function (err, data) {
        if (!err) {
            adapter.log.info("getParamset was successfull");
            adapter.log.info(JSON.stringify(data));
        } else {
            adapter.log.error(err);
        }
    });
}

$(document).ready(function() {
    // Todo: Open Progressbar onLoad
    //dialog.dialog( "open" );
    //progressbar.progressbar( "value" , progval+1);

    servConn.init(null, {
        onConnChange: function (isConnected) {
            progressbar.progressbar("value", progval + 1);
            if (isConnected) {
                progressbar.progressbar("value", progval + 1);
            }
            console.log("onConnChange isConnected=" + isConnected);
        }
    });

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

    $("#jqb1").button();
    $("#jqb2").button();
    $("#jqb3").button();
    $("#jqb4").button();
    $("#jqb5").button();
    $("#jqb6").button();
    $("#jqb7").button();
    $("#jqb8").button();
    $("#jqb9").button();
    $("#jqb10").button();
    $("#jqb11").button();
    $("#jqb12").button();
    $("#jqb13").button();
    $("#jqb14").button();
    $("#jqb15").button();
    $("#jqb16").button();
    $("#jqb17").button();
    $("#jqb18").button();
    $("#jqb19").button();
    $("#jqb20").button();
    $("#jqb21").button();
    $("#jqb22").button();
    $("#jqb23").button();
    $("#jqb24").button();
    $("#jqb25").button();
    $("#jqb26").button();
    $("#jqb27").button();
    $("#jqb28").button();
    $("#jqb29").button();
    $("#jqb30").button();
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

    $("#button_delete").click(function () {
        var eventID = $('#eventID').val();
        if (eventID != "-1") {
            var localID = $('#calendar').fullCalendar('clientEvents', eventID);

            $('#calendar').fullCalendar('removeEvents', eventID);
            $('#calendar').fullCalendar('rerenderEvents');

            parseEvents(localID[0], "delete", localID[0].section);

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
            buttons: {
                Cancel: function () {
                    dialogoptions.dialog("close");
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

    });

    $("#button_save").click(function () {
        //debugMessage();

        var allEV = $("#calendar").fullCalendar('clientEvents');
        var eventID = $('#eventID').val();
        //alert("save eventID: "+eventID);
        if (eventID != "-1") {
            // Edit Mode
            $('#calendar').fullCalendar('removeEvents', eventID);
            updateEvent(eventID);

            var allEV = $("#calendar").fullCalendar('clientEvents');
        } else {
            eventID = "_" + Math.random().toString(36).replace(/[^a-z]+/g, '').substr(0, 10);
            updateEvent(eventID);
        }

        var event  = $("#calendar").fullCalendar('clientEvents', eventID);
        /* TODO: HM-CC-TC, HM-CC-RT-DN and Max! can only save one Week */
        if (event[0].IDTYPE != "HM-CC-TC" && event[0].IDTYPE != "HM-CC-RT-DN" && event[0].type != "BC-RT-TRX-CyG-3" ) {
            saveEventToObject(event[0], "save");
        }

        $('#calendar').fullCalendar('rerenderEvents');
        $("#event_Dialog").dialog('close');
        writeEventsToFile(event[0], event[0].section);
    });

    $("#button_submit").click(function () {
        //debugMessage();

        var allEV = $("#calendar").fullCalendar('clientEvents');
        var eventID = $('#eventID').val();

        if (eventID != "-1") {
            // Edit Mode
            $('#calendar').fullCalendar('removeEvents', eventID);
            updateEvent(eventID);

            var allEV = $("#calendar").fullCalendar('clientEvents');
        } else {
            eventID = "_" + Math.random().toString(36).replace(/[^a-z]+/g, '').substr(0, 10);
            updateEvent(eventID);
        }

        // Get all Events which have same section
        var event  = $("#calendar").fullCalendar('clientEvents', eventID);
        var section = event[0].section;
        var array = new Array();

        for (var i=0; i<allEV.length;i++) {
            var tmpEvent = allEV[i];
            if (tmpEvent.section == section) {
                delete tmpEvent.source;
                array.push(tmpEvent);
            }
        }
        /* TODO: HM-CC-TC, HM-CC-RT-DN and Max! can only save one Week */
        //if (event[0].IDTYPE == "HM-CC-TC" || event[0].IDTYPE == "HM-CC-RT-DN" || event[0].type == "BC-RT-TRX-CyG-3" ) {
            saveEventToObject(array, "submit");
        //}
        writeEventsToFile(event[0], event[0].section);

        $("#event_Dialog").dialog('close');
    });

    function createEvent(days, type, eventID) {
        /* TODO: This doesn't work
        if (eventID == - 1) {
            event.start = dateStart; // its a date string
            event.end = dateEnd; // its a date string.
        }
        */

        var subject = $("#input_title").val(); //the title of the event
        var section = $("#input_location").val(); //the section of the event
        var notes = $("#input_notes").val();

        var temperature = $("#temperature_spinner").val();
        var switcher = $("#switcher").prop('checked');

        var IDID = $("#IDID").val();
        var IDPARENT = $("#IDPARENT").val();
        var IDTYPE = $("#IDTYPE").val();

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
                var newStart = new Date(yx, mx, dx, hx, mmx);
            } else if (type == "day") {
                var newStart = new Date(datum.getTime() + i * 24 * 60 * 60 * 1000);
            } else if (type == "week") {
                var newStart = new Date(datum.getTime() + i * 24 * 60 * 60 * 1000 * 7);
            } else if (type == "year") {
                var yx = datum.getYear() + 1900 + i;
                var mx = datum.getMonth();
                var dx = datum.getDate();
                var mmx = datum.getMinutes();
                var hx = datum.getHours();
                var newStart = new Date(yx, mx, dx, hx, mmx);
            } else if (type == "single") {
                var newStart = dateStart;
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
                /* BugFix: set Month correctly */
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

            //alert(dateStart + "---" + newStart + "---" + newEnd);
            // New Event 
            event = new Object();
            event.title = subject;
            event.section = section;
            event.start = newStart; // its a date string 
            event.end = newEnd; // its a date string. 
            event.color = color;
            event.allDay = allDay;
            event.id = eventID;
            event.notes = notes;
            event.temperature = temperature;
            event.switcher = switcher;

            event.IDID = IDID;
            event.IDTYPE = IDTYPE;
            event.IDPARENT = IDPARENT;

            var editable;
            // alert(i); 
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

        if ($("#endCombo").val() == "times") {
            createEvent($('#numberoftimes').val(), $("#repeaterCombo").val(), eventID);
        } else if ($("#endCombo").val() == "date") {
            if ($("#repeaterCombo").val() == "day") {
                // Create events until End $("#endCombo").val() + " " + $("#jqdEnd").val()
                var days = (repeatEnd - startDate) / 1000 / 60 / 60 / 24;
                createEvent(days, "day", eventID);
            }
        } else {
            createEvent(0, "single", eventID);
        }
    }

    function updatePrivateFields(event) {
        event.numberoftimes = $("#numberoftimes").val();
        event.repeaterCombo = $("#repeaterCombo").val();
        event.endCombo = $("#endCombo").val();
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

    /*******************************************************************/
    // Calendar Functions
    $('#calendar').fullCalendar({
        header: {
            left: 'prev,next today',
            center: 'title',
            right: 'month,agendaWeek,agendaDay'
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

            // Todo: Not yet supported
            // $('#repeaterCombo').val("none");
            // $('#checkbox_allday').attr('disabled', false);
            $('#checkbox_allday').attr('disabled', true);
            $('#repeaterCombo').val("none");
            $('#repeaterCombo').attr('disabled', true);
            $('#endCombo').attr('disabled', true);
            $('#numberoftimes').attr('disabled', true);

            $("#button_submit").hide();

            $('#endCombo').val("never");
            $('#endCombo').attr('disabled', true);
            $('#numberoftimes').val("0");
            $('#numberoftimes').attr('disabled', true);
            $('#numberoftimes').hide();

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

                hours = m_end.hours();
                minute = m_end.minutes();
                if (m_end.hours() < 10)
                    hours = '0' + m_end.hours();
                if (m_end.minutes() < 10)
                    minute = '0' + m_end.minutes();
                $("#toTime").val(hours + ":" + minute);
                $("#checkbox_allday").prop('checked', false);
                hideFromTo(false);
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

            // opens events in a popup window
            $('#input_location').val(event.section);
            $('#input_title').val(event.title);
            $('#input_notes').val(event.notes);
            $("#temperature_spinner").val(event.temperature);

            $('#eventID').val(event.id);

            $("#IDID").val(event.IDID);
            $("#IDPARENT").val(event.IDPARENT);
            $("#IDTYPE").val(event.IDTYPE);

            if (event.IDTYPE == "HM-CC-TC" || event.IDTYPE == "HM-CC-RT-DN" || event.IDTYPE == "BC-RT-TRX-CyG-3") {
                $("#button_submit").show();
                $("#divTemperature").show();
                $("#divSpinner").show();
            } else {
                $("#button_submit").hide();
                $("#divTemperature").hide();
                $("#divSpinner").hide();
            }

            if (event.IDTYPE == "HM-LC-Sw2-FM" || event.IDTYPE == "HM-LC-Sw4-DR") {
                $("#divSwitch").show();
            } else {
                $("#divSwitch").hide();
            }
            // Set Values from event
            //$('#checkbox_allday').attr('disabled', event.allDay);
            $('#Checkbox2').attr('disabled', false);
            hideFromTo(false);

            if (event.endCombo == undefined) {
                $('#endCombo').val("never");
                $('#endCombo').attr('disabled', true);
            } else {
                $('#endCombo').val(event.endCombo);
                $('#endCombo').attr('disabled', false);
            }
            if (event.numberoftimes == undefined) {
                $('#numberoftimes').attr('disabled', true);
                $('#numberoftimes').hide();
                $('#numberoftimes').val("0");
            } else {
                $('#numberoftimes').attr('disabled', false);
                $('#numberoftimes').show();
                $('#numberoftimes').val(event.numberoftimes);
            }

            // Todo: Not yet supported
            // $('#repeaterCombo').val(event.repeaterCombo);
            $('#repeaterCombo').val("none");
            $('#repeaterCombo').attr('disabled', true);
            $('#endCombo').attr('disabled', true);
            $('#numberoftimes').attr('disabled', true);
            $('#checkbox_allday').attr('disabled', true);

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

                hours = m_end.hours();
                minute = m_end.minutes();
                if (m_end.hours() < 10)
                    hours = '0' + m_end.hours();
                if (m_end.minutes() < 10)
                    minute = '0' + m_end.minutes();
                $("#toTime").val(hours + ":" + minute);
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
            //$('#loading').toggle(bool);
            //alert("Loading " + bool);
        },
        // Event rendering Function, not yet implemented
        eventRender: function(event, element, view) {
            // alert("Render " + event.title + " View " + view + " Element" + element);
            element.attr('title', event.tooltip);
        },
        // Event drop Function, is also called on move of a plan not yet implemented
        eventDrop: function(event, delta) {
            // alert("Drop " + event.title);
            // alert(delta);
            writeEventsToFile(event, event.section);
        },
        // Event Resize Function, not yet implemented
        eventResize: function(event) {
            // alert("Resize " + event.title);
            writeEventsToFile(event, event.section);
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
                alert("Startup...");
                readEventsFromFile();
            }
        }
    });;

    $("#allelement").multiselect({
        multiple: false,
        header: "Select an option",
        noneSelectedText: "Select an Option",
        selectedList: 1,
        click: function(event, ui){
            dialogoptions.dialog( "close" );

            var objects = ui.value.split(".");
            console.log(objects.length);
            var ID = objects[objects.length-2] + "." + objects[objects.length-1];


            var tmp = ui.value.replace(".",":");
            tmp = tmp.split(":");

            var ID = ui.text.split(".");
            var parentID = ID[0]+"."+ID[1];
            ID = parentID+"."+tmp[0];

            servConn._socket.emit('getObject', ID, function (err, res) {
                var type;
                if (res && res.native) {
                    type = res.native["TYPE"];
                    console.log("ID == " + res['_id']);
                }
                if (type == "HM-CC-TC" || type == "HM-CC-RT-DN" || type == "BC-RT-TRX-CyG-3") {
                    $("#button_submit").show();
                    $("#divTemperature").show();
                    $("#divSpinner").show();
                } else {
                    $("#button_submit").hide();
                    $("#divTemperature").hide();
                    $("#divSpinner").hide();
                }

                if (type == "HM-LC-Sw2-FM" || type == "HM-LC-Sw4-DR") {
                    $("#divSwitch").show();
                } else {
                    $("#divSwitch").hide();
                }

                $("#IDTYPE").val(type);
                $("#IDID").val(tmp[0]+"."+tmp[1]);
                $("#IDPARENT").val(parentID);
            });

            $('#input_location').val(ui.value);
        }
    });
    $('#calendar').fullCalendar('rerenderEvents');
});