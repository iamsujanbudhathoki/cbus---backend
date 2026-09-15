import { Column, Entity, JoinColumn, ManyToOne, OneToMany } from 'typeorm';
import { CommonEntity } from '../common/common.entity';
import { Status } from '../../constants/appConstant';
import { College } from './College.entity';
import { RouteStop } from './RouteStop.entity';

@Entity({ name: 'routes' })
export class Route extends CommonEntity {
  @Column()
  collegeId: string;

  @ManyToOne(() => College, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'collegeId' })
  college: College;

  @Column()
  name: string;

  @Column({ nullable: true })
  description: string;

  @Column({
    type: 'enum',
    enum: Status,
    default: Status.ACTIVE,
  })
  status: Status;

  @OneToMany(() => RouteStop, (stop) => stop.route)
  stops: RouteStop[];
}
