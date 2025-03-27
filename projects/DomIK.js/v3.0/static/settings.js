export let app = {
    data: {
        name: "DomIK.JS",
        version: "2.2",
        preset: "Dome 2.5 Mirror 0.25",
        screen: { side: 0, zenit:0, front:0 },
        dome:{},
        mirror:{},
        projector:{},
        options:{},
        interface:{},
        transform:{}
    }
}

export const preset_list = ["Dome 2.5 Mirror 0.25", "Dome 5.0 Mirror 0.37", "Expert", "Custom"];
export const maptexture_list = [ 'None', 'Original', 'Fisheye', 'Equirectangular', 'Cubemap' ];
export const font_list = [ 'system-ui', 'sans-serif', 'serif', 'cursive', 'monospace', 'fantasy' ];
export const lang_list = [ 'en', 'ru' ];
export const colorspace_list = ['']

export function codeMaptexture( maptexture ) {
    for(let i in maptexture_list ){
        if( maptexture==maptexture_list[i] ) return Number(i);
    }
    return 0;
}

export let dict = {
    player:{_:{type:'folder'}},
    app:{_:{type:'folder'},
        menu:{_:{type:'tabs', info:{}},
            gallery:{_:{type:'folder', icon:'media'}},
            files:{_:{type:'folder', icon:'files'}},
            //tools:{_:{type:'folder', icon:'tools'}},
            settings:{_:{type:'folder', icon:'settings'}}
        }
    },
    files:{_:{type:'list'},
        fisheye:{_:{type:'button', icon:'fisheye'}},
        equirectangular:{_:{type:'button', icon:'equirectangular'}},
        cubemap:{_:{type:'button', icon:'cubemap'}},
        cinerama:{_:{type:'button', icon:'cinerama'}},
    },
    settings:{_:{type:'list'},
        preset:{_:{type:'option', options: preset_list}},
        screen:{_:{type:'folder'},
            zenit:{_:{type:'range', min:-1.0, max:1.0, step:0.1}},
            front:{_:{type:'range', min:-1.0, max:1.0, step:0.1}},
            side:{_:{type:'range', min:-1.0, max:1.0, step:0.1}}
        },
        dome:{_:{type:'folder',info:{ ru:'Купол', en:'Dome' }},
            radius:{_:{type:'range', min: 2.0, max: 5.0, step: 0.1}}
        },
        mirror:{_:{type:'folder'},
            radius:{_:{type:'range', value: 0.2, min: 0.1, max: 0.5, step: 0.1}},
            offset:{_:{type:'range', value: 0, min: -1.0, max: 1.0, step: 0.1}},
            elevation:{_:{type:'range', value: 0, min: -1.0, max: 1.0, step: 0.1}},
            shift:{_:{type:'range', value: 0, min: -1.0, max: 1.0, step: 0.1}}
        },
        projector:{_:{type:'folder'},
            offset:{_:{type:'range', value: 0, min: -1.0, max: 1.0, step: 0.1}},
            elevation:{_:{type:'range', value: 0, min: -1.0, max: 1.0, step: 0.1}}
        },
        options:{_:{type:'folder'},
            transformType:{_:{type:'option', options:maptexture_list}},
            scope:{_:{type:'range', min:50, max:100, step:5}},
            rotate:{_:{type:'range', min:-360, max:360, step:5}},
            tilt:{_:{type:'range', min:-360, max:360, step:5}},
            flexture:{_:{type:'range', min:0, max:1, step:0.1}},
            seamless:{_:{type:'range', min:0.001, max:0.1, step:0.001}},
            wireframe:{_:{type:'check'}},
            segments:{_:{type:'range', min:3, max:12, step:1}}
        },
        transform:{_:{type:'folder'},
            sour_width:{_:{type:'range', min:0.1, max:1, step:0.05}},
            sour_height:{_:{type:'range', min:0.1, max:1, step:0.05}},
            sour_shift:{_:{type:'range', min:-0.5, max:0.5, step:0.05}},
            dest_width:{_:{type:'range', min:0.5, max:2, step:0.05}},
            dest_height:{_:{type:'range', min:0.5, max:2, step:0.05}},
            dest_shift:{_:{type:'range', min:-0.5, max:0.5, step:0.05}}
        },
        interface:{_:{type:'folder'},
            tone:{_:{type:'range', min:0, max:360, step:5}},
            size:{_:{type:'range', min:0.5, max:2, step:0.5}},
            font:{_:{type:'option', options:font_list}},
            app_lang:{_:{type:'panel'},
                ru:{_:{type:'button', icon:'ru'}},
                en:{_:{type:'button', icon:'en'}}
            },
        },
        export:{_:{type:'button', icon:'export'}},
        import:{_:{type:'button', icon:'import'}}
    }
}

export function setPreset( preset ) {
    if ( preset === null ) {
    } else {
        if( preset == "Dome 2.5 Mirror 0.25" ) {
            app.data.dome.radius = 2.5;
            app.data.mirror.radius = 0.25;
            app.data.projector.offset = 0.5;
        }
        if( preset == "Dome 5.0 Mirror 0.37" ) {
            app.data.dome.radius = 5.0;
            app.data.mirror.radius = 0.37;
            app.data.projector.offset = 0.6;
        }
        if( preset == "Expert" ) {
            app.data.dome.radius = 100.0;
            app.data.mirror.radius = 0.01;
            app.data.projector.offset = 1.0;
        }
    }
}

app.data.tmp = {}

app.data.mirror.offset = 0;
app.data.mirror.elevation = 0;
app.data.mirror.shift = 0;
app.data.projector.offset = 0;
app.data.projector.elevation = 0;

app.data.options.transformTypeList = maptexture_list;
app.data.options.transformType = maptexture_list[0];
app.data.options.wireframe = true;
app.data.options.segments = 9;
app.data.options.subdiv = 5;
app.data.options.level = 7;
app.data.options.limit = 7;
app.data.options.triCount = 0;
app.data.options.limitEdge = 0;
app.data.options.scope = 0.5;
app.data.options.overhead = 0.5;
app.data.options.rotate = 0;
app.data.options.tilt = 0;
app.data.options.flexture = 0;
app.data.options.seamless = 0.01;

app.data.interface.tone = 300;
app.data.interface.size = 1;
app.data.interface.font = font_list[0];
app.data.interface.lang = lang_list[0];

app.data.transform.sour_width = 1.0;
app.data.transform.sour_height = 1.0;
app.data.transform.sour_shift = 0.0;
app.data.transform.dest_width = 1.0;
app.data.transform.dest_height = 1.0;
app.data.transform.dest_shift = 0.0;

setPreset( "Dome 2.5 Mirror 0.25" );