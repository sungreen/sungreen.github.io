'use strict';

import * as THREE from 'three';
import * as ROUTE from './subroute.js'
import { vecXYZ, rotXYZ } from './model.js';
// import { ModelTools } from './model.js';
// import { app } from '../../static/settings.js';

let app;
const roots = [];

export function subroute() {
    const sub = ROUTE.route( 'layouts' );
    app = ROUTE.app;

    sub.registry( 'needsUpdate', ( options ) => {
        if( app.project ) {
            roots.clear();
            const ref = app.project.presentation;
            const layout = Layouts.make( null, ref );
            roots.push( [layout, ref] );
        }

        roots.forEach( ( root ) => {
            root[0].needArea();
            root[0].needOffset();
            applyTransform( root[1] );
        } );
    } );

    return sub;
}

function vec( x=0, y=0, z=0 ) { if( typeof x === 'object' ) return x? vec( 0, 0, 0 ).copy( x ): vec(); return new THREE.Vector3( x, y, z); }

function applyTransform( ref ) {
    ref.model.updateTransform();
    if( ref.children ) {
        ref.children.forEach( ( child ) => {
            applyTransform( child )
        } );
    }
}

let id;

const Layouts = {
    make: ( top=null, ref=null ) => {
        let layout;
        if( ref.isGroup() ) {
            const direction = ref.group.direction.get();
            if( direction === 'row' ) layout = Layouts.row( top, ref );
            else if( direction === 'column' ) layout = Layouts.column( top, ref );
            else if( direction === 'block' ) layout = Layouts.block( top, ref );
            else {
                layout = Layouts.block( null, ref );
                roots.push( [layout, ref] )
            }
            if( layout ) layout.appendChildren();
        } else {
            layout = Layouts.shape( top, ref );
        }
        return layout;
    },

    base: ( top=null, ref=null ) => {
        const layout = {
            _rect_: vec(),
            side: vec(),
            offset: vec(),
            level: 0,
            children: [],
            relative: true
        }

        if( ref ) {
            layout.ref = ref;
            const basis = ref.transform.basis.get();
            layout.basis = basis? basis: 1;
            layout.flex = basis? 0: 1;
            ref.layout = layout;
            layout.relative = false;
        }

        if( top ) {
            layout.top = top;
            top.children.push( layout );
        }

        layout.appendRect = ( v ) => {
            const i = ( layout.dir? 0: 1 );
            const j = ( layout.dir? 1: 0 );
            layout._rect_.setComponent( i, layout._rect_.getComponent( i ) + v.getComponent( i ) );
            layout._rect_.setComponent( j, Math.max( layout._rect_.getComponent( j ), v.getComponent( j ) ) );
        }

        layout.maxRect = ( v ) => { layout._rect_.max( v ); }
        layout.setRect = ( v ) => { layout._rect_.copy( v ); }
        layout.basisRect = ( basis, rect ) => {};
        layout.needAreaBase = layout.needArea = ( ) => { if( layout.top && layout.basis ) layout.top.basisRect( layout.basis, layout._rect_ ); }

        layout.needOffsetBase = layout.needOffset = ( rect, offset=vec() ) => {
            layout.level = layout.top? layout.top.level - 1: layout.level;
            layout.floor = layout.top? layout.top.floor + 1: 0;
            layout.side.copy( rect? rect: layout._rect_ );
            layout.offset.copy( offset );
            if( ref ) {
                ref.model.setSide( layout.side );
                ref.model.setPosition( layout.offset );
            }
        }

        layout.appendChildren = () => {
            for( const child of layout.ref.children ) {
                if( child && child.isVisible() ) Layouts.make( layout, child );
            }
        }

        return layout;
    },

    shape: ( top=null, ref=null ) => {
        const layout = Layouts.base( top, ref );

        layout.needAreaShape = layout.needArea = ( ) => {
            layout.level = 1;
            layout.setRect( vec( 1, 1, 1 ) );
            layout.needAreaBase();
        }

        return layout;
    },

    origin: ( top=null, ref=null ) => {
        const layout = Layouts.base( top, ref );
        const margin = ref? ref.group.margin.get(): 0;
        layout.margin = vec();

        layout.basisRect = ( basis, rect ) => { rect.multiplyScalar( basis ); }
        layout.offsetRect = () => {}

        layout.needAreaBlock = layout.needArea = () => {
            layout.needAreaBase();
        }

        layout.needOffsetBlock = layout.needOffset = ( rect, offset=vec() ) => {
            layout.needOffsetBase( rect, offset );
            if( layout.children.length ) {
                for( const child of layout.children ) {
                    const crect = vec( child._rect_ );
                    child.needOffset( crect, vec() );
                }
            }
        }

        return layout;
    },

    block: ( top=null, ref=null ) => {
        const layout = Layouts.base( top, ref );
        const margin = ref? ref.group.margin.get(): 0;
        layout.margin = vec( margin, margin, margin ).max( vec( 0.1, 0.1, 0.1 ) );

        layout.basisRect = ( basis, rect ) => { rect.multiplyScalar( basis ); }
        layout.offsetRect = () => {}

        layout.needAreaBlock = layout.needArea = () => {
            layout.flex = 0;
            for( const child of layout.children ) {
                child.needArea();
                layout.level = Math.max( child.level + 1, layout.level );
                layout.flex += ( child.flex );
                const v = vec( child._rect_ ).add( layout.margin );
                layout.maxRect( v );
            }
            layout.needAreaBase();
        }

        layout.needOffsetBlock = layout.needOffset = ( rect, offset=vec() ) => {
            layout.needOffsetBase( rect, offset );
            if( layout.children.length ) {
                for( const child of layout.children ) {
                    const crect = vec( child._rect_ );
                    child.needOffset( crect, vec() );
                }
            }
        }

        return layout;
    },

    row: ( top=null, ref=null ) => {
        const layout = Layouts.grid( top, ref );
        layout.dir = true;
        return layout;
    },

    column: ( top=null, ref=null ) => {
        const layout = Layouts.grid( top, ref );
        layout.dir = false;
        return layout;
    },

    grid: ( top=null, ref=null ) => {
        const layout = Layouts.block( top, ref );
    
        layout.basisRect = ( basis, rect ) => {
            const i = layout.dir? 0: 1;
            rect.setComponent( i, rect.getComponent( i ) * basis );
        }

        layout.appendChildren = () => {
            const children = [];
            for( const child of layout.ref.children ) if( child && child.isVisible() ) children.push( child );

            const limit = ref.group.limit.get();
            const count = children.length;
            const range = ( limit && limit<count )? limit: count;
            const lines = Math.floor( ( count - 1 ) / range + 1 );

            if( lines > 1 ) {
                layout.dir =  !layout.dir;
                let line;
                let index = range;
                for( const child of children ) {
                    if( index === range ) {
                        line = Layouts.grid( layout );
                        line.dir = !layout.dir;
                        index = 0;
                    }
                    const c = Layouts.make( line, child );
                    index++;
                }
            } else {
                for( const child of children ) Layouts.make( layout, child );
            }
        }

        layout.needAreaGrid = layout.needArea = () => {
            layout.flex = 0;
            for( const child of layout.children ) {
                child.needArea();
                layout.level = Math.max( child.level + 1, layout.level );
                layout.flex += ( child.flex );
                const v = vec( child._rect_ ).add( layout.margin );
                layout.appendRect( v );
            }
            layout.needAreaBase();
        }

        layout.needOffsetGrid = layout.needOffset = ( rect, offset=vec() ) => {
            layout.needOffsetBase( rect, offset );

            if( layout.children.length ) {
                const [i, j, g] = layout.dir? [0, 1, 1]: [1, 0, -1];

                // Прибавка на одну flex единицу
                const f = layout.flex ? ( rect.getComponent( i ) - layout._rect_.getComponent( i ) ) / layout.flex : 0;

                // Начальное смещение ( ????? )
                let p = -g * rect.getComponent( i ) / 2;

                for( const child of layout.children ) {
                    const crect = vec( child._rect_ );
                    crect.setComponent( i, crect.getComponent( i ) + f * child.flex + layout.margin.getComponent( i ) );
                    crect.setComponent( j, rect.getComponent( j ) );
                    p += g * crect.getComponent( i ) / 2;
                    const ts = vec( crect ).sub( layout.margin );
                    const tp = vec().setComponent( i, p );
                    if( layout.relative ) tp.add( offset );
                    child.needOffset( ts, tp );
                    p += g * crect.getComponent( i ) / 2;
                }
            }
        }

        return layout;
    },
}