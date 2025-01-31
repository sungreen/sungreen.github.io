import * as ROUTE from './subroute.js'

import { exdata } from '../../static/settings.js'
import { dict } from '../../static/settings.js'
import { setPreset } from '../../static/settings.js'

import * as Storage from '../storage.js'

import { nInputFile } from '../ndiv.js'
import { nLink } from '../ndiv.js'
import { nDiv } from '../ndiv.js'
import { nIcon } from '../ndiv.js'
import { nImage } from '../ndiv.js'
import { nText } from '../ndiv.js'
import { nHref } from '../ndiv.js'
import { nButton } from '../ndiv.js'
import { nPanel } from '../ndiv.js'
import { nFolder } from '../ndiv.js'
import { setOnChange } from '../ndiv.js'
import { setClasses } from '../ndiv.js'
import { setParent } from '../ndiv.js'
import { setLang } from '../ndiv.js'
//import { addWidget } from '../ndiv.js'
import { updateWidgets } from '../ndiv.js'

function mkCanvas( el, classes, styles, show=true ) {
    return nVisual( el, show, classes, styles );
}

function changeDemoset( demo, onload ) {
    if( exdata.data ){
        if( exdata.type=='video' ) {
            exdata.data.pause();
            exdata.data.removeAttribute( 'src' );
            exdata.data.load();
        }
        exdata.data.remove();
    }

    app.options.transformType = ( demo.transformType ) ? demo.transformType : null;
    app.options.wireframe = ( demo.transformType ) ? demo.wireframe : false;
    app.options.scope = ( demo.scope ) ? demo.scope : app.options.scope;


    exdata.type = ( demo.type ) ? demo.type : 'video';
    exdata.file = ( demo.file ) ? demo.file : null;

    switch ( exdata.type ) {
    case 'video':
        exdata.data = document.createElement( 'video' );
        exdata.data.setAttribute( 'controls', '' );
        exdata.data.setAttribute( 'loop', 'true');
        exdata.data.src = demo.content?demo.content:URL.createObjectURL( exdata.file );
        if( onload ) onload();
        break;
    case 'image':
        exdata.data = document.createElement( 'img' );
        exdata.data.onload = onload;
        exdata.data.src = demo.content?demo.content:URL.createObjectURL( exdata.file );
        break;
    }
    if( exdata.data ) {
        URL.revokeObjectURL( exdata.data );
    }
    app.tmp.cubik_ready = false;
}

function mkGallery( el, content, onload ) {
    const gallery = nDiv( el, 'frame', {'max-height':'70vh'} );
    gallery.do_change = ( demo )=>{ changeDemoset( demo, onload ); }

    const categories = {};

    const cont = nDiv( gallery, 'column' );

    for(var index in content){
        const demo = content[index];
        if( !(demo.category in categories) ) {
            categories[demo.category] = nFolder( cont, demo.category );
            categories[demo.category].do_close();
        }
        const category = categories[demo.category];
        const source = nDiv( category, 'row margin bar' );
        const image = nImage( source, demo.image, 'pointer margin', { 'height':'10vh' } );
        nLink( image, 'click', gallery.do_change, demo );

        const panel = nDiv( source, 'column', { 'height':'100%' } );
        nHref( panel, demo.title, demo.source, 'margin' );
        nHref( panel, demo.author, demo.chanel, 'margin' );
    }
    return gallery;
}

// function mkInputFile() {
//     const el = document.createElement( 'input' );
//     el.setAttribute( 'type', 'file' );
//     el.setAttribute( 'style', 'display:none' );
//     el.setOnLoad = ( onload )=> {
//         el.addEventListener(
//             'change',
//             () => {
//                 const file = el.files[0];
//                 if( onload ) onload( file );
//             },
//             false
//         );
//     }
//     el.do_select = ()=> { el.click(); }
//     return el;
// }

function mkOptionsFile() {
    const el = nInputFile( ( file ) =>{
        Storage.readFromFile( app, file );
        setLang( app.interface.lang );
        updateWidgets();
    } );
    return el;
}

