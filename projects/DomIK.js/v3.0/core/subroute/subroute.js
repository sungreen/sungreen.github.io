'use strict';

import { nDiv, setParent } from '../ndiv.js';

const ops_list = {};

function exec( listener, options ) {
    listener( options );
}

export function send( type, options={} ) {
    if( ops_list[type] ) {
        ops_list[type].ops.forEach( ( task ) => { exec( task.listener[type], options ); } );
    }
}

let _update_needs_ = true;
let _update_lock_ = [];

export function updateLock( tag ) { _update_lock_.push( tag ); }
export function updateUnLock( tag  ) { _update_lock_.removeOf( tag ); }

export function updateNeeds() {
    if( !_update_needs_ ) {
        send( 'waitUpdate' );
        _update_needs_ = true;
    }
}

export function needsUpdateCheck() {
    if( _update_needs_ ) {
        if( _update_lock_.length === 0 ) {
            _update_needs_ = false;
            send( 'needsUpdate' );
        }
    } else {
        app.modify();
    }
}

export function listen( listener, name='noname' ) {
    listener.name = name;

    listener.registry = ( type, ops ) => {
        if( !ops_list[type] ) { ops_list[type] = { ops: [] }; }
        ops_list[type].ops.push( { listener:listener } );
        listener[type] = ops;
    }
    return listener;
}

export function route( name='noname' ) {
    const sub = listen( { canvas: nDiv( null ) }, name );

    sub.registry( 'set_view', ( options ) => {
        const view = options.view;
        if( view.mode === name ) {
            if( sub.canvas ) setParent( sub.canvas, view.canvas );
            if( sub.do_view ) sub.do_view( view );
            view.subroute = sub;
        }
    } );

    return sub;
}

export const app = {
    options: {}
};

export function createApp() {
    app.views = {};
    app.modify = () => {};
    return app;
}

export function run() {
    animation();
}

function animation() {
    needsUpdateCheck();
    requestAnimationFrame( animation );
}

// modify(); call in main