export let exdata = {

}

export let options = {
    app: {},
    name: "DomIK.JS",
    version: "2.2",
    preset: "Dome 2.5 Mirror 0.25",
    screen: { side: 0, zenit:0, front:0 },
    dome:{},
    mirror:{},
    projector:{},
    tools:{},
    interface:{}
}

const preset_list = ["Dome 2.5 Mirror 0.25", "Dome 5.0 Mirror 0.37", "Expert", "Custom"];
const maptexture_list = [ 'None', 'Original', 'Fisheye', 'Equirectangular', 'Cubemap', 'Cinerama' ];
const skin_list = [ 'glsl@1', 'glsl@2', 'glsl@3','glsl@4','glsl@5', 'glsl@6', 'cinerama', 'night_sky_0001', 'night_sky_0002', 'night_sky_0003', 'night_sky_0006', 'night_sky_0007', 'urban_0004', 'urban_0005' ];
const font_list = [ 'system-ui', 'sans-serif', 'serif', 'cursive', 'monospace', 'fantasy' ];
const lang_list = [ 'en', 'ru' ];

export function codeMaptexture( maptexture ) {
    for(let i in maptexture_list ){
        if( maptexture==maptexture_list[i] ) return Number(i);
    }
    return 0;
}

export let dict = {
    player:{_:{type:'folder', info:{ru:'Проигрыватель', en:'Player'}}},
    app:{_:{type:'folder', info:{ru:'Планетарий', en:'Planetarium'}},
        menu:{_:{type:'tabs', info:{}},
            gallery:{_:{type:'folder', icon:'media', info:{ru:'Галерея', en:'Gallery'}}},
            files:{_:{type:'folder', icon:'files', info:{ru:'Файлы', en:'Files'}}},
            tools:{_:{type:'folder', icon:'tools', info:{ru:'Настройки', en:'Settings'}}}
        }
    },
    files:{_:{type:'list'},
        t0:{_:{type:'button', icon:'fisheye', info:{ ru:'Рыбий глаз', en:'Fisheye'}}},
        t1:{_:{type:'button', icon:'equirectangular', info:{ ru:'Эквидистант', en:'Equirectangular'}}},
        t2:{_:{type:'button', icon:'fisheye', info:{ ru:'Кубическая', en:'Cubemap' }}},
        t3:{_:{type:'button', icon:'cinerama',info:{ ru:'Кинозал', en:'Cinerama' }}},
    },
    tools:{_:{type:'list'},
        preset:{_:{type:'option', options: preset_list, info:{ ru:'Преднастройки', en:'Preset' }}},
        screen:{_:{type:'folder', info:{ ru:'Экран', en:'Screen' }},
            zenit:{_:{type:'range', min:-1.0, max:1.0, step:0.1, info:{ru:'Зенит', en:'Zenit'}}},
            front:{_:{type:'range', min:-1.0, max:1.0, step:0.1, info:{ru:'Фронт', en:'Front'}}},
            side:{_:{type:'range', min:-1.0, max:1.0, step:0.1, info:{ru:'Горизонт', en:'Horizont'}}}
        },
        dome:{_:{type:'folder',info:{ ru:'Купол', en:'Dome' }},
            radius:{_:{type:'range', min: 2.0, max: 5.0, step: 0.1, info:{ ru:'Радиус', en:'Radius'}}}
        },
        mirror:{_:{type:'folder', info:{ ru:'Зеркало', en:'Mirror' }},
            radius:{_:{type:'range', value: 0.2, min: 0.1, max: 0.5, step: 0.1, info:{ ru:'Радиус', en:'Radius'}}},
            offset:{_:{type:'range', value: 0, min: -1.0, max: 1.0, step: 0.1, info:{ ru:'Смещение', en:'Offset'}}},
            elevation:{_:{type:'range', value: 0, min: -1.0, max: 1.0, step: 0.1, info:{ ru:'Превышение', en:'Elevation'}}},
            shift:{_:{type:'range', value: 0, min: -1.0, max: 1.0, step: 0.1, info:{ ru:'Сдвиг', en:'Shift'}}}
        },
        projector:{_:{type:'folder', info:{ ru:'Проектор', en:'Projector' }},
            offset:{_:{type:'range', value: 0, min: -1.0, max: 1.0, step: 0.1, info:{ ru:'Смещение', en:'Offset'}}},
            elevation:{_:{type:'range', value: 0, min: -1.0, max: 1.0, step: 0.1, info:{ ru:'Превышение', en:'Elevation'}}}
        },
        tools:{_:{type:'folder', info:{ ru:'Опции', en:'Options' }},
            showTexture:{_:{type:'check', info:{ ru:'Текстура', en:'Texture'}}},
            transformType:{_:{type:'option', options:maptexture_list, info:{ ru:'Карта', en:'Map'}}},
            factor:{_:{type:'range', min:50, max:100, step:5, info:{ ru:'Охват', en:'Scope'}}},
            rotate:{_:{type:'range', min:-360, max:360, step:5, info:{ ru:'Поворот', en:'Rotate'}}},
            flexture:{_:{type:'range', min:0, max:1, step:0.1, info:{ ru:'Кривизна', en:'Flexture'}}},
            seamless:{_:{type:'range', min:0.001, max:0.1, step:0.001, info:{ ru:'Смазать шов', en:'Seamless'}}},
            wireframe:{_:{type:'check', info:{ ru:'Сетка', en:'Wireframe'}}},
            segments:{_:{type:'range', min:3, max:12, step:1, info:{ ru:'Сегменты', en:'Segments'}}}
        },
        interface:{_:{type:'folder', info:{ ru:'Интерфейс', en:'Interface' }},
            skin:{_:{type:'option', options:skin_list, info:{ ru:'Окружение', en:'Environment'}}},
            tone:{_:{type:'range', min:0, max:360, step:5, info:{ ru:'Цвет', en:'Colour'}}},
            size:{_:{type:'range', min:0.5, max:2, step:0.5, info:{ ru:'Размер', en:'Size'}}},
            font:{_:{type:'option', options:font_list, info:{ ru:'Шрифт', en:'Font'}}},
            app_lang:{_:{type:'panel'},
                ru:{_:{type:'button', icon:'ru', info:{ default:'Русский'}}},
                en:{_:{type:'button', icon:'en', info:{ default:'English'}}}
            },
        },
        export:{_:{type:'button', icon:'export', info:{ ru:'Сохранить', en:'Save' }}},
        import:{_:{type:'button', icon:'import', info:{ ru:'Загрузить', en:'Load' }}}
    }
}

