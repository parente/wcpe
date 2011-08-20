/*
 * WCPE Chrome Playlist Extension
 *
 * Copyright 2011, Peter Parente. All rights reserved.
 * http://creativecommons.org/licenses/BSD/
 */
/*global $ jstz*/
function onLoad() {
    var song = chrome.extension.getBackgroundPage().currentSong;
    console.log(song);
}