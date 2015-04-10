var socket;

function buildDeviceList(elem, current) {
    socket.emit('getObjectView', 'hm-rpc', 'listDevices', {startkey: 'hm-rpc.', endkey: 'hm-rpc.\u9999'}, function (err, res) {
        var line = "";
        if (!err && res) {
            for (var i = 0; i < res.rows.length; i++) {
                //{"id":"hm-rpc.0.LEQ1155931.1","value":{"ADDRESS":"LEQ1155931:1","VERSION":1}}
                if (res.rows[i].value.ADDRESS.indexOf(":") > -1) continue;
                if (res.rows[i].value.ADDRESS == "") continue;
                line += '<input type="radio" class="interface-set" name="iface_' + i + '" data-device-index="' + i + '" data-device="' + res.rows[i].value.ADDRESS + '" value="' + res.rows[i].value.ADDRESS + '">' + res.rows[i].value.ADDRESS + '<br>';
            }
            //alert(line);
            $('.allIDs').replaceWith(line);
        }
        $(elem).val(current);
    });
}

function makeSocketAvailable() {
// Show "no connection" message after 5 seconds
    var disconnectTimeout = setTimeout(function () {
        disconnectTimeout = null;
        //Show disconnected message
        $('#no-connection').show();
    }, 5000);

    var socketURL = ':8084';
    var socketSESSION = 'myPrivateKey';
    if (typeof socketUrl != 'undefined') {
        socketURL = socketUrl;
        if (socketURL && socketURL[0] == ':') {
            socketURL = 'http://' + location.hostname + socketURL;
        }
        socketSESSION = socketSession;
    }

    //var socket = io.connect(socketURL, {
    socket = io.connect(socketURL, {
        'query': 'key=' + socketSESSION,
        'reconnection limit': 10000,
        'max reconnection attempts': Infinity
    });

    socket.on('stateChange', function (changeId, state) {
        if (graph && config && config._ids) {
            for (j = 0; j < config._ids.length; j++) {
                if (config._ids[j] == changeId) {
                    seriesData[j].push({x: state.ts, y: state.val});
                    graph.update();
                    break;
                }
            }
        }
    });
    socket.on('connect', function () {
        socket.emit('name', 'occ');
        console.log('connect');
        if (disconnectTimeout) {
            $('#no-connection').hide();
            clearTimeout(disconnectTimeout);
            disconnectTimeout = null;
        }
    });
    socket.on('disconnect', function () {
        console.log('disconnect');
        if (!disconnectTimeout) {
            disconnectTimeout = setTimeout(function () {
                console.log('disconnected');
                disconnectTimeout = null;
                //Show disconnected message
                $('#no-connection').show();
            }, 5000);
        }
    });
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
    alert( "Title = "  +
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

$(document).ready(function() {
    var $box = $('#colorPicker');
    $box.tinycolorpicker();

    var event_DialogOpts =
    {
        width: 345,
        height: 490,
        position: { my: 'center', at: 'center', of: window },
        draggable: true,
        closeOnEscape: true,
        // autoOpen: true,
        autoOpen: false,
        resizable: false,
        open: function (event, ui) {$('#event_Dialog').css('overflow', 'hidden');}
    };
    $("#event_Dialog").dialog(event_DialogOpts);
    $("#event_Dialog").on( "dialogopen", $('#eventID').val(-1) );

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

    $("#jqb1").button();$("#jqb2").button();$("#jqb3").button();$("#jqb4").button();$("#jqb5").button();$("#jqb6").button();
    $("#jqb7").button();$("#jqb8").button();$("#jqb9").button();$("#jqb10").button();$("#jqb11").button();$("#jqb12").button();
    $("#jqb13").button();$("#jqb14").button();$("#jqb15").button();$("#jqb16").button();$("#jqb17").button();$("#jqb18").button();
    $("#jqb19").button();$("#jqb20").button();$("#jqb21").button();$("#jqb22").button();$("#jqb23").button();$("#jqb24").button();
    $("#jqb25").button();$("#jqb26").button();$("#jqb27").button();$("#jqb28").button();$("#jqb29").button();$("#jqb30").button();
    $("#jqb31").button();

    $("#jqbmonday").button();$("#jqbtuesday").button();$("#jqbwednesday").button();$("#jqbthursday").button();
    $("#jqbfriday").button();$("#jqbsaturday").button();$("#jqbsunday").button();

    $("#jqbjan").button();$("#jqbfeb").button();$("#jqbmar").button();$("#jqbapr").button();
    $("#jqbmay").button();$("#jqbjun").button();$("#jqbjul").button();$("#jqbaug").button();
    $("#jqbsep").button();$("#jqboct").button();$("#jqbnov").button();$("#jqbdec").button();

    $("#button_location").button();$("#button_script").button();
    $("#button_save").button();$("#button_delete").button();$("#button_cancel").button();

    $("#button_delete").click(function() {
        var eventID = $('#eventID').val();
alert("Delete Button: "  + eventID);
        if (eventID > 0) {
            $('#calendar').fullCalendar('removeEvents', eventID);
            $("#event_Dialog").dialog('close');
        }
    });

    $("#button_cancel").click(function() {
        $("#event_Dialog").dialog('close');
    });

    $('#button_location').click(function(event) {
alert($('#input_location').val());
        $('#calendarobject').hide();
        var id = $(this).attr('data-ids');

        $('#dialog-select-member').selectId('show', $('#input_location').val(), undefined, function (newId) {
            $('#input_location').val(newId);
        });
        $('#filter_ID_0').val('hm-rpc');
        $('#filter_role_0').val('level.temperature');
        $('.filter_0').change();
    });

    $("#button_save").click(function() {
        debugMessage();

        var subject = $("#input_title").val();  //the title of the event

        var dat = $("#jqdFrom").datepicker("getDate");
        var y = dat.getFullYear();
        var m = dat.getMonth();
        var d = dat.getDate();

        var fromTime = $("#fromTime").val();
        var times = fromTime.split(":");
        var hours = times[0];
        var minutes = times[1];

        var dateStart = new Date(y, m, d, hours, minutes);    //the day the event takes place

        dat = $("#jqdTo").datepicker("getDate");
        y = dat.getFullYear();
        m = dat.getMonth();
        d = dat.getDate();

        var toTime = $("#toTime").val();
        times = toTime.split(":");
        hours = times[0];
        minutes = times[1];

        var dateEnd = new Date(y, m, d, hours, minutes);    //the day the event finishes
        var allDay = $("#checkbox_allday").prop('checked'); //true: event all day, False:event from time to time
        var color = $('#colorPicker').data("plugin_tinycolorpicker").colorHex;

        var eventID = $('#eventID').val();
alert("Save Button: "  + eventID);
        if (eventID > 0) {
            // Edit Mode
alert("edit");
            event = $("#calendar").fullCalendar( 'clientEvents', eventID );

            event.title = subject;
            event.start = dateStart;    // its a date string
            event.end = dateEnd;        // its a date string.
            event.color = color;
            event.section = $("#input_location").val();
            event.id = eventID;
            event.allDay = allDay;
            $('#calendar').fullCalendar('removeEvents', eventID );
            $('#calendar').fullCalendar('renderEvent', event);
        } else {
            // New Event
alert("new");
            event = new Object();

            event.title = subject;
            event.start = dateStart;    // its a date string
            event.end = dateEnd;        // its a date string.
            event.color = color;
            event.id =  Math.floor((Math.random() * 1000000) + 1);
            event.allDay = allDay;
            $('#calendar').fullCalendar('renderEvent', event);
        }

        $("#event_Dialog").dialog('close');
    });
    /*******************************************************************/
    makeSocketAvailable();
    // Build Device List
    buildDeviceList();
    /*******************************************************************/
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
        eventLimit: true, // allow "more" link when too many events
        selectable: true,
        selectHelper: true,
        // Select new Timerange = Create a new Planning Entry
        select: function(start, end, allDay) {
            var m_begin = $.fullCalendar.moment(start);
            var m_end = $.fullCalendar.moment(end);
            var all_day = !m_begin.hasTime();
alert("select");
$('#eventID').val(-1);
            var time_begin = (m_begin.hours()*60+m_begin.minutes());
            var day_begin = (m_begin.date());
            var month_begin = (m_begin.months());
            var year_begin = (m_begin.years());

            var time_end = (m_end.hours()*60+m_end.minutes());
            var day_end = (m_end.date());
            var month_end = (m_end.months());
            var year_end = (m_end.years());

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
                if (m_begin.hours() < 10) hours = '0' + m_begin.hours();
                if (m_begin.minutes() < 10) minute = '0' + m_begin.minutes();
                $("#fromTime").val(hours + ":" + minute);

                hours = m_end.hours();
                minute = m_end.minutes();
                if (m_end.hours() < 10) hours = '0' + m_end.hours();
                if (m_end.minutes() < 10) minute = '0' + m_end.minutes();
                $("#toTime").val(hours + ":" + minute);
                $("#checkbox_allday").prop('checked', false);
                hideFromTo(false);
            }

            $('#jqdFrom').datepicker("setDate", new Date(year_begin,month_begin,day_begin) );
            $('#jqdTo').datepicker("setDate", new Date(year_end,month_end,day_end) );
            $("#event_Dialog").dialog('open');
        },
        // Show Planning Entry with Assistent
        eventClick: function(event) {
            // opens events in a popup window
            $('#input_location').val(event.section);
            $('#input_title').val(event.title);

            $('#eventID').val(event.id);
alert("ID = "  + event.id);

            var m_begin = $.fullCalendar.moment(event.start);
            var m_end = $.fullCalendar.moment(event.end);
            var all_day = event.allDay;
            var time_begin = (m_begin.hours()*60+m_begin.minutes());
            var day_begin = (m_begin.date());
            var month_begin = (m_begin.months());
            var year_begin = (m_begin.years());

            var time_end = (m_end.hours()*60+m_end.minutes());
            var day_end = (m_end.date());
            var month_end = (m_end.months());
            var year_end = (m_end.years());

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
                if (m_begin.hours() < 10) hours = '0' + m_begin.hours();
                if (m_begin.minutes() < 10) minute = '0' + m_begin.minutes();
                $("#fromTime").val(hours + ":" + minute);

                hours = m_end.hours();
                minute = m_end.minutes();
                if (m_end.hours() < 10) hours = '0' + m_end.hours();
                if (m_end.minutes() < 10) minute = '0' + m_end.minutes();
                $("#toTime").val(hours + ":" + minute);
            }

            event.color = $('#colorPicker').data("plugin_tinycolorpicker").colorHex;

            $('#jqdFrom').datepicker("setDate", new Date(year_begin,month_begin,day_begin) );
            $('#jqdTo').datepicker("setDate", new Date(year_end,month_end,day_end) );

            if (document.getElementById('event_Dialog').style.display == '') {
                $("#event_Dialog").dialog('open');
            } else {
                $("#event_Dialog").dialog('close');
            }
            return false;
        },
        // Loading Function, not yet implemented
        loading: function(bool) {
            $('#loading').toggle(bool);
        },
        // Event rendering Function, not yet implemented
        eventRender: function(event, element, view) {
            // alert("Render" + event.title);
        },
        // Event drop Function, is also called on move of a plan not yet implemented
        eventDrop: function(event, delta) {
            alert("Drop" + event.title);
        },
        // Event Resize Function, not yet implemented
        eventResize: function(event) {
            alert("Resize" + event.title);
        },
        // Create Events from Database / Filesystem, must be in JSON Format
        // events: "http://localhost:8888/fullcalendar/events.php",
        /*
         id=String/Integer. Optional
         title=String. Required.
         allDay=true or false. Optional.
         start=The date/time an event begins. Required.
         end=The exclusive date/time an event ends. Optional.
         url=String. Optional.
         className=String/Array. Optional.
         editable=true or false. Optional.
         startEditable=true or false. Optional.
         durationEditable=true or false. Optional.
         rendering=Allows alternate rendering of the event, like background events.
         overlap=true or false. Optional.
         constraint=an event ID, "businessHours", object. Optional.
         source=Event Source Object. Automatically populated.
         color=Sets an event's background and border color just like the calendar-wide eventColor option.
         backgroundColor=Sets an event's background color just like the calendar-wide eventBackgroundColor option.
         borderColor=Sets an event's border color just like the the calendar-wide eventBorderColor option.
         textColor=Sets an event's text color just like the calendar-wide eventTextColor option.

         ioBroker Objects
         section=holds Object from ioBroker (e.g. hm-rpc.0{name": "JEQ0221873"})
         */
    });

    var socketUrl = ":8084";
    var socketSession = "";

    $('#dialog-select-member').selectId('init', {
        filter: {
            common: {
                history: {
                    enabled: true
                }
            },
            id: 'hm-rpc',
            type: 'state'
        },
        connCfg: {
            socketUrl:     socketUrl,
            socketSession: socketSession,
            socketName:    'occ'
        },
        columns: ['name', 'role', 'room', 'value'],
        list: false,
        texts: {
            /*
             select:   _('Select'),
             cancel:   _('Cancel'),
             all:      _('All'),
             id:       _('ID'),
             name:     _('Name'),
             role:     _('Role'),
             room:     _('Room'),
             value:    _('Value'),
             selectid: _('Select ID'),
             from:     _('From'),
             lc:       _('Last changed'),
             ts:       _('Time stamp'),
             wait:     _('Processing...'),
             ack:      _('Acknowledged')
             */
        },
    });
});
