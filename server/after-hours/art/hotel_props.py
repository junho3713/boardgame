"""Original hotel ceramics, terry cloth and an electric kettle, in metre units.

Used by both Blender generators so every cup has the same believable wall,
rim, handle and saucer construction. No external models or textures.
"""
import math
import bpy
import numpy as np
from mathutils import Vector
from math import sin,cos,pi

def make_props(a):
 mesh,cube,cyl,tube,empty,material,W=[a[k]for k in ('mesh','cube','cyl','tube','empty','material','W')]
 porcelain=material('Service porcelain | warm ivory glaze',(.82,.81,.76),.24)
 rubber=material('Kettle | heat resistant graphite',(.025,.030,.028),.57)
 satin=material('Kettle | satin stainless steel',(.52,.55,.54),.34,.90)
 towel=material('Hotel terry | warm white cotton',(.78,.76,.69),.98)
 border=material('Hotel terry | woven dobby band',(.43,.46,.43),.94)
 # Packed normal texture: small irregular terry loops, not a smooth plastic sheet.
 n=512;y,x=np.mgrid[0:n,0:n]/n;rng=np.random.default_rng(316)
 height=np.sin(x*2*pi*48+.4*np.sin(y*22))*np.cos(y*2*pi*43)+rng.random((n,n))*.35
 dy,dx=np.gradient(height);normal=np.stack((-dx*.22,-dy*.22,np.ones_like(x)),axis=2);normal/=np.linalg.norm(normal,axis=2)[:,:,None]
 rgba=np.ones((n,n,4),dtype=np.float32);rgba[:,:,:3]=normal*.5+.5
 im=bpy.data.images.new('Cotton terry loops | normal',width=n,height=n,alpha=False);im.colorspace_settings.name='Non-Color';im.pixels.foreach_set(rgba.ravel());im.pack()
 nodes=towel.node_tree.nodes;tex=nodes.new('ShaderNodeTexImage');tex.image=im;normal_node=nodes.new('ShaderNodeNormalMap');normal_node.inputs['Strength'].default_value=.5
 towel.node_tree.links.new(tex.outputs['Color'],normal_node.inputs['Color']);towel.node_tree.links.new(normal_node.outputs['Normal'],nodes.get('Principled BSDF').inputs['Normal'])
 # Tiny fibre variation remains visible in diffuse light as well as grazing highlights.
 fibre=.91+.035*np.sin(x*2*pi*48)*np.sin(y*2*pi*43)+.065*rng.random((n,n))
 rgba[:,:,:3]=np.array([.67,.65,.59])[None,None,:]*fibre[:,:,None]
 cloth_image=bpy.data.images.new('Cotton terry loops | base colour',width=n,height=n,alpha=False);cloth_image.pixels.foreach_set(rgba.ravel());cloth_image.update();cloth_image.pack()
 colour=nodes.new('ShaderNodeTexImage');colour.image=cloth_image;towel.node_tree.links.new(colour.outputs['Color'],nodes.get('Principled BSDF').inputs['Base Color'])

 def lathe(name,profile,mat,p,n=96):
  verts=[(r*cos(i*2*pi/n),yy,r*sin(i*2*pi/n))for r,yy in profile for i in range(n)]
  faces=[(j*n+i,j*n+(i+1)%n,((j+1)%len(profile))*n+(i+1)%n,((j+1)%len(profile))*n+i)for j in range(len(profile))for i in range(n)]
  return mesh(name,verts,faces,mat,p)

 def bezier(points,steps=24):
  return [tuple(sum(math.comb(3,j)*(1-t)**(3-j)*t**j*points[j][k]for j in range(4))for k in range(3))for t in np.linspace(0,1,steps)]

 def cup(name,loc,p=None,saucer=True):
  root=empty(name,loc,p or a['parent']);base=.012 if saucer else 0
  if saucer:
   lathe(name+' | thin recessed saucer',[(0,0),(.045,0),(.071,.004),(.076,.009),(.077,.012),(.074,.014),(.065,.009),(.040,.008),(.033,.011),(0,.011)],porcelain,root)
  body=empty(name+' | cup',(0,base,0),root)
  lathe(name+' | hollow 3 mm porcelain',[(.024,0),(.030,.003),(.033,.008),(.037,.020),(.041,.052),(.044,.082),(.0445,.087),(.044,.089),(.041,.089),(.0405,.086),(.038,.052),(.034,.023),(.028,.014),(0,.014),(0,.005),(.024,.005)],porcelain,body)
  handle=bezier([(.041,.074,0),(.085,.092,0),(.088,.044,0),(.062,.025,0)])
  handle+=bezier([(.062,.025,0),(.052,.018,0),(.041,.020,0),(.036,.026,0)])[1:]
  tube(name+' | attached ceramic handle',handle,.0055,porcelain,body)
  return root

 def hanging_towel(name,x,rail,z,width=.28,length=.50):
  root=empty(name,(x,rail,z),a['parent']);nx=36;profile=[]
  # Back hem -> over the rail -> longer front hem, all one continuous surface.
  for t in np.linspace(1,0,25):profile.append((-.36*t,.019,t,0))
  for angle in np.linspace(0,pi,19)[1:]:profile.append((.019*sin(angle),.019*cos(angle),0,1))
  for t in np.linspace(0,1,36)[1:]:profile.append((-length*t,-.019,t,2))
  verts=[];faces=[]
  for j,(yy,zz,drop,side)in enumerate(profile):
   for i in range(nx+1):
    u=i/nx;fold=(.024*sin(u*pi*3.1+.5)+.007*sin(u*pi*6.7))*drop**1.2
    curl=.010*(abs(2*u-1)**9)*drop
    verts.append(((u-.5)*width*(1+.035*drop),yy+.006*sin(u*pi*1.8+.3)*drop**3,zz+fold+curl))
  for j in range(len(profile)-1):
   for i in range(nx):
    k=j*(nx+1)+i;faces.append((k,k+1,k+nx+2,k+nx+1))
  ob=mesh(name+' | continuous double-sided drape',verts,faces,towel,root);ob.data.materials.append(border)
  uv=ob.data.uv_layers.new(name='UVMap')
  for poly in ob.data.polygons:
   j=poly.index//nx
   if profile[j][3]==2 and (.84<profile[j][2]<.90 or .94<profile[j][2]<.97):poly.material_index=1
   for li in poly.loop_indices:
    vi=ob.data.loops[li].vertex_index;uv.data[li].uv=((vi%(nx+1))/nx*2,(vi//(nx+1))/(len(profile)-1)*6)
  ob['preserve_uv']=True
  thick=ob.modifiers.new('Cotton pile and turned edge','SOLIDIFY');thick.thickness=.004;thick.offset=0
  return root

 def folded_towel(name,loc,w=.34,d=.42,p=None):
  root=empty(name,loc,p or a['parent']);nx=24
  for layer in range(2):
   section=[(-d/2+.014,.009+layer*.018),(d/2-.018,.009+layer*.018)]
   section += [(d/2-.018+.014*sin(t),.023+layer*.018-.014*cos(t))for t in np.linspace(0,pi,14)[1:]]
   section += [(-d/2+.014,.037+layer*.018)]
   verts=[((u/nx-.5)*w,yy+.002*sin(u*.7+layer)*abs(zz)/(d/2),zz)for zz,yy in section for u in range(nx+1)]
   faces=[(j*(nx+1)+i,j*(nx+1)+i+1,(j+1)*(nx+1)+i+1,(j+1)*(nx+1)+i)for j in range(len(section)-1)for i in range(nx)]
   ob=mesh(name+' | folded cotton layer',verts,faces,towel,root);ob.modifiers.new('Folded towel thickness','SOLIDIFY').thickness=.004
  return root

 def kettle(name,loc,p=None):
  root=empty(name,loc,p or a['parent'])
  lathe(name+' | cordless base',[(0,0),(.078,0),(.084,.007),(.084,.018),(.079,.024),(0,.024)],rubber,root)
  body=lathe(name+' | formed steel body',[(.065,.025),(.075,.03),(.081,.065),(.078,.15),(.067,.202),(.058,.22),(.054,.22),(.063,.198),(.074,.148),(.077,.065),(.069,.035),(0,.035),(0,.025)],satin,root)
  # Open spout: an annular loft, including both inner and outer walls.
  centers=[(-.057,.181),(-.079,.185),(-.100,.199),(-.119,.221),(-.127,.232)]
  verts=[];n=48
  for inner in [False,True]:
   for j,(xx,yy)in enumerate(centers):
    prev=centers[max(0,j-1)];nxt=centers[min(len(centers)-1,j+1)];dx=nxt[0]-prev[0];dy=nxt[1]-prev[1];length=math.hypot(dx,dy);normal=(-dy/length,dx/length)
    r=.023-j*.0012-(.0023 if inner else 0)
    for i in range(n):
     angle=i*2*pi/n;verts.append((xx+normal[0]*cos(angle)*r,yy+normal[1]*cos(angle)*r,sin(angle)*r*.92))
  rings=len(centers);faces=[]
  for wall in [0,1]:
   for j in range(rings-1):
    for i in range(n):
     k=(wall*rings+j)*n+i;l=(wall*rings+j)*n+(i+1)%n
     faces.append((k,l,l+n,k+n)if wall==0 else(k+n,l+n,l,k))
  for j in [0,rings-1]:
   for i in range(n):
    k=j*n+i;l=j*n+(i+1)%n;faces.append((k,k+rings*n,l+rings*n,l))
  mesh(name+' | open pouring spout',verts,faces,satin,root)
  # Cut the matching outlet into the vessel rather than painting a black disk on its tip.
  bpy.ops.mesh.primitive_cylinder_add(vertices=48,radius=.020,depth=.10,location=W((-.071,.183,0)))
  cutter=bpy.context.object;cutter.parent=root;cutter.rotation_euler[1]=pi/2;bpy.context.view_layer.update();bpy.context.view_layer.objects.active=body
  cut=body.modifiers.new('Connected pouring outlet','BOOLEAN');cut.operation='DIFFERENCE';cut.object=cutter
  bpy.ops.object.modifier_apply(modifier=cut.name);bpy.data.objects.remove(cutter,do_unlink=True)
  lathe(name+' | removable lid seam',[(0,.219),(.059,.219),(.061,.223),(.058,.226),(0,.226)],rubber,root)
  lathe(name+' | lid cap',[(0,.226),(.052,.226),(.050,.231),(.039,.235),(0,.238)],satin,root)
  cyl(name+' | lid grip',(0,.244,0),.018,.015,rubber,p=root)
  handle=bezier([(.066,.201,0),(.137,.242,0),(.153,.211,0),(.148,.139,0)])
  handle+=bezier([(.148,.139,0),(.145,.063,0),(.130,.038,0),(.079,.060,0)])[1:]
  tube(name+' | insulated D handle',handle,.011,rubber,root)
  cube(name+' | rocker switch',(.101,.048,0),(.032,.012,.025),rubber,.005,root)
  cube(name+' | indicator lens',(.105,.057,0),(.011,.003,.006),material('Kettle | unlit amber lens',(.36,.16,.04),.28),.002,root)
  return root
 return {'cup':cup,'hanging_towel':hanging_towel,'folded_towel':folded_towel,'kettle':kettle}
