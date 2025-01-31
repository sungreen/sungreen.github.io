'use strict';

import * as ROUTE from './subroute.js'
import * as THREE from 'three';
import { Text } from 'troika-three-text';

import { FBXLoader } from 'three/addons/loaders/FBXLoader.js';
import { OBB } from 'three/addons/math/OBB.js';

import { Ref } from './project.js';

import { maptexture_list } from '../../static/settings.js';
import { codeMaptexture } from '../../static/settings.js';

import { getTypeByPath, getURL, setContentPath } from '../storage.js';

import defaultVertexShader from '../shaders/VertexShader.glsl.js';
import defaultMarkerShader from '../shaders/MarkerShader.glsl.js';
import defaultFireworkShader from '../shaders/FireworkShader.glsl.js';
import { registry } from '../../addons/avatar/addon.js';

import { Tools3D } from '../utils.js';

const gr = Math.PI / 180;

function vec( x=0, y=0, z=0 ) { return new THREE.Vector3( x, y, z); }

export function vecXYZ( x=0, y=0, z=0, w=1 ) { return { x: x, y: y, z: z, w: w }; }
export function rotXYZ( x=0, y=0, z=0, w=1 ) { return { x: x, y: y, z: z, w: w }; }

const local = {
    root: null,
    viewpoint: null,
    active: null
}

const resources = {}
const objects = {};

export function  getListRefObjects() {
    return ['slide', 'group', 'text', 'image', 'video', 'sound', 'model3d', 'template', 'link', 'addon' ];
}

export function getListOfResources( types ) {
    const list = ['empty'];
    for (const [key, record ] of Object.entries( resources ) ) {
        if( record && record.__resource__ ) {
            const resource = record.__resource__;
            if( !types || types.includes( resource.type ) ) list.push( key );
        }
    }
    return list;
}

export async function loadResource( path ) {

    if( path === 'empty' ) return null;

    const res = { ...getTypeByPath( path ) };
    let ret;

    function conv( ret, res ) {
        ret.__resource__ = res;
        return ret;
    }
    switch( res.type ) {
        case 'image':
            ret = new Promise( (resolve, reject ) => {
                ROUTE.send( 'console_log', { stag:'loading', tag: path, msg: ' ... ' } );
                const loader = new THREE.TextureLoader();
                loader.load(
                    getURL( res ),
                    ( texture ) => {
                        ROUTE.send( 'console_log', { stag:'loading', tag: path, msg: 'ok' } );
                        texture.needsUpdate = true;
                        texture.colorSpace = THREE.LinearSRGBColorSpace;
                        texture.size = { x: texture.image.width, y: texture.image.height, z: 0 };
                        texture.path = res.path;
                        resolve( conv( { texture:texture }, res ) );
                    }
                );
            } );
            break;
        case 'video':
            ret = new Promise( (resolve, reject ) => {
                ROUTE.send( 'console_log', { stag:'loading', tag: path, msg: ' ... ' } );
                const video = document.createElement( 'video' );
                video.loop = false;
                video.crossOrigin = 'anonymous';
                video.playsinline = true;
                video.style.display = 'none';
                video.src = getURL( res );
                video.load();

                video.onloadedmetadata = () => {
                    ROUTE.send( 'console_log', { stag:'loading', tag: path, msg: 'ok' } );
                    const texture = new THREE.VideoTexture( video );
                    texture.needsUpdate = true;
                    texture.colorSpace = THREE.LinearSRGBColorSpace;
                    texture.size = { x: video.videoWidth, y: video.videoHeight, z: 0 };
                    video.texture = texture;
                    video.play();
                    video.pause();
                    res.video = video;
                    resolve( conv( video, res ) );
                }
            } );
            break;
        case 'sound':
            ret = new Promise( (resolve, reject ) => {
                ROUTE.send( 'console_log', { stag:'loading', tag: path, msg: 'ok' } );
                res.audio = new Audio( getURL( res ) );
                resolve( conv( res.audio, res ) );
            } );
            break;
        case 'model3d':
            ret = new Promise( (resolve, reject ) => {
                ROUTE.send( 'console_log', { stag:'loading', tag: path, msg: ' ... ' } );
                const loader = new FBXLoader( new THREE.LoadingManager() );
                loader.load(
                    getURL( res ),
                    ( object ) => {
                        ROUTE.send( 'console_log', { stag:'loading', tag: path, msg: 'ok' } );
                        let box3 = new THREE.Box3().setFromObject( object );
                        let size = new THREE.Vector3();
                        box3.getSize( size );
                        object.size = { x: size.x,  y: size.y,  z: size.z }
                        resolve( conv( object, res ) );
                  }
                );
            } );
            break;
        case 'addon':
        case 'text':
        case 'shader':
            ret = new Promise( (resolve, reject ) => {
                ROUTE.send( 'console_log', { stag:'loading', tag: path, msg: ' ... ' } );
                const loader = new THREE.FileLoader();
                loader.load(
                    getURL( res ),
                    ( txt ) => {
                        ROUTE.send( 'console_log', { stag:'loading', tag: path, msg: 'ok' } );
                        const data = {};
                        data[res.type] = txt;
                        resolve( conv( data, res ) );
                    }
                );
            }
        );
        break;
    }

    ret.__resource__ = res;
    return ret;
}

