import { Column, Entity, OneToMany } from 'typeorm';
import { CommonEntity } from '../common/common.entity';
import { Status } from '../../constants/appConstant';

@Entity({ name: 'colleges' })
export class College extends CommonEntity {
  @Column({ unique: true })
  name: string;

  @Column({ unique: true })
  code: string;

  @Column({ nullable: true })
  address: string;

  @Column({ nullable: true })
  contactPhone: string;

  @Column({ nullable: true })
  contactEmail: string;

  @Column({
    type: 'enum',
    enum: Status,
    default: Status.ACTIVE,
  })
  status: Status;
}
