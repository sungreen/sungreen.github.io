var version = "5.2017.07.23";

//easy utils
function pos(x,y,z){return {x:x,y:y,z:z};}
function limit(v,a,b){return v<a?a:(v>b?b:v);}
function limita(v,a){return limit(v,-a,a);}
function dist(x0,y0,x1,y1){var dx=(x0-x1);var dy=(y0-y1);return Math.sqrt(dx*dx+dy*dy);}
function slide(v,a){return v>a?v-a:(v<0?v+a:v);}
function isUndefined(a){return a==undefined;}
function isDefined(a){return !isUndefined(a);}
function appendKeys(dest,sour){if(isDefined(sour))for(var key in sour)dest[key]=sour[key];return dest;}
function appendItems(dest,sour){if(isDefined(sour))for(var i=0;i<sour.length;i++)dest.push(sour[i]);return dest;}
function F2B(f){return (f*127+127)|0;}
function B2F(b){return (b-127)/127;}

//3d tools
function initb3d(require){
    var m_main      = m_require("main");
    var m_scenes    = m_require("scenes");
    var m_cons      = m_require("constraints");
    var vec3        = m_require("vec3");
    var quat        = m_require("quat");
    var mm          = m_require("mat4");
    var tsr         = m_require("tsr");
    var m_objects   = m_require("objects");
    var m_material  = m_require("material");
    var m_trans     = m_require("transform");
    var m_sfx       = m_require("sfx");

    var SysCurrent={smat:tsr.create(),dmat:tsr.create()};
    var SysWorld=tsr.create();
    var SysTSRStack=[[tsr.create(),SysCurrent]];
    var SysScale=0.01;

    this.SetObj=function(obj){SysCurrent=obj;};
    this.GetObj=function(){return SysCurrent;};
    this.GetForm=function(name){return m_scenes.get_object_by_name(name);};
    this.AddObj=function(name,form_name){
        var obj={name:name,smat:tsr.create(),dmat:tsr.create(),/*time:SysTime,life:-1*/};
        if(isDefined(name)){
            if(isDefined(form_name)){
                var form=this.GetForm(form_name);
                if(name!=form_name){
                    obj.form=m_objects.copy(form,name,false);
                    m_scenes.append_object(obj.form);
                }else{
                    obj.form=form;
                }
            }
        };
        this.SetObj(obj);
        return this.GetObj();
    }
    this.RemoveObj=function(){if(isDefined(SysCurrent.form))m_scenes.remove_object(SysCurrent.form);SysCurrent=undefined;}
    
    this.GetQuat=function(){return quat.fromValues(SysCurrent.dmat[4],SysCurrent.dmat[5],SysCurrent.dmat[6],SysCurrent.dmat[7]);}
    this.RotateX=function(rad){var q=this.GetQuat();quat.rotateX(q,rad,q);tsr.set_quat(q,SysCurrent.dmat);}
    this.RotateY=function(rad){var q=this.GetQuat();quat.rotateY(q,rad,q);tsr.set_quat(q,SysCurrent.dmat);}
    this.RotateZ=function(rad){var q=this.GetQuat();quat.rotateZ(q,rad,q);tsr.set_quat(q,SysCurrent.dmat);}
    this.Move=function(x,y,z){tsr.set_trans([x*SysScale,y*SysScale,z*SysScale],SysCurrent.dmat);}
    this.SetX=function(v){SysCurrent.dmat[0]=v*SysScale;}
    this.SetY=function(v){SysCurrent.dmat[1]=v*SysScale;}
    this.SetZ=function(v){SysCurrent.dmat[2]=v*SysScale;}
    this.Scale=function(f){tsr.set_scale(f,SysCurrent.dmat);}
    this.SetLife=function(life){SysCurrent.life=life;}
    this.isExpired=function(){return (SysCurrent.life>0 && SysTime-SysCurrent.time>SysCurrent.life);}

    this.StatePush=function(){var t=this.GetState(SysCurrent);SysTSRStack.unshift([t,SysCurrent]);}
    this.StatePop=function(){var t=SysTSRStack.shift();SysCurrent=isDefined(t[1])?t[1]:{smat:tsr.create(),dmat:tsr.create()};}

    this.NewState=function(){return tsr.create();}
    this.GetState=function(){
        var t=tsr.create();
        tsr.multiply(SysCurrent.smat,SysCurrent.dmat,t);
        tsr.multiply(SysTSRStack[0][0],t,t);
        tsr.multiply(t,SysWorld,t);
        return t;
    }

    this.SetState=function(state){tsr.copy(state,SysCurrent.dmat);}

    this.BakeObj=function(){
        tsr.multiply(SysCurrent.smat,SysCurrent.dmat,SysCurrent.smat);
        tsr.identity(SysCurrent.dmat);
    }

    this.SetWorld=function(){
        tsr.multiply(SysCurrent.smat,SysCurrent.dmat,SysWorld);
        tsr.identity(SysCurrent.smat);
        tsr.identity(SysCurrent.dmat);
    }

    this.UpdateObj=function(){
        var t=this.GetState();
        if(isDefined(SysCurrent.form)) m_trans.set_tsr(SysCurrent.form,t);
        tsr.identity(SysCurrent.dmat);
        return SysCurrent;
    }

    this.GetActiveCamera=function(){return m_scenes.get_active_camera()};
    this.SetCallBack=function(cb){m_main.append_loop_cb(cb);}
    this.AppendSemiSoftCam=function(cam,obj,offset,dist){m_cons.append_semi_soft_cam(cam,obj,offset,dist);}
    this.AppendStiffViewport=function(obj,cam,position){m_cons.append_stiff_viewport(obj,cam,position);}
    this.SetNodematRGB=function(obj,mat,r,g,b){m_material.set_nodemat_rgb(obj,mat,r,g,b);}

    this.SoundPlay=function(obj,w,d){m_sfx.play(obj,w,d);}
}

