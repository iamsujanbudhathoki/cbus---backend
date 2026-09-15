import 'reflect-metadata';
import { AppDataSource } from '../config/database.config';
import { Bus, BusRouteAssignment, College, Driver, Parent, ParentStudent, Route, RouteStop, Student, StudentBusAssignment, StudentStopAssignment, User } from '../entities';
import { AssignmentType, BusStatus, Role, Status, TripType } from '../types/enums';
import BcryptService from '../utils/bcrypt.util';

async function runSeed() {
  console.log('Initializing Database Connection for Seeding...');
  await AppDataSource.initialize();

  console.log('Clearing existing seed data...');
  // Seed System Admin
  let admin = await User.findOne({ where: { email: 'admin@busapp.com' } });
  if (!admin) {
    admin = new User();
    admin.email = 'admin@busapp.com';
    admin.password = await BcryptService.hash('password123');
    admin.name = 'System Admin';
    admin.role = Role.ADMIN;
    admin.status = Status.ACTIVE;
    await admin.save();
    console.log('Created System Admin: admin@busapp.com / password123');
  }

  // Seed College 1
  let college1 = await College.findOne({ where: { code: 'TSC01' } });
  if (!college1) {
    college1 = new College();
    college1.name = 'Tribhuvan Science College';
    college1.code = 'TSC01';
    college1.address = 'Kirtipur, Kathmandu, Nepal';
    college1.contactPhone = '+977 1-4330430';
    college1.contactEmail = 'info@tribhuvan.edu.np';
    college1.status = Status.ACTIVE;
    college1 = await college1.save();

    // College 1 Admin
    const collegeAdmin = new User();
    collegeAdmin.email = 'admin@tribhuvan.edu.np';
    collegeAdmin.password = await BcryptService.hash('password123');
    collegeAdmin.name = 'Prof. Ramesh Sharma';
    collegeAdmin.role = Role.COLLEGE;
    collegeAdmin.collegeId = college1.id;
    collegeAdmin.status = Status.ACTIVE;
    await collegeAdmin.save();
    console.log('Created College Admin: admin@tribhuvan.edu.np / password123');

    // Route 1
    const route1 = new Route();
    route1.collegeId = college1.id;
    route1.name = 'Route 1: Baneshwor - Kirtipur Express';
    route1.description = 'Morning Pickup & Evening Drop for Baneshwor, Maitighar & Kalanki';
    route1.status = Status.ACTIVE;
    const savedRoute1 = await route1.save();

    const stop1 = new RouteStop();
    stop1.routeId = savedRoute1.id;
    stop1.name = 'Naya Baneshwor Chowk';
    stop1.latitude = 27.6915;
    stop1.longitude = 85.342;
    stop1.sequence = 1;
    stop1.estimatedTime = '06:45 AM';
    stop1.status = Status.ACTIVE;
    await stop1.save();

    const stop2 = new RouteStop();
    stop2.routeId = savedRoute1.id;
    stop2.name = 'Maitighar Mandala';
    stop2.latitude = 27.6942;
    stop2.longitude = 85.3206;
    stop2.sequence = 2;
    stop2.estimatedTime = '07:05 AM';
    stop2.status = Status.ACTIVE;
    await stop2.save();

    const stop3 = new RouteStop();
    stop3.routeId = savedRoute1.id;
    stop3.name = 'Kalanki Temple Stop';
    stop3.latitude = 27.6938;
    stop3.longitude = 85.2817;
    stop3.sequence = 3;
    stop3.estimatedTime = '07:25 AM';
    stop3.status = Status.ACTIVE;
    await stop3.save();

    const stop4 = new RouteStop();
    stop4.routeId = savedRoute1.id;
    stop4.name = 'Tribhuvan College Campus Gate';
    stop4.latitude = 27.6791;
    stop4.longitude = 85.2798;
    stop4.sequence = 4;
    stop4.estimatedTime = '07:45 AM';
    stop4.status = Status.ACTIVE;
    await stop4.save();

    // Driver 1
    const driverUser1 = new User();
    driverUser1.email = 'driver.ramesh@tribhuvan.edu.np';
    driverUser1.password = await BcryptService.hash('password123');
    driverUser1.name = 'Ramesh Bahadur Chhetri';
    driverUser1.role = Role.DRIVER;
    driverUser1.collegeId = college1.id;
    driverUser1.status = Status.ACTIVE;
    const savedDriverUser1 = await driverUser1.save();

    const driver1 = new Driver();
    driver1.collegeId = college1.id;
    driver1.userId = savedDriverUser1.id;
    driver1.name = 'Ramesh Bahadur Chhetri';
    driver1.phone = '+977 9841234567';
    driver1.licenseNumber = 'DL-NP-2022-9988';
    driver1.status = Status.ACTIVE;
    const savedDriver1 = await driver1.save();

    // Bus 1
    const bus1 = new Bus();
    bus1.collegeId = college1.id;
    bus1.busNumber = 'BUS-101';
    bus1.vehicleNumber = 'BA 3 KHA 5678';
    bus1.capacity = 45;
    bus1.driverId = savedDriver1.id;
    bus1.status = BusStatus.MOVING;
    bus1.isActive = true;
    const savedBus1 = await bus1.save();

    // Bus Route Assignment
    const busRoute = new BusRouteAssignment();
    busRoute.busId = savedBus1.id;
    busRoute.routeId = savedRoute1.id;
    busRoute.collegeId = college1.id;
    busRoute.tripType = TripType.MORNING;
    busRoute.status = Status.ACTIVE;
    await busRoute.save();

    // Student 1 & Parent
    const student1 = new Student();
    student1.collegeId = college1.id;
    student1.name = 'Aarav Sharma';
    student1.rollNumber = '2026-CS-042';
    student1.className = 'B.Sc Computer Science';
    student1.section = 'A';
    student1.contact = '+977 9801122334';
    student1.address = 'Maitighar, Kathmandu';
    student1.status = Status.ACTIVE;
    const savedStudent1 = await student1.save();

    const studentBus = new StudentBusAssignment();
    studentBus.studentId = savedStudent1.id;
    studentBus.busId = savedBus1.id;
    studentBus.collegeId = college1.id;
    studentBus.status = Status.ACTIVE;
    await studentBus.save();

    const studentStop = new StudentStopAssignment();
    studentStop.studentId = savedStudent1.id;
    studentStop.stopId = stop2.id;
    studentStop.collegeId = college1.id;
    studentStop.assignmentType = AssignmentType.BOTH;
    studentStop.status = Status.ACTIVE;
    await studentStop.save();

    // Parent Account
    const parentUser = new User();
    parentUser.email = 'parent@gmail.com';
    parentUser.password = await BcryptService.hash('password123');
    parentUser.name = 'Hari Prasad Sharma';
    parentUser.role = Role.PARENT;
    parentUser.collegeId = college1.id;
    parentUser.status = Status.ACTIVE;
    const savedParentUser = await parentUser.save();

    const parent = new Parent();
    parent.collegeId = college1.id;
    parent.userId = savedParentUser.id;
    parent.name = 'Hari Prasad Sharma';
    parent.phone = '+977 9851098765';
    parent.email = 'parent@gmail.com';
    parent.address = 'Maitighar, Kathmandu';
    parent.status = Status.ACTIVE;
    const savedParent = await parent.save();

    const parentStudent = new ParentStudent();
    parentStudent.parentId = savedParent.id;
    parentStudent.studentId = savedStudent1.id;
    parentStudent.relationship = 'Father';
    await parentStudent.save();

    console.log('Seeded Tribhuvan Science College, Route 1, Bus 101, Student Aarav & Parent parent@gmail.com / password123');
  }

  console.log('Database Seeding Complete!');
  process.exit(0);
}

runSeed().catch((err) => {
  console.error('Seeding Error:', err);
  process.exit(1);
});
