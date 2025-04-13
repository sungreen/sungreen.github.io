import * as THREE from "three";
import { FBXLoader } from "three/addons/loaders/FBXLoader.js";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";

import * as ROUTE from "../../core/subroute/subroute.js";
import { Ref } from "../../core/subroute/project.js";
import { ModelTools, rotXYZ, vecXYZ } from "../../core/subroute/model.js";
import { nButton } from "../../core/ndiv.js";
import { nInputFile } from "../../core/ndiv.js";
import { setEnable } from "../../core/ndiv.js";

// EASY TOOLS
const asteroidShader =
{
  uniforms: {
    baseColor: { value: new THREE.Color(0.0, 0.0, 0.0) }, // Голубоватый оттенок
    lightPosition: { value: new THREE.Vector3(10, 15, 10) },
    intensity: { value: 3.0 },
    specularPower: { value: 64.0 } // Резкость бликов
  },

  vertexShader: `
    varying vec3 vNormal;
    varying vec3 vWorldPosition;
    
    void main() {
      vNormal = normalize(normalMatrix * normal);
      vWorldPosition = (modelMatrix * vec4(position, 1.0)).xyz;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,

  fragmentShader: `
    uniform vec3 baseColor;
    uniform vec3 lightPosition;
    uniform float intensity;
    uniform float specularPower;
    
    varying vec3 vNormal;
    varying vec3 vWorldPosition;
    
    void main() {
      // 1. Основные векторы
      vec3 normal = normalize(vNormal);
      vec3 lightDir = normalize(lightPosition - vWorldPosition);
      vec3 viewDir = normalize(cameraPosition - vWorldPosition);
      
      // 2. Диффузное освещение (базовый цвет)
      float NdotL = max(0.0, dot(normal, lightDir));
      vec3 diffuse = baseColor * NdotL;
      
      // 3. Яркие блики (модель Блинна-Фонга)
      vec3 halfVec = normalize(lightDir + viewDir);
      float specular = pow(max(0.0, dot(normal, halfVec)), specularPower);
      
      // 4. Финальный цвет (без прозрачности)
      vec3 color = diffuse + specular * 2.0; // Усиливаем блики
      color *= intensity;
      color = baseColor* 0.2 + color * 0.8;

      gl_FragColor = vec4(color, 1.0);
    }
  `,
};

const windowShader = new THREE.ShaderMaterial({
  uniforms: {
    time: { value: 0 },
  },

  vertexShader: `
    varying vec2 vUv;
    void main() {
      vUv = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,

  fragmentShader: `
    uniform float time;
    varying vec2 vUv;
    vec3 palette( float t ) {
      vec3 a = vec3(0.5, 0.5, 0.5);
      vec3 b = vec3(0.5, 0.5, 0.5);
      vec3 c = vec3(1.0, 1.0, 1.0);
      vec3 d = vec3(0.263,0.416,0.557);
      return a + b*cos( 6.28318*(c*t+d) );
    }
    void main() {
      vec2 uv = vUv;
      vec2 uv0 = vUv;
      vec3 finalColor = vec3(0.0);
      for (float i = 0.0; i < 4.0; i++) {
        uv = fract(uv * 1.5) - 0.5;
        float d = length(uv) * exp(-length(uv0));
        vec3 col = palette(length(uv0) + i*.4 + time*.4);
        d = sin(d*8. + time)/8.;
        d = abs(d);
        d = pow(0.01 / d, 1.2);
        finalColor += col * d;
      }
      gl_FragColor = vec4(finalColor, 1.0);
    }
  `,
});

