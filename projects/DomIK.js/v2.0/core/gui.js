import { options } from './core_options.js'
import { exdata } from './core_options.js'

import { dict } from './core_options.js'
import { setPreset } from './core_options.js'

function create_item( type='div', parent=null, classes=null, styles=null ) {
    const item = document.createElement( type );
    item.styles = ( styles )=>{ return gui_tools_styles( item, styles ); }
    item.classes = ( classes )=>{ return gui_tools_classes( item, classes ); }
    if( parent ) parent.appendChild( item );
    if( classes ) gui_tools_classes( item, classes );
    if( styles ) gui_tools_styles( item, styles ); 
    return item;
}

function gui_tools_div( el, classes, styles ) {
    const item = document.createElement( 'div' );
    gui_tools_classes( item, classes );
    gui_tools_styles( item, styles );
    gui_tools_parent( item, el );
    return item;
}

function gui_tools_element( el ) {
    el.tabs = ()=>{ return gui_tools_widget_tabs( el ); }
    el.folder = ( title, classes, styles )=>{ return gui_tools_widget_folder( el, title, classes, styles ); }
    el.div = ( classes=null, styles=null )=>{ return gui_tools_element( gui_tools_div( el, classes, styles ) ); }
    el.button = ( label, icon, onclick )=>{ return gui_tools_widget_button( el, label, icon, onclick ); }
    el.number = ( obj, param, min, max, step, nolabel )=>{ return gui_tools_widget_number( el, obj, param, min, max, step, nolabel ); }
    el.range = ( obj, param, min, max, step, nolabel )=>{ return gui_tools_widget_range( el, obj, param, min, max, step, nolabel ); }
    el.select = ( obj, param, options, nolabel )=>{ return gui_tools_widget_select( el, obj, param, options, nolabel ); }
    el.checkbox = ( obj, param, options, nolabel )=>{ return gui_tools_widget_checkbox( el, obj, param, options, nolabel ); }
    return el;
}

function nTabs( el ){ return gui_tools_widget_tabs( el ); }
function nFolder( el, title, classes, styles ){ return gui_tools_widget_folder( el, title, classes, styles ); }
function nPanel( el ){ return gui_tools_widget_panel( el ); }
function nDiv( el, classes, styles ) { return gui_tools_element( gui_tools_div( el, classes, styles ) ); }
function wButton( el, label, icon, onclick ) { return gui_tools_widget_button( el, label, icon, onclick ); }
function wNumber( el, obj, param, min, max, step, nolabel ) { return gui_tools_widget_number( el, obj, param, min, max, step, nolabel ); }
function wRange( el, obj, param, min, max, step, nolabel ) { return gui_tools_widget_range( el, obj, param, min, max, step, nolabel ); }
function wSelect( el, obj, param, options, nolabel ) { return gui_tools_widget_select( el, obj, param, options, nolabel ); }
function wCheckbox( el, obj, param, options, nolabel ) { return gui_tools_widget_checkbox( el, obj, param, options, nolabel ); }

function link( target, event_type, order_func, msg ) {
    target.addEventListener( event_type, ( event )=>{
        order_func( msg );
    } );
}

function icon_file( icon_name ) {
    return 'static/icons/icon_'+icon_name+'0001.png';
}

function gui_tools_icon( el, icon_name, classes ) {
    if( icon_name ) {
        const div = gui_tools_div( el, classes );
        const icon = icon_file( icon_name );
        const item = document.createElement( 'img' );
        gui_tools_classes( item, 'icon' );
        item.src = icon;
        div.appendChild( item );
        return item;
    }
}

const langStrings = [];

function gui_tools_text( el, text, classes, styles ) {
    if( text ) {
        const item = gui_tools_div( el, classes, styles );
        gui_tools_classes( item, 'text' );
        item.text = ( text )=>{
            if( text ) {
                if( text.info ) {
                    item.text_set = text.info;
                    langStrings.push( item );
                } else {
                    item.text_set = { default:text };
                }
            }
            if( item.text_set ){
                if( item.text_set[ options.interface.lang ] ) item.textContent = item.text_set[options.interface.lang];
                else item.textContent = item.text_set.default;
            }
        }
        item.text( text );
        return item;
    }
}

function gui_tools_href( el, text, href, classes, styles ) {
    const item = gui_tools_text( el, text, classes, styles );
    if( item ) {
        gui_tools_classes( item, 'href' );
        item.href = href;
        return item;
    }
}

function gui_tools_image( el, image, classes, styles ) {
    if( image ) {
        const div = gui_tools_div( el, classes, styles );
        const item = document.createElement( 'img' );
        item.src = image;
        gui_tools_classes( item, 'image margin' );
        return gui_tools_parent( item, div );
    }
}

