'use strict';
function randomInt(max, base=0 ) { return Math.floor(Math.random() * max) + base; }

function msplit(head, sep, tail = '') {
    return `${head}${sep}${tail}`.split(sep);
}

function getHrefOptions( href ) {
    const options = {};
    const qs = String( href + '?foo' ).split( '?' ).slice( 1 );
    qs.forEach((query) => {
        const parts = query.split('&');
        parts.forEach((part) => {
            const lex = (part + '=true').split('=');
            options[lex[0]] = lex[1];
        });
    });
    return options;
}

function readFromFile(file, onread = (data) => { }) {
    const reader = new FileReader();
    reader.readAsText(file);
    reader.onload = () => { onread( reader.result ) };
}

function makeTimer() {
    const timer = {};

    timer.clear = () => {
        timer.finishTask = null;
        timer.repeatTask = null;
        timer.range = 0;
        timer.begin = 0;
        timer.last = 0;
        timer.finish = 0;
    }

    timer.repeat = ( timestamp ) => {
        const current = Date.now();
        if ( !timer.range || current <= timer.finish ) {
            if( current - timer.last >= timer.rate ) {
                timer.last = current;
                if ( timer.repeatTask ) timer.repeatTask( [current, timer.begin, timer.finish, timer.range] );
            }
            window.requestAnimationFrame( timer.repeat );
        } else {
            if ( timer.finishTask ) timer.finishTask( [timer.finish, timer.begin, timer.finish, timer.range] );
        }
    }

    timer.start = ( duration, onFinish, onRepeat, interval=333 ) => {
        timer.clear();
        timer.rate = interval;
        timer.range = duration * 1000;
        timer.begin = Date.now();
        timer.last = timer.begin;
        timer.finish = timer.begin + timer.range;
        timer.finishTask = onFinish;
        timer.repeatTask = onRepeat;
        window.requestAnimationFrame( timer.repeat );
    }

    timer.break = () => {
        timer.finish = Date.now();
        timer.repeat();
    }

    return timer;
}