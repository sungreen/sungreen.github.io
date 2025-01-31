'use strict';

import * as THREE from 'three';
import * as ROUTE from './subroute.js'
import { ModelTools } from './model.js';

const animations = {}
const mods = {};

let anim_root;
let anim_focus;

let keypool;
let index_log = 0;
let id = 0;

let offset = 0;

function dbg( msg='.', anim ) {
    const tag = '['+anim.id+'] ' + anim.name;
    const stag = anim.parent? ( '['+anim.parent.id+'] ' + anim.parent.name ) : '---' ;
    const progress = ( msg === 'progress' )? anim.progress: null;
    ROUTE.send( 'console_log', { msg: progress? null: msg, tag: tag, stag: stag, progress: progress, offset: ++offset } );
}

function getParentSerial( anim ) {
    let a = anim;
    while( anim.parent ) {
        if( a.parent.isSerial ) return a.parent;
        a = a.parent;
    }
    return null;
}

function get_anim_by_ref( ref ) {
    if( ref && animations[ ref.type ] ) {
        return animations[ ref.type ]( ref );
    }
}

animations.base = ( ref, name, mode ) => {
    const anim = { id:++id, ref: ref, name: name, level: 0 };

    anim.status = 0;

    anim.start = () => {
        if( anim.status !== 1  ) {
            if( anim.ref && anim.ref.model ) anim.ref.model.plug( true );
            dbg( 'S', anim );
            anim.status = 1;
            anim.do_start();
            if( anim.do_modify ) anim_root.modifiers.push( anim );
            if( anim_root.paused ) anim.pause();
        }
    }

    anim.stop = () => {
        if( anim.status === 1 ) {
            dbg( 'X', anim );
            anim.kill();
            if( anim.parent ) anim.parent.return( anim );
        }
    }

    anim.kill = () => {
        if( anim.status === 1 ) {
            anim.status = 2;
            dbg( 'K', anim );
            const index = anim_root.modifiers.indexOf( anim );
            if (index > -1) anim_root.modifiers.splice( index, 1 );
            anim.do_kill();
            if( anim.ref && anim.ref.model ) anim.ref.model.plug( false );
            if( anim_focus === anim ) anim_focus = null;
        }
    }

    anim.pause = () => {
        if( anim.status === 1 ) {
            dbg( 'P', anim );
            anim.do_pause();
        }
    }

    anim.resume = () => {
        if( anim.status === 1 ) {
            dbg( 'R', anim );
            anim.do_resume();
        }
    }

    anim.return = ( item ) => {
        anim.do_return( item );
    }

    anim.touch = () => { anim.start(); }
    anim.free = () => { anim.kill(); }
    anim.progress = ( value ) => { if( anim.status === 1 ) anim.do_progress( value ); }

    anim.children = [];

    anim.add = ( item ) => {
        anim.children.push( item );
        item.parent = anim;
        item.level = anim.level + 1;
        //dbg( 'I', item, anim );
        return anim;
    }

    anim.reference = () => {
        anim.ref.children.forEach( ( child ) => {
            const item = get_anim_by_ref( child );
            if( item ) anim.add( item );
        } );
        return anim;
    }

    anim.forChild = ( func ) => {
        if( typeof func === 'string' ) {
            anim.children.forEach( ( item, index ) => { item[func](); } );
        } else {
            anim.children.forEach( ( item, index ) => { func( item, index ); } );
        }
    }

    anim.do_start = () => {}
    anim.do_kill = () => {}
    anim.do_pause = () => {}
    anim.do_resume = () => {}
    anim.do_progress = ( value ) => { anim.progress = value; dbg( 'progress', anim ); }

    if( mode ) {
        mods.base( anim );
        mods[mode]( anim );
    }

    return anim;
}

mods.base = ( anim ) => {
    anim.do_start = () => { anim.forChild( 'start' ); }
    anim.do_kill = () => { anim.forChild( 'kill' ); }
    anim.do_pause = () => { anim.forChild( 'pause' ); }
    anim.do_resume = () => { anim.forChild( 'resume' ); }
}

mods.and = ( anim ) => {
    anim.hash = 0;

    anim.do_start = () => {
        anim.forChild( ( item, index ) => {
            item.index = index;
            if( !item.passive ) anim.hash += ( 1<<item.index );
            item.start();
        } );
    }

    anim.do_return = ( item ) => {
        if( !item.passive ) anim.hash -= ( 1<<item.index );
        if( anim.hash === 0 ) {
            dbg( 'RS', item );
            anim.stop();
        }
    }
}

mods.or = ( anim ) => {
    anim.do_return = ( item ) => {
        if( !item.passive ) {
            dbg( 'RS', item );
            anim.stop();
        }
    }
}