export function seekRefByType( ref, typelist, startofparent = false ) {
    if( typelist ) {
        const types = typelist.split( ',' ).map(s => s.trim());
        let ret = startofparent? (ref.parent? ref.parent: ref) : ref;
        while( true ) {
            if( types.includes( ret.type ) ) return ret;
            if( !ret.parent ) return null;
            if( ret.type === 'project' ) return null;
            ret = ret.parent;
        }
    } else {
        let ret = ref;
        while( ret.parent ) ret = ret.parent;
        return ret;
    }
}

export function getRefByMode( ref, mode ) {
    if( !mode ) return seekRefByType( ref );
    if( mode === 'shape parent' ) return seekRefByType( ref, 'presentation, slide, group, template, link, templates', true );

    let project = seekRefByType( ref, 'project' );
    if( mode === 'project' ) return project;

    if( project ) {
        let presentation, templates, addons;
        project.children.forEach( ( child ) => {
            if( child.type === 'presentation' ) presentation = child;
            if( child.type === 'templates' ) templates = child;
            if( child.type === 'addons' ) addons = child;
        } );

        if( mode === 'presentation' ) return presentation;
        if( mode === 'templates' ) return templates;
        if( mode === 'addons' ) return addons;

        if( presentation ) {
            let slide = seekRefByType( ref, 'slide' );
            if( !slide ) {
                if( !presentation.children.length ) return null;
                slide = presentation.children[0];
            }
            if( mode === 'slide' ) return slide;

            if( slide ) {
                // let view = seekRefByType( ref, 'view' );

                // if( !view ) {
                //     if( !slide.children.length ) return null;
                //     view = slide.children[0];
                // }

                // if( mode === 'view' ) return view;
                if( mode === 'next' ) {
                    if( ref.type === 'presentation' ) return null;
                    const pref = ref.parent;
                    const count = pref.children.length;
                    if( count === 1 ) return pref;
                    const index = ( pref.children.indexOf( ref ) + 1 ) % count;
                    return pref.children[index];
                }

                if( mode === 'any' ) return ref.type === 'presentation'? null: ref;

                let conteiner = seekRefByType( ref, 'slide, group, logic, template, addon' );
                return conteiner;
            }
        }
    }
}

export function setRefParent( ref, from, force=false ) {
    if( ref.type === 'project' || !from ) {
        delete ref.parent;
        return null;
    }

    let pref;
    if( force ) {
        pref = from;
    } else {
        switch( ref.type ) {
        case 'project': pref = null; break;
        case 'presentation':
        case 'templates':
        case 'addons': pref = getRefByMode( from, 'project' ); break;
        case 'slide': pref = getRefByMode( from, 'presentation' ); break;
        case 'template': pref = getRefByMode( from, 'templates' ); break;
        case 'addon': pref = getRefByMode( from, 'addons' ); break;
        default:
            pref = getRefByMode( from, 'container' );
            if( !pref ) pref = Ref.new( { type: 'slide' }, from );
            break;
        }
    }

    if( pref && ( ( pref.limit && pref.children.length<pref.limit ) || !pref.limit ) ) {
        if( ref.parent ) {
            const index = ref.parent.children.indexOf( ref );
            ref.parent.children.splice( index, 1);
        }
        pref.children.push( ref );
        ref.parent = pref;
        ref.offset = ref.parent.children.indexOf( ref ) + 1;
        return pref;
    }

}

export const ModelTools = {
    ref_selected: null,

    setShape: ( ref, shape, x=1, y=1, z=0 ) => {
        ref.model.__shape__ = true;
        ref.model._size = vec( x, y, z );

        if( ref.model.shape !== shape ) {
            if( ref.model.shape ) ModelTools.removeObj( ref.model.shape );
            ref.model.shape = shape;
            ref.model.shape.userData.ref = ref;
            ModelTools.appendObj( ref, shape );
            return true;
        }

        return false;
    },

    getResource: async ( path ) => {
        if( path && path !== 'empty' ) {
            if( !resources[path] ) {
                let ret = await loadResource( path )
                resources[path] = ret;
            }
            return resources[path];
        }
    },
    
    enable: ( property, flag=true ) => { property.enable = () => { return flag; } },

    setScale: ( obj, scale ) => {
        obj.scale.set( scale.x? scale.x: 1, scale.y? scale.y: 1, scale.z? scale.z: 1 );
    },

    setPosition: ( obj, position ) => {
        obj.position.set( position.x, position.y, position.z );
    },

    setRotation: ( obj, rotation ) => {
        obj.rotation.set( rotation.x * gr , rotation.y * gr, rotation.z * gr );
    },

    appendObj: ( ref, obj ) => {
        if( ref && obj && ref.model && ref.model.group && obj.parent!==ref.model.group ) {
            ref.model.group.add( obj );
            return obj;
        }
    },
    
    removeObj: ( obj ) => {
        if( obj ) {
            obj.traverse( function ( child ) {
                if ( child.material ) {
                    const materials = Array.isArray( child.material ) ? child.material : [ child.material ];
                    materials.forEach( material => {
                        if ( material.map ) material.map.dispose();
                        material.dispose();
                    } );
                }
                if ( child.geometry ) child.geometry.dispose();
            } );
            //obj.dispose();
            obj.removeFromParent();
            obj = null;
        }
    },

    clearRefModel: ( ref ) => {
        if( ref.model.group ) {
            ref.model.group.traverse( function ( child ) {
                if ( child.material ) {
                    const materials = Array.isArray( child.material ) ? child.material : [ child.material ];
                    materials.forEach( material => {
                        if ( material.map ) material.map.dispose();
                        material.dispose();
                    } );
                }
                if ( child.geometry ) child.geometry.dispose();
            } );
            ref.model.group.clear();
        }
    }
}