function getAttr( el, attr, value=null ) {
    if( el && el.hasAttribute( attr ) ) return el.getAttribute( attr );
    return value;
}

function setAttr( el, attr, value ) {
    el.setAttribute( attr, value );
    return el;
}

function addAttr( el, attr, value ) {
    const v = getAttr( el, attr );
    setAttr( el, attr, v ? v+" "+value: value );
    return el;
}

function addAttrs( el, attrs ) {
    for( var key in attrs ) addAttr( el, key, attrs[key] );
    return el;
}

function gui_tools_classes( el, classes ) {
    if( classes ) {
        const class_list = classes.split( ' ' );
        for( let i in class_list ) {
            addAttr( el, 'class', class_list[i] ); 
        }
    }
    return el;
}

function gui_tools_styles( el, styles ) {
    for( var key in styles ) {
        el.style[key] = styles[key];
    }
    return el;
}

function gui_tools_parent( el, parent) {
    parent.appendChild( el );
    return el;
}

function gui_tools_visual( el, show=true ) {
    el.is_show = show;
    el.tabIndex="0";
    el.do_hide = ()=> { el.is_show=false; el.update(); }
    el.do_show = ()=> { el.is_show=true; el.update(); }
    el.do_touch = ()=> { el.is_show = !el.is_show; el.update(); }
    el.update = ()=> { el.style['display']=el.is_show?'flex':'none'; }
    return el;
}

const widgets = [];

function updateWidgets() {
    for( let i in widgets ) {
        let widget = widgets[i];
        widget.updateValue();
    }
    for( let i in langStrings ) {
        let langString = langStrings[i];
        langString.text();
    }
    options.need_update = true;
}

function gui_tools_widget( el, classes='widget' ) {

    const container = gui_tools_div( el, 'column ' + classes );
    const widget = gui_tools_div( container, 'row' );
    widget.tabIndex = 0;
    widget.old = null;

    widget.setLabel = ( text )=>{
        if( text ) {
            if( !widget.label ) {
                widget.label = gui_tools_text( widget, text, 'widget-label' );
            }
            widget.label.text( text );
        }
        return widget;
    }

    widget.setIcon = ( icon, classes, styles )=>{
        if( icon ) {
            if( !widget.icon ) {
                widget.icon = gui_tools_icon( widget, icon );
            }
            widget.icon.scr = icon_file( icon );
        }
        return widget;
    }


    widget.container = ()=>{ return container; }
    widget.setValue = ( value )=>{ /*release in widget*/ }
    widget.getValue = ()=>{ /*release in widget*/ }
    widget.onChange = ( func )=>{ widget.do_change = func; }

    widget.updateValue = ()=>{
        const value = widget.getValue();
        widget.setValue( value );
    }
    widget.changeValue = ()=>{
        if(widget.do_change) widget.do_change( widget.getValue(), widget.old );
        widget.updateValue();
        options.need_update = true;
    }

    return widget;
}

function gui_tools_widget_button( parent, label, icon, onclick ) {
    const widget = gui_tools_widget( parent, 'panel margin' ).setIcon( icon ).setLabel( label );
    widget.onclick = ()=>{
        if( onclick ) onclick();
        widget.changeValue();
    }
    return widget;
}

function gui_tools_widget_number( parent, obj, param, min, max, step=0.1, nolabel=false ) {
    const widget = gui_tools_widget( parent, 'widget-input');
    if( !nolabel ) widget.setLabel( param );
    widget.input = create_item( 'input', widget, 'widget-number' );
    widget.input.type = 'number';
    if( min ) widget.input.min = min;
    if( max ) widget.input.max = max;
    if( step ) widget.input.step = step;

    widget.setValue = ( value )=>{ if( widget.input ) widget.input.value = value; }
    widget.getValue = ()=>{ return obj[ param ]; }
    
    if( widget.input ) {
        widget.input.onchange = ()=>{
            widget.old = obj[param];
            obj[param] = parseFloat(widget.input.value) || 0;
            widget.changeValue();
        }
    }

    widgets.push( widget );
    widget.updateValue();
    return widget;
}