function current( cmd, anim, offset=0 ) {
    const index = anim.offset + offset;
    if( index<0 ) return null;
    if( index<anim.children.length ) anim.offset = index;
        const item = anim.children[anim.offset];
        if( cmd === 'touch' ) {
            anim_focus = item;
            ROUTE.send( 'animation', { cmd: 'focus', ref: anim_focus.ref } );
        }
        if( item[cmd] ) item[cmd]();
    return anim.children[anim.offset];
}

mods.selector = ( anim ) => {
    anim.isSerial = true;

    anim.do_start = () => {
        anim.forChild( ( item, index ) => { item.start(); } );
        anim.offset = -1;
        anim.next();
    }

    anim.next = () => {
        current( 'free', anim );
        if( !current( 'touch', anim, 1 ) ) {
            anim.stop();
        }
    }

    anim.prev = () => {
        current( 'free', anim );
        if( !current( 'touch', anim, -1 ) ) {
            const pserial = getParentSerial( anim );
            if( pserial ) pserial.prev();
            else anim.stop();
        }
    }

    anim.select = () => {
        anim.stop();
    }
}

mods.serial = ( anim ) => {
    mods.selector( anim );

    anim.do_start = () => {
        anim.offset = -1;
        anim.next();
    }

    anim.do_return = ( item ) => {
        anim.next();
    }
}

mods.focus = ( anim ) => {
    anim.do_start = () => {
        if( anim === anim_focus ) anim.touch();
        else anim.free();
    }

    function selector( mode ) {
        const s = mode? anim.children[0]: anim.children[1];
        const p = mode? anim.children[1]: anim.children[0];
        if(s) s.kill();
        if(p) p.start();
    }

    anim.touch = () => { selector( true ); }
    anim.free = () => { selector( false ); }

}

mods.switch = ( anim ) => {
    mods.selector( anim );

    anim.do_start = () => {
        if( anim.children[0] ) anim.children[0].start();
    }

    anim.do_return = ( item ) => {
        if( !anim.route ){
            const offset = item.offset + 1;
            if( anim.children[offset] ) anim.children[offset].start();
            anim.route = true;
        } else {
            anim.stop();
        }
    }
}

animations.group = ( ref ) => {
    const mode = ref.group.mode.get();
    const anim = animations.base( ref, mode + ':' + ref.type + ' #' + ref.id, mode ).reference();
    return anim;
}

animations.link = animations.group;

animations.presentation = ( ref ) => {
    const mode = ref.group.mode.get(); // defauls serial
    const anim = animations.base( ref, 'presentation', mode ).reference();
    return anim;
}

animations.slide = ( ref ) => {
    const mode = ref.group.mode.get(); // defauls focus
    const anim = animations.base( ref, 'show slide', mode ).add( animations.send( 'Score', { mode:ref.id } ) ).reference();
    return anim;
}

animations.view = ( ref ) => {
    const mode = ref.group.mode.get(); // defauls focus
    const anim = animations.base( ref, 'show view', mode ).reference();
    return anim;
}

animations.send = ( type, options ) => {
    const anim = animations.base( null, 'send' );

    anim.do_start = () => {
        anim.status = 2;
        ROUTE.send( type, options );
    }

    anim.passive = true;

    return anim;
}

animations.keypressed = ( handle = ( event ) => { return true; } ) => {
    const anim = animations.base( null, 'keypressed' );

    anim.handle = ( event ) => {
        if( !anim_root.paused && handle( event ) ) anim.do_kill( anim );
    }

    anim.do_start = () => {
        anim.status = 1;
        anim.keypool = keypool;
        keypool = anim;
    }

    anim.do_kill = () => {
        keypool = anim.keypool;
        anim.status = 2;
    }

    return anim;
}

animations.delay = ( duration=2500 ) => {
    let timerId, start, remaining = duration;

    const anim = animations.base( null, 'delay' );

    anim.handle = () => { anim.stop( anim ); }

    anim.resume = () => {
        start = Date.now();
        anim.timeout = setTimeout( anim.handle , remaining );
    }

    anim.do_start = () => {
        anim.status = 1;
        anim.resume();
    }

    anim.do_kill = () => {
        clearTimeout( anim.timeout );
        anim.status = 2;
    }

    anim.do_pause = () => {
        clearTimeout( anim.timeout );
        remaining -= Date.now() - start;
    }

    return anim;
}

