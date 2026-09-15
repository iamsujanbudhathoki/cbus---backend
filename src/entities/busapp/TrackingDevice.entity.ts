import { Column, Entity, JoinColumn, ManyToOne } from 'typeorm';
import { CommonEntity } from '../common/common.entity';
import { Status } from '../../constants/appConstant';
import { Bus } from './Bus.entity';
import { College } from './College.entity';

@Entity({ name: 'tracking_devices' })
export class TrackingDevice extends CommonEntity {
  @Column()
  busId: string;

  @ManyToOne(() => Bus, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'busId' })
  bus: Bus;

  @Column()
  collegeId: string;

  @ManyToOne(() => College, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'collegeId' })
  college: College;

  @Column({ unique: true })
  deviceKey: string;

  @Column()
  apiKeyHash: string;

  @Column({
    type: 'enum',
    enum: Status,
    default: Status.ACTIVE,
  })
  status: Status;

  @Column({ type: 'timestamp', nullable: true })
  lastSeenAt: Date;
}
