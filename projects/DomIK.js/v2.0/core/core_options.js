export let options = {
    name: "DomIK.JS",
    version: "1.09",
    preset: "Dome 2.5 Mirror 0.25",
    screen: { side: 0, zenit:0, front:0 },
    content: null
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
