import { getPayload } from "payload";
import type { Payload } from "payload";
import config from "@payload-config";
import { backfillVendorAccountMirrors } from "@/lib/sync-vendor-account-mirror";

/**
 * Payload reads `DATABASE_URL`. Some setups use `MONGODB_URI` instead — mirror it here.
 */
function ensureDatabaseUrl(): void {
  const fromAlt = process.env.MONGODB_URI?.trim();
  if (!process.env.DATABASE_URL?.trim() && fromAlt) {
    process.env.DATABASE_URL = fromAlt;
  }

  const url = process.env.DATABASE_URL?.trim();
  if (!url) {
    console.error("❌ DATABASE_URL is not set.");
    console.error("   In .env at the project root, add a MongoDB URI, for example:");
    console.error("   DATABASE_URL=mongodb://127.0.0.1:27017/evegasupply");
    console.error("   You can use MONGODB_URI instead if you prefer the same value.");
    process.exit(1);
  }

  if (!url.startsWith("mongodb://") && !url.startsWith("mongodb+srv://")) {
    const schemeEnd = url.indexOf(":");
    const scheme = schemeEnd > 0 ? url.slice(0, schemeEnd) : "(invalid)";
    console.error("❌ DATABASE_URL must be a MongoDB connection string.");
    console.error(`   It starts with "${scheme}:" but must start with mongodb:// or mongodb+srv://`);
    console.error("   Fix .env — local example:");
    console.error("   DATABASE_URL=mongodb://127.0.0.1:27017/evegasupply");
    process.exit(1);
  }
}

export async function seedAdminUser(payload?: Payload) {
  if (!payload) ensureDatabaseUrl();
  const p = payload ?? (await getPayload({ config }));

  const existing = await p.find({
    collection: "users",
    where: { email: { equals: "admin@example.com" } },
    limit: 1,
  });

  if (existing.docs.length > 0) {
    console.log("✓ Admin user already exists");
    return;
  }

  await p.create({
    collection: "users",
    data: {
      email: "admin@example.com",
      password: "admin123",
      name: "Admin User",
      role: "admin",
    },
    overrideAccess: true,
  });

  console.log("✅ Admin user created (admin@example.com / admin123)");
}

/** BDO user email — assigned to every vendor and buyer by `ensureSubbuBdoUserAndAssignAll`. */
export const SUBBU_BDO_EMAIL = "subbu.poluru@gmail.com";

/**
 * Ensures `subbu.poluru@gmail.com` exists with role `bdo`, then sets that user as `bdo` on **all**
 * vendor (supplier) and buyer documents. Idempotent: safe to run again after new vendors/buyers are added.
 *
 * Use `npm run db:seed:bdo` to run only this step on an existing database.
 */
export async function ensureSubbuBdoUserAndAssignAll(payload?: Payload): Promise<void> {
  if (!payload) ensureDatabaseUrl();
  const p = payload ?? (await getPayload({ config }));

  const existing = await p.find({
    collection: "users",
    where: { email: { equals: SUBBU_BDO_EMAIL } },
    limit: 1,
  });

  let bdoId: string;
  if (existing.docs.length === 0) {
    const password =
      process.env.SUBBU_BDO_PASSWORD?.trim() || "SubbuBdoDev!2026";
    const created = await p.create({
      collection: "users",
      data: {
        email: SUBBU_BDO_EMAIL,
        password,
        name: "Subbu Poluru",
        role: "bdo",
      },
      overrideAccess: true,
    });
    bdoId = created.id as string;
    console.log(`✅ BDO user created: ${SUBBU_BDO_EMAIL}`);
    if (!process.env.SUBBU_BDO_PASSWORD?.trim()) {
      console.log(
        "   Default password used — set SUBBU_BDO_PASSWORD in .env or change it in Payload admin.",
      );
    }
  } else {
    const doc = existing.docs[0] as { id: string; name?: string | null };
    bdoId = doc.id;
    const name = doc.name?.trim() ? doc.name : "Subbu Poluru";
    await p.update({
      collection: "users",
      id: bdoId,
      data: { role: "bdo", name },
      overrideAccess: true,
    });
    console.log(`✓ BDO user ensured (role BDO): ${SUBBU_BDO_EMAIL}`);
  }

  const assignedAt = new Date().toISOString();
  const pageSize = 200;
  let page = 1;
  let vendorCount = 0;
  for (;;) {
    const res = await p.find({
      collection: "vendors",
      limit: pageSize,
      page,
      depth: 0,
    });
    for (const doc of res.docs) {
      await p.update({
        collection: "vendors",
        id: doc.id,
        data: { bdo: bdoId, bdoAssignedAt: assignedAt },
        overrideAccess: true,
      });
      vendorCount += 1;
    }
    if (res.docs.length < pageSize) break;
    page += 1;
  }

  page = 1;
  let buyerCount = 0;
  for (;;) {
    const res = await p.find({
      collection: "buyers",
      limit: pageSize,
      page,
      depth: 0,
    });
    for (const doc of res.docs) {
      await p.update({
        collection: "buyers",
        id: doc.id,
        data: { bdo: bdoId, bdoAssignedAt: assignedAt },
        overrideAccess: true,
      });
      buyerCount += 1;
    }
    if (res.docs.length < pageSize) break;
    page += 1;
  }

  console.log(
    `✅ Assigned BDO ${SUBBU_BDO_EMAIL} to ${vendorCount} vendor(s) and ${buyerCount} buyer(s).`,
  );
}