const flameShader = new THREE.ShaderMaterial({
  uniforms: {
    time: { value: 0 },
    intensity: { value: 1.5 },
    noiseScale: { value: 0.8 },
    color1: { value: new THREE.Color(0xff4500) },
    color2: { value: new THREE.Color(0xffcc00) },
    color3: { value: new THREE.Color(0x88aaff) }
  },

  vertexShader: `
      varying vec2 vUv;
      varying vec3 vPosition;
      varying float vNoise;
      uniform float time;
      uniform float noiseScale;

      float random(vec2 p) {
        return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453);
      }

      void main() {
        vPosition = position;
        vUv = uv;
        vec2 pos = uv * noiseScale;
        pos.y -= time * 2.0;
        vNoise = random(pos);
        vec3 newPosition = position;
        newPosition.x += (vNoise - 0.5) * 0.1;
        newPosition.y += (vNoise - 0.5) * 0.1;
        float fade = smoothstep(0.0, 0.3, uv.y);
        newPosition = mix(position, newPosition, fade);
        gl_Position = projectionMatrix * modelViewMatrix * vec4(newPosition, 1.0);
      }
  `,
  fragmentShader: `
      varying vec2 vUv;
      varying vec3 vPosition;
      varying float vNoise;
      uniform float time;
      uniform float intensity;
      uniform vec3 color1;
      uniform vec3 color2;
      uniform vec3 color3;

      float random(vec2 p) {
        return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453);
      }

      void main() {
          vec3 color = mix(color1, color2, vUv.y);
          float core = smoothstep(0.4, 0.8, 1.0 - length(vUv - 0.5));
          vec3 finalColor = mix(color, color3, core * 0.7);
          finalColor += (vNoise - 0.5) * 0.2;
          float alpha = smoothstep(0.1, 0.7, vUv.y) * (1.0 - smoothstep(0.7, 1.0, vUv.y)) * (0.8 + vNoise * 0.3);
          float spark = step(0.95, random(vUv + time));
          finalColor += spark * vec3(1.0, 0.9, 0.5) * 2.0;
          gl_FragColor = vec4(finalColor * intensity, alpha);
      }
  `,
  transparent: true,
  blending: THREE.AdditiveBlending,
  depthWrite: false,
  side: THREE.DoubleSide
});

function dist_2(item1, item2) {
  const dx = item1.x - item2.x;
  const dy = item1.y - item2.y;
  return (dx * dx + dy * dy);
}

function dist(item1, item2) {
  return Math.sqrt(dist_2(item1, item2));
}

function deepCloneObject(source) {
  const clone = source.clone(false);
  if (source.material) {
    if (Array.isArray(source.material)) {
      clone.material = source.material.map(mat => mat.clone());
    } else {
      clone.material = source.material.clone();
    }
  }
  source.children.forEach(child => {
    clone.add(deepCloneObject(child));
  });
  return clone;
}

// ADDONS REGISTRY

export function registry(def) {
  const addon = {
    content: (app) => {
      const template = addon.newTemplate(0);
      template.frame.mode.set("none");
      const ref = Ref.append(template, { type: "group" });
      Ref.property.new(ref, { name: "source", type: "resource", datatype: "text" });
      Ref.property.new(ref, { name: "background", type: "color", init: "#AABB33" });
      ref.model.finaly = async (ref) => { if (!ref.addon_init && ref.parent.type === 'link') { ref.addon_init = true; await init(ref, app); }; }
    },
  };

  return addon;
}

function mkControls(app) {
  const controls = app.views["model-editor"].workarea.panels.controls;
  controls.do_clear();

  const fs = nInputFile((file) => {
    load_bank(file, host.quiz, () => {
      host.mqtt.newID();
      host.sendAttention(0);
      host.doQuiz();
    });
  });

  const bLoad = nButton(controls, null, "path:mrl", fs.do_select, "btl bbl alt-border background");
  const bStart = nButton(controls, null, "animation_start", cmd_survey, "alt-border background");
  const bQuest = nButton(controls, null, "animation_next", cmd_next, "alt-border background");
  const bTimer = nButton(controls, null, "timer", cmd_timer, "alt-border background");
  const bBreak = nButton(controls, null, "utimer", cmd_post, "alt-border background");
  const bStop = nButton(controls, null, "animation_stop:mrr", cmd_stop, "btr bbr alt-border background");
}

