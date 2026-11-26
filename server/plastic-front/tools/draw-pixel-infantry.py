"""Author the infantry cels and promotion emblems on their native pixel grids."""
from pathlib import Path
from PIL import Image, ImageDraw

OUT = Path(__file__).resolve().parents[1] / "public/assets/pixel-room"
CELL = 40
# Row order is also used by pixel-infantry.js.
ROLES = ("shotgun", "machinegun", "sniper", "engineer", "mortar", "medic", "radio",
         "leader", "rifle", "launcher", "bayonet", "shield")
GREEN = ("#182e29", "#2f5141", "#568446", "#8cb759", "#d5dc92")
RED = ("#3b252b", "#743f38", "#ac5b45", "#da8860", "#f5c48a")
STEEL, LIGHT, AMBER, IVORY = "#465857", "#abba9e", "#f6b351", "#fff1cf"
# Brim, cheek, tinted goggles and neck have separate clusters. Back views lose the visor.
HEAD = (
    "....oooooo....",
    "..oohhhhmmoo..",
    ".ohhhmmmmssoo.",
    ".ohmmmmmmssoo.",
    "olhmmmmmmmssso",
    "oomhhhhmmmmooo",
    "..osssllllloo.",
    "..osmsmmlllo..",
    "...ossmmmoo...",
    "....ooooo.....",
)
BACK = (
    "....oooooo....",
    "..oohhhhmmoo..",
    ".ohhhmmmmssoo.",
    ".ohhmmmmmssoo.",
    "olhmmmmmmmssso",
    "oomhhhmmmmmooo",
    "..osssssssso..",
    "..osmmmmmsoo..",
    "...osssssoo...",
    "....ooooo.....",
)
VECTORS = ((1,0),(.82,.63),(0,.85),(.82,-.63),(0,-.85))


