'use strict';

import * as ROUTE from './subroute.js'

import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

import { nWidget, nPanels, setOverflow, setHeight, setWidth, nFrame, nHierlist, nTextArea, nTrigger, nSelector, setLabel, setEnable, doVisual, setStyles } from '../ndiv.js'
import { nDiv } from '../ndiv.js'
import { nIcon } from '../ndiv.js'
import { nText } from '../ndiv.js'
import { nButton } from '../ndiv.js'
import { doHide, doShow } from '../ndiv.js';
import { nFolder } from '../ndiv.js'
import { nTabs } from '../ndiv.js'
import { setClasses } from '../ndiv.js'
import { setParent } from '../ndiv.js'
import { rgb2rgbtxt } from '../utils.js'

import { JS, Ref, order_children } from './project.js';
import { getListRefObjects, getRefByMode, seekRefByType } from './model.js';

const data = {
    marker: null,
    focus: null,
    // updateProperty: async ( property, value ) => {}
}

const local = {
    project: null
}

Ref.property.new( data, { name: 'active', type: 'object' } );
Ref.property.new( data, { name: 'task', type:  'object' } );

function select( ref, flag=true ) {
    if( ref ) {
        if( ref.hier ) {
            ref.hier.item.style.backgroundColor = flag ? rgb2rgbtxt( 100, 100, 155 ) : null;
        }
    }
}

function mkHierEditor( el ) {
    const sub = ROUTE.route( 'ed_hiers' );
    const ed = el;

    const frame = nFrame( ed, 'grow border background margin' );
    const hier = nHierlist( frame, data.active );

    hier.drag = ( sour, dest ) => { ROUTE.send( 'ops_ref_edit', { ref: sour, dest: dest, mode: 'moveto' } ) }

    hier.helper_list = ( ref ) => {
//        const list = Ref.properties.getList( ref, JS.CHILDREN );
        const hooks = Ref.properties.getHooks( ref );

        // if( ref.type === 'link' ) {
        //     const targets = Ref.hooks.getList( ref,  );
        //     list.push( ...targets );
        // }

        // if( item.type === 'template' ) {
        //     const targets = Ref.getHooks( item );
        //     list.push( ...targets );
        // }

        return ( hooks.length ) ? hooks: null;
    }

    hier.set_helper = ( el, item ) => {
        const  ulist = hier.helper_list( item );
        if( ulist ) {
            if( item.type === 'template' ) {
                // const pn = nDiv( el, 'column template-background' );
                // const panel = nDiv( pn, 'column template-background margin-big border-helper' );
                // ulist.forEach( ( param ) => {
                //     const property = param.property;
                //     if( property.is_enable() ) {
                //         const rec = nDiv( panel, 'row' );
                //         nButton( rec, null, ( property.hook? 'hook': 'three' ), () => {
                //             if( property.hook ) {
                //                 delete property.hook;
                //             } else {
                //                 property.hook = true;
                //             }
                //             hier.changeValue( item, true );
                //         } );
                //         nText( rec, param.path.join( '.' ) );
                //     }
                // } );
            } else {
                const template = seekRefByType( item, 'template' );
                const pn = nDiv( el, 'column active-background' );
                const panel = nDiv( pn, 'column active-background margin-big border-helper' );
                ulist.forEach( ( param ) => {
                    const property = param.property;
                    if( property.enable() ) {
                        const rec = nDiv( panel, 'row' );
                        if( template ) {
                            const icon = ( property.hook )? ( property.hook === 'three' ? 'three': 'hook' ) : 'lock'; 
                            nButton( rec, null, icon, () => {
                                if( !property.hook ) {
                                    property.hook = 'three';
                                } else {
                                    if( property.hook === 'three' ) {
                                        property.hook = item.id;
                                    } else {
                                        delete property.hook;
                                    }
                                }
                                template.update();
                                hier.changeValue( item, true );
                            } );
                        }
                        nWidget( rec, property, param.path.join( '.' ) ) }
                    }
                );
            }
        }
    }

    hier.set_header = ( header, item ) => {
        if( !item.name.get ) return;
        let mods;
        let icon = item.type;
        let label = item.name? item.name.get(): item.type;

        if( item.model ) {
            switch( item.type ){
            case 'group':
                icon = 'group_' + item.group.mode.get();
                break;
            case 'text':
                label = item.text.get();
                break;
            case 'image':
            case 'video':
            case 'sound':
            case 'model3d':
                const p = item.source.get();
                if( p ) {
                    label = p.replace( /^.*[\\\/]/, '' );
                }
                break;
            case 'view':
                label = item.type + ' ' + item.mode.get();
                break;
            case 'project':
            case 'presentation':
            case 'slide':
            case 'template':
            case 'addon':
                break;
            case 'templates':
            case 'addons':
                label = item.type;
                break;
            case 'link':
                if( item.template_name ) label = '<< ' + item.template_name + ' >> ' + label;
                else label = ' ????? ' + label;
            }
        }

        // if( item.parent && item.parent.type === 'logic' ) {
        //     if( !item.parent.children.indexOf( item ) ) mods = 'animation';
        // }

        mods = ( item.model && item.model.group && item.model.group.visible )? 'visual':'';
        if( mods ) nIcon( header, mods );
        if( icon ) nIcon( header, icon );
        //nText( header, '(' + item.id + ') ' + label );
        // nText( header, item.type );
        nText( header, label );
    }

    hier.set_list = ( item ) => {
        const list = [];
        //if( item.children && !item.children_hide ) list.push( ...item.children );
        if( item.children ) list.push( ...item.children );
        return list;
    }

    hier.do_change = ( newValue, oldValue ) => {
        ROUTE.send( 'set_active', { ref: data.active.get() } );
    }

    sub.registry( 'needsUpdate', ( options ) => {
        hier.updateView();
    } );

    sub.registry( 'set_active', ( options ) => {
        hier.changeValue( options.ref );
    } );

    return ed;
}

