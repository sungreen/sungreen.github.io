'use strict';

import * as ROUTE from './subroute.js';

import { nDownloadFile, nInputFile, setParent } from '../ndiv.js';
import { readFromFile, readDataFromIndexedDB, writeToIndexedDB, clearIndexedDB, writeToFile, readDataFromJSON, getStoragePath, getContentPath, setContentPath } from '../storage.js';
import { ModelTools, seekRefByType, setRefParent, makeModel, getListOfResources, loadResource } from './model.js';

export const JS = { CHILDREN: true, FORCE: true }

const static_refs = ['project', 'presentation', 'templates', 'addons'];

export const Ref = {
    new: ( sour, from, force=false ) => {
        const id = sour.id ? sour.id: ( Math.floor( ( Date.now()%100000000 + Math.random() ) * 1000000000 ) ).toString( 32 ).toLowerCase().slice(-12);
        const ref = { id: id, type: sour.type, children: [] }

        ref.updateProperty = async ( property, value ) => {}

        setRefParent( ref, from, force );
        makeModel( ref );

        if( static_refs.includes( ref.type ) ) {
            if( ref.type === 'project' ) app.project = ref;
            else app.project[ref.type] = ref;
        } else if( ref.model.group && ref.parent ) ModelTools.appendObj( ref.parent, ref.model.group );

        ref.append = ( sour) => { return Ref.append( ref, sour ); }

        if( sour.name && ref.name ) ref.name.set( sour.name );
        return ref;
    },

    allowUpdate: ( ref ) => {
        ref.model.update = ref.model.setup;
    },

    append: ( ref, sour ) => {
        return Ref.new( sour, ref, true );
    },

    inTypes: ( ref, types ) => {
        return types.includes( ref.type );
    },

    getSlide: ( ref ) => {
        while( ref && ref.type !== 'slide' ) ref = ref.parent;
        return ref.type === 'slide' ? ref: null; 
    },

    getListByTypes: ( types, ref=app.project, ret={} ) => {
        const type = ref.type;
        if( !ret[type]) ret[type] = [];
        if( !types || ( types && types.includes( type ) ) ) {
            if( !ret[type]) ret[type] = [];
            ret[type].push( ref );
        }
        if( ref.children ) ref.children.forEach( ( child ) => { getListByType( types, child, ret ); } );
        return ret;
    },

    getListByType: ( type, ref=app.project, ret={} ) => {
        return getListByTypes( [type], ref, ret )[type];
    },

    property: {
        new: ( ref, options={} ) => {

            if( options.__params__ ) Object.assign( options, options.__params__ );

            const name = options.name;
            const type = options.type;

            if( !propertyTypesList.includes( type ) ) { console.log( 'error type', ref, options ); }

            ref[name] =  {
                type: type,
                name: name,
                value: null,
                __ref__: ref.__ref__? ref.__ref__: ref,
                __change__: true,
                __params__: {},
                label: name
            };

            const property = ref[name];

            property.is = ( value )=> {
                if( property.type === 'properties' ) {
                    if( Ref.property.isProperty( value, 'properties' ) ) {
                        let ret = true;
                        const props = Ref.properties.getList( value );
                        props.forEach( ( prop ) => {
                            if( property[prop.name] && !property[prop.name].is( prop.get() ) ) ret = false;
                        } );
                        return ret;
                    } else {
                        return false;
                    }
                } else {
                    return ( property.get() === value );
                }
            }

            // if( type === 'properties' ) {
            //     property.updateProperty = async ( prop, value ) => { property.ref.updateProperty( prop, value ); }
            // }

            property.set = async ( value, force=false, update=true ) => {
                if( !property.is( value ) || force ) {
                    property.__change__ = true;

                    if( property.type === 'properties' ) {
                        if( Ref.property.isProperty( value, 'properties' ) ) {
                            const props = Ref.properties.getList( value );
                            for( const prop of props) {
                                if( property[prop.name] ) {
                                    if( !property[prop.name].is( prop.get() ) ) await property.set( prop.get() );
                                } else {
                                    Ref.property.new( property, prop );
                                    await property.set( prop.get() );
                                }
                            }
                        }
                    } else {
                        property.value = value;
                        if( property.type === 'resource' ) property.__resource__ = await ModelTools.getResource( value );
                        if( property.__ref__.updateProperty && update ){ await property.__ref__.updateProperty( property, value ); }
                    }
                }
                return property;
            }

            property.get = () => {
                if( property.type === 'properties' ) return property;
                return property.value;
            }

            property.enable = () => { return true; }
            property.option = ( key, value ) => { return property.__params__[key]? property.__params__[key]: value; }

            for( const [ key, value ] of Object.entries( options ) ) {
                if( ![ 'name', 'type', 'hook', 'uix', 'prop', 'init', 'postfix', 'enable' ].includes( key ) ) {
                        property.__params__[key] = value;
                }
            }

            function test( obj, param ) { return Object.hasOwn( obj, param ) && obj[param]; }

            if( test( options, 'uix' )  ) property.uix = options.uix;
            if( test( options, 'hook' ) ) property.hook = options.hook;
            if( test( options, 'enable' ) ) property.enable = options.enable;
            if( test( options, 'label' ) ) property.label = options.label;
            if( test( options, 'postfix' ) ) property.__postfix__ = options.postfix;
            if( test( options, 'init' ) ) {
                property.__init__ = options.init;
                property.set( options.init );
            };

            return property;
        },

        check: ( prop ) => {
            if( prop && prop.__change__ ) {
                prop.__change__ = false;
                return true;
            }
            return false;
        },

        alias: ( prop ) => {
            return [prop.type, prop.name, ( prop.uix ? 'uix': '' ),  ( prop.hook ? prop.hook: '' )].join( ':' );
        },

        copyProperty: ( ref, property ) => {
            const name = property.name;
            if( !ref[name] ) {
                const type = property.type;
                Ref.property.new( ref, property.__paranms__ );
            }
            const prop = ref[name];
            prop.set( property.get() );
        },

        isProperty: ( property, type ) => {
            if( property.__params__ ) {
                if( type && property.type === type ) return true;
                return true;
            }
            return false;
        },

        enable: ( prop, flag=true ) => {
            prop.enable = flag? () => { return true; }: () => { return false; };
        },

        getByPath: ( path, ref = app.project ) => {
            let t = path;
            let o = ref;
            while( t.length ) {
                let s = t.shift();
                if( typeof s === 'number' ) o = o.children[s];
                else o = o[s];
                if( !o ) return null;
            }
            return o;
        },
    },

// Hooks - свойство с аттрибутом hook
// Список hooks - все свойства c hooks всех refs по дереву вниз

    getById: ( id, ref = app.project ) => {
        if( ref.id === id ) return ref;
        if( ref.children ) {
            for( let child of ref.children ) {
                let ret = Ref.getById( id, child );
                if( ret ) return ret;
            }
        }
        return null;
    },

    children: {
        clear: ( ref ) => {
            ref.children.forEach( ( child ) => {
                Ref.children.clear( child );
                if( child.model ) {
                    ModelTools.removeObj( child.model.shape );
                    ModelTools.removeObj( child.model.group );
                }
            } );
            ref.children.clear();
        },

        copy: ( sour, dest ) => {
            Ref.children.clear( dest );
            sour.children.forEach( ( item ) => {
                const ref = Ref.new( { type: item.type }, dest, JS.FORCE );
                if( item.model.finaly ) ref.model.finaly = item.model.finaly;
                Ref.properties.copy( item, ref );
                Ref.children.copy( item, ref );
            } );
        },

        clone: ( sour, dest ) => {
            Ref.children.clear( dest );
            sour.children.forEach( ( item ) => {
                setRefParent( item, dest, JS.FORCE );
            } );
        },

        getList: ( ref ) => {
            const list = [];
            if( ref.children ) ref.children.forEach( ( item ) => list.push( item ) );
            return list;
        }

    },

    properties: {
        copy: ( sour, dest, force=true ) => {
            Ref.properties.getList( sour ).forEach( ( rec ) => {
                const [property, name, path] = rec;
                const prop = dest[name]? dest[name] : ( ( force || property.hook )? Ref.property.new( dest, property ): null );
                if( prop ) {
                    if( property.type === 'properties' ) Ref.properties.copy( property, prop );
                    else {
                        if( property.__params__ ) prop.__params__ = { ...property.__params__ };
                        if( property.value ) prop.set( property.get() );
                    }
                }
            } );
        },

        getList: ( ref, children=!JS.CHILDREN, path=[], list=[], filter ) => {
            for( const [ name, property ] of Object.entries( ref ) ) {
                if( property && property.__ref__ && property.enable() ) {
                    if( !filter || filter( property ) ) list.push( [property, name, path.concat( name )] );
                    if( property.type === 'properties' && children ) Ref.properties.getList( property, true, path.concat( name ), list, filter );
                }
            }
            return list;
        },

        getHooks: ( ref, path=[], list=[] ) => {
            Ref.properties.getList( ref, JS.CHILDREN, path, list, ( property ) => {
                return property.hook? true: false;
            } );
            Ref.children.getList( ref ).forEach( ( item, index ) => {
                Ref.properties.getHooks( item, [ index, ... path], list )
            } );
            return list;
        },

        reload: async ( ref ) =>  {
            Ref.properties.getList( ref ).forEach( ( rec ) => {
                const [property, name, path] = rec;
                if( property.type === 'properties' ) {
                    Ref.properties.reload( ref[name] )
                } else {
                    console.log( 'reload', ref.type, property.name, property.get() );
                    property.set( property.get(), true );
                }
            } );
        }
    }
}