export async function seedDressSuppliers(payload?: Payload) {
  if (!payload) ensureDatabaseUrl();
  const p = payload ?? (await getPayload({ config }));

  const existing = await p.find({
    collection: "vendors",
    where: { companyName: { equals: "Silk Road Garments Co." } },
    limit: 1,
  });
  if (existing.docs.length > 0) {
    console.log("✓ Dress suppliers already seeded. Skipping.");
    return;
  }

  const vendor1User = await p.create({
    collection: "users",
    data: {
      email: "silkroad@dresssupply.com",
      password: "vendor123",
      name: "Silk Road Garments",
      role: "vendor",
    },
    overrideAccess: true,
  });

  const vendor2User = await p.create({
    collection: "users",
    data: {
      email: "elegance@fashionwholesale.com",
      password: "vendor123",
      name: "Elegance Fashion Wholesale",
      role: "vendor",
    },
    overrideAccess: true,
  });

  const vendor1 = await p.create({
    collection: "vendors",
    data: {
      user: vendor1User.id,
      companyName: "Silk Road Garments Co.",
      companyType: "manufacturer",
      yearEstablished: 2010,
      annualRevenue: "10m_50m",
      employeeCount: "51_200",
      mainMarkets: [{ market: "North America" }, { market: "Europe" }],
      mainProducts: [{ product: "Evening Dresses" }, { product: "Bridal Wear" }],
      factoryLocation: "Guangzhou, China",
      factorySize: "10000_50000",
      verifiedSupplier: true,
      goldSupplier: true,
      responseTime: "12h",
      acceptSampleOrders: true,
      acceptCustomOrders: true,
      companyWebsite: "https://silkroadgarments.com",
      companyHistory:
        "Leading manufacturer of premium evening and bridal dresses since 2010.",
      status: "approved",
      isActive: true,
    },
    overrideAccess: true,
  });

  const vendor2 = await p.create({
    collection: "vendors",
    data: {
      user: vendor2User.id,
      companyName: "Elegance Fashion Wholesale Ltd.",
      companyType: "trading",
      yearEstablished: 2015,
      annualRevenue: "5m_10m",
      employeeCount: "11_50",
      mainMarkets: [{ market: "Europe" }, { market: "Australia" }],
      mainProducts: [{ product: "Cocktail Dresses" }, { product: "Party Wear" }],
      factoryLocation: "Shenzhen, China",
      factorySize: "5000_10000",
      verifiedSupplier: true,
      responseTime: "24h",
      acceptSampleOrders: true,
      acceptCustomOrders: true,
      companyWebsite: "https://elegancefashionwholesale.com",
      companyHistory:
        "B2B wholesale specialist in cocktail and party dresses for retailers worldwide.",
      status: "approved",
      isActive: true,
    },
    overrideAccess: true,
  });

  await p.create({
    collection: "products",
    data: {
      title: "A-Line Evening Gown - Satin",
      description:
        "Elegant A-line evening gown in premium satin. Perfect for formal events, galas, and red carpet. Available in 12 colors. Custom sizing available.",
      supplier: vendor1.id,
      moq: 50,
      unitPrice: 45.99,
      sampleAvailable: true,
      samplePrice: 89.99,
      customizationAvailable: true,
      leadTime: "14-21 days",
      category: "Evening Dresses",
      bulkPricingTiers: [
        { minQuantity: 50, price: 45.99, unit: "USD" },
        { minQuantity: 100, price: 42.99, unit: "USD" },
        { minQuantity: 500, price: 38.99, unit: "USD" },
      ],
      paymentTerms: [{ term: "T/T 30% deposit" }, { term: "L/C" }],
      shippingTerms: [{ term: "FOB" }, { term: "CIF" }],
      originCountry: "China",
    },
    overrideAccess: true,
  });

  await p.create({
    collection: "products",
    data: {
      title: "Lace Bridal Maxi Dress",
      description:
        "Stunning lace bridal maxi dress with delicate embroidery. Ideal for bridesmaids, destination weddings, and special occasions. MOQ 30 pieces.",
      supplier: vendor1.id,
      moq: 30,
      unitPrice: 62.5,
      sampleAvailable: true,
      samplePrice: 125.0,
      customizationAvailable: true,
      leadTime: "21-28 days",
      category: "Bridal Wear",
      bulkPricingTiers: [
        { minQuantity: 30, price: 62.5, unit: "USD" },
        { minQuantity: 100, price: 55.0, unit: "USD" },
      ],
      paymentTerms: [{ term: "T/T 50% deposit" }],
      originCountry: "China",
    },
    overrideAccess: true,
  });

  await p.create({
    collection: "products",
    data: {
      title: "Cocktail Dress - Sequin Midi",
      description:
        "Trendy sequin midi cocktail dress. Best seller for parties, NYE, and special events. Quick turnaround available. 20+ color options.",
      supplier: vendor2.id,
      moq: 40,
      unitPrice: 28.99,
      sampleAvailable: true,
      samplePrice: 49.99,
      customizationAvailable: true,
      leadTime: "10-14 days",
      category: "Cocktail Dresses",
      bulkPricingTiers: [
        { minQuantity: 40, price: 28.99, unit: "USD" },
        { minQuantity: 200, price: 24.99, unit: "USD" },
        { minQuantity: 500, price: 21.99, unit: "USD" },
      ],
      paymentTerms: [{ term: "T/T" }, { term: "PayPal" }],
      shippingTerms: [{ term: "FOB" }],
      originCountry: "China",
    },
    overrideAccess: true,
  });

  console.log("✅ Seeded dress suppliers, vendors (approved/active), and 3 products");
}

