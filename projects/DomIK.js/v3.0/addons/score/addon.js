import * as THREE from 'three';

import * as ROUTE from '../../core/subroute/subroute.js'
import { Ref } from '../../core/subroute/project.js'
import { ModelTools } from '../../core/subroute/model.js'

const type_names = ['Stars', 'Diamond'];

export function registry( def ) {

    console.log( 'Addons install', def.info );

    const addon = {
        content: ( ref ) => {
            def.offset = 0;
            ref.name.set( def.info );
            const template = Ref.new( { type: 'template', id: def.id() }, ref, true );
            const model = Ref.new( { type: 'model3d', id: def.id() }, template, true );
            template.name.set( def.name );
            const score_model = Ref.property.new( model, { name: 'score_type', type: 'select', options: type_names, hook: model.id, change: init } );

            def.sub.registry( def.name, ( options ) => {
                //alert( options.mode );
            } );
        }
    }

    return addon;
}

function init( property, value ) {
    const ref = property.ref;
    if( value ) {
        ModelTools.clearRefModel( ref );
        if( ref.score_stars ) removeObj( ref.score_stars );
        const color = ( ref.score_type.is( 'Stars' ) )? 0x00ff00: 0xff0000;
        const geometry = new THREE.BoxGeometry( 0.1, 0.1, 0.1 );
        const material = new THREE.MeshBasicMaterial( { color: color } );
        const group = new THREE.Mesh( geometry, material );

        ref.score_stars = group;

        let box3 = new THREE.Box3().setFromObject( group );
        let size = new THREE.Vector3();
        box3.getSize( size );
        group.size = { w: size.x,  h: size.y,  d: size.z }

        const scale = 1.0;
        ref.model.side = { w: scale*group.size.w, h: 1.0, d: scale*group.size.d };
        group.scale.set( scale, scale, scale );
        group.position.y = 0.1;
        appendObj( ref, group );
    }
}
