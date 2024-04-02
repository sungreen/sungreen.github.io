import { options } from './core_options.js'

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

function icon_file( icon_name ) {
    return 'static/icons/icon_'+icon_name+'0001.png';
}

function gui_tools_icon( el, icon_name, classes ) {
    if( icon_name ) {
        const div = gui_tools_div( el, classes );
        const icon = icon_file( icon_name );
        const item = document.createElement( 'img' );
        item.setAttribute( 'class', 'icon' );
        item.src = icon;
        div.appendChild( item );
        return item;
    }
}

function gui_tools_text( el, text, classes, styles ) {
    if( text ) {
        const item = gui_tools_div( el, classes, styles );
        item.textContent = text;
        return item;
    }
}

function gui_tools_href( el, text, href, classes, styles ) {
    const item = gui_tools_text( el, text, classes, styles );
    if( item ) {
        item.href = href;
        return item;
    }
}

function gui_tools_image( el, image, classes='image', styles ) {
    if( image ) {
        const div = gui_tools_div( el, classes, styles );
        const item = document.createElement( 'img' );
        item.setAttribute( 'class', classes );
        item.src = image;
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
    options.need_update = true;
}

function gui_tools_widget( el, classes='widget-container' ) {

    const container = gui_tools_div( el, 'column ' + classes );
    const widget = gui_tools_div( container, 'row widget' );
    widget.tabIndex = 0;
    widget.old = null;

    widget.setLabel = ( text, classes, styles )=>{
        if( text ) {
            if( !widget.label ) {
                widget.label = gui_tools_text( widget, text, 'widget-label' );
            }
            widget.label.textContent = text;
        }
        return widget;
    }

    widget.setIcon = ( icon, classes, styles )=>{
        if( icon ) {
            if( !widget.icon ) {
                widget.icon = gui_tools_icon( widget, icon, 'widget-icon' );
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
    const widget = gui_tools_widget( parent, 'widget-button border' ).setIcon( icon ).setLabel( label );
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

function gui_tools_widget_folder( parent, title ) {
    const widget = gui_tools_element( gui_tools_widget( parent ) ); 
    
    widget.setLabel( title );
    const container = widget.container();
    gui_tools_classes( container, 'border' )

    const folder = gui_tools_div( container, 'column' );
    gui_tools_visual( folder, true );

    folder.is_open = true;
    folder.widget = widget;

    widget.setValue = ( value )=>{
        if( value ) {
            folder.do_show();
            widget.setLabel( '▼ ' + title );
        } else {
            folder.do_hide();
            widget.setLabel( '► ' + title );
        }
    }
    widget.getValue = ()=>{
        return folder.is_open;
    }

    widget.label.onclick = ()=>{
        folder.is_open =! folder.is_open;
        if( folder.is_open) {
            folder.do_show();
            widget.setLabel( '▼ ' + title );
        } else {
            folder.do_hide();
            widget.setLabel( '► ' + title );
        }
    }

    widget.updateValue();
    return gui_tools_element( folder );
}

function gui_tools_element( el ) {
    el.folder = ( title )=>{ return gui_tools_widget_folder( el, title ); }
    el.div = ( classes=null, styles=null )=>{ return gui_tools_element( gui_tools_div( el, classes, styles ) ); }
    el.button = ( label, icon, onclick )=>{ return gui_tools_widget_button( el, label, icon, onclick ); }
    el.number = ( obj, param, min, max, step, nolabel )=>{ return gui_tools_widget_number( el, obj, param, min, max, step, nolabel ); }
    el.range = ( obj, param, min, max, step, nolabel )=>{ return gui_tools_widget_range( el, obj, param, min, max, step, nolabel ); }
    el.select = ( obj, param, options, nolabel )=>{ return gui_tools_widget_select( el, obj, param, options, nolabel ); }
    el.checkbox = ( obj, param, options, nolabel )=>{ return gui_tools_widget_checkbox( el, obj, param, options, nolabel ); }
    el.string = ( title )=>{ return gui_tools_widget( el ).setLabel( title ); }
    return el;
}

function link( target, event_type, order_func, msg ) {
    target.addEventListener( event_type, ( event )=>{
        order_func( msg );
    } );
}

function mkCanvas( styles=null, show=true ) {
    const el = gui_tools_div( document.body, 'canvas', styles );
    gui_tools_visual( el, show );
    gui_tools_element( el );
    return el;
}

function changeDemoset( demo, onload=null ) {
    console.log( demo.type );

    if( options.content.data ){
        if( options.content.type=='video' ) {
            options.content.data.pause();
            options.content.data.removeAttribute( 'src' );
            options.content.data.load();
        }
        options.content.data.remove();
    }

    options.tools.transformType = ( demo.transformType ) ? demo.transformType : null;
    options.tools.wireframe = ( demo.transformType ) ? demo.wireframe : false;
    options.tools.factor = ( demo.factor ) ? demo.factor : 360*0.75;
    options.content.type = ( demo.type ) ? demo.type : 'video';
    options.content.file = ( demo.file ) ? demo.file : null;

    switch ( options.content.type ) {
    case 'video':
        options.content.data = document.createElement( 'video' );
        options.content.data.setAttribute( 'controls', '' );
        options.content.data.setAttribute( 'loop', 'true');
        options.content.data.src = demo.content?demo.content:URL.createObjectURL( options.content.file );
        if( onload ) onload();
        break;
    case 'image':
        //options.content.data = new Image();
        options.content.data = document.createElement( 'img' );
        options.content.data.onload = onload;
        options.content.data.src = demo.content?demo.content:URL.createObjectURL( options.content.file );
        break;
    }
    if( options.content.data ) {
        URL.revokeObjectURL( options.content.data );
    }
}

function mkGallery( styles, onload=null ) {
    const canvas = mkCanvas( styles );
    const folder = canvas.folder( 'Галерея' );
    gui_tools_styles( folder, { 'overflow':'hidden auto' } );

    folder.do_change = ( demo )=>{
        changeDemoset( demo, onload );
    }

    const categories = {};
    for(var index in demoset){
        const demo = demoset[index];
        if( !(demo.category in categories) ) {
            categories[demo.category] = folder.folder( demo.category );
        }
        const category = categories[demo.category];
        const source = category.div( 'row gallery-source');

        const image = gui_tools_image( source, demo.image, 'gallery-image' );
        link( image, 'click', folder.do_change, demo );

        const dest = source.div( 'column gallery-dest' );
        gui_tools_href( dest, demo.title, demo.source, 'gallery-label' );
        gui_tools_href( dest, demo.author, demo.chanel, 'gallery-label' );
    }

    return canvas;
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
            if( dest[key] )  dest[key] = v;
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
    const folder = canvas.folder( 'Проигрыватель' );
    folder.number( options.tools, 'factor',  180, 360, 1 ).setLabel( 'Охват' );
    folder.number( options.tools, 'rotate', -180, 180, 1 ).setLabel( 'Поворот' );

    const el = folder.div( 'column' );
    canvas.do_change = ()=> {
        if( options.content.data ) {
            el.innerHTML = '';
            gui_tools_parent( options.content.data, el );
            gui_tools_icon( el );
            canvas.do_show();
        }
        if( options.content.type=='video' ){
            options.content.data.play();
        }
    }
    canvas.do_hide();
    return canvas;
}

function mkMainMenu( styles ) {
    const canvas = mkCanvas( styles );
    const frame = canvas.div( 'column' );
    const menu = frame.div( 'row' )

    canvas.domik = menu.button().setIcon( 'domik' );
    canvas.smenu = gui_tools_visual(menu.div( 'row' ), true );
    canvas.media = canvas.smenu.button( 'Галерея', 'media' );
    canvas.files = canvas.smenu.button( 'Файлы', 'files' );
    canvas.tools = canvas.smenu.button( 'Настройки', 'tools' );
    canvas.show_menu = true;
    return canvas;
}

function mkFilesMenu( styles ) {
    const canvas = mkCanvas( styles );
    const frame = canvas.div( 'column' );
    const menu = frame.div( 'row' )
    canvas.fishe = menu.button( 'Fisheye', 'fisheye' );
    canvas.equir = menu.button( 'Equidist', 'equirectangular' );
    canvas.cubem = menu.button( 'Cubemap', 'cubemap' );
    canvas.ciner = menu.button( 'Cinerama', 'cinerama' );
    return canvas;
}

function mkToolsMenu( styles ) {
    const canvas = mkCanvas( styles );

    const folder_setup = canvas.folder( 'Настройки' );
    const preset = folder_setup.widget.select( options, 'preset', ["Dome 2.5 Mirror 0.25", "Dome 5.0 Mirror 0.37", "Expert", "Custom"], true );
    preset.onChange( (n,p)=>{ changePreset( n ); })

    const optionsFile = mkOptionsFile();

    folder_setup.widget.onChange( (n,p)=>{ changePreset( n ); })
    const folder_screen = folder_setup.folder( 'Экран' );
    folder_screen.range( options.screen, 'zenit', -1.0, 1.0, 0.01 ).setLabel( 'Сместить зенит' );
    folder_screen.range( options.screen, 'front', -1.0, 1.0, 0.01 ).setLabel( 'Сместить фронт' );
    folder_screen.range( options.screen, 'side', -1.0, 1.0, 0.01 ).setLabel( 'Сместить в сторону' );

    const folder_dome = folder_setup.folder( 'Купол' );
    folder_dome.range( options.dome, 'radius', 2, 5, 0.1 ).setLabel( 'Радиус' );

    const folder_mirror = folder_setup.folder( 'Зеркало' );
    folder_mirror.range( options.mirror, 'radius', 0.1, 0.5, 0.01 ).setLabel( 'Радиус' );
    folder_mirror.range( options.mirror, 'offset', -1, 1, 0.01 ).setLabel( 'Смещение' );
    folder_mirror.range( options.mirror, 'elevation', -1, 1, 0.01 ).setLabel( 'Превышение' );
    
    const folder_projector = folder_setup.folder( 'Проектор' );
    folder_projector.range( options.projector, 'offset', 0.1, 1, 0.01 ).setLabel( 'Смещение' );
    folder_projector.range( options.projector, 'elevation', -1, 1, 0.01 ).setLabel( 'Превышение' );
    
    const folder_transform = folder_setup.folder( 'Дополнительно' );
    folder_transform.checkbox( options.tools, 'showTexture' ).setLabel( 'Текстура' );
    folder_transform.select( options.tools, 'transformType', options.tools.transformTypeList ).setLabel( 'Карта текстуры' );
    folder_transform.range( options.tools, 'factor',  180, 360, 1 ).setLabel( 'Охват' );
    folder_transform.range( options.tools, 'rotate', -180, 180, 1 ).setLabel( 'Поворот' );
    folder_transform.range( options.tools, 'flexture', 0, 1, 0.1 ).setLabel( 'Кривизна' );
    folder_transform.select( options.tools, 'skin', options.tools.skins ).setLabel( 'Окружение' );
    folder_transform.checkbox( options.tools, 'wireframe' ).setLabel( 'Сетка' );
    folder_transform.range( options.tools, 'segments', 3, 12, 1 ).setLabel( 'Сегменты' );

    folder_setup.button( 'Сохранить настройки', 'export', ExportOptions );
    folder_setup.button( 'Загрузить настройки', 'import', optionsFile.do_select );

    return canvas;
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
    const splash = gui_tools_text( canvas, 'ОТКРЫТЫЙ ПЛАНЕТАРИЙ 2.0', '', { 'margin': '2vh', 'font-size':'6.7vw' } );
    return canvas;
}

export function update() {

}

export function init() {
    options.content = {}

    const do_play = ()=>{ player.do_change(); splash.do_hide(); do_hide(); update(); updateWidgets(); }
    
    const splash = mkSplash( { 'width':'100vw', 'height':'20vh', 'margin-top':'80vh' } );
    const menu =   mkMainMenu( { 'width':'31w', 'max-height':'10vh',  'margin-top':'0vh' } );
    const gallery = mkGallery( { 'width':'31vw', 'max-height':'90vh', 'margin-top':'10vh' }, do_play );
    const files = mkFilesMenu( { 'width':'31vw', 'max-height':'90vh', 'margin-top':'10vh' } );
    const tools = mkToolsMenu( { 'width':'31vw', 'max-height':'90vh', 'margin-top':'10vh' } );

    const do_hide = ()=> { gallery.do_hide(); files.do_hide(); tools.do_hide() };

    do_hide();

    const player = mkPlayer( { 'width':'15vw', 'max-height':'15vw', 'margin-left':'85vw', 'overflow':'hidden auto' } );
    const mediaFile = mkMediaFile( do_play );

    link( menu.media, 'focus', ()=>{ do_hide(); gallery.do_show(); } );
    link( menu.files, 'focus', ()=>{ do_hide(); files.do_show(); } );
    link( menu.tools, 'focus', ()=>{ do_hide(); tools.do_show(); } );


    link( files.fishe, 'click', ()=>{ options.tools.transformType='Fisheye'; mediaFile.do_select(); updateWidgets();  } );
    link( files.equir, 'click', ()=>{ options.tools.transformType='Equirectangular'; mediaFile.do_select(); updateWidgets(); } );
    link( files.cubem, 'click', ()=>{ options.tools.transformType='Cubemap'; mediaFile.do_select(); updateWidgets(); } );
    link( files.ciner, 'click', ()=>{ options.tools.transformType='Cinerama'; mediaFile.do_select(); updateWidgets(); } );


    link( menu.domik, 'click', ()=>{ menu.smenu.do_touch(); do_hide(); } );
}