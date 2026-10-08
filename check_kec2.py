import json
kota=json.load(open("frontend/public/geojson/kota.geojson",encoding="utf-8"))
kec=json.load(open("frontend/public/geojson/kecamatan.geojson",encoding="utf-8"))
# kota mapping
km={f["properties"]["KAB_KOTA"]:f["properties"]["KODE_KK"] for f in kota["features"]}
print("kota entries",len(km))
for k,v in sorted(km.items()):
    print(k,v)
print("--- kecamatan distinct KAB_KOTA", len(set(f["properties"]["KAB_KOTA"] for f in kec["features"])))
# check mismatch: kecamatan KAB_KOTA not in kota
from collections import Counter
kec_kota=set(f["properties"]["KAB_KOTA"] for f in kec["features"])
kota_keys=set(km.keys())
print("kec not in kota", kec_kota - kota_keys)
print("kota not in kec", kota_keys - kec_kota)
# sample: kec KAB_KOTA values are without Kabupaten prefix except Kota
# check isSame logic would need to match "Klaten" vs "Kabupaten Klaten" etc. So we have mapping.
# Also check KODE_KK consistency
# build kec KODE_KK distinct
kec_kode=set(f["properties"]["KODE_KK"] for f in kec["features"])
print("kec KODE_KK distinct",len(kec_kode), sorted(list(kec_kode))[:10])
# verify Kota Semarang kecamatan KODE 33.74 count
print("Kota Semarang kec count", len([f for f in kec["features"] if f["properties"]["KAB_KOTA"]=="Kota Semarang"]))
print("Semarang (kab) kec count", len([f for f in kec["features"] if f["properties"]["KAB_KOTA"]=="Semarang"]))
