"""Guardsman turntable for the pixel room. Coordinates are authored on a fixed pixel grid."""
import math
from PIL import Image, ImageDraw

CELL = 168
CENTER = CELL // 2
GROUND = round(CELL * .70)
INK = "#292332"
DEEP = "#252739"
SHADE = "#3f4054"
SLATE = "#5b5c70"
STEEL = "#70848c"
SILVER = "#bacbd1"
GLINT = "#e4eeeb"
WINE = "#672e40"
RED = "#a63647"
SCARLET = "#d44c50"
VERMILION = "#f58169"
BRASS = "#bd8950"
GOLD = "#e7b967"
PALE = "#ffe3a2"
CREAM = "#e9d5ac"
LEATHER = "#714737"


def guard_cell(index, pose):
    direction = min(index,16-index)
    angle = direction*math.pi/8
    across, toward = math.sin(angle), -math.cos(angle)
    image = Image.new("RGBA",(CELL,CELL))
    pen = ImageDraw.Draw(image)
    # Screen projection of the planted feet, independent from upper-body recoil.
    lunge = (0,0,0,-3,6,1)[pose]
    cx = round(CENTER+lunge*across)
    cy = GROUND+round(lunge*toward*.47)
    bob = (0,-1,0,1,3,1)[pose]
    def points(seq):
        return [(round(x),round(y)) for x,y in seq]
    def poly(seq, fill, border=INK):
        pen.polygon(points(seq),fill=fill,outline=border)
    def line(seq, fill, width=1):
        pen.line(points(seq),fill=fill,width=width)
    def box(x,y,w,h,fill):
        x,y=round(x),round(y)
        pen.rectangle((x,y,x+w-1,y+h-1),fill=fill)
    def xy(x,y):
        return (cx+x,cy+bob+y)
    def shape(seq,fill,border=INK):
        poly([xy(*p) for p in seq],fill,border)
    def seam(seq,col,width=1):
        line([xy(*p) for p in seq],col,width)
    def patch(x,y,w,h,col):
        box(*xy(x,y),w,h,col)
    spread=round(4.7-2*across)
    stride=(1,5,-5,-4,9,3)[pose]
    def boot(side):
        hip=(cx+side*spread,cy+bob-18)
        foot=(round(CENTER+side*spread+across*side*stride),
              round(GROUND+1+toward*side*stride*.5+side*across))
        hx,hy=hip; fx,fy=foot
        knee=(round(.48*hx+.52*fx)+round(across*(2 if pose==4 else 1)),fy-9)
        kx,ky=knee
        poly([(hx-3,hy),(hx+4,hy),(kx+3,ky),(fx+2,fy-2),(fx-3,fy-2),(kx-3,ky)],SHADE)
        line([(hx-2,hy+1),(kx-2,ky)],BRASS)
        poly([(kx-3,ky),(kx+3,ky),(fx+2,fy-3),(fx+4,fy-2),
              (fx+5,fy),(fx+4,fy+1),(fx-4,fy+1),(fx-4,fy-2)],DEEP)
        line([(kx-2,ky+1),(kx+2,ky+1)],STEEL)
        box(fx-2,fy-2,2,1,BRASS);line([(fx,fy-1),(fx+3,fy-1)],SLATE)
    boot(-1);boot(1)
    # A flared red tunic, low cartridge box and drum-major gold shoulders.
    shape([(-7,-34),(-3,-37),(3,-37),(8,-34),(9,-29),(6,-22),(9,-16),
           (5,-15),(1,-16),(-3,-15),(-9,-17),(-7,-23),(-10,-29)],RED)
    shape([(-7,-33),(-3,-35),(-2,-29),(-4,-21),(-7,-18),(-8,-19),(-7,-25)],SCARLET,None)
    shape([(4,-34),(8,-33),(7,-25),(5,-22),(8,-17),(4,-17),(2,-23)],WINE,None)
    seam([(-7,-17),(-3,-16),(1,-17)],VERMILION)
    if toward>-.35:
        seam([(-6,-33),(-3,-28),(2,-24),(5,-21)],INK,3)
        seam([(-6,-33),(-3,-28),(2,-24),(5,-21)],CREAM,2)
        seam([(5,-33),(3,-30),(-3,-23)],CREAM,2)
        patch(0,-27,3,2,BRASS);patch(0,-27,2,1,PALE)
        patch(-1,-24,1,1,PALE);patch(3,-23,1,1,GOLD)
    else:
        seam([(-5,-32),(4,-22)],CREAM,2)
        shape([(-6,-32),(2,-33),(5,-30),(5,-24),(2,-22),(-6,-23)],LEATHER)
        patch(-5,-30,8,2,BRASS);patch(-3,-27,2,3,CREAM)
    seam([(-7,-21),(0,-20),(6,-21)],INK,3);patch(-1,-21,3,2,GOLD)
    shape([(-8,-22),(-4,-22),(-3,-18),(-8,-17)],SHADE);patch(-7,-21,3,1,BRASS)
    for shoulder in (-1,1):
        sx=shoulder*6
        shape([(sx-3,-34),(sx,-36),(sx+3,-35),(sx+3,-32),(sx-2,-32)],BRASS)
        seam([(sx-2,-34),(sx,-35),(sx+2,-34)],PALE)
        for tassel in (-2,0,2):patch(sx+tassel,-32,1,2,GOLD)
    # Four musket positions share the same hand locations along the stock.
    aim = (0,-1,1,-7,1,-4)[pose]
    reach = (0,0,0,-4,8,1)[pose]
    ox = cx+round(across*reach)+round(4*(1-across))
    oy = cy+bob-26+round(toward*reach*.53)
    def gun(t):
        return (round(ox+across*t),round(oy+toward*t*.53+aim*t/27))
    def weapon():
        butt,grip,fore,muzzle,tip=map(gun,[-12,-4,12,28,43])
        line([butt,grip,fore,muzzle],INK,5)
        line([butt,grip,fore],LEATHER,3);line([gun(-10),gun(12)],"#ae7050")
        line([gun(5),muzzle],SHADE,3)
        x,y=gun(3);box(x,y-2,3,2,BRASS)
        for t in (12,24):
            x,y=gun(t);box(x-1,y-1,2,3,BRASS);box(x-1,y-1,2,1,PALE)
        x,y=muzzle
        line([(x,y-2),(x,y+2)],INK,2)
        endx,endy=tip;mid=gun(34)
        poly([(x,y-1),(mid[0],mid[1]-3),(endx+1,endy-1),(mid[0],mid[1]+1),(x,y+1)],STEEL)
        line([(x+1,y-1),(mid[0],mid[1]-3),(endx+1,endy-1)],GLINT)
    if toward<-.25:weapon()
    # Broad shako with raised crown, gilt cord, front plate and polished peak.
    headx=round(across*.8);hx=cx+headx;hy=cy+bob-40
    def hp(x,y):return hx+round(x*1.16),hy+round(y*1.07)
    def head(seq,fill,border=INK):poly([hp(*p) for p in seq],fill,border)
    def detail(seq,col,width=1):line([hp(*p) for p in seq],col,width)
    def dot(x,y,w,h,col):box(*hp(x,y),w,h,col)
    head([(-7,-3),(-4,-6),(4,-6),(8,-3),(8,2),(5,6),(1,7),(-5,5),(-7,2)],"#b77c66")
    if toward>-.50:
        shift=round(2*across)
        head([(-5+shift,-2),(3+shift,-4),(6+shift,-2),(6+shift,1),
              (4+shift,2),(4+shift,4),(1+shift,5),(-2+shift,4),(-4+shift,2)],"#e4ad91",None)
        dot(-3+shift,1,3,2,"#ffcfac")
        ex=2+shift;dot(ex,-1,3,2,INK);dot(ex,-1,1,1,GLINT)
        if across<.8:dot(-3+shift,-1,2,2,INK)
        dot(ex+1,1,2,1,"#f7c6a4");dot(ex-1,3,3,1,"#945b59")
        if across>.72:dot(7,0,2,2,"#e8ad90")
    else:
        head([(-6,-3),(5,-4),(6,-1),(4,3),(1,5),(-4,4),(-6,2)],"#513e41",None)
        detail([(-5,3),(0,5),(3,4)],"#965e56")
    head([(-9,-14),(-7,-17),(-2,-19),(5,-18),(8,-16),(9,-13),(8,-4),
          (6,-2),(-1,-1),(-8,-4)],DEEP)
    head([(-7,-14),(-5,-16),(-2,-17),(4,-17),(6,-15),(3,-14),(-2,-13)],SLATE,None)
    head([(-7,-13),(-4,-14),(-2,-13),(-3,-6),(-6,-7)],SHADE,None)
    detail([(-7,-14),(-4,-16),(-1,-16)],"#7d8092")
    detail([(-7,-6),(-2,-4),(3,-4),(7,-6)],BRASS)
    detail([(-6,-6),(-2,-5),(1,-5)],GOLD)
    if toward>-.40:
        bx=round(4*across)
        head([(bx-2,-10),(bx,-12),(bx+2,-10),(bx+1,-7),(bx,-6),(bx-1,-7)],BRASS)
        dot(bx,-10,1,2,PALE)
        head([(-6,-4),(3,-4),(7,-6),(9,-5),(8,-3),(3,-2),(-4,-2)],INK)
        detail([(4,-3),(8,-5)],SLATE)
    if toward>-.50:
        ex=round(2*across)
        for eye in ([2+ex] if across>.85 else [-3+ex,2+ex]):
            dot(eye,-1,3,1,INK);dot(eye,0,2,2,"#513d4d")
            dot(eye,0,1,1,"#fff1de")
        dot(ex+3,2,2,1,"#dda18b");dot(ex,4,3,1,"#a96361")
        dot(ex-2,2,2,1,"#e59d89")
    # Rosette sits in the edge of the cap, away from the face.
    dot(-7,-13,2,3,WINE);dot(-7,-14,2,2,SCARLET)
    dot(-6,-13,1,1,GOLD)
    detail([(-6,-12),(-5,-8),(-2,-6),(1,-6)],BRASS)
    dot(-6,-13,2,1,PALE)
    if toward>-.4:
        dot(3+round(across*2),-11,1,2,PALE)
    if toward>=-.25:weapon()
    def arm(side,t):
        hand=gun(t)
        sx,sy=xy(side*6,-32)
        ex=round(sx+side*2+across*(1 if side<0 else 2));ey=sy+7
        line([(sx,sy),(ex,ey),hand],INK,6)
        line([(sx,sy),(ex,ey),hand],RED if side<0 else SCARLET,4)
        line([(sx-1,sy),(ex-1,ey-1)],VERMILION)
        wx,wy=hand;box(wx-3,wy-2,4,4,DEEP);box(wx-3,wy-2,3,1,BRASS)
        box(wx,wy-1,3,3,"#ccbfa7");box(wx,wy-1,2,2,"#fff0d7")
    if toward<-.25:
        arm(1,0)
    else:
        arm(-1,-2);arm(1,10 if pose!=3 else 7)
    if index>8:image=image.transpose(Image.Transpose.FLIP_LEFT_RIGHT)
    return image


def build_sheet():
    atlas=Image.new("RGBA",(8*CELL,12*CELL))
    for pose in range(6):
        for index in range(16):
            atlas.paste(guard_cell(index,pose),((index%8)*CELL,(pose*2+index//8)*CELL))
    return atlas

