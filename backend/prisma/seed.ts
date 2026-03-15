import 'dotenv/config';
import prisma from '../src/config/prisma.js';
import bcrypt from 'bcryptjs';

async function main() {
  console.log('Seeding database with demo data...');

  // 1. Clean existing records (Optional, good for resetting)
  await prisma.review.deleteMany();
  await prisma.bookingItem.deleteMany();
  await prisma.booking.deleteMany();
  await prisma.service.deleteMany();
  await prisma.vehicle.deleteMany();
  await prisma.garage.deleteMany();
  await prisma.customer.deleteMany();
  await prisma.user.deleteMany();

  const passwordHash = await bcrypt.hash('password123', 10);

  // 2. Create Admin
  const adminUser = await prisma.user.create({
    data: {
      email: 'admin@garageconnect.com',
      passwordHash,
      fullName: 'System Administrator',
      role: 'ADMIN'
    }
  });

  // 3. Create Garage Owner & Garage
  const ownerUser = await prisma.user.create({
    data: {
      email: 'owner@fastfix.com',
      passwordHash,
      fullName: 'Mike Mechanic',
      role: 'GARAGE_OWNER',
    }
  });

  const garage1 = await prisma.garage.create({
    data: {
      userId: ownerUser.id,
      garageName: 'FastFix Auto Repair',
      address: '101 Motor Way',
      city: 'Portland',
      state: 'OR',
      pincode: '97204',
      isVerified: true,
      latitude: 45.5231,
      longitude: -122.6765,
      services: {
        create: [
          { name: 'Standard Oil Change', basePrice: 49.99, pricingType: 'FIXED', vehicleTypes: ['FOUR_WHEELER'] },
          { name: 'Brake Inspection', basePrice: 20.00, pricingType: 'INSPECTION_BASED', vehicleTypes: ['FOUR_WHEELER'] },
          { name: 'Bike Chain Lube', basePrice: 15.00, pricingType: 'FIXED', vehicleTypes: ['TWO_WHEELER'] },
          { name: 'Emergency Towing', basePrice: 100.00, pricingType: 'FIXED', vehicleTypes: ['FOUR_WHEELER', 'TWO_WHEELER'] }
        ]
      }
    },
    include: { services: true }
  });

  const garage2 = await prisma.garage.create({
    data: {
      userId: ownerUser.id,
      garageName: 'Speedy Motors',
      address: '500 Speed St',
      city: 'Portland',
      state: 'OR',
      pincode: '97205',
      isVerified: true,
      latitude: 45.5150,
      longitude: -122.6850,
      services: {
        create: [
          { name: 'Full Service', basePrice: 199.99, pricingType: 'FIXED', vehicleTypes: ['FOUR_WHEELER'] },
          { name: 'Part Replacement', basePrice: 50.00, pricingType: 'PARTS_DEPENDENT', vehicleTypes: ['FOUR_WHEELER', 'TWO_WHEELER'] }
        ]
      }
    }
  });

  const garage3 = await prisma.garage.create({
    data: {
      userId: ownerUser.id,
      garageName: 'Pro Auto Works',
      address: '789 Grease Blvd',
      city: 'Vancouver',
      state: 'WA',
      pincode: '98660',
      isVerified: false,
      latitude: 45.6277,
      longitude: -122.6720,
      services: {
        create: [
          { name: 'Engine Tuning', basePrice: 150.00, pricingType: 'FIXED', vehicleTypes: ['FOUR_WHEELER'] }
        ]
      }
    }
  });

  const garage = garage1; // Maintain reference for subsequent steps

  // 4. Create Customer & Vehicle
  const customerUser = await prisma.user.create({
    data: {
      email: 'customer@test.com',
      passwordHash,
      fullName: 'Jane Driver',
      role: 'CUSTOMER',
      customer: {
        create: {
          vehicles: {
            create: [
              { make: 'Toyota', model: 'Camry', year: 2018, vehicleNumber: 'ABC-1234', vehicleType: 'FOUR_WHEELER' }
            ]
          }
        }
      }
    },
    include: { customer: { include: { vehicles: true } } }
  });

  const customer = customerUser.customer;
  if (!customer || !customer.vehicles[0]) {
    throw new Error('Seed failed: Customer or vehicle not created correctly');
  }

  const customerId = customer.id;
  const vehicleId = customer.vehicles[0].id;

  const standardService = garage.services.find(s => s.name === 'Standard Oil Change');
  const brakeService = garage.services.find(s => s.name === 'Brake Inspection');

  if (!standardService || !brakeService) {
    throw new Error('Seed failed: Services not created correctly');
  }

  // 5. Create a PENDING Booking
  await prisma.booking.create({
    data: {
      customerId,
      garageId: garage.id,
      vehicleId,
      scheduledDate: new Date(Date.now() + 86400000), // Tomorrow
      customerIssue: 'Need an oil change before my road trip.',
      status: 'PENDING',
      totalAmount: standardService.basePrice,
      items: {
        create: [
          { serviceId: standardService.id, price: standardService.basePrice || 0 }
        ]
      }
    }
  });

  // 6. Create a COMPLETED Booking with Review
  const completedBooking = await prisma.booking.create({
    data: {
      customerId,
      garageId: garage.id,
      vehicleId,
      scheduledDate: new Date(Date.now() - 86400000), // Yesterday
      customerIssue: 'Brakes squeaking',
      status: 'COMPLETED',
      totalAmount: brakeService.basePrice,
      items: {
        create: [
          { serviceId: brakeService.id, price: brakeService.basePrice || 0 }
        ]
      }
    }
  });

  await prisma.review.create({
    data: {
      bookingId: completedBooking.id,
      customerId,
      garageId: garage.id,
      rating: 5,
      comment: 'Excellent and fast service!'
    }
  });

  // 7. Update garage rating based on review
  await prisma.garage.update({
    where: { id: garage.id },
    data: { rating: 5.0 }
  });

  console.log('Seed completed successfully!');
  console.log('\nDemo Accounts (password: password123):');
  console.log('- Admin: ' + adminUser.email);
  console.log('- Owner: ' + ownerUser.email);
  console.log('- Customer: ' + customerUser.email);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