function mkGreetings(ref) {
  const node = Ref.append(ref, { type: "group", name: "Информер" });
  node.group.direction.set("column");
  node.transform.position.set(vecXYZ(0, 0.5, -1));
  //node.transform.scale.set(vecXYZ(1.2, 1.2, 1.2));
  node.transform.inscribed.set(true);
  node.frame.mode.set("round rectangle");
  node.frame.color.set("#335577");

  node.title = Ref.append(node, { type: "text", name: "Заголовок" });
  node.title.transform.basis.set(0.15);
  node.title.fontSize.set(0.1);
  node.title.text.set("🚀 Подключитесь!");

  node.image = Ref.append(node, { type: "image" });
  node.image.source.set("image/surikat.jpg");
  //node.image.source.set("image/qrcode.png");
  node.image.transform.scale.set(vecXYZ(1, 1, 1));

  return node;
}

function mkAsteroids(arena) {
  arena.asteroids = [];

  for (let i = 0; i < arena.config.rocket.count; i++) {
    for (let j = arena.config.asteroid.seed; j >= 0; j--) {

      const asteroid = {
        tag: i + j * arena.config.rocket.count,
        pos: new THREE.Vector2(),
        rotA: 0,
        rotB: 0,
        needinit: true,
        radius: arena.config.asteroid.radius,
        speed: arena.config.asteroid.speed
      }

      asteroid.reset = () => {
        asteroid.needinit = true;
        asteroid.rotA = 0;
        asteroid.rotD = Math.PI * (Math.random());

        arena.asteroids.removeOf(asteroid);
        arena.asteroids.push(asteroid);
      }

      asteroid.update = (dt) => {
        if (asteroid.needinit && arena.flag) {
          asteroid.pos.set(arena.width * (2.0 * Math.random() - 1.0), arena.config.asteroid.far);
          asteroid.needinit = false;
          arena.flag = false;
        }

        if (!asteroid.needinit) {
          asteroid.pos.y -= asteroid.speed * dt;
          if (asteroid.pos.y < -arena.config.asteroid.far) {
            asteroid.reset();
          } else {
            asteroid.rotA += asteroid.rotD * dt;
          }
        }
      }

      asteroid.refresh = () => {
        const mesh = arena.resources.asteroid;
        if (!asteroid.mesh && mesh) {
          const type = Math.floor(Math.random() * 3);
          const tagMat = arena.getDistinctColors(asteroid.tag);
          asteroid.mesh = new THREE.Group();
          asteroid.mesh.visible = false;
          asteroid.body = deepCloneObject(mesh.getObjectByName(`asteroid${type}`));
          asteroid.body.children[0].material = tagMat.c;
          asteroid.body.children[1].material = tagMat.c;
          asteroid.mesh.add(asteroid.body);
          arena.addMesh(asteroid.mesh);
        }

        if (asteroid.mesh) {
          asteroid.mesh.visible = !asteroid.needinit;
          if (asteroid.mesh.visible) {
            const f = (arena.config.asteroid.far - Math.abs(asteroid.pos.y)) / arena.config.asteroid.far;
            const s = asteroid.radius * (f < 0.1 ? f * 10 : 1);
            asteroid.mesh.scale.set(s, s, s);
            ort(asteroid.mesh, asteroid.pos.x, asteroid.pos.y, asteroid.rotA);
          }
        }
      }

      asteroid.reset();
    }
  }
}