function mkPropEditor( el ) {
    const sub = ROUTE.route( 'ed_props' );

    const ed = nTabs( el, sub.name, true );
    setClasses( ed, 'grow column frame' );

    sub.registry( 'set_active', ( options ) => {
        if( options && options.ref ) {
            const ref = options.ref;

            function info( panel ) {
                const pn = nDiv( panel, 'column hall wall grow' );
                const header = nDiv( pn, 'row alt-border' );
                const prop1 = nDiv( pn, 'alt-border column grow' );
                const prop2 = nDiv( pn, 'column grow' );
                const defns = nDiv( pn, 'column alt-border grow' );
                nIcon( header, ref.type );
                nText( header, ref.type );

                if( ref.type === 'animation' ) {
                    const pref = ref.parent;
                    nWidget( header, pref.animation_name );
                }

                Ref.properties.getList( ref ).forEach( ( rec ) => {
                    const [property, name, path] = rec;
                    let prop = property.type === 'properties'? prop2: prop1;
                    const widget = nWidget( prop, property, property.label );
                    if( widget ) {
                        widget.do_change = ( newValue, oldValue ) => {
                            ROUTE.send( 'ops_ref_update', { ref: ref } );
                        }
                    }
                } );

                // nTextArea( defns, makeReportLayout( ref ), 20, 40, 'frame' );
                    // nTextArea( defns, makeReportLayout( ref )
                    // define( obj ), 20, 40, 'noframe grow' );
            }

            ed.do_clear();
            const panel = ed;

            if( ref.type === 'link' ) {
                const panel_hooks = nDiv( panel, 'column hall wall grow hook-border' );
                nText( panel_hooks, ref.link_ref_id );
                // const template = ref.getTemplate();
                const hooks = Ref.properties.getHooks( ref );
                console.log( 'Hooks', hooks );
                hooks.forEach( ( rec ) => {
                    const [property, name, path] = rec;
                    nWidget( panel_hooks, property );
                } );
                if( ref.params ) {
                    ref.params.forEach( ( value, index ) => {
                        // console.log( 'param', value );
                    } );
                }
            } else {
                info( ed );
            }

            function frmt( x ) { return x? x.toFixed(2): '    '; }

            if( 1 ) {
                const lt = nDiv( panel, 'column hall wall grow hook-border' );
                nText( lt, 'Layout panel' );
                if( ref && ref.model && ref.model.group ){
                    const flex = ref.layout? ref.layout.flex: 'x';
                    const reflex = ref.layout? ref.layout.reflex: 'x';
                    const basis = ref.layout? ref.layout.basis: 'x';
                    const rect = ref.layout? ref.layout.rect: { x: 0, y: 0 };
                    const side = ref.layout? ref.layout.side: { x: 0, y: 0 };
                    const level = ref.layout? ref.layout.level: 'x';
                    const ilevel = ref.layout? ref.layout.floor: 'x';

                    const scale = ref.model._scale;
                    const position = ref.model._position;

                    nText( lt, '    group.scale ' + frmt(ref.model.group.scale.x) + ':' + frmt(ref.model.group.scale.y) );
                    nText( lt, '_flat level ' + level );
                    nText( lt, '_flat level ' + ilevel );
                    nText( lt,              '_flex:basis ' + flex + ':' + reflex + ':' + basis );
                    if(  side ) nText( lt,  '_______side ' + frmt( side.x ) + ':' + frmt( side.y ) );
                    if(  rect ) nText( lt,  '_______rect ' + frmt( rect.x ) + ':' + frmt( rect.y ) );
                    nText( lt,              '______scale ' + frmt( scale.x ) + ':' + frmt( scale.y ) );
                    nText( lt,              '___position ' + frmt( position.x ) + ':' + frmt( position.y ) );

                    if( ref.model.shape ) {
                        const size = ref.model._size;
                        nText( lt,          '____visible ' +  ref.model.shape.visible );
                        nText( lt,          '_______size ' + frmt( size.x ) + ':' + frmt( size.y ) );
                        nText( lt,          'shape.scale ' + frmt(ref.model.shape.scale.x) + ':' + frmt(ref.model.shape.scale.y) );
                    }
                }
            }
        }
    } );

    return ed;
}