const propertyTypesList = ['object', 'properties', 'string', 'path', 'textarea', 'number', 'range', 'vector', 'color', 'checkbox', 'select', 'resource'];

export function order_children( sour, order = ( item, index, path ) => {}, children=!JS.CHILDREN, path = [] ) {
    sour.children.forEach( ( item, index ) => {
        order( item, index, path );
        if( children ) order_children( item, order, children, path.concat( [index] ) );
    } );
}

export function remove_properties( sour, order = ( property, key ) => {} ) {
    for( const [ key, property ] of Object.entries( sour ) ) {
        if( property ) {
            if( typeof property === 'object' && !( property instanceof Array ) ) {
                if( ( Object.hasOwn( property, 'value' ) && Object.hasOwn( property, 'type' ) ) || property.type === 'properties' ) delete sour[key];
            }
        }
    }
}

// UIX

async function getDataFromUIX( ref, data ) {
    if( data ) {
        function isopen( ref, list ) {
            if( ref.is_open ) list.push( ref.id );
            if( ref.children ) ref.children.forEach( ( child ) => { isopen( child, list ); } );
        }
        isopen( ref, data.openrefs = [] );
    }
}

async function getUIXFromData( data, ref ) {
    if( data ) {
        function isopen( ref, list ) {
            if( list ) {
                if( list.includes( ref.id ) ) {
                    ref.is_open = true;
                    list.removeOf( ref.id );
                }
                if( ref.children ) ref.children.forEach( ( child ) => { isopen( child, list ); } );
            }
        }
        isopen( ref, data.openrefs );
    }
}

