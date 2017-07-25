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
function b3d(require){
    var m_main      = require("main");
    var m_scenes    = require("scenes");
    var m_cons      = require("constraints");
    var vec3        = require("vec3");
    var quat        = require("quat");
    var mm          = require("mat4");
    var tsr         = require("tsr");
    var m_scenes    = require("scenes");
    var m_objects   = require("objects");
    var m_material  = require("material");
    var m_trans     = require("transform");

    var SysCurrent={smat:tsr.create(),dmat:tsr.create()};
    var SysWorld=tsr.create();
    var SysTSRStack=[[tsr.create(),SysCurrent]];
    var SysScale=0.01;

    this.SetObj=function(obj){SysCurrent=obj;}
    this.GetObj=function(){return SysCurrent;}
    this.GetForm=function(name){return m_scenes.get_object_by_name(name);}

    this.AddObj=function(name,form_name){
        var obj={name:name,smat:tsr.create(),dmat:tsr.create(),/*time:SysTime,life:-1*/};
        if(isDefined(name)){
            if(isUndefined(form_name))form_name=name;
            var form=this.GetForm(form_name);
            if(name!=form_name){
                obj.form=m_objects.copy(form,name,false);
                m_scenes.append_object(obj.form);
            }else{
                obj.form=form;
            }
        }
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
}


// UInterface
function UInterface(config){
    var sensors={};

    function eventKey(e){
        console.log(e.which);
        if(isUndefined(e))e=window.event;
        if(isDefined(sensors[e.type])){
        var keys = ["anykey",e.which];
        for(var i in [0,1]){
            var subsensor=sensors[e.type][keys[i]];
            if(isDefined(subsensor)){
                for(var j=0;j<subsensor.length;j++){
                    var sensor=subsensor[j];
                        if(isDefined(sensor.cb))sensor.cb(e,sensor);
                    }
                }
            }
        }
    }

    function eventMouse(e){}

    this.addSensor=function(params,func){
        for(var p in params){
            var sensor=params[p];
            if(p=="keyboard"){
                sensor.cb=func;
                if(isDefined(sensor.key))sensor.keys=[sensor.key];
                if(isUndefined(sensor.keys))sensor.keys=["anykey"];
                if(isDefined(sensor.type))sensor.types=[sensor.type];
                if(isUndefined(sensor.types))sensor.types=["keydown"];
                for(var j=0;j<sensor.types.length;j++){
                    var type=sensor.types[j];
                    window["on"+type]=eventKey;
                    if(isUndefined(sensors[type]))sensors[type]={};
                    for(var i=0;i<sensor.keys.length;i++){
                        var key=sensor.keys[i];
                        if(isUndefined(sensors[type][key]))sensors[type][key]=[];
                        sensors[type][key].push(sensor);
                    }
                }
            }
        }
    }

    if(isDefined(config)){
        if(isDefined(config.triggers)){
            for(var x in config.triggers){
                var func=function(e){
                    var tag = this.cb.tag;
                    var data = this.cb.data;
                    data[tag]=e.type=="keydown";
                };
                func.tag=x;
                func.data=config.data.triggers;
                this.addSensor({keyboard:{types:["keydown","keyup"],keys:config.triggers[x]}},func);
            }
        }
        if(isDefined(config.toggles)){
            for(var x in config.toggles){
                var func=function(e){
                    var tag = this.cb.tag;
                    var data = this.cb.data;
                    data[tag]=true;
                };
                func.tag=x;
                func.data=config.data.toggles;
                this.addSensor({keyboard:{type:"keydown",keys:config.toggles[x]}},func);
            }
        }
    }
}


// Cockpit
function Cockpit(exchange){
    var lastkey=0;
    var idata={};
    var triggers={FORWARD:false,BACK:false,LEFT:false,RIGHT:false};
    var toggles={HELP:false,WHEELCHANGE:false,RELOAD:false,ROTATE:false,COLOR:false,CAMERA:false};

    var config = {
        data:{toggles:toggles,triggers:triggers},
        toggles:{HELP:[112], WHEELCHANGE:[84], COLOR:[67], ROTATE:[82], CAMERA:[86]},
        triggers:{FORWARD:[87,38],BACK:[83,40],LEFT:[65,37],RIGHT:[68,39]}
    };

    var ui = new UInterface(config);

    function update(){
        appendKeys(idata,exchange.get("to-cockpit"));
        var powerL=limita((triggers.FORWARD?1:0)-(triggers.BACK?1:0)-(triggers.RIGHT?1:0)+(triggers.LEFT?1:0),1);
        var powerR=limita((triggers.FORWARD?1:0)-(triggers.BACK?1:0)+(triggers.RIGHT?1:0)-(triggers.LEFT?1:0),1);
        var cmd={powerL:F2B(powerL),powerR:F2B(powerR)};
        for(var key in toggles) if(toggles[key]){cmd[key]=true;toggles[key]=false;}
        exchange.put("to-robot",cmd);
    }
    return {update:update};
}

// ModelSet
const INSTALL   =0;
const DEINSTALL =1;
const UPDATE    =2;
const SETUP     =3;

function ModelSet(){
    function makeOb(tag,param,sparam){
        var ob={tag:tag,mods:{},gobs:[]};
        appendKeys(ob,param);
        appendKeys(ob,sparam);
        ob.suborder=function(type){for(var key in ob.mods)if(isDefined(ob.mods[key]))ob.mods[key].order(type);}
        ob.order=function(type){ob.suborder(type);}
        return ob;
    }

    function makeMod(param){
        var ob={mods:{},gobs:[]};
        appendKeys(ob,param);
        ob.suborder=function(type){for(var key in ob.mods)if(isDefined(ob.mods[key]))ob.mods[key].order(type);}
        ob.order=function(type){ob.suborder(type);}
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

    function setupMod(ob,mod){
        var tag=mod.tag;
        removeMod(ob,mod);
        ob.mods[tag]=mod;
        mod.parent=ob;
        mod.order(INSTALL);
    }

    function updateMod(mod){
        if(isDefined(mod))mod.order(UPDATE);
    }
    return {update:update};
}

// Robot
function Robot(b3d,exchange){
    var up_last = new Date();
    var up_delta = 0;

    function getDelta(){
        return up_delta;
    }

    function makeOb(tag,param,sparam){
        var ob={tag:tag,mods:{},gobs:[]};
        appendKeys(ob,param);
        appendKeys(ob,sparam);
        ob.suborder=function(type){for(var key in ob.mods)if(isDefined(ob.mods[key]))ob.mods[key].order(type);}
        ob.order=function(type){ob.suborder(type);}
        return ob;
    }

    function makeMod(param,sparam){
        var ob={mods:{},gobs:[]};
        ob.suborder=function(type){for(var key in ob.mods)if(isDefined(ob.mods[key]))ob.mods[key].order(type);}
        ob.order=function(type){ob.suborder(type);}
        appendKeys(ob,param);
        appendKeys(ob,sparam);
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

    function setupMod(ob,mod){
        var tag=mod.tag;
        removeMod(ob,mod);
        ob.mods[tag]=mod;
        mod.parent=ob;
        mod.order(INSTALL);
    }

    function updateMod(mod){
        if(isDefined(mod))mod.order(UPDATE);
    }

    var modWheels=function(param){
        var ob=makeOb("wheels",param);
        ob.order=function(type){
            switch(type){
                case INSTALL:
                    var B=ob.parent.B+ob.Bw;
                    var T=ob.parent.T;
                    var R=ob.R;
                    ob.Wheels=[{P:pos(B,0,T),A:0},{P:pos(-B,0,T),A:1},{P:pos(B,0,-T),A:0},{P:pos(-B,0,-T),A:1}];
                    for(var i=0;i<ob.Wheels.length;i++){
                        ob.gobs[i]=b3d.AddObj("wheel"+i,ob.Form);
                        b3d.Move(ob.Wheels[i].P.x,ob.Wheels[i].P.z,ob.Wheels[i].P.y);
                        b3d.RotateZ(Math.PI*ob.Wheels[i].A); //Y->Z
                        b3d.BakeObj();
                    }
                    break;
                case DEINSTALL:
                    for(var i=0;i<ob.Wheels.length;i++){
                        b3d.SetObj(ob.gobs[i]);
                        b3d.RemoveObj();
                    }
                    break;
                case UPDATE:
                    var A=ob.parent.A;
                    var W=ob.parent.W;
                    var sA=[-A[0],A[1],-A[0],A[1]];
                    for(var i=0;i<ob.Wheels.length;i++){
                        b3d.SetObj(ob.gobs[i]);
                        b3d.RotateX(sA[i]);
                        b3d.UpdateObj();
                    }
                    break;
            }
        }
        return ob;
    }

    var modTracks=function(param){
        var ob=makeOb("tracks",param,{Tracks:[],Offset:[0,0],Speed:[0,0]});
        ob.order=function(type){
            switch(type){
                case INSTALL:
                    ob.R=ob.parent.mods.wheels.R;
                    ob.T=ob.parent.T;
                    ob.B=ob.parent.B+ob.parent.mods.wheels.Bw;;
                    ob.L=2*Math.PI*ob.R+4*ob.T;
                    ob.Count=(ob.L/ob.Width)|0;
                    for(var i=0;i<ob.Count*2;i++){
                        ob.Tracks[i]={down:false,toch:false,P:pos(0,0,0),W:0};
                        ob.gobs[i]=b3d.AddObj("track"+i,ob.Form);
                    }
                    break;
                case DEINSTALL:
                    for(var i=0;i<ob.gobs.length;i++){
                        b3d.SetObj(ob.gobs[i]);
                        b3d.RemoveObj();
                    }
                    break;
                case UPDATE:
                    var W=ob.parent.W;
                    var D=ob.parent.D;
                    var dlen=ob.L/ob.Count;
                    var s=[2*ob.T,ob.L/2,ob.L/2+2*ob.T];
                    var b=[ob.B,-ob.B];
                    for(var j=0;j<2;j++){
                        ob.Offset[j]=slide(ob.Offset[j]+D[j],ob.L);
                        ob.Speed[j]=D[j]/getDelta();
                        var tl=ob.L-ob.Offset[j];
                        for(var i=0;i<ob.Count;i++){
                            var id=ob.Count*j+i;
                            var sl=(i*dlen+tl)%ob.L;
                            var qt=-ob.T;
                            var qa=-Math.PI/2;
                            var down=false;
                            var toch=false;
                            if(sl<s[0]){qt+=sl;down=true;}
                            else if(sl<s[1]){qt+=s[0];qa+=(sl-s[0])/ob.R;}
                            else if(sl<s[2]){qt+=s[0]-(sl-s[1]);qa+=Math.PI;}
                            else qa+=(sl-s[2])/ob.R+Math.PI;
                            var z=-(ob.R*Math.cos(qa)+qt);
                            var y=ob.R*Math.sin(qa);
                            var x=b[j];

                            b3d.SetObj(ob.gobs[id]);
                            b3d.Move(x,z,-y);
                            b3d.RotateX(qa+Math.PI/2);
                            var state=b3d.GetState();
                            var toch=(!down & ob.Tracks[id].down)?0:1;
                            b3d.UpdateObj();
                            ob.Tracks[id]={down:down,toch:toch,state:state,W:-W};
                        }
                }
                break;
            }
        }
        return ob;
    }

    var modTracks2=function(param){
        var ob=makeOb("tracks",param,{Tracks:[],Offset:[0,0,0,0],Speed:[0,0,0,0]});
        ob.order=function(type){
            switch(type){
                case INSTALL:
                    ob.R=ob.parent.mods.wheels.R;
                    ob.T=ob.parent.T;
                    ob.B=ob.parent.B+ob.parent.mods.wheels.Bw;;
                    ob.L=2*Math.PI*ob.R;
                    ob.Count=(ob.L/ob.Width)|0;
                    for(var j=0;j<4;j++){
                        for(var i=0;i<ob.Count;i++){
                            var id=ob.Count*j+i;
                            ob.Tracks[id]={toch:-1,status:type,W:0,state:b3d.NewState()};
                            ob.gobs[id]=b3d.AddObj("track"+id,ob.Form);
                        }
                    }
                    break;
                case DEINSTALL:
                    for(var i=0;i<ob.gobs.length;i++){
                        b3d.SetObj(ob.gobs[i]);
                        b3d.RemoveObj();
                    }
                    break;
                case UPDATE:
                    var W=ob.parent.W;
                    var D=ob.parent.D;
                    D=[D[0],D[1],D[0],D[1]];
                    var dlen=ob.L/ob.Count;
                    var Ts=[ob.T,ob.T,-ob.T,-ob.T];
                    var Bs=[ob.B,-ob.B,ob.B,-ob.B];
                    for(var j=0;j<4;j++){
                        ob.Offset[j]=slide(ob.Offset[j]+D[j],ob.L);
                        ob.Speed[j]=D[j]/getDelta();
                        var tl=ob.L-ob.Offset[j];
                        for(var i=0;i<ob.Count;i++){
                            var id=ob.Count*j+i;
                            var sl=(i*dlen+tl)%ob.L;
                            var qa=sl/ob.R;
                            var x=Bs[j];
                            var y=ob.R*Math.sin(qa);
                            var z=Ts[j]-ob.R*Math.cos(qa);
                            b3d.SetObj(ob.gobs[id]);
                            b3d.Move(x,y,z);
                            b3d.RotateX(Math.PI);
                            var state=b3d.GetState();
                            var toch=-1;
                            if(ob.Tracks[id].state[1]>state[1])toch=1;
                            if(ob.Tracks[id].state[1]<state[1] && ob.Tracks[id].toch==1)toch=0;
                            b3d.UpdateObj();
                            ob.Tracks[id]={toch:toch,status:type,state:state,W:-W};
                        }
                }
                break;
            }
        }
        return ob;
    }

    var modTraces=function(param){
        var ob=makeOb("traces",param,{Count:250,Offset:0,traces:[]});
        ob.order=function(type){
            switch(type){
                case INSTALL:
                    break;
                case DEINSTALL:
                    for(var i=0;i<ob.gobs.length;i++){
                        b3d.SetObj(ob.gobs[i]);
                        b3d.RemoveObj();
                    }
                    break;
                case UPDATE:
                    var ot=ob.parent.mods.chassis.mods.tracks;
                    for(var i=0;i<ot.Tracks.length;i++){
                        var track=ot.Tracks[i];
                        var zr = i/ot.Tracks.length;
                        if(isDefined(track)){
                            if(isDefined(track.state)){
                                if(track.toch==0){
                                    track.toch=-1;
                                    if(ob.traces.length>=ob.Count){
                                        b3d.SetObj(ob.traces[0]);
                                        b3d.RemoveObj();
                                        ob.traces.shift();
                                    }
                                    ob.Offset++;
                                    b3d.AddObj("trace"+ob.Offset,ob.Form);
                                    b3d.SetState(track.state);
                                    b3d.SetZ(0);
                                    b3d.BakeObj();
                                    ob.traces.push(b3d.UpdateObj());
                                }
                            }
                        }
                    }
                    for(var i=0;i<ob.traces.length;i++){
                        b3d.SetObj(ob.traces[i]);
                        b3d.SetZ(-(ob.traces.length-i)/(ob.traces.length)*3);
                        b3d.UpdateObj();
                    }
                    break;
            }
        }
        return ob;
    }

    var wheels=modWheels({Bw:20,R:30+2,Form:"wheel"});
    var tracks=modTracks({Width:11,Form:"track"});
    var traces=modTraces({Form:"trace_track"});
    var bodycolor=[1,1,1];

    var config = {
        model:{
        },
        ground:{
            tag:"ground",
            order:function(type){
                switch(type){
                case INSTALL:
                    this.gobs=b3d.AddObj(this.tag);
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
        panel:{
            tag:"panel",
            order:function(type){
                switch(type){
                    case INSTALL:
                        this.life=1000;
                        this.gobs=b3d.AddObj(this.tag+"me",this.tag);
                        b3d.AppendStiffViewport(m_b3d.GetForm(this.tag+"me"),m_b3d.GetActiveCamera(),{left:0,bottom:0,distance:1});
                        break;
                    case UPDATE:
                        this.life--;
                        if(this.life>0)break;
                    case DEINSTALL:
                        b3d.SetObj(this.gobs);
                        b3d.RemoveObj();
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
            order:function(type,param){
                switch(type){
                    case SETUP:
                        this.Power = param;
                    case UPDATE:
                        for(var i in [0,1]) this.Speed[i]=limita(this.Speed[i]+limita(this.Power[i]*this.SpeedMax-this.Speed[i],this.SpeedUp*getDelta()),this.SpeedMax);
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
                        this.gobs=b3d.AddObj(this.tag);
                        m_b3d.AppendSemiSoftCam(m_b3d.GetActiveCamera(),m_b3d.GetForm("carcass"), new Float32Array([7.0, 7.0, this.camera*2]), 12);
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
        }
    }
        
    var model   = makeMod(config.model);
    var panel   = makeMod(config.panel);
    var ground  = makeMod(config.ground);
    var motors  = makeMod(config.motors);
    var chassis = makeMod(config.chassis,{B:74,T:80});
    var carcass = makeMod(config.carcass);

    var ts=0;
    var vs=0;
    var ready=true;
    
    setupMod(model,ground);
    setupMod(model,panel);
    setupMod(model,chassis);
    setupMod(model,motors);
    setupMod(chassis,wheels);
    setupMod(chassis,carcass);
    setupMod(chassis,tracks);
    setupMod(model,traces);

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
                //removeMod(model,panel);
                if(isDefined(cmd.powerL))motors.order(SETUP,[B2F(cmd.powerL),B2F(cmd.powerR)]);
                if(isDefined(cmd.WHEELCHANGE)){
                    ts++;
                    if(ts>2) ts=0;
                    if(ts==0){
                        wheels=modWheels({Bw:20,R:32,Form:"wheel"});
                        tracks=modTracks({Width:11,Form:"track"});
                        setupMod(chassis,wheels);
                        setupMod(chassis,tracks)
                        traces.Form="trace_track";
                    }
                    if(ts==1){
                        wheels=modWheels({Bw:34,R:55,Form:"wheelbig"});
                        tracks=modTracks2({Width:11});
                        setupMod(chassis,wheels);
                        setupMod(chassis,tracks)
                        traces.Form="trace_wheelbig";
                    }
                    if(ts==2){
                        wheels=modWheels({Bw:50,R:20+2,Form:"wheelwide"});
                        tracks=modTracks({Width:11,Form:"trackwide"});
                        setupMod(chassis,wheels);
                        setupMod(chassis,tracks)
                        traces.Form="trace_trackwide";
                    }
                }
                if(isDefined(cmd.HELP)){
                    if(hasMod(model,panel))removeMod(model,panel)
                    else setupMod(model,panel);
                }
                if(isDefined(cmd.CAMERA))carcass.order(100);
                if(isDefined(cmd.COLOR))carcass.order(101);
            }
            updateMod(model);

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

/*function main_canvas_mouse(e) {
    if (e.preventDefault) e.preventDefault();
    var x = e.clientX;
    var y = e.clientY;
    //var obj = m_scenes.pick_object(x, y);
}*/

/*function onMessage(message){
    var cmd = JSON.parse(message.payloadString);
    exchange.put("localhost",cmd);
}*/

var m_b3d;
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
    m_b3d           = new b3d(require);
    m_ext           = new exchange();
    m_cockpit       = new Cockpit(m_ext);
    m_robot         = new Robot(m_b3d,m_ext);
    m_b3d.SetCallBack(update);
}