function mkRockets(arena) {
  arena.rockets = [];

  for (let tag = 0; tag < arena.config.rocket.count; tag++) {

    const rocket = {
      radius: arena.config.rocket.radius,
      speed: arena.config.rocket.speed,
      rot: 0,
      lider: 0,
      pos: new THREE.Vector2(),
      v: new THREE.Vector2(),
      bot: true,
      target: new THREE.Vector2(0,0),
    };

    rocket.reset = () => {
      rocket.rot = 0;
      rocket.pos.set((Math.random() - 0.5) * arena.width, (Math.random() - 0.5) * arena.height);
    }

    rocket.state = (up = true) => {
      if (!rocket.lider) {
        if (up) {
          rocket.step++;
          if (rocket.step > 3) {
            rocket.step = 0;
            rocket.level++;
          }
          if (rocket.level > 2) {
            arena.lider++;
            rocket.lider = arena.lider;
            rocket.level = 2;
            rocket.step = 2;
          }
        } else {
          // rocket.step = rocket.step ? rocket.step - 1 : 0;
        }

        if (rocket.mesh) {
          for (let i = 0; i < 3; i++) {
            rocket.rings[i].visible = (rocket.step > i);
            rocket.levels[i].visible = (rocket.level === i);
          }
        }
      }
    }

    rocket.refresh = () => {
      const mesh = arena.resources.rocket;
      if (!rocket.mesh && mesh) {
        rocket.mesh = new THREE.Group();
        rocket.levels = [];
        rocket.rings = [];

        const tagMat = arena.getDistinctColors(tag);
        for (let i = 0; i < 3; i++) {
          const level = deepCloneObject(mesh.getObjectByName(`level${i + 1}`));
          level.children[0].material = tagMat.a;
          level.children[1].material = tagMat.b;
          level.children[2].material = windowShader;
          level.children[3].material = flameShader;
          level.visible = (i === 0);
          rocket.levels.push(level);

          const ring = deepCloneObject(mesh.getObjectByName(`ring${i + 1}`));
          rocket.rings[i];
          ring.material = tagMat.c;
          ring.visible = false;
          rocket.rings.push(ring);

          rocket.mesh.add(level, ring);
        }
        arena.addMesh(rocket.mesh);
      }

      if (rocket.mesh) {
        const s = rocket.radius;
        rocket.mesh.scale.set(s, s, s);
        for (let i = 0; i < 3; i++) rocket.rings[i].rotation.set(rocket.rot * (3 - i), 0, 0);
        if (!rocket.lider) {
          ort(rocket.mesh, rocket.pos.x, rocket.pos.y, 0);
        } else {
          const x = rocket.lider;
          const q = x % 2 === 0 ? x / 2 : -(x - 1) / 2;
          const s = rocket.radius * (arena.config.rocket.count - rocket.lider + 1);
          rocket.mesh.scale.set(s, s, s);
          rocket.mesh.rotation.set(0, rocket.rot, 0);
          rocket.mesh.position.set(q, 0.5, -2.0);
        }
      }
    }

    rocket.update = (dt) => {
      if( !rocket.bot ) { rocket.v.copy( rocket.target ).sub(rocket.pos); }
      rocket.pos.add( rocket.v.multiplyScalar( rocket.speed * dt ) );
      rocket.v.multiplyScalar(0);
      rocket.rot += dt;
      if (Math.abs(rocket.pos.y) > arena.height) rocket.pos.y = Math.sign(rocket.pos.y) * arena.height;
      if (Math.abs(rocket.pos.x) > arena.width) rocket.pos.x = Math.sign(rocket.pos.x) * arena.width;
    }

    rocket.reset();
    rocket.tag = tag;
    rocket.step = 0;
    rocket.level = 0;

    arena.rockets.push(rocket);
  }
}

function ort(mesh, x, y, a = 0) {
  const b = x;
  const nx = Math.sin(b);
  const ny = Math.cos(b);
  const nz = -y;
  mesh.position.set(nx, ny, nz);
  mesh.rotation.set(Math.PI / 2, -b, Math.PI - a);
}

