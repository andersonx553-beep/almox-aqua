-- Domain invariants that Prisma schema cannot express directly.
ALTER TABLE "Product"
  ADD CONSTRAINT "Product_minStock_nonnegative_chk" CHECK ("minStock" >= 0),
  ADD CONSTRAINT "Product_maxStock_valid_chk" CHECK ("maxStock" IS NULL OR ("maxStock" >= 0 AND "maxStock" >= "minStock")),
  ADD CONSTRAINT "Product_reorderPoint_nonnegative_chk" CHECK ("reorderPoint" IS NULL OR "reorderPoint" >= 0);

ALTER TABLE "StockBalance"
  ADD CONSTRAINT "StockBalance_quantityOnHand_nonnegative_chk" CHECK ("quantityOnHand" >= 0);

ALTER TABLE "Invoice"
  ADD CONSTRAINT "Invoice_totalValue_nonnegative_chk" CHECK ("totalValue" IS NULL OR "totalValue" >= 0);

ALTER TABLE "InvoiceItem"
  ADD CONSTRAINT "InvoiceItem_quantity_positive_chk" CHECK ("quantity" > 0),
  ADD CONSTRAINT "InvoiceItem_unitPrice_nonnegative_chk" CHECK ("unitPrice" >= 0),
  ADD CONSTRAINT "InvoiceItem_totalPrice_nonnegative_chk" CHECK ("totalPrice" >= 0),
  ADD CONSTRAINT "InvoiceItem_confidence_range_chk" CHECK ("confidence" IS NULL OR ("confidence" >= 0 AND "confidence" <= 1));

ALTER TABLE "OcrRun"
  ADD CONSTRAINT "OcrRun_confidence_range_chk" CHECK ("confidence" IS NULL OR ("confidence" >= 0 AND "confidence" <= 1));

ALTER TABLE "TransferItem"
  ADD CONSTRAINT "TransferItem_quantitySent_positive_chk" CHECK ("quantitySent" > 0),
  ADD CONSTRAINT "TransferItem_quantityReceived_nonnegative_chk" CHECK ("quantityReceived" IS NULL OR "quantityReceived" >= 0);

ALTER TABLE "StockMovementItem"
  ADD CONSTRAINT "StockMovementItem_unitCost_nonnegative_chk" CHECK ("unitCost" IS NULL OR "unitCost" >= 0),
  ADD CONSTRAINT "StockMovementItem_balanceAfter_nonnegative_chk" CHECK ("balanceAfter" IS NULL OR "balanceAfter" >= 0),
  ADD CONSTRAINT "StockMovementItem_quantityDelta_nonzero_chk" CHECK ("quantityDelta" <> 0);

ALTER TABLE "InventoryItem"
  ADD CONSTRAINT "InventoryItem_expectedQuantity_nonnegative_chk" CHECK ("expectedQuantity" >= 0),
  ADD CONSTRAINT "InventoryItem_countedQuantity_nonnegative_chk" CHECK ("countedQuantity" IS NULL OR "countedQuantity" >= 0),
  ADD CONSTRAINT "InventoryItem_difference_consistent_chk" CHECK (
    ("countedQuantity" IS NULL AND "differenceQuantity" IS NULL)
    OR ("countedQuantity" IS NOT NULL AND "differenceQuantity" = "countedQuantity" - "expectedQuantity")
  );
