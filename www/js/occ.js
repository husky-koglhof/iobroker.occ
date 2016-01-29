var isMobile = false; //initiate as false

var names = [];
var objects = [];
var states = [];
var reverse = [];
var config;
var calendars = new Array();
var theme = '';
var selectId;

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

var params = {};
var v_resourceId = 'none';
var v_view = 'none';
// TODO: Change calendar to readonly if needed
var v_readonly = 'false';

if (location.search) {
    var parts = location.search.substring(1).split('&');

    for (var i = 0; i < parts.length; i++) {
        var nv = parts[i].split('=');
        if (!nv[0]) continue;
        if (nv[0] === "resourceId") {
            v_resourceId = nv[1];
        } else if (nv[0] === 'view') {
            v_view = nv[1];
        } else if (nv[0] === 'readonly') {
            v_readonly = eval(nv[1]);
        }
        params[nv[0]] = nv[1] || true;
    }
}

function getTheme() {
    var theme = document.body ? $.data(document.body, 'theme') : null
    if (theme == null) {
        theme = '';
    }
    else {
        return theme;
    }

// device detection
    if(/(android|bb\d+|meego).+mobile|avantgo|bada\/|blackberry|blazer|compal|elaine|fennec|hiptop|iemobile|ip(hone|od)|ipad|iris|kindle|Android|Silk|lge |maemo|midp|mmp|netfront|opera m(ob|in)i|palm( os)?|phone|p(ixi|re)\/|plucker|pocket|psp|series(4|6)0|symbian|treo|up\.(browser|link)|vodafone|wap|windows (ce|phone)|xda|xiino/i.test(navigator.userAgent)
        || /1207|6310|6590|3gso|4thp|50[1-6]i|770s|802s|a wa|abac|ac(er|oo|s\-)|ai(ko|rn)|al(av|ca|co)|amoi|an(ex|ny|yw)|aptu|ar(ch|go)|as(te|us)|attw|au(di|\-m|r |s )|avan|be(ck|ll|nq)|bi(lb|rd)|bl(ac|az)|br(e|v)w|bumb|bw\-(n|u)|c55\/|capi|ccwa|cdm\-|cell|chtm|cldc|cmd\-|co(mp|nd)|craw|da(it|ll|ng)|dbte|dc\-s|devi|dica|dmob|do(c|p)o|ds(12|\-d)|el(49|ai)|em(l2|ul)|er(ic|k0)|esl8|ez([4-7]0|os|wa|ze)|fetc|fly(\-|_)|g1 u|g560|gene|gf\-5|g\-mo|go(\.w|od)|gr(ad|un)|haie|hcit|hd\-(m|p|t)|hei\-|hi(pt|ta)|hp( i|ip)|hs\-c|ht(c(\-| |_|a|g|p|s|t)|tp)|hu(aw|tc)|i\-(20|go|ma)|i230|iac( |\-|\/)|ibro|idea|ig01|ikom|im1k|inno|ipaq|iris|ja(t|v)a|jbro|jemu|jigs|kddi|keji|kgt( |\/)|klon|kpt |kwc\-|kyo(c|k)|le(no|xi)|lg( g|\/(k|l|u)|50|54|\-[a-w])|libw|lynx|m1\-w|m3ga|m50\/|ma(te|ui|xo)|mc(01|21|ca)|m\-cr|me(rc|ri)|mi(o8|oa|ts)|mmef|mo(01|02|bi|de|do|t(\-| |o|v)|zz)|mt(50|p1|v )|mwbp|mywa|n10[0-2]|n20[2-3]|n30(0|2)|n50(0|2|5)|n7(0(0|1)|10)|ne((c|m)\-|on|tf|wf|wg|wt)|nok(6|i)|nzph|o2im|op(ti|wv)|oran|owg1|p800|pan(a|d|t)|pdxg|pg(13|\-([1-8]|c))|phil|pire|pl(ay|uc)|pn\-2|po(ck|rt|se)|prox|psio|pt\-g|qa\-a|qc(07|12|21|32|60|\-[2-7]|i\-)|qtek|r380|r600|raks|rim9|ro(ve|zo)|s55\/|sa(ge|ma|mm|ms|ny|va)|sc(01|h\-|oo|p\-)|sdk\/|se(c(\-|0|1)|47|mc|nd|ri)|sgh\-|shar|sie(\-|m)|sk\-0|sl(45|id)|sm(al|ar|b3|it|t5)|so(ft|ny)|sp(01|h\-|v\-|v )|sy(01|mb)|t2(18|50)|t6(00|10|18)|ta(gt|lk)|tcl\-|tdg\-|tel(i|m)|tim\-|t\-mo|to(pl|sh)|ts(70|m\-|m3|m5)|tx\-9|up(\.b|g1|si)|utst|v400|v750|veri|vi(rg|te)|vk(40|5[0-3]|\-v)|vm40|voda|vulc|vx(52|53|60|61|70|80|81|83|85|98)|w3c(\-| )|webc|whit|wi(g |nc|nw)|wmlb|wonu|x700|yas\-|your|zeto|zte\-/i.test(navigator.userAgent.substr(0,4))) isMobile = true;

    if (isMobile) {
        if (config.theme_mobile && config.theme_mobile != "") {
            theme = config.theme_mobile;
        } else {
            theme = 'mobile';
        }
    } else {
        if (config.theme_normal && config.theme_normal != "") {
            theme = config.theme_normal;
        } else {
            theme = 'bootstrap';
        }
    }

    var url = "js/jqwidgets/styles/jqx." + theme + '.css';
    if (window.location.href.toString().indexOf("jqxangular") >= 0) {
        var loc = window.location.href.toString();
        if (loc.indexOf('button') >= 0 ||
            loc.indexOf('grid') >= 0 ||
            loc.indexOf('dropdownlist') >= 0 ||
            loc.indexOf('combobox') >= 0 ||
            loc.indexOf('datatable') >= 0 ||
            loc.indexOf('listbox') >= 0 ||
            loc.indexOf('tabs') >= 0 ||
            loc.indexOf('menu') >= 0 ||
            loc.indexOf('calendar') >= 0 ||
            loc.indexOf('datetimeinput') >= 0 ||
            loc.indexOf('chart') >= 0) {
            url = "../../../jqwidgets/styles/jqx." + theme + '.css';
        }
    }

    if (document.createStyleSheet != undefined) {
        var hasStyle = false;
        $.each(document.styleSheets, function (index, value) {
            if (value.href != undefined && value.href.indexOf(theme) != -1) {
                hasStyle = true;
                return false;
            }
        });
        if (!hasStyle) {
            document.createStyleSheet(url);
        }
    }
    else {
        var hasStyle = false;
        if (document.styleSheets) {
            $.each(document.styleSheets, function (index, value) {
                if (value.href != undefined && value.href.indexOf(theme) != -1) {
                    hasStyle = true;
                    return false;
                }
            });
        }
        if (!hasStyle) {
            var link = $('<link rel="stylesheet" href="' + url + '" media="screen" />');
            link[0].onload = function () {
                if ($.jqx && $.jqx.ready) {
                    $.jqx.ready();
                };
            }
            $(document).find('head').append(link);
        }
    }
    $.jqx = $.jqx || {};
    $.jqx.theme = theme;
    return theme;
};

