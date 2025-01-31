import * as ROUTE from './subroute/subroute.js'

export const extensions = {
    video:  ['.avi','.ogg','.mov','.mp4'],
    image:  ['.png','.jpg'],
    sound:  ['.aac', '.mp3'],
    text:   ['.txt' ],
    shader: ['.glsl'],
    pdf:    ['.pdf'],
    model3d:['.fbx'],
    addon:  ['.dmx'],
}

let path_content;

export function getTypeByPath( path ) {
    if( path ) {
        const p = path.split( '.' );
        const ext = '.' + p.pop().toLowerCase();
        const name = p.pop().split( '/' ).pop();
        for( const [type, list] of Object.entries( extensions ) ) {
            if( list.includes( ext ) ) return { type: type, ext: ext, path: path, name: name };
        }
    }
    return { type: null, ext: null, path: null, name: null };
}

export function getStoragePath() {
    return path_content;
}

export function setContentPath( path ) {
    path_content = path;
    ROUTE.send( 'console_log', { msg: 'Set path content: ' + path } );
}

function findContentPath( file, index=0, path_resources, oncheck ) {
    const filename = path_resources[ index ] + file.name;
    fetch( filename )
    .then( response => {
        ROUTE.send( 'console_log', { msg: 'Find content: ' + filename } );
        file.contentPath = getStoragePath();
        file.filePath = filename.replace( getStoragePath(), '' );
        oncheck( file );
    } )
    .catch( error => { if( ( index + 1 )<path_resources.length ) { findContentPath( file, index+1, oncheck ) } else { oncheck( file ) } } );
}

export function getContentPath( file, oncheck = ( file ) => { alert( file.filePath ) } ) {
    const filename = file.name;
    const { type, ext, path, name } = getTypeByPath( filename );
    if( type ) {
        const path_resources = [];
        if( type === 'addon' ) {
            path_resources.push( './addons/' + name + '/' );
        } else {
            const types = [type, ...Object.keys( extensions )];
            for( const [i] in types ) {
                const path = ( getStoragePath() + '/' + types[i] + '/').replace( '//', '/' );
                path_resources.push( path );
            }
        }
        findContentPath( file, 0, path_resources, oncheck );
    }
}

export function getURL( res ) {
    if( res.type === 'addon' ) return res.path; 
    return getStoragePath() + res.path;
}

function copyData( storage, sour, appendNew = false ) {
    let dest = storage;
    for( let source_key in sour ) {
        let new_value = sour[source_key];
        let old_value = null;
        const keys = source_key.split( '.' );
        if( keys.length > 1) {
            let key;
            for( let k=0; k<keys.lenght-1; k++ ) {
                key = keys[k];
                if( Object.hasOwn( dest, key ) && typeof dest == 'object' ) {
                    dest = dest[key];
                } else {
                    return;
                }
            }
            key = keys[keys.length-1];
            copyData( dest, { key: new_value }, appendNew );
        } else {
            let key = keys[0];
            if( Object.hasOwn( dest, key ) ) {
                old_value = dest[key];
                if( typeof old_value == typeof new_value ) {
                    dest[key] = new_value;
                } else {
                    switch ( typeof old_value )
                    {
                    case 'object': alert( 'Error type copyData', old_value, new_value ); break;
                    case 'number':
                        switch( typeof new_value ) {
                            case 'object': alert( old_value, new_value ); break;
                            case 'string': dest[key] = Number( new_value ); break;
                            case 'boolean': dest[key] = new_value ? 1: 0;
                        }
                    break;
                    case 'string':
                        switch( typeof new_value ) {
                            case 'object': alert( 'Error type copyData', old_value, new_value ); break;
                            case 'number': dest[key] = new_value.toString(); break;
                            case 'boolean': dest[key] = new_value ? "true": "false";
                        }
                    break;
                    case 'boolean':
                        switch( typeof new_value ) {
                            case 'object': alert( 'Error type copyData', old_value, new_value ); break;
                            case 'number': dest[key] = new_value ? true: false; break;
                            case 'string': dest[key] = new_value=='true' ? true: false;
                        }
                    break;
                    }
                }
            } else {
                if( appendNew ) {
                    if( typeof new_value == 'object') {
                        dest[key] = {};
                        copyData( dest[key], new_value, appendNew );
                    } else {
                        dest[key] = new_value;
                    }
                }
            }
        }
    }
}