def frame(role, enemy, elite, direction, pose):
    image = Image.new("RGBA", (CELL, CELL))
    pen = ImageDraw.Draw(image)
    o, s, m, h, light = RED if enemy else GREEN
    if role == "shield":
        o,s,m,h,light = "#272638","#484055","#696079","#a393aa","#d7c4b9"
    colors = dict(o=o, s=s, m=m, h=h, l=light)
    # Work in the right-facing half of the turntable; mirror finished left cels.
    view = (0,1,2,1,0,3,4,3)[direction]
    vx, vy = VECTORS[view]
    back, side = vy < 0, vx > .9
    bob = int(pose in (1,3,5))
    def poly(points, fill, border=None):
        pen.polygon(points, fill=fill, outline=border)
    def box(x,y,w,height,color):
        pen.rectangle((x,y,x+w-1,y+height-1), fill=color)
    def stroke(x,y,x2,y2,color,width):
        pen.line((x,y,x2,y2),fill=color,width=width)
    def stamp(rows,x,y):
        for j,row in enumerate(rows):
            for i,ch in enumerate(row):
                if ch != ".": pen.point((x+i,y+j), fill=colors[ch])
    # A planted foot, a passing foot, and the opposite contact read at native size.
    for i in (0,1):
        stride = ({1:2,3:-2}.get(pose,0)) * (1 if i else -1)
        lx = 15 + i*6
        toe = lx + round(vx*stride) + int(pose==2 and i==0)
        foot = 32 - (2 if pose==2 and i==0 else 0) + round(vy*stride) - int((pose in (1,3)) and stride < 0)
        poly([(lx-2,23),(lx+2,23),(toe+2,foot-2),(toe+3,foot-1),(toe+3,foot),
              (toe-3,foot),(toe-3,foot-2)],s if not i else m,o)
        box(toe-2,foot-1,5,2,o); box(toe-2,foot-2,3,1,h if i else m)
    y = -bob
    poly([(14,15+y),(20,15+y),(23,17+y),(24,23+y),(21,26+y),
          (13,26+y),(10,23+y),(10,19+y)],m,o)
    box(12,18+y,3,6,s);box(14,17+y,6,2,h);box(13,24+y,9,2,s)
    box(16,24+y,3,2,AMBER if elite or role=="leader" else light)
    # Webbing, ammunition belt, field pack and individual tools.
    if role in ("engineer","mortar","medic","radio","machinegun") or back:
        px=13 if back else 8
        poly([(px,15+y),(px+5,15+y),(px+7,17+y),(px+7,24+y),
              (px+5,26+y),(px-1,25+y),(px-1,17+y)],s,o)
        box(px,17+y,5,2,h);box(px,21+y,5,2,m)
        if role=="medic":
            box(px,19+y,6,5,IVORY);box(px+2,19+y,2,5,"#b54841");box(px,21+y,6,1,"#b54841")
        if role=="radio":
            stroke(px,16+y,px,7+y,o,2);box(px-1,7+y,2,2,light)
            box(px,19+y,5,3,o);box(px+1,20+y,2,1,AMBER)
        if role=="machinegun":
            for jy in (18,21,24):box(px, jy+y,3,2,AMBER)
    def weapon():
        ax, ay = (24 if view==4 else 18), 20+y
        lengths={"sniper":18,"machinegun":16,"shotgun":13,"bayonet":18,"leader":11,
                 "rifle":15,"launcher":13}
        reach=lengths.get(role,11) - (2 if pose==4 else 0)
        ex,ey=round(ax+vx*reach),round(ay+vy*reach)
        if role in ("rifle","shotgun","sniper","machinegun","leader","bayonet","launcher"):
            wide={"launcher":6,"shotgun":5,"machinegun":5}.get(role,3)
            stroke(ax-2,ay+1,ex,ey,o,wide+2);stroke(ax,ay,ex,ey,STEEL,wide)
            stroke(ax,ay-1,ex,ey-1,LIGHT,1)
            if role=="shotgun":
                mx,my=round(ax+vx*(6-(2 if pose==5 else 0))),round(ay+vy*6)
                box(mx-2,my,5,3,AMBER if elite else "#b78a51")
                box(ex-1,ey-1,3,3,o)
            elif role=="sniper":
                mx,my=round(ax+vx*5),round(ay+vy*5);box(mx-2,my-4,6,3,o);box(mx+2,my-4,2,2,"#a4dcdc")
            elif role=="machinegun":
                box(ax+1,ay+1,5,5,o);box(ax+2,ay+2,3,3,AMBER)
            elif role=="bayonet":
                stroke(round(ax+vx*10),round(ay+vy*10),ex,ey,IVORY,2)
        elif role=="mortar":
            mx,my=round(18+vx*7),22+y
            stroke(mx-4,my+5,mx+3,my-8,o,7);stroke(mx-4,my+4,mx+3,my-8,m,5)
            box(mx,my-9,6,3,o);box(mx+1,my-9,4,1,light)
            stroke(mx-1,my+3,mx+3,my+7,o,2)
        elif role=="engineer":
            ex=round(19+vx*4);ey=(27 if pose==5 else 20)+y
            pen.ellipse((ex-4,ey-2,ex+4,ey+4),fill=o)
            pen.ellipse((ex-3,ey-1,ex+3,ey+2),fill=AMBER if elite else h)
            pen.point((ex,ey),fill="#ec583c")
        elif role=="radio":
            ex=round(20+vx*4);ey=14+y if pose in (4,5) else 19+y
            stroke(12,23+y,ex,ey+3,o,2);box(ex-1,ey-2,4,7,o);box(ex,ey-1,2,2,light)
        elif role=="medic":
            ex=round(18+vx*5);ey=19+y
            box(ex-2,ey,8,7,o);box(ex-1,ey+1,6,5,IVORY)
            box(ex+1,ey+1,2,5,"#b54841");box(ex-1,ey+3,6,1,"#b54841")
        elif role=="shield":
            sx=round(20+vx*4);sy=17+y
            poly([(sx-4,sy),(sx+4,sy),(sx+4,sy+8),(sx,sy+12),(sx-4,sy+8)],s,o)
            box(sx-3,sy+1,6,1,light);box(sx-1,sy+3,2,6,h)
            stroke(11,22+y,7+(8 if pose==4 else 0),11+y-(3 if pose==5 else 0),IVORY,2)
    if back: weapon()
    hx,hy=(10 if vx else 11),6+y
    stamp(BACK if back else HEAD,hx,hy)
    if not back:
        box(hx+3,hy+6,8,1,s);box(hx+6,hy+8,4,1,h)
        if side:box(hx+11,hy+7,2,2,light)
    if side:box(hx+10,hy+4,5,2,o);box(hx+11,hy+4,3,1,h)
    if not back:
        if side: box(hx+9,hy+6,3,2,o)
        else:
            box(hx+3,hy+6,2,2,o);box(hx+8,hy+6,3,2,o)
        if role=="sniper":box(hx+7,hy+5,4,2,"#a4dcdc")
    if role=="medic":
        box(hx+6,hy+1,2,5,IVORY);box(hx+4,hy+3,6,1,IVORY)
    elif role in ("leader","radio") or elite:
        box(hx+4,hy+2,5,1,AMBER);box(hx+5,hy+3,3,1,AMBER)
        if elite:box(hx+5,hy+5,4,1,light)
    if role=="sniper":
        for dx,dy in ((0,5),(2,3),(4,1),(9,2)):
            box(hx+dx,hy+dy,3,2,s)
    if role=="engineer":box(hx+2,hy+4,9,2,o);box(hx+5,hy+4,5,1,LIGHT)
    if not back: weapon()
    # Forearm bridges the torso and equipment, even when firing straight down.
    elbow=14 if back else 15
    wrist=round(18+vx*(3 if pose==4 else 2))
    wy=15+y if role=="radio" and pose in (4,5) else 27+y if role=="engineer" and pose==5 else 21+y+round(vy*2)
    stroke(elbow,18+y,elbow-1,22+y,o,5);stroke(elbow-1,22+y,wrist,wy,o,4)
    stroke(elbow,18+y,elbow-1,21+y,m,3);stroke(elbow-1,22+y,wrist,wy,h,2)
    if direction in (3,4,5):
        image=image.transpose(Image.Transpose.FLIP_LEFT_RIGHT)
    return image