function mkArena(ref) {
  const arena = ref.config.arena;
  arena.config.rocket = ref.config.rocket;
  arena.config.asteroid = ref.config.asteroid;
  arena.resources = ref.resources;

  arena.mesh = new THREE.Group();
  arena.mesh.name = "Arena";
  arena.mesh.scale.set(1, 1, 1);
  arena.mesh.rotation.set(0, 0, 0);
  arena.mesh.position.set(0, 0, 0);
  ModelTools.setShape(ref, arena.mesh, 1, 1);

  mkAsteroids(arena);
  mkRockets(arena);

  arena.time = Date.now();

  arena.addMesh = (mesh) => {
    arena.mesh.add(mesh);
  }

  arena.far = 0;
  arena.flag = true;

  arena.refresh = () => {
    if (!arena.planets) {
      arena.planets = [];
      let s = 0.0001;

      const sunLight = new THREE.PointLight(0xffffff, 5, 250, 0);
      sunLight.position.set(0, 0, -50);
      arena.addMesh(sunLight);

      arena.resources.solar.children.forEach((obj) => {
        const planet = deepCloneObject(obj);
        planet.rotA = Math.random();
        planet.rotD = s;
        arena.planets.push(planet);
        if (planet.name === 'sun') {
          planet.material.transparent = true;
          planet.material.opacity = 0.7;
          planet.material.depthWrite = false;
        }
        arena.addMesh(planet);
      });

      const audio = arena.resources.atmosfera;
      audio.loop = true;
      audio.volume = 0.2;
      audio.play();
    }

    if (arena.planets) {
      arena.planets.forEach((planet) => {
        planet.rotA += planet.rotD;
        planet.rotation.set(0, planet.rotA, 0);
      });
    }
  }

  arena.update = () => {
    let dt = Date.now() - arena.time;
    arena.time += dt;
    dt /= 1000;

    arena.refresh();

    arena.rockets.forEach((rocket) => {
      rocket.update(dt);
      rocket.refresh();
      if( rocket.bot ) {
        const f = rocket.pos.length();
        rocket.v.set(0, 0).sub( rocket.pos ).multiplyScalar( f*f );
      }
    });

    for (let i = 0; i < arena.rockets.length - 1; i++) {
      for (let j = i + 1; j < arena.rockets.length; j++) {
        const ri = arena.rockets[i];
        const rj = arena.rockets[j];
        if (!ri.lider && !rj.lider) {
          const n = ri.pos.clone().sub(rj.pos);
          const d = n.length();
          const r = 2*(ri.radius + rj.radius);
          if (d < r) {
            const f = (d?r/d:1);
            n.multiplyScalar( f*f );
            //ri.pos.add(n);
            //rj.pos.sub(n);
            ri.v.add(n);
            rj.v.sub(n);
          }
        }
      }
    }

    arena.far = 0;
    for (let i = 0; i < arena.asteroids.length; i++) {
      const asteroid = arena.asteroids[i];
      if (!asteroid.needinit) {
        arena.far = Math.max(arena.far, asteroid.pos.y);
      }
    }
    arena.flag = (arena.config.asteroid.far - arena.far > 5 * arena.config.rocket.radius);

    for (let i = 0; i < arena.asteroids.length; i++) {
      const asteroid = arena.asteroids[i];
      asteroid.update(dt);

      if (!asteroid.needinit) {
        if (Math.abs(asteroid.pos.y) < arena.height) {
          arena.rockets.forEach((rocket) => {
            if (!rocket.lider) {
              const n = asteroid.pos.clone().sub(rocket.pos);
              const d = n.length();
              const r = (asteroid.radius + rocket.radius);

              if (d <= r) {
                if (rocket.tag === asteroid.tag) {
                  rocket.state(true);
                  asteroid.reset();
                  arena.resources.sound1.play();
                } else {
                  rocket.state(false);
                  rocket.reset();
                  asteroid.reset();
                  arena.resources.sound2.play();
                }
              } else {
                if( rocket.bot ) {
                  if (rocket.tag === asteroid.tag) {
                    const f = 1;
                    rocket.v.add( n.normalize().multiplyScalar(5) );
                  } else {
                    const f = 2*(d>0?r/d:1);
                    rocket.v.sub( n.multiplyScalar(f*f) );
                  }
                }
              }
            }
          });
        }
      }

      asteroid.refresh();
    }
  }

  return arena;
}