const SAMPLE_BUYER_EMAIL = "sample.buyer@evegasupply.local";

export async function seedSampleBuyerAndOrders(payload?: Payload) {
  if (!payload) ensureDatabaseUrl();
  const p = payload ?? (await getPayload({ config }));

  const buyerUserResult = await p.find({
    collection: "users",
    where: { email: { equals: SAMPLE_BUYER_EMAIL } },
    limit: 1,
  });

  let buyerUserId: string;
  if (buyerUserResult.docs.length === 0) {
    const created = await p.create({
      collection: "users",
      data: {
        email: SAMPLE_BUYER_EMAIL,
        password: "buyer123",
        name: "Alex Rivera",
        role: "buyer",
      },
      overrideAccess: true,
    });
    buyerUserId = created.id as string;

    await p.create({
      collection: "buyers",
      data: {
        user: buyerUserId,
        companyName: "Sample Boutique Retail",
        companyType: "retailer",
        annualPurchaseVolume: "500k_1m",
        mainBusiness: "Women's apparel and occasion wear for West Coast boutiques.",
        targetMarkets: [{ market: "United States" }, { market: "Canada" }],
        verifiedBuyer: true,
        verificationStatus: "verified",
        companyAddress: "450 Market St, Suite 200\nSan Francisco, CA",
        companyPhone: "+1-415-555-0199",
        companyEmail: "orders@sampleboutique.example",
        companyDescription: "Seed buyer account for local development and demos.",
        numberOfEmployees: "11_50",
        yearEstablished: 2018,
        preferredPaymentTerms: [{ term: "Net 30" }, { term: "T/T" }],
        shippingPreferences: [{ preference: "FOB Los Angeles" }],
      },
      overrideAccess: true,
    });
    console.log(`✅ Sample buyer user + profile (${SAMPLE_BUYER_EMAIL} / buyer123)`);
  } else {
    buyerUserId = buyerUserResult.docs[0].id as string;
    console.log("✓ Sample buyer user already exists");
  }

  const products = await p.find({
    collection: "products",
    limit: 10,
    sort: "createdAt",
  });

  if (products.docs.length === 0) {
    console.log("⚠ No products in database — run dress supplier seed first. Skipping orders.");
    return;
  }

  const existingOrders = await p.find({
    collection: "orders",
    where: { poNumber: { equals: "SEED-PO-001" } },
    limit: 1,
  });
  if (existingOrders.docs.length > 0) {
    console.log("✓ Sample orders already seeded. Skipping.");
    return;
  }

  const p1 = products.docs[0];
  const p2 = products.docs[1] ?? p1;
  const supplierId =
    typeof p1.supplier === "object" && p1.supplier && "id" in p1.supplier
      ? (p1.supplier as { id: string }).id
      : (p1.supplier as string);
  const supplierId2 =
    typeof p2.supplier === "object" && p2.supplier && "id" in p2.supplier
      ? (p2.supplier as { id: string }).id
      : (p2.supplier as string);

  const qty1 = 50;
  const unit1 = typeof p1.unitPrice === "number" ? p1.unitPrice : 45.99;
  const qty2 = 30;
  const unit2 = typeof p2.unitPrice === "number" ? p2.unitPrice : 28.99;

  await p.create({
    collection: "orders",
    data: {
      buyer: buyerUserId,
      supplier: supplierId,
      orderType: "standard",
      products: [
        {
          product: p1.id,
          quantity: qty1,
          unitPrice: unit1,
          totalPrice: Math.round(qty1 * unit1 * 100) / 100,
        },
      ],
      totalAmount: Math.round(qty1 * unit1 * 100) / 100,
      paymentTerms: [{ term: "T/T 30% deposit, balance before shipment" }],
      shippingTerms: [{ term: "FOB" }],
      status: "confirmed",
      poNumber: "SEED-PO-001",
      phoneNumber: "+1-415-555-0199",
      shippingAddress: {
        fullName: "Alex Rivera",
        street: "450 Market St, Suite 200",
        city: "San Francisco",
        state: "CA",
        zipcode: "94105",
        country: "United States",
      },
    },
    overrideAccess: true,
  });

  await p.create({
    collection: "orders",
    data: {
      buyer: buyerUserId,
      supplier: supplierId2,
      orderType: "sample",
      products: [
        {
          product: p2.id,
          quantity: qty2,
          unitPrice: unit2,
          totalPrice: Math.round(qty2 * unit2 * 100) / 100,
        },
      ],
      totalAmount: Math.round(qty2 * unit2 * 100) / 100,
      paymentTerms: [{ term: "100% upfront" }],
      shippingTerms: [{ term: "EXW" }],
      status: "in_production",
      poNumber: "SEED-PO-002",
      phoneNumber: "+1-415-555-0199",
      shippingAddress: {
        fullName: "Alex Rivera",
        street: "450 Market St, Suite 200",
        city: "San Francisco",
        state: "CA",
        zipcode: "94105",
        country: "United States",
      },
    },
    overrideAccess: true,
  });

  console.log("✅ Sample orders created (SEED-PO-001, SEED-PO-002)");
}

export async function seedAll() {
  console.log("🌱 Seeding sample data…\n");
  ensureDatabaseUrl();
  const payload = await getPayload({ config });
  await seedAdminUser(payload);
  await seedDressSuppliers(payload);
  await seedSampleBuyerAndOrders(payload);
  await backfillVendorAccountMirrors(payload);
  await ensureSubbuBdoUserAndAssignAll(payload);
  console.log("\n🎉 Sample data seed complete.");
  console.log("   Admin:     admin@example.com / admin123");
  console.log(`   BDO:       ${SUBBU_BDO_EMAIL} (assigned to all vendors & buyers; set SUBBU_BDO_PASSWORD on first create)`);
  console.log("   Vendors:   silkroad@dresssupply.com, elegance@fashionwholesale.com / vendor123");
  console.log(`   Buyer:     ${SAMPLE_BUYER_EMAIL} / buyer123`);
}
