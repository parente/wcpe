/*
 * WCPE Chrome Playlist Extension
 *
 * Copyright 2011, Peter Parente. All rights reserved.
 * http://creativecommons.org/licenses/BSD/
 */
function onSave() {
    localStorage.notices = $('#notices').attr('checked') === 'checked';
    localStorage.hideAfter = $('#hide_after').val();
    localStorage.speech = $('#speech').attr('checked') === 'checked';
    showStatus();
}

function showStatus() {
    $('#status').fadeIn(300).delay(3000).fadeOut(300);
}

function onLoad() {
    var tmp = localStorage.notices === 'true';
    $('#notices')[(tmp ? 'attr' : 'removeAttr')]('checked',true);
    $('#hide_after').val(localStorage.hideAfter);
    tmp = localStorage.speech === 'true';
    $('#speech')[(tmp ? 'attr' : 'removeAttr')]('checked',true);
}