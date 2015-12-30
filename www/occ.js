var allEvents = "";
var dialogoptions, dialogioptions;
var states = {};
var objects = {};
var enums = [];

var params = {};
var viewParam = "none";
if (location.search) {
    var parts = location.search.substring(1).split('&');

    for (var i = 0; i < parts.length; i++) {
        var nv = parts[i].split('=');
        if (!nv[0]) continue;
        if (nv[0] === "view") {
            viewParam = nv[1];
        }
        params[nv[0]] = nv[1] || true;
    }
}

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
            console.log("onConnChange isConnected=" + isConnected);

            getData(function () {
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
                    title: "Create a new Event"
                };
                $("#event_Dialog").dialog(event_DialogOpts);
                $("#event_Dialog").on("dialogopen", $('#eventID').val(-1));
                $('#div_Script').hide();

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

                $("#jqbmonday").button();$("#jqbtuesday").button();$("#jqbwednesday").button(); $("#jqbthursday").button();
                $("#jqbfriday").button();$("#jqbsaturday").button();$("#jqbsunday").button();

                $("#jqbjan").button();$("#jqbfeb").button();$("#jqbmar").button();$("#jqbapr").button();
                $("#jqbmay").button();$("#jqbjun").button();$("#jqbjul").button();$("#jqbaug").button();
                $("#jqbsep").button();$("#jqboct").button();$("#jqbnov").button();$("#jqbdec").button();

                $("#button_location").button();$("#button_script").button();$("#button_save").button();
                $("#button_submit").button();$("#button_delete").button();$("#button_cancel").button();
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

                    if ($("#input_location").val() == "Object") {
                        alert("Please select a valid Option, 'Object' is not valid");
                        return false;
                    }
                    var allEV = $("#calendar").fullCalendar('clientEvents');
                    var eventID = $('#eventID').val();
                    var state = $('#eventState').val();
                    if (state != undefined && state != "") {
                        if (state == "resize") {
                            // TODO: current nothing todo
                        } else if (state == "move") {
                            // TODO: We must delete this Object from ioBroker
                            var event  = $("#calendar").fullCalendar('clientEvents', eventID);
                            if (event.length == 1) {
                                saveEventToObject(event[0], "delete", true);
                            } else {
                                for (var i=0; i<event.length; i++) {
                                    saveEventToObject(event[i], "delete", true);
                                }
                            }
                        }
                    } else {
                        if (eventID != "-1" && eventID != undefined) {
                            // Edit Mode
                            $('#calendar').fullCalendar('removeEvents', eventID);
                            updateEvent(eventID);

                            var allEV = $("#calendar").fullCalendar('clientEvents');
                        } else {
                            eventID = "_" + Math.random().toString(36).replace(/[^a-z]+/g, '').substr(0, 10);
                            updateEvent(eventID);
                        }
                    }

                    var event  = $("#calendar").fullCalendar('clientEvents', eventID);

                    var thermostatArray = objects["system.adapter.occ.0"];
                    if (thermostatArray != undefined) {
                        var addr = event[0].IDID.split(".");
                        addr = addr[0]+"."+addr[1]+"."+addr[2];
                        var parent = objects[addr];
                        if (thermostatArray.native != undefined && thermostatArray.native.thermostat != undefined && (parent != undefined && parent.native.TYPE != undefined && thermostatArray.native.thermostat[parent.native.TYPE] != undefined)) {
                            // Homematic Thermostat do not allow Objectname with Timestamp
                            saveEventToObject(event[0], "save", false);
                        } else {
                            saveEventToObject(event[0], "save", true);

                        }
                    }

                    // TODO: Sometimes Browser do not refresh Events, create a Timeout
                    //setTimeout($('#calendar').fullCalendar('rerenderEvents'), 3000);
                    $('#calendar').fullCalendar('rerenderEvents');
                    $("#event_Dialog").dialog('close');
                    $('#eventState').val("");
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

                                $('#VARDP').val(true);
                            } else if (type == "ALARMDP") {
                                $("#divState_2").hide();
                                $("#divState_16").hide();
                                $("#divState_4").hide();
                                $("#divState_20").hide();
                                alert("ALARMDP Values cannot be set");
                                $('#VARDP').val(false);
                            } else if (role == "switch") {
                                $("#divSwitch").show();
                                $('#VARDP').val(false);
                            } else {
                                $("#divSwitch").hide();
                                $("#divState_Generic").show();
                                $('#VARDP').val(false);
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
                                            // TODO: THIS MUST BE CALLED FROM CHECK allelements.click
                                            /*
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
                                             */
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
                        left: viewParam === "none" ? 'prev,next today customButton1,customButton2,customButton3'  : "",
                        center: viewParam === "none" ? 'title'  : "",
                        right: viewParam === "none" ? 'month,agendaWeek,agendaDay' : "" // TODO: Generate customView
                    },
                    defaultView: viewParam === "none" ? 'agendaWeek' : 'agendaDay',
                    editable: viewParam === "none" ? true : false,
                    eventLimit: true,
                    // allow "more" link when too many events
                    selectable: viewParam === "none" ? true : false,
                    selectHelper: viewParam === "none" ? true : false,
                    firstDay: 1,
                    timezone:'local',
                    // Select new Timerange = Create a new Planning Entry
                    select: function(start, end, allDay) {
                        $('#event_Dialog').dialog('option', 'title', 'Create a new Event');

                        $('#input_title').prop('readonly', false).removeAttr('disabled');
                        $('#colorPicker').show();
                        $('#button_location').prop('readonly', false).removeAttr('disabled');
                        $('#input_notes').prop('readonly', false).removeAttr('disabled');
                        $('#state_input_2').prop('readonly', false).removeAttr('disabled');
                        $('#checkbox_allday').prop('readonly', false).removeAttr('disabled');
                        $('#jqdFrom').prop('readonly', false).removeAttr('disabled');
                        $('#jqdTo').prop('readonly', false).removeAttr('disabled');
                        $('#fromTime').prop('readonly', false).removeAttr('disabled');
                        $('#toTime').prop('readonly', false).removeAttr('disabled');
                        $('#fromampm').prop('readonly', false).removeAttr('disabled');
                        $('#toampm').prop('readonly', false).removeAttr('disabled');
                        $('#repeaterCombo').prop('readonly', false).removeAttr('disabled');
                        $('#endCombo').prop('readonly', false).removeAttr('disabled');
                        $('#numberoftimes').prop('readonly', false).removeAttr('disabled');
                        $('#button_save').prop('readonly', false).removeAttr('disabled');
                        $('#button_delete').prop('readonly', false).removeAttr('disabled');
                        $('#button_reset').prop('readonly', false).removeAttr('disabled');

                        // Set Default Values
                        $('#eventID').val( - 1);
                        $('#input_title').val("Title");
                        $('#input_location').val("Object");
                        $('#input_notes').val("Set some descriptive Notes...");
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

                        $('#input_title').prop('readonly', true).prop('disabled', 'disabled');

                        if (event.editable == false) {
                            alert(event.tooltip);
                            return;
                        }

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
                        $('#numberoftimes').val(event.numberoftimes);
                        $('#switcher').prop("checked", event.switcher);

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
                        if (obj.native != undefined && obj.native.TypeName != undefined) {
                            if (obj.native.TypeName == 'VARDP') {
                                // TODO: We do not need this for VARDP
                                $("#divSwitch").hide();

                                // TODO: typo is not defined
                                var typo = event.typo;
                                var valueType = obj.native.ValueType;

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
                                //} else if (event.IDTYPE == "ALARMDP") {
                            } else if (obj.native.TypeName == "ALARMDP") {
                                $("#divState_2").hide();
                                $("#divState_16").hide();
                                $("#divState_4").hide();
                                $("#divState_20").hide();
                                alert("ALARMDP Values cannot be set");
                            }
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

                        if (event.iCal) {
                            $('#event_Dialog').dialog('option', 'title', 'iCal Event, Read Only');
                            $('#colorPicker').hide();
                            $('#button_location').prop('readonly', true).prop('disabled', 'disabled');
                            $('#input_notes').prop('readonly', true).prop('disabled', 'disabled');
                            $('#state_input_2').prop('readonly', true).prop('disabled', 'disabled');
                            $('#checkbox_allday').prop('readonly', true).prop('disabled', 'disabled');
                            $('#jqdFrom').prop('readonly', true).prop('disabled', 'disabled');
                            $('#jqdTo').prop('readonly', true).prop('disabled', 'disabled');
                            $('#fromTime').prop('readonly', true).prop('disabled', 'disabled');
                            $('#toTime').prop('readonly', true).prop('disabled', 'disabled');
                            $('#fromampm').prop('disabled', true);
                            $('#toampm').prop('disabled', true);
                            $('#repeaterCombo').prop('disabled', true);
                            $('#endCombo').prop('readonly', true).prop('disabled', 'disabled');
                            $('#numberoftimes').prop('readonly', true).prop('disabled', 'disabled');
                            $('#button_save').prop('readonly', true).prop('disabled', 'disabled');
                            $('#button_delete').prop('readonly', true).prop('disabled', 'disabled');
                            $('#button_reset').prop('readonly', true).prop('disabled', 'disabled');
                        } else {
                            $('#event_Dialog').dialog('option', 'title', 'Edit Event');
                            $('#colorPicker').show();
                            $('#button_location').prop('readonly', false).removeAttr('disabled');
                            $('#input_notes').prop('readonly', false).removeAttr('disabled');
                            $('#state_input_2').prop('readonly', false).removeAttr('disabled');
                            $('#checkbox_allday').prop('readonly', false).removeAttr('disabled');
                            $('#jqdFrom').prop('readonly', false).removeAttr('disabled');
                            $('#jqdTo').prop('readonly', false).removeAttr('disabled');
                            $('#fromTime').prop('readonly', false).removeAttr('disabled');
                            $('#toTime').prop('readonly', false).removeAttr('disabled');
                            $('#fromampm').removeAttr('disabled');
                            $('#toampm').removeAttr('disabled');
                            $('#repeaterCombo').removeAttr('disabled');
                            $('#endCombo').prop('readonly', false).removeAttr('disabled');
                            $('#numberoftimes').prop('readonly', false).removeAttr('disabled');
                            $('#button_save').prop('readonly', false).removeAttr('disabled');
                            $('#button_delete').prop('readonly', false).removeAttr('disabled');
                            $('#button_reset').prop('readonly', false).removeAttr('disabled');
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
                        if (event.iCal) {
                            alert("Not Allowed, iCal Event");
                            // TODO: REFRESH NEEDED
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
                            return false;
                        }
                        $('#eventID').val(event.id);
                        $('#eventState').val("move");
                        $( "#button_save" ).trigger( "click" );
                    },
                    eventResize: function(event) {
                        if (event.iCal) {
                            alert("Not Allowed, iCal Event");
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
                            // TODO: REFRESH NEEDED
                            return false;
                        }

                        //alert("Resize " + event.title);
                        $('#eventID').val(event.id);
                        $('#eventState').val("resize");
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


                            getData( function() {
                                // Todo: set all marked allelements ID back
                                // cause after reload, all are away
                                var allElements = $('#allelements').val();

                                allEvents = new Array();
                                $('#allelements').multiselect("uncheckAll");

                                readEventsFromObjects();

                                var valArr = allElements;
                                if (valArr !== undefined && valArr !== null) {
                                    i = 0, size = valArr.length, $options = $('#allelements option');

                                    for(i; i < size; i++){
                                        $options.filter('[value="'+valArr[i]+'"]').prop('selected', true);

                                        $("#allelements").multiselect("widget").find(":checkbox[value='"+valArr[i]+"']").each(function() {
                                            this.click();
                                        });
                                    }
                                }
                                $("#allelements").multiselect("refresh");
                            });

                        }
                    }
                });;

                $('#calendar').fullCalendar('rerenderEvents');

                // TODO: Change Height, if called with parameter
                //var x = document.getElementsByClassName('fc-time-grid-container');
                //x[0].style.height = "100%";

                if (viewParam !== "none") {
                    $('#calendar').fullCalendar('option', 'aspectRatio', 0.1);

                    $("#allelements").multiselect("widget").find(":checkbox[value='" + viewParam + "']").each(function () {
                        this.click();
                    });
                    $("#allelements").multiselect("refresh");
                }
            });
        }
    });
});