// OBJECTS

let num = 0;

function conv( v ) { return (''+Math.round( v * 10 ) / 10).padStart(4); }

export function makeModel( ref ) {
    objects[ref.type]( ref );
}

objects.base = ( ref, prefs='container', uix=true ) => {
    ref.model = {};

    ref.model.setup = async () => {}
    ref.model.updateBase = async () => {}

    ref.updateProperty = async ( property, value ) => {
        if( ref.model.update ) await ref.model.update();
        if( ref.model.finaly ) await ref.model.finaly( ref );
        ROUTE.updateNeeds( ref.id );
    }

    ref.isGroup = () => { return ref.model.updateGroup? true: false; }
    ref.isShape = () => { return ref.model.updateShape? true: false; }
    ref.isVisible = () => { return ref.model.group.visible? true: false; }
    ref.setVisible = ( visible=true ) => { ref.model.group.visible = visible; }

    Ref.property.new( ref, { name: 'name', type: 'string', init: ref.type + ( ref.offset? ( ' #' + ref.offset ): '' ) } );

}

objects.transform = ( ref ) => {
    objects.base( ref );

    ref.model.group = new THREE.Group();
    ref.setVisible( false ); // Включается при обходе активного элемента

    ref.model._inscribed = false;
    ref.model._vside = vec( 0, 0, 0 );
    ref.model._scale = vec( 1, 1, 1 );
    ref.model._position = vec( 0, 0, 0 );
    ref.model._rotation = vec( 0, 0, 0 );

    ref.model.setSide = ( v ) => {
        if( v.x !== ref.model._vside.x || v.y !== ref.model._vside.y || v.z !== ref.model._vside.z ) {
            ref.model._vside.copy( v );
            /*if( ref.model.upSide )*/ ref.model.upSide();
        }
    }

    ref.model.setPosition = ( v ) => {
        if( v.x !== ref.model._position.x || v.y !== ref.model._position.y || v.z !== ref.model._position.z ) {
            ref.model._position.copy( v );
            /*if( ref.model.upPosition )*/ ref.model.upPosition();
        }
    }

    ref.model.plug = ( flag ) => {
        const group = ref.model.group;
        if( group ) {
            const pgroup = ref.parent.model.group;
            if( pgroup && group.parent !== pgroup ) {
                pgroup.add( group );
                ROUTE.updateNeeds();
            }
            if( group.visible !== flag ) {
                if( ref.model.do_plug ) ref.model.do_plug( flag );
                ref.setVisible( flag );
            }
        }
    }

    ref.model.updateTransform = async () => {
        const s = ref.model._scale;
        const v = ref.model._vside;
        const p = ref.model._position;
        const r = ref.model._rotation;

        const ts = ref.transform.scale.get();
        const tp = ref.transform.position.get();
        const tr = ref.transform.rotation.get();
        const inscribed = ref.transform.inscribed.get();

        let asp = ts.w;
        if( inscribed ) asp = ts.w / ( v.x>v.y? v.x: v.y ) || 1;

        ModelTools.setScale( ref.model.group, { x: s.x * ts.x * asp, y: s.y * ts.y * asp, z: s.z * ts.z * asp } );
        ModelTools.setPosition( ref.model.group, { x: p.x + tp.x * tp.w, y: p.y + tp.y * tp.w, z: p.z + tp.z * tp.w } );
        ModelTools.setRotation( ref.model.group, { x: r.x + tr.x * tr.w, y: r.y + tr.y * tr.w, z: r.z + tr.z * tr.w } );
        if( ref.model._shape_scale && ref.model.shape ) ModelTools.setScale( ref.model.shape, ref.model._shape_scale );

        await ref.model.updateBase();
    }

    Ref.property.new( ref, { name: 'transform', type: 'properties' } );
    Ref.property.new( ref.transform, { name: 'scale', type: 'vector', init: vecXYZ( 1, 1, 1 ) } );
    Ref.property.new( ref.transform, { name: 'position', type: 'vector', init: vecXYZ( 0, 0, 0 ) }  );
    Ref.property.new( ref.transform, { name: 'rotation', type: 'vector', init: rotXYZ( 0, 0, 0 ) }  );
    Ref.property.new( ref.transform, { name: 'inscribed', type: 'checkbox', init: false } );
    // Ref.property.new( ref.transform, { name: 'margin', type: 'number', init: 0.1, min: 0, max: 1, step: 0.01 } );
    // Ref.property.new( ref.transform, { name: 'padding', type: 'number', init: 0, min: 0, max: 1, step: 0.01 } );
    Ref.property.new( ref.transform, { name: 'basis', type: 'number', init: 0, min: 0, max: 10, step: 1 } );
}

