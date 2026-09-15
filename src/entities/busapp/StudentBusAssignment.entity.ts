import { Column, Entity, JoinColumn, ManyToOne } from 'typeorm';
import { CommonEntity } from '../common/common.entity';
import { Status } from '../../constants/appConstant';
import { Student } from './Student.entity';
import { Bus } from './Bus.entity';
import { College } from './College.entity';

@Entity({ name: 'student_bus_assignments' })
export class StudentBusAssignment extends CommonEntity {
  @Column()
  studentId: string;

  @ManyToOne(() => Student, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'studentId' })
  student: Student;

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

  @Column({
    type: 'enum',
    enum: Status,
    default: Status.ACTIVE,
  })
  status: Status;
}
