# Endereza los lotes de Malalcahuello y Marchigüe como cobertura (bordes compartidos intactos, sin huecos).
# Uso: python3 enderezar_planos.py <planos.js de entrada> <planos.js de salida> <tolerancia Malalcahuello> <tolerancia Marchigüe>
# Valores publicados: 16 y 12, aplicados sobre la geometría original de la segmentación. Requiere shapely >= 2.1.
import re, json, sys
import shapely
from shapely.geometry import Polygon, MultiPolygon
from shapely.ops import unary_union, polylabel
SRC=sys.argv[1]; OUT=sys.argv[2] if len(sys.argv)>2 else None
TOL={"malalcahuello":float(sys.argv[3]) if len(sys.argv)>3 else 8, "marchigue":float(sys.argv[4]) if len(sys.argv)>4 else 8}
js=open(SRC).read()
m=re.search(r"(B\.planos = )(\{.*?\})(;\n)", js, re.S); ALL=json.loads(m.group(2))
def rings(d):
    out=[];cur=[]
    for cmd,x,y in re.findall(r'([MLZ])\s*(-?[\d.]+)?\s*(-?[\d.]+)?', d):
        if cmd=='M':
            if cur: out.append(cur)
            cur=[(float(x),float(y))]
        elif cmd=='L': cur.append((float(x),float(y)))
        else:
            if cur: out.append(cur); cur=[]
    if cur: out.append(cur)
    return out
def poly(d):
    rs=rings(d); g=Polygon(rs[0])
    for r in rs[1:]: g=g.symmetric_difference(Polygon(r))
    return g.buffer(0)
def num(v):
    r=round(v,1); return str(int(r)) if r==int(r) else str(r)
def fmt(g):
    parts=[g] if g.geom_type=="Polygon" else list(g.geoms)
    out=[]
    for p in parts:
        for ring in [p.exterior]+list(p.interiors):
            cs=[(num(x),num(y)) for x,y in list(ring.coords)[:-1]]
            ded=[c for i,c in enumerate(cs) if c!=cs[i-1]]
            out.append("M"+"L".join(a+" "+b for a,b in ded)+"Z")
    return "".join(out)
for k in ["malalcahuello","marchigue"]:
    P=ALL[k]; keys=list(P["lotes"].keys())
    geoms=[poly(P["lotes"][n]["d"]) for n in keys]+[poly(c["d"]) for c in P["calles"]]
    before=sum(len(g.exterior.coords)-1 if g.geom_type=="Polygon" else 0 for g in geoms[:len(keys)])
    simp=shapely.coverage_simplify(shapely.set_precision(shapely.GeometryCollection(geoms),0).geoms if False else geoms, TOL[k], simplify_boundary=True)
    simp=[s.buffer(0) for s in simp]
    after=sum(len(g.exterior.coords)-1 if g.geom_type=="Polygon" else 0 for g in simp[:len(keys)])
    haus=max(shapely.hausdorff_distance(a,b) for a,b in zip(geoms,simp))
    ov=sum(simp[i].intersection(simp[j]).area for i in range(len(simp)) for j in range(i+1,len(simp)) if simp[i].intersects(simp[j]))
    U=unary_union(simp); holes=sum(Polygon(r).area for r in (U.interiors if U.geom_type=="Polygon" else []))
    print(k,"tol",TOL[k],"vértices lotes",before,"->",after,"prom",round(after/len(keys),1),"desvío máx",round(haus,1),"traslape",round(ov,2),"huecos",round(holes,2))
    for n,g in zip(keys,simp[:len(keys)]):
        if g.geom_type!="Polygon": g=max(g.geoms,key=lambda q:q.area)
        lab=polylabel(g,tolerance=.5); P["lotes"][n]={"d":fmt(g),"l":[round(lab.x,1),round(lab.y,1)],"r":round(g.exterior.distance(lab),1)}
    for c,g in zip(P["calles"],simp[len(keys):]): c["d"]=fmt(g)
    ext=U if U.geom_type=="Polygon" else max(U.geoms,key=lambda q:q.area)
    P["contorno"]=fmt(Polygon(ext.exterior))
if OUT:
    open(OUT,"w").write(js[:m.start(2)]+json.dumps(ALL,separators=(',',':'),ensure_ascii=False)+js[m.end(2):])