function make_ui() {
    const ops = { create:{} }; 

    for( let type of getListRefObjects() ) {
        const name = type.toLowerCase();
        ops.create[name] = {
            info: type,
            icon: name,
            run: () => {
                const nref = { type:name };
                const options = { ref: nref, from: ( data.active.get()? data.active.get(): app.project.presentation ) };
                ROUTE.send( 'create_ref', { ref: nref, from: ( data.active.get()? data.active.get(): app.project.presentation ) } );
            }
        }
    }

    ops.edit = {
        moveup: { info: 'Move up', icon: 'arrow-up', run: () => { ROUTE.send( 'ops_ref_edit',   { ref: data.active.get(), mode: 'move-up' } ); } },
        movedown: { info: 'Move down', icon: 'arrow-down', run: () => { ROUTE.send( 'ops_ref_edit',   { ref: data.active.get(), mode: 'move-down' } ); } },
        copy: { info: 'Copy', icon: 'copy', run: () => { ROUTE.send( 'ops_ref_edit',   { ref: data.active.get(), mode: 'copy' } ); } },
        paste: { info: 'Paste', icon: 'paste', run: () => { ROUTE.send( 'ops_ref_edit',   { ref: data.active.get(), mode: 'paste' } ); } },
        cut: { info: 'Cut', icon: 'cut', run: () => { ROUTE.send( 'ops_ref_edit',   { ref: data.active.get(), mode: 'cut' } ); } },
        delete: { info: 'Delete', icon: 'delete', run: () => { ROUTE.send( 'ops_ref_edit',   { ref: data.active.get(), mode: 'delete' } ); } },
    }

    ops.file = {
        sync: { info: 'Sync', icon: 'sync', run: () => { ROUTE.send( 'ops_db', { mode: 'sync' } ); } },
        store: { info: 'Store', icon: 'store', run: () => { ROUTE.send( 'ops_db', { mode: 'store' } ); } },
        restore: { info: 'Restore', icon: 'restore', run: () => { ROUTE.send( 'ops_db', { mode: 'restore' } ); } },
        download: { info: 'Download', icon: 'download', run: () => { ROUTE.send( 'ops_db', { mode: 'download' } ); } },
        upload: { info: 'Upload', icon: 'upload', run: () => { ROUTE.send( 'ops_db', { mode: 'upload' } ); } },
        clear: { info: 'Clear', icon: 'clear', run: () => { ROUTE.send( 'ops_db', { mode: 'clear' } ); } }
    }

    return ops;
}

