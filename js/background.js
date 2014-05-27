/*
 * WCPE Chrome Playlist Extension
 *
 * Copyright 2011, 2013 Peter Parente. All rights reserved.
 * http://creativecommons.org/licenses/BSD/
 */
/*global $ jstz webkitNotifications*/
var days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
var sched = null;
var lastSong = null;
var currentSong = null;
var cols = ['program', 'time', 'link', 'composer', 'work', 'performer', 'label', 'stock', 'barcode'];
var stream = new Audio();
var streamListeners = $.Callbacks();
var STREAM_URL = 'http://audio-ogg.ibiblio.org:8000/wcpe.ogg';

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
    $('tr', table).each(function() {
        var tr = $(this);
        var item = {};
        var i = 0;
        $('td', tr).each(function() {
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
                if(isNaN(hr) || isNaN(min)) {
                    // bad row, ignore
                    i = 0;
                    return false;
                }
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
    var url = 'http://theclassicalstation.org/music/'+days[date.getDay()]+'.shtml';
    $.ajax({
        url: url,
        dataType: 'html'
    }).done(function(html) {
        parseSchedule(html, date, url);
    }).fail(function(err) {
        console.error(err);
    });
}

function fetchSongIcon(song) {
    var def = new $.Deferred();
    if(!song.link || song.icon) {
        // nothing to fetch
        def.resolve();
        return def;
    }

    $.ajax({
        url : song.link,
        dataType : 'html'
    }).fail(function() {
        // default icon
        def.resolve();
    }).done(function(html) {
        // album art as icon
        html = $(html).not('script').not('link');
        var src = $('img[src*="covers"]', html).attr('src');
        if(src) {
            song.icon = src;
        }
        def.resolve();
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
    return song;
}

function showCurrentSong(song) {
    if(localStorage.notices === 'true') {
        var notice =  webkitNotifications.createHTMLNotification(
            '../html/notice.html'
        );
        notice.show();
        setTimeout(function() {
            notice.cancel();
        }, localStorage.hideAfter * 1000);
    }

    if(localStorage.speech === 'true') {
        chrome.tts.speak(song.work + ' by ' + song.composer + '. Performed by ' + song.performer);
    }
}

function toggleStream() {
    if(!stream.paused) {
        console.debug('stopping stream');
        stream.pause();
        stream.src = null;
    } else {
        console.debug('starting stream');
        stream.src = STREAM_URL;
        stream.play();
    }
    // notify stream state change
    streamListeners.fire(isStreamPlaying());
}

function isStreamPlaying() {
    return !stream.paused;
}

function onTick() {
    console.debug('updating state');
    // user's timezone offset
    var tz = jstz.determine_timezone();
    var offset = parseInt(tz.utc_offset, 10);
    // local date/time
    var d = new Date();
    // @todo: adjust for timezone difference
    if(!sched || sched.date.getDay() !== d.getDay()) {
        console.debug('fetching new schedule');
        // fetch the day's schedule
        fetchSchedule(d);
    } else {
        // determine current song
        var song = computeCurrentSong(d);
        currentSong = song;
        if(song !== lastSong) {
            console.debug('new song detected');
            lastSong = song;
            fetchSongIcon(song).done(function() {
                showCurrentSong(song);
            });
        }
    }
}

function initSettings() {
    var tmp = localStorage.notices;
    localStorage.notices = (tmp === undefined) ? true : (tmp === 'true');
    tmp = localStorage.hideAfter;
    localStorage.hideAfter = (tmp === undefined) ? 8 : tmp;
    tmp = localStorage.speech;
    localStorage.speech = (tmp === undefined) ? false : (tmp === 'true');
}

function onLoad() {
    initSettings();
    onTick();
    setInterval(onTick, 30000);
}

$(onLoad);
