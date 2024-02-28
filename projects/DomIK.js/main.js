import * as THREE from './vendor/three.module.min.js';
import * as GUI from './gui/src/index.js';

import * as DOMIK from './core_domik.js'
import * as WARP_WIRE from './core_warp_wire.js'
import * as WARP_TEXTURE from './core_rewarp.js'

function downdloadOptions() {
    const link = document.createElement("a");
    const content = JSON.stringify(DOMIK.get_options());
    const file = new Blob([content], { type: 'text/plain' });
    link.href = URL.createObjectURL(file);
    link.download = "domik_options.txt";
    link.click();
    URL.revokeObjectURL(link.href);
}

const options = {
    name: "DomIK.JS",
    version: "1.08",
    reload: function() { window.location.reload(); },
    download: downdloadOptions, 
    source: "Fisheye",
    preset: "Dome 2.5 Mirror 0.25",
    screen: { scale: 1, vert: 0, horz: 0 },
    content: null,
}

function init() {
    const logo = document.getElementById( 'logo' );
    logo.addEventListener( 'click', () => { alert(options.name+" ("+options.version+")"); });

    const gui = new GUI.GUI();
    gui.title( options.name )
    gui.onChange( event => { updateOptions( event );} );

    gui.add( options, 'preset', ["Dome 2.5 Mirror 0.25", "Dome 5.0 Mirror 0.37", "Expert", "Custom"] ).onChange( value=> {changePreset( value );} );

    const playFolder = gui.addFolder( 'Player' );
    playFolder.addFile( options, 'content', 'image/*, video/*' ).onChange( () => { needUpdate(); });;
    playFolder.addPlayer( options, 'content' ).listen();
    playFolder.add( options, 'source', ["x Flat", "Fisheye", "x Equirectangular", "x Mirror ball", "x Cubemap"] ).onChange( value=> {changePreset( value );} );

    const screenFolder = gui.addFolder( 'Screen' ).close();
    screenFolder.add( options.screen, 'scale', 0.1, 10, 0.01 );
    screenFolder.add( options.screen, 'vert', -1.0, 1.0, 0.01 );
    screenFolder.add( options.screen, 'horz', -1.0, 1.0, 0.01 );

    const setupFolder = gui.addFolder( 'Setup' ).close();

    const toolsFolder = gui.addFolder( 'Tools' ).close();
    toolsFolder.add( options, 'reload' ).name("Reload Page");
    toolsFolder.add( options, 'download' ).name("Export DomIK/Blender");

    options.gui = gui;

    DOMIK.init( options, setupFolder );
    WARP_WIRE.init( options, screenFolder );
    WARP_TEXTURE.init( options, screenFolder );

    setPreset( "Dome 2.5 Mirror 0.25" );

    const scene = new THREE.Scene();
    const camera = new THREE.OrthographicCamera( -1, 1, 2, 0, 0.001, 1000 );
    const renderer = new THREE.WebGLRenderer();

    const container = document.getElementById( 'container' );
    container.appendChild( renderer.domElement );
    options.root = new THREE.Group();
    options.camera = camera;
    options.renderer = renderer;
    options.scene = scene;
    scene.add( options.root );

    window.addEventListener('resize', updateSize );
    updateSize();
}

function updateSize() {
    const app = options;
    if( app.renderer ) {
        const aspect = window.innerWidth / window.innerHeight;
        const fullWidth = window.innerWidth;
        const fullHeight = window.innerHeight;
        const virtWidth = fullWidth/aspect;
        app.renderer.setSize( fullWidth, fullHeight );
        app.camera.setViewOffset( virtWidth, fullHeight, (virtWidth-fullWidth)/2, 0, fullWidth, fullHeight );
    }
    needUpdate();
}

function needUpdate() {
    update();
}

function updateDisplay( gui ) {
    for (let i in gui.controllers) {
        const controller = gui.controllers[i];
        controller.updateDisplay();
    }
    for (let f in gui.folders) {
        updateDisplay(gui.folders[f]);
    }
}

function updateOptions( event ) {
    needUpdate();
}

function changePreset( preset ) {
    setPreset( preset );
    needUpdate();
}

function setPreset( preset ) {
    const domik = DOMIK.get_options();
    if ( preset === null ) {
    } else {
        if( preset == "Dome 2.5 Mirror 0.25" ) {
            domik.dome.radius = 2.5;
            domik.mirror.radius = 0.25;
            domik.projector.offset = 0.5;
        }
        if( preset == "Dome 5.0 Mirror 0.37" ) {
            domik.dome.radius = 5.0;
            domik.mirror.radius = 0.37;
            domik.projector.offset = 0.6;
        }
        if( preset == "Expert" ) {
            domik.dome.radius = 100.0;
            domik.mirror.radius = 0.01;
            domik.projector.offset = 1.0;
        }
    }
}

function update() {
    DOMIK.update( options );
    WARP_WIRE.update( options );
    WARP_TEXTURE.update( options );

    options.camera.position.z = 100;
    options.scene.remove( options.root );
    options.root = new THREE.Group();
    options.scene.add( options.root );

    if ( WARP_TEXTURE.get_options().background ) {
        const warp = WARP_TEXTURE.get_shape( options );
        options.root.add( warp );
    }
    if ( WARP_WIRE.get_options().wireframe ) {
        const warp = WARP_WIRE.get_shape( options );
        options.root.add( warp );
    }
    updateDisplay( options.gui );
}

function animate() {
    requestAnimationFrame( animate );
    const app = options;
    app.scene.scale.set( app.screen.scale, app.screen.scale, app.screen.scale );
    app.scene.position.x = app.screen.horz;
    app.scene.position.y = app.screen.vert;
    options.renderer.render( options.scene, options.camera );
}

function main() {
    init();
    update();
    animate();
}

main()