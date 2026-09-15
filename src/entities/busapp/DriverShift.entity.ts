import { Column, Entity, JoinColumn, ManyToOne } from 'typeorm';
import { CommonEntity } from '../common/common.entity';
import { ShiftStatus } from '../../types/enums';
import { College } from './College.entity';
import { Driver } from './Driver.entity';
import { Bus } from './Bus.entity';
import { Route } from './Route.entity';

@Entity({ name: 'driver_shifts' })
export class DriverShift extends CommonEntity {
  @Column()
  collegeId: string;

  @ManyToOne(() => College, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'collegeId' })
  college: College;

  @Column()
  driverId: string;

  @ManyToOne(() => Driver, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'driverId' })
  driver: Driver;

  @Column()
  busId: string;

  @ManyToOne(() => Bus, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'busId' })
  bus: Bus;

  @Column({ nullable: true })
  routeId: string;

  @ManyToOne(() => Route, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'routeId' })
  route: Route;

  @Column({ nullable: true })
  busNumberSnap: string;

  @Column({ nullable: true })
  vehicleNumberSnap: string;

  @Column({ nullable: true })
  routeNameSnap: string;

  @Column({ type: 'timestamp' })
  startedAt: Date;

  @Column({ type: 'timestamp', nullable: true })
  endedAt: Date;

  @Column({ type: 'integer', nullable: true })
  durationSeconds: number;

  @Column({
    type: 'enum',
    enum: ShiftStatus,
    default: ShiftStatus.RUNNING,
  })
  status: ShiftStatus;

  @Column({ type: 'text', nullable: true })
  notes: string;
}
