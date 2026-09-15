import { Column, Entity, JoinColumn, ManyToOne } from 'typeorm';
import { CommonEntity } from '../common/common.entity';
import { Status } from '../../constants/appConstant';
import { Route } from './Route.entity';

@Entity({ name: 'route_stops' })
export class RouteStop extends CommonEntity {
  @Column()
  routeId: string;

  @ManyToOne(() => Route, (route) => route.stops, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'routeId' })
  route: Route;

  @Column()
  name: string;

  @Column('double precision')
  latitude: number;

  @Column('double precision')
  longitude: number;

  @Column({ type: 'int', default: 1 })
  sequence: number;

  @Column({ nullable: true })
  estimatedTime: string;

  @Column({
    type: 'enum',
    enum: Status,
    default: Status.ACTIVE,
  })
  status: Status;
}