objects.frame = ( ref ) => {
    objects.transform( ref );

    let frame, color;

    ref.model.upPositionShape = ref.model.upPosition = () => {}

    ref.model.upSideShape = ref.model.upSide = () => {
        if( ref.layout && !['project', 'presentation', 'slide'].includes( ref.type ) ) {
            const side = ref.layout.side;
            const level = ref.layout.level;

            ModelTools.removeObj( frame );

            if( side.x && side.y ) {
                const mode = ref.frame.mode.get();
                switch( mode ) {
                    default:
                    case 'none': break;
//                    default: frame = Tools3D.mesh( Tools3D.geometry.Rectangle( side.x, side.y ) ); break;
                    case 'rectangle': frame = Tools3D.mesh( Tools3D.geometry.Rectangle( side.x, side.y ) ); break;
                    case 'round rectangle': frame = Tools3D.mesh( Tools3D.geometry.RectangleRounded( side.x, side.y ) ); break;
                    case 'circle': frame = Tools3D.mesh( Tools3D.geometry.Circle( side.x, side.y ) ); break;
                    case 'star': frame = Tools3D.mesh( Tools3D.geometry.Star( side.x, side.y ) ); break;
                }
                if( frame ) {
                    let color = ref.frame.color.get();
                    if( !color ) color = Tools3D.color.Index( level, [ 0x22aa55, 0x44ff77 ] );
                    frame.position.setZ( -level * 0.003 + 0.001 );
                    frame.material.color.set( color );
                    ModelTools.appendObj( ref, frame );
                }
            }
        }
    }

    ref.model.doActivate = () => {
        if( frame ) {
            color = frame.material.color.getHex();
            frame.material.color.setHex( 0xff7722 );
        }
    }

    ref.model.doDeactivate = () => {
        if( frame ) frame.material.color.setHex( color );
    }

    ref.model.upPosition = ( v ) => {}

    ref.model.remove = () => {
        ModelTools.removeObj( ref.model.shape );
    }

    ref.model.updateFrame = ref.model.setup = async () => {
        // ref.model._scale = vec( 1, 1, 1 );
        // ref.model._shape_scale = vec( scale, scale, scale );
        ref.model.upSideShape();
        ref.model.updateTransform();
    }

    Ref.property.new( ref, { name: 'frame', type: 'properties' } );
    Ref.property.new( ref.frame, { name: 'mode', type: 'select', init: 'round rectangle', options: [ 'none', 'rectangle', 'round rentangle', 'circle', 'star'] } );
    Ref.property.new( ref.frame, { name: 'color', type: 'color' } );
}

objects.shape = ( ref ) => {
    objects.frame( ref );

    ref.model._size = vec( 1, 1, 1 );

    ref.model.remove = () => {
        ModelTools.removeObj( ref.model.shape );
    }

    ref.model.updateShape = async () => {
        ModelTools.appendObj( ref.parent, ref.model.group );

        const fitter = ref.shape.fitter.get();
        const size = ref.model._size;
        const rect = ref.model._vside;

        let scale;
        switch( fitter ) {
            default:
            case 'min': scale = Math.min( rect.x / size.x, rect.y / size.y ); break;
            case 'max': scale = Math.max( rect.x / size.x, rect.y / size.y ); break;
            case 'width': scale = rect.x / size.x; break;
            case 'height': scale = rect.y / size.y; break;
        }
        ref.model._scale = vec( 1, 1, 1 );
        ref.model._shape_scale = vec( scale, scale, scale );

        await ref.model.updateFrame();
    }

    Ref.property.new( ref, { name: 'shape', type: 'properties' } );
    Ref.property.new( ref.shape, { name: 'fitter', type: 'select', init: 'none', options: [ 'none', 'min', 'max', 'width', 'height' ] } );

    ref.transform.basis.set( 1 );
}

objects.group = ( ref, subname ) => {
    objects.frame( ref );

    ref.model.prefs = 'container';

    ref.model.updateGroup = ref.model.setup = async () => {
        // const m = ref.model.enable? ref.group.direction.get(): 'none';

        const m = ref.group.direction.get();
        if( ['origin', 'row', 'column', 'block'].includes(m) ) {
            ref.viewpoint = null;
        } else {
            ref.viewpoint = m;
            let s = 1;
            let f = s;
            let q = s/2;

            if( ref.parent && ref.parent.type === 'slide' ) {
                const { w, h } = ref.parent.aspectratio;
                s = s/w;
                f = f/w;
                q = q/w;
            }

            let str;
            switch( m ) {
                case 'front':  str = { s: vecXYZ( s, s, s ), t: vecXYZ( 0, q,-1 ), r: rotXYZ(  0,  0,  0 ) }; break;
                case 'left':   str = { s: vecXYZ( s, s, s ), t: vecXYZ(-1, q, 0 ), r: rotXYZ(  0, 90,  0 ) }; break;
                case 'right':  str = { s: vecXYZ( s, s, s ), t: vecXYZ( 1, q, 0 ), r: rotXYZ(  0,-90,  0 ) }; break;
                case 'back':   str = { s: vecXYZ( s, s, s ), t: vecXYZ( 0, q, 1 ), r: rotXYZ(  0,180,  0 ) }; break;
                case 'up':     str = { s: vecXYZ( s, s, s ), t: vecXYZ( 0, s, 0 ), r: rotXYZ( 90,  0,  0 ) }; break;
                case 'down':   str = { s: vecXYZ( s, s, s ), t: vecXYZ( 0, 0, 0 ), r: rotXYZ(-90,  0,  0 ) }; break;
            }
            if( str ) {
                // without update false, false
                ref.viewpoit = m;
                ref.transform.position.set( str.t, false, false );
                ref.transform.rotation.set( str.r, false, false );
                ref.transform.scale.set( str.s, false, false );
                ref.transform.inscribed.set( true );
            }
        }

        await ref.model.updateFrame();
    }

    Ref.property.new( ref, { name: 'group', type: 'properties' } );
    Ref.property.new( ref.group, { name: 'direction', type: 'select', init: 'row', options: [ 'origin', 'block', 'row', 'column', 'front', 'left', 'right', 'back', 'up', 'down', 'cylinder' ] } );
    Ref.property.new( ref.group, { name: 'limit', type: 'number', init: 0, min: 0, max: 10, step: 1 } );
    Ref.property.new( ref.group, { name: 'mode', type: 'select', init: 'and', options: ['none', 'and', 'or', 'serial', 'selector', 'focus', 'switch'] } );
    Ref.property.new( ref.group, { name: 'margin', type: 'number', init: 0, min: 0, max: 1, step: 0.01 } );

    // Ref.property.new( ref.group, { name: 'limit', type: 'range', init: 0, min: 0, max: 10, step: 1 } );
    // Ref.property.new( ref.group, { name: 'mode', type: 'select', init: 'and', options: ['none', 'and', 'or', 'serial', 'selector', 'focus', 'switch'] } );
    // Ref.property.new( ref.group, { name: 'align', type: 'select', init: 'median', options: ['start', 'median', 'end' ] } );
    // Ref.property.new( ref.group, { name: 'margin', type: 'number', init: 0, min: 0, max: 1, step: 0.1 } );

    if( subname ) {
        ref.subname = subname;
    } else {
        Ref.allowUpdate( ref );
    }
}