export function readDefault( storage, sour ) {
    copyData( storage, sour, true );
}

export function readFromURL( storage, sour = null ) {
    var data = {};
    var href = sour ? '?'+sour : document.location.href;
    var querys = String( href ).split('?');
    for( let q=1; q<querys.length; q++ ) {
        const query = querys[q];
        var parts = query.split('&');
        for ( let p in parts ) {
            var part = parts[p].split( '=' );
            var path = part[0].split( '.' );
            var val = part[1];
            var tmp = data;
            for( let i=0; i<path.length-1; i++ ) {
                var key = path[i];
                if( !Object.hasOwn( tmp, key ) ) tmp[key] = {};
                tmp = tmp[key];
            }
            var key = path[path.length-1];
            tmp[key] = val;
        }
    }
    copyData( storage, data );
}

export function readFromFile( storage, file, onread = () => {} ) {
    const reader = new FileReader();
    reader.readAsText( file );
    reader.onload = order;

    function order() {
        const sour = JSON.parse( reader.result );
        for( const [key, value] of Object.entries( sour ) ) {
            storage[key] = value;
        }
        onread();
    };
}

export function writeToFile( data, filename ) {
    const link = document.createElement("a");
    const file = new Blob( [JSON.stringify( data )], { type: 'text/plain' } );
    link.href = URL.createObjectURL( file );
    link.download = filename;
    link.click();
    URL.revokeObjectURL( link.href );
    link = null;
    file = null;
}

export function readFrolLocalStorage( storage ) {
    copyData( storage, localStorage );
}

export function writeToLocalStorage( storage, prefix = '' ) {
    for( let key in storage ) {
        let value = storage[key];
        if( typeof value == 'object' ) {
            writeToLocalStorage( value, prefix+key+'.' );
        } else {
            localStorage.setItem( prefix+key, value );
        }
    }
}

//Local File

export function readDataFromJSON( path, success = ( data ) => {}, error = ( event ) => {} ) {
    fetch( path )
    .then( ( response ) => response.json() )
    .then( ( json ) => success( json ) )
    .catch( () => error( path ) );
}

//IndexedDB
function slog( ops, msg ) { console.log( 'store log:', ops, msg ); }

function dbTransaction( order = ( store ) => {}, success = ( store ) => {} ) {
    const connection = { dbname:'domik', store:'defs', version:1 };
    
    const open = indexedDB.open( connection.dbname, connection.version );

    open.onupgradeneeded = function( event ) {
        const db = open.result;
        switch( event.oldVersion ) {
            case 0:
                db.createObjectStore( connection.store );
                slog( 'indexedDB', 'create store');
                break;
            default:
                if( !db.objectStoreNames.contains( connection.store ) ) db.createObjectStore( connection.store );
                slog( 'indexedDB', 'connection store');
                break;
        }
    };

    open.onsuccess = function() {
        const db = open.result;
        if( db.objectStoreNames.contains( connection.store ) ) {
            const tx = db.transaction( connection.store, 'readwrite' );
            const store = tx.objectStore( connection.store );
            order( store );
            tx.oncomplete = function() { db.close(); };
            success( store );
            slog( 'indexedDB', 'success');
        } else {
            db.close();
            indexedDB.deleteDatabase( connection.dbname );
            alert( 'Reload page!')
            slog( 'indexedDB', 'not success');
        }
    };

    open.onerror = ( event ) => {
        error( event );
    }
}

export function writeToIndexedDB( data, key, success = ( data ) => {}, error = ( event ) => {} ) {
    dbTransaction( ( store ) => {
        store.put( data, key );
        slog( 'indexedDB', 'transaction');
    }, success, error );
}

export function clearIndexedDB( data, key, success = ( data ) => {}, error = ( event ) => {} ) {
    dbTransaction( ( store ) => {
        store.clear();
        slog( 'indexedDB', 'clear');
    }, success, error );
}

export function readDataFromIndexedDB( key, success = ( data ) => {}, error = ( event ) => {} ) {
    dbTransaction( ( store ) => {
        const sour = store.get( key );
        sour.onsuccess = ( event ) => {
            if( sour.result ) {
                const data = {};
                for( const [key, value] of Object.entries( sour.result ) ) {
                    data[key] = value;
                }
                success( data );
            } else {
                error( 'no data' );
            }
        }
        sour.onerror = ( event ) => {
            error( event );
        }
    } );
}