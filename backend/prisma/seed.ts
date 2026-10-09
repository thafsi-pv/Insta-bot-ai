import { PrismaClient, Role, MediaType } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding database...');

  // 1. Seed Admin User
  const adminEmail = 'admin@instabot.com';
  const existingAdmin = await prisma.user.findUnique({
    where: { email: adminEmail },
  });

  if (!existingAdmin) {
    const hashedPassword = await bcrypt.hash('admin123456', 10);
    await prisma.user.create({
      data: {
        email: adminEmail,
        password: hashedPassword,
        name: 'Demo Admin',
        role: Role.ADMIN,
      },
    });
    console.log(`Created default admin user: ${adminEmail}`);
  } else {
    console.log(`Admin user ${adminEmail} already exists`);
  }

  // 2. Seed Example Product: Black T-Shirt
  const existingProduct = await prisma.product.findFirst({
    where: { name: 'Black T-Shirt' },
  });

  if (!existingProduct) {
    const product = await prisma.product.create({
      data: {
        name: 'Black T-Shirt',
        description: 'Premium heavyweight 100% combed cotton black t-shirt with relaxed fit.',
        price: 799.0,
        active: true,
        variants: {
          create: [
            { sku: 'TS-BLK-S', size: 'S', color: 'Black', stock: 5, active: true },
            { sku: 'TS-BLK-M', size: 'M', color: 'Black', stock: 10, active: true },
            { sku: 'TS-BLK-L', size: 'L', color: 'Black', stock: 4, active: true },
            { sku: 'TS-BLK-XL', size: 'XL', color: 'Black', stock: 0, active: true },
          ],
        },
        media: {
          create: [
            {
              imageUrl: 'https://images.unsplash.com/photo-1521572267360-ee0c2909d518?w=800',
              instagramMediaId: 'MEDIA_123',
              type: MediaType.IMAGE,
            },
          ],
        },
      },
    });
    console.log(`Created seed product: ${product.name} (id: ${product.id}) with 4 variants`);
  }

  // 3. Seed Example Product: Black Hoodie
  const existingHoodie = await prisma.product.findFirst({
    where: { name: 'Black Hoodie' },
  });

  if (!existingHoodie) {
    await prisma.product.create({
      data: {
        name: 'Black Hoodie',
        description: 'Cozy brushed fleece oversized black hoodie with pouch pocket.',
        price: 1299.0,
        active: true,
        variants: {
          create: [
            { sku: 'HD-BLK-M', size: 'M', color: 'Black', stock: 6, active: true },
            { sku: 'HD-BLK-L', size: 'L', color: 'Black', stock: 3, active: true },
          ],
        },
        media: {
          create: [
            {
              imageUrl: 'https://images.unsplash.com/photo-1556905055-8f358a7a47b2?w=800',
              type: MediaType.IMAGE,
            },
          ],
        },
      },
    });
    console.log('Created seed product: Black Hoodie');
  }

  console.log('Database seeding finished successfully.');
}

main()
  .catch((e) => {
    console.error('Seeding failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
