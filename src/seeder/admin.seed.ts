import { AppDataSource } from '../config/database.config';
import { Role } from '../constants/appConstant';
import { Admin, AdminPermission } from '../entities/admin/Admin.entity';

const ADMINS = [
  {
    name: 'Platform Admin',
    email: 'admin@gmail.com',
    password: 'Admin@123',
    role: Role.ADMIN,
    phoneNumber: '981111111',
    permissions: [AdminPermission.CAROUSEL, AdminPermission.USERS, AdminPermission.LOGS],
    isActive: true,
  },
];

const AdminRepo = AppDataSource.getRepository(Admin);
const args = process.argv[2];
if (!args) {
  throw new Error('Please provide an argument');
}

// * for seed admin login credentials
const addAdmin = async () => {
  for (const i of ADMINS) {
    try {
      const admin = AdminRepo.create({
        ...i,
        role: i.role,
        password: i.password,
      });
      await AdminRepo.save(admin);
    } catch (error: any) {
      console.log('Failed to seed admin', error);
      return;
    }
    console.log('Admin seeded successfully');
  }
  AppDataSource.destroy();
  process.exit(0);
};
// * for remove all admin login credentials
const removeAllAdmin = async () => {
  try {
    await AdminRepo.createQueryBuilder().delete().execute();
  } catch (error: any) {
    console.log('Failed to delete admin', error);
    process.exit(1);
  }
  console.log('Admin remove successfully');
  AppDataSource.destroy();
  process.exit(0);
};

AppDataSource.initialize()
  .then(() => {
    if (args === 'add') {
      addAdmin();
    } else if (args === 'remove') {
      removeAllAdmin();
    } else {
      console.log('Please provide an argument');
    }
  })
  .catch((err) => {
    console.log(err);
    process.exit(1);
  });
