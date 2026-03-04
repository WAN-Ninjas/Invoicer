-- AlterForeignKey: charges.invoiceId CASCADE → SET NULL
ALTER TABLE "charges" DROP CONSTRAINT "charges_invoiceId_fkey";
ALTER TABLE "charges" ADD CONSTRAINT "charges_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "invoices"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AlterForeignKey: timesheet_entries.invoiceId CASCADE → SET NULL
ALTER TABLE "timesheet_entries" DROP CONSTRAINT "timesheet_entries_invoiceId_fkey";
ALTER TABLE "timesheet_entries" ADD CONSTRAINT "timesheet_entries_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "invoices"("id") ON DELETE SET NULL ON UPDATE CASCADE;