try {
    if (jQuery) {
        theme = getTheme();
        if (window.location.toString().indexOf('file://') >= 0) {
            var loc = window.location.toString();
            var addMessage = false;
            if (loc.indexOf('grid') >= 0 || loc.indexOf('chart') >= 0 || loc.indexOf('tree') >= 0 || loc.indexOf('list') >= 0 || loc.indexOf('combobox') >= 0 || loc.indexOf('php') >= 0 || loc.indexOf('adapter') >= 0 || loc.indexOf('datatable') >= 0 || loc.indexOf('ajax') >= 0) {
                addMessage = true;
            }

            if (addMessage) {
                $(document).ready(function () {
                    setTimeout(function () {
                            $(document.body).prepend($('<div style="font-size: 12px; font-family: Verdana;">Note: To run a sample that includes data binding, you must open it via "http://..." protocol since Ajax makes http requests.</div><br/>'));
                        }
                        , 50);
                });
            }
        }
    }
    else {
        $(document).ready(function () {
            theme = getTheme();
        });
    }
} catch (error) {
    var er = error;
}

function getData(callback) {
    var objectsReady;
    var statesReady;

    servConn.getStates('*', function (err, res) {
        states = res;
        statesReady = true;
        if (objectsReady && typeof callback === 'function') callback();
    });

    servConn.getObjects(function (err, res) {
        objects = res;
        for (var object in objects) {
            if (objects[object]._id == "system.adapter.occ.0") {
                config = objects[object].native;
            }
        }

        /*
        for (var i = 0; i < enums.length; i++) {
            if (enums[i].search("enum.occ.") == 0) {
                var object = objects[enums[i]];
                var members = object['common']['members'];
                console.log("MEMBERS: " + object.common.members);
                for (var m in members) {
                    var objName = members[m];
                    console.log("Current Member: " + objName);
                    var o = objects[objName];
                    reverse[o.common.name] = o;
                    if (o.native != undefined) {
                        // get Parent Object
                        var addr = getParent(objName);
                        var parent = objects[addr];
                        console.log("Current Parent: " + addr);
                        if (o.native.CONTROL != undefined && o.native.CONTROL == "SWITCH.STATE" ) {
                            names[o.common.name] = types.switch;
                        } else if (parent.native.TypeName != undefined && parent.native.TypeName == "VARDP") {
                            names[o.common.name] = types.variable;
                        } else if (parent.native.PARENT_TYPE != undefined && (parent.native.PARENT_TYPE == 'HM-CC-TC' || parent.native.PARENT_TYPE == 'HM-CC-RT-DN' || parent.native.PARENT_TYPE == 'BC-RT-TRX-CyG-3')) {
                            names[o.common.name] = types.homematic;
                        }
                    }
                } 
            }
        }
        */

        servConn._socket.emit('getObjectView', 'script', 'javascript', {}, function (err, res) {
            var rows = res.rows;
            console.log(rows);
            console.log(rows.length);
            for (var i = 0; i<rows.length; i++) {
                objects["script.js." + rows[i].id] = rows[i];
                console.log("x");
            }
            console.log(objects);
            console.log("TRUE");
        });

        objectsReady = true;
        if (statesReady && typeof callback === 'function') callback();
    });
}

function getParent(address) {
    var a = address.split('.');
    var l = a.length;
    var b = "";
    for (var i = 0; i < a.length - 1; i++) {
        b += a[i] + ".";
    }
    return b.substr(0, b.length-1);
}

function showDialog() {
    var $dlg = $('#dialog-select-member-object-browser');
    if (!$dlg.length) {
        $('body').append('<div id="dialog-select-member-object-browser" style="display:none"></div>');
        $dlg = $('#dialog-select-member-object-browser');
        $dlg.selectId('init', {
            texts: {
                select:          _('Select'),
                cancel:          _('Cancel'),
                all:             _('All'),
                id:              _('ID'),
                name:            _('Name'),
                role:            _('Role'),
                room:            _('Room'),
                value:           _('Value'),
                selectid:        _('Select ID'),
                enum:            _('Members'),
                from:            _('from'),
                lc:              _('lc'),
                ts:              _('ts'),
                ack:             _('ack'),
                expand:          _('expand'),
                collapse:        _('collapse'),
                refresh:         _('refresh'),
                edit:            _('edit'),
                ok:              _('ok'),
                wait:            _('wait'),
                list:            _('list'),
                tree:            _('tree'),
                copyToClipboard: _('Copy to clipboard')
            },
            noMultiselect: true,
            columns: ['image', 'name', 'type', 'role', 'room', 'value'],
            imgPath: 'css/fancytree/',
            objects: objects,
            states:  states,
            zindex:  10000
        });
    }

    $dlg.selectId('show', function (newId, oldId) {
        var obj = objects[newId];
        // get Parent Object
        var addr = getParent(newId);
        var parent = objects[addr];

        if (obj.common && obj.common.name) {
            $('#jqxInputSelect').val(obj.common.name);
        } else {
            $('#jqxInputSelect').val(newId);
        }
        $('#jqxInputId').val(newId);

        if (obj.native != undefined) {
            if (obj.native.CONTROL && obj.native.CONTROL == "SWITCH.STATE") {
                $("#jqxDropDownList").jqxDropDownList('selectItem', 'Switch');
                names[newId] = types.switch;
            } else if (parent != undefined && parent.native != undefined && parent.native.PARENT_TYPE != undefined && (parent.native.PARENT_TYPE == 'HM-CC-TC' || parent.native.PARENT_TYPE == 'HM-CC-RT-DN' || parent.native.PARENT_TYPE == 'BC-RT-TRX-CyG-3')) {
                $("#jqxDropDownList").jqxDropDownList('selectItem', 'Thermostat' );
                names[newId] = types.homematic;
            } else if (obj.native.TypeName != undefined && obj.native.TypeName == "VARDP") {
                $("#jqxDropDownList").jqxDropDownList('selectItem', 'Variable' );
                names[newId] = types.variable;
            } else {
                $("#jqxDropDownList").jqxDropDownList('selectItem', 'Global' );
                names[newId] = types.global;
            }
        } else {
            $("#jqxDropDownList").jqxDropDownList('selectItem', 'Script' );
            names[newId] = types.script;
        }
    });
}