function mkMediaFile( onload ) {
    const el = nInputFile( ( file ) =>{
        const len = file.name.length;
        const num = 10;
        const label = len<num*2 ? file.name : file.name.substring(0,num) + " ... " + file.name.substring(len-num+1, len);
        const type = file.type.replace(/\/.+/, "");
        const demo = { type: type, content: null, file: file, transformType: el.transformType, title: label };
        changeDemoset( demo, onload );
    } );
    return el;
}

function mkPlayer( el, styles ) {
    const canvas = mkCanvas( el, 'canvas', styles );
    //canvas.do_hide();

    //const player = addWidget( canvas, dict.player, options, 'player' );
    const player = addWidget( canvas, dict.player );
    player.do_open();

    canvas.do_change = ()=> {
        if( exdata.data ) {
            player.innerHTML = '';
            setParent( exdata.data, player );
            nIcon( player );
            canvas.do_show();
        }
        if( exdata.type=='video' ){
            exdata.data.play();
        }
        setClasses( exdata.data, 'player-content' );
    }

    const pp = nPanel( player.cellar );
    const p0 = nButton( pp, '⏪' );
    const p1 = nButton( pp, '⏸' );
    const p2 = nButton( pp, '⏩' );

    nLink( p0, 'click', ()=>{ exdata.data.currentTime -= 15; } );
    nLink( p1, 'click', ()=>{ if( exdata.data.paused ) { p1.label.text('⏸'); exdata.data.play(); } else { p1.label.text('⏯'); exdata.data.pause(); } } );
    nLink( p2, 'click', ()=>{ exdata.data.currentTime += 15; } );

    return canvas;
}

var helper_1 = "Уменьшите масштаб страницы до 25-33% для лучшего отображения, Ctrl -"


function mkFilesMenu( el, do_play ) {
    const files = addWidget( el, dict.files );
    const mediaFile =  mkMediaFile( do_play );
    nLink( files.fisheye, 'click', ()=>{ mediaFile.transformType = 'Fisheye'; mediaFile.do_select(); updateWidgets();  } );
    nLink( files.equirectangular, 'click', ()=>{ mediaFile.transformType = 'Equirectangular'; mediaFile.do_select(); updateWidgets(); } );
    nLink( files.cubemap, 'click', ()=>{ mediaFile.transformType = 'Cubemap'; mediaFile.do_select(); updateWidgets(); } );
    nLink( files.cinerama, 'click', ()=>{
        if( helper_1) {
            confirm(helper_1); helper_1=null;
        };
        if( !helper_1) {
            mediaFile.transformType = 'Cinerama';  mediaFile.do_select(); updateWidgets();
        }
    } );
}

function ExportOptions() {
    const link = document.createElement("a");
    const content = JSON.stringify(options);
    const file = new Blob([content], { type: 'text/plain' });
    link.href = URL.createObjectURL(file);
    link.download = "domik_options.json";
    link.click();
    URL.revokeObjectURL(link.href);
}

function mkSettingsMenu( el ) {
    const wg = addWidget( el, dict.settings, app, null, app.update );

    setClasses( wg.preset, 'margin border' );
    setOnChange( wg.preset, (n,p)=>{ setPreset( n ); updateWidgets(); });

    const optionsFile = mkOptionsFile( app );
    nLink( wg.export, 'click', ()=>{ ExportOptions(); } );
    nLink( wg.import, 'click', ()=>{ optionsFile.do_select(); } );
    nLink( wg.interface.app_lang.ru, 'click', ()=>{ app.interface.lang='ru'; setLang( app.interface.lang ); } );
    nLink( wg.interface.app_lang.en, 'click', ()=>{ app.interface.lang='en'; setLang( app.interface.lang ); } );
}

function mkSplash( el, styles ) {
    const canvas = mkCanvas( el, 'canvas splash', styles );
    const splash = nText( canvas, 'ОТКРЫТЫЙ ПЛАНЕТАРИЙ 2.0', 'text', { 'margin': '2vh', 'font-size':'6.6vw' } );
    return canvas;
}