// ModelSet
const INSTALL   =0;
const DEINSTALL =1;
const UPDATE    =2;
const SETUP     =3;

function ModelSet(){
    function makeMod(parent,param,sparam){
        var ob={mods:{},gobs:[]};
        ob.suborder=function(type){for(var key in ob.mods)if(isDefined(ob.mods[key]))ob.mods[key].order(type);}
        ob.order=function(type){ob.suborder(type);}
        ob.addGob = function(name,form){var gob = b3d.AddObj(name,form);ob.gobs.push(gob);return gob;}
        ob.getGob = function(index){if(isUndefined(index)) return ob.gobs[0];return ob.gobs[index];}
        ob.removeAllGobs = function(){for(var i=0;i<ob.gobs.length;i++){b3d.SetObj(ob.gobs[i]);b3d.RemoveObj();}gobs = [];}
        appendKeys(ob,param);
        appendKeys(ob,sparam);
        if(isDefined(parent))installMod(parent,ob);
        return ob;
    }

    function hasMod(ob,mod){
        var tag=mod.tag;
        return isDefined(ob.mods[tag]);
    }

    function removeMod(ob,mod){
        var tag=mod.tag;
        if(hasMod(ob,mod)){
            ob.mods[tag].order(DEINSTALL);
            ob.mods[tag].parent=undefined;
            ob.mods[tag]=undefined;
        }
    }

    function installMod(ob,mod){
        var tag=mod.tag;
        removeMod(ob,mod);
        ob.mods[tag]=mod;
        mod.parent=ob;
        mod.order(INSTALL);
        return mod;
    }

    function updateMod(mod){
        if(isDefined(mod))mod.order(UPDATE);
    }

    return {hasMod:hasMod, makeMod:makeMod, removeMod:removeMod, updateMod:updateMod};
}

