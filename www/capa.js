/*
 // The following code provides a reliable pageX/pageY for IE, even if it’s not there:
 function fixPageXY(e) {
 if (e.pageX == null && e.clientX != null ) {
 var html = document.documentElement
 var body = document.body

 e.pageX = e.clientX + (html.scrollLeft || body && body.scrollLeft || 0)
 e.pageX -= html.clientLeft || 0

 e.pageY = e.clientY + (html.scrollTop || body && body.scrollTop || 0)
 e.pageY -= html.clientTop || 0
 }
 }
 */

$(document).ready(function() {
    // Init all Objects to Default State
    $('.repeat_button').html('Enable');
    $('.repeat_display').hide();
    /*
     // Helper Function, show clicked Element
     $('*').click(function(event) {
     console.log(event.target);
     alert(JSON.stringify(event.target));
     });
     */

    $('.button').click(function(event) {
        alert("Button clicked");
        $.getJSON("iobroker.json", function(data) {
            window.__iobroker = data;
            $('#dialog-select-member').selectId('init', {
                objects: window.__iobroker,
                columns: ['name', 'type', 'role', 'enum', 'room'],
                states:  null,
                noImg:   true
            });
        });
    });

    // Hide Assistent
    $('.cancel_button').click(function(event) {
        $('#calendarobject').hide();
    });
    // Hide Assistent
    $('.save_button').click(function(event) {
        $('#calendarobject').hide();
    });
    // Hide Assistent
    $('.delete_button').click(function(event) {
        $('#calendarobject').hide();
    });


    // Show / Hide Repeat Event Div
    $('.repeat_button').click(function(event) {
        if ($('.repeat_button').text() == 'Enable') {
            $('.repeat_button').html('Disable');
            $('.repeat_display').show();
        } else {
            $('.repeat_button').html('Enable');
            $('.repeat_display').hide();
        }
    });

    // Switch Repeat Event Elements
    $('.repeat_radio').on('change', function() {
        if ($('.repeat_radio:checked').val() == "week") {
            $('.repeat_every_day').hide();
            $('.repeat_every_week').show();
            $('.repeat_every_month').hide();
            $('.repeat_every_year').hide();
        } else if ($('.repeat_radio:checked').val() == "day") {
            $('.repeat_every_day').show();
            $('.repeat_every_week').hide();
            $('.repeat_every_month').hide();
            $('.repeat_every_year').hide();
        } else if ($('.repeat_radio:checked').val() == "month") {
            $('.repeat_every_day').hide();
            $('.repeat_every_week').hide();
            $('.repeat_every_month').show();
            $('.repeat_every_year').hide();
        } else if ($('.repeat_radio:checked').val() == "year") {
            $('.repeat_every_day').hide();
            $('.repeat_every_week').hide();
            $('.repeat_every_month').hide();
            $('.repeat_every_year').show();
        }
    });

    // Assistent Move Function
    /*
     document.getElementById('calendarobject').onmousedown = function() {
     this.style.position = 'absolute'

     var self = this

     // Move Assistent on Mouse move
     document.onmousemove = function(e) {
     e = e || event;
     fixPageXY(e);

     self.style.left = e.pageX-100+'px';
     self.style.top = e.pageY+'px';
     }
     this.onmouseup = function() {
     document.onmousemove = null;
     }
     }

     document.getElementById('calendarobject').ondragstart = function() { return false }
     */

    // Calendar Functions
    $('#calendar').fullCalendar({
        header: {
            left: 'prev,next today',
            center: 'title',
            right: 'month,agendaWeek,agendaDay'
        },
        defaultDate: '2015-02-12',
        editable: true,
        eventLimit: true, // allow "more" link when too many events
        selectable: true,
        selectHelper: true,
        // Select Function, not yet implemented
        select: function(start, end, allDay) {
            $('.repeat_display').hide();
            $('.repeat_button').html('Enable');
            $('#calendar_titles').val("");

            var m_begin = $.fullCalendar.moment(start);
            var m_end = $.fullCalendar.moment(end);

            var time_begin = (m_begin.hours()*60+m_begin.minutes());
            var day_begin = (m_begin.date());
            var month_begin = (m_begin.months());
            var year_begin = (m_begin.years());

            var time_end = (m_end.hours()*60+m_end.minutes());
            var day_end = (m_end.date());
            var month_end = (m_end.months());
            var year_end = (m_end.years());

            $('.begin_time').val(time_begin);
            $('.begin_day').val(day_begin);
            $('.begin_month').val(month_begin);
            $('.begin_year').val(year_begin);

            $('.end_time').val(time_end);
            $('.end_day').val(day_end);
            $('.end_month').val(month_end);
            $('.end_year').val(year_end);

            document.getElementById('calendarobject').style.display = 'block';
        },

        // Select new Timerange = Create a new Planning Entry
        /*
        select: function(start, end, allDay) {
            var title = prompt('Event Title:');
            var url = prompt('Type Event url, if exits:');
            if (title) {
                var start = $.fullCalendar.formatDate(start, "yyyy-MM-dd HH:mm:ss");
                var end = $.fullCalendar.formatDate(end, "yyyy-MM-dd HH:mm:ss");
                $.ajax({
                    url: 'http://localhost:8888/fullcalendar/add_events.php',
                    data: 'title='+ title+'&start='+ start +'&end='+ end +'&url='+ url ,
                    type: "POST",
                    success: function(json) {
                        alert('Added Successfully');
                    }
                });
                calendar.fullCalendar('renderEvent',
                    {
                        title: title,
                        start: start,
                        end: end,
                        allDay: allDay
                    },
                    true // make the event "stick"
                );
            }
            calendar.fullCalendar('unselect');
        },
        */
        // Show Planning Entry with Assistent
        eventClick: function(event) {
            $('.repeat_display').hide();
            $('.repeat_button').html('Enable');

            // opens events in a popup window
            $('.objects_input_object').val(event.section);
            $('#calendar_titles').val(event.title);

            var m_begin = $.fullCalendar.moment(event.start);
            var m_end = $.fullCalendar.moment(event.end);

            var time_begin = (m_begin.hours()*60+m_begin.minutes());
            var day_begin = (m_begin.date());
            var month_begin = (m_begin.months());
            var year_begin = (m_begin.years());

            var time_end = (m_end.hours()*60+m_end.minutes());
            var day_end = (m_end.date());
            var month_end = (m_end.months());
            var year_end = (m_end.years());

            $('.begin_time').val(time_begin);
            $('.begin_day').val(day_begin);
            $('.begin_month').val(month_begin);
            $('.begin_year').val(year_begin);

            $('.end_time').val(time_end);
            $('.end_day').val(day_end);
            $('.end_month').val(month_end);
            $('.end_year').val(year_end);

            if (document.getElementById('calendarobject').style.display == 'none') {
                document.getElementById('calendarobject').style.display = 'block';
            } else {
                document.getElementById('calendarobject').style.display = 'none';
            }
            return false;
        },
        // Loading Function, not yet implemented
        loading: function(bool) {
            $('#loading').toggle(bool);
        },
        // Event rendering Function, not yet implemented
        eventRender: function(event, element, view) {
            //    alert("Render" + event.title);
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

        events: [
            {
                title: 'All Day Event',
                start: '2015-02-01',
                allDay: true,
                section: "JEQ123456"
            },
            {
                id: 999,
                title: 'Repeating Event',
                start: '2015-02-09T16:00:00'
            },
            {
                id: 999,
                title: 'Repeating Event',
                start: '2015-02-16T16:00:00'
            },
            {
                title: 'Conference',
                start: '2015-02-11',
                end: '2015-02-13',
                editable: true
            },
            {
                title: 'Meeting',
                start: '2015-02-12T10:30:00',
                end: '2015-02-12T12:30:00',
                color: "green"
            },
            {
                title: 'TestMeeting',
                start: '10:00', // a start time (10am in this example)
                end: '18:00', // an end time (6pm in this example)
                dow: [ 1, 2, 3, 4, 5 ]
            }
        ]
    });
});
