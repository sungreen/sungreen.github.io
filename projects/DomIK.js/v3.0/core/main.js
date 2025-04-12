import * as SETS from '../static/settings.js'
import * as THREE from 'three';

import * as ROUTE from './subroute/subroute.js'
import * as CUBIK from './subroute/cubik.js'
import * as PRESS from './subroute/project.js'
import * as GUI from './subroute/gui_press_ed.js'
import * as MODEL from './subroute/model.js'
import * as ANIM from './subroute/animation.js'
import * as LAYOUT from './subroute/layout.js'

import * as Storage from './storage.js'
import { setStyles } from './ndiv.js';

Array.prototype.clear = function() { this.length = 0; }
Array.prototype.removeOf = function( value ) { var index = this.indexOf( value ); if ( index !== -1 ) { this.splice( index, 1); } }

function mkWindowManager( app ) {
    const sub = ROUTE.route( 'windows' );
    if( app.views ) app.views = {};

    sub.registry( 'registry_view', ( options ) => {
        const view = options.view;
        const mode = view.mode ? view.mode : 'default';
        app.views[mode] = view;
        view.enable = true;
        ROUTE.send( 'set_view', { view: view } );
    } );
}

import { nDiv, updateWidgets } from './ndiv.js'

function main( room ) {
    const app = ROUTE.createApp();
    app.session.room = room;

    Storage.readDefault( app, SETS.app );
    Storage.readFromURL( app );

    mkWindowManager( app );

    CUBIK.subroute();
    PRESS.subroute();
    MODEL.subroute();
    LAYOUT.subroute();
    GUI.subroute();
    ANIM.subroute();

    ROUTE.send( 'ops_db', { mode: 'restore' } );
    ROUTE.send( 'init' );

    const threejs = nDiv( document.body, '', { 'position': 'absolute', 'width': '100%', 'height': '100%', 'z-index': '100', }, 'canvas' );

    app.renderer = new THREE.WebGLRenderer( { canvas: threejs, antialias: true } );
    app.renderer.setClearColor( 0x000000, 0 );
    app.renderer.setPixelRatio( window.devicePixelRatio );
    app.data.background = new THREE.Color( 0xff0000 );
    app.data.windowWidth = 0;
    app.data.windowHeight = 0;
    app.data.mouse = { value: new THREE.Vector2() };

    ROUTE.send( 'setup', {} );

    app.modify = () => {
        CUBIK.modify();
//        ANIM.modify();

        const width = threejs.clientWidth;
        const height = threejs.clientHeight;
        if ( threejs.width !== width || threejs.height !== height ) {
            app.renderer.setSize( width, height, false );
        }
    
        threejs.style.transform = `translateY(${window.scrollY}px)`;
    
        app.renderer.setRenderTarget( null );
        app.renderer.clear();
        app.renderer.setClearColor( 0x000000, 0 );
        app.renderer.setScissorTest( false );
        app.renderer.clear();
        app.renderer.setClearColor( 0x000000, 0 );
        app.renderer.setScissorTest( true );

        for( const [mode, view] of Object.entries( app.views ) ) {
            view.show = ( view.canvas.style.display !== 'none' );
            if( view.show && view.enable ) {
                if( view.camera ) {
                    const element = view.canvas;
                    //element.style.zIndex = 20;
                    const rect = element.getBoundingClientRect();
                    if ( rect.bottom < 0 || rect.top > app.renderer.domElement.clientHeight ||
                        rect.right < 0 || rect.left > app.renderer.domElement.clientWidth ) {
                        return;
                    }
                    const margin = 10;
                    const width = ( rect.right - rect.left ) - 2 * margin;
                    const height = ( rect.bottom - rect.top ) - 2 * margin;
                    const left = rect.left + margin;
                    const bottom = app.renderer.domElement.clientHeight - rect.bottom + margin;
                    view.bound = { width:width, height:height, left:left, bottom:bottom };

                    app.renderer.setViewport( left, bottom, width, height );
                    app.renderer.setScissor( left, bottom, width, height );
                    view.camera.setViewOffset( height, height, ( height-width/2 )/2, height/4, width/2, height/2 );
                    view.camera.updateProjectionMatrix();
                    view.camera.layers.enableAll();
    
                    if( view.controls ) view.controls.update();
                    app.renderer.render( view.scene, view.camera );
                }
            }
        }
        updateWidgets();
    }

    ROUTE.run();
}

const options = getHrefOptions( document.location.href );
const room = options.roomid? Number(options.roomid): 775;
main( room );