const int   complexity      = 60;    // More points of color.
const float mouse_factor    = 356.0;  // Makes it more/less jumpy.
const float mouse_offset    = 5.0;   // Drives complexity in the amount of curls/cuves.  Zero is a single whirlpool.
const float fluid_speed     = 5.0;  // Drives speed, higher number will make it slower.
const float color_intensity = 0.5;

bool space_color(vec2 vv, out vec4 color){ 
  vec2 p = vec2((vv.x-0.5)*2.0,(vv.y-0.5)*2.0);
  vec3 finalCol = vec3(0,0,0);
  vec2 position = ( gl_FragCoord.xy / resolution.xy ) - mouse / 1.0;
  for(int i=1;i<complexity;i++) {
    vec2 newp=p + time*0.001;
    newp.x+=0.5/float(i)*sin(float(i)*p.y+time/fluid_speed+0.2*float(i)) + 0.2;
    newp.y+=0.4/float(i)*sin(float(i)*p.x+time/fluid_speed+0.3*float(i+10)) - 0.8;
    newp+=p/dot(newp,newp);
    p=newp;
  }
  vec3 col=vec3(color_intensity*sin(3.0*p.x)+color_intensity,color_intensity*sin(3.0*p.y)+color_intensity,color_intensity*sin(p.x+p.y)+color_intensity);
  finalCol = vec3(col*col);
  color=vec4(finalCol.rgb / col, 1) ;
  return true;
}