// Cockpit
function Cockpit(exchange){
    var m_ctl = m_require("controls");

    var idata = {};

    function setID(tag,mod,num){return tag+"_"+mod+"_"+num;}
    function parID(id){var m=(id+"___").split("_"); return {tag:m[0],mod:m[1],num:m[2]};}

    var triggers={FORWARD:false,BACK:false,LEFT:false,RIGHT:false};
    var toggles={HELP:false,WHEELCHANGE:false,RELOAD:false,ROTATE:false,COLOR:false,CAMERA:false};

    var func_lg=function(s){return s[0];};

    function addKeySensor(tag,keys,func){
        for(var x in keys){
            var key = keys[x];
            var sen = m_ctl.create_keyboard_sensor(key);
            var func_lg=function(s){return s[0];};
            m_ctl.create_sensor_manifold(null, setID("keyboard",tag,key), m_ctl.CT_TRIGGER, [sen], func_lg, func);
        }
    }

    function addGiroSensor(tag,func){
        var sen = m_ctl.create_gyro_angles_sensor();
        m_ctl.create_sensor_manifold(null, tag, m_ctl.CT_CONTINUOUS, [sen], null, func);
    }

    function addMouseMoveSensor(tag,func){
        var sen = m_ctl.create_touch_move_sensor
        m_ctl.create_sensor_manifold(null, tag, m_ctl.CT_CONTINUOUS, [sen], null, func);
    }

    function addGamePadAxisXSensor(tag,func){
        var sen = m_ctl.create_gamepad_axis_sensor(0);
        m_ctl.create_sensor_manifold(null, tag, m_ctl.CT_CONTINUOUS, [sen], null, func);
    }

    function addSelectionSensor(id,func,obj){
        var sen = m_ctl.create_selection_sensor(obj);
        m_ctl.create_sensor_manifold(null, id, m_ctl.CT_CONTINUOUS, [sen], null, func);
    }

    var fun_trigger = function(obj, id, pulse){ var p = parID(id); triggers[p.mod]  = (pulse == 1); }
    var fun_toggle  = function(obj, id, pulse){ var p = parID(id); toggles[p.mod]   = (pulse == 1); }
    var fun_select  = function(obj, id, pulse){ var p = parID(id); if(p.tag=="trigger") triggers[p.mod]  = (pulse == 1); if(p.tag=="toggle") toggles[p.mod]  = (pulse == 1); }


    addKeySensor("HELP",[72],fun_toggle);
    addKeySensor("CHASSIS",[84],fun_toggle);
    addKeySensor("COLOR",[67],fun_toggle);
    addKeySensor("CAMERA",[86],fun_toggle);
    addKeySensor("FORWARD",[87,38],fun_trigger);
    addKeySensor("BACK",[83,40],fun_trigger);
    addKeySensor("LEFT",[65,37],fun_trigger);
    addKeySensor("RIGHT",[68,39],fun_trigger);
        
    var config = {
        model:{
        },
        cockpit:{
            tag:"cockpit",
            form:"cockpit",
            els:[["panel"],["FORWARD","BACK","LEFT","RIGHT"],["VIEW","CHASSIS","COLOR"]],
            order:function(type){
                switch(type){
                    case INSTALL:
                        for(var t=0; t<3; t++){    
                            for(var i=0; i<this.els[t].length;i++){
                                var e = this.els[t][i];
                                var form = this.form+"_"+e;
                                var gob = this.addGob(form+"me",form);
                                b3d.AppendStiffViewport(gob.form,b3d.GetActiveCamera(),{left:0,bottom:0,distance:1});
                                if(t==1) addSelectionSensor(setID("trigger",e),fun_select,gob.form);
                                if(t==2) addSelectionSensor(setID("toggle",e),fun_select,gob.form);
                            }
                        }
                        break;
                    case UPDATE:
                        break;
                    case DEINSTALL:
                        this.removeAllGobs();
                        break;
                }
            }
        },
        panel:{
            tag:"panel",
            form:"panel",
            order:function(type){
                switch(type){
                    case INSTALL:
                        var gob = this.addGob(this.form+"me",this.tag);
                        b3d.AppendStiffViewport(gob.form,b3d.GetActiveCamera(),{left:0,bottom:0,distance:1});
                        break;
                    case UPDATE:
                        break;
                    case DEINSTALL:
                        this.removeAllGobs();
                        break;
                }
            }
        }
    };

    var modset  = new ModelSet();
    var model   = modset.makeMod(undefined,config.model);
    var panel   = modset.makeMod(model,config.panel);
    var cockpit = {};
    var ts = 500;

    function update(){
        ts--;
        appendKeys(idata,exchange.get("to-cockpit"));
        var powerL=limita((triggers.FORWARD?1:0)-(triggers.BACK?1:0)-(triggers.RIGHT?1:0)+(triggers.LEFT?1:0),1);
        var powerR=limita((triggers.FORWARD?1:0)-(triggers.BACK?1:0)+(triggers.RIGHT?1:0)-(triggers.LEFT?1:0),1);
        var cmd={powerL:F2B(powerL),powerR:F2B(powerR)};
        for(var key in toggles) if(toggles[key]){cmd[key]=true;toggles[key]=false;}
        if(isDefined(cmd)){
            if(isDefined(cmd.HELP)){
                if(modset.hasMod(model,panel)){
                    ts = 0;
                } else {
                    ts = 250;
                    modset.removeMod(model,cockpit);
                    panel = modset.makeMod(model,config.panel);
                }
            }
        }
        if(ts==0){
            if(modset.hasMod(model,panel)) modset.removeMod(model,panel);
            cocpit = modset.makeMod(model,config.cockpit);
        }
        exchange.put("to-robot",cmd);
        modset.updateMod(model);
    }
    
    return {update:update};
}