// function mkDesktop( el ) {
//     app.threejs = nDiv( el, '', { 'position':'absolute', 'left': '0', 'width':'100%', 'height':'100%' }, 'canvas' );
//     app.desktop = nDiv( el, '', { 'position': 'absolute', 'top': '0', 'width': '100%', 'z-index': '1', 'padding': '0'} );

//     const views = app.views;
//     if( views ){
//         for( let v in views ) {
//             const view = views[v];
//             const styles = { 'position':'absolute', 'margin-left':(100*view.left)+'vw', 'margin-top':(100*(1-view.height-view.bottom))+'vh', 'width':(100*view.width)+'vw', 'height':(100*view.height)+'vh'};
//             view.canvas = nDiv( app.desktop, 'border', styles );
//         }
//     }

// }

let app;

export function subroute() {
    const sub = ROUTE.route( 'gui' );
    app = ROUTE.app;

    sub.registry( 'init', ( options ) => {
        sub.canvas = nDiv( null, 'column' );
        //mkDesktop( document.body, app );
        // setLang( app.interface.lang );
        // mkDesktop( app );
        // const canv = addWidget( nDiv( mkCanvas( 'canvas' ) , 'column'), dict.app, app, 'app' );
        // canv.do_open();
        // mkSplash( { 'width':'100vw', 'height':'20vh', 'margin-top':'80vh' } );
        // const player = mkPlayer( { 'width':'15vw', 'max-height':'15vw', 'margin-left':'85vw' } );
        // const do_play = ()=>{ app.tmp.domik_ready = false; player.do_change(); canv.do_close(); }
        // mkGallery( canv.menu.gallery, demoset, do_play, app );
        // mkFilesMenu( canv.menu.files, do_play, app );
        // mkSettingsMenu( canv.menu.settings, app );
        // if( app.content ){
        //     const source = app.content;
        //     const type = app.type ? app.type : 'video';
        //     const transformType = app.transformType ? app.transformType: 'Original';
        //     const demo = { type: type, content: source, file: null, transformType: transformType };
        //     changeDemoset( demo, do_play, app );
        // }
    } );

    sub.registry( 'set_view', ( options ) => {
        const view = options.view;
        if( view.mode === 'domik-menu' ) {
            const canvas = view.canvas;
            setLang( app.interface.lang );
                //mkDesktop( canvas, app );
                //const canv = addWidget( nDiv( mkCanvas( 'canvas' ) , 'column'), dict.app, app, 'app' );
                // const canv = addWidget( nDiv( canvas , 'column'), dict.app, app, 'app' );
            const canv = addWidget( nDiv( mkCanvas( canvas, 'canvas' ) , 'column'), dict.app, app, 'app' );
            canv.do_open();
            mkSplash( canvas, { 'width':'100vw', 'height':'20vh', 'margin-top':'80vh' } );
            const player = mkPlayer( canvas, { 'width':'15vw', 'max-height':'15vw', 'margin-left':'85vw' } );
            const do_play = ()=>{ app.tmp.domik_ready = false; player.do_change(); canv.do_close(); }
            mkGallery( canv.menu.gallery, demoset, do_play );
            mkFilesMenu( canv.menu.files, do_play );
            mkSettingsMenu( canv.menu.settings );
            if( app.content ){
                const source = app.content;
                const type = app.type ? app.type : 'video';
                const transformType = app.transformType ? app.transformType: 'Original';
                const demo = { type: type, content: source, file: null, transformType: transformType };
                changeDemoset( demo, do_play );
            }
        }
    } );

    sub.registry( 'modify', ( options ) => {
        document.documentElement.style.setProperty( "--tone", app.interface.tone );
        document.documentElement.style.setProperty( "--base-size", parseFloat( app.interface.size )+'vh' );
        document.documentElement.style.setProperty( "--font-family", app.interface.font );
    } );

    return sub;
}