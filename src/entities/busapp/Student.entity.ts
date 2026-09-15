import { Column, Entity, JoinColumn, ManyToOne } from 'typeorm';
import { CommonEntity } from '../common/common.entity';
import { Status } from '../../constants/appConstant';
import { College } from './College.entity';

@Entity({ name: 'students' })
export class Student extends CommonEntity {
  @Column()
  collegeId: string;

  @ManyToOne(() => College, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'collegeId' })
  college: College;

  @Column()
  name: string;

  @Column({ nullable: true })
  rollNumber: string;

  @Column({ nullable: true })
  className: string;

  @Column({ nullable: true })
  section: string;

  @Column({ nullable: true })
  contact: string;

  @Column({ nullable: true })
  address: string;

  @Column({
    type: 'enum',
    enum: Status,
    default: Status.ACTIVE,
  })
  status: Status;
}