function mkTools( el ) {
    const sub = ROUTE.route( 'ed_tools' );

    const ed = el;
    const pn = nPanels( ed, /*sub.name,*/ 'column grow' );
    sub.registry( 'set_view', ( options ) => {
        const view = options.view;
        if( view.mode === 'press-editor' ) {
            pn.do_clear();
            const ops_ui = make_ui();
            for( let type_ops of ['Create', 'Edit', 'File' ] ) {
                const ops = ops_ui[type_ops.toLowerCase()];
                if( ops ) {
                    const panel = pn.addPanel( type_ops );
                    for( const [key, value] of Object.entries( ops ) ) {
                        if( value.info ) {
                            const bt = nButton( panel, value.info, value.icon, value.run, 'btr bbr' );
                        }
                    }
                    nText( panel, '...' );
                }
            }
        }
    } );

    return ed;
}

function mkViewport( el ) {
    const view = { mode: 'model-editor-viewport', canvas: el } 
    const sub = ROUTE.route( view.mode );

    const theme = {
        colorBase: 0xffffff,
        colorGrid: 0x2288ff,
        colorHead: 0xff8822,
        background: 0x333355
    }

    const radius = 1; // Universe unit 1R
    const scale = 3;
    const offset = radius * scale;
    const far = 4;

    // const mouse = new THREE.Vector2();
    // const raycaster = new THREE.Raycaster();

    const scene = new THREE.Scene();
    const object = new THREE.Group();
    scene.add( object );

    let viewpoint = 1;
    let helper_mode = 0;

    const viewCamera = new THREE.OrthographicCamera( -far, far, far, -far, 1, 2 * far );

    const orbitCamera = new THREE.PerspectiveCamera( 45, 1, 0.1, 100 );
    orbitCamera.position.set( offset, offset, offset );
    const controls = new OrbitControls( orbitCamera, el );
    controls.minDistance = radius * 0.1;
    controls.maxDistance = radius * 30;
    controls.target = new THREE.Vector3( 0, app.options.overhead, 0 );

    const divisions = 8;

    const orbitHelper = new THREE.Group();
    const gdome = new THREE.SphereGeometry( radius, 16, 9, 0, Math.PI * 2, 0, Math.PI/2 ); 
    const edome = new THREE.EdgesGeometry( gdome );
    const dome = new THREE.LineSegments( edome, new THREE.LineBasicMaterial( { color: theme.colorGrid } ) ); 
    orbitHelper.add( dome );
    const grid = new THREE.PolarGridHelper( radius, divisions, divisions, divisions*divisions, theme.colorBase, theme.colorGrid );
    orbitHelper.add( grid );
    const overhead = new THREE.Mesh( new THREE.SphereGeometry( radius*0.02, divisions, divisions ), new THREE.MeshBasicMaterial( { color: theme.colorHead } ) );
    orbitHelper.add( overhead );
    scene.add( orbitHelper );

    const viewHelper = new THREE.Group();
    const viewGrid = new THREE.GridHelper( divisions, divisions, theme.colorBase, theme.colorGrid );
    viewHelper.add( viewGrid );

    viewHelper.rotation.set( Math.PI/2, 0, 0 );
    viewHelper.position.set( 0, 0, -far );
    viewHelper.scale.set( 4/divisions, 4/divisions, 4/divisions );
    scene.add( viewHelper );

    scene.background = new THREE.Color( theme.background );
    app.viewport_scene = scene;

    function setViewpoint( value ) {
        if( viewpoint !== value ) {
            viewpoint = value;
            if( viewpoint ) {
                orbitHelper.visible = false;
                viewHelper.visible = true;
                view.camera = viewCamera;
                const tr = viewpoint.transform.rotation.get();
                const tp = viewpoint.transform.position.get();
                const r = { x: tr.x * Math.PI / 180, y: tr.y * Math.PI / 180, z: tr.z * Math.PI / 180 };
                const p = { x: tp.x, y: tp.y, z: tp.z };
                view.camera.rotation.set( r.x, r.y, r.z );
                view.camera.position.set( 0, p.y, 0 );
                viewHelper.position.set( 0, p.y, -far );
            } else {
                view.camera = orbitCamera;
                orbitHelper.visible = true;
                //viewHelper.visible = false;
            }
        }
    }

    sub.registry( 'do_view', ( view ) => {
        scene.background = new THREE.Color( theme.background );
        view.scene = scene;
        view.camera = orbitCamera;
        setViewpoint();

        // view.camera = new THREE.PerspectiveCamera( 45, 1, 0.1, 100 );
        // view.camera.position.set( offset, offset, offset );

        // view.canvas.onclick = ( event ) => {
        //     mouse.x = ( event.clientX - view.bound.left ) / view.bound.width * 2 - 1;
        //     mouse.y = - ( event.clientY - view.bound.bottom ) / view.bound.height * 2 - 1;
        //     console.log( mouse.x, mouse.y );
        //     raycaster.setFromCamera( mouse, view.camera );
        //     const intersects = raycaster.intersectObjects( stub.children, true );
        //     intersects.forEach( ( value, index ) => {
        //         let obj = value.object;
        //         console.log( obj.name, obj.uuid, obj.userData.ref );
        //         if( obj.userData.ref ) { ROUTE.send( 'ops_ref_active', { ref: obj.userData.ref } ); }
        //     } );
        // }

    } );

    sub.registry( 'change_context', ( options ) => {
        object.clear();
        if( options.viewpoint ) {
            object.add( options.viewpoint.model.group );
            // object.add( options.root );
        } else {
            object.add( options.root );
        }
        setViewpoint( options.viewpoint );
    } );

    sub.registry( 'set_warp', ( options ) => {
        overhead.position.set( 0, app.options.overhead, 0 );
        controls.target = new THREE.Vector3( 0, app.options.overhead, 0 );
    } );

    sub.registry( 'set_active', ( options ) => {
        if( data.marker ) {
            scene.remove( data.marker );
        }
        const active = data.active.get();
        if( active ) {
            if( active.model ) {
                const group = active.model.group;
                if( group ) {
                    if( scene ) {
                        //data.marker = new THREE.BoxHelper( group );
                        //scene.add( data.marker );
                    }
                }
            }
        }
    } );

    sub.registry( 'waitUpdate', ( options ) => {
        scene.background.setHex( 0x333355 );
    } );

    sub.registry( 'needsUpdate', ( options ) => {
        scene.background.setHex( 0x333355 );
    } );

    ROUTE.send( 'registry_view', { view: view } );
    return view;
}