animations.video = ( ref ) => {
    const anim = animations.base( ref, 'video' ).reference();

    let video;

    anim.do_start = async () => {
        video = await ModelTools.getResource( ref.source.get() );
        video.needsUpdate = true;
        video.muted = ref.muted.get();
        video.loop = ref.loop.get();
        video.addEventListener( 'ended', ( event ) => { anim.stop(); } );
        video.addEventListener( 'timeupdate', ( ) => {
            if( video.duration ) anim.do_progress( video.currentTime / video.duration );
        } );
        video.play();
        video.currentTime = 0;
    }

    anim.do_kill = () => { if( video ) video.pause(); }
    anim.do_pause = () => { if( video ) video.pause(); }
    anim.do_resume = () => { if( video ) video.play(); }

    return anim;
}

animations.image = ( ref ) => {
    const anim = animations.base( ref, 'image' ).reference();
    //anim.passive = true;
    return anim;
}

animations.text = ( ref ) => {
    const anim = animations.base( ref, 'text' ).reference();
    return anim;
}

animations.sound = ( ref ) => {
    const anim = animations.base( ref, 'sound' );
    const source = ref.source.get();
    let sound;

    anim.do_start = async () => {
        sound = await ModelTools.getResource( source );
        sound.muted = ref.muted.get();
        sound.addEventListener( 'ended', ( event ) => { anim.stop(); } );
        sound.addEventListener( 'timeupdate', ( ) => {
            if( sound.duration ) anim.progress( audio.currentTime / audio.duration );
        } );
        sound.play();
    }

    anim.do_kill = () => {
        if( sound ) sound.pause();
    }

    anim.do_pause = () => {
        if( sound )  sound.pause();
    }

    anim.do_resume = () => {
        if( sound )  sound.play();
    }

    return anim;
}

animations.model3d = ( ref ) => {
    const anim = animations.base( ref, 'model3d' );
    const source = ref.source.get();
    let mixer, clock, group, action;

    anim.do_start = async () => {
        clock = new THREE.Clock();
        group = await ModelTools.getResource( source );
        if( group && group.animations && group.animations.length ) {
            mixer = new THREE.AnimationMixer( group );
            action = mixer.clipAction( group.animations[0] );
            action.play();
        }
    }

    anim.do_kill = () => {
        if( mixer ) mixer = null;
    }

    anim.do_modify = () => {
        const delta = clock.getDelta();
        anim.do_progress(delta);
        if ( mixer ) mixer.update( delta );
    }

    return anim;
}

function keyorder( event ) {
    if( event.code === 'Escape' ) {
        animation_do( 'stop' );
    }

    if( event.code === 'Space' ) {
        if( anim_root.paused ) { animation_do( 'resume' ); }
        else { animation_do( 'pause' ); }
    } else {
        if( anim_root.paused ) { animation_do( 'resume' ); }
    }

    if( keypool ) keypool.handle( event );
}

function animation_do( cmd, ref ) {

    if( cmd === 'start' || cmd === 'stop' ) {
        if( anim_root ) {
            window.removeEventListener( 'keydown', keyorder );
            anim_root.kill();
            anim_root = null;
            ROUTE.send( 'animation_status', 'stop' );
        }
        app.mode = 'editmode';
    }

    if( cmd === 'start' ) {
        if( ref.type === 'presentation' ) {
            ROUTE.send( 'animation_status', 'start' );
            window.addEventListener( 'keydown', keyorder );
            anim_root = animations.presentation( ref );
            anim_root.modifiers = [];
            anim_root.start();
            app.mode = 'playmode';
        }
        return;
    }

    if( anim_root ) {
        if( cmd === 'pause' || cmd === 'resume' ) {
            ROUTE.send( 'animation_status', cmd );
            anim_root.paused = true;
            anim_root[cmd]();
            return;
        }

        if( anim_focus ) {
            const pserial = getParentSerial( anim_focus );
            if( pserial ) {
                if( cmd === 'prev' ) pserial.prev();
                if( cmd === 'next' ) pserial.next();
                if( cmd === 'ok' ) pserial.select();
            }
        }
    }
}


let app;

export function subroute() {
    const sub = ROUTE.route( 'animation' );
    app = ROUTE.app;

    sub.registry( 'animation', ( options ) => {
        animation_do( options.cmd, options.ref );
    } );
}

export function modify() {
    if( anim_root ) {
        if( anim_root.status === 2 ) {
            animation_do( 'stop' );
        } else {
            if( !anim_root.paused ) {
                anim_root.modifiers.forEach( ( anim ) => {
                    if( anim.status === 2 ) {
                        const index = anim_root.modifiers.indexOf( anim );
                        if (index > -1) anim_root.modifiers.splice( index, 1 );
                    } else {
                        anim.do_modify();
                        dbg( 'modify', anim );
                    }
                } );
            }
        }
    }
}