function gui_tools_widget_range( parent, obj, param, min=0.0, max=1.0, step=0.1, nolabel=false ) {
    const widget = gui_tools_widget( parent, 'widget-input');
    if( !nolabel ) widget.setLabel( param );
    widget.input = create_item( 'input', widget, 'widget-range' );
    widget.input.type = 'range';
    widget.input.min = min;
    widget.input.max = max;
    widget.input.step = step;
    widget.metric = create_item( 'input', widget, 'widget-metric' );
    widget.metric.min = min;
    widget.metric.max = max;
    widget.metric.step = step;
    widget.metric.type = 'number';

    widget.setValue = ( value )=>{
        if( widget.input ) widget.input.value = value;
        if( widget.metric ) widget.metric.value = value;
    }

    widget.getValue = ()=>{ return obj[ param ]; }

    if( widget.input ) widget.input.onchange = ()=>{
        widget.old = obj[param];
        obj[param]=parseFloat(widget.input.value) || 0;
        widget.changeValue();
    }
    if( widget.metric ) widget.metric.onchange = ()=>{
        widget.old = obj[param];
        obj[param] = parseFloat(widget.metric.value) || 0;
        widget.changeValue();
    }

    widgets.push( widget );
    widget.updateValue();
    return widget;
}

function gui_tools_widget_checkbox( parent, obj, param, nolabel=false ) {
    const widget = gui_tools_widget( parent, 'widget-input' );
    if( !nolabel ) widget.setLabel( param );

    widget.input = create_item( 'input', widget, 'widget-checkbox' );
    widget.input.type = 'checkbox';
    widget.input.checked = obj[param];

    widget.setValue = ( value )=>{
        if( widget.input ) widget.input.checked = value;
    }
    widget.getValue = ()=>{
        return obj[ param ];
    }
    if( widget.input ) {
        widget.input.addEventListener( 'change', ( event )=>{
            widget.old = obj[param];
            obj[param] = widget.input.checked || 0;
            widget.changeValue();
        } );
    }

    widgets.push( widget );
    widget.updateValue();
    return widget;
}

function gui_tools_widget_select( parent, obj, param, options=[], nolabel=false ) {
    const widget = gui_tools_widget( parent, 'widget-input');
    if( !nolabel ) widget.setLabel( param );
    widget.select = create_item( 'select', widget, 'widget-select' );
    widget.select.value = obj[param];

    for( let i in options ) {
        var opt = create_item( 'option', widget.select, 'widget-option' );
        opt.value = options[i];
        opt.textContent = options[i];
    }

    widget.setValue = ( value )=>{
        if( widget.select ) widget.select.value = value;
    }
    widget.getValue = ()=>{
        return obj[ param ];
    }

    if( widget.select ) widget.select.onchange = ()=>{
        widget.old = obj[param];
        obj[param]=widget.select.value;
        widget.changeValue();
    }

    widgets.push( widget );
    widget.updateValue();
    return widget;
}

function nText( parent, text, classes, styles ) { return gui_tools_text( parent, text, classes, styles ) }
function nVisual( parent, show, classes, styles ) { return gui_tools_visual( gui_tools_element( gui_tools_div( parent, classes, styles ) ), show ) }

function gui_tools_widget_folder( parent, title,  classes, styles ) {
    const widget = nDiv( parent, 'column '+classes, styles );
    const header = nDiv( widget, 'row' );
    const marker = nText( header, '-', 'folder-marker' );
    const caption = nText( header, title );
    const folder = nVisual( widget, true, 'column margin shoulder' );
    const cellar = nVisual( widget, true, 'column margin shoulder' );

    folder.do_close = ()=>{
        folder.is_open = false;
        folder.do_hide();
        cellar.do_show();
        marker.text( '► ' );
    }

    folder.do_open = ()=>{
        folder.is_open = true;
        folder.do_show();
        cellar.do_hide();
        marker.text( '▼ ' );
    }

    header.onclick = ()=>{
        if( !folder.is_open ) { folder.do_open(); } else { folder.do_close(); }
    }

    folder.cellar = cellar;

    folder.do_open();
    return folder;
}

function gui_tools_widget_tabs( parent ) {
    const widget = gui_tools_element( gui_tools_widget( parent, 'column' ) ); 

    const container = widget.container();
    gui_tools_classes( container, 'margin' )

    const tabs = gui_tools_div( container, 'column' );
    widget.tab_list = [];
    widget.tab = null;

    widget.do_select = ( tab )=>{
        if( widget.tab!=tab ) {
            if( widget.tab ) widget.tab.do_hide();
            widget.tab = tab;
            widget.tab.do_show();
        } else {
            if( widget.tab ) widget.tab.do_hide();
            widget.tab = null;
        }
    }

    widget.addTab = ( label, icon=null, classes, styles )=>{
        const button = gui_tools_widget_button( widget, label, icon );
        const tab = gui_tools_element( gui_tools_visual( gui_tools_div( tabs, classes, styles ) ) );
        widget.tab_list.push( tab );
        tab.do_hide();
        tab.label = label;
        link( button, 'click', ()=>{ widget.do_select( tab ); } );
        return tab;
    }

    widget.updateValue();
    return widget;
}