$(document).ready(function () {
    var appointments = new Array();

    var local_colors = ["#AA4643", "#307DD7", "#89A54E", "#71588F", "#4198AF", "#7FD13B", "#EA157A", "#FEB80A", "#00ADDC", "#738AC8",
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
    var colorset = new Array();

    servConn.init(null, {
        onConnChange: function (isConnected) {

            getData(function () {
                // var c = 0;
                for (var obj in objects) {
                    if (obj.search("occ.0") == 0) {
                        if (obj.search(".color") == -1 && obj.search(".html") == -1) {
                            var o = objects[obj];
                            if (o.native !== undefined) {
                                if (decodeURI(v_resourceId) == o.native.resourceId || v_resourceId == 'none') {
                                    /* Bugfix: if there is no color / background defined, set default value
                                    if (o.native.background == undefined || o.native.background == "") {
                                        o.native.background = local_colors[c];
                                    }
                                    if (o.native.color == undefined || o.native.color == "") {
                                        o.native.color = 'black';
                                    }
                                    c++;
                                    */

                                    // TODO: replace from and to
                                    var from = o.native.from;
                                    var to = o.native.to;

                                    if (from.indexOf("Z") > 0 && from.indexOf("T") > 0) {
                                        //console.log(from);
                                    } else {
                                        from = from.replace(/-/g,'/');
                                    }

                                    if (to.indexOf("Z") > 0 && to.indexOf("T") > 0) {
                                        //console.log(to);
                                    } else {
                                        to = to.replace(/-/g,'/');
                                    }

                                    o.native.from = new Date(from);
                                    o.native.to = new Date(to);

                                    // TODO: Check recurrenceException
                                    // if (o.native.recurrenceException) {
                                    //     o.native.recurrenceException = "";
                                    // }

                                    // if (o.native.originalData.recurrenceException) {
                                    //     o.native.originalData.recurrenceException = "";
                                    // }

                                    appointments.push(o.native);

                                    if (colorset.indexOf(o.native.background) == -1) {
                                        colorset.push(o.native.background);
                                    }
                                    if (calendars.indexOf(o.native.resourceId) == -1) {
                                        calendars.push(o.native.resourceId);
                                    }
                                }
                            }
                        }
                    }
                }
                var theme = getTheme();

                var width = '100%';
                var height = '100%';
                var showView;
                var paramView = config.view_param;

                if (isMobile) {
                    if (config.size_mobile && config.size_mobile != "") {
                        width = config.size_mobile;
                        height = config.size_mobile;
                    }
                    if (config.view_mobile && config.view_mobile != "") {
                        showView = config.view_mobile;
                    }
                } else {
                    if (config.size_normal && config.size_normal != "") {
                        width = config.size_normal;
                        height = config.size_normal;
                    }
                    if (config.view_normal && config.view_normal != "") {
                        showView = config.view_normal;
                    }
                }

                showView = v_view == 'none' ? showView : v_view;

                var source = {
                    dataType: 'json',
                    dataFields: [
                        { name: 'id', type: 'string' },
                        { name: 'state', type: 'string' },
                        { name: 'originalState', type: 'string' },
                        { name: 'from', type: 'date', format: "yyyy-MM-dd HH:mm" },
                        { name: 'to', type: 'date', format: "yyyy-MM-dd HH:mm" },
                        { name: 'subject', type: 'string'},
                        { name: 'location', type: 'string'},
                        { name: 'objectID', type: 'string'},
                        { name: 'type', type: 'string'},
                        { name: 'readOnly', type: 'boolean'},
                        { name: 'color', type: 'string' },
                        { name: 'background', type: 'string' },
                        { name: 'resourceId', type: 'string' },
                        { name: 'allDay', type: 'boolean' },
                        { name: 'oldID', type: 'string' },
                        { name: 'style', type: 'string' },
                        { name: 'draggable', type: 'boolean'},
                        { name: 'resizable', type: 'boolean'},
//                        { name: 'recurrenceException', type: 'string'}
                        { name: 'recurrencePattern', type: 'string'}
                    ],
                    id: 'id',
                    localData: appointments
                };
                var adapter = new $.jqx.dataAdapter(source);
                $("#scheduler").jqxScheduler({
                    theme: theme,
                    date: new $.jqx.date('todayDate'),
                    localization: {
                        firstDay: 1,
                        days: {
                            names: ["Sonntag", "Montag", "Dienstag", "Mittwoch", "Donnerstag", "Freitag", "Samstag"],
                            namesAbbr: ["Sonn", "Mon", "Dien", "Mitt", "Donn", "Fre", "Sams"],
                            namesShort: ["So", "Mo", "Di", "Mi", "Do", "Fr", "Sa"]
                        },
                        months: {
                            names: ["Januar", "Februar", "März", "April", "Mai", "Juni", "Juli", "August", "September", "Oktober", "November", "Dezember", ""],
                            namesAbbr: ["Jan", "Feb", "Mär", "Apr", "Mai", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dez", ""]
                        },
                        AM: ["AM", "am", "AM"],
                        PM: ["PM", "pm", "PM"],
                        eras: [
                             { "name": "A.D.", "start": null, "offset": 0 }
                        ],
                        twoDigitYearMax: 2029,
                        patterns: {
                            d: "M/d/yyyy",
                            D: "dddd, MMMM dd, yyyy",
                            t: "h:mm tt",
                            T: "h:mm:ss tt",
                            f: "dddd, MMMM dd, yyyy h:mm tt",
                            F: "dddd, MMMM dd, yyyy h:mm:ss tt",
                            M: "MMMM dd",
                            Y: "yyyy MMMM",
                            S: "yyyy\u0027-\u0027MM\u0027-\u0027dd\u0027T\u0027HH\u0027:\u0027mm\u0027:\u0027ss",
                            ISO: "yyyy-MM-dd hh:mm:ss",
                            ISO2: "yyyy-MM-dd HH:mm:ss",
                            d1: "dd.MM.yyyy",
                            d2: "dd-MM-yyyy",
                            d3: "dd-MMMM-yyyy",
                            d4: "dd-MM-yy",
                            d5: "H:mm",
                            d6: "HH:mm",
                            d7: "HH:mm tt",
                            d8: "dd/MMMM/yyyy",
                            d9: "MMMM-dd",
                            d10: "MM-dd",
                            d11: "MM-dd-yyyy"
                        },
                        agendaDateColumn: "Datum",
                        agendaTimeColumn: "Uhrzeit",
                        agendaAppointmentColumn: "Geplante Termine",
                        backString: "Vorhergehende",
                        forwardString: "Nächster",
                        toolBarPreviousButtonString: "Vorhergehende",
                        toolBarNextButtonString: "Nächster",
                        emptyDataString: "Noch keine Daten vorhanden",
                        loadString: "Loading...",
                        clearString: "Löschen",
                        todayString: "Heute",
                        agendaViewString: "Plan",
                        dayViewString: "Tag",
                        weekViewString: "Woche",
                        monthViewString: "Monat",
                        timelineDayViewString: "Zeitleiste Day",
                        timelineWeekViewString: "Zeitleiste Woche",
                        timelineMonthViewString: "Zeitleiste Monat",
                        loadingErrorMessage: "Die Daten werden noch geladen und Sie können eine Eigenschaft nicht festgelegt oder eine Methode aufrufen . Sie können tun, dass, sobald die Datenbindung abgeschlossen ist. jqxScheduler wirft die ' bindingComplete ' Ereignis, wenn die Bindung abgeschlossen ist.",
                        editRecurringAppointmentDialogTitleString: "Bearbeiten Sie wiederkehrenden Termin",
                        editRecurringAppointmentDialogContentString: "Wollen Sie nur dieses eine Vorkommen oder die Serie zu bearbeiten ?",
                        editRecurringAppointmentDialogOccurrenceString: "Vorkommen bearbeiten",
                        editRecurringAppointmentDialogSeriesString: "Bearbeiten der Serie",
                        editDialogTitleString: "Termin bearbeiten",
                        editDialogCreateTitleString: "Erstellen Sie einen neuen Termin",
                        contextMenuEditAppointmentString: "Termin bearbeiten",
                        contextMenuCreateAppointmentString: "Erstellen Sie einen neuen Termin",
                        editDialogSubjectString: "Titel",
                        editDialogLocationString: "Ort",
                        editDialogFromString: "Von",
                        editDialogToString: "Bis",
                        editDialogAllDayString: "Ganztägig",
                        editDialogExceptionsString: "Ausnahmen",
                        editDialogResetExceptionsString: "Zurücksetzen auf Speichern",
                        editDialogDescriptionString: "Beschreibung",
                        editDialogResourceIdString: "Kalender",
                        editDialogStatusString: "Status",
                        editDialogColorString: "Farbe",
                        editDialogColorPlaceHolderString: "Farbe wählen",
                        editDialogTimeZoneString: "Zeitzone",
                        editDialogSelectTimeZoneString: "Wählen Sie Zeitzone",
                        editDialogSaveString: "Speichern",
                        editDialogDeleteString: "Löschen",
                        editDialogCancelString: "Abbrechen",
                        editDialogRepeatString: "Wiederholen",
                        editDialogRepeatEveryString: "Wiederholen alle",
                        editDialogRepeatEveryWeekString: "woche(n)",
                        editDialogRepeatEveryYearString: "Jahr (en)",
                        editDialogRepeatEveryDayString: "Tag (e)",
                        editDialogRepeatNeverString: "Nie",
                        editDialogRepeatDailyString: "Täglich",
                        editDialogRepeatWeeklyString: "Wöchentlich",
                        editDialogRepeatMonthlyString: "Monatlich",
                        editDialogRepeatYearlyString: "Jährlich",
                        editDialogRepeatEveryMonthString: "Monate (n)",
                        editDialogRepeatEveryMonthDayString: "Day",
                        editDialogRepeatFirstString: "erste",
                        editDialogRepeatSecondString: "zweite",
                        editDialogRepeatThirdString: "dritte",
                        editDialogRepeatFourthString: "vierte",
                        editDialogRepeatLastString: "letzte",
                        editDialogRepeatEndString: "Ende",
                        editDialogRepeatAfterString: "Nach",
                        editDialogRepeatOnString: "Am",
                        editDialogRepeatOfString: "von",
                        editDialogRepeatOccurrencesString: "Eintritt (e)",
                        editDialogRepeatSaveString: "Vorkommen Speichern",
                        editDialogRepeatSaveSeriesString: "Save Series",
                        editDialogRepeatDeleteString: "Vorkommen löschen",
                        editDialogRepeatDeleteSeriesString: "Series löschen",
                        editDialogStatuses:
                        {
                            free: "Frei",
                            tentative: "Vorläufig",
                            busy: "Beschäftigt",
                            outOfOffice: "Ausser Haus"
                        }
                    },
                    width: width,
                    height: height,
                    source: adapter,
                    showLegend: true,
                    legendHeight: 50,
                    showToolbar: v_resourceId == 'none' ? true : false,
                    toolbarHeight: 60,
                    editDialogClose: function (dialog, fields, editAppointment) {
                        //alert('editDialogClose');
                    },

                    editDialogCreate: function (dialog, fields, editAppointment) {
                        $("#dialogscheduler").children().last().before($("#switch"));
                        $("#dialogscheduler").children().last().before($("#temperature"));
                        $("#dialogscheduler").children().last().before($("#thermostat"));
                        $("#dialogscheduler").children().last().before($("#types"));
                        $("#dialogscheduler").children().last().before($("#selectIDs"));
                    },
                    editDialogOpen: function (dialog, fields, editAppointment) {
                        fields.statusContainer.hide();
                        fields.timeZoneContainer.hide();
                        fields.resourceContainer.hide();

                        if (!editAppointment) {
                            $('#jqxInputSelect').val("");
                            $('#jqxInputId').val("");

                            fields.repeatContainer.show();
                            fields.colorContainer.show();
                            fields.locationContainer.show();
                            // not needed fields.resourceLabel.html("Objekt");
                            fields.allDayContainer.show();

                            document.getElementById('selectIDs').style.display = 'block';

                            document.getElementById('types').style.display = 'block';
                            $("#jqxDropDownList").jqxDropDownList('selectItem', 'Global' );

                        } else if (editAppointment.type == types.homematic ||editAppointment.type ==  types.decalc) {
                            fields.repeatContainer.hide();
                            fields.colorContainer.hide();
                            fields.locationContainer.hide();
                            fields.resourceLabel.html("ioBroker");
                            fields.allDayContainer.hide();

                            document.getElementById('thermostat').style.display = 'block';

                            if (editAppointment.type == types.homematic) {
                                $("#dialogscheduler").children().last().before($("#temperature"));
                                document.getElementById('temperature').style.display = 'block';
                                $("#jqxInput").val(editAppointment.state);
                                $('#jqxRadioTemperature').jqxRadioButton({checked: true});
                            } else {
                                document.getElementById('temperature').style.display = 'none';
                                $('#jqxRadioDecalcification').jqxRadioButton({checked: true});
                            }
                        } else if (editAppointment.type == types.switch) {
                            fields.repeatContainer.show();
                            fields.colorContainer.show();
                            fields.locationContainer.show();
                            fields.resourceLabel.html("Objekt");
                            fields.allDayContainer.show();
                            $("#jqxCheckBox").val(editAppointment.state);

                            document.getElementById('types').style.display = 'block';
                            $("#jqxDropDownList").jqxDropDownList('selectItem', 'Switch');
                        } else if (editAppointment.type == types.ical) {
                            fields.repeatContainer.show();
                            fields.colorContainer.show();
                            fields.locationContainer.show();
                            fields.resourceLabel.html("Objekt");
                            fields.allDayContainer.show();
                            fields.saveButton.hide();
                            fields['deleteButton'].hide();

                            document.getElementById('types').style.display = 'block';
                        } else {
                            fields.repeatContainer.show();
                            fields.colorContainer.show();
                            fields.locationContainer.show();
                            fields.resourceLabel.html("Objekt");
                            fields.allDayContainer.show();

                            document.getElementById('types').style.display = 'block';
                        }
                    },
                    resources:
                    {
                        dataField: "resourceId",
                        source:  new $.jqx.dataAdapter(source)
                    },
                    appointmentDataFields:
                    {
                        from: "from",
                        to: "to",
                        id: "id",
                        description: "description",
                        location: "location",
                        subject: "subject",
                        color: "color",
                        background: 'background',
                        resourceId: "resourceId",
                        allDay: 'allDay',
                        state: "state",
                        originalState: 'originalState',
                        type: "type",
                        oldID: 'oldID',
                        objectID: 'objectID',
                        style: 'style',
                        readOnly: 'readOnly',
                        draggable: 'draggable',
                        resizable: 'resizable',
//                        recurrenceException: 'recurrenceException'
                        recurrencePattern: 'recurrencePattern'
                    },
                    view: showView,
                    views:
                        [
                            { type: "dayView", showWeekends: false, timeRuler: { hidden: false, scale: 'fiveMinutes' }, appointmentsRenderMode: "exactTime" },
                            { type: "weekView", workTime:
                                {
                                    fromDayOfWeek: 1,
                                    toDayOfWeek: 5,
                                    fromHour: 7,
                                    toHour: 19,
                                }, appointmentsRenderMode: "exactTime",
                                timeRuler: { hidden: false, scale: 'halfHour' },
                            },
                            { type: 'monthView', showWeekNumbers: true, appointmentsRenderMode: "exactTime" },
                            { type: 'agendaView', appointmentsRenderMode: "exactTime" }
                        ],
                    contextMenuCreate: function(menu, settings)
                    {
                        var source = settings.source;
                        source.push({ id: "submit", label: "Submit to ioBroker" });
                        source.push({ id: "delete", label: "Delete Appointment" });
                    },
                    contextMenuItemClick: function (menu, appointment, event)
                    {
                        var args = event.args;
                        switch (args.id) {
                            case "submit":
                                var from = $("#scheduler").jqxScheduler('getAppointmentProperty', appointment.id, 'from');
                                var to = $("#scheduler").jqxScheduler('getAppointmentProperty', appointment.id, 'to');

                                appointment.from = from.toString();
                                appointment.to = to.toString();

                                 if (appointment.type == types.homematic) {
                                     appointment.state = $("#jqxInput").val();

                                     var jqxAppointment = appointment.jqxAppointment;
                                     delete appointment.jqxAppointment;

                                     var fileName = appointment.objectID;
                                     var objectName = 'occ.0.'+fileName+".dummy";
                                     var flag = 'submit';

                                     var stateObj = {
                                         common: {
                                             name:  objectName,
                                             read:  true,
                                             write: true,
                                             type: 'state',
                                             role: 'meta.config',
                                             update: true,
                                             eventState: flag
                                         },
                                         native: appointment,
                                         type:   'state'
                                     };

                                     servConn._socket.emit('setObject', objectName, stateObj);

                                     appointment.jqxAppointment = jqxAppointment;
                                 }
                                return true;
                            case "delete":
                                $("#scheduler").jqxScheduler('deleteAppointment', appointment.id);
                                return true;
                        }
                    },
                    contextMenuOpen: function (menu, appointment, event) {
                        menu.jqxMenu('showItem', 'delete');
                        if (!appointment) {
                            menu.jqxMenu('hideItem', 'delete');
                            menu.jqxMenu('hideItem', 'status');
                            menu.jqxMenu('hideItem', 'submit');
                        }
                        else {
                            menu.jqxMenu('showItem', 'delete');
                            menu.jqxMenu('showItem', 'status');

                            if (appointment.type == undefined || (appointment.type != types.homematic && appointment.type != types.decalc)) {
                                menu.jqxMenu('hideItem', 'submit');
                            } else {
                                menu.jqxMenu('showItem', 'submit');
                            }

                            if (appointment.type == types.ical) {
                                menu.jqxMenu('hideItem', 'delete');
                            }
                        }
                    },
                    rendering: function(){
                        this.colorSchemes = [{
                            name: "scheme01",
                            colors: colorset
                        },{
                            name: "scheme28",
                            colors: colorset
                        }];
                    },
                    rendered: function(){
                    },
                    ready: function () {
                        if (v_resourceId == 'none') {
                            for (var c = 0; c < calendars.length; c++) {
                                $("#scheduler").jqxScheduler('hideAppointmentsByResource', calendars[c]);
                            }
                        }
                    }
                });

                function rgb2hex(rgb){
                    rgb = rgb.match(/^rgba?[\s+]?\([\s+]?(\d+)[\s+]?,[\s+]?(\d+)[\s+]?,[\s+]?(\d+)[\s+]?/i);
                    return (rgb && rgb.length === 4) ? "#" +
                    ("0" + parseInt(rgb[1],10).toString(16)).slice(-2) +
                    ("0" + parseInt(rgb[2],10).toString(16)).slice(-2) +
                    ("0" + parseInt(rgb[3],10).toString(16)).slice(-2) : '';
                }

                function timeToUntilString (date) {
                    var nDate = new Date(date);
                    var date1, date2 = [nDate.getUTCFullYear(), nDate.getUTCMonth() + 1, nDate.getUTCDate(), "T", nDate.getUTCHours(), nDate.getUTCMinutes(), nDate.getUTCSeconds(), "Z"];
                    for (var i = 0; i < date2.length; i++) {
                        date1 = date2[i];
                        if (!/[TZ]/.test(date1) && date1 < 10) {
                            date2[i] = "0" + String(date1)
                        }
                    }
                    return date2.join("")
                }

                var weekdays = ['MO', 'TU', 'WE', 'TH', 'FR', 'SA', 'SU'];

                function parseRecurrence(recurrencePattern) {
                    if (recurrencePattern) {
                        var bymonth = recurrencePattern.bymonth;
                        var bymonthday = recurrencePattern.bymonthday;
                        var byweekday = recurrencePattern.byweekday;
                        var bynweekday = recurrencePattern.bynweekday;
                        var byweekno = recurrencePattern.byweekno;
                        var byyearday = recurrencePattern.byyearday;
                        var count = recurrencePattern.count;
                        var current = recurrencePattern.current;
                        var currentYearDay = recurrencePattern.currentYearDay;
                        var day = recurrencePattern.day;
                        var days = recurrencePattern.days;
                        var exceptions = recurrencePattern.exceptions;
                        var freq = recurrencePattern.freq;
                        var interval = recurrencePattern.interval;
                        var isEveryWeekDay = recurrencePattern.isEveryWeekDay;
                        var month = recurrencePattern.month;
                        var step = recurrencePattern.step;
                        var timeZone = recurrencePattern.timeZone;
                        var weekDays = recurrencePattern.weekDays;

                        var rdate = recurrencePattern.to.toDate();
                        var rto = recurrencePattern.to.toDate().getYear();

                        var recurrence = "";

                        // BUG: If count == 1000, we need to get recurrencePattern.to
                        if ((rto > 2500 || rto < 1970 ) && count == 1000) {
                            recurrence = "FREQ=" + freq.toUpperCase() + ";INTERVAL=" + interval + ";UNTIL=" + timeToUntilString(rdate);
                        } else {
                            recurrence = "FREQ=" + freq.toUpperCase() + ";INTERVAL=" + interval + ";COUNT=" + count;
                        }

                        if (bymonth && bymonth.length > 0 && byyearday && byyearday.length > 0) {
                            var byDay = "BYMONTH=";
                            byDay = byDay + bymonth[0] + ";BYYEARDAY=" + byyearday[0];
                            recurrence = recurrence + ";" + byDay;
                        } else if (bymonth && bymonth.length) {
                            var byDay = "BYMONTH=";
                            byDay = byDay + bymonth[0];
                            recurrence = recurrence + ";" + byDay;
                        }

                        if (bynweekday && bynweekday.length > 0) {
                            var byDay = "BYDAY=";
                            byDay = byDay + bynweekday[0][1] + weekdays[bynweekday[0][0]];
                            recurrence = recurrence + ";" + byDay;
                        }

                        if (byweekday && byweekday.length > 0) {
                            var byDay = "BYDAY=";
                            for (var b = 0; b < byweekday.length; b++) {
                                byDay += weekdays[byweekday[b]] + ",";
                            }

                            recurrence = recurrence + ";" + byDay.substr(0, byDay.length - 1);
                        }

                        if (bymonthday && bymonthday.length > 0) {
                            var monthday = "BYMONTHDAY=" + bymonthday[0];
                            recurrence = recurrence + ";" + monthday;
                        }
                        return recurrence;
                    }
                }

                function rgb2hex(rgb){
                    rgb = rgb.match(/^rgba?[\s+]?\([\s+]?(\d+)[\s+]?,[\s+]?(\d+)[\s+]?,[\s+]?(\d+)[\s+]?/i);
                    return (rgb && rgb.length === 4) ? "#" +
                    ("0" + parseInt(rgb[1],10).toString(16)).slice(-2) +
                    ("0" + parseInt(rgb[2],10).toString(16)).slice(-2) +
                    ("0" + parseInt(rgb[3],10).toString(16)).slice(-2) : '';
                }

                function appointmentChange(event, action) {
//                    alert('appointmentChange');
                    var args = event.args;
                    var appointment = args.appointment;

                    if (appointment) {
                        if (appointment.type == types.ical) {
                            alert("The action '" + action + "' is not supported for Objects from iCal");
                            return true;
                        }

                        if (appointment.originalData) {
                            appointment.originalData.from = appointment.from.toString();
                            appointment.originalData.to = appointment.to.toString();
                        }

                        var from = $("#scheduler").jqxScheduler('getAppointmentProperty', appointment.id, 'from');
                        var to = $("#scheduler").jqxScheduler('getAppointmentProperty', appointment.id, 'to');
                        var type = $("#scheduler").jqxScheduler('getAppointmentProperty', appointment.id, 'type');
                        // var resourceId = $("#scheduler").jqxScheduler('getAppointmentProperty', appointment.id, 'resourceId');
                        var resourceId = $('#jqxInputSelect').val();

                        var objectID = $('#jqxInputId').val();

                        var color = $("#scheduler").jqxScheduler('getAppointmentProperty', appointment.id, 'color');
                        var background = $("#scheduler").jqxScheduler('getAppointmentProperty', appointment.id, 'background');
                        var style = $("#scheduler").jqxScheduler('getAppointmentProperty', appointment.id, 'style');
                        var subject = $("#scheduler").jqxScheduler('getAppointmentProperty', appointment.id, 'subject');
                        var allDay = $("#scheduler").jqxScheduler('getAppointmentProperty', appointment.id, 'allDay');

                        if (color == undefined || color == "") {
                            color = "black";
                        }
                        appointment.color = color;

                        if (background == undefined || color == "") {
                            appointment.background = local_colors[20];
                        } else {
                            appointment.background = rgb2hex(background);
                        }

                        appointment.subject = subject;

                        // TODO: Try to build the correct Pattern
                        /*
                         recurrencePattern – string field. Defines the appointment’s recurrence rule. Ex: “FREQ=DAILY;”. List of supported keywords:
                         FREQ – “DAILY” / “WEEKLY” / “MONTHLY” / “YEARLY”. The FREQ rule part identifies the type of recurrence rule. This rule part MUST be specified in the recurrence rule.
                         COUNT – Number. The Count rule part defines the number of occurrences at which to range-bound the recurrence.
                         UNTIL – String like “UNTIL=20150919T210000Z”. The UNTIL rule part defines a date-time value where the recurrence ends.
                         BYDAY – String like “MO,TU”. The BYDAY rule part specifies a COMMA character (US-ASCII decimal 44) separated list of days of the week; MO indicates Monday; TU indicates Tuesday; WE indicates Wednesday; TH indicates Thursday; FR indicates Friday; SA indicates Saturday; SU indicates Sunday. Each BYDAY value can also be preceded by a positive (+n) or negative (-n) integer. If present, this indicates the nth occurrence of the specific day within the MONTHLY or YEARLY RRULE. For example, within a MONTHLY rule, +1MO (or simply 1MO) represents the first Monday within the month, whereas -1MO represents the last Monday of the month.
                         BYMONTHDAY – String like 15, 30. The BYMONTHDAY rule part specifies a COMMA character (ASCII decimal 44) separated list of days of the month. Valid values are 1 to 31
                         BYMONTH – Number like 1. The BYMONTH rule part specifies a month of the year. Valid values are 1 to 12.
                         INTERVAL – Number like 1. The INTERVAL rule part contains a positive integer representing how often the recurrence rule repeats. The default value is “1″,
                         Examples:
                         “FREQ=WEEKLY;BYDAY=MO,WE”,
                         “FREQ=MONTHLY;BYMONTHDAY=10,15;COUNT=20″,
                         “FREQ=DAILY;INTERVAL=3;COUNT=10″,
                         “FREQ=MONTHLY;BYDAY=-2FR;COUNT=7″,
                         “FREQ=YEARLY;COUNT=30;WKST=MO;BYMONTH=3″

                         recurrenceException – string field. Defines the exceptions of the recurrence rule. The bound value should be a string or comma separated list of Date strings. Example: “2015-11-24 09:00:00,2015-11-26 12:00:00″
                         */

                        /**********************************************************************************/
                        var recurrencePattern = $("#scheduler").jqxScheduler('getAppointmentProperty', appointment.id, 'recurrencePattern');
                        var recurrenceException = $("#scheduler").jqxScheduler('getAppointmentProperty', appointment.id, 'recurrenceException');

                        if (appointment.originalData && appointment.originalData.recurrencePattern && appointment.originalData.recurrencePattern.ical) {
                            console.log("Original: " + appointment.originalData.recurrencePattern.ical);
                        } else {
                            console.log("Original diffs from current recurrence");
                            //appointment.originalData.recurrencePattern = parseRecurrence(appointment.originalData.recurrencePattern);
                        }

                        var recurrence = parseRecurrence(recurrencePattern);

                        if (appointment.recurrencePattern && (typeof appointment.recurrencePattern) != "string") {
                            appointment.originalData.recurrencePattern = parseRecurrence(appointment.recurrencePattern);
                        }
                        appointment.recurrencePattern = recurrence;

                        /**********************************************************************************/
                        var type = names[objectID];

                        if (appointment.type == undefined) {
                            appointment.type = type;
                        }

                        // TODO: replace from and to
                        appointment.from = from.toString();
                        appointment.to = to.toString();

                        var jqxAppointment = appointment.jqxAppointment;
                        delete appointment.jqxAppointment;

                        var fileName;
                        var objectName;

                        if (appointment.type == types.homematic) {
                            appointment.state = $("#jqxInput").val();
                            fileName = appointment.objectID + "." + subject;
                            objectName = 'occ.0.' + fileName;
                        } else if (appointment.type == types.switch) {
                            var val = $("#jqxCheckBox").val();
                            appointment.resourceId = resourceId;
                            console.log("State: " + val); // Neuer Wert
                            console.log("State: " + appointment.state);
                            console.log("State: " + appointment.originalState);
                            if (!appointment.state) {
                                appointment.state = val;
                            }
                            if (!appointment.originalState) {
                                appointment.originalState = val;
                            }

                            if (appointment.state !== val) {
                                console.log("State changed: " + val + " - " + appointment.state + " - " + appointment.originalState);
                                appointment.originalState = appointment.state;
                                appointment.state = val;
                            }

                            console.log("State New: " + appointment.state);
                            console.log("State New: " + appointment.originalState);

                            // var o = reverse[appointment.resourceId];
                            var o = objects[objectID];

                            /*
                            if (o == undefined) {
                                o = objects[resourceId];
                            }
                            */

                            if (appointment.objectID == undefined) {
                                appointment.objectID = o._id;
                            }

                            fileName = appointment.objectID;
                            objectName = 'occ.0.' + fileName + "." + appointment.subject + "_#" + appointment.id + "#";
                        } else if (appointment.type == types.variable) {
                            appointment.state = $("#jqxCheckBox").val();

                            // TODO: Reverse Lookup, Get Object address from Name
                            var o = reverse[appointment.resourceId];
                            if (o == undefined) {
                                o = objects[resourceId];
                            }

                            if (appointment.objectID == undefined) {
                                appointment.objectID = o._id;
                            }

                            fileName = appointment.objectID;
                            objectName = 'occ.0.' + fileName + "." + appointment.subject + "_#" + appointment.id + "#";
                        } else if (appointment.type == types.script) {
                            appointment.state = resourceId;

                            // TODO: Reverse Lookup, Get Object address from Name
                            var o = reverse[appointment.resourceId];
                            if (o == undefined) {
                                o = objects[resourceId];
                            }

                            if (appointment.objectID == undefined) {
                                appointment.objectID = o._id;
                            }

                            fileName = appointment.objectID;
                            objectName = 'occ.0.' + fileName + "." + appointment.subject + "_#" + appointment.id + "#";
                        }
alert(objectName);
                        var stateObj = {
                            common: {
                                name:  objectName,
                                read:  true,
                                write: true,
                                type: 'state',
                                role: 'meta.config',
                                update: true,
                                eventState: action
                            },
                            native: appointment,
                            type:   'state'
                        };
                        if (objectName == undefined || objectName == "") {
                            console.log("Failure: No objectName defined");
                        } else {
                            servConn._socket.emit('setObject', objectName, stateObj);
                            appointment.jqxAppointment = jqxAppointment;
                        }
                    }
                }

                $('#scheduler').on('editRecurrenceDialogOpen', function (event) {
                    var args = event.args;
                    var dialog = args.dialog;
                    var appointment = args.appointment;
                });

                $('#scheduler').on('editRecurrenceDialogClose', function (event) {
                    var args = event.args;
                    var dialog = args.dialog;
                    var appointment = args.appointment;
                });

                $('#scheduler').on('appointmentDelete', function (event) {
                    appointmentChange(event, 'delete');
                });

                $('#scheduler').on('appointmentAdd', function (event) {
                    appointmentChange(event, 'save');
                });

                $("#scheduler").on('appointmentChange', function (event) {
                    appointmentChange(event, 'save');
                });

                $("#jqxCheckBox").jqxCheckBox({
                    width: '25px',
                    height: '25px'
                });

                var obj = $("#jqxCheckBox");
                obj[0].style.top = '6px';
                obj[0].style.position = 'relative';

                $("#jqxDecalc").jqxCheckBox({
                    width: '25px',
                    height: '25px'
                });

                var obj = $("#jqxDecalc");
                obj[0].style.top = '6px';
                obj[0].style.position = 'relative';


                $("#jqxInput").jqxInput({
                    height: 25,
                    width: 50,
                    minLength: 1,
                    maxLength: 3
                });

                var ids = new Array(" ");

                $("#jqxInputSelect").jqxInput({
                    height: 25,
                    width: 343,
                    minLength: 1,
                    source: ids
                });

                $("#jqxInputId").jqxInput({
                    height: 0,
                    width: 0,
                    minLength: 1
                });

                $("#jqxVariable").jqxInput({
                    height: 25,
                    width: '100%',
                    minLength: 1,
                    maxLength: 3
                });
/*
                $("#jqxScript").jqxInput({
                    height: 25,
                    width: '100%',
                    minLength: 1,
                    maxLength: 3
                });
*/
                $("#jqxRadioTemperature").jqxRadioButton({
                    width: 120,
                    height: 25,
                    groupName: "Thermostat"
                });
                $("#jqxRadioDecalcification").jqxRadioButton({
                    width: 120,
                    height: 25,
                    groupName: "Thermostat"
                });

                var source = [
                    "Global",
                    "Thermostat",
                    "Switch",
                    "Variable",
                    "iCal",
                    "Script"];
                // Create a jqxDropDownList
                $("#jqxDropDownList").jqxDropDownList({
                    source: source,
                    selectedIndex: 0
                });

                $('#jqxDropDownList').on('change', function (event)
                {
                    var args = event.args;
                    if (args) {
                        var item = args.item;
                        var label = item.label;
                        var origSize = $("#dialogscheduler")[0].style.height;
                        var size = parseInt(origSize.replace("px",""));

                        // var recurrencePattern = $("#scheduler").jqxScheduler('getAppointmentProperty', appointment.id, 'recurrencePattern');

                        document.getElementById('temperature').style.display = 'none';
                        document.getElementById('decalcification').style.display = 'none';
                        document.getElementById('variable').style.display = 'none';
                        document.getElementById('switch').style.display = 'none';
//                        document.getElementById('script').style.display = 'none';

                        if (label == "Thermostat") {
                            $("#dialogscheduler").children().last().before($("#thermostat"));
                            $("#dialogscheduler").children().last().before($("#temperature"));
                            $("#dialogscheduler").children().last().before($("#decalcification"));

                            document.getElementById('temperature').style.display = 'block';
                            document.getElementById('decalcification').style.display = 'block';

                            size += 103;
                        } else if (label == "Switch") {
                            $("#dialogscheduler").children().last().before($("#switch"));

                            document.getElementById('switch').style.display = 'block';

                            size += 73;
                        } else if (label == "Variable") {
                            $("#dialogscheduler").children().last().before($("#variable"));

                            document.getElementById('variable').style.display = 'block';

                            size += 73;
                        } else if (label == "iCal") {
                            size += 38;
                        } else if (label == "Script") {
                            $("#dialogscheduler").children().last().before($("#script"));

//                            document.getElementById('script').style.display = 'block';

//                            size += 73;
                            size += 38;
                        } else if (label == "Global") {
                            size += 38;
                        }

                        $("#scheduler").jqxScheduler('_editDialog')[0].style.height = (size + "px");
                        $("#dialogscheduler")[0].style.height = (size + "px");

                    }
                });
                $('#jqxDecalc').on('change', function (event) {
                    var checked = event.args.checked;
                    var size = 0;
                    if (checked) {
                        document.getElementById('temperature').style.display = 'none';
                        size = "470px";
                    } else {
                        document.getElementById('temperature').style.display = 'block';
                        size = "500px";
                    }

                    $("#scheduler").jqxScheduler('_editDialog')[0].style.height = size;
                    $("#dialogscheduler")[0].style.height = size;
                });

                $('#jqxRadioTemperature').on('checked', function (event) {
                    $("#dialogscheduler").children().last().before($("#temperature"));
                    document.getElementById('temperature').style.display = 'block';
                    $("#scheduler").jqxScheduler('_editDialog')[0].style.height = "338px";
                });

                $('#jqxRadioDecalcification').on('checked', function (event) {
                    document.getElementById('temperature').style.display = 'none';
                    $("#scheduler").jqxScheduler('_editDialog')[0].style.height = "300px";
                });

            });
        }
    });

    $.extend(true, systemDictionary, {
        "Select": {"en": "Select", "de": "Auswählen", "ru": "Выбрать"},
        "Ok": {"en": "Ok", "de": "Ok", "ru": "Ok"},
        "Cancel": {"en": "Cancel", "de": "Abbrechen", "ru": "Отмена"},
        "All": {"en": "All", "de": "Alle", "ru": "все"},
        "ID": {"en": "ID", "de": "ID", "ru": "ID"},
        "name": {"en": "name", "de": "Name", "ru": "Имя"},
        "Role": {"en": "Role", "de": "Rolle", "ru": "Роль"},
        "Room": {"en": "Room", "de": "Raum", "ru": "Комната"},
        "Value": {"en": "Value", "de": "Wert", "ru": "Значение"},
        "Select ID": {"en": "Select ID", "de": "ID Auswählen", "ru": "Выбрать ID"},
        "From": {"en": "From: ", "de": "Von", "ru": "От"},
        "Last changed": {"en": "Last changed", "de": "Letzte Änderung", "ru": "Изменён"},
        "Time stamp": {"en": "Time stamp", "de": "Zeitstempel", "ru": "Время"},
        "Processing...": {"en": "Processing...", "de": "Bearbeite...", "ru": "Обработка..."},
        "Acknowledged": {"en": "Acknowledged", "de": "Bestätigt", "ru": "Подтверждён"},
        "Filter:": {"en": "Filter:", "de": "Filter:", "ru": "Фильтр:"},
        "id": {"en": "ID", "de": "ID", "ru": "ID"},
        "Select all": {"en": "Select all", "de": "Alle auswählen", "ru": "Выбрать все видимые"},
        "Deselect all": {"en": "Deselect all", "de": "Auswahl aufheben", "ru": "Убрать выделение"},
        "Invert selection": {
            "en": "Invert selection",
            "de": "Selektierung invertieren",
            "ru": "Инвертировать выделение"
        }
    });


    $("#jqxButton").jqxButton({ width: '25', height: '25'});

    $('#jqxInputSelect').on('open', function() {
        showDialog();
    });

    $("#jqxButton").on('click', function () {
        showDialog();
    });
});
