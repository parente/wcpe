/*
 * WCPE Chrome Playlist Extension
 *
 * Copyright 2011, 2013 Peter Parente. All rights reserved.
 * http://creativecommons.org/licenses/BSD/
 */
function onSave() {
    localStorage.notices = $('#notices').prop('checked');
    localStorage.hideAfter = $('#hide_after').val();
    localStorage.speech = $('#speech').prop('checked');
    showStatus();
    event.preventDefault();
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

    $('button[type="submit"]').on('click', onSave);
    $('button[type="cancel"]').on('click', function(event) {
        event.preventDefault();
        window.close();
    });
}

$(onLoad);