function gui_tools_widget_panel( parent, classes, styles ) {
    const widget = nDiv( parent, 'row '+classes, styles );
    return widget;
}

function addWidget( el, node, data, name ) {
    const lang = options.interface.lang;
    const item = node._;

    switch (item.type) {
    case 'check':
        return wCheckbox( el, data, name ).setLabel( item );
    case 'range':
        return wRange( el, data, name, item.min, item.max, item.step ).setLabel( item );
    case 'option':
        return wSelect( el, data, name, item.options ).setLabel( item );
    case 'button':
        return wButton( el, item, item.icon );
    }

    if( !item.widget ) {
        if( item.type=='panel' ) {
            const panel = nPanel( el, item );
            for ( const [key, val] of Object.entries( node ) ) {
                if( key!='_' ) {
                    panel[key] = addWidget( panel, val, data[name], key );
                }
            }
            return panel;
        }
        if( item.type=='folder' ) {
            const folder = nFolder( el, item );
            folder.do_close();
            for ( const [key, val] of Object.entries( node ) ) {
                if( key!='_' ) {
                    folder[key] = addWidget( folder, val, data[name], key );
                }
            }
            return folder;
        }
        if( item.type=='tabs' ) {
            const tabs = nTabs( el );
            for ( const [key, val] of Object.entries( node ) ) {
                if( key!='_' ) {
                    tabs[key] = tabs.addTab( val._, val._.icon, 'frame column border' );
                }
            }
            return tabs;
        }
        if( item.type=='list' ) {
            const ret = {};
            for ( const [key, val] of Object.entries( node ) ) {
                if( key!='_' ) {
                    ret[key] = addWidget( el, val, data, key );
                }
            }
            return ret;
        }
    }
}

function mkCanvas( styles=null, show=true ) {
    const el = gui_tools_div( document.body, 'canvas', styles );
    gui_tools_visual( el, show );
    gui_tools_element( el );
    return el;
}

function changeDemoset( demo, onload=null ) {
    if( exdata.data ){
        if( exdata.type=='video' ) {
            exdata.data.pause();
            exdata.data.removeAttribute( 'src' );
            exdata.data.load();
        }
        exdata.data.remove();
    }

    options.tools.transformType = ( demo.transformType ) ? demo.transformType : null;
    options.tools.wireframe = ( demo.transformType ) ? demo.wireframe : false;
    options.tools.factor = ( demo.factor ) ? demo.factor : options.tools.factor;
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
}

function mkGallery( el, content, onload=null ) {
    const gallery = gui_tools_div( el );

    gallery.do_change = ( demo )=>{ changeDemoset( demo, onload ); }
    const categories = {};

    gui_tools_classes( gallery, 'frame' );
    gui_tools_styles( gallery, {'max-height':'70vh'} );

    const cont = gui_tools_element( gui_tools_div( gallery, 'column' ) );

    for(var index in content){
        const demo = content[index];
        if( !(demo.category in categories) ) {
            categories[demo.category] = cont.folder( demo.category );
            categories[demo.category].do_close();
        }
        const category = categories[demo.category];
        const source = gui_tools_div( category, 'row margin bar' );
        const image = gui_tools_image( source, demo.image, 'pointer margin', { 'height':'10vh' } );
        link( image, 'click', gallery.do_change, demo );

        const panel = gui_tools_div( source, 'column', { 'height':'100%' } );
        gui_tools_href( panel, demo.title, demo.source, 'margin' );
        gui_tools_href( panel, demo.author, demo.chanel, 'margin' );
    }
    return gallery;
}

function mkInputFile() {
    const el = document.createElement( 'input' );
    el.setAttribute( 'type', 'file' );
    el.setAttribute( 'style', 'display:none' );
    el.setOnLoad = ( onload )=> {
        el.addEventListener(
            'change',
            () => {
                const file = el.files[0];
                if( onload ) onload( file );
            },
            false
        );
    }
    el.do_select = ()=> { el.click(); }
    return el;
}

function updateData( dest, sour ) {
    for( let key in sour ) {
        const v = sour[key];
        if( (typeof v) == 'number' || (typeof v) == 'string' || (typeof v) == 'boolean' ) {
            dest[key] = v;
        } else {
            if( (typeof v) == 'object' ) {
                updateData( dest[key], v );
            }
        }
    }
}

