import { BeforeInsert, BeforeUpdate, Column, Entity, JoinColumn, ManyToOne } from 'typeorm';
import { CommonEntity } from '../common/common.entity';
import { Role, Status } from '../../constants/appConstant';
import { College } from './College.entity';
import BcryptService from '../../utils/bcrypt.util';

@Entity({ name: 'users' })
export class User extends CommonEntity {
  @Column({ unique: true })
  email: string;

  @Column({ select: false })
  password: string;

  @Column()
  name: string;

  @Column({ type: 'varchar', nullable: true })
  phoneNumber?: string | null;

  @Column({
    type: 'enum',
    enum: Role,
    default: Role.PARENT,
  })
  role: Role;

  @Column({ type: 'varchar', nullable: true })
  collegeId?: string | null;

  @ManyToOne(() => College, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'collegeId' })
  college: College;

  @Column({
    type: 'enum',
    enum: Status,
    default: Status.ACTIVE,
  })
  status: Status;

  @BeforeInsert()
  @BeforeUpdate()
  async hashPassword() {
    if (this.password && !this.password.startsWith('$2a$') && !this.password.startsWith('$2b$')) {
      this.password = await BcryptService.hash(this.password);
    }
  }
}