def build():
    atlas=Image.new("RGBA",(32*CELL, len(ROLES)*6*CELL))
    for faction in range(2):
        for elite in range(2):
            for n, role in enumerate(ROLES):
                bank=(faction*2+elite)*8
                for pose in range(6):
                    for facing in range(8):
                        cel=frame(role,faction,elite,facing,pose)
                        atlas.paste(cel,((bank+facing)*CELL,(n*6+pose)*CELL))
    atlas.save(OUT/"infantry-v1.png",optimize=True)



ABILITIES = ("damage","speed","haste","critChance","critDamage","gold","capacity","defense","health","xpGain","fieldSupply","fieldGold","fieldRepair")
UNITS = ("rifle","machinegun","sniper","rocket","mortar","medic","guntruck","drone","tank","lucky")


def emblem(key):
    im=Image.new("RGBA",(24,24))
    d=ImageDraw.Draw(im)
    ink="#263831"; cream="#fff2c1"; gold="#e9ae52"; rust="#ab6140"
    green="#80ab63"; deep="#527f58"; teal="#71bdba"; blue="#4b7880"; red="#db735e"
    def shape(points,c): d.polygon(points,fill=c,outline=ink)
    def rect(x,y,X,Y,c): d.rectangle((x,y,X,Y),fill=c)
    def line(points,c,w=1): d.line(points,fill=c,width=w)
    if key=="damage":
        shape([(3,18),(14,7),(19,4),(21,4),(20,9),(8,21),(5,21)],gold)
        line([(7,17),(17,7)],cream,2);line([(6,14),(11,19)],rust,2)
    elif key=="speed":
        shape([(3,17),(8,15),(12,7),(18,9),(16,15),(20,15),(21,17),(18,20),(4,20)],green)
        line([(5,18),(17,18),(20,16)],cream);line([(2,11),(8,11)],gold,2);line([(4,8),(10,8)],gold)
    elif key=="haste":
        for x in (2,11):
            shape([(x,6),(x+4,6),(x+10,12),(x+4,18),(x,18),(x+6,12)],gold)
            line([(x+2,7),(x+4,7),(x+7,10)],cream)
    elif key=="critChance":
        d.ellipse((4,4,19,19),outline=ink,width=3);d.ellipse((5,5,18,18),outline=red)
        for path in [[(11,1),(11,8)],[(11,15),(11,22)],[(1,11),(8,11)],[(15,11),(22,11)]]:line(path,ink,3);line(path,gold)
        rect(10,10,13,13,red)
    elif key=="critDamage":
        shape([(14,1),(13,9),(21,6),(16,13),(21,15),(13,15),(9,23),(9,16),(2,17),(7,11),(3,7),(10,9)],red)
        shape([(12,6),(11,12),(16,11),(10,18),(11,14),(7,14)],gold)
    elif key in ("gold","fieldGold"):
        for x,y in ([(3,13),(10,11),(9,7)] if key=="gold" else [(2,14),(12,14),(7,9),(9,5)]):
            d.ellipse((x,y,x+10,y+7),fill=rust,outline=ink)
            d.ellipse((x,y-1,x+10,y+4),fill=gold,outline=ink);line([(x+3,y),(x+7,y)],cream)
    elif key=="capacity":
        for x,y in [(1,8),(13,8),(7,4)]:
            shape([(x,y+6),(x+2,y+2),(x+5,y+1),(x+8,y+3),(x+9,y+6)],green)
            rect(x+1,y+6,x+8,y+7,ink);rect(x+3,y+8,x+6,y+10,gold)
    elif key=="defense":
        shape([(3,5),(12,2),(20,5),(20,13),(17,17),(12,21),(6,17),(3,13)],deep)
        shape([(5,7),(12,4),(18,6),(17,13),(12,18),(7,14)],green)
        line([(11,6),(8,7),(7,11)],cream,2)
    elif key in ("health","fieldRepair"):
        if key=="health":
            shape([(2,7),(5,4),(9,4),(12,7),(15,4),(19,4),(22,7),(22,11),(12,21),(2,11)],red)
            line([(4,9),(4,7),(7,6)],cream,2)
        else:
            rect(3,8,20,19,ink);rect(4,9,19,17,deep);rect(8,5,15,8,ink);rect(10,6,13,7,cream)
            rect(9,12,15,14,cream);rect(11,10,13,16,cream)
    elif key=="xpGain":
        shape([(12,1),(16,8),(22,12),(16,15),(12,22),(8,15),(2,12),(8,8)],teal)
        shape([(12,4),(13,10),(18,12),(13,14),(12,19),(10,14),(6,12),(10,10)],cream)
    elif key=="fieldSupply":
        rect(2,7,21,19,ink);rect(3,8,20,17,deep);rect(3,6,20,10,ink);rect(3,7,20,9,green)
        for x in (6,16):rect(x,8,x+1,17,cream)
        rect(10,11,13,14,gold)
    elif key=="tank":
        shape([(1,14),(5,11),(18,11),(22,14),(22,17),(19,20),(4,20),(1,17)],deep)
        rect(4,16,19,18,ink)
        for x in (5,9,13,17):rect(x,16,x+1,17,LIGHT)
        shape([(6,12),(8,7),(14,6),(17,9),(17,12)],green);line([(13,9),(22,5)],ink,4);line([(13,8),(22,4)],LIGHT)
    elif key=="lucky":
        shape([(1,13),(6,11),(8,6),(15,6),(18,11),(22,12),(22,17),(2,17)],green)
        rect(9,7,14,10,blue);rect(3,14,6,15,gold)
        for x in (4,16):d.ellipse((x,14,x+4,19),fill=ink);rect(x+2,16,x+2,17,LIGHT)
    elif key=="drone":
        for x,y in [(4,6),(17,6),(4,16),(17,16)]:
            line([(11,12),(x+1,y+1)],ink,3);d.ellipse((x-3,y-1,x+4,y+2),fill=LIGHT,outline=ink)
        shape([(8,10),(12,8),(16,10),(15,14),(11,16),(8,14)],green);rect(11,13,13,14,teal)
    return im


