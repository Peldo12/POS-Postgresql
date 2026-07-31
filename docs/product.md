## GET /products
- [x] No token
- [x] Invalid token
- [x] Expired token
- [x] Authorize role
- [x] Empty products
- [x] Pagination
- [x] Search
- [x] Filter
- [x] Sort
- [x] Max limit
- [x] Page more than total

## GET /products/:id
- [x] Valid ID
- [x] Non product ID
- [x] ID Validation

## POST /products
- [x] Valid data
- [x] Duplicate SKU
- [x] No category
- [x] Negatif price
- [x] Negatif stock
- [x] Invalid JSON format

PUT /products/:id
□ Update normal
□ SKU bentrok
□ Barcode bentrok
□ ID tidak ada

PATCH /products/stocks/update
□ Stock bertambah
□ Stock berkurang
□ Stock menjadi minus
□ Product tidak ditemukan

PATCH /products/:id/remove
□ Soft delete
□ Sudah dihapus
□ ID tidak ada

PATCH /products/:id/restore
□ Restore berhasil
□ Data belum dihapus
□ ID tidak ada