objects.slide = ( ref ) => {
    objects.group( ref, 'slide' );

    let texture, shader;
    ref.aspectratio = { w:1, h:1 };

    ref.model.do_plug = ( flag ) => {
        if( flag ) {
            // if( texture ) {
            //     texture.mapping = THREE.EquirectangularReflectionMapping;
            //     if( data.app.viewport_scene ) data.app.viewport_scene.background = texture;
            // }
            const options = {
                stype: codeMaptexture( ref.dome.transformType.get() ),
                img_dome: texture,
                scope_dome: ref.dome.scope.get(),
                rotate_dome: ref.dome.rotation.get()/90,
                shader: shader
            }
            ROUTE.send( 'set_warp', options );
        } else {
            ROUTE.send( 'set_warp', { img_dome: null, shader: null } );
        }
    }

    ref.model.setup = async () => {
        const source = ref.dome.source.get();
        const data = await ModelTools.getResource( source );
        if( data ) {
            texture = data.texture;
            shader = data.shader;
        } else {
            texture = null;
            shader = null;
        }

        let aspect;
        switch( ref.aspect.get() ){
            case '2:1': aspect = { w:2, h:1 }; break;
            case '16:9': aspect = { w:16/9, h:1 }; break;
            case '4:3': aspect = { w:4/3, h:1 }; break;
            case '1:1': aspect = { w:1, h:1 }; break;
        }
        ref.aspectratio = aspect;
        ref.model.updateGroup();
    }

    Ref.property.new( ref, { name: 'aspect', type: 'select', init: '2:1', options: ['2:1', '16:9', '4:3', '1:1'] } );
    Ref.property.new( ref, { name: 'dome', type: 'properties' } );
    Ref.property.new( ref.dome, { name: 'source', type: 'resource', datatypes: ['image', 'video', 'shader'] } );
    Ref.property.new( ref.dome, { name: 'transformType', type: 'select', options: maptexture_list, init: 'Fisheye' } );
    Ref.property.new( ref.dome, { name: 'scope', type: 'number', init: 1.0, min: 0.1, max: 2.0, step: 0.1 } );
    Ref.property.new( ref.dome, { name: 'rotation', type: 'number', init: 0, min:-360, max: 360, step: 0.5 } );

    Ref.property.new( ref.group, { name: 'mode', type: 'select', init: 'and', options: ['and'] } );
    ref.group.direction.set( 'origin' );

    ref.transform.enable = () => { return false; }

    Ref.allowUpdate( ref );
}

// objects.view = ( ref ) => {
//     objects.group( ref, 'view' );

//     ref.model.enable = true;

//     ref.model.setup = async () => {
//         const m = ref.model.enable? ref.mode.get(): 'none';
//         let s = 2;
//         let f = s;
//         let q = s/2;

//         if( ref.parent && ref.parent.type === 'slide' ) {
//             const { w, h } = ref.parent.aspectratio;
//             s = s/w;
//             f = f/w;
//             q = q/w;
//         }

//         s = 2;
//         let str;

//         switch( m ) {
//             case 'none':
//             case 'front':  str = { s: vecXYZ( s, s, s ), t: vecXYZ( 0, q,-1 ), r: rotXYZ(  0,  0,  0 ) }; break;
//             case 'left':   str = { s: vecXYZ( s, s, s ), t: vecXYZ(-1, q, 0 ), r: rotXYZ(  0, 90,  0 ) }; break;
//             case 'right':  str = { s: vecXYZ( s, s, s ), t: vecXYZ( 1, q, 0 ), r: rotXYZ(  0,-90,  0 ) }; break;
//             case 'back':   str = { s: vecXYZ( s, s, s ), t: vecXYZ( 0, q, 1 ), r: rotXYZ(  0,180,  0 ) }; break;
//             case 'up':     str = { s: vecXYZ( s, s, s ), t: vecXYZ( 0, s, 0 ), r: rotXYZ( 90,  0,  0 ) }; break;
//             case 'down':   str = { s: vecXYZ( s, s, s ), t: vecXYZ( 0, 0, 0 ), r: rotXYZ(-90,  0,  0 ) }; break;
//         }

