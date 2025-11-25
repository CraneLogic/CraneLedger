CREATE TYPE "public"."booking_event_type" AS ENUM('DEPOSIT', 'BALANCE', 'PAYOUT', 'MARGIN', 'CANCEL', 'REFUND');--> statement-breakpoint
CREATE TYPE "public"."booking_status" AS ENUM('PENDING', 'CONFIRMED', 'CANCELLED', 'COMPLETED');--> statement-breakpoint
CREATE TABLE "booking_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"booking_id" uuid NOT NULL,
	"type" "booking_event_type" NOT NULL,
	"amount" numeric(19, 4) NOT NULL,
	"journal_entry_id" uuid,
	"metadata" varchar(2000),
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "bookings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"external_booking_id" varchar(255) NOT NULL,
	"entity_id" uuid NOT NULL,
	"customer_id" uuid NOT NULL,
	"supplier_id" uuid,
	"status" "booking_status" DEFAULT 'PENDING' NOT NULL,
	"deposit_amount" numeric(19, 4) DEFAULT '0' NOT NULL,
	"balance_amount" numeric(19, 4) DEFAULT '0' NOT NULL,
	"total_job_amount" numeric(19, 4) NOT NULL,
	"margin_amount" numeric(19, 4) DEFAULT '0' NOT NULL,
	"supplier_payout_amount" numeric(19, 4) DEFAULT '0' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "bookings_entity_id_external_booking_id_unique" UNIQUE("entity_id","external_booking_id")
);
--> statement-breakpoint
ALTER TABLE "booking_events" ADD CONSTRAINT "booking_events_booking_id_bookings_id_fk" FOREIGN KEY ("booking_id") REFERENCES "public"."bookings"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "booking_events" ADD CONSTRAINT "booking_events_journal_entry_id_journal_entries_id_fk" FOREIGN KEY ("journal_entry_id") REFERENCES "public"."journal_entries"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_entity_id_entities_id_fk" FOREIGN KEY ("entity_id") REFERENCES "public"."entities"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_customer_id_contacts_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."contacts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_supplier_id_contacts_id_fk" FOREIGN KEY ("supplier_id") REFERENCES "public"."contacts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "booking_events_booking_id_idx" ON "booking_events" USING btree ("booking_id");--> statement-breakpoint
CREATE INDEX "booking_events_journal_entry_id_idx" ON "booking_events" USING btree ("journal_entry_id");--> statement-breakpoint
CREATE INDEX "booking_events_type_idx" ON "booking_events" USING btree ("type");--> statement-breakpoint
CREATE INDEX "bookings_entity_id_idx" ON "bookings" USING btree ("entity_id");--> statement-breakpoint
CREATE INDEX "bookings_customer_id_idx" ON "bookings" USING btree ("customer_id");--> statement-breakpoint
CREATE INDEX "bookings_supplier_id_idx" ON "bookings" USING btree ("supplier_id");--> statement-breakpoint
CREATE INDEX "bookings_external_booking_id_idx" ON "bookings" USING btree ("external_booking_id");