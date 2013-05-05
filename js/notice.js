/*
 * WCPE Chrome Playlist Extension
 *
 * Copyright 2011, 2013 Peter Parente. All rights reserved.
 * http://creativecommons.org/licenses/BSD/
 */
/*global $ jstz*/
var song = null;
var sched_url = null;
var REQUESTS_URL = 'http://www.wcpe.org/features_request.shtml#request';
var ICON_URL = '../png/radio64.png';

function setListenLinkState(playing) {
    var link = $('#listen');
    if(playing) {
        link.text(chrome.i18n.getMessage('extSilenceLink'));
    } else {
        link.text(chrome.i18n.getMessage('extListenLink'));
    }
}

function onPurchase() {
    chrome.tabs.create({url : song.link || REQUESTS_URL});
}

function onSchedule() {
    chrome.tabs.create({url : sched_url});
}

function onListen() {
    var page = chrome.extension.getBackgroundPage();
    page.toggleStream();
}

function onLoad() {
    $('#busy').text(chrome.i18n.getMessage('extBusyText'));
    var page = chrome.extension.getBackgroundPage();
    if(!page.sched || !page.sched.url || !page.currentSong) {
        setTimeout(onLoad, 3000);
        return;
    }
    sched_url = page.sched.url;
    song = page.currentSong;
    $('#icon').attr('src', song.icon || ICON_URL);
    $('#work').text(song.work);
    $('#composer').text(song.composer);
    $('#performer').text(song.performer);
    $('#schedule').text(chrome.i18n.getMessage('extScheduleLink'));

    var key = song.link ? 'extPurchaseLink' : 'extRequestsLink';
    $('#purchase').text(chrome.i18n.getMessage(key));

    setListenLinkState(page.isStreamPlaying());
    page.streamListeners.add(setListenLinkState);

    $('#busy').hide();
    $('#notice').show();

    $('#listen').on('click', onListen);
    $('#schedule').on('click', onSchedule);
    $('#purchase').on('click', onPurchase);
}

function onUnload() {
    var page = chrome.extension.getBackgroundPage();
    page.streamListeners.remove(setListenLinkState);
}

$(window).on('unload', onUnload);
$(onLoad);