function mkViewwarp( el ) {
    const view = { mode: 'model-editor-viewwarp', canvas: el }
    const sub = ROUTE.route( view.mode );

    let scene = new THREE.Scene();
    let stub = new THREE.Group();

    sub.registry( 'do_view', ( view ) => {
        if( scene ) {
            scene.clear();
            scene.add( stub );
        }
        view.half = true;
        view.scene = scene;
        view.camera = new THREE.OrthographicCamera( -0.5, 0.5, 1, -1, 0.001, 100 );
        view.camera.position.z = 10;
        // view.canvas.onclick = ( event ) => {
        //     alert( event.clientX + ' ' + event.clientY );
        // }
    } );

    sub.registry( 'set_warp_param', ( options ) => {
        stub.clear();
        stub.add( options.warp );
    } );

    ROUTE.send( 'registry_view', { view: view } );
    return view;
}

function mkModelEditor() {
    const sub = ROUTE.route( 'model-editor' );
    const mouse = new THREE.Vector2();
    const raycaster = new THREE.Raycaster();
    let scene = new THREE.Scene();
    let stub = new THREE.Group();

    const editor = nDiv( null, 'column grow border' );
    const header = nDiv( editor, 'row' );
    //const work = nDiv( editor, 'grow' );
    const work = editor;

    sub.registry( 'do_view', ( view ) => { setParent( editor, view.canvas ); } );

    const vp = mkViewport( work );
    const vw = mkViewwarp( work );

    function set_mode( dtype ) {
        app.viewport_mode = dtype;

        if( dtype ) {
            vp.enable = false;
            vw.enable = true;
            ROUTE.send( 'set_warp', { dtype: dtype } );
        } else {
            vp.enable = true;
            vw.enable = false;
        }
    }

    function anim_mode( mode ) {
        if( app.project ) {
            ROUTE.send( 'animation', { cmd: mode, ref: app.project.presentation } );
        }
    }

    const panel = header;
    const spanel = nDiv( panel, 'column' );
    const upanel = nDiv( panel, 'row noflex', { 'align-items':'flex-start' } );

    const p_start = nButton( upanel, '', 'animation_start:mrl mrr', () => { ROUTE.send( 'animation', { cmd: 'start', ref: app.project.presentation } ); }, 'btl bbl bbr btr alt-border background' );
    const ppanel = nDiv( upanel, 'row' );
    const p_stop = nButton( ppanel, '', 'animation_stop:mrl', () => { anim_mode( 'stop' ); }, 'btl bbl alt-border background' );
    const p_prev = nButton( ppanel, '', 'animation_prev', () => { anim_mode( 'prev' ); }, 'alt-border background' );
    const p_next = nButton( ppanel, '', 'animation_next', () => { anim_mode( 'next' ); }, 'alt-border background' );
    const p_ok = nButton( ppanel, '', 'animation_ok', () => { anim_mode( 'ok' ); }, 'alt-border background' );
    const p_pause = nButton( ppanel, '', 'animation_pause:mrr', () => { anim_mode( 'pause' ); }, 'btr bbr alt-border background' );
    const p_resume = nButton( ppanel, '', 'animation_resume:mrr', () => { anim_mode( 'resume' ); }, 'btr bbr alt-border background' );

    doHide( ppanel );
    doShow( p_start );

    sub.registry( 'animation_status', ( status ) => {
        if( status === 'stop' ) {
            doHide( ppanel );
            doShow( p_start );
        } else if( status === 'start' || status === 'resume' ) {
            doShow( ppanel );
            doHide( p_start );
            doShow( p_pause);
            doHide( p_resume );
        } else if( status === 'pause' ) {
            doShow( ppanel );
            doHide( p_start );
            doHide( p_pause);
            doShow( p_resume );
        }
        //doVisual( p_ok, data.focus );
    } );

    const s = nTrigger( spanel );
    nButton( s, '', 'fullscreen:mrl mrr', () => { if( app.project ) ROUTE.send( 'show-mode', { ref: app.project.presentation } ); }, 'btl bbl bbr btr alt-border background' );
    nButton( s, '', 'settings:mrl mrr', () => { if( app.project ) ROUTE.send( 'edit-mode', { ref: app.project.presentation } ); }, 'btl bbl bbr btr alt-border background' );

    const t = nSelector( spanel, 'column' );
    nButton( t, '', '3d model:mrl mrr', () => { set_mode(0); }, 'btl btr alt-border background' );
    nButton( t, '', 'presentation:mrl mrr', () => { set_mode(4); }, 'alt-border background' );
    nButton( t, '', 'fisheye:mrl mrr',  () => { set_mode(1); }, 'alt-border background' );
    nButton( t, '', 'equirectangular:mrl mrr',  () => { set_mode(2); }, 'alt-border background' );
    nButton( t, '', 'smirror:mrl mrr',  () => { set_mode(3); }, 'bbl bbr alt-border background' );

    set_mode(0);

    return sub;
}

