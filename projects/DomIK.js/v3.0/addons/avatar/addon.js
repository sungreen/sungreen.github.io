import * as THREE from 'three';
import { FBXLoader } from 'three/addons/loaders/FBXLoader.js';

import * as ROUTE from '../../core/subroute/subroute.js'
import { Ref } from '../../core/subroute/project.js'
import { ModelTools } from '../../core/subroute/model.js'

export function registry( def ) {

    const addon = {
        content: ( ref ) => {
            def.offset = 0;
            ref.name.set( def.info );
            const template = Ref.new( { type: 'template', id: def.id() }, ref, true );
            const model = Ref.new( { type: 'model3d', id: def.id() }, template, true );
            template.name.set( def.name );

            const person = Ref.property.new( model, {
                name: 'person',
                type: 'select',
                options: pers_names,
                hook: model.id,
                change: init
            } );

        }
    }

    return addon;
}

let scene, renderer, camera
let model;

const anim_list = 
    {
        "no": [ "angry gesture", "annoyed head shake", "being cocky", "Defeat Idle", "Defeated", "Disappointed", "dismissing gesture", "happy hand gesture", "Head Gesture", "look away gesture", "Looking Down","Shake Fist", "shaking head no", "Whatever Gesture", "Standing React Death Forward", "Yelling", "Shrugging" ],
        "yes": [ "Bboy Hip Hop Move", "Clapping", "hard head nod", "head nod yes", "Hip Hop Dancing", "House Dancing", "Joyful Jump", "lengthy head nod", "Locking Hip Hop Dance", "Macarena Dance", "Salsa Dancing (1)", "Samba Dancing", "Silly Dancing", "Victory Idle (2)", "Rumba Dancing", "Salsa Dancing", "Victory Idle (1)" ],
        "wel": [ "Arm Stretching", "Hand Raising", "Happy Idle", "Offensive Idle", "Pointing Gesture", "Victory", "watering", "Waving (4)", "Waving", "Waving Gesture", "Waving (2)", "Strong Gesture" ],
        "idle": [ "weight shift", "Dizzy Idle", "Dwarf Idle", "Happy Idle", "holding idle", "idle", "Sad Idle (1)", "Sad Idle" ]
}

const pers_names = [ 'Aj', 'Amy', 'Ch03_nonPBR', 'Ch14_nonPBR', 'Ch23_nonPBR', 'Ch29_nonPBR', 'pers01', 'pers02', 'pers03', 'pers04', 'pers05', 'pers07', 'Sporty Granny', 'X Bot', 'Y Bot' ];

function init( property, value ) {
    const ref = property.ref;
    if( value ) {
        ModelTools.clearRefModel( ref );
        const avatar = createModel(
            './addons/avatar/content/',
            value,
            ( model ) => {
                model.setPerson( ( group ) => {
                    if( model.person ) removeObj( model.person );
                    model.person = group;

                    let box3 = new THREE.Box3().setFromObject( group );
                    let size = new THREE.Vector3();
                    box3.getSize( size );
                    group.size = { w: size.x,  h: size.y,  d: size.z }
                    const gab = Math.max(group.size.w, group.size.h);
                    ref.model.side = { w: group.size.w/gab, h: group.size.w/gab, d: group.size.d/gab };
                    group.scale.set( gab, gab, gab );
                    group.position.y = -0.5;
                    appendObj( ref, group );

                    model.idle( 'weight shift', () => {
                        const list = anim_list.idle;
                        const index = Math.floor( list.length * Math.random() );
                        return anim_list.idle[index];
                } );

                function run( mode ) {
                    const list = anim_list[mode];
                    const index = Math.floor( list.length * Math.random() );
                    const name = anim_list[mode][index];
                    model.run( name, 1 );
                }

                document.addEventListener( 'keydown', (event) => {
                    const code = event.code;
                    if( code === 'KeyN' ) run( 'no' );
                    if( code === 'KeyY' ) run( 'yes' );
                    if( code === 'KeyW' ) run( 'wel' );
                    if( code === 'KeyI' ) run( 'idle' );
                } );
            } );
        },
        ( modify ) => {}
        );
        ref.model.modify = () => {
            
            avatar.modify();
        }
    }
} 