export function setPreset( preset ) {
    if ( preset === null ) {
    } else {
        if( preset == "Dome 2.5 Mirror 0.25" ) {
            options.dome.radius = 2.5;
            options.mirror.radius = 0.25;
            options.projector.offset = 0.5;
        }
        if( preset == "Dome 5.0 Mirror 0.37" ) {
            options.dome.radius = 5.0;
            options.mirror.radius = 0.37;
            options.projector.offset = 0.6;
        }
        if( preset == "Expert" ) {
            options.dome.radius = 100.0;
            options.mirror.radius = 0.01;
            options.projector.offset = 1.0;
        }
    }
}

options.mirror.offset = 0;
options.mirror.elevation = 0;
options.mirror.shift = 0;
options.projector.offset = 0;
options.projector.elevation = 0;

options.tools.transformTypeList = maptexture_list;
options.tools.transformType = maptexture_list[0];

options.tools.showTexture = true;
options.tools.showGrid = true;
options.tools.level = 7;
options.tools.limit = 7;
options.tools.triCount = 0;
options.tools.limitEdge = 0;
options.tools.factor = 100;
options.tools.rotate = 0;
options.tools.flexture = 0;
options.tools.seamless = 0.01;

options.interface.skins = skin_list;
options.interface.skin = skin_list[0];
options.interface.tone = 300;
options.interface.size = 1;
options.interface.font = font_list[0];
options.interface.lang = lang_list[0];

setPreset( "Dome 2.5 Mirror 0.25" );