const clogs = {};

function mkPressEditor( el ) {
    const sub = ROUTE.route( 'press-editor' );
    let info_ed;

    sub.registry( 'init', () => {
        const wind_ed = sub.canvas;
        setClasses( wind_ed, 'column noframe hall wall background' );

        const body_ed = nDiv( wind_ed, 'grow row noframe' );

        const tool_ed = nDiv( body_ed, 'grow' );
        mkTools( tool_ed );
        setWidth( tool_ed, '9rem' );

        const hier_ed =  nDiv( body_ed, 'grow noframe' );
        mkHierEditor( hier_ed );

        info_ed = nDiv( wind_ed, 'grow frame column alt-border' );
        setHeight( info_ed, '12rem' );
    } );

    sub.registry( 'console_log', ( options ) => {
        const { msg, tag, stag, progress, offset } = options;

        if( stag && !clogs[stag] ) clogs[stag] = nFolder( info_ed, stag );
        const prec = ( stag && clogs[stag] )? clogs[stag]: info_ed;

        if( tag && !clogs[tag] ) clogs[tag] = nFolder( prec, tag );
        const rec = ( tag && clogs[tag] )? clogs[tag]: { header: nDiv( info_ed ) };

        if( !rec.offset ) rec.offset = nText( rec.header );
        if( !rec.progress ) rec.progress = nText( rec.header );
        if( !rec.messages ) rec.messages = nDiv( rec.header );

        if( msg ) {
            setStyles( rec.header, { 'background-color': 'blue' } );
            if( msg === 'K' ) setStyles( rec.header, { 'background-color': 'green' } );;
            if( msg === 'S' ) setStyles( rec.header, { 'background-color': 'red' } );;
        }
        if( offset ) rec.offset.text( '#' + offset );
        if( progress ) rec.progress.text(' (' + ( Math.round ( progress*100 ) + '%' ).padStart(4) + ') ' );
        if( msg ) nText( rec.messages, ' ' + msg );

        rec.header.scrollIntoView();
    } );

    return sub;
}