def icons():
    keys=list(ABILITIES)+list(UNITS)+list(UNITS)
    art=Image.new("RGBA",(CELL*len(keys),CELL))
    roles=dict(rifle="shotgun",rocket="engineer",guntruck="radio")
    for i,key in enumerate(keys):
        rank=i>=len(ABILITIES)+len(UNITS)
        if key in UNITS and key not in ("drone","tank","lucky"):
            tile=frame(roles.get(key,key),False,rank,1,0)
        else:
            tile=Image.new("RGBA",(CELL,CELL));icon=emblem(key)
            tile.paste(icon,(8,8))
            if rank:
                p=ImageDraw.Draw(tile);p.line([(12,8),(15,5),(18,8)],fill=AMBER,width=2)
        art.paste(tile,(i*CELL,0))
    art.save(OUT/"promotion-v1.png",optimize=True)



def border():
    im=Image.new("RGBA",(16,16))
    d=ImageDraw.Draw(im)
    # Four-pixel corner steps, a folded brass lip, and a deep olive inner seam.
    d.polygon([(3,0),(12,0),(12,1),(14,1),(14,3),(15,3),(15,12),
               (14,12),(14,14),(12,14),(12,15),(3,15),(3,14),(1,14),
               (1,12),(0,12),(0,3),(1,3),(1,1),(3,1)],fill="#253c32")
    d.rectangle((2,3,13,12), fill="#829371")
    d.rectangle((3,2,12,13), fill="#829371")
    d.rectangle((3,3,12,12), fill="#d4cda3")
    d.rectangle((4,4,11,11), fill="#495d48")
    d.rectangle((5,5,10,10), fill=(0,0,0,0))
    for x,y in [(3,3),(12,3),(3,12),(12,12)]:d.point((x,y),fill="#f9db88")
    im.save(OUT/"promotion-frame.png")


if __name__=="__main__":
    build()
    icons()
    border()