// Robot
function Robot(exchange){
    var up_last = new Date();
    var up_delta = 0;

    function getDelta(){
        return up_delta;
    }

    var bodycolor=[1,1,1];

    var config = {
        model:{
        },
        ground:{
            tag:"ground",
            order:function(type){
                switch(type){
                case INSTALL:
                    this.gobs=b3d.AddObj(this.tag,this.tag);
                    break;
                case DEINSTALL:
                    b3d.SetObj(this.gobs);
                    b3d.RemoveObj();
                    break;
                case UPDATE:
                    var P=this.parent.mods.chassis.P;
                    b3d.SetObj(this.gobs);
                    b3d.Move(P.x,P.z,0);
                    b3d.UpdateObj();
                    break;
                }
            }
        },
        motors:{
            tag:"motors",
            Power:[0,0],
            Speed:[0,0],
            SpeedMax:2,
            SpeedUp:1,
            Sound:{},
            order:function(type,param){
                switch(type){
                    case SETUP:
                        this.Sound = b3d.GetForm("Speaker");
                        this.Power = param;
                    case UPDATE:
                        for(var i in [0,1]) this.Speed[i]=limita(this.Speed[i]+limita(this.Power[i]*this.SpeedMax-this.Speed[i],this.SpeedUp*getDelta()),this.SpeedMax);
                        var pows = this.Power[0]*this.Power[0]+this.Power[1]*this.Power[1];
                        if(pows>0) b3d.SoundPlay(this.Sound);
                        break;
                }
            }
        },
        chassis:{
            tag:"chassis",
            A:[0,0],
            D:[0,0],
            W:0,
            P:pos(0,0,0),
            order:function(type){
                switch(type){
                    case INSTALL:
                        this.gobs=b3d.AddObj();
                        this.suborder(type);
                        break;
                    case DEINSTALL:
                        b3d.SetObj(this.gobs);
                        b3d.RemoveObj();
                        this.suborder(type);
                        break;
                    case UPDATE:
                        var Speed=this.parent.mods.motors.Speed;
                        var R=this.mods.wheels.R;
                        this.P.y=R;
                        var dv=2*Math.PI*getDelta()*R;
                        this.D=[dv*Speed[0],dv*Speed[1]];
                        var a=(this.D[0]-this.D[1])/(2*this.B);
                        if(a!=0){
                            var r=(this.D[0]+this.D[1])/(2*a);
                            var rd=Math.abs(r)+this.B;
                            this.P.x-=r*Math.cos(this.W);
                            this.P.z+=r*Math.sin(this.W);
                            this.W=slide(this.W-a/Math.sqrt(rd*rd+this.T*this.T)*rd,2*Math.PI);
                            this.P.x+=r*Math.cos(this.W);
                            this.P.z-=r*Math.sin(this.W);
                        }else{
                            this.P.x+=this.D[0]*Math.sin(this.W);
                            this.P.z+=this.D[1]*Math.cos(this.W);
                        }
                        this.A[0]+=this.D[0]/R;
                        this.A[1]+=this.D[1]/R;
                        b3d.SetObj(this.gobs);
                        b3d.Move(this.P.x,this.P.z,this.P.y);
                        b3d.RotateZ(-this.W);
                        b3d.StatePush();
                        this.suborder(type);
                        b3d.StatePop();
                        b3d.UpdateObj();
                        break;
                }
            }
        },
        carcass:{
            tag:"carcass",
            camera:1,
            colorbody:[1,1,1],
            body:b3d.GetForm("bodyA"),
            order:function(type){
                switch(type){
                    case INSTALL:
                        this.gobs=b3d.AddObj(this.tag,this.tag);
                        b3d.AppendSemiSoftCam(b3d.GetActiveCamera(),b3d.GetForm("carcass"), new Float32Array([7.0, 7.0, this.camera*2]), 12);
                        break;
                    case DEINSTALL:
                        b3d.SetObj(this.gobs);
                        b3d.RemoveObj();
                        break;
                    case UPDATE:
                        b3d.SetObj(this.gobs);
                        b3d.UpdateObj();
                        break;
                    case 100:
                        this.camera+=2;
                        if(this.camera>8)this.camera=0;
                        this.order(INSTALL);
                        break;
                    case 101:
                        bodycolor=[Math.random(),Math.random(),Math.random()];
                        b3d.SetNodematRGB(this.body,["white","RGB"],bodycolor[0],bodycolor[1],bodycolor[2]);
                        break;
                }
            }
        },
        wheels:{
            tag:"wheels",
            order:function(type){
                switch(type){
                    case INSTALL:
                        var B=this.parent.B+this.Bw;
                        var T=this.parent.T;
                        var R=this.R;
                        this.Wheels=[{P:pos(B,0,T),A:0},{P:pos(-B,0,T),A:1},{P:pos(B,0,-T),A:0},{P:pos(-B,0,-T),A:1}];
                        for(var i=0;i<this.Wheels.length;i++){
                            this.gobs[i]=b3d.AddObj("wheel"+i,this.Form);
                            b3d.Move(this.Wheels[i].P.x,this.Wheels[i].P.z,this.Wheels[i].P.y);
                            b3d.RotateZ(Math.PI*this.Wheels[i].A); //Y->Z
                            b3d.BakeObj();
                        }
                        break;
                    case DEINSTALL:
                        for(var i=0;i<this.Wheels.length;i++){
                            b3d.SetObj(this.gobs[i]);
                            b3d.RemoveObj();
                        }
                        break;
                    case UPDATE:
                        var A=this.parent.A;
                        var W=this.parent.W;
                        var sA=[-A[0],A[1],-A[0],A[1]];
                        for(var i=0;i<this.Wheels.length;i++){
                            b3d.SetObj(this.gobs[i]);
                            b3d.RotateX(sA[i]);
                            b3d.UpdateObj();
                        }
                        break;
                }
            }
        },
        tracks:{
            tag:"tracks",
            Tracks:[],
            Offset:[0,0],
            Speed:[0,0],
            order:function(type){
                switch(type){
                    case INSTALL:
                        this.R=this.parent.mods.wheels.R;
                        this.T=this.parent.T;
                        this.B=this.parent.B+this.parent.mods.wheels.Bw;;
                        this.L=2*Math.PI*this.R+4*this.T;
                        this.Count=(this.L/this.Width)|0;
                        for(var i=0;i<this.Count*2;i++){
                            this.Tracks[i]={down:false,toch:false,P:pos(0,0,0),W:0};
                            this.gobs[i]=b3d.AddObj("track"+i,this.Form);
                        }
                        break;
                    case DEINSTALL:
                        for(var i=0;i<this.gobs.length;i++){
                            b3d.SetObj(this.gobs[i]);
                            b3d.RemoveObj();
                        }
                        break;
                    case UPDATE:
                        var W=this.parent.W;
                        var D=this.parent.D;
                        var dlen=this.L/this.Count;
                        var s=[2*this.T,this.L/2,this.L/2+2*this.T];
                        var b=[this.B,-this.B];
                        for(var j=0;j<2;j++){
                            this.Offset[j]=slide(this.Offset[j]+D[j],this.L);
                            this.Speed[j]=D[j]/getDelta();
                            var tl=this.L-this.Offset[j];
                            for(var i=0;i<this.Count;i++){
                                var id=this.Count*j+i;
                                var sl=(i*dlen+tl)%this.L;
                                var qt=-this.T;
                                var qa=-Math.PI/2;
                                var down=false;
                                var toch=false;
                                if(sl<s[0]){qt+=sl;down=true;}
                                else if(sl<s[1]){qt+=s[0];qa+=(sl-s[0])/this.R;}
                                else if(sl<s[2]){qt+=s[0]-(sl-s[1]);qa+=Math.PI;}
                                else qa+=(sl-s[2])/this.R+Math.PI;
                                var z=-(this.R*Math.cos(qa)+qt);
                                var y=this.R*Math.sin(qa);
                                var x=b[j];
                                b3d.SetObj(this.gobs[id]);
                                b3d.Move(x,z,-y);
                                b3d.RotateX(qa+Math.PI/2);
                                var state=b3d.GetState();
                                var toch=(!down & this.Tracks[id].down)?0:1;
                                b3d.UpdateObj();
                                this.Tracks[id]={down:down,toch:toch,state:state,W:-W};
                            }
                        }
                        break;
                }
            }
        },
        traces:{
            tag:"traces",
            Count:450,
            Offset:0,
            traces:[],
            order:function(type){
                switch(type){
                    case INSTALL:
                        break;
                    case DEINSTALL:
                        for(var i=0;i<this.gobs.length;i++){
                            b3d.SetObj(this.gobs[i]);
                            b3d.RemoveObj();
                        }
                        break;
                    case UPDATE:
                        var ot=this.parent.mods.chassis.mods.tracks;
                        for(var i=0;i<ot.Tracks.length;i++){
                            var track=ot.Tracks[i];
                            var zr = i/ot.Tracks.length;
                            if(isDefined(track)){
                                if(isDefined(track.state)){
                                    if(track.toch==0){
                                        track.toch=-1;
                                        if(this.traces.length>=this.Count){
                                            b3d.SetObj(this.traces[0]);
                                            b3d.RemoveObj();
                                            this.traces.shift();
                                        }
                                        this.Offset++;
                                        b3d.AddObj("trace"+this.Offset,this.Form);
                                        b3d.SetState(track.state);
                                        b3d.SetZ(0);
                                        b3d.BakeObj();
                                        this.traces.push(b3d.UpdateObj());
                                    }
                                }
                            }
                        }
                        for(var i=0;i<this.traces.length;i++){
                            b3d.SetObj(this.traces[i]);
                            b3d.SetZ(-(this.traces.length-i)/(this.traces.length)*3);
                            b3d.UpdateObj();
                        }
                        break;
                }
            }
        }
    }

    var modset  = new ModelSet();
    var model   = modset.makeMod(undefined,config.model);
    var panel   = modset.makeMod(model,config.panel);
    var cockpit = modset.makeMod(model,config.cockpit);
    var ground  = modset.makeMod(model,config.ground);
    var motors  = modset.makeMod(model,config.motors);
    var chassis = modset.makeMod(model,config.chassis,{B:74,T:80});
    var carcass = modset.makeMod(chassis,config.carcass);
    var wheels  = modset.makeMod(chassis,config.wheels,{Bw:20,R:30+2,Form:"wheel"});
    var tracks  = modset.makeMod(chassis,config.tracks,{Width:11,Form:"track"});
    var traces  = modset.makeMod(model,config.traces,{Form:"trace_track"});

    var ts=0;
    var vs=0;
    var ready=true;

    function update(){
        if(ready){
            ready=false;
            var cmd=exchange.get("to-robot");
            if(isUndefined(cmd)){
                //if(SysTime-SysMTime>2000){
                //    motors.Power=[0,0]
                //    exchange.put("to-cockpit",{error:"conect lost"});
                //}
            }else{
                if(isDefined(cmd.powerL))motors.order(SETUP,[B2F(cmd.powerL),B2F(cmd.powerR)]);
                if(isDefined(cmd.CHASSIS)){
                    ts++;
                    if(ts>2) ts=0;
                    if(ts==0){
                        wheels = modset.makeMod(chassis,config.wheels,{Bw:20,R:32,Form:"wheel"});
                        tracks = modset.makeMod(chassis,config.tracks,{Width:11,Form:"track"});
                        traces.Form = "trace_track";
                    }
                    if(ts==1){
                        wheels = modset.makeMod(chassis,config.wheels,{Bw:34,R:55,Form:"wheelbig"});
                        tracks = modset.makeMod(chassis,config.tracks,{Width:11,Form:undefined});
                        traces.Form = "trace_wheelbig";
                    }
                    if(ts==2){
                        wheels = modset.makeMod(chassis,config.wheels,{Bw:50,R:20+2,Form:"wheelwide"});
                        tracks = modset.makeMod(chassis,config.tracks,{Width:11,Form:"trackwide"});
                        traces.Form = "trace_trackwide";
                    }
                }
                if(isDefined(cmd.CAMERA))carcass.order(100);
                if(isDefined(cmd.COLOR))carcass.order(101);
            }
            modset.updateMod(model);

            var speed=motors.Speed;
            var compass=chassis.W;
            exchange.put("to-cocpit",{speedL:speed[0],speedR:speed[1],compass:compass});
            ready=true;
        }
        var time=new Date();
        up_delta = (time-up_last)/1000;
        up_last = time;
    }

    return {update:update};
}

// Exchange
var exchange=function(){
    var n=0;
    var storage={};
    function put(key,msg){storage[key]=msg;/*console.log(key,msg);*/}
    function get(key){var msg=storage[key];storage[key]=undefined;return msg;}
    return {put:put,get:get,storage:storage}
}

/*function onMessage(message){
    var cmd = JSON.parse(message.payloadString);
    exchange.put("localhost",cmd);
}*/

var b3d = {};

var m_require;
var m_robot;
var m_cocpit;
var m_ui;
var m_life;
var m_ext;

function update(){
    m_cockpit.update();
    m_robot.update();
}

function routine_start(require){
    m_require       = require;
    b3d             = new initb3d();

    m_ext           = new exchange();
    m_cockpit       = new Cockpit(m_ext);
    m_robot         = new Robot(m_ext);

    b3d.SetCallBack(update);
}