function mkPropsEditor( el ) {
    const sub = ROUTE.route( 'props-editor' );

    sub.registry( 'init', () => {
        const wind_ed = sub.canvas;
        setClasses( wind_ed, 'column noframe hall wall background' );
        mkPropEditor( wind_ed );
    } );

    return sub;
}

let app;

export function subroute() {
    const sub = ROUTE.route( 'editors' );
    app = ROUTE.app;

    let pe, me, pp;

    function set_mode( mode ) {
        if( mode === 'edit-mode' && pe ) {
            doShow( pe );
            setWidth( pe, '28em' );
            doShow( pp );
            setWidth( pp, '18em' );
        }
        if( mode === 'show-mode' && pe ) {
            doHide( pe );
            setWidth( pe, '0em' );
            doHide( pp );
            setWidth( pp, '0em' );
        }
    }

    sub.registry( 'edit-mode', () => { set_mode( 'edit-mode' ); } );
    sub.registry( 'show-mode', () => { set_mode( 'show-mode' ); } );

    sub.registry( 'animation', ( options ) => {
        if( options.cmd === 'focus' && options.ref ) {
            data.focus = options.ref;
        }
    } );

    mkPressEditor();
    mkModelEditor();
    mkPropsEditor();

    sub.registry( 'setup', () => {
        const desktop = nDiv( document.body, '', { 'position': 'absolute', 'width': '100%', 'height': '100%', 'z-index': '200', 'padding': '0'} );
        const body = nDiv( desktop, 'column grow' );
        setHeight( body, '100%' );

        const work = nDiv( body, 'row grow noframe' );

        pe = nDiv( work, 'column grow' );
        me = nDiv( work, 'column grow' );
        pp = nDiv( work, 'column grow' );

        ROUTE.send( 'registry_view', { view: { mode:'press-editor', canvas:pe } } );
        ROUTE.send( 'registry_view', { view: { mode:'model-editor', canvas:me } } );
        ROUTE.send( 'registry_view', { view: { mode:'props-editor', canvas:pp } } );

        set_mode( 'edit-mode' );
    } );

    return sub;
}