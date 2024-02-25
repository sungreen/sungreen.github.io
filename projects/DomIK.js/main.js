import * as THREE from './vendor/three.module.min.js';
import GUI  from './vendor/lil-gui.module.min.js';

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
    version: "1.06",
    reload: function() { window.location.reload(); },
    about: function() { alert(options.name+" ("+options.version+")"); },
    download: downdloadOptions, 
    source: "Fisheye",
    preset: "Dome 2.5 Mirror 0.25",
    screen: {
        scale: 1,
        vert: 0,
        horz: 0
    }
}

const controls = {
    setup: {},
    screen: {}
}

function init() {

    const gui = new GUI();
    gui.title( options.name )
    gui.onChange( event => { updateOptions( event );} );
    gui.add( options, 'source', ["*Flat", "Fisheye", "*Equirectangular", "*Mirror ball", "*Cubemap"] ).onChange( value=> {changePreset( value );} );
    gui.add( options, 'preset', ["Dome 2.5 Mirror 0.25", "Dome 5.0 Mirror 0.37", "Expert", "Custom"] ).onChange( value=> {changePreset( value );} );
    controls.setup = gui.addFolder( 'Setup' ).close();
    controls.screen = gui.addFolder( 'Screen' ).close();
    controls.screen.add( options.screen, 'scale', 0.1, 10, 0.01 );
    controls.screen.add( options.screen, 'vert', -1.0, 1.0, 0.01 );
    controls.screen.add( options.screen, 'horz', -1.0, 1.0, 0.01 );
    const tools = gui.addFolder( 'Tools' ).close();
    tools.add( options, 'reload' ).name("Reload Page");
    tools.add( options, 'download' ).name("Export DomIK/Blender");
    gui.add( options, 'about' ).name("About");

    options.gui = gui;

    DOMIK.init( options, controls.setup );
    WARP_WIRE.init( options, controls.screen );
    WARP_TEXTURE.init( options, controls.screen );

    setPreset( "Dome 2.5 Mirror 0.25" );

    const scene = new THREE.Scene();
    const aspect = window.innerWidth / window.innerHeight;
    const size = 2;
    const width = size*aspect;
    const height = size;
    const camera = new THREE.OrthographicCamera( -width/2, width/2, height, 0, 0.001, 1000 );
    const render = new THREE.WebGLRenderer();
    render.setSize( window.innerWidth, window.innerHeight );

    const container = document.getElementById( 'container' );
    container.appendChild( render.domElement );
    options.root = new THREE.Group();
    options.camera = camera;
    options.render = render;
    options.scene = scene;
    scene.add( options.root );
}

function updateDisplay( gui ) {
    for (let i in gui.controllers) {
        const controller = gui.controllers[i];
        controller.updateDisplay();
        console.log(controller.property,":",controller.object[controller.property]);
    }
    for (let f in gui.folders) {
        updateDisplay(gui.folders[f]);
    }
}

function updateOptions( event ) {
    update();
}

function changePreset( preset ) {
    setPreset( preset );
    update();
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
//            domik.screen.scale = 1.17;
        }
    }
}

function renderScene() {
    options.render.render( options.scene, options.camera );
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
    renderScene();
}

function animate() {
    requestAnimationFrame( animate );
    const app = options;
    app.scene.scale.set( app.screen.scale, app.screen.scale, app.screen.scale );
    app.scene.position.x = app.screen.horz;
    app.scene.position.y = app.screen.vert;
    renderScene();
}

function dropZone( _doc_, _zone_) {
    const dropZone = _doc_.querySelector("#dropzone");
    const input = _doc_.querySelector("input");
    let file;

    _doc_.addEventListener("dragover", (ev) => ev.preventDefault());
    _doc_.addEventListener("drop", (ev) => ev.preventDefault());
  
    dropZone.addEventListener("drop", (ev) => {
        ev.preventDefault();
        file = ev.dataTransfer.files[0];
        handleFile(file);
    });
  
    dropZone.addEventListener("click", () => {
        input.click();
        input.addEventListener("change", () => { file = input.files[0]; handleFile(file); });
    });
  
    const handleFile = (file) => {
        document.getElementById( 'textzone' ).innerHTML = ""
        if( document.getElementById( 'videozone' ) ) document.getElementById( 'videozone' ).remove();
        if( document.getElementById( 'imagezone' ) ) document.getElementById( 'imagezone' ).remove();
        if ( file.type === "text/html" || file.type === "text/css" || file.type === "text/javascript" ) return;
        const type = file.type.replace(/\/.+/, "");
        switch (type) {
            case "image":
                createImage(file);
                break;
            case "video":
                createVideo(file);
                break;
            default:
                document.getElementById( 'textzone' ).innerHTML = "Unknown File Format";
            break;
        }
    };

    const createImage = (image) => {
        const _image_ = _doc_.createElement("img");
        _image_.setAttribute("id", "imagezone");
        _image_.src = URL.createObjectURL(image);
        _zone_.append(_image_);
        URL.revokeObjectURL(_image_);
        _image_.onload = () => { update(); }
        update();
    };

    const createVideo = (video) => {
        const _video_ = _doc_.createElement("video");
        _video_.setAttribute("id", "videozone");
        _video_.setAttribute("controls", "");
        _video_.setAttribute("loop", "true");
        _video_.src = URL.createObjectURL(video);
        _zone_.append(_video_);
      //videoEl.play();
        URL.revokeObjectURL(_video_);
        _video_.onload = () => { update(); }
        update();
    };
}

function main() {
    dropZone( document, document.getElementById( 'sourcezone' ) );
    init();
    update();
    animate();
}

main()