//         // without update false, false
//         ref.transform.position.set( str.t, false, false );
//         ref.transform.rotation.set( str.r, false, false );
//         ref.transform.scale.set( str.s, false, false );

//         ref.model.updateGroup();
//     }

//     Ref.property.new( ref, { name: 'mode', type: 'select', init: 'front', options: [ 'front', 'left', 'right', 'back', 'up', 'down', 'cylinder'] } );
//     // Ref.property.enable( ref.transform, false );
//     Ref.allowUpdate( ref );

//     ref.transform.inscribed.set( true );
// }

objects.project = ( ref ) => {
    objects.base( ref );
    app.project = ref;
}

objects.presentation = ( ref ) => {
    objects.group( ref, 'presentation' );

    ref.model.setup = async () => {
        if( Ref.property.check( ref.location ) ) {
            const path = ref.location.get();
            setContentPath( './presentation/' + path + '/' );
        }
        if( Ref.property.check( ref.rotation ) ) {
            const options = {
                rotate_cube: ref.rotation.get()/180,
            }
            ROUTE.send( 'set_warp', options );
        }

        if( Ref.property.check( ref.overhead ) || Ref.property.check( ref.distance ) ) {
            if( ref.overhead && ref.distance ) {
                app.options.overhead = ref.overhead.get();
                app.options.distance = ref.distance.get();
                const a = Math.atan2( app.options.overhead, app.options.distance );
                const scope = 1 + ( 2 * a/Math.PI );
                const options = { scope_cube: scope }
                ROUTE.send( 'set_warp', options );
            }
        }
        ref.model.updateGroup();
    }

    const intensity = 12;
    const hemiLight = new THREE.HemisphereLight( 0xffffff, 0x444444, intensity );
    ModelTools.setPosition( hemiLight, { x: 0, y: 10, z: 0 } );
    ModelTools.appendObj( ref, hemiLight );

    const dirLight = new THREE.DirectionalLight( 0xffffff, intensity );
    dirLight.castShadow = true;
    dirLight.shadow.camera.top = 180;
    dirLight.shadow.camera.bottom = - 100;
    dirLight.shadow.camera.left = - 120;
    dirLight.shadow.camera.right = 120;
    ModelTools.setPosition( dirLight, { x: 0, y: 10, z: 0 } );
    ModelTools.appendObj( ref, dirLight );

    Ref.property.new( ref, { name: 'location', type: 'string', init: 'default' } );
    Ref.property.new( ref, { name: 'overhead', type: 'number', init: 0.5, min:0, max:1, step:0.1 } );
    Ref.property.new( ref, { name: 'distance', type: 'number', init: 1.0, min:0.2, max:1, step:0.1 } );

    Ref.property.new( ref, { name: 'rotation', type: 'number', init: 0.0, min:-360, max:360, step:10 } );
    Ref.property.new( ref, { name: 'light', type: 'number', init: 10.0, min: 1.0, max:25.0, step:10 } );

    Ref.property.new( ref.group, { name: 'mode', type: 'select', init: 'serial', options: ['serial'] } );
    Ref.property.new( ref.group, { name: 'direction', type: 'select', init: 'origin', options: ['origin'] } );

    ref.name.uix = true;
    ref.location.uix = true;

    Ref.allowUpdate( ref );
}

objects.text = ( ref ) => {
    objects.shape( ref );

    ModelTools.setShape( ref, new Text() );

    ref.model.shape.addEventListener( 'synccomplete', () => {
        if( ref.model._vside.x ) {
            const box = new THREE.Vector3();
            const text = ref.model.shape;
            text.geometry.boundingBox.getSize( box );
            ModelTools.setShape( ref, text, box.x , box.y, 0 );

            let mh = ( ref.model._vside && ref.model._vside.y )? ref.model._vside.y: 1 ;
            let mw = ( ref.model._vside && ref.model._vside.x )? ref.model._vside.x: 1 ;
            ref.model.shape.maxWidth = mw;

            const size = text.fontSize;

            if( !size ) {
                text.autoFontSize = 2;
                text.autoUp = 0.1;
                text.autoTune = 0.01;
            }

            if( text.autoFontSize ) {
                text.visible = false;
                const size = text.fontSize;
                if( text.autoFontSize === 2 ) {
                    if( box.y < mh ) {
                        text.fontSize += text.autoUp;
                    } else {
                        text.fontSize = Math.floor( text.fontSize * 10 ) / 10 - text.autoTune;
                        text.autoFontSize = 1;
                    }
                } else {
                    if( box.y > mh ) {
                        text.fontSize -= text.autoTune;
                    } else {
                        text.autoFontSize = 0;
                        text.visible = true;
                        ref.model._size.x = box.x;
                        ref.model._size.y = box.y;
                    }
                }
                text.sync();
            }
        }
    } );

    ref.model.upSideText = ref.model.upSide = () => {
        ref.model.upSideShape();
        ref.model.shape.fontSize = ref.fontSize.get();
        ref.model.shape._needsSync = true;
        ref.model.shape.sync();
    }

    ref.model.setup = async () => {
        ref.model.shape.anchorX = '50%';
        ref.model.shape.anchorY = '50%';
        ref.model.shape.outlineWidth = "5%";
        ref.model.shape.outlineColor = "black";
        ref.model.shape.outlineOpacity = 0.5;
        ref.model.shape.overflowWrap = 'break-word';

        ref.model.shape.text = ref.text.get();
        ref.model.shape.fontSize = ref.fontSize.get();
        ref.model.shape.textAlign = ref.textAlign.get();

        ref.model.shape.sync();
        ref.model.updateShape();
    }

    Ref.property.new( ref, { name: 'text',      type: 'string', init: 'Hello' } );
    Ref.property.new( ref, { name: 'fontSize',  type: 'number', init: 0, min: 0, max: 100, step: 0.1 } );
    Ref.property.new( ref, { name: 'textAlign', type: 'select', options: ['left', 'center', 'right'], init: 'center' } );

    Ref.allowUpdate( ref );
}