async function init(ref, app) {
  ref.config = {
    arena: {
      config: {},
      mats:[],
      width: Math.PI / 2,
      height: 2,
      speed: 1,
    },

    asteroid: {
      radius: 0.05,
      speed: 0.1,
      seed: 4,
      far: 4
    },

    rocket: {
      radius: 0.1,
      speed: 0.5,
      count: 5,
    },
  }

  ref.resources = {};


  ref.resources.atmosfera = await ModelTools.getResource("./addons/rockets/resources/atmosfera.mp3");
  ref.resources.sound1 = await ModelTools.getResource("./addons/rockets/resources/sound1.mp3");
  ref.resources.sound2 = await ModelTools.getResource("./addons/rockets/resources/sound2.mp3");
  ref.resources.asteroid = await ModelTools.getResource("./addons/rockets/resources/asteroids.glb");
  ref.resources.rocket = await ModelTools.getResource("./addons/rockets/resources/rockets.glb");
  ref.resources.solar = await ModelTools.getResource("./addons/rockets/resources/planets.glb");

  Ref.children.clear(ref);
  ref.name.set("Содержание");
  ref.group.mode.set("serial");
  ref.group.direction.set("block");

  // const greetings = mkGreetings(ref);
  // const controls = mkControls(app);
  const arena = mkArena(ref);

  arena.config.mats = [];
  for (let i = 0; i <= arena.config.rocket.count; i++) {
    const factor = i / (arena.config.rocket.count + 1);
    const h = 360 * factor;
    const s = factor === 1 ? 0 : 100;
    const la = 55;
    const lb = 35;

    const amat = new THREE.MeshLambertMaterial({ color: `hsl(${h}, ${s}%, ${la}%)`, emissive: `hsl(${h}, ${s}%, ${la}%)`, emissiveIntensity: 1.0 });
    const bmat = new THREE.MeshLambertMaterial({ color: `hsl(${h}, ${s}%, ${lb}%)`, emissive: `hsl(${h}, ${s}%, ${lb}%)`, emissiveIntensity: 1.0 });
    const cmat = new THREE.ShaderMaterial({ uniforms: THREE.UniformsUtils.clone(asteroidShader.uniforms), vertexShader: asteroidShader.vertexShader, fragmentShader: asteroidShader.fragmentShader, blending: THREE.AdditiveBlending, transparent: false, side: THREE.DoubleSide });
    cmat.uniforms.baseColor.value = new THREE.Color(`hsl(${h}, ${s}%, ${lb}%)`);
    arena.mats.push({ a: amat, b: bmat, c: cmat });
  }

  arena.lider = 0;

  arena.getDistinctColors = (tag) => {
    if (tag < arena.config.rocket.count) return arena.mats[tag];
    return arena.mats[arena.config.rocket.count];
  }


  const host = simpleHost( 775, 'rockets' );
  host.doMessage = (ret) => {
    if( ret.code === 100 ) {
      const tag = ret.value;
      if( arena.rockets[tag]) {
        const rocket = arena.rockets[tag];
        rocket.bot = false;
        const objs = ret.objs;
        if( objs ) {
          rocket.target.set(arena.width * objs.x / 100, arena.height * objs.y / 100);
        }
      }
    }
  }

  host.sub = ROUTE.listen();
  host.sub.registry("predify", () => {
    // greetings.title.text.set(`🚀 Подключитесь! ${count}`);
    // ROUTE.updateNeeds();
    const pf = performance.now() / 1000;
    flameShader.uniforms.time.value = pf;
    flameShader.uniforms.intensity.value = 1 + Math.sin(pf) * 0.3;
    windowShader.uniforms.time.value = pf;
    arena.update();
  });

  host.run();
  ref.host = host;
  ROUTE.updateUnLock("rockets init");
}