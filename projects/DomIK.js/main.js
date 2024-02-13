import * as THREE from './vendor/three.module.min.js';
import GUI  from './vendor/lil-gui.module.min.js';

import * as DOMIK from './core_domik.js'
import * as WRAP_WIRE from './core_wrap_wire.js'
import * as WRAP_TEXTURE from './core_wrap_texture.js'

var WRAP = null;

// GUI

const app_options = {
    name: "DomIK.JS",
    version: "1.05b",
    reload: function() { window.location.reload(); },
    about: function() { const app = app_options; alert(app.name+" ("+app.version+")"); },
    preset: "Custom",
    mode: "Wire"
}

function updateOptions( event ) {
    const app = app_options;
    updateScene( app );
}

function presetOptions( preset, mode ) {
    presetApp( preset, mode );
}

function initGUI( app ) {
    const domik = DOMIK.get_options();

    const gui = new GUI();
    gui.title( app.name )
    gui.onChange( event => {updateOptions( event );} );

    const fol0 = gui.addFolder( 'Setup' );
    fol0.add( app, 'preset', ["Dome 2.5 Mirror 0.25", "Dome 5.0 Mirror 0.37", "Expert", "Custom"] ).onChange( value=> {presetOptions( value, null );} );

    const fol1 = fol0.addFolder( 'Dome' );
    fol1.add( domik.dome, 'radius', 2, 5, 0.1 );

    const fol2 = fol0.addFolder( 'Mirror' );
    fol2.add( domik.mirror, 'radius', 0.1, 0.5, 0.01 );
    fol2.add( domik.mirror, 'offset', -1, 1, 0.01 );
    fol2.add( domik.mirror, 'elevation', -1, 1, 0.01 );

    const fol3 = fol0.addFolder( 'Projector' );
    fol3.add( domik.projector, 'offset', 0.1, 1, 0.01 );
    fol3.add( domik.projector, 'elevation', -1, 1, 0.01 );

    const fol4 = gui.addFolder( 'Screen' );
    fol4.add( domik.screen, 'scale', 0.1, 10, 0.01 );
    fol4.add( domik.screen, 'vert', -1.0, 1.0, 0.01 );
    fol4.add( domik.screen, 'horz', -1.0, 1.0, 0.01 );
    fol4.add( app, 'mode', ["Wire", "Image0", "Image1", "Video0", "Video1", "Video2", "Video3"] ).onChange( value=> {presetOptions( null, value );} );

    const fol5 = gui.addFolder( 'Tools' );
    fol5.add( app, 'reload' ).name("Reload page");
    fol5.add( app, 'about' ).name("About");

    app.gui = gui;
}

function updateDisplay( gui ) {
    for (let i in gui.controllers) {
        gui.controllers[i].updateDisplay();
    }
    for (let f in gui.folders) {
        updateDisplay(gui.folders[f]);
    }
}

function updateGUI( app ) {
    updateDisplay( app.gui );
    // if( app.preset=="Custom" ) {
    //     app.gui.fol1.show();
    //     app.gui.fol2.show();
    //     app.gui.fol3.show();
    // } else {
    //     app.gui.fol1.hide();
    //     app.gui.fol2.hide();
    //     app.gui.fol3.hide();
    // }
}

// APP

function presetApp( preset, mode ) {
    const domik = DOMIK.get_options();

    const app = app_options;
    if ( preset === null ) {
    } else {
        if( preset == "Dome 2.5 Mirror 0.25" ) {
            domik.dome.radius = 2.5;
            domik.mirror.radius = 0.25;
            domik.projector.offset = 0.5;
            domik.screen.scale = 1.17;
        }
        if( preset == "Dome 5.0 Mirror 0.37" ) {
            domik.dome.radius = 5.0;
            domik.mirror.radius = 0.37;
            domik.projector.offset = 0.6;
            domik.screen.scale = 1.17;
        }
        if( preset == "Expert" ) {
            domik.dome.radius = 100.0;
            domik.mirror.radius = 0.01;
            domik.projector.offset = 1.0;
            domik.screen.scale = 1.17;
        }
    }

    if ( mode === null ) {
    } else {
        if( mode == "Wire" ) {
            WRAP = WRAP_WIRE;
        } else {
            WRAP = WRAP_TEXTURE;
            WRAP.get_options().mode = mode;
        }
    }
	updateScene( app );
	updateGUI( app );
}

function initScene( app ) {
    const scene = new THREE.Scene();
    const aspect = window.innerWidth / window.innerHeight;
    const size = 2;
    const width = size*aspect;
    const height = size;
    const camera = new THREE.OrthographicCamera( -width/2, width/2, height, 0, 0.001, 1000 );
    const render = new THREE.WebGLRenderer();
    render.setSize( window.innerWidth, window.innerHeight );

    document.body.appendChild( render.domElement );
    app.scene = scene;
    app.camera = camera;
    app.render = render;
}

function renderScene( app ) {
    app.render.render( app.scene, app.camera );
}

function updateScene( app ) {
    DOMIK.recalc();
    while(app.scene.children.length > 0){ 
        app.scene.remove(app.scene.children[0]); 
    }
    const wrap = WRAP.get_root( app );
    wrap.rotation.y = Math.PI/2;
    app.camera.position.z = 100;
    app.scene.add( wrap );
    app.root = wrap;
    renderScene( app );
}

function animate() {
    requestAnimationFrame( animate );
    
    const domik = DOMIK.get_options();
    const app = app_options;

    app.root.scale.set( 0, domik.screen.scale, domik.screen.scale );
    app.root.position.x = domik.screen.horz;
    app.root.position.y = domik.screen.vert;
    renderScene( app );
}

function main() {
    const app = app_options;
    initScene( app );
    initGUI( app );

    presetApp( 'Custom', 'Wire' );
    updateScene( app );

    animate();
}

main()