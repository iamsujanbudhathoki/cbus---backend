import { Column, Entity, JoinColumn, ManyToOne } from 'typeorm';
import { CommonEntity } from '../common/common.entity';
import { AssignmentType, Status } from '../../constants/appConstant';
import { Student } from './Student.entity';
import { RouteStop } from './RouteStop.entity';
import { College } from './College.entity';

@Entity({ name: 'student_stop_assignments' })
export class StudentStopAssignment extends CommonEntity {
  @Column()
  studentId: string;

  @ManyToOne(() => Student, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'studentId' })
  student: Student;

  @Column()
  stopId: string;

  @ManyToOne(() => RouteStop, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'stopId' })
  stop: RouteStop;

  @Column()
  collegeId: string;

  @ManyToOne(() => College, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'collegeId' })
  college: College;

  @Column({
    type: 'enum',
    enum: AssignmentType,
    default: AssignmentType.BOTH,
  })
  assignmentType: AssignmentType;

  @Column({
    type: 'enum',
    enum: Status,
    default: Status.ACTIVE,
  })
  status: Status;
}
