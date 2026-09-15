import { Column, Entity, JoinColumn, ManyToOne } from 'typeorm';
import { CommonEntity } from '../common/common.entity';
import { BusStatus } from '../../constants/appConstant';
import { College } from './College.entity';
import { Driver } from './Driver.entity';

@Entity({ name: 'buses' })
export class Bus extends CommonEntity {
  @Column()
  collegeId: string;

  @ManyToOne(() => College, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'collegeId' })
  college: College;

  @Column()
  busNumber: string;

  @Column()
  vehicleNumber: string;

  @Column({ default: 40 })
  capacity: number;

  @Column({ type: 'varchar', nullable: true })
  driverId?: string | null;

  @ManyToOne(() => Driver, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'driverId' })
  driver: Driver;

  @Column({
    type: 'enum',
    enum: BusStatus,
    default: BusStatus.IDLE,
  })
  status: BusStatus;

  @Column({ type: 'boolean', default: true })
  isActive: boolean;
}
