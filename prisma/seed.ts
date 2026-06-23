import { PrismaClient, Role } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting seed...');

  // Create super admin
  const hashedPassword = await bcrypt.hash('Admin@123456', 12);
  
  const superAdmin = await prisma.admin.upsert({
    where: { email: 'superadmin@rayan.com' },
    update: {},
    create: {
      email: 'superadmin@rayan.com',
      password: hashedPassword,
      name: 'Super Admin',
      role: 'super_admin' as Role,
      isActive: true,
      lastPasswordChange: new Date(),
      passwordExpiry: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000),
    },
  });

  console.log(`✅ Created super admin: ${superAdmin.email}`);

  // Create sample admin
  const adminPassword = await bcrypt.hash('Admin@123456', 12);
  
  const admin = await prisma.admin.upsert({
    where: { email: 'admin@rayan.com' },
    update: {},
    create: {
      email: 'admin@rayan.com',
      password: adminPassword,
      name: 'Admin User',
      role: 'admin' as Role,
      isActive: true,
      lastPasswordChange: new Date(),
      passwordExpiry: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000),
    },
  });

  console.log(`✅ Created admin: ${admin.email}`);

  // Create sample operator
  const operatorPassword = await bcrypt.hash('Operator@123456', 12);
  
  const operator = await prisma.admin.upsert({
    where: { email: 'operator@rayan.com' },
    update: {},
    create: {
      email: 'operator@rayan.com',
      password: operatorPassword,
      name: 'Operator User',
      role: 'operator' as Role,
      isActive: true,
      lastPasswordChange: new Date(),
      passwordExpiry: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000),
    },
  });

  console.log(`✅ Created operator: ${operator.email}`);

  // Create sample device groups
  const groups = [
    { name: 'Production Devices', description: 'Devices in production environment' },
    { name: 'Testing Devices', description: 'Devices in testing environment' },
    { name: 'Development Devices', description: 'Devices in development environment' },
  ];

  for (const group of groups) {
    await prisma.deviceGroup.upsert({
      where: { name: group.name },
      update: {},
      create: group,
    });
  }

  console.log('✅ Created device groups');

  // Create sample device tags
  const tags = [
    { name: 'Critical', color: '#FF0000' },
    { name: 'Important', color: '#FFA500' },
    { name: 'Normal', color: '#00FF00' },
    { name: 'Deprecated', color: '#808080' },
  ];

  for (const tag of tags) {
    await prisma.deviceTag.upsert({
      where: { name: tag.name },
      update: {},
      create: tag,
    });
  }

  console.log('✅ Created device tags');

  // Create sample device
  const device = await prisma.device.upsert({
    where: { deviceId: 'DEVICE001' },
    update: {},
    create: {
      deviceId: 'DEVICE001',
      deviceName: 'Sample Device 1',
      brand: 'Samsung',
      model: 'Galaxy S24',
      androidVersion: '14.0',
      sdkVersion: '34',
      serialNumber: 'ABCDEFGH12345678',
      screenResolution: '1080x2400',
      batteryHealth: 85,
      totalStorage: BigInt(256 * 1024 * 1024 * 1024),
      freeStorage: BigInt(128 * 1024 * 1024 * 1024),
      ramTotal: BigInt(8 * 1024 * 1024 * 1024),
      ramFree: BigInt(4 * 1024 * 1024 * 1024),
      cpuInfo: 'Exynos 2400',
      networkInfo: 'WiFi 6E',
      status: 'online',
      trustScore: 100,
      verificationLevel: 'advanced',
    },
  });

  console.log(`✅ Created sample device: ${device.deviceId}`);

  // Create sample enrollment
  await prisma.enrollment.upsert({
    where: { id: 'enrollment_001' },
    update: {},
    create: {
      id: 'enrollment_001',
      deviceId: device.id,
      pinCode: '123456',
      email: 'test@example.com',
      status: 'approved',
      expiredAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
    },
  });

  console.log('✅ Created sample enrollment');

  // Create sample monitoring data
  await prisma.deviceMonitoring.createMany({
    data: [
      {
        deviceId: device.id,
        batteryLevel: 75,
        chargingStatus: false,
        storageUsed: BigInt(128 * 1024 * 1024 * 1024),
        ramUsed: BigInt(4 * 1024 * 1024 * 1024),
        cpuUsage: 45.5,
        temperature: 32.5,
        wifiInfo: 'Connected',
      },
    ],
  });

  console.log('✅ Created sample monitoring data');

  console.log('🎉 Seed completed successfully!');
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
