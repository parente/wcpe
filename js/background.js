/*
 * WCPE Chrome Playlist Extension
 *
 * Copyright 2011, Peter Parente. All rights reserved.
 * http://creativecommons.org/licenses/BSD/
 */
/*global $ jstz*/
var days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
var sched = null;
var lastSong = null;
var currentSong = null;
var cols = ['segment', 'time', 'link', 'composer', 'work', 'performer', 'label', 'stock', 'barcode'];

function parseSchedule(html, date) {
    $('#tmp').html($(html));
    // grab date
    var pageDate = $('span.date').text().trim();
    pageDate = pageDate.substr(0, pageDate.length-1);
    pageDate = new Date(pageDate);
    // parse schedule
    sched = {
        items : [],
        date : pageDate
    };
    // schedule table
    sched.items = [];
    var table = $('table').not('[bgcolor]')[0];
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
                val = $(this).html();
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
    $.ajax({
        url: 'http://www.wcpe.org/music/'+days[date.getDay()]+'.shtml',
        dataType: 'html'
    }).done(function(html) {
        parseSchedule(html, date);
    });
}

function buildNotification(song) {
    console.log('building notification', song);
    var def = new $.Deferred();
    var resolve = function(img) {
        var notice = webkitNotifications.createNotification(
            img || '',
            song.work,
            song.composer
        );
        console.log('resolving notification');
        def.resolve(notice);
    };

    if(!song.link) {
        resolve();
        return def;
    }

    // fetch icon
    $.ajax({
        url : song.link,
        dataType : 'html'
    }).fail(function() {
        resolve();
    }).done(function(html) {
        html = $(html).not('script').not('link');
        var img = $('img[src*="covers"]', html).attr('src');
        if(img) {
            img = 'http://www.arkivmusic.com/'+img;
        } else {
            img = '';
        }
        resolve(img);
    });

    return def;
}

function computeCurrentSong(date) {
    // find current song
    var song, prevSong = null;
    for(var i=0, l=sched.items.length; i<l; i++) {
        song = sched.items[i];
        if(date < song.time) {
            // previous song is current
            song = sched.items[Math.max(i-1, 0)];
            break;
        }
    }
    currentSong = song;
    return currentSong;
}

function showCurrentSong(date) {
    var song = computeCurrentSong(date);
    // if we exit without a hit, last song is current
    if(song !== lastSong) {
        buildNotification(song).done(function(notice) {
            console.log('showing notice');
            notice.show();
            lastSong = song;
            setTimeout(function() {
                notice.cancel();                 
            }, 5000);
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