// Resources

async function getDataFromResource( data ) {
    if( data ) {
        data.path = getStoragePath();
        data.list = []
        const list = getListOfResources();
        for( const path of list ) {
            data.list.push( path );
        }
    }
}

async function getResourceFromData( data ) {
    if( data ) {
        setContentPath( data.path? data.path: './presentation/default/' );
        if( data.list ) {
            for( const path of data.list ) {
                await ModelTools.getResource( path );
            }
        }
    }
}

// Ref

function getDataFromRef( ref, parent={} ) {
    const data = {};
    const alias = [ref.type, ref.id ].join( '.' );
    parent[alias] = data;

    function property_to_data( property, data ) {
        if( property && property.__ref__ && property.enable() ) {
            if( ( property.value !== null && property.name && property.type ) || property.type === 'properties' ) {
                const alias = Ref.property.alias( property );
                if( property.type === 'properties' ) {
                    const tmp = {};
                    Ref.properties.getList( property ).forEach( ( rec ) => {
                        const [prop, name, path] = rec;
                        property_to_data( prop, tmp );
                        if( Object.entries( tmp ).length ) data[alias] = { ...tmp }
                    } );
                } else {
                    const value = property.value;
                    if( JSON.stringify( value ) !== JSON.stringify( property.__init__ ) ) {
                        data[alias] = property.value;
                    }
                }
            }
        }
    }

    Ref.properties.getList( ref ).forEach( ( rec ) => {
        const [property, name, path] = rec;
        property_to_data( property, data );
    } );

    if( ref.type === 'project' ) {

        data.presentation = {};
        data.templates = {};
        data.addons = {};
        data.uix = {};
        data.resources = [];

        getDataFromRef( ref.addons, data.addons );
        getDataFromRef( ref.templates, data.templates );
        getDataFromRef( ref.presentation, data.presentation );
        getDataFromUIX( ref.presentation, data.uix );
        getDataFromResource( data.resources );

    } else {
        if( ref.type === 'link' ) {
            const hooks = Ref.properties.getHooks( ref );
            console.log( 'Hooks store:', hooks );
            if( hooks.length ) {
                data.params = [];
                hooks.forEach( ( rec ) => {
                    const [property, name, path] = rec;
                    data.params.push( { path: path, value: property.get() } );
                } );
            }
        } else {
            if( ref.children && ref.children.length && ref.type !== 'addon' ) {
                for( let child of ref.children ) {
                    getDataFromRef( child, data );
                }
            }
        }
    }
    return data;
}

