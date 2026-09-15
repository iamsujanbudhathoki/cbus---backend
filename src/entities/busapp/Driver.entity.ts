import { Column, Entity, JoinColumn, ManyToOne, OneToOne } from 'typeorm';
import { CommonEntity } from '../common/common.entity';
import { Status } from '../../constants/appConstant';
import { College } from './College.entity';
import { User } from './User.entity';

@Entity({ name: 'drivers' })
export class Driver extends CommonEntity {
  @Column({ nullable: true })
  userId: string;

  @OneToOne(() => User, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'userId' })
  user: User;

  @Column()
  collegeId: string;

  @ManyToOne(() => College, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'collegeId' })
  college: College;

  @Column()
  name: string;

  @Column({ nullable: true })
  licenseNumber: string;

  @Column()
  phone: string;

  @Column({
    type: 'enum',
    enum: Status,
    default: Status.ACTIVE,
  })
  status: Status;
}
