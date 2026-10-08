import json
from collections import Counter
p="frontend/public/geojson/kecamatan.geojson"
j=json.load(open(p,encoding="utf-8"))
feats=j["features"]
print("total",len(feats))
c=Counter(f["properties"]["KAB_KOTA"] for f in feats)
print("KAB_KOTA counts",len(c), c.most_common(15))
print("sample props",feats[0]["properties"])
kks=set(f["properties"]["KODE_KK"] for f in feats)
print("KODE_KK sample",list(kks)[:10])
for f in feats:
  if "semarang" in f["properties"]["KAB_KOTA"].lower():
    print("semarang feat",f["properties"])
# distinct KECAMATAN names duplicates?
names=[f["properties"]["KECAMATAN"] for f in feats]
dups=[k for k,v in Counter(names).items() if v>1]
print("dup kecamatan names",dups[:15],len(dups))
# load kota geojson to see KODE_KK mapping
kota=json.load(open("frontend/public/geojson/kota.geojson",encoding="utf-8"))
km={f["properties"]["KAB_KOTA"]:f["properties"]["KODE_KK"] for f in kota["features"]}
print("kota KODE_KK",{k:km[k] for k in list(km)[:10]})
print("semarang kota mapping",{k:v for k,v in km.items() if "semarang" in k.lower()})