async function copy_props( data, ref ) {
    for( const [alias, value] of Object.entries( data ) ) {
        const sp = alias.split( ':' );
        if( sp.length>1 ) {
            const [type, name, uix, hook ] = sp;
            const property = ref[name];
            if( property ) {
                if( property.type === 'properties' && type === 'properties' ) {
                    await copy_props( value, property )
                } else {
                    await property.set( value );
                }
            } else {
                Ref.property.new( ref, { name:name, type: type, uix: uix, hook: hook } );
            }
        }
    }
}

async function getRefFromData( data, parent={ children: [] } ) {
    for( const [key, value] of Object.entries( data ) ) {
        const sp = key.split( '.' );
        if( sp.length>1 ) {
            const [type, id, open ] = sp;
            const ref = Ref.new( { type: type, id: id }, parent, true );
            if( type === 'project' ) {
                await getResourceFromData( value.resources );
                await getRefFromData( value.addons, ref );
                await getRefFromData( value.templates, ref );
                await getRefFromData( value.presentation, ref );
                ref.children.reverse();
                await getUIXFromData( value.uix, ref );
            } else {
                if( type === 'link' ) {

                    //ref.model.update();

                    const params = value.params;
                    if( params ) {
                        params.forEach( ( param ) =>{
                            const { path, value } = param;
                            const property = Ref.property.getByPath( path, ref );
                            if( property ) {
                                console.log( 'Param restore', property.name, '<=', value );
                                property.set( value );
                            }
                        } );
                    }
                } else {
                    await getRefFromData( value, ref );
                }
            }
        }
    }
    await copy_props( data, parent );
    if( parent.model && parent.model.setup ) await parent.model.setup();
    // await Ref.properties.reload( parent );
}


async function loadProjectByData( data=null ) {
    ROUTE.updateLock( 'load project' );
    app.project = null;

    if( data ) {
        await getRefFromData( data );
        ROUTE.send( 'console_log', { msg: 'Load project' } );
    } else {
        Ref.new( { type: 'project' } );
        Ref.new( { type: 'presentation' }, app.project, JS.FORCE );
        Ref.new( { type: 'templates' }, app.project, JS.FORCE );
        Ref.new( { type: 'addons' }, app.project, JS.FORCE );
        ROUTE.send( 'console_log', { msg: 'Create new project' } );
    }

    ROUTE.send( 'set_active', { ref: app.project.presentation } );
    ROUTE.updateUnLock( 'load project' );
}