function createModel( path, personName, do_init = ( model ) => {}, do_modify = ( model ) => {} ) {
    const model = {
        path: path,
        personName: personName,
        items: {},
        actions: {},
        mixer: null,
        idleAction: null,
        activeAction: null,
        do_init: do_init,
        do_modify: do_modify
    }

    model.load = ( path, name, onload = ( group ) => {} ) => {
        model.items[name] = null;
        const loader = new FBXLoader();
        loader.load( path + name + '.fbx', function ( fbx ) { model.items[name] = fbx; fbx.name = name; onload( fbx ); } );
    }

    model.modify = () => {
        if( !model.init ) {
            model.init = true;
            model.clock = new THREE.Clock();
            model.do_init( model );
        } else {
            //ModelTools.applyTransform( )
            let delta = model.clock.getDelta();
            if( model.mixer ) {
                model.do_modify( model );
                model.mixer.update( delta );
                // if( model.activeAction ) console.log( model.activeAction.getEffectiveWeight() );
                // if( model.idleAction ) console.log( model.idleAction.getEffectiveWeight() );
            }
        }
    }

    function onIdleFinished( event ) {
        if ( event.action === model.idleAction && model.idleAction ) {
            if( Math.random()<0.8 ) {
                const name = model.idleAction.next();
                if( model.idleAction.name !== name ) model.idle( name, model.idleAction.next );
            }
        }
    }

    model.setPerson = ( order = ( group ) => {} ) => {
        model.load( model.path + 'character/' , model.personName, ( group ) => {
            model.mixer = new THREE.AnimationMixer( group );
            model.mixer.addEventListener( 'loop', onIdleFinished );
            order( group );
        } );
    }

    model.setAction = ( name, order = ( action ) => {} ) => {
        if( !model.items[name] ) {
            model.load( model.path + 'animation/', name, ( group ) => {
                model.setAction( name, order );
            } );
        } else {
            const item = model.items[name];
            const action = model.mixer.clipAction( item.animations[0] );
            action.name = name;
            action.clampWhenFinished = true;
            action.loop = THREE.LoopOnce;
            model.actions[name] = action;
            order( action );
            action.play();
        }
    }

    model.fadeAction = ( action, duration ) => {
        model.previousAction = model.activeAction? model.activeAction: action;
        model.activeAction = action;
        model.activeAction
        .reset()
        .crossFadeFrom( model.previousAction, duration );
//					.setEffectiveTimeScale( 1 )
//					.setEffectiveWeight( 1 )
        //.play();
    }

    model.idle = ( name, next = () => { return name; } ) => {
        if( !name && model.idleAction ) {
            name = model.idleAction.name;
            next = model.idleAction.next;
        }

        model.setAction( name, ( action ) => {
            action.next = next;
            model.idleAction = action;
            action.setLoop( THREE.LoopRepeat );
            model.fadeAction( action, 1 );
        } );
    }

    model.run = ( name, duration ) => {
        model.setAction( name, ( action ) => {
            model.fadeAction( action, duration );
            model.mixer.addEventListener( 'finished', onActionFinished );

            function onActionFinished( event ) {
                if ( event.action === action ) {
                    model.mixer.removeEventListener( 'finished', onActionFinished );
                    model.idle();
                }
            }
        } );
    }

    return model;
}

// init();

// function init() {
//     const container = document.getElementById( 'container' );

//     camera = new THREE.PerspectiveCamera( 45, window.innerWidth / window.innerHeight, 1, 100 );
//     camera.position.set( 1, 2, - 3 );
//     camera.lookAt( 0, 1, 0 );

//     scene = new THREE.Scene();
//     scene.background = new THREE.Color( 0xa0a0a0 );
//     scene.fog = new THREE.Fog( 0xa0a0a0, 10, 50 );

//     const hemiLight = new THREE.HemisphereLight( 0xffffff, 0x8d8d8d, 3 );
//     hemiLight.position.set( 0, 20, 0 );
//     scene.add( hemiLight );

//     const dirLight = new THREE.DirectionalLight( 0xffffff, 3 );
//     dirLight.position.set( - 3, 10, - 10 );
//     dirLight.castShadow = true;
//     dirLight.shadow.camera.top = 2;
//     dirLight.shadow.camera.bottom = - 2;
//     dirLight.shadow.camera.left = - 2;
//     dirLight.shadow.camera.right = 2;
//     dirLight.shadow.camera.near = 0.1;
//     dirLight.shadow.camera.far = 40;
//     scene.add( dirLight );

//     const mesh = new THREE.Mesh( new THREE.PlaneGeometry( 100, 100 ), new THREE.MeshPhongMaterial( { color: 0xcbcbcb, depthWrite: false } ) );
//     mesh.rotation.x = - Math.PI / 2;
//     mesh.receiveShadow = true;
//     scene.add( mesh );

//     model = createModel(
//         './presentation/default/model3d/',
//         'Ch03_nonPBR',
//         ( model ) => {
//             model.person( ( group ) => {
//                 scene.add( group );
//                 group.scale.set( 0.01, 0.01, 0.01 );
//                 group.rotateY( Math.PI );
//                 model.idle( 'weight shift', () => {
//                     const list = anim_list.idle;
//                     const index = Math.floor( list.length * Math.random() );
//                     return anim_list.idle[index];
//             } );

//             function run( mode ) {
//                 const list = anim_list[mode];
//                 const index = Math.floor( list.length * Math.random() );
//                 const name = anim_list[mode][index];
//                 model.run( name, 1 );
//             }

//             document.addEventListener( 'keydown', (event) => {
//                 const code = event.code;
//                 if( code === 'KeyN' ) run( 'no' );
//                 if( code === 'KeyY' ) run( 'yes' );
//                 if( code === 'KeyW' ) run( 'wel' );
//                 if( code === 'KeyI' ) run( 'idle' );
//             } );

//         } ); },
//         ( modify ) => {}
//     );

//     renderer = new THREE.WebGLRenderer( { antialias: true } );
//     renderer.setPixelRatio( window.devicePixelRatio );
//     renderer.setSize( window.innerWidth, window.innerHeight );
//     renderer.shadowMap.enabled = true;
//     container.appendChild( renderer.domElement );
//     window.addEventListener( 'resize', onWindowResize );
//     renderer.setAnimationLoop( animate );
// }

// function onWindowResize() {
//     camera.aspect = window.innerWidth / window.innerHeight;
//     camera.updateProjectionMatrix();
//     renderer.setSize( window.innerWidth, window.innerHeight );
// }

// function animate() {

//     model.modify();
//     renderer.render( scene, camera );

// }

