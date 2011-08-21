/*
 * WCPE Chrome Playlist Extension
 *
 * Copyright 2011, Peter Parente. All rights reserved.
 * http://creativecommons.org/licenses/BSD/
 */
/*global $ jstz webkitNotifications*/
var days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
var sched = null;
var lastSong = null;
var currentSong = null;
var cols = ['program', 'time', 'link', 'composer', 'work', 'performer', 'label', 'stock', 'barcode'];

function parseSchedule(html, date, url) {
    html = $(html);
    // grab date
    var pageDate = $('span.date', html).text().trim();
    pageDate = pageDate.substr(0, pageDate.length-1);
    pageDate = new Date(pageDate);
    if(pageDate.getDay() < date.getDay()) {
        console.warn('fetched old schedule:', pageDate);
        // old data, ignore and wait for next tick
        sched = null;
        return;
    }
    // parse schedule
    sched = {
        items : [],
        date : pageDate,
        url : url
    };
    // schedule table
    sched.items = [];
    var table = $('table', html).not('[bgcolor]')[0];
    // nested loop to avoid missing cells
    $('tr', table).map(function() {
        var tr = $(this);
        var item = {};
        var i = 0;
        $('td', tr).map(function() {
            var name = cols[i];
            var val;
            if(name === 'link') {
                // grab url
                val = $('a', this).attr('href');
            } else {
                val = $(this).text();
            }
            if(name === 'time') {
                // store date object
                var time = val.split(':');
                var hr = parseInt(time[0], 10);
                var min = parseInt(time[1], 10);
                val = new Date(
                    pageDate.getFullYear(),
                    pageDate.getMonth(),
                    pageDate.getDate(),
                    hr, 
                    min
                );
            }
            item[name] = val;
            i++;
        });
        if(i) {
            sched.items.push(item);
        }
    });
    // invoke onTick again immediately
    onTick();
}

function fetchSchedule(date) {
    var url = 'http://wcpe.org/music/'+days[date.getDay()]+'.shtml';
    $.ajax({
        url: url,
        dataType: 'html'
    }).done(function(html) {
        parseSchedule(html, date, url);
    });
}

function buildNotification(song) {
    var def = new $.Deferred();
    var resolve = function() {
        var notice =  webkitNotifications.createHTMLNotification(
            '../html/notice.html'
        );
        def.resolve(notice);
    };

    if(!song.link) {
        // default icon
        resolve();
        return def;
    }

    $.ajax({
        url : song.link,
        dataType : 'html'
    }).fail(function() {
        // default icon
        resolve();
    }).done(function(html) {
        // album art as icon
        html = $(html).not('script').not('link');
        var src = $('img[src*="covers"]', html).attr('src');
        if(src) {
            song.icon = 'http://arkivmusic.com/'+src;
        }
        resolve();
    });

    return def;
}

function computeCurrentSong(date) {
    // find current song
    var song, 
        prevSong = null, 
        program = '';
    for(var i=0, l=sched.items.length; i<l; i++) {
        song = sched.items[i];
        if(date < song.time) {
            // previous song is current
            song = sched.items[Math.max(i-1, 0)];
            break;
        }
        if(song.program) {
            program = song.program;
        }
    }
    // adopt last encountered program id
    if(!song.program) {
        song.program = program;
    }
    currentSong = song;
    return currentSong;
}

function showCurrentSong(date) {
    var song = computeCurrentSong(date);
    // if we exit without a hit, last song is current
    if(song !== lastSong) {
        buildNotification(song).done(function(notice) {
            notice.show();
            lastSong = song;
            setTimeout(function() {
                notice.cancel();                 
            }, 8000);
        });
    }
}

function onTick() {
    console.log('tick');
    // user's timezone offset
    var tz = jstz.determine_timezone();
    var offset = parseInt(tz.utc_offset, 10);
    // local date/time
    var d = new Date();
    // @todo: adjust for timezone difference
    if(!sched || sched.date.getDay() !== d.getDay()) {
        // fetch the day's schedule
        fetchSchedule(d);
    } else {
        // show the current song
        showCurrentSong(d);
    }
}

function onLoad() {
    onTick();
    setInterval(onTick, 30000);
}
