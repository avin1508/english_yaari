import { Types } from 'mongoose';
import { SESSION_STATUS } from '../../src/constants/sessionStatus';
import { Session } from '../../src/modules/session/session.model';
import { Teacher } from '../../src/modules/teacher/teacher.model';
import { User } from '../../src/modules/user/user.model';

describe('Mongoose schemas', () => {
  it('requires all user fields and enables timestamps', () => {
    const user = new User();
    const error = user.validateSync();

    expect(error?.errors.fullName).toBeDefined();
    expect(error?.errors.email).toBeDefined();
    expect(error?.errors.phone).toBeDefined();
    expect(User.schema.options.timestamps).toBe(true);
    expect(User.schema.indexes()).toContainEqual([
      { email: 1 },
      { unique: true, background: true },
    ]);
  });

  it('requires all teacher fields and enables timestamps', () => {
    const teacher = new Teacher();
    const error = teacher.validateSync();

    expect(error?.errors.fullName).toBeDefined();
    expect(error?.errors.email).toBeDefined();
    expect(error?.errors.specialization).toBeDefined();
    expect(error?.errors.experience).toBeDefined();
    expect(Teacher.schema.options.timestamps).toBe(true);
    expect(Teacher.schema.indexes()).not.toContainEqual([{ email: 1 }, { unique: true }]);
  });

  it('applies session defaults and validates its fields and time range', () => {
    const session = new Session({
      teacherId: new Types.ObjectId(),
      startTime: new Date('2026-01-01T10:00:00.000Z'),
      endTime: new Date('2026-01-01T11:00:00.000Z'),
    });

    expect(session.userId).toBeNull();
    expect(session.completedAt).toBeNull();
    expect(session.status).toBe(SESSION_STATUS.AVAILABLE);
    expect(session.validateSync()).toBeUndefined();
    expect(Session.schema.options.timestamps).toBe(true);

    const invalidSession = new Session({
      teacherId: new Types.ObjectId(),
      startTime: new Date('2026-01-01T11:00:00.000Z'),
      endTime: new Date('2026-01-01T10:00:00.000Z'),
    });
    expect(invalidSession.validateSync()?.errors.endTime).toBeDefined();

    const invalidStatus = new Session({
      teacherId: new Types.ObjectId(),
      startTime: new Date('2026-01-01T10:00:00.000Z'),
      endTime: new Date('2026-01-01T11:00:00.000Z'),
      status: 'CANCELLED',
    });
    expect(invalidStatus.validateSync()?.errors.status).toBeDefined();
  });

  it('defines indexes for session availability, user history, and teacher schedules', () => {
    const indexes = Session.schema.indexes().map(([keys]) => keys);

    expect(indexes).toContainEqual({ status: 1, startTime: 1 });
    expect(indexes).toContainEqual({ userId: 1, status: 1, startTime: 1 });
    expect(indexes).toContainEqual({ teacherId: 1, startTime: 1 });
  });
});