function mkOptionsFile() {
    const el = mkInputFile();
    const reader = new FileReader();

    el.order = ()=>{
        options.preset = 'Custom';
        const data = JSON.parse( reader.result );
        updateData( options.screen, data.screen );
        updateData( options.dome, data.dome );
        updateData( options.mirror, data.mirror );
        updateData( options.projector, data.projector );
        updateData( options.warp, data.warp );
        updateData( options.tools, data.tools );
        updateData( options.interface, data.interface );
        updateWidgets();
    };

    el.onload = ( file )=>{
        reader.readAsText( file );
        reader.onload = el.order;
    };

    el.setOnLoad( el.onload );
    return el;
}

function mkMediaFile( onload ) {
    const el = mkInputFile();
    el.onload = ( file )=>{
        const len = file.name.length;
        const num = 10;
        const label = len<num*2 ? file.name : file.name.substring(0,num) + " ... " + file.name.substring(len-num+1, len);
        const type = file.type.replace(/\/.+/, "");
        const demo = { type: type, content: null, file: file, transformType: options.tools.transformType, wireframe: options.tools.wireframe, title: label };
        changeDemoset( demo, onload );
    }

    el.setOnLoad( el.onload );
    return el;
}

function mkPlayer( styles ) {
    const canvas = mkCanvas( styles );
    canvas.do_hide();

    const player = addWidget( canvas, dict.player, options );
    player.do_open();

    canvas.do_change = ()=> {
        if( exdata.data ) {
            player.innerHTML = '';
            gui_tools_parent( exdata.data, player );
            gui_tools_icon( player );
            canvas.do_show();
        }
        if( exdata.type=='video' ){
            exdata.data.play();
        }
        gui_tools_classes( exdata.data, 'player-content' );
    }

    addWidget( player.cellar,  dict.tools.tools.factor, options.tools, 'factor' );
    addWidget( player.cellar,  dict.tools.tools.rotate, options.tools, 'rotate' );
    addWidget( player.cellar, dict.tools.tools.transformType, options.tools, 'transformType' );

    return canvas;
}

var helper_1 = "Уменьшите масштаб страницы до 25-33% для лучшего отображения, Ctrl -"

function mkFilesMenu( el, do_play ) {
    const files = addWidget( el, dict.files, options );
    const mediaFile = mkMediaFile( do_play );
    link( files.t0, 'click', ()=>{ options.tools.transformType='Fisheye'; mediaFile.do_select(); updateWidgets();  } );
    link( files.t1, 'click', ()=>{ options.tools.transformType='Equirectangular'; mediaFile.do_select(); updateWidgets(); } );
    link( files.t2, 'click', ()=>{ options.tools.transformType='Cubemap'; mediaFile.do_select(); updateWidgets(); } );
    link( files.t3, 'click', ()=>{
        if( helper_1) {
            confirm(helper_1); helper_1=null;
        };
        if( !helper_1) {
            options.tools.transformType='Cinerama'; mediaFile.do_select(); updateWidgets();
        }
    } );
}

function mkToolsMenu( el ) {
    const tools = addWidget( el, dict.tools, options );
    gui_tools_classes( tools.preset, 'margin border' );
    tools.preset.onChange( (n,p)=>{ setPreset( n ); updateWidgets(); });

    const optionsFile = mkOptionsFile();
    link( tools.export, 'click', ()=>{ ExportOptions(); } );
    link( tools.import, 'click', ()=>{ optionsFile.do_select(); } );
    link( tools.interface.app_lang.ru, 'click', ()=>{ options.interface.lang='ru'; updateWidgets(); } );
    link( tools.interface.app_lang.en, 'click', ()=>{ options.interface.lang='en'; updateWidgets(); } );
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

function mkSplash( styles ) {
    const canvas = mkCanvas( styles );
    gui_tools_classes( canvas, 'splash' );
    const splash = gui_tools_text( canvas, 'ОТКРЫТЫЙ ПЛАНЕТАРИЙ 2.0', 'text', { 'margin': '2vh', 'font-size':'6.6vw' } );
    return canvas;
}

export function init() {
    const canv = mkCanvas( ).div( ' column' );
    const app = addWidget( canv, dict.app, options );
    app.do_open();

    mkSplash( { 'width':'100vw', 'height':'20vh', 'margin-top':'80vh' } );
    const player = mkPlayer( { 'width':'15vw', 'max-height':'15vw', 'margin-left':'85vw' } );
    const do_play = ()=>{ player.do_change(); app.do_close(); options.app.update(); updateWidgets(); }

    mkGallery( app.menu.gallery, demoset, do_play );
    mkFilesMenu( app.menu.files, do_play );
    mkToolsMenu( app.menu.tools );
}