let app;

export function subroute() {
    const sub = ROUTE.route( 'project' );
    app = ROUTE.app;

    sub.registry( 'create_ref', ( options ) => {
        if( options.ref ) {
            const ref = Ref.new( options.ref, options.from );
            ROUTE.send( 'set_active', { ref: ref } );
            ROUTE.updateNeeds();
        }
    } );

    sub.registry( 'ops_ref_edit', ( options ) => {
        let ref = options.ref;
        if( !static_refs.includes( ref.type ) ) {

            const pref = ref.parent;
            if( pref ) {
                const dest = options.dest;
                const last = pref.children.length - 1;
                const index = pref.children.indexOf( ref );
                const count = pref.children.length;

                switch( options.mode ) {
                case 'delete':
                    if( ref.model && ref.model.group ) ModelTools.removeObj( ref.model.group );
                    ref = ( count === 1 )? pref: pref.children[( index+1 ) % count];
                    pref.children.splice( index, 1 );
                    break;
                case 'move-up':
                    if( index>0 ) [ pref.children[index], pref.children[index-1] ] = [ pref.children[index-1], pref.children[index] ];
                    else pref.children.push( pref.children.shift() );
                    break;
                case 'move-down':
                    if( index<last ) [ pref.children[index], pref.children[index+1] ] = [ pref.children[index+1], pref.children[index] ];
                    else pref.children.unshift( pref.children.pop() );
                    break;
                // case 'move-right':
                //     let container;
                //     for( let j=0; j<i; j++ ) if( pref.children[j].type === 'view' || pref.children[j].type === 'group' ) container = pref.children[j];
                //     if( container ) defParent( ref, container );
                //     break;
                case 'moveto':
                    if( ( ref.type === 'template' ) && dest.id !== ref.id ) {
                        const link = Ref.new( { type: 'link' }, dest );
                        link.ref_id.set( ref.id );
                    } else {
                        setRefParent( ref, dest );
                    }
                    break;
                }
                ROUTE.send( 'set_active', { ref: ref } );
            }
        }
    } );

    function db_store( ref, version='default' ) {
        const data = {}
        getDataFromRef( ref, data );
        writeToIndexedDB( data, version );
        ROUTE.send( 'ops_ref_stored' );
        ROUTE.send( 'console_log', { stag:'db', tag: 'indexddb', msg: 'store' } );
    }

    function db_restore( version='default' ) {
        readDataFromIndexedDB(
            version,
            ( data ) => {
                const ref = loadProjectByData( data );
                ROUTE.send( 'console_log', { stag:'db', tag: 'indexddb', msg: 'restore' } );
            },
            ( event ) => {
                readDataFromJSON( './presentation/'+version+'.json',
                    ( data ) => {
                        const ref = loadProjectByData( data );
                        ROUTE.send( 'console_log', { stag:'db', tag: version, msg: 'restore from file' } );
                    },
                    ( event ) => {
                        const ref = loadProjectByData( null );
                    }
                );
            }
        );
    }

    function db_download( ref ) {
        const data = {};
        getDataFromRef( ref, data );
        const name = ref.name.get();
        nDownloadFile( data, name + '.json' ).do_download();
        ROUTE.send( 'ops_ref_downloaded' );
        ROUTE.send( 'console_log', { stag:'db', tag: name, msg: 'download' } );
    }

    function db_clear() {
        clearIndexedDB();
        ROUTE.send( 'console_log', { stag:'db', tag: 'indexddb', msg: 'clear' } );
    }

    sub.registry( 'ops_db', ( options ) => {
        let data;
        const mode = options.mode;
        switch( mode ) {
        case 'sync': db_store( app.project ); db_restore( 'default' ); break;
        case 'store': db_store( app.project ); break;
        case 'restore': db_restore( 'default' ); break;
        case 'upload': break;
        case 'download':db_download( app.project ); break;
        case 'clear':db_clear(); db_restore( 'default' ); break;
        }
    } );

    return sub;
}