objects.picture = ( ref ) => {
    objects.shape( ref, 'picture' );

    ref.model.upSideText = ref.model.upSide = () => {
        ref.model.upSideShape();
        ref.model.updateShape();
    }

    ref.model.setup = async () => {
        const source = ref.source.get();
        const data = await ModelTools.getResource( source );
        if( data ) {
            const texture = data.texture;
            // const geometry = new THREE.PlaneGeometry( 1, 1 );
            const geometry = new THREE.PlaneGeometry( texture.size.x, texture.size.y );
            const material = new THREE.MeshBasicMaterial( { map: texture, transparent: true } );
            // material.needsUpdate = true;
            // texture.needsUpdate = true;
            // material.transparent = true;
            ModelTools.setShape( ref, new THREE.Mesh( geometry, material ), texture.size.x, texture.size.y );
            ref.model.updateShape();
        }
    }

    Ref.property.new( ref, { name: 'source', type: 'resource', uix: true, datatype: ref.type } );
    Ref.property.new( ref, { name: 'muted', type: 'checkbox', uix: true, enable: () => { return ref.type === 'video'; } } );
    Ref.property.new( ref, { name: 'loop', type: 'checkbox', uix: true, enable: () => { return ref.type === 'video'; } } );

    Ref.allowUpdate( ref );
}

objects.image = objects.picture;
objects.video = objects.picture;

objects.sound = ( ref ) => {
    objects.base( ref, 'sound' );

    let sound;

    ref.model.setup = async () => {
        if( ref.source ) {
            const source = ref.source.get();
            const data = await ModelTools.getResource( source );
            sound = data.sound;
        }
        await ref.model.updateBase();
    }

    Ref.property.new( ref, { name: 'source', type: 'resource', datatype: 'sound' } );
    Ref.property.new( ref, { name: 'muted', type: 'checkbox' } );

    Ref.allowUpdate( ref );
}

objects.model3d = ( ref ) => {
    objects.shape( ref, '3dmodel' );

    let mixer;
    const clock = new THREE.Clock();

    ref.model.setup = async () => {
        const source = ref.source.get();
        const shape = await ModelTools.getResource( source );
        if( ModelTools.setShape( ref, shape ) ) {
            //ref.setSideBySide( ref.model.shape.w, ref.model.shape.h, ref.model.shape.d );
            shape.position.y = -0.5;
        }
    }

    ref.model.posttune = () => {
        if ( mixer ) mixer.update( clock.getDelta()*ref.speed.get() );
    }

    Ref.property.new( ref, { name: 'source', type: 'resource', datatype: ref.type } );
    Ref.property.new( ref, { name: 'speed', type: 'number', init: 1.0 } );

    Ref.allowUpdate( ref );
}

objects.templates = ( ref ) => {
    objects.group( ref, 'templates' );

    Ref.property.new( ref.group, { name: 'mode', type: 'select', init: 'serial', options: ['serial'] } );
    Ref.property.new( ref.group, { name: 'direction', type: 'select', init: 'block', options: ['block'] } );
}

objects.template = ( ref ) => {
    objects.group( ref, 'template' );

    ref.model.builder = ( ref ) => {}

    ref.model.setup = async () => {
        Ref.children.getList( app.project ).forEach( ( child ) => {
            if( child.type === 'link' && child.link_ref_id === ref.id ) child.model.update();
        } );
        await ref.model.updateGroup();
    }

    Ref.property.new( ref.group, { name: 'mode', type: 'select', init: 'serial', options: ['serial'] } );
    Ref.property.new( ref.group, { name: 'direction', type: 'select', init: 'block', options: ['block'] } );
    Ref.property.new( ref, { name: 'config', type: 'properties' } );

    ref.group.enable = () => { return false };
    ref.transform.enable = () => { return false };

    Ref.allowUpdate( ref );
}

