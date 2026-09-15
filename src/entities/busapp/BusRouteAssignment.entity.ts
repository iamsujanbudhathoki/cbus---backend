import { Column, Entity, JoinColumn, ManyToOne } from 'typeorm';
import { CommonEntity } from '../common/common.entity';
import { Status, TripType } from '../../constants/appConstant';
import { Bus } from './Bus.entity';
import { Route } from './Route.entity';
import { College } from './College.entity';

@Entity({ name: 'bus_route_assignments' })
export class BusRouteAssignment extends CommonEntity {
  @Column()
  busId: string;

  @ManyToOne(() => Bus, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'busId' })
  bus: Bus;

  @Column()
  routeId: string;

  @ManyToOne(() => Route, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'routeId' })
  route: Route;

  @Column()
  collegeId: string;

  @ManyToOne(() => College, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'collegeId' })
  college: College;

  @Column({
    type: 'enum',
    enum: TripType,
    default: TripType.MORNING,
  })
  tripType: TripType;

  @Column({
    type: 'enum',
    enum: Status,
    default: Status.ACTIVE,
  })
  status: Status;
}