objects.link = ( ref ) => {
    objects.group( ref, 'link' );

    ref.getTemplate = () => {
        if( ref.link_ref_id ) {
            const template = Ref.getById( ref.link_ref_id );
            if( template ) return template
            else console.log( 'Not found', ref.link_ref_id );
        }
        return null;
    }

    ref.model.setup = async () => {
        if( ref.ref_id ) {
            ref.link_ref_id = ref.ref_id.get();
            const template = ref.getTemplate();
            if( template ) {
                ref.template_name = template.name.value;
                Ref.children.copy( template, ref );
                template.model.builder( ref );
            }
        }
        await ref.model.updateGroup();
    }

    Ref.property.new( ref, { name: 'ref_id', type: 'string', hook: true } );

    Ref.allowUpdate( ref );
}

objects.addons = ( ref ) => {
    objects.group( ref, 'addons' );
    Ref.property.new( ref.group, { name: 'mode', type: 'select', init: 'serial', options: ['serial'] } );
    Ref.property.new( ref.group, { name: 'direction', type: 'select', init: 'block', options: ['block'] } );
}

const addons = {};

objects.addon = ( ref ) => {
    objects.group( ref, 'addon' );

    ref.model.setup = async () => {
        const source = ref.source.get();
        if( !source ) return;

        console.log( 'Addon source set', source );
        ROUTE.updateLock( 'addon update' );

        const data = await ModelTools.getResource( source );

        if( data ) {
            const def = JSON.parse( data.addon );
            if( def.name ) {
                const name = def.name;

                def.sub = ROUTE.route( name );
                if( def.info ) { ref.name.set( def.info ); }

                if( !addons[name] ) {
                    const amodule = await import( '../../addons/' + name + '/addon.js' );
                    addons[name] = amodule.registry( def );
                }

                const addon = addons[name];

                if( addon.content ) {

                    addon.newTemplate = ( num, alias ) => {
                        const id = name + '_' + num;
                        const template = Ref.new( { type: 'template', id: id }, ref, true );
                        template.name.set( alias? alias: name );
                        return template;
                    }
                    Ref.children.clear( ref );
                    addon.content();
                    await ref.model.updateGroup();
                    ROUTE.updateUnLock('addon update');
                }
            }
        }
    }

    Ref.property.new( ref, { name: 'source', type: 'resource', datatype: 'addon' } );

    ref.group.enable = () => { return false };
    ref.transform.enable = () => { return false };

    Ref.allowUpdate( ref );
}

let app;

export function subroute() {
    const sub = ROUTE.route( 'model' );
    app = ROUTE.app;
    
    let marker = null;

    sub.registry( 'needsUpdate', ( options ) => {
        if( app.project ) {
            Ref.children.getList( app.project).forEach( ( item ) => {
                if( item.needsUpdate ) item.needsUpdate();
            } );
        }
    } );

    sub.registry( 'animation', ( options ) => {
        if( options.cmd === 'focus' ) {
            marker = options.ref;
        } else {
            marker = null;
        }
    } );

    function printVisible( obj, level=0 ) {
        console.log( obj.visible, obj.uuid, '.'.repeat( level ) + level, obj.type, ( obj.userData.ref ? obj.userData.ref.name.get(): '' ) );
        for( const child of obj.children ) {
            printVisible( child, level+1 );
        }
    }

    function involve( m, ref, on=true, level=0 ) {
        if( ref.model && ref.model.plug ) ref.model.plug( on );
        if( on && ref.group ) {
            if( ref.group.direction.is( 'block' )
                && ( ref.group.mode.is( 'serial' ) || ref.group.mode.is( 'selector' ) || ref.group.mode.is( 'focus' ) || ref.group.mode.is( 'switch' ) )
                && ref.children[0] ) {
                ref.children.forEach( ( child, index ) => { involve( 'f', child, ( index === 0 ), level+1 ); } );
            } else {
                ref.children.forEach( ( child, index ) => { involve( 'a', child, true, level+1 ); } );
            }
        }
    }

    sub.registry( 'set_active', ( options ) => {
        if( app.mode === 'playmode' ) {
            // Сбросить маркер для playmode
            marker = null;
            local.viewpoint = null;
            local.active = null;
        } else {
            // Сбросить вид
            local.viewpoint = null;
            let ref = options.ref;

            if( ref ) {
                if( local.active !== ref ) {
                    if( local.active && local.active.model.doDeactivate ) local.active.model.doDeactivate();
                    local.active = ref;
                    if( local.active && local.active.model.doActivate ) local.active.model.doActivate();
                    ROUTE.updateNeeds();
                }
    
                // Установить маркер
                marker = ref;

                // Включить подчиненные элементы
                involve( 's', ref );

                // Выполнять пока есть родитель ( или тоже самое ref.type = project )
                while( ref.parent ) {
                    // Включить этот элемент и выключить соседей
                    ref.parent.children.forEach( ( child ) => { if( child.model.plug ) child.model.plug( ( child === ref ) ); } );

                    // По ходу установить root, viewpoint
                    if( ref.type === 'group' && ref.viewpoint ) local.viewpoint = ref;
                    //if( ref.type === 'presentation' || ref.type === 'templates'  || ref.type === 'addons' ) local.root = local.viewpoint ? local.viewpoint.model.group: ref.model.group;
                    if( ref.type === 'presentation' || ref.type === 'templates'  || ref.type === 'addons' ) local.root = ref.model.group;

                    // Подняться выше
                    ref = ref.parent;
                }
            }
        }

        local.root = app.project.presentation.model.group;
        ROUTE.send( 'set_context', local );
    } );

